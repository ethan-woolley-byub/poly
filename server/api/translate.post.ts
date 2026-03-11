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

  if (!text || !targetLanguages?.length) {
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
  let detectedLanguage = ''

  await Promise.all(
    targetLanguages.map(async (target) => {
      const params = new URLSearchParams({
        key: apikey,
        q: text,
        target,
        format: 'text'
      })
      if (sourceLanguage) {
        params.set('source', sourceLanguage)
      }

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
      const t = data.data.translations[0]
      translations[target] = t.translatedText
      if (!sourceLanguage && t.detectedSourceLanguage) {
        detectedLanguage = t.detectedSourceLanguage
      }
    })
  )

  return {
    sourceLanguage: sourceLanguage || detectedLanguage,
    originalText: text,
    translations
  }
})
