import { test } from 'node:test'
import assert from 'node:assert/strict'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const nameAgeSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['name', 'age'],
}

test(
  'POST /object returns a JSON object matching the provided schema',
  { timeout: 60_000 },
  async () => {
    const response = await fetch(`${BASE_URL}/object`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instructions: 'You are a helpful assistant. Return only valid JSON.',
        prompt: 'Extract the name and age from: John is 30 years old.',
        output: nameAgeSchema,
      }),
    })

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') ?? '', /^text\/plain/)

    const body = await response.text()
    assert.ok(body.length > 0, 'response body should not be empty')

    let parsed: unknown
    assert.doesNotThrow(() => {
      parsed = JSON.parse(body)
    })

    const object = parsed as { name?: string; age?: number }
    assert.equal(typeof object.name, 'string')
    assert.ok(object.name!.length > 0, 'name should not be empty')
    assert.equal(typeof object.age, 'number')
    assert.ok(object.age! > 0, 'age should be a positive number')
  },
)

test(
  'POST /object without an output schema returns valid JSON',
  { timeout: 60_000 },
  async () => {
    const response = await fetch(`${BASE_URL}/object`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instructions: 'You are a helpful assistant. Return only valid JSON.',
        prompt: 'Return a JSON object with a single key "ok" set to true.',
      }),
    })

    assert.equal(response.status, 200)
    const body = await response.text()
    assert.ok(body.length > 0, 'response body should not be empty')
    assert.doesNotThrow(() => JSON.parse(body))
  },
)

test('POST /object streams the response incrementally', { timeout: 60_000 }, async () => {
  const response = await fetch(`${BASE_URL}/object`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instructions: 'You are a helpful assistant. Return only valid JSON.',
      prompt:
        'Return a JSON object with a single key "list" containing an array of the numbers 1 through 20.',
      output: {
        type: 'object',
        properties: {
          list: { type: 'array', items: { type: 'number' } },
        },
        required: ['list'],
      },
    }),
  })

  assert.equal(response.status, 200)
  assert.ok(response.body, 'response should have a body stream')

  const chunks: string[] = []
  let text = ''
  const reader = response.body!.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(new TextDecoder().decode(value))
    text += chunks[chunks.length - 1]
  }

  assert.ok(chunks.length >= 1, 'response should be delivered in stream chunks')
  assert.ok(text.length > 0, 'streamed body should not be empty')

  let parsed: unknown
  assert.doesNotThrow(() => {
    parsed = JSON.parse(text)
  })
  const object = parsed as { list?: unknown[] }
  assert.ok(Array.isArray(object.list), 'list should be an array')
})
