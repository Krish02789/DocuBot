import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { chunkText } from "../lib/chunker.js";
import { embedTexts } from "../lib/geminiClient.js";
import { storeDocument } from "../lib/vectorStore.js";

// Point to the worker file that the build script copies next to index.mjs.
// Using a file URL so pdfjs-dist can spawn it as a Node.js worker thread.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "./pdf.worker.min.mjs",
  import.meta.url,
).href;

const router = Router();
const MAX_FILE_SIZE_MB = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// Standard fonts live next to the bundle after build (copied by build.mjs)
const standardFontDataUrl = new URL("./standard_fonts/", import.meta.url).href;

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({
    data: uint8,
    standardFontDataUrl,
    useSystemFonts: true,
  }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
    page.cleanup();
  }

  await doc.destroy();
  return pageTexts.join("\n\n");
}

router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` });
        return;
      }
      if (err) {
        res.status(400).json({ error: String((err as Error).message) });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const file = req.file;
      const isValidType =
        file.mimetype === "application/pdf" ||
        file.originalname.toLowerCase().endsWith(".pdf");

      if (!isValidType) {
        res.status(400).json({ error: "Only PDF files are accepted" });
        return;
      }

      let fullText: string;
      try {
        fullText = await extractTextFromPDF(file.buffer);
      } catch (err) {
        req.log.error({ err }, "PDF parse error");
        res.status(400).json({ error: "PDF appears to be empty or unreadable" });
        return;
      }

      if (!fullText || fullText.replace(/\s/g, "").length < 10) {
        res.status(400).json({ error: "PDF appears to be empty or unreadable" });
        return;
      }

      const chunks = chunkText(fullText);
      if (chunks.length === 0) {
        res.status(400).json({ error: "PDF appears to be empty or unreadable" });
        return;
      }

      let embeddings: number[][];
      try {
        embeddings = await embedTexts(chunks);
      } catch (err) {
        req.log.error({ err }, "Embedding error");
        res.status(500).json({ error: "AI service temporarily unavailable" });
        return;
      }

      const docId = uuidv4();
      storeDocument(docId, file.originalname, chunks, embeddings);

      res.json({
        docId,
        filename: file.originalname,
        totalChunks: chunks.length,
        message: `Successfully processed ${file.originalname} into ${chunks.length} chunks`,
      });
    } catch (err) {
      req.log.error({ err }, "Upload error");
      res.status(500).json({ error: "Failed to process document" });
    }
  }
);

export default router;
