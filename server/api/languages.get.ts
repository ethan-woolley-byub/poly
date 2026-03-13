export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  // Fetch Google Translate languages
  const gtRes = await $fetch<{ data: { languages: { language: string; name: string }[] } }>(
    'https://translation.googleapis.com/language/translate/v2/languages',
    {
      query: {
        key: config.googleTranslateApiKey,
        target: 'en'
      }
    }
  )
  const gtLangs = gtRes.data.languages ?? []

  // Fetch DeepL languages
  let dlLangs: { language: string; name: string }[] = []
  const deeplKey = config.deeplApiKey
  if (deeplKey) {
    const baseUrl = String(deeplKey).endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/languages'
      : 'https://api.deepl.com/v2/languages'
    const dlRes = await fetch(baseUrl, {
      headers: { 'Authorization': `DeepL-Auth-Key ${deeplKey}` },
    })
    if (dlRes.ok) {
      dlLangs = await dlRes.json() as { language: string; name: string }[]
    }
  }

  // Normalize DeepL codes to lowercase and map regional variants
  const DEEPL_CODE_MAP: Record<string, string> = {
    'ZH-HANS': 'zh-CN',
    'ZH-HANT': 'zh-TW',
    'PT-BR': 'pt',
    'PT-PT': 'pt-PT',
    'EN-US': 'en',
    'EN-GB': 'en-GB',
  }
  const dlSet = new Set<string>()
  const dlNameMap = new Map<string, string>()
  for (const dl of dlLangs) {
    const code = DEEPL_CODE_MAP[dl.language] ?? dl.language.toLowerCase()
    dlSet.add(code)
    dlNameMap.set(code, dl.name)
  }

  // Merge: start with GT languages, mark support
  const merged = new Map<string, { language: string; name: string; gt: boolean; dl: boolean }>()
  for (const lang of gtLangs) {
    merged.set(lang.language, {
      language: lang.language,
      name: lang.name,
      gt: true,
      dl: dlSet.has(lang.language),
    })
  }

  // Add DL-only languages
  for (const code of dlSet) {
    if (!merged.has(code)) {
      merged.set(code, {
        language: code,
        name: dlNameMap.get(code) ?? code,
        gt: false,
        dl: true,
      })
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name))
})
