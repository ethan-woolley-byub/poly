// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    'nuxt-auth-utils',
  ],
  runtimeConfig: {
    authSecret: process.env.NUXT_AUTH_SECRET,
    googleTranslateApiKey: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID,
    googleGeminiApiKey: process.env.NUXT_PUBLIC_GOOGLE_GEMINI,
  },
  runtimeConfigDefaults: {
    public: {
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    }
  }
})