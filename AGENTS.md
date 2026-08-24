# Agent Guide

- [index.ts](src/index.ts) — Single source Express.js AI-SDK server
- [README.md](README.md) — Server documentation

- [AI SDK](https://ai-sdk.dev/docs/reference)
- [Express.js](https://expressjs.com/en/5x/api/)

## Commands

ALWAYS use the `npm run *` command

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run build`    | `npx tsc` — compiles `src/` → `dist/` |
| `npm run lint`     | ESLint on `src/`                      |
| `npm run tsc`      | TypeScript Check Only `tsc --noEmit`  |
| `npm run prettier` | ALWAYS RUN AFTER EDITING FILES        |

## Endpoints and Documentation

| Server Endpoint | Client                                                                      |
| :-------------- | :-------------------------------------------------------------------------- |
| `/chat`         | [useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)             |
| `/completion`   | [useCompletion](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion) |
| `/object`       | [useObject](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object)         |

- [createUIMessageStream](https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream)
- [pipeUIMessageStreamToResponse](https://ai-sdk.dev/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response)
- [streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
