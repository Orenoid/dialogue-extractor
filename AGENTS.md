# Repository Guidelines

## Project Introduction

This repository is a `pnpm` workspace managed by `Turborepo` for a podcast note product.

Stack:
- `apps/web`: `Next.js` App Router app with TypeScript, Tailwind CSS v4, Storybook, Vitest, `shadcn/ui`-style primitives, and Vercel AI SDK packages.
- `apps/api`: Node-compatible TypeScript backend designed for deployment on `Cloudflare Workers`, with Wrangler and Vitest.

Core commands:
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm storybook`

Conventions:
- Frontend source lives under `apps/web/src`.
- Worker source lives under `apps/api/src`.
- Shared workspace orchestration is defined in `package.json` and `turbo.json`.

## Project Structure

## Review Rules
- `pnpm build` must pass
- `pnpm test` must pass
- e2e tests for happy path, unit tests for edge cases

## Development Convention and Guidance
