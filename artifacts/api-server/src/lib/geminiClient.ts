import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1beta" },
});

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = "gemini-2.5-flash";
export const RETRIEVAL_K = 4;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const result = await genai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    // SDK may return `embedding` (singular) or `embeddings[0]` depending on version
    const raw = result as unknown as Record<string, unknown>;
    const values: number[] | undefined =
      result.embeddings?.[0]?.values ??
      (raw.embedding as { values?: number[] } | undefined)?.values;
    if (!values || values.length === 0) {
      throw new Error(`No embedding returned. Response keys: ${Object.keys(raw).join(", ")}`);
    }
    results.push(values);
  }
  return results;
}

export async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedTexts([query]);
  return embedding;
}

export async function chatWithContext(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<string> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await genai.models.generateContent({
    model: CHAT_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1024,
    },
  });

  return response.text ?? "No response generated.";
}
