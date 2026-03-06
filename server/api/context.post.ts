import { readBody } from 'h3'

function extractJson(text: string) {
  if (!text) throw new Error('Empty Gemini response')

  // 1. Strip markdown/code fences
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  // 2. Extract first JSON object
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('No JSON object found in response')
  }

  // 3. Attempt parse
  try {
    return JSON.parse(match[0])
  } catch (err) {
    console.error('Raw Gemini output:', cleaned)
    throw err
  }
}
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { items }: {
    items: { language: string; text: string }[]
  } = body

  if (!items?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No items provided'
    })
  }

  console.log(`Generating context for ${items.length} items...`)

  const config = useRuntimeConfig()
  const apiKey = config.googleGeminiApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gemini API key not configured'
    })
  }

  // 🔹 Build a single prompt
  const prompt = `
You will receive multiple language entries.
For EACH entry, produce:

1. Exactly 3 example sentences using the word or phrase
2. Exactly 3 common dictionary-style definitions
3. Exactly 3 synonyms

Return a single valid JSON object.
Do not include comments.
Do not include trailing commas.
All arrays must be valid JSON arrays.
All strings must be double-quoted.

INPUT:
${items
  .map(
    i => `- Language: ${i.language}
  Text: "${i.text}"`
  )
  .join('\n\n')}

OUTPUT FORMAT:
{
  "<languageCode>": {
    "examples": string[],
    "definitions": string[],
    "synonyms": string[]
  }
}

Rules:
- Keys must match language codes exactly
- No extra text
- No markdown
- JSON only
`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw createError({
        statusCode: response.status,
        statusMessage: errorText
      })
    }

    const data = await response.json()
    const textOutput =
      data.candidates?.[0]?.content?.parts?.[0]?.text

    const parsed = extractJson(textOutput)

    const results: Record<string, any> = {}

    // VERIFY that format is correct for every language
    for (const { language } of items) {
      const entry = parsed[language]

      if (
        !entry ||
        !Array.isArray(entry.examples) ||
        !Array.isArray(entry.definitions) ||
        !Array.isArray(entry.synonyms)
      ) {
        results[language] = {
          examples: [],
          definitions: [],
          synonyms: []
        }
      } else {
        results[language] = entry
      }
    }

    // // 🛡️ Safety: ensure all languages exist
    // const results: Record<string, any> = {}
    // for (const { language } of items) {
    //   results[language] =
    //     parsed[language] ?? {
    //       examples: [],
    //       definitions: [],
    //       synonyms: []
    //     }
    // }
    console.log(`Gemini context generation successful: ${JSON.stringify(results)}`)
    return results
  } catch (err) {
    console.error('Gemini batch context failed', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Context generation failed'
    })
  }
})
