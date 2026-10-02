import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/server-env";

export type AiProvider = "openai" | "open_source";

export type AiConfig = {
  provider: AiProvider;
  // Shown in the admin settings, e.g. "Groq · openai/gpt-oss-120b".
  label: string;
  client: OpenAI;
  // Larger model for resumes, questions and reports; faster one per answer.
  model: string;
  fastModel: string;
};

export class AiError extends Error {}

// Both providers speak the OpenAI API. "open_source" defaults to Groq, which
// hosts open-weight models (gpt-oss, Llama, Qwen) on a free tier.
function configFor(provider: AiProvider): AiConfig | null {
  if (provider === "open_source") {
    const key = serverEnv.openSourceAiKey;
    if (!key) return null;
    const baseURL = serverEnv.openSourceAiBaseUrl;
    const host = new URL(baseURL).hostname.replace(/^api\./, "").split(".")[0];
    const model = serverEnv.openSourceAiModel;
    return {
      provider,
      label: `${host.charAt(0).toUpperCase()}${host.slice(1)} · ${model}`,
      client: new OpenAI({ apiKey: key, baseURL, timeout: 60_000, maxRetries: 1 }),
      model,
      fastModel: serverEnv.openSourceAiFastModel,
    };
  }
  const key = serverEnv.openaiApiKeyOrNull;
  if (!key) return null;
  const model = serverEnv.openaiModel;
  return {
    provider,
    label: `OpenAI · ${model}`,
    client: new OpenAI({ apiKey: key, timeout: 60_000, maxRetries: 1 }),
    model,
    fastModel: model,
  };
}

// The provider chosen in admin Settings, or null when it has no API key
// (the app then uses its keyword and question-bank fallbacks).
export async function getAi(): Promise<AiConfig | null> {
  const { data } = await createAdminClient()
    .from("app_settings")
    .select("ai_provider")
    .eq("id", 1)
    .maybeSingle();
  const provider: AiProvider = data?.ai_provider === "open_source" ? "open_source" : "openai";
  return configFor(provider);
}

// For the admin Settings page: which providers have a key configured.
export function aiStatus() {
  return {
    openai: configFor("openai")?.label ?? null,
    open_source: configFor("open_source")?.label ?? null,
  };
}

// Asks the model for JSON matching `schema` (strict structured output), then
// validates it. Throws AiError with a log-friendly reason on any failure.
export async function generateJson<T extends z.ZodType>(
  ai: AiConfig,
  task: {
    name: string;
    schema: T;
    system: string;
    user: string;
    fast?: boolean;
    maxTokens?: number;
  },
): Promise<z.infer<T>> {
  const model = task.fast ? ai.fastModel : ai.model;
  const jsonSchema = z.toJSONSchema(task.schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  try {
    const completion = await ai.client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: task.system },
        { role: "user", content: task.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: task.name, strict: true, schema: jsonSchema },
      },
      temperature: 0.4,
      max_completion_tokens: task.maxTokens ?? 4000,
      // gpt-oss models think before answering; keep it short to save tokens.
      ...(model.includes("gpt-oss") ? { reasoning_effort: "low" as const } : {}),
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new AiError(`${task.name}: empty response`);
    const parsed = task.schema.safeParse(JSON.parse(content));
    if (!parsed.success) throw new AiError(`${task.name}: ${parsed.error.issues[0]?.message}`);
    return parsed.data;
  } catch (error) {
    // Keep the technical reason in the server log; callers fall back quietly.
    console.error(
      `[ai] ${task.name} failed (${model}):`,
      error instanceof Error ? error.message : error,
    );
    throw error instanceof AiError ? error : new AiError(`${task.name} failed`);
  }
}
