import { defineNuxtPlugin } from '#app'

type Language = {
  language: string
  name: string
}

export default defineNuxtPlugin(async (nuxtApp) => {
  // Global reactive cache (SSR-safe)
  const supportedLanguages = useState<Language[]>(
    'supported-languages',
    () => []
  )

  // Only fetch once
  if (!supportedLanguages.value.length) {
    try {
      const data = await $fetch<Language[]>('/api/languages')
      supportedLanguages.value = data
    } catch (err) {
      console.error('Failed to load supported languages', err)
    }
  }

  // Provide globally
  return {
    provide: {
      supportedLanguages
    }
  }
})
