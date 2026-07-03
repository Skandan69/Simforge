import type { SpeechToTextProvider, TextToSpeechProvider } from "./voice-types.js";

export class OpenAIVoiceProvider implements SpeechToTextProvider, TextToSpeechProvider {
  readonly name = "openai";

  constructor(private readonly config: { apiKey: string; baseUrl: string; timeoutMs: number; transcriptionModel: string; speechModel: string; voice: string; speechInstructions: string }) {}

  private async request(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/u, "")}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.config.apiKey}`, ...init.headers },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Voice provider request failed with status ${response.status}`);
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async transcribe(input: { audio: Uint8Array; mimeType: string; fileName: string }) {
    const form = new FormData();
    form.append("model", this.config.transcriptionModel);
    form.append("file", new Blob([Uint8Array.from(input.audio).buffer], { type: input.mimeType }), input.fileName);
    const response = await this.request("/audio/transcriptions", { method: "POST", body: form });
    const payload = await response.json() as { text?: string };
    if (!payload.text?.trim()) throw new Error("Voice provider returned no transcript");
    return payload.text.trim();
  }

  async synthesize(input: { text: string }) {
    const response = await this.request("/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.config.speechModel, voice: this.config.voice, instructions: this.config.speechInstructions, input: input.text, response_format: "mp3" }),
    });
    return { audio: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get("content-type") ?? "audio/mpeg" };
  }
}
