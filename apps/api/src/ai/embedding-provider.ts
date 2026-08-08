import { getEnv } from "../config/env.js";

export const ACTIVE_RETRIEVAL_EMBEDDING_DIMENSIONS = 1536;

export class EmbeddingConfigurationError extends Error {
  constructor(message = "Embedding dimensions do not match the active retrieval index") {
    super(message);
    this.name = "EmbeddingConfigurationError";
  }
}

export interface EmbeddingProvider {
  name: string;
  model: string;
  dimensions: number;
  embed(input: string[]): Promise<number[][]>;
}

export function assertActiveEmbeddingDimensions(dimensions: number) {
  if (dimensions !== ACTIVE_RETRIEVAL_EMBEDDING_DIMENSIONS) throw new EmbeddingConfigurationError();
}

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly model: string;
  readonly dimensions: number;

  constructor(private readonly config: { apiKey: string; model: string; dimensions: number; baseUrl: string; timeoutMs: number }) {
    this.model = config.model;
    this.dimensions = config.dimensions;
  }

  async embed(input: string[]) {
    if (!input.length) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/u, "")}/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.config.model, input, dimensions: this.config.dimensions }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Embedding provider request failed with status ${response.status}`);
      const body = await response.json() as OpenAIEmbeddingResponse;
      const embeddings = body.data?.map((item) => item.embedding ?? []) ?? [];
      if (embeddings.length !== input.length || embeddings.some((embedding) => embedding.length !== this.config.dimensions)) throw new Error("Embedding provider returned an invalid embedding shape");
      embeddings.forEach((embedding) => assertActiveEmbeddingDimensions(embedding.length));
      return embeddings;
    } finally {
      clearTimeout(timeout);
    }
  }
}

let provider: EmbeddingProvider | null | undefined;

export function getEmbeddingProvider(): EmbeddingProvider | null {
  if (provider !== undefined) return provider;
  const env = getEnv();
  if (env.EMBEDDING_PROVIDER !== "openai" || !env.OPENAI_API_KEY) return provider = null;
  assertActiveEmbeddingDimensions(env.OPENAI_EMBEDDING_DIMENSIONS);
  return provider = new OpenAIEmbeddingProvider({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_EMBEDDING_MODEL, dimensions: env.OPENAI_EMBEDDING_DIMENSIONS, baseUrl: env.OPENAI_BASE_URL, timeoutMs: env.EMBEDDING_TIMEOUT_MS });
}

export function getEmbeddingProviderStatus() {
  const env = getEnv();
  const dimensionMatches = env.OPENAI_EMBEDDING_DIMENSIONS === ACTIVE_RETRIEVAL_EMBEDDING_DIMENSIONS;
  const configured = env.EMBEDDING_PROVIDER === "openai" && Boolean(env.OPENAI_API_KEY) && dimensionMatches;
  return { provider: configured ? "openai" : "none", configured, model: env.OPENAI_EMBEDDING_MODEL, dimensions: env.OPENAI_EMBEDDING_DIMENSIONS, indexDimensions: ACTIVE_RETRIEVAL_EMBEDDING_DIMENSIONS, dimensionMatches } as const;
}
