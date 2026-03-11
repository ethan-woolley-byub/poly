// Returns the set of language codes that have Speechify TTS voices
const TTS_SUPPORTED = [
  'ar', 'bn', 'da', 'de', 'el', 'en', 'en-GB', 'en-AU', 'en-IN',
  'es', 'et', 'fi', 'fr', 'fr-CA', 'gu', 'he', 'iw', 'hi', 'it',
  'ja', 'ko', 'mr', 'nb', 'no', 'nl', 'pl', 'pt', 'pt-PT', 'ru',
  'sv', 'ta', 'te', 'tr', 'uk', 'ur', 'vi', 'yue',
]

export default defineEventHandler(() => TTS_SUPPORTED)
