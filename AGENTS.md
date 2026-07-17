# Agent Guide

- [index.ts](src/index.ts) — Single source Express.js AI-SDK server

## Commands

ALWAYS use the `npm run *` command

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run build`    | `npx tsc` — compiles `src/` → `dist/` |
| `npm run lint`     | ESLint on `src/`                      |
| `npm run tsc`      | TypeScript Check Only `tsc --noEmit`  |
| `npm run prettier` | ALWAYS RUN AFTER EDITING FILES        |

## Endpoints

| Server Endpoint                                                                               | Client                                                                      |
| :-------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| [/chat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream)                 | [useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)             |
| [/completion](https://ai-sdk.dev/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response) | [useCompletion](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion) |
| [/object](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)                          | [useObject](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object)         |
