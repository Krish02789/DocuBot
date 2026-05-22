import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, serve the React frontend from the pre-built static files.
// The STATIC_FILES_PATH env var can override the default relative path.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const staticDir =
    process.env.STATIC_FILES_PATH ??
    path.resolve(__dirname, "../../docubot/dist/public");

  app.use(express.static(staticDir));

  // Catch-all: serve index.html so client-side routing works
  app.get("(.*)", (_req, res) => { => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
