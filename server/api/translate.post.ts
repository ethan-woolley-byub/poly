import { readBody } from 'h3'

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

  if (!text || !sourceLanguage || !targetLanguages?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters'
    })
  }

  const config = useRuntimeConfig()
  const apikey = config.googleTranslateApiKey

  if (!apikey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google Translation API key not configured'
    })
  }

  const url = 'https://translation.googleapis.com/language/translate/v2'
  const translations: Record<string, string> = {}

  await Promise.all(
    targetLanguages.map(async (target) => {
      const params = new URLSearchParams({
        key: apikey,
        q: text,
        source: sourceLanguage,
        target,
        format: 'text'
      })

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw createError({
          statusCode: response.status,
          statusMessage: errorText
        })
      }

      const data = await response.json()
      translations[target] = data.data.translations[0].translatedText
    })
  )

  return {
    sourceLanguage,
    originalText: text,
    translations
  }
})
