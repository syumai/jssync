import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { yRoute } from "y-durableobjects";
import { runCode, SandboxError } from "@sandbox-workers/core";
import { JSSyncDurableObject, JsSyncEnv } from "./jssync-durable-object.js";
import {
  validateRoomId,
  InvalidArgumentError
} from "./validators.js";
import { homeTemplate, roomTemplate } from "./templates.js";
import type { RunResponse } from "../web/run-types.js";

type Env = JsSyncEnv;

const app = new Hono<{ Bindings: Env }>();

const MAX_RUN_CODE_LENGTH = 100_000;

// Serve static assets using the ASSETS binding
app.get("/*", async (c, next) => {
  const url = new URL(c.req.url);

  // Skip API routes and specific application routes
  if (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/yjs/") ||
      url.pathname.startsWith("/rooms/") ||
      url.pathname.startsWith("/health") ||
      url.pathname === "/") {
    await next();
    return;
  }

  // Try to serve static asset
  try {
    return await c.env.ASSETS.fetch(c.req.raw);
  } catch (error) {
    // If asset not found, continue to next handler
    await next();
  }
});

// Home route handler
app.get("/", (c) => {
  const html = homeTemplate();
  return c.html(html);
});

// Room route handler
app.get("/rooms/:roomId", (c) => {
  const { roomId } = c.req.param();

  try {
    validateRoomId(roomId);
    const html = roomTemplate({ roomId });
    return c.html(html);
  } catch (error) {
    if (error instanceof InvalidArgumentError) {
      return c.text(error.message, 400);
    }
    console.error("Error handling room request:", error);
    return c.text("Internal Server Error", 500);
  }
});

// JavaScript code execution route, backed by the JAVASCRIPT sandbox
// runtime Worker (see sandbox/) via a Service Binding.
app.post("/api/run", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be JSON" }, 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof (body as { code?: unknown }).code !== "string"
  ) {
    return c.json({ error: "'code' must be a string" }, 400);
  }

  const code = (body as { code: string }).code;
  if (code.length > MAX_RUN_CODE_LENGTH) {
    return c.json({ error: "'code' is too long" }, 413);
  }

  try {
    const result = await runCode(c.env.JAVASCRIPT, code, { timeout: 15000 });
    const response: RunResponse = {
      stdout: result.logs.stdout,
      stderr: result.logs.stderr,
      results: result.results.reduce<string[]>((acc, entry) => {
        if (typeof entry.text === "string") {
          acc.push(entry.text);
        } else if (entry.json !== undefined) {
          try {
            acc.push(JSON.stringify(entry.json, null, 2));
          } catch {
            acc.push(String(entry.json));
          }
        }
        return acc;
      }, []),
      ...(result.error ? { error: result.error } : {}),
      durationMs: result.durationMs,
    };
    return c.json(response, 200);
  } catch (error) {
    if (error instanceof SandboxError) {
      const status =
        typeof error.httpStatus === "number" &&
        error.httpStatus >= 400 &&
        error.httpStatus <= 599
          ? error.httpStatus
          : 502;
      return c.json(
        { error: error.message, code: error.code },
        status as ContentfulStatusCode
      );
    }

    if (
      (error instanceof DOMException && error.name === "TimeoutError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      return c.json({ error: "Execution timed out" }, 504);
    }

    console.error("Error running code:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Y.js WebSocket route using y-durableobjects
// This handles WebSocket upgrades for room collaboration
const yjsRoute = yRoute<{ Bindings: Env }>((env: Env) => env.JSSYNC_ROOMS);
app.route("/yjs", yjsRoute);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.notFound((c) => {
  return c.text("Not Found", 404);
});

// Error handler
app.onError((error, c) => {
  console.error("Worker error:", error);
  return c.text("Internal Server Error", 500);
});

export default app;
export { JSSyncDurableObject };
