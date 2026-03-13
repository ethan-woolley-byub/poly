import { SpeechifyClient } from '@speechify/api'

// Map app language codes to Speechify voice IDs
const VOICE_MAP: Record<string, string> = {
  ar: 'ismail',      // ar-AE
  bn: 'avik',        // bn-IN
  da: 'frederik',    // da-DK
  de: 'hannes',      // de-DE
  el: 'kostas',      // el-GR
  en: 'oliver',      // en-US
  'en-GB': 'russell',
  'en-AU': 'kim',
  'en-IN': 'ankit',
  es: 'alejandro',   // es-MX
  et: 'mart',        // et-EE
  fi: 'eino',        // fi-FI
  fr: 'raphael',     // fr-FR
  'fr-CA': 'raphael',
  gu: 'kinjal',      // gu-IN
  he: 'moshe',       // he-IL
  iw: 'moshe',       // he-IL alias
  hi: 'hemant',      // hi-IN
  it: 'lazzaro',     // it-IT
  ja: 'sakura',      // ja-JP
  ko: 'sang-hoon',   // ko-KR
  mr: 'sanket',      // mr-IN
  nb: 'jakob',       // nb-NO
  no: 'jakob',       // nb-NO alias
  nl: 'daan',        // nl-NL
  pl: 'dominika',    // pl-PL
  pt: 'henrique',    // pt-BR
  'pt-PT': 'diogo',
  ru: 'mikhail',     // ru-RU
  sv: 'axel',        // sv-SE
  ta: 'ammu',        // ta-IN
  te: 'sreya',       // te-IN
  tr: 'yusuf',       // tr-TR
  uk: 'lesya',       // uk-UA
  ur: 'aaliya',      // ur-IN
  vi: 'trinh',       // vi-VN
  yue: 'chun-kit',   // yue-CN
}

// Exported set of supported language codes for the client
export const TTS_SUPPORTED_LANGUAGES = new Set(Object.keys(VOICE_MAP))

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, languageCode } = body as { text: string; languageCode?: string }

  if (!text?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'text is required' })
  }

  const config = useRuntimeConfig()
  const token = config.speechifyApiToken

  if (!token) {
    throw createError({ statusCode: 500, statusMessage: 'Speechify API token not configured' })
  }

  const voiceId = (languageCode && VOICE_MAP[languageCode]) || 'oliver'

  try {
    const client = new SpeechifyClient({ token })
    const response = await client.tts.audio.speech({
      input: text.substring(0, 5000),
      voiceId,
      audioFormat: 'mp3',
    })

    return { audioContent: response.audioData }
  } catch (err: any) {
    console.error('Speechify TTS error:', err.message || err)
    throw createError({ statusCode: 500, statusMessage: 'TTS synthesis failed' })
  }
})
