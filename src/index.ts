import createDebug from 'debug'
import cors from 'cors'
import dotenv from 'dotenv'
import pm from 'picomatch'
import express, { Request, Response } from 'express'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import {
  type GenerateTextEndEvent,
  Output,
  consumeStream,
  convertToModelMessages,
  createUIMessageStream,
  jsonSchema,
  pipeTextStreamToResponse,
  pipeUIMessageStreamToResponse,
  streamText,
  toTextStream,
  toUIMessageStream,
} from 'ai'

dotenv.config({ path: 'settings.env' })

console.log('chat-server:', process.env.APP_VERSION)

console.log('DEBUG:', process.env.DEBUG)
createDebug.enable(process.env.DEBUG ?? '')
const debug = createDebug('app')
debug('debug enabled: app')

console.log('DISABLE_CHAT:', getBool(process.env.DISABLE_CHAT))
console.log('DISABLE_COMPLETION:', getBool(process.env.DISABLE_COMPLETION))
console.log('DISABLE_OBJECT:', getBool(process.env.DISABLE_OBJECT))

console.log('MODEL:', process.env.MODEL)
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : undefined)
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : undefined)
console.log(
  'GOOGLE_GENERATIVE_AI_API_KEY:',
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'SET' : undefined,
)

console.log('PROVIDER_API_KEY:', process.env.PROVIDER_API_KEY ? 'SET' : undefined)
const baseURL = process.env.BASE_URL || 'https://opencode.ai/zen/v1' // NOSONAR
console.log('BASE_URL:', baseURL)

console.log('AI_SDK_LOG_WARNINGS:', getBool(process.env.AI_SDK_LOG_WARNINGS))
if (!getBool(process.env.AI_SDK_LOG_WARNINGS)) globalThis.AI_SDK_LOG_WARNINGS = false

const corsOrigins = process.env.CORS_ORIGINS?.split(/[, \n\r]+/)
  .map((s) => s.trim())
  .filter(Boolean)
  .map((p) => p.replace(/^https?:\/\//i, ''))
console.log('corsOrigins:', corsOrigins)

const maxOutputTokens = process.env.MAX_TOKENS
  ? Number.parseInt(process.env.MAX_TOKENS)
  : undefined
console.log('maxOutputTokens:', maxOutputTokens)

const disableInstructions = getBool(process.env.DISABLE_CLIENT_INSTRUCTIONS)
console.log('disableInstructions:', disableInstructions)

process.env.INSTRUCTIONS_CHAT = process.env.INSTRUCTIONS_CHAT || process.env.INSTRUCTIONS // NOSONAR
console.log('INSTRUCTIONS_CHAT:', process.env.INSTRUCTIONS_CHAT)
console.log('INSTRUCTIONS_COMPLETION:', process.env.INSTRUCTIONS_COMPLETION)
console.log('INSTRUCTIONS_OBJECT:', process.env.INSTRUCTIONS_OBJECT)

const model = getModel()
console.log('Loaded modelId:', model.modelId)

const providerOptions = getProviderOptions()
console.log('providerOptions:', providerOptions)

const app = express()
const port = process.env.PORT || 3000 // NOSONAR

app.use(express.json({ limit: '10mb' }))
app.use(cors({ origin: corsCallback }))
app.listen(port, () => console.log(`Listening on PORT: ${port}`))

// app.get('/app-health-check', (_req, res) => res.sendStatus(200))

if (!getBool(process.env.DISABLE_CHAT)) {
  app.post(['/', '/chat'], async (req: Request, res: Response) => {
    // debug('req.headers:', req.headers)
    // debug('authorization:', req.headers.authorization)
    const { messages, system } = req.body
    debug('system:', system?.length)
    // debug('system:', system?.substring(0, 128))
    const modelMessages = await convertToModelMessages(messages)
    debug('modelMessages:', modelMessages.length)
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        const result = streamText({
          model: model,
          messages: modelMessages,
          system: (!disableInstructions && system) || process.env.INSTRUCTIONS_CHAT,
          maxOutputTokens,
          providerOptions,
          onError: onStreamError,
          onEnd: onStreamEnd,
        })
        writer.merge(toUIMessageStream({ stream: result.stream }))
      },
    })
    pipeUIMessageStreamToResponse({ response: res, stream })
  })
}

if (!getBool(process.env.DISABLE_COMPLETION)) {
  app.post('/completion', async (req: Request, res: Response) => {
    const { prompt, system } = req.body
    debug('prompt:', prompt?.length)
    debug('system:', system?.length)
    const result = streamText({
      model: model,
      prompt,
      system: (!disableInstructions && system) || process.env.INSTRUCTIONS_COMPLETION,
      maxOutputTokens,
      providerOptions,
      onError: onStreamError,
      onEnd: onStreamEnd,
    })
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.merge(toUIMessageStream({ stream: result.stream }))
      },
    })
    pipeUIMessageStreamToResponse({
      response: res,
      stream,
      consumeSseStream: consumeStream,
    })
  })
}

if (!getBool(process.env.DISABLE_OBJECT)) {
  app.post('/object', async (req: Request, res: Response) => {
    const { output, prompt, system } = req.body
    debug('output:', output?.length)
    debug('prompt:', prompt?.length)
    debug('system:', system?.length)
    const result = streamText({
      model: model,
      prompt,
      system: (!disableInstructions && system) || process.env.INSTRUCTIONS_OBJECT,
      maxOutputTokens,
      providerOptions,
      output: output ? Output.object({ schema: jsonSchema(output) }) : Output.json(),
      onError: onStreamError,
      onEnd: onStreamEnd,
    })
    pipeTextStreamToResponse({
      response: res,
      stream: toTextStream({ stream: result.stream }),
    })
  })
}

function getBool(value: string | undefined): boolean {
  if (!value) return false
  return ['1', 't', 'true', 'y', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function corsCallback(
  origin: string | undefined,
  callback: (err: Error | null, origin?: boolean) => void,
) {
  if (!origin || !corsOrigins) return callback(null, true)
  try {
    callback(null, pm.isMatch(new URL(origin).host, corsOrigins))
  } catch {
    callback(null, false)
  }
}

function getModel() {
  if (process.env.MODEL?.startsWith('gemini')) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY')
    return google(process.env.MODEL)
  } else if (process.env.MODEL?.includes('gpt')) {
    if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')
    return openai(process.env.MODEL)
  } else if (process.env.MODEL?.startsWith('claude')) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY')
    return anthropic(process.env.MODEL)
  } else {
    const provider = createOpenAICompatible({
      name: 'zen',
      baseURL: baseURL,
      apiKey: process.env.PROVIDER_API_KEY,
      includeUsage: true,
    })
    return provider(process.env.MODEL || 'big-pickle') // NOSONAR
  }
}

function getProviderOptions() {
  if (!process.env.PROVIDER_OPTIONS) return
  try {
    return JSON.parse(process.env.PROVIDER_OPTIONS)
  } catch (e) {
    console.error('error parsing PROVIDER_OPTIONS as JSON:', e)
  }
}

function onStreamError(error: unknown) {
  console.error('error:', error)
}

function onStreamEnd({ finalStep, finishReason, text, usage }: GenerateTextEndEvent) {
  debug('reasoning:', finalStep.reasoningText)
  debug('response:', text)
  debug('usage:', usage)
  debug('finishReason:', finishReason)
}
