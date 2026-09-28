import "server-only";

// Secrets. Importing this file from a Client Component fails the build,
// which keeps the OpenAI and Supabase secret keys out of the browser.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const serverEnv = {
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get openaiApiKey() {
    return required("OPENAI_API_KEY");
  },
  get openaiModel() {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  },
  get openaiTranscribeModel() {
    return process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
  },
};
