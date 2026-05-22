import { Router } from "express";
import { listDocuments, deleteDocument, documentExists } from "../lib/vectorStore.js";

const router = Router();

router.get("/documents", (_req, res) => {
  const documents = listDocuments();
  res.json({ documents });
});

router.delete("/documents/:docId", (req, res) => {
  const { docId } = req.params;

  if (!documentExists(docId)) {
    res.status(404).json({ error: "Document not found. Please upload again." });
    return;
  }

  deleteDocument(docId);
  res.json({ message: `Document ${docId} removed successfully` });
});

export default router;
