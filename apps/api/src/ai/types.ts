import type { WorkforceCapability } from "@simforge/shared";

export interface AIConversationMessage {
  role: "learner" | "ai";
  content: string;
}

export interface SophiaEvaluationResult {
  overallScore: number;
  strengths: string[];
  improvementAreas: string[];
  evidence: Array<{ capability: string; observation: string }>;
  recommendedNextPractice: string;
  capabilityScores: Array<{
    capabilityName: WorkforceCapability;
    score: number;
    evidence: string;
    recommendation: string;
  }>;
}

export interface AIProvider {
  readonly name: string;
  generateTrainerResponse(input: { systemPrompt: string; messages: AIConversationMessage[] }): Promise<string>;
  evaluateSimulation(input: { systemPrompt: string; transcript: AIConversationMessage[] }): Promise<SophiaEvaluationResult>;
}
