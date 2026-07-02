import { z } from "zod";
import { WORKFORCE_CAPABILITIES } from "@simforge/shared";
import type { AIConversationMessage, AIProvider, SophiaEvaluationResult } from "./types.js";

const evaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string().min(1).max(500)).min(1).max(6),
  improvementAreas: z.array(z.string().min(1).max(500)).min(1).max(6),
  evidence: z.array(z.object({ capability: z.string().min(1).max(100), observation: z.string().min(1).max(1000) })).min(1).max(12),
  recommendedNextPractice: z.string().min(1).max(1500),
  capabilityScores: z.array(z.object({ capabilityName: z.enum(WORKFORCE_CAPABILITIES), score: z.number().min(0).max(100), evidence: z.string().min(1).max(1000), recommendation: z.string().min(1).max(1000) })).length(WORKFORCE_CAPABILITIES.length),
});

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

function responseText(response: OpenAIResponse) {
  if (response.output_text?.trim()) return response.output_text.trim();
  const text = response.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("").trim();
  if (!text) throw new Error("AI provider returned no text");
  return text;
}

function jsonFromText(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1];
  return JSON.parse((fenced ?? text).trim()) as unknown;
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  constructor(private readonly config: { apiKey: string; model: string; baseUrl: string; timeoutMs: number; maxOutputTokens: number }) {}

  private async create(body: Record<string, unknown>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/u, "")}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.config.model, max_output_tokens: this.config.maxOutputTokens, ...body }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}`);
      return responseText(await response.json() as OpenAIResponse);
    } finally { clearTimeout(timeout); }
  }

  async generateTrainerResponse(input: { systemPrompt: string; messages: AIConversationMessage[] }) {
    return this.create({
      instructions: input.systemPrompt,
      input: input.messages.map((message) => ({ role: message.role === "ai" ? "assistant" : "user", content: message.content })),
    });
  }

  async evaluateSimulation(input: { systemPrompt: string; transcript: AIConversationMessage[] }): Promise<SophiaEvaluationResult> {
    const text = await this.create({
      instructions: `${input.systemPrompt}\n\nEvaluate the learner strictly from transcript evidence. Return only valid JSON matching the requested evaluation structure. Include exactly these six capability names: ${WORKFORCE_CAPABILITIES.join(", ")}.`,
      input: [{ role: "user", content: `Evaluate this completed simulation transcript:\n${input.transcript.map((message) => `${message.role}: ${message.content}`).join("\n")}` }],
    });
    const result = evaluationSchema.parse(jsonFromText(text));
    if (new Set(result.capabilityScores.map((score) => score.capabilityName)).size !== WORKFORCE_CAPABILITIES.length) throw new Error("AI evaluation returned duplicate capabilities");
    return { ...result, capabilityScores: WORKFORCE_CAPABILITIES.map((name) => result.capabilityScores.find((score) => score.capabilityName === name)!) };
  }
}
