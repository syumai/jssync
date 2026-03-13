# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gpsync is a collaborative real-time code editor based on The Go Playground. It allows multiple users to simultaneously edit Go code in shared rooms using Yjs for real-time collaboration and conflict-free collaborative editing.

**Live demo**: https://gpsync.syumai.workers.dev/

## Development Commands

### Running the Application
```bash
# Install dependencies (uses pnpm)
pnpm install

# Start the development server (Cloudflare Workers with Wrangler)
npm run cf:dev
# Application runs on http://localhost:8787 by default
```

### Frontend Development
```bash
# Build frontend for production
npm run build

# Build frontend for development with watch mode
npm run dev

# Serve frontend with webpack dev server
npm run serve
```

### Deployment
```bash
# Deploy to Cloudflare Workers
npm run cf:deploy
# This runs: npm run build && wrangler deploy

# Development deployment with Wrangler
npm run wrangler:dev

# Production deployment with Wrangler
npm run wrangler:deploy
```

### Quality Checks
```bash
# Check worker TypeScript compilation
npx tsc --noEmit -p tsconfig.worker.json

# Check client-side TypeScript compilation  
npx tsc --noEmit -p tsconfig.client.json

# Generate Wrangler types (for Cloudflare Workers)
npm run wrangler:types
```

**Note**: The project currently has no automated testing, linting, or formatting tools configured. The package.json test script is a placeholder that exits with an error.

## Architecture

### Cloudflare Workers Architecture
The application runs entirely on Cloudflare Workers with Durable Objects:

1. **Hono HTTP Server** (`src/worker.ts`):
   - HTTP server with HTML template rendering
   - Static asset serving via Cloudflare Workers ASSETS binding
   - Route handlers for home and room pages
   - Runs on Cloudflare's global edge network

2. **Durable Objects** (`src/gpsync-durable-object.ts`):
   - Real-time collaborative editing using y-durableobjects
   - WebSocket-based communication with Yjs protocol
   - Persistent room state managed by Cloudflare
   - Automatic scaling and cleanup

### Request Flow
1. User accesses room URL via Cloudflare Workers
2. Static assets served from edge cache
3. WebSocket connections upgrade to Durable Objects for real-time collaboration
4. Collaborative editing state synchronized via Yjs operations stored in Durable Objects
5. Go code execution handled via direct Go Playground API calls

### Key URL Patterns
- `/` - Home page
- `/p/:sharedContentId` - Home with pre-loaded Go Playground content
- `/rooms/:roomId` - Collaborative room
- `/rooms/:roomId/p/:sharedContentId` - Room with pre-loaded content

### Project Structure
```
gpsync/
├── src/                   # Cloudflare Workers code
│   ├── worker.ts          # Hono app entry point (main server)
│   ├── gpsync-durable-object.ts # Durable Object for rooms
│   ├── validators.ts      # Input validation
│   └── templates.ts       # HTML templates
├── web/                   # Frontend TypeScript code
│   └── room.ts           # Client-side room functionality
├── public/                # Static assets and webpack output
├── wrangler.toml          # Cloudflare Workers configuration
├── webpack.config.js      # Frontend build configuration
├── tsconfig.worker.json   # Worker TypeScript configuration
├── tsconfig.client.json   # Client TypeScript configuration
└── package.json          # Dependencies and scripts
```

### Important Implementation Details

- **Collaboration Technology**: Uses Yjs with y-durableobjects for real-time collaboration
- **ES Modules**: Entire codebase uses ES modules with .ts file extensions in imports
- **TypeScript**: Strict mode with modern ES features, separate configs for worker/client
- **State Management**: Collaboration state handled by Yjs (persistent in Durable Objects)
- **Room Lifecycle**: Rooms created on-demand, cleanup handled automatically by Cloudflare
- **Go Integration**: Direct Go Playground API calls via fetch (no Node.js dependencies)
- **Validation**: Input validation for room IDs and shared content IDs in `src/validators.ts`
- **Error Handling**: Hono error handling middleware with proper HTTP responses

## Tech Stack

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono with HTML templating
- **Real-time**: Yjs with y-durableobjects
- **Persistence**: Cloudflare Durable Objects
- **Go Integration**: @syumai/goplayground via direct API calls
- **Language**: TypeScript with ES modules

### Frontend  
- **Editor**: CodeMirror with y-codemirror for Yjs integration
- **Real-time**: Yjs client libraries (yjs, y-protocols, lib0)
- **Build**: Webpack 5 with TypeScript and Babel loaders
- **Language**: TypeScript (client-side configuration)

### Development
- **Package Manager**: pnpm
- **Build System**: Webpack with ts-loader, babel-loader
- **TypeScript**: Strict mode, separate worker/client configurations
- **Deployment**: Cloudflare Workers with Wrangler

## Code Style Guidelines

- **ES Modules**: All files use `import`/`export` with `.ts` extensions in relative imports
- **Naming**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **TypeScript**: Explicit type annotations, strict null checks enabled
- **Error Handling**: async/await preferred, centralized Express error middleware
- **Architecture**: Single responsibility principle, clear separation of concerns

# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)
