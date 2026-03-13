import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, language }: { text: string; language: string } = body

  if (!text || !language) {
    throw createError({ statusCode: 400, statusMessage: 'Missing text or language' })
  }

  // Use the free Google Translate endpoint that returns romanization
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', language)
  url.searchParams.set('tl', 'en')
  url.searchParams.set('dt', 'rm') // romanization data
  url.searchParams.set('q', text)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: 'Romanization request failed' })
  }

  const data = await response.json()
  // Response format: [[...], null, null, null, null, null, null, null, null, null, null, null, [romanized_chunks]]
  // The romanization data is in the first array, each item has [translated, original, romanized] or similar
  let romanized = ''
  if (Array.isArray(data) && Array.isArray(data[0])) {
    for (const chunk of data[0]) {
      if (Array.isArray(chunk) && chunk.length >= 4 && typeof chunk[3] === 'string') {
        romanized += chunk[3]
      }
    }
  }

  return { romanized: romanized || '' }
})
