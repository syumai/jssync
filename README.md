# jssync

A collaborative real-time JavaScript Playground. Allows multiple users to simultaneously edit and run JavaScript code in shared rooms using Yjs for real-time collaboration.

## Demo

https://jssync.syumai.dev/

### Features

```console
# Open room
https://jssync.syumai.dev/rooms/:roomId
```

* JavaScript code execution in a server-side sandbox ([sandbox-workers](https://github.com/syumai/sandbox-workers), SpiderMonkey Wasm on Cloudflare Workers)
* Real-time collaborative editing with multiple cursors
* Vim mode and tab width options

## Usage

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start the development server (Cloudflare Workers with Wrangler)
pnpm cf:dev
# Application runs on http://localhost:8787 by default
```

### Deploy

The sandbox runtime Worker must be deployed before the main jssync Worker,
since the main Worker's `wrangler.toml` binds it as the `JAVASCRIPT` Service
Binding:

```bash
cd sandbox && pnpm install && cd ..
pnpm sandbox:deploy
pnpm cf:deploy
```

### Development Commands

```bash
# Build frontend for production
pnpm build

# Build frontend for development with watch mode
pnpm dev

# Serve frontend with webpack dev server
pnpm serve

# Deploy to Cloudflare Workers
pnpm cf:deploy
# This runs: pnpm build && wrangler deploy

# Check TypeScript compilation
pnpm exec tsc --noEmit -p tsconfig.worker.json   # Worker
pnpm exec tsc --noEmit -p tsconfig.client.json   # Client-side
```

## Tech Stack

### Backend
* **Runtime**: Cloudflare Workers
* **Framework**: Hono with HTML templating
* **Real-time**: Yjs with [y-durableobjects](https://github.com/napolab/y-durableobjects)
* **Persistence**: Cloudflare Durable Objects
* **Language**: TypeScript with ES modules

### Frontend
* **Editor**: CodeMirror with y-codemirror for Yjs integration
* **JS Execution**: `POST /api/run` to the Worker, which calls the private `jssync-sandbox-javascript` runtime Worker via a Service Binding
* **Real-time**: Yjs client libraries (yjs, y-protocols, lib0)
* **Build**: Webpack 5 with TypeScript and Babel loaders
* **Language**: TypeScript

### Development
* **Package Manager**: pnpm
* **Deployment**: Cloudflare Workers with Wrangler
* **TypeScript**: Strict mode, separate worker/client configurations

## Architecture

The application runs entirely on Cloudflare Workers with Durable Objects:

1. **Hono HTTP Server**: HTTP server with HTML template rendering and static asset serving
2. **Durable Objects**: Real-time collaborative editing using y-durableobjects with persistent room state
3. **Sandbox runtime Worker** (`sandbox/`): private `@sandbox-workers/javascript` Worker that executes user code in a fuel-metered Wasm SpiderMonkey instance

Collaborative editing is powered by Yjs for conflict-free replicated data types (CRDTs), providing superior real-time collaboration with global edge distribution via Cloudflare's network.

## References

* Based on [gpsync](https://github.com/syumai/gpsync) - A collaborative real-time Go Playground
* [Yjs](https://github.com/yjs/yjs) - Shared data types for building collaborative software
* Base Idea from ttakuru88: https://github.com/ttakuru88/ot_sample
  - Blog: https://kray.jp/blog/algorithm-operational-transformation/

## Author

syumai

## LICENSE

MIT
