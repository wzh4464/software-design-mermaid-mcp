import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DiagramState } from "./state.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const EDITOR_DIR = join(__dirname, "..", "editor");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export function createHttpServer(state: DiagramState): ReturnType<typeof createServer> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS for dev mode
    if (req.headers.origin?.includes("localhost")) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // API routes
    if (pathname === "/api/diagram" && req.method === "GET") {
      state.recordEditorPoll();
      const diagram = state.getCurrentDiagram();
      if (!diagram) {
        json(res, 200, { version: 0, session_ended: true });
        return;
      }
      // If session just ended, editor gets one last poll with session_ended: true,
      // then we clean up state on next poll
      if (diagram.session_ended) {
        json(res, 200, diagram);
        state.fullCleanup();
        return;
      }
      json(res, 200, diagram);
      return;
    }

    if (pathname === "/api/submission" && req.method === "POST") {
      const body = JSON.parse(await readBody(req));
      state.submitFeedback(body);
      json(res, 200, { success: true });
      return;
    }

    if (pathname === "/api/status" && req.method === "GET") {
      json(res, 200, {
        status: "ok",
        editor_connected: state.isEditorConnected(),
        has_session: state.hasSession(),
      });
      return;
    }

    // Static file serving
    let filePath = pathname === "/" ? "/index.html" : pathname;
    const fullPath = join(EDITOR_DIR, filePath);

    // Security: prevent path traversal
    if (!fullPath.startsWith(EDITOR_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const data = await readFile(fullPath);
      const ext = extname(fullPath);
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(data);
    } catch {
      // SPA fallback: serve index.html for client-side routing
      try {
        const indexData = await readFile(join(EDITOR_DIR, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(indexData);
      } catch {
        res.writeHead(404);
        res.end("Not Found");
      }
    }
  });

  return server;
}

export function startServer(state: DiagramState): Promise<{ port: number; url: string; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createHttpServer(state);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }
      const port = addr.port;
      const url = `http://localhost:${port}`;
      resolve({
        port,
        url,
        close: () => server.close(),
      });
    });
  });
}
