# jssync

A collaborative real-time JavaScript Playground. Allows multiple users to simultaneously edit and run JavaScript code in shared rooms using Yjs for real-time collaboration.

## Demo

https://jssync.syumai.workers.dev/

### Features

```console
# Open room
https://jssync.syumai.workers.dev/rooms/:roomId
```

* JavaScript code execution in sandboxed iframe
* Real-time collaborative editing with multiple cursors
* Vim mode and tab width options

## Usage

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start the development server (Cloudflare Workers with Wrangler)
npm run cf:dev
# or
make dev
# Application runs on http://localhost:8787 by default
```

### Development Commands

```bash
# Build frontend for production
npm run build

# Build frontend for development with watch mode
npm run dev

# Serve frontend with webpack dev server
npm run serve

# Deploy to Cloudflare Workers
make deploy
# This runs: npm run cf:deploy (which runs npm run build && wrangler deploy)

# Check TypeScript compilation
npx tsc --noEmit -p tsconfig.worker.json   # Worker
npx tsc --noEmit -p tsconfig.client.json   # Client-side
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
* **JS Execution**: Sandboxed iframe with `sandbox="allow-scripts"`
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

Collaborative editing is powered by Yjs for conflict-free replicated data types (CRDTs), providing superior real-time collaboration with global edge distribution via Cloudflare's network.

## References

* [Yjs](https://github.com/yjs/yjs) - Shared data types for building collaborative software
* Base Idea from ttakuru88: https://github.com/ttakuru88/ot_sample
  - Blog: https://kray.jp/blog/algorithm-operational-transformation/

## Author

syumai

## LICENSE

MIT
