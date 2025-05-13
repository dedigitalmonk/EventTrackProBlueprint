import express, { type Express, type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // Serve static files from the frontend build directory
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));

  // Serve index.html for all routes (SPA fallback)
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });
} 