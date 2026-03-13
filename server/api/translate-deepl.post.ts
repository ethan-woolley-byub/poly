import { readBody } from 'h3'

// DeepL uses uppercase language codes and has some special mappings
const DEEPL_LANG_MAP: Record<string, string> = {
  'zh-CN': 'ZH-HANS',
  'zh-TW': 'ZH-HANT',
  'pt': 'PT-BR',
  'pt-PT': 'PT-PT',
  'en': 'EN-US',
  'en-GB': 'EN-GB',
}

function toDeeplCode(code: string): string {
  return DEEPL_LANG_MAP[code] ?? code.toUpperCase()
}

function fromDeeplCode(code: string): string {
  // Reverse lookup for detected language
  const lower = code.toLowerCase()
  for (const [key, val] of Object.entries(DEEPL_LANG_MAP)) {
    if (val === code || val === code.toUpperCase()) return key
  }
  return lower
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const {
    text,
    sourceLanguage,
    targetLanguages
  }: {
    text: string
    sourceLanguage: string
    targetLanguages: string[]
  } = body

  if (!text || !targetLanguages?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters'
    })
  }

  const config = useRuntimeConfig()
  const apiKey = config.deeplApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'DeepL API key not configured'
    })
  }

  const baseUrl = String(apiKey).endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'

  const translations: Record<string, string> = {}
  let detectedLanguage = ''

  await Promise.all(
    targetLanguages.map(async (target) => {
      const reqBody: Record<string, unknown> = {
        text: [text],
        target_lang: toDeeplCode(target),
      }
      if (sourceLanguage) {
        // DeepL source_lang doesn't accept region variants for source
        reqBody.source_lang = sourceLanguage.toUpperCase().split('-')[0]
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw createError({
          statusCode: response.status,
          statusMessage: errorText
        })
      }

      const data = await response.json()
      const t = data.translations[0]
      translations[target] = t.text
      if (!sourceLanguage && t.detected_source_language) {
        detectedLanguage = fromDeeplCode(t.detected_source_language)
      }
    })
  )

  return {
    sourceLanguage: sourceLanguage || detectedLanguage,
    originalText: text,
    translations
  }
})
