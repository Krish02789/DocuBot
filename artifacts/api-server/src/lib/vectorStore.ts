interface VectorEntry {
  text: string;
  embedding: number[];
}

interface DocumentStore {
  filename: string;
  chunks: VectorEntry[];
}

const stores = new Map<string, DocumentStore>();

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function storeDocument(
  docId: string,
  filename: string,
  chunks: string[],
  embeddings: number[][]
): void {
  const entries: VectorEntry[] = chunks.map((text, i) => ({
    text,
    embedding: embeddings[i],
  }));
  stores.set(docId, { filename, chunks: entries });
}

export function searchDocument(
  docId: string,
  queryEmbedding: number[],
  k = 4
): string[] {
  const store = stores.get(docId);
  if (!store) throw new Error(`Document not found: ${docId}`);

  const scored = store.chunks.map((entry) => ({
    text: entry.text,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.text);
}

export function documentExists(docId: string): boolean {
  return stores.has(docId);
}

export function deleteDocument(docId: string): boolean {
  return stores.delete(docId);
}

export function listDocuments(): string[] {
  return Array.from(stores.keys());
}
