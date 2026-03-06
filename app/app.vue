<template>
  <div class="app-root">
    <div v-if="isMobile" class="mobile">
      <!-- Translate View -->
      <template v-if="currentView === 'translate'">
        <div
          class="pages-container"
          ref="pagesContainer"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div
            class="pages-track"
            :style="{ transform: `translateX(${trackOffset}px)`, transition: isSwiping ? 'none' : 'transform 0.3s ease' }"
          >
            <div
              v-for="(page, pageIdx) in pages"
              :key="pageIdx"
              class="page"
            >
              <div class="lang-grid">
                <div v-for="lang in page" :key="lang.language" class="lang-card">
                  <div class="lang-name">
                    <span>{{ lang.name }}</span>
                    <button class="remove-btn" @click="removeLanguage(lang.language)" aria-label="Remove language">✕</button>
                  </div>
                  <textarea
                    :value="langTexts[lang.language] ?? ''"
                    class="lang-textarea"
                    :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                    :placeholder="`Type in ${lang.name}...`"
                    @input="onLangInput(lang.language, ($event.target as HTMLTextAreaElement).value)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="tab-indicator">
          <span
            v-for="i in totalPages"
            :key="i"
            class="tab-dot"
            :class="{ active: i - 1 === currentPage }"
            @click="currentPage = i - 1"
          />
        </div>
      </template>

      <!-- History View -->
      <template v-if="currentView === 'history'">
        <div class="bookmarks-view">
          <div v-if="!history.length" class="bookmarks-empty">
            No translation history yet.
          </div>
          <div v-else class="bookmarks-table-wrapper">
            <table class="bookmarks-table">
              <thead>
                <tr>
                  <th v-for="lang in reversedLanguages" :key="lang.language">{{ lang.name }}</th>
                  <th class="action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(entry, idx) in history" :key="idx" class="history-row" @click="restoreFromHistory(entry)">
                  <td
                    v-for="lang in reversedLanguages"
                    :key="lang.language"
                    :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                  >
                    <template v-if="lang.language === entry.sourceLang">
                      {{ entry.sourceText }}
                    </template>
                    <template v-else>
                      {{ entry.translations[lang.language] ?? '' }}
                    </template>
                  </td>
                  <td class="action-col" @click.stop>
                    <button class="delete-btn" @click="deleteHistoryEntry(idx)" aria-label="Delete history entry">🗑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Bookmarks View -->
      <template v-if="currentView === 'bookmarks'">
        <div class="bookmarks-view">
          <div v-if="!savedPhrases.length" class="bookmarks-empty">
            No saved phrases yet.
          </div>
          <div v-else class="bookmarks-table-wrapper">
            <table class="bookmarks-table">
              <thead>
                <tr>
                  <th v-for="lang in reversedLanguages" :key="lang.language">{{ lang.name }}</th>
                  <th class="action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(phrase, idx) in savedPhrases" :key="idx" class="history-row" @click="restoreFromHistory(phrase)">
                  <td
                    v-for="lang in reversedLanguages"
                    :key="lang.language"
                    :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                  >
                    <template v-if="lang.language === phrase.sourceLang">
                      {{ phrase.sourceText }}
                    </template>
                    <template v-else>
                      {{ phrase.translations[lang.language] ?? '...' }}
                    </template>
                  </td>
                  <td class="action-col" @click.stop>
                    <button class="delete-btn" @click="deletePhrase(idx)" aria-label="Delete phrase">🗑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <nav class="bottom-nav">
        <button v-if="currentView === 'translate'" class="nav-btn" @click="savePhrase" aria-label="Save phrase">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        </button>
        <span v-else class="nav-btn-spacer" />

        <button class="nav-btn" :class="{ active: currentView === 'history' }" @click="toggleHistory" aria-label="History">
          <svg width="22" height="22" viewBox="0 0 24 24" :fill="currentView === 'history' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>

        <button v-if="currentView === 'translate'" class="add-btn" @click="showModal = true" aria-label="Add language">+</button>
        <button v-else class="add-btn" @click="currentView = 'translate'" aria-label="Back to translate">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </button>

        <button class="nav-btn" :class="{ active: currentView === 'bookmarks' }" @click="toggleBookmarks" aria-label="Bookmarks">
          <svg width="22" height="22" viewBox="0 0 24 24" :fill="currentView === 'bookmarks' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </nav>

      <div v-if="showModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <input
              ref="searchInput"
              v-model="search"
              type="text"
              placeholder="Search languages..."
              class="search-input"
            />
            <button class="close-btn" @click="closeModal" aria-label="Close">✕</button>
          </div>
          <ul class="language-list" role="listbox">
            <li
              v-for="lang in filteredLanguages"
              :key="lang.language"
              role="option"
              class="language-item"
              @click="selectLanguage(lang)"
            >
              {{ lang.name }} ({{ lang.language }})
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="desktop">
      <!-- Desktop UI -->
    </div>
  </div>
</template>

<script setup lang="ts">
const LANGS_PER_PAGE = 4
const DEFAULT_LANGUAGES = ['en', 'es', 'sw', 'de', 'pt', 'ja']
const RTL_LANGUAGES = new Set(['ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'ckb', 'pa-Arab', 'ms-Arab'])

const { isMobile } = useDevice()

const currentView = ref<'translate' | 'bookmarks' | 'history'>('translate')

const app = useNuxtApp()
const languages = app.$supportedLanguages.value as { language: string; name: string }[]

const savedCodes = useCookie<string[]>('selected-languages', {
  default: () => DEFAULT_LANGUAGES,
  watch: true,
  maxAge: 60 * 60 * 24 * 365,
})

function resolveLanguages(codes: string[]): { language: string; name: string }[] {
  const map = new Map(languages.map(l => [l.language, l]))
  return codes.map(c => map.get(c)).filter(Boolean) as { language: string; name: string }[]
}

const selectedLanguages = ref(resolveLanguages(savedCodes.value ?? DEFAULT_LANGUAGES))

watch(selectedLanguages, (val) => {
  savedCodes.value = val.map(l => l.language)
}, { deep: true })

const langTexts = reactive<Record<string, string>>({})
const isTranslating = ref(false)
let translateTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 500

const DEFAULT_SOURCE = { code: 'en', text: 'Lets become polyglots!!' }
const savedSource = useCookie<{ code: string; text: string }>('last-source', {
  default: () => DEFAULT_SOURCE,
  watch: true,
  maxAge: 60 * 60 * 24 * 365,
})

let lastTranslatedText = ''

function onLangInput(code: string, value: string) {
  langTexts[code] = value
  savedSource.value = { code, text: value }
  if (translateTimer) clearTimeout(translateTimer)
  translateTimer = setTimeout(() => {
    const trimmed = value.trim()
    if (trimmed === lastTranslatedText) return
    lastTranslatedText = trimmed
    triggerTranslation(code, value)
  }, DEBOUNCE_MS)
}

async function triggerTranslation(sourceCode: string, text: string) {
  if (!text.trim()) {
    for (const lang of selectedLanguages.value) {
      if (lang.language !== sourceCode) langTexts[lang.language] = ''
    }
    return
  }
  const targetLanguages = selectedLanguages.value
    .map(l => l.language)
    .filter(c => c !== sourceCode)
  if (!targetLanguages.length) return

  isTranslating.value = true
  try {
    const result = await $fetch<{
      translations: Record<string, string>
    }>('/api/translate', {
      method: 'POST',
      body: { text, sourceLanguage: sourceCode, targetLanguages },
    })
    for (const [code, translated] of Object.entries(result.translations)) {
      langTexts[code] = translated
    }
    addToHistory(sourceCode, text, result.translations)
  } catch (e) {
    console.error('Translation failed', e)
  } finally {
    isTranslating.value = false
  }
}

const showModal = ref(false)
const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const pagesContainer = ref<HTMLElement | null>(null)
const currentPage = ref(0)

// Swipe state
const isSwiping = ref(false)
let touchStartX = 0
let touchDeltaX = 0
const swipeDelta = ref(0)

const reversedLanguages = computed(() => [...selectedLanguages.value].reverse())

const pages = computed(() => {
  const result: { language: string; name: string }[][] = []
  for (let i = 0; i < reversedLanguages.value.length; i += LANGS_PER_PAGE) {
    result.push(reversedLanguages.value.slice(i, i + LANGS_PER_PAGE))
  }
  return result.length ? result : [[]]
})

const totalPages = computed(() => pages.value.length)

const containerWidth = computed(() => pagesContainer.value?.offsetWidth ?? 0)

const trackOffset = computed(() => {
  return -currentPage.value * containerWidth.value + swipeDelta.value
})

const selectedCodes = computed(() => new Set(selectedLanguages.value.map(l => l.language)))

const filteredLanguages = computed(() => {
  const q = search.value.toLowerCase()
  return languages.filter(lang =>
    !selectedCodes.value.has(lang.language) &&
    (lang.name.toLowerCase().includes(q) || lang.language.toLowerCase().includes(q))
  )
})

async function selectLanguage(lang: { language: string; name: string }) {
  selectedLanguages.value.push(lang)
  closeModal()
  if (savedSource.value && savedSource.value.text.trim()) {
    try {
      const result = await $fetch<{ translations: Record<string, string> }>('/api/translate', {
        method: 'POST',
        body: { text: savedSource.value.text, sourceLanguage: savedSource.value.code, targetLanguages: [lang.language] },
      })
      if (result.translations[lang.language]) {
        langTexts[lang.language] = result.translations[lang.language]!
      }
    } catch (e) {
      console.error('Translation for new language failed', e)
    }
  }
}

function removeLanguage(code: string) {
  const idx = selectedLanguages.value.findIndex(l => l.language === code)
  if (idx !== -1) selectedLanguages.value.splice(idx, 1)
  if (currentPage.value >= totalPages.value && currentPage.value > 0) {
    currentPage.value = totalPages.value - 1
  }
}

function closeModal() {
  showModal.value = false
  search.value = ''
}

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchDeltaX = 0
  isSwiping.value = true
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  touchDeltaX = touch.clientX - touchStartX
  swipeDelta.value = touchDeltaX
}

function onTouchEnd() {
  isSwiping.value = false
  const threshold = containerWidth.value * 0.25
  if (touchDeltaX < -threshold && currentPage.value < totalPages.value - 1) {
    currentPage.value++
  } else if (touchDeltaX > threshold && currentPage.value > 0) {
    currentPage.value--
  }
  swipeDelta.value = 0
}

watch(showModal, (val) => {
  if (val) {
    nextTick(() => searchInput.value?.focus())
  }
})

onMounted(async () => {
  savedPhrases.value = loadSavedPhrases()
  history.value = loadHistory()
  const src = savedSource.value ?? DEFAULT_SOURCE
  langTexts[src.code] = src.text
  const targets = selectedLanguages.value
    .map(l => l.language)
    .filter(c => c !== src.code)
  if (!src.text.trim() || !targets.length) return
  try {
    const result = await $fetch<{ translations: Record<string, string> }>('/api/translate', {
      method: 'POST',
      body: { text: src.text, sourceLanguage: src.code, targetLanguages: targets },
    })
    for (const [code, translated] of Object.entries(result.translations)) {
      langTexts[code] = translated
    }
  } catch (e) {
    console.error('Initial translation failed', e)
  }
})

// Saved phrases (localStorage)
const STORAGE_KEY = 'poly-saved-phrases'

interface SavedPhrase {
  sourceLang: string
  sourceText: string
  translations: Record<string, string>
}

const savedPhrases = ref<SavedPhrase[]>([])

function loadSavedPhrases(): SavedPhrase[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistPhrases() {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPhrases.value))
}

function savePhrase() {
  const src = savedSource.value
  if (!src || !src.text.trim()) return
  // Prevent duplicates
  if (savedPhrases.value.some(p => p.sourceText === src.text && p.sourceLang === src.code)) return
  const translations: Record<string, string> = {}
  for (const lang of selectedLanguages.value) {
    if (lang.language !== src.code && langTexts[lang.language]?.trim()) {
      translations[lang.language] = langTexts[lang.language]!
    }
  }
  if (!Object.keys(translations).length) return
  savedPhrases.value.unshift({ sourceLang: src.code, sourceText: src.text, translations })
  persistPhrases()
}

function deletePhrase(idx: number) {
  savedPhrases.value.splice(idx, 1)
  persistPhrases()
}

function toggleBookmarks() {
  currentView.value = currentView.value === 'bookmarks' ? 'translate' : 'bookmarks'
}

function toggleHistory() {
  currentView.value = currentView.value === 'history' ? 'translate' : 'history'
}

// Translation history (localStorage)
const HISTORY_KEY = 'poly-translation-history'
const MAX_HISTORY = 50

const history = ref<SavedPhrase[]>([])

function loadHistory(): SavedPhrase[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistHistory() {
  if (import.meta.server) return
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

function addToHistory(sourceCode: string, text: string, translations: Record<string, string>) {
  // Remove existing entry with same source text + lang to avoid duplicates
  const existingIdx = history.value.findIndex(h => h.sourceText === text && h.sourceLang === sourceCode)
  if (existingIdx !== -1) history.value.splice(existingIdx, 1)
  history.value.unshift({ sourceLang: sourceCode, sourceText: text, translations: { ...translations } })
  if (history.value.length > MAX_HISTORY) history.value.length = MAX_HISTORY
  persistHistory()
}

function deleteHistoryEntry(idx: number) {
  history.value.splice(idx, 1)
  persistHistory()
}

function restoreFromHistory(entry: SavedPhrase) {
  langTexts[entry.sourceLang] = entry.sourceText
  savedSource.value = { code: entry.sourceLang, text: entry.sourceText }
  lastTranslatedText = entry.sourceText.trim()
  for (const [code, translated] of Object.entries(entry.translations)) {
    langTexts[code] = translated
  }
  currentView.value = 'translate'
}

// Auto-translate missing languages when entering bookmarks view
watch(currentView, async (view) => {
  if (view !== 'bookmarks') return
  const activeCodes = selectedLanguages.value.map(l => l.language)
  let changed = false
  for (const phrase of savedPhrases.value) {
    const allCodes = [phrase.sourceLang, ...Object.keys(phrase.translations)]
    const missing = activeCodes.filter(c => !allCodes.includes(c))
    if (!missing.length) continue
    try {
      const result = await $fetch<{ translations: Record<string, string> }>('/api/translate', {
        method: 'POST',
        body: { text: phrase.sourceText, sourceLanguage: phrase.sourceLang, targetLanguages: missing },
      })
      Object.assign(phrase.translations, result.translations)
      changed = true
    } catch (e) {
      console.error('Auto-translate saved phrase failed', e)
    }
  }
  if (changed) persistPhrases()
})
</script>

<style scoped>
.mobile {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.pages-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.pages-track {
  display: flex;
  height: 100%;
  will-change: transform;
}

.page {
  min-width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
}

.lang-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  height: 100%;
}

.lang-card {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 10px;
  overflow: hidden;
}

.lang-name {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.remove-btn:active {
  color: #e00;
}

.lang-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
}

.tab-indicator {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 0 4px;
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
  cursor: pointer;
  transition: background 0.2s;
}

.tab-dot.active {
  background: #222;
}

.bottom-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 8px 12px 12px;
  background: #fff;
}

.nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: none;
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:active {
  background: #f0f0f0;
}

.add-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #222;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: #fff;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.modal {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 8px;
  border-bottom: 1px solid #ddd;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  outline: none;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
}

.language-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}

.language-item {
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.language-item:active {
  background: #f0f0f0;
}

.bookmarks-view {
  flex: 1;
  overflow-y: auto;
}

.bookmarks-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 16px;
}

.bookmarks-table-wrapper {
  overflow-x: auto;
  height: 100%;
}

.bookmarks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.bookmarks-table th {
  position: sticky;
  top: 0;
  background: #fafafa;
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #ddd;
  white-space: nowrap;
}

.bookmarks-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
  max-width: 140px;
  word-wrap: break-word;
}

.action-col {
  width: 36px;
  text-align: center;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px;
}

.nav-btn.active {
  color: #222;
}

.nav-btn-spacer {
  width: 44px;
  height: 44px;
}

.history-row {
  cursor: pointer;
}

.history-row:active {
  background: #f0f0f0;
}
</style>

