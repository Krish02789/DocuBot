import { Router } from "express";
import { embedQuery, chatWithContext, RETRIEVAL_K } from "../lib/geminiClient.js";
import { searchDocument, documentExists } from "../lib/vectorStore.js";

const router = Router();

const SYSTEM_PROMPT = `You are DocuBOT, a helpful assistant that answers questions about uploaded documents. Answer ONLY based on the provided context. If the answer is not in the context, say "I couldn't find that information in the document." Be concise and accurate.`;

router.post("/chat", async (req, res) => {
  try {
    const { docId, message, history = [] } = req.body as {
      docId: string;
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!docId || !message) {
      res.status(400).json({ error: "docId and message are required" });
      return;
    }

    if (!documentExists(docId)) {
      res.status(404).json({ error: "Document not found. Please upload again." });
      return;
    }

    let queryEmbedding: number[];
    try {
      queryEmbedding = await embedQuery(message);
    } catch (err) {
      req.log.error({ err }, "Embedding query error");
      res.status(500).json({ error: "AI service temporarily unavailable" });
      return;
    }

    const relevantChunks = searchDocument(docId, queryEmbedding, RETRIEVAL_K);
    const context = relevantChunks.join("\n\n---\n\n");

    const contextualMessage = `Context from the document:\n\n${context}\n\nQuestion: ${message}`;

    let answer: string;
    try {
      answer = await chatWithContext(SYSTEM_PROMPT, history, contextualMessage);
    } catch (err) {
      req.log.error({ err }, "Gemini chat error");
      res.status(500).json({ error: "AI service temporarily unavailable" });
      return;
    }

    const sources = relevantChunks.map((chunk) => chunk.slice(0, 200));

    res.json({ answer, sources, docId });
  } catch (err) {
    req.log.error({ err }, "Chat error");
    res.status(500).json({ error: "Failed to process chat request" });
  }
});

export default router;
