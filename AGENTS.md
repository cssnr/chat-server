# Agent Guide

Before answering any question that involves facts about ANYTHING, you MUST output at least one Read, WebFetch, or WebSearch tool call.
If your first output is text instead of a tool call, you have failed.

- [index.ts](src/index.ts) — Single source Express.js ai-sdk server with single route `/`

## Commands

ALWAYS use the `npm run *` command

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run build`    | `npx tsc` — compiles `src/` → `dist/` |
| `npm run lint`     | ESLint on `src/`                      |
| `npm run tsc`      | TypeScript Check Only `tsc --noEmit`  |
| `npm run prettier` | ALWAYS RUN AFTER EDITING FILES        |
