import cors from 'cors'
import dotenv from 'dotenv'
import pm from 'picomatch'
import express, { Request, Response } from 'express'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import {
  streamText,
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
  convertToModelMessages,
} from 'ai'

dotenv.config({ path: 'settings.env' })

console.log(`chat-server: ${process.env.APP_VERSION}`)

console.log('MODEL:', process.env.MODEL ? 'SET' : undefined)
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : undefined)
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : undefined)
console.log(
  'GOOGLE_GENERATIVE_AI_API_KEY:',
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'SET' : undefined,
)
console.log('PROVIDER_API_KEY:', process.env.PROVIDER_API_KEY ? 'SET' : undefined)
const baseURL = process.env.BASE_URL || 'https://opencode.ai/zen/v1' // NOSONAR
console.log('BASE_URL:', baseURL)

if (process.env.AI_SDK_LOG_WARNINGS) globalThis.AI_SDK_LOG_WARNINGS = false
console.log('AI_SDK_LOG_WARNINGS:', process.env.AI_SDK_LOG_WARNINGS)

const corsOrigins = process.env.CORS_ORIGINS?.split(/[, \n\r]+/)
  .map((s) => s.trim())
  .filter(Boolean)
  .map((p) => p.replace(/^https?:\/\//i, ''))
console.log('corsOrigins:', corsOrigins)

const maxOutputTokens = process.env.MAX_TOKENS
  ? Number.parseInt(process.env.MAX_TOKENS)
  : undefined
console.log(`maxOutputTokens: ${maxOutputTokens}`)
console.log(`INSTRUCTIONS: ${process.env.INSTRUCTIONS}`)

const model = getModel()
console.log(`Loaded modelId: ${model.modelId}`)

const providerOptions = getProviderOptions()
console.log('providerOptions:', providerOptions)

const app = express()
const port = process.env.PORT || 3000 // NOSONAR

app.use(express.json())

app.use(cors({ origin: corsCallback }))

app.listen(port, () => console.log(`Listening on PORT: ${port}`))

// app.get('/app-health-check', (_req, res) => res.sendStatus(200))

app.post('/', async (req: Request, res: Response) => {
  // console.log('req.headers:', req.headers)
  // console.log('authorization:', req.headers.authorization)
  const { messages, system } = req.body
  // if (system) console.log('system:', system.substring(0, 512))
  const modelMessages = await convertToModelMessages(messages)
  console.log('modelMessages:', modelMessages.length)
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model: model,
        messages: modelMessages,
        system: system || process.env.INSTRUCTIONS,
        maxOutputTokens,
        providerOptions,
      })
      writer.merge(result.toUIMessageStream())
    },
  })
  // console.log('stream:', stream)
  pipeUIMessageStreamToResponse({ response: res, stream })
})

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
  } catch {
    console.error('parsing PROVIDER_OPTIONS as JSON')
  }
}
