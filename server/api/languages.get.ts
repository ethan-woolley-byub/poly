export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  const res = await $fetch(
    'https://translation.googleapis.com/language/translate/v2/languages',
    {
      query: {
        key: config.googleTranslateApiKey,
        target: 'en'
      }
    }
  )

  return res.data.languages ?? []

})
