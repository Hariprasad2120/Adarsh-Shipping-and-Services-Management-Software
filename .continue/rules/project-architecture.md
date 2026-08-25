# Project Architecture

This repository is a Next.js 16 + React 19 + TypeScript monolith application.

Key structure:

- `src/app`: App Router routes and route-level server/client entry points
- `src/components`: shared production UI components
- `src/modules`: module-owned business UI and module-specific compositions
- `src/lib`: shared utilities, helpers, and non-UI logic
- `src/styles`: global styling and design-system related styles
- `prisma`: schema, migrations, and seed scripts
- `scripts`: verification, migration, benchmarking, and operational tooling
- `docs`: design system, migration, performance, and engineering guidance

Important conventions:

- Prefer existing shared components over creating new one-off UI
- Preserve business logic, RBAC, integrations, validation, and server actions
- Follow the existing file organization before introducing new folders
- Use TypeScript for new code
- Prefer repo scripts for verification when available

Useful commands:

- `npm run dev`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run quality`

Before running heavy Node.js commands, set:

`$env:NODE_OPTIONS='--max-old-space-size=8192'`
