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
          @dragover.prevent="onContainerDragOver"
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
              <div class="lang-grid" :class="gridClass(page.length)">
                <div
                  v-for="lang in page"
                  :key="lang.language"
                  class="lang-card"
                  :class="{ 'drag-over': dragOverLang === lang.language, 'dragging': draggingLang === lang.language }"
                  :data-lang="lang.language"
                  @dragover.prevent="dragOverLang = lang.language"
                  @dragleave="dragOverLang = null"
                  @drop="onDrop(lang.language)"
                >
                  <div class="lang-name">
                    <span
                      class="lang-name-text"
                      draggable="true"
                      @dragstart="onDragStart(lang.language, $event)"
                      @dragend="onDragEnd"
                      @touchstart.prevent="onLangTouchStart($event, lang.language)"
                    >{{ lang.language === 'auto' ? (detectedLangCode ? `Detected: ${getLanguageName(detectedLangCode)}` : 'Detect Language') : lang.name }}</span>
                    <span class="lang-actions">
                      <button
                        v-if="langTexts[lang.language]?.trim()"
                        class="copy-btn"
                        :class="{ copied: copiedLang === lang.language }"
                        @click.stop="copyText(lang.language)"
                        aria-label="Copy text"
                        title="Copy"
                      >
                        <svg v-if="copiedLang !== lang.language" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button
                        v-if="lang.language !== 'auto' && langTexts[lang.language]?.trim() && TTS_SUPPORTED_LANGUAGES.has(lang.language)"
                        class="tts-btn"
                        :class="{ playing: ttsPlaying === lang.language, loading: ttsLoading === lang.language }"
                        :disabled="ttsLoading === lang.language"
                        @click.stop="playTts(lang.language)"
                        aria-label="Play audio"
                        title="Listen"
                      >
                        <span v-if="ttsLoading === lang.language" class="tts-spinner"></span>
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      </button>
                      <button
                        v-if="savedSource?.code !== lang.language"
                        class="source-btn"
                        @click.stop="setSourceAndRetranslate(lang.language)"
                        aria-label="Translate from this language"
                        title="Translate from this language"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                      </button>
                      <span v-else class="source-indicator">●</span>
                      <button class="remove-btn" @click="removeLanguage(lang.language)" aria-label="Remove language">✕</button>
                    </span>
                  </div>
                  <div class="textarea-wrapper">
                    <textarea
                      v-if="canTranslatePair(savedSource?.code === 'auto' ? (detectedLangCode || 'auto') : (savedSource?.code ?? 'en'), lang.language)"
                      :value="langTexts[lang.language] ?? ''"
                      class="lang-textarea"
                      :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                      :placeholder="`Type in ${lang.name}...`"
                      @input="onLangInput(lang.language, ($event.target as HTMLTextAreaElement).value)"
                    />
                    <div v-else class="translate-error">
                      Cannot translate from {{ getLanguageName(savedSource?.code === 'auto' ? (detectedLangCode || 'auto') : (savedSource?.code ?? 'en')) }} to {{ lang.name }}
                    </div>
                    <div v-if="romanizations[lang.language] && NON_LATIN_LANGUAGES.has(lang.language)" class="romanization">
                      {{ romanizations[lang.language] }}
                    </div>
                    <div class="textarea-footer">
                      <span class="char-count">{{ (langTexts[lang.language] ?? '').length }}c · {{ wordCount(langTexts[lang.language] ?? '') }}w</span>
                      <span class="engine-badges">
                        <span v-if="langSupportMap.get(lang.language)?.gt" class="engine-badge gt" :class="{ active: getActiveEngine(lang.language) === 'gt' }">GT</span>
                        <span v-if="langSupportMap.get(lang.language)?.dl" class="engine-badge dl" :class="{ active: getActiveEngine(lang.language) === 'dl' }">DL</span>
                      </span>
                    </div>
                  </div>
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
          <div class="list-search-bar">
            <input v-model="historySearch" type="text" placeholder="Search history..." class="search-input" />
          </div>
          <div v-if="!filteredHistory.length" class="bookmarks-empty">
            {{ history.length ? 'No matching history.' : 'No translation history yet.' }}
          </div>
          <div v-else class="bookmarks-table-wrapper">
            <table class="bookmarks-table">
              <thead>
                <tr>
                  <th v-for="lang in displayLanguages" :key="lang.language">{{ lang.name }}</th>
                  <th class="action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(entry, idx) in filteredHistory" :key="idx" class="history-row" @click="restoreFromHistory(entry)">
                  <td
                    v-for="lang in displayLanguages"
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
                    <button class="delete-btn" @click="deleteHistoryEntry(history.indexOf(entry))" aria-label="Delete history entry">🗑</button>
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
          <div class="list-search-bar">
            <input v-model="bookmarksSearch" type="text" placeholder="Search saved phrases..." class="search-input" />
          </div>
          <div v-if="!filteredBookmarks.length" class="bookmarks-empty">
            {{ savedPhrases.length ? 'No matching phrases.' : 'No saved phrases yet.' }}
          </div>
          <div v-else class="bookmarks-table-wrapper">
            <table class="bookmarks-table">
              <thead>
                <tr>
                  <th v-for="lang in displayLanguages" :key="lang.language">{{ lang.name }}</th>
                  <th class="action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(phrase, idx) in filteredBookmarks" :key="idx" class="history-row" @click="restoreFromHistory(phrase)">
                  <td
                    v-for="lang in displayLanguages"
                    :key="lang.language"
                    :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                  >
                    <template v-if="lang.language === phrase.sourceLang">
                      {{ phrase.sourceText }}
                    </template>
                    <template v-else>
                      {{ phrase.translations[lang.language] ?? '...' }}
                    </template>
                    <div class="srs-bar" v-if="lang.language !== phrase.sourceLang && phrase.translations[lang.language]">
                      <div class="srs-bar-fill" :style="{ width: `${getSrsMastery(phrase.sourceLang, lang.language, phrase.sourceText) * 100}%` }" />
                    </div>
                  </td>
                  <td class="action-col" @click.stop>
                    <button class="delete-btn" @click="deletePhrase(savedPhrases.indexOf(phrase))" aria-label="Delete phrase">🗑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Context View -->
      <template v-if="currentView === 'context'">
        <div class="bookmarks-view" v-if="!contextData || !Object.keys(contextData).length">
          <div class="bookmarks-empty">No context loaded yet.</div>
        </div>
        <div
          v-else
          class="pages-container"
          ref="contextPagesContainer"
          @touchstart="onContextTouchStart"
          @touchmove="onContextTouchMove"
          @touchend="onContextTouchEnd"
        >
          <div
            class="pages-track"
            :style="{ transform: `translateX(${contextTrackOffset}px)`, transition: isContextSwiping ? 'none' : 'transform 0.3s ease' }"
          >
            <div
              v-for="(page, pageIdx) in contextPages"
              :key="pageIdx"
              class="page"
            >
              <div class="lang-grid" :class="gridClass(page.length)">
                <div
                  v-for="lang in page"
                  :key="lang"
                  class="lang-card"
                  :dir="RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr'"
                >
                  <div class="lang-name">
                    <span class="lang-name-text">{{ getLanguageName(lang) }}</span>
                  </div>
                  <div class="context-content">
                    <div class="context-section">
                      <div class="context-label">{{ contextLabels[lang]?.definitions ?? 'Definitions' }}</div>
                      <ul class="context-list">
                        <li v-for="(d, i) in (contextData[lang]?.definitions ?? [])" :key="i">{{ d }}</li>
                      </ul>
                    </div>
                    <div class="context-section">
                      <div class="context-label">{{ contextLabels[lang]?.examples ?? 'Examples' }}</div>
                      <ul class="context-list">
                        <li v-for="(ex, i) in (contextData[lang]?.examples ?? [])" :key="i">{{ ex }}</li>
                      </ul>
                    </div>
                    <div class="context-section">
                      <div class="context-label">{{ contextLabels[lang]?.synonyms ?? 'Synonyms' }}</div>
                      <div class="context-synonyms">
                        <span v-for="(s, i) in (contextData[lang]?.synonyms ?? [])" :key="i" class="context-synonym">{{ s }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="contextData && contextTotalPages > 1" class="tab-indicator">
          <span
            v-for="i in contextTotalPages"
            :key="i"
            class="tab-dot"
            :class="{ active: i - 1 === contextPage }"
            @click="contextPage = i - 1"
          />
        </div>
      </template>

      <nav class="bottom-nav">
        <div class="nav-center">
          <button class="nav-btn" :class="{ active: currentView === 'history' }" @click="toggleHistory" aria-label="History" title="History">
            <svg width="22" height="22" viewBox="0 0 24 24" :fill="currentView === 'history' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>

          <button v-if="currentView === 'translate'" class="add-btn" @click="showModal = true" aria-label="Add language" title="Add language">+</button>
          <button v-else class="add-btn" @click="currentView = 'translate'" aria-label="Back to translate" title="Translate">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </button>

          <button class="nav-btn" :class="{ active: currentView === 'bookmarks' }" @click="toggleBookmarks" aria-label="Bookmarks" title="Bookmarks">
            <svg width="22" height="22" viewBox="0 0 24 24" :fill="currentView === 'bookmarks' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>

        <!-- Right side buttons -->
        <button v-if="currentView === 'translate'" class="nav-btn save-btn" @click="savePhrase" aria-label="Save phrase" title="Save phrase">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        </button>
        <button v-if="currentView === 'translate'" class="nav-btn copyall-btn" :class="{ copied: copiedAll }" @click="copyAll" aria-label="Copy all translations" title="Copy all">
          <svg v-if="!copiedAll" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="nav-btn context-btn" :class="{ loading: isLoadingContext, active: currentView === 'context' }" @click="fetchContext" aria-label="Get context" :disabled="isLoadingContext" title="Context / Info">
          <svg v-if="!isLoadingContext" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span v-else class="spinner"></span>
        </button>
        <button v-if="currentView !== 'bookmarks'" class="nav-btn api-toggle-btn" @click="toggleTranslationApi" :aria-label="`Switch to ${translationApi === 'deepl' ? 'Google' : 'DeepL'}`" :title="`Engine: ${translationApi === 'deepl' ? 'DeepL' : 'Google Translate'}`">
          <span class="api-label">{{ translationApi === 'deepl' ? 'DL' : 'GT' }}</span>
        </button>
        <button v-if="currentView === 'history'" class="nav-btn save-btn" @click="exportHistoryCsv" aria-label="Export history CSV" title="Export CSV">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button v-if="currentView === 'history' && history.length" class="nav-btn clear-btn" @click="showClearConfirm = 'history'" aria-label="Clear history" title="Clear history">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
        <button v-if="currentView === 'bookmarks'" class="nav-btn save-btn" @click="exportBookmarksCsv" aria-label="Export bookmarks CSV" title="Export CSV">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button v-if="currentView === 'bookmarks' && savedPhrases.length" class="nav-btn clear-btn" @click="showClearConfirm = 'bookmarks'" aria-label="Clear bookmarks" title="Clear bookmarks">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </nav>

      <div v-if="showClearConfirm" class="confirm-overlay" @click.self="closeClearConfirm">
        <div class="confirm-modal">
          <p>Clear all {{ showClearConfirm === 'history' ? 'history' : 'saved phrases' }}?</p>
          <div class="confirm-actions">
            <button class="confirm-cancel" @click="closeClearConfirm">Cancel</button>
            <button class="confirm-delete" @click="confirmClear">Clear</button>
          </div>
        </div>
      </div>

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
              <span class="language-item-name">{{ lang.name }} ({{ lang.language }})</span>
              <span class="language-item-badges">
                <span v-if="(lang as any).gt" class="lang-badge gt">GT</span>
                <span v-if="(lang as any).dl" class="lang-badge dl">DL</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ═══════════════════ DESKTOP UI ═══════════════════ -->
    <div v-else class="desktop">
      <!-- Top Nav -->
      <nav class="top-nav">
        <div class="nav-left">
          <button class="nav-btn" :class="{ active: currentView === 'translate' }" @click="currentView = 'translate'" title="Translate (Alt+T)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span class="nav-label">Translate</span>
          </button>
          <button class="nav-btn" :class="{ active: currentView === 'history' }" @click="toggleHistory" title="History (Alt+P)">
            <svg width="20" height="20" viewBox="0 0 24 24" :fill="currentView === 'history' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span class="nav-label">History</span>
          </button>
          <button class="nav-btn" :class="{ active: currentView === 'bookmarks' }" @click="toggleBookmarks" title="Bookmarks (Alt+B)">
            <svg width="20" height="20" viewBox="0 0 24 24" :fill="currentView === 'bookmarks' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span class="nav-label">Bookmarks</span>
          </button>
          <button class="nav-btn" :class="{ loading: isLoadingContext, active: currentView === 'context' }" @click="fetchContext" :disabled="isLoadingContext" title="Context / Info (Alt+I)">
            <svg v-if="!isLoadingContext" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span v-else class="spinner sm"></span>
            <span class="nav-label">Context</span>
          </button>
        </div>
        <div class="nav-right">
          <button v-if="currentView === 'translate'" class="nav-btn" @click="toggleTranslationApi" :title="`Engine: ${translationApi === 'deepl' ? 'DeepL' : 'Google Translate'} (Alt+E)`">
            <span class="api-label">{{ translationApi === 'deepl' ? 'DL' : 'GT' }}</span>
          </button>
          <button v-if="currentView === 'translate'" class="nav-btn" @click="savePhrase" title="Save phrase (Alt+S)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </button>
          <button v-if="currentView === 'translate'" class="nav-btn" :class="{ copied: copiedAll }" @click="copyAll" title="Copy all (Alt+Shift+C)">
            <svg v-if="!copiedAll" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button v-if="currentView === 'translate'" class="nav-btn add-lang-btn" @click="showModal = true" title="Add language (Alt+N)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button v-if="currentView === 'history'" class="nav-btn" @click="exportHistoryCsv" title="eXport CSV (Alt+X)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button v-if="currentView === 'history' && history.length" class="nav-btn" @click="showClearConfirm = 'history'" title="Wipe history (Alt+W)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button v-if="currentView === 'bookmarks'" class="nav-btn" @click="exportBookmarksCsv" title="eXport CSV (Alt+X)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button v-if="currentView === 'bookmarks' && savedPhrases.length" class="nav-btn" @click="showClearConfirm = 'bookmarks'" title="Wipe bookmarks (Alt+W)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button class="nav-btn help-btn" @click="showHelp = !showHelp" title="Keyboard shortcuts">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="10.01" /><line x1="10" y1="10" x2="10" y2="10.01" /><line x1="14" y1="10" x2="14" y2="10.01" /><line x1="18" y1="10" x2="18" y2="10.01" /><line x1="8" y1="14" x2="16" y2="14" /></svg>
          </button>
        </div>
      </nav>

      <!-- Help Popup -->
      <div v-if="showHelp" class="help-overlay" @click.self="showHelp = false">
        <div class="help-popup">
          <div class="help-header">
            <h3>Keyboard Shortcuts</h3>
            <button class="close-btn" @click="showHelp = false">✕</button>
          </div>
          <div class="help-content">
            <div class="help-section">
              <h4>Navigation</h4>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>T</kbd><span>Translate tab</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>P</kbd><span>Previous translations (History)</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>B</kbd><span>Bookmarks tab</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>I</kbd><span>Info / Context tab</span></div>
            </div>
            <div class="help-section">
              <h4>Translation View</h4>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>←↑↓→</kbd> / <kbd>HJKL</kbd><span>Navigate between boxes</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>←↑↓→</kbd> / <kbd>HJKL</kbd><span>Move / reorder boxes</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>N</kbd><span>New language (add)</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>D</kbd><span>Delete focused box</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>C</kbd><span>Copy focused box text</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd><span>Copy all boxes</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>S</kbd><span>Save current translations</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>E</kbd><span>Engine toggle (GT/DL)</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>A</kbd><span>Audio playback (TTS)</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>O</kbd><span>Origin — set source language</span></div>
            </div>
            <div class="help-section">
              <h4>History &amp; Bookmarks</h4>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>←↑↓→</kbd> / <kbd>HJKL</kbd><span>Navigate rows &amp; columns</span></div>
              <div class="shortcut-row"><kbd>Enter</kbd><span>Restore selected translation</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>R</kbd><span>Remove selected row</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>X</kbd><span>eXport data (CSV)</span></div>
              <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>W</kbd><span>Wipe (clear all)</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Translate View -->
      <template v-if="currentView === 'translate'">
        <div class="desktop-grid-wrapper">
          <div class="desktop-lang-grid">
            <div
              v-for="(lang, idx) in reversedLanguages"
              :key="lang.language"
              class="lang-card"
              :class="{
                focused: focusedLangIdx === idx,
                'drag-over': dragOverLang === lang.language,
                'dragging': draggingLang === lang.language,
              }"
              :data-lang="lang.language"
              @click="setFocusedLang(idx)"
              @dragover.prevent="dragOverLang = lang.language"
              @dragleave="dragOverLang = null"
              @drop="onDrop(lang.language)"
            >
              <div class="lang-name">
                <span
                  class="lang-name-text"
                  draggable="true"
                  @dragstart="onDragStart(lang.language, $event)"
                  @dragend="onDragEnd"
                >{{ lang.language === 'auto' ? (detectedLangCode ? `Detected: ${getLanguageName(detectedLangCode)}` : 'Detect Language') : lang.name }}</span>
                <span class="lang-actions">
                  <button
                    v-if="langTexts[lang.language]?.trim()"
                    class="copy-btn"
                    :class="{ copied: copiedLang === lang.language }"
                    @click.stop="copyText(lang.language)"
                    title="Copy text (Alt+C)"
                  >
                    <svg v-if="copiedLang !== lang.language" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button
                    v-if="lang.language !== 'auto' && langTexts[lang.language]?.trim() && TTS_SUPPORTED_LANGUAGES.has(lang.language)"
                    class="tts-btn"
                    :class="{ playing: ttsPlaying === lang.language, loading: ttsLoading === lang.language }"
                    :disabled="ttsLoading === lang.language"
                    @click.stop="playTts(lang.language)"
                    title="Play audio (Alt+A)"
                  >
                    <span v-if="ttsLoading === lang.language" class="tts-spinner"></span>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  </button>
                  <button
                    v-if="savedSource?.code !== lang.language"
                    class="source-btn"
                    @click.stop="setSourceAndRetranslate(lang.language)"
                    title="Set as source language (Alt+O)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                  </button>
                  <span v-else class="source-indicator">●</span>
                  <button class="remove-btn" @click="removeLanguage(lang.language)" title="Remove language (Alt+D)">✕</button>
                </span>
              </div>
              <div class="textarea-wrapper">
                <textarea
                  v-if="canTranslatePair(savedSource?.code === 'auto' ? (detectedLangCode || 'auto') : (savedSource?.code ?? 'en'), lang.language)"
                  :ref="(el: any) => { if (el) langTextareaRefs[idx] = el }"
                  :value="langTexts[lang.language] ?? ''"
                  class="lang-textarea"
                  :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                  :placeholder="`Type in ${lang.name}...`"
                  @input="onLangInput(lang.language, ($event.target as HTMLTextAreaElement).value)"
                  @focus="focusedLangIdx = idx"
                />
                <div v-else class="translate-error">
                  Cannot translate from {{ getLanguageName(savedSource?.code === 'auto' ? (detectedLangCode || 'auto') : (savedSource?.code ?? 'en')) }} to {{ lang.name }}
                </div>
                <div v-if="romanizations[lang.language] && NON_LATIN_LANGUAGES.has(lang.language)" class="romanization">
                  {{ romanizations[lang.language] }}
                </div>
                <div class="textarea-footer">
                  <span class="char-count">{{ (langTexts[lang.language] ?? '').length }}c · {{ wordCount(langTexts[lang.language] ?? '') }}w</span>
                  <span class="engine-badges">
                    <span v-if="langSupportMap.get(lang.language)?.gt" class="engine-badge gt" :class="{ active: getActiveEngine(lang.language) === 'gt' }">GT</span>
                    <span v-if="langSupportMap.get(lang.language)?.dl" class="engine-badge dl" :class="{ active: getActiveEngine(lang.language) === 'dl' }">DL</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Desktop History View -->
      <template v-if="currentView === 'history'">
        <div class="desktop-list-view">
          <div class="list-search-bar">
            <input v-model="historySearch" type="text" placeholder="Search history..." class="search-input" />
          </div>
          <div v-if="!filteredHistory.length" class="bookmarks-empty">
            {{ history.length ? 'No matching history.' : 'No translation history yet.' }}
          </div>
          <div v-else class="bookmarks-table-wrapper">
            <table class="bookmarks-table">
              <thead>
                <tr>
                  <th
                    v-for="(lang, colIdx) in displayLanguages"
                    :key="lang.language"
                    :class="{ 'col-highlight': tableColIdx === colIdx }"
                  >{{ lang.name }}</th>
                  <th class="action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(entry, idx) in filteredHistory"
                  :key="idx"
                  class="history-row"
                  :class="{ 'row-highlight': tableRowIdx === idx }"
                  @click="restoreFromHistory(entry)"
                >
                  <td
                    v-for="(lang, colIdx) in displayLanguages"
                    :key="lang.language"
                    :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                    :class="{ 'cell-highlight': tableRowIdx === idx && tableColIdx === colIdx }"
                  >
                    <template v-if="lang.language === entry.sourceLang">
                      {{ entry.sourceText }}
                    </template>
                    <template v-else>
                      {{ entry.translations[lang.language] ?? '' }}
                    </template>
                  </td>
                  <td class="action-col" @click.stop>
                    <button class="delete-btn" @click="deleteHistoryEntry(history.indexOf(entry))" title="Delete entry (Alt+R)">🗑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Desktop Bookmarks View -->
      <template v-if="currentView === 'bookmarks'">
        <div class="desktop-list-view">
          <div class="list-search-bar">
            <input v-model="bookmarksSearch" type="text" placeholder="Search saved phrases..." class="search-input" />
          </div>
          <div v-if="!filteredBookmarks.length" class="bookmarks-empty">
            {{ savedPhrases.length ? 'No matching phrases.' : 'No saved phrases yet.' }}
          </div>
          <div v-else class="bookmarks-table-wrapper">
            <table class="bookmarks-table">
              <thead>
                <tr>
                  <th
                    v-for="(lang, colIdx) in displayLanguages"
                    :key="lang.language"
                    :class="{ 'col-highlight': tableColIdx === colIdx }"
                  >{{ lang.name }}</th>
                  <th class="action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(phrase, idx) in filteredBookmarks"
                  :key="idx"
                  class="history-row"
                  :class="{ 'row-highlight': tableRowIdx === idx }"
                  @click="restoreFromHistory(phrase)"
                >
                  <td
                    v-for="(lang, colIdx) in displayLanguages"
                    :key="lang.language"
                    :dir="RTL_LANGUAGES.has(lang.language) ? 'rtl' : 'ltr'"
                    :class="{ 'cell-highlight': tableRowIdx === idx && tableColIdx === colIdx }"
                  >
                    <template v-if="lang.language === phrase.sourceLang">
                      {{ phrase.sourceText }}
                    </template>
                    <template v-else>
                      {{ phrase.translations[lang.language] ?? '...' }}
                    </template>
                    <div class="srs-bar" v-if="lang.language !== phrase.sourceLang && phrase.translations[lang.language]">
                      <div class="srs-bar-fill" :style="{ width: `${getSrsMastery(phrase.sourceLang, lang.language, phrase.sourceText) * 100}%` }" />
                    </div>
                  </td>
                  <td class="action-col" @click.stop>
                    <button class="delete-btn" @click="deletePhrase(savedPhrases.indexOf(phrase))" title="Delete phrase (Alt+R)">🗑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Desktop Context View -->
      <template v-if="currentView === 'context'">
        <div v-if="!contextData || !Object.keys(contextData).length" class="desktop-list-view">
          <div class="bookmarks-empty">No context loaded yet.</div>
        </div>
        <div v-else class="desktop-grid-wrapper">
          <div class="desktop-lang-grid context-grid">
            <div
              v-for="lang in contextLanguages"
              :key="lang"
              class="lang-card"
              :dir="RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr'"
            >
              <div class="lang-name">
                <span class="lang-name-text">{{ getLanguageName(lang) }}</span>
              </div>
              <div class="context-content">
                <div class="context-section">
                  <div class="context-label">{{ contextLabels[lang]?.definitions ?? 'Definitions' }}</div>
                  <ul class="context-list">
                    <li v-for="(d, i) in (contextData[lang]?.definitions ?? [])" :key="i">{{ d }}</li>
                  </ul>
                </div>
                <div class="context-section">
                  <div class="context-label">{{ contextLabels[lang]?.examples ?? 'Examples' }}</div>
                  <ul class="context-list">
                    <li v-for="(ex, i) in (contextData[lang]?.examples ?? [])" :key="i">{{ ex }}</li>
                  </ul>
                </div>
                <div class="context-section">
                  <div class="context-label">{{ contextLabels[lang]?.synonyms ?? 'Synonyms' }}</div>
                  <div class="context-synonyms">
                    <span v-for="(s, i) in (contextData[lang]?.synonyms ?? [])" :key="i" class="context-synonym">{{ s }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Shared modals -->
      <div v-if="showClearConfirm" class="confirm-overlay" @click.self="closeClearConfirm">
        <div class="confirm-modal">
          <p>Clear all {{ showClearConfirm === 'history' ? 'history' : 'saved phrases' }}?</p>
          <div class="confirm-actions">
            <button class="confirm-cancel" @click="closeClearConfirm">Cancel</button>
            <button class="confirm-delete" @click="confirmClear">Clear</button>
          </div>
        </div>
      </div>

      <div v-if="showModal" class="modal-overlay desktop-modal-overlay" @click.self="closeModal">
        <div class="modal desktop-modal">
          <div class="modal-header">
            <input
              ref="searchInput"
              v-model="search"
              type="text"
              placeholder="Search languages..."
              class="search-input"
            />
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          <ul class="language-list" role="listbox">
            <li
              v-for="lang in filteredLanguages"
              :key="lang.language"
              role="option"
              class="language-item"
              @click="selectLanguage(lang)"
            >
              <span class="language-item-name">{{ lang.name }} ({{ lang.language }})</span>
              <span class="language-item-badges">
                <span v-if="(lang as any).gt" class="lang-badge gt">GT</span>
                <span v-if="(lang as any).dl" class="lang-badge dl">DL</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
const LANGS_PER_PAGE = 6
const DEFAULT_LANGUAGES = ['en', 'es', 'sw', 'de', 'pt', 'ja']
const RTL_LANGUAGES = new Set(['ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'ckb', 'pa-Arab', 'ms-Arab'])

const { isMobile } = useDevice()

const currentView = ref<'translate' | 'bookmarks' | 'history' | 'context'>('translate')

// Desktop focus management
const focusedLangIdx = ref(0)
const langTextareaRefs = ref<Record<number, HTMLTextAreaElement>>({})
const showHelp = ref(false)

// Table navigation for history/bookmarks views
const tableRowIdx = ref(0)
const tableColIdx = ref(0)

const DETECT_LANG = { language: 'auto', name: 'Detect Language', gt: true, dl: true }

const app = useNuxtApp()
const languages = app.$supportedLanguages.value as { language: string; name: string; gt: boolean; dl: boolean }[]

const savedCodes = useCookie<string[]>('selected-languages', {
  default: () => DEFAULT_LANGUAGES,
  watch: true,
  maxAge: 60 * 60 * 24 * 365,
})

function resolveLanguages(codes: string[]): { language: string; name: string; gt: boolean; dl: boolean }[] {
  const map = new Map(languages.map(l => [l.language, l]))
  return codes.map(c => map.get(c)).filter(Boolean) as { language: string; name: string; gt: boolean; dl: boolean }[]
}

const selectedLanguages = ref(resolveLanguages(savedCodes.value ?? DEFAULT_LANGUAGES))

watch(selectedLanguages, (val) => {
  savedCodes.value = val.map(l => l.language)
}, { deep: true })

const langTexts = reactive<Record<string, string>>({})
const isTranslating = ref(false)
let translateTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 500
const TTS_SUPPORTED_LANGUAGES = new Set([
  'ar', 'bn', 'da', 'de', 'el', 'en', 'en-GB', 'en-AU', 'en-IN',
  'es', 'et', 'fi', 'fr', 'fr-CA', 'gu', 'he', 'iw', 'hi', 'it',
  'ja', 'ko', 'mr', 'nb', 'no', 'nl', 'pl', 'pt', 'pt-PT', 'ru',
  'sv', 'ta', 'te', 'tr', 'uk', 'ur', 'vi', 'yue',
])
const ttsPlaying = ref<string | null>(null)
const ttsLoading = ref<string | null>(null)
let ttsAudio: HTMLAudioElement | null = null
const copiedLang = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

// Romanization for non-Latin scripts
const NON_LATIN_LANGUAGES = new Set([
  'ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'ckb',
  'ja', 'ko', 'zh-CN', 'zh-TW', 'zh', 'yue',
  'hi', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'mr', 'pa', 'ne', 'si',
  'th', 'ka', 'hy', 'am', 'ti', 'my', 'km', 'lo',
  'el', 'ru', 'uk', 'bg', 'sr', 'mk', 'be', 'ky', 'kk', 'mn', 'tg',
])
const romanizations = reactive<Record<string, string>>({})
let romanizeTimer: ReturnType<typeof setTimeout> | null = null

async function fetchRomanizations() {
  const entries = Object.entries(langTexts).filter(
    ([code, text]) => text?.trim() && NON_LATIN_LANGUAGES.has(code)
  )
  // Clear stale romanizations for languages with no text
  for (const code of Object.keys(romanizations)) {
    if (!langTexts[code]?.trim()) delete romanizations[code]
  }
  // Fetch all in parallel for faster updates
  await Promise.all(entries.map(async ([code, text]) => {
    try {
      const res = await $fetch<{ romanized: string }>('/api/romanize', {
        method: 'POST',
        body: { text, language: code },
      })
      if (res.romanized) romanizations[code] = res.romanized
      else delete romanizations[code]
    } catch {
      // silently fail
    }
  }))
}

function wordCount(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

// Copy all translations
const copiedAll = ref(false)
let copiedAllTimer: ReturnType<typeof setTimeout> | null = null

async function copyAll() {
  const src = savedSource.value
  if (!src) return
  const lines: string[] = []
  const srcName = getLanguageName(src.code)
  lines.push(`${srcName} (${src.code}): ${src.text}`)
  for (const lang of selectedLanguages.value) {
    if (lang.language === src.code || lang.language === 'auto') continue
    const text = langTexts[lang.language]?.trim()
    if (text) lines.push(`${lang.name} (${lang.language}): ${text}`)
  }
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copiedAll.value = true
    if (copiedAllTimer) clearTimeout(copiedAllTimer)
    copiedAllTimer = setTimeout(() => { copiedAll.value = false }, 1500)
  } catch (e) {
    console.error('Copy all failed', e)
  }
}

// Search for history and bookmarks
const historySearch = ref('')
const bookmarksSearch = ref('')

// Language support lookup
const langSupportMap = computed(() => {
  const map = new Map<string, { gt: boolean; dl: boolean }>()
  for (const lang of languages) {
    map.set(lang.language, { gt: lang.gt, dl: lang.dl })
  }
  return map
})

function getLangEngine(srcCode: string, tgtCode: string): 'primary' | 'fallback' | 'none' {
  if (tgtCode === 'auto') return 'primary'
  const tgtSupport = langSupportMap.value.get(tgtCode)
  if (!tgtSupport) return 'primary'
  const primaryKey = translationApi.value === 'deepl' ? 'dl' as const : 'gt' as const
  const fallbackKey = translationApi.value === 'deepl' ? 'gt' as const : 'dl' as const
  // For auto/unknown source, just check target support
  if (srcCode === 'auto' || srcCode === '') {
    if (tgtSupport[primaryKey]) return 'primary'
    if (tgtSupport[fallbackKey]) return 'fallback'
    return 'none'
  }
  const srcSupport = langSupportMap.value.get(srcCode)
  if (!srcSupport) return tgtSupport[primaryKey] ? 'primary' : tgtSupport[fallbackKey] ? 'fallback' : 'none'
  // Find an engine both source and target support
  if (srcSupport[primaryKey] && tgtSupport[primaryKey]) return 'primary'
  if (srcSupport[fallbackKey] && tgtSupport[fallbackKey]) return 'fallback'
  return 'none'
}

function canTranslatePair(srcCode: string, tgtCode: string): boolean {
  return getLangEngine(srcCode, tgtCode) !== 'none'
}

function getActiveEngine(tgtCode: string): 'gt' | 'dl' | null {
  const srcCode = savedSource.value?.code === 'auto' ? (detectedLangCode.value || 'auto') : (savedSource.value?.code ?? 'en')
  const engine = getLangEngine(srcCode, tgtCode)
  if (engine === 'none') return null
  const primaryKey = translationApi.value === 'deepl' ? 'dl' as const : 'gt' as const
  const fallbackKey = translationApi.value === 'deepl' ? 'gt' as const : 'dl' as const
  return engine === 'primary' ? primaryKey : fallbackKey
}

function fallbackEndpoint(): string {
  return translationApi.value === 'deepl' ? '/api/translate' : '/api/translate-deepl'
}

async function copyText(langCode: string) {
  const text = langTexts[langCode]?.trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedLang.value = langCode
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copiedLang.value = null }, 1500)
  } catch (e) {
    console.error('Copy failed', e)
  }
}

async function playTts(langCode: string) {
  const text = langTexts[langCode]?.trim()
  if (!text) return
  // If loading, ignore clicks
  if (ttsLoading.value === langCode) return
  // If already playing this language, stop it
  if (ttsPlaying.value === langCode && ttsAudio) {
    ttsAudio.pause()
    ttsAudio = null
    ttsPlaying.value = null
    return
  }
  // Stop any current playback
  if (ttsAudio) {
    ttsAudio.pause()
    ttsAudio = null
  }
  ttsPlaying.value = null
  ttsLoading.value = langCode
  try {
    const result = await $fetch<{ audioContent: string }>('/api/tts', {
      method: 'POST',
      body: { text, languageCode: langCode },
    })
    const audio = new Audio(`data:audio/mpeg;base64,${result.audioContent}`)
    ttsAudio = audio
    ttsLoading.value = null
    ttsPlaying.value = langCode
    audio.onended = () => { ttsPlaying.value = null; ttsAudio = null }
    audio.onerror = () => { ttsPlaying.value = null; ttsAudio = null }
    await audio.play()
  } catch (e) {
    console.error('TTS failed', e)
    ttsLoading.value = null
    ttsPlaying.value = null
    ttsAudio = null
  }
}

const DEFAULT_SOURCE = { code: 'en', text: 'Lets become polyglots!!' }
const savedSource = useCookie<{ code: string; text: string }>('last-source', {
  default: () => DEFAULT_SOURCE,
  watch: true,
  maxAge: 60 * 60 * 24 * 365,
})

const translationApi = useCookie<'deepl' | 'google'>('translation-api', {
  default: () => 'deepl',
  watch: true,
  maxAge: 60 * 60 * 24 * 365,
})

function translateEndpoint() {
  return translationApi.value === 'deepl' ? '/api/translate-deepl' : '/api/translate'
}

function toggleTranslationApi() {
  translationApi.value = translationApi.value === 'deepl' ? 'google' : 'deepl'
  // Retranslate with new API
  const src = savedSource.value
  if (src?.text.trim()) {
    lastTranslatedText = ''
    triggerTranslation(src.code, src.text)
  }
}

let lastTranslatedText = ''

// Cache last translations in localStorage to avoid API call on reload
const TRANSLATIONS_CACHE_KEY = 'poly-last-translations'

function loadTranslationsCache(): { sourceCode: string; sourceText: string; translations: Record<string, string> } | null {
  if (import.meta.server) return null
  try {
    const raw = localStorage.getItem(TRANSLATIONS_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function persistTranslationsCache(sourceCode: string, sourceText: string, translations: Record<string, string>) {
  if (import.meta.server) return
  localStorage.setItem(TRANSLATIONS_CACHE_KEY, JSON.stringify({ sourceCode, sourceText, translations }))
}

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

function setSourceAndRetranslate(code: string) {
  const text = langTexts[code] ?? ''
  if (!text.trim()) return
  savedSource.value = { code, text }
  lastTranslatedText = text.trim()
  triggerTranslation(code, text)
}

async function triggerTranslation(sourceCode: string, text: string) {
  if (!text.trim()) {
    for (const lang of selectedLanguages.value) {
      if (lang.language !== sourceCode) langTexts[lang.language] = ''
    }
    return
  }
  const hasAutoLang = selectedLanguages.value.some(l => l.language === 'auto')
  const allTargets = selectedLanguages.value
    .map(l => l.language)
    .filter(c => c !== sourceCode && c !== 'auto')

  // Split into primary and fallback targets
  const primaryTargets: string[] = []
  const fallbackTargets: string[] = []
  for (const code of allTargets) {
    const engine = getLangEngine(sourceCode, code)
    if (engine === 'primary') primaryTargets.push(code)
    else if (engine === 'fallback') fallbackTargets.push(code)
  }

  // If auto/detect is selected and we have a detected language, translate into it too
  if (sourceCode !== 'auto' && hasAutoLang && detectedLangCode.value) {
    if (detectedLangCode.value === sourceCode) {
      langTexts['auto'] = text
    } else if (!primaryTargets.includes(detectedLangCode.value) && !fallbackTargets.includes(detectedLangCode.value)) {
      const engine = getLangEngine(sourceCode, detectedLangCode.value)
      if (engine === 'fallback') fallbackTargets.push(detectedLangCode.value)
      else primaryTargets.push(detectedLangCode.value)
    }
  }

  if (!primaryTargets.length && !fallbackTargets.length) return

  isTranslating.value = true
  const allTranslations: Record<string, string> = {}
  try {
    // Translate with primary engine
    if (primaryTargets.length) {
      const result = await $fetch<{
        sourceLanguage: string
        translations: Record<string, string>
      }>(translateEndpoint(), {
        method: 'POST',
        body: { text, sourceLanguage: sourceCode === 'auto' ? '' : sourceCode, targetLanguages: primaryTargets },
      })
      for (const [code, translated] of Object.entries(result.translations)) {
        langTexts[code] = translated
        allTranslations[code] = translated
      }
      if (sourceCode === 'auto' && result.sourceLanguage) {
        detectedLangCode.value = result.sourceLanguage
      }
    }

    // Translate with fallback engine
    if (fallbackTargets.length) {
      const fbEndpoint = fallbackEndpoint()
      const result = await $fetch<{
        sourceLanguage: string
        translations: Record<string, string>
      }>(fbEndpoint, {
        method: 'POST',
        body: { text, sourceLanguage: sourceCode === 'auto' ? '' : sourceCode, targetLanguages: fallbackTargets },
      })
      for (const [code, translated] of Object.entries(result.translations)) {
        langTexts[code] = translated
        allTranslations[code] = translated
      }
    }

    // Map detected language translation to the auto card
    if (sourceCode !== 'auto' && hasAutoLang && detectedLangCode.value && allTranslations[detectedLangCode.value]) {
      langTexts['auto'] = allTranslations[detectedLangCode.value]!
    }
    addToHistory(sourceCode === 'auto' ? (detectedLangCode.value || 'auto') : sourceCode, text, allTranslations)
    persistTranslationsCache(sourceCode === 'auto' ? (detectedLangCode.value || 'auto') : sourceCode, text, allTranslations)
  } catch (e) {
    console.error('Translation failed', e)
  } finally {
    isTranslating.value = false
    // Fetch romanizations for non-Latin scripts
    if (romanizeTimer) clearTimeout(romanizeTimer)
    romanizeTimer = setTimeout(fetchRomanizations, 300)
  }
}

const showModal = ref(false)
const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const pagesContainer = ref<HTMLElement | null>(null)
const currentPage = ref(0)
const detectedLangCode = ref('')

// Swipe state
const isSwiping = ref(false)
let touchStartX = 0
let touchDeltaX = 0
const swipeDelta = ref(0)

const reversedLanguages = computed(() => [...selectedLanguages.value].reverse())
const displayLanguages = computed(() => reversedLanguages.value.filter(l => l.language !== 'auto'))

const pages = computed(() => {
  const result: { language: string; name: string }[][] = []
  for (let i = 0; i < reversedLanguages.value.length; i += LANGS_PER_PAGE) {
    result.push(reversedLanguages.value.slice(i, i + LANGS_PER_PAGE))
  }
  return result.length ? result : [[]]
})

function gridClass(count: number) {
  if (count <= 2) return 'grid-2'
  if (count <= 4) return 'grid-4'
  return 'grid-6'
}

// Drag-and-drop reorder (desktop HTML5 + mobile touch)
const draggingLang = ref<string | null>(null)
const dragOverLang = ref<string | null>(null)
let edgeSwitchTimer: ReturnType<typeof setTimeout> | null = null
const EDGE_ZONE = 40

function onDragStart(code: string, e?: DragEvent) {
  draggingLang.value = code
  if (e?.dataTransfer) {
    const card = (e.target as HTMLElement).closest('.lang-card') as HTMLElement | null
    if (card) {
      const rect = card.getBoundingClientRect()
      e.dataTransfer.setDragImage(card, e.clientX - rect.left, e.clientY - rect.top)
    }
  }
}

function onDragEnd() {
  draggingLang.value = null
  dragOverLang.value = null
  if (edgeSwitchTimer) { clearTimeout(edgeSwitchTimer); edgeSwitchTimer = null }
}

function onContainerDragOver(e: DragEvent) {
  if (!draggingLang.value) return
  const x = e.clientX
  const screenW = window.innerWidth
  if (x < EDGE_ZONE && currentPage.value > 0) {
    if (!edgeSwitchTimer) {
      edgeSwitchTimer = setTimeout(() => {
        if (currentPage.value > 0) currentPage.value--
        edgeSwitchTimer = null
      }, 400)
    }
  } else if (x > screenW - EDGE_ZONE && currentPage.value < totalPages.value - 1) {
    if (!edgeSwitchTimer) {
      edgeSwitchTimer = setTimeout(() => {
        if (currentPage.value < totalPages.value - 1) currentPage.value++
        edgeSwitchTimer = null
      }, 400)
    }
  } else {
    if (edgeSwitchTimer) { clearTimeout(edgeSwitchTimer); edgeSwitchTimer = null }
  }
}

function onDrop(targetCode: string) {
  const srcCode = draggingLang.value
  if (!srcCode || srcCode === targetCode) {
    dragOverLang.value = null
    return
  }
  const arr = selectedLanguages.value
  const srcIdx = arr.findIndex(l => l.language === srcCode)
  const targetIdx = arr.findIndex(l => l.language === targetCode)
  if (srcIdx === -1 || targetIdx === -1) return
  const [moved] = arr.splice(srcIdx, 1)
  arr.splice(targetIdx, 0, moved!)
  dragOverLang.value = null
  draggingLang.value = null
}

// Mobile touch drag
const isDraggingLang = ref(false)
let dragGhost: HTMLElement | null = null

function onLangTouchStart(e: TouchEvent, code: string) {
  const touch = e.touches[0]
  if (!touch) return
  draggingLang.value = code
  isDraggingLang.value = true

  // Create ghost
  const target = (e.currentTarget as HTMLElement).closest('.lang-card') as HTMLElement
  if (target) {
    dragGhost = document.createElement('div')
    dragGhost.className = 'drag-ghost'
    dragGhost.textContent = target.querySelector('.lang-name-text')?.textContent ?? code
    dragGhost.style.left = `${touch.clientX}px`
    dragGhost.style.top = `${touch.clientY}px`
    document.body.appendChild(dragGhost)
  }

  document.addEventListener('touchmove', onLangTouchMove, { passive: false })
  document.addEventListener('touchend', onLangTouchEnd, { once: true })
}

function onLangTouchMove(e: TouchEvent) {
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return

  // Move ghost
  if (dragGhost) {
    dragGhost.style.left = `${touch.clientX}px`
    dragGhost.style.top = `${touch.clientY}px`
  }

  // Detect target card under finger
  if (dragGhost) dragGhost.style.pointerEvents = 'none'
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  if (dragGhost) dragGhost.style.pointerEvents = ''
  const card = el?.closest('[data-lang]') as HTMLElement | null
  dragOverLang.value = card?.dataset.lang ?? null

  // Edge detection for page switching
  const screenW = window.innerWidth
  if (touch.clientX < EDGE_ZONE && currentPage.value > 0) {
    if (!edgeSwitchTimer) {
      edgeSwitchTimer = setTimeout(() => {
        if (currentPage.value > 0) currentPage.value--
        edgeSwitchTimer = null
      }, 400)
    }
  } else if (touch.clientX > screenW - EDGE_ZONE && currentPage.value < totalPages.value - 1) {
    if (!edgeSwitchTimer) {
      edgeSwitchTimer = setTimeout(() => {
        if (currentPage.value < totalPages.value - 1) currentPage.value++
        edgeSwitchTimer = null
      }, 400)
    }
  } else {
    if (edgeSwitchTimer) { clearTimeout(edgeSwitchTimer); edgeSwitchTimer = null }
  }
}

function onLangTouchEnd() {
  document.removeEventListener('touchmove', onLangTouchMove)
  if (edgeSwitchTimer) { clearTimeout(edgeSwitchTimer); edgeSwitchTimer = null }

  // Perform drop
  const targetCode = dragOverLang.value
  const srcCode = draggingLang.value
  if (srcCode && targetCode && srcCode !== targetCode) {
    const arr = selectedLanguages.value
    const srcIdx = arr.findIndex(l => l.language === srcCode)
    const targetIdx = arr.findIndex(l => l.language === targetCode)
    if (srcIdx !== -1 && targetIdx !== -1) {
      const [moved] = arr.splice(srcIdx, 1)
      arr.splice(targetIdx, 0, moved!)
    }
  }

  // Cleanup
  if (dragGhost) { dragGhost.remove(); dragGhost = null }
  draggingLang.value = null
  dragOverLang.value = null
  isDraggingLang.value = false
}

const totalPages = computed(() => pages.value.length)

const containerWidth = computed(() => pagesContainer.value?.offsetWidth ?? 0)

const trackOffset = computed(() => {
  return -currentPage.value * containerWidth.value + swipeDelta.value
})

const selectedCodes = computed(() => new Set(selectedLanguages.value.map(l => l.language)))

const filteredLanguages = computed(() => {
  const q = search.value.toLowerCase()
  const selected = selectedCodes.value
  const results = languages.filter(lang =>
    !selected.has(lang.language) &&
    (lang.name.toLowerCase().includes(q) || lang.language.toLowerCase().includes(q))
  )
  // Add detect language option if not already selected and matches search
  if (!selected.has('auto') && ('detect language'.includes(q) || 'auto'.includes(q))) {
    results.unshift(DETECT_LANG)
  }
  return results
})

async function selectLanguage(lang: { language: string; name: string; gt: boolean; dl: boolean }) {
  selectedLanguages.value.push(lang)
  closeModal()
  // Don't try to translate for detect language
  if (lang.language === 'auto') return
  if (savedSource.value && savedSource.value.text.trim()) {
    const srcCode = savedSource.value.code === 'auto' ? (detectedLangCode.value || '') : savedSource.value.code
    const engine = getLangEngine(srcCode, lang.language)
    if (engine === 'none') return
    const endpoint = engine === 'fallback' ? fallbackEndpoint() : translateEndpoint()
    try {
      const result = await $fetch<{ translations: Record<string, string> }>(endpoint, {
        method: 'POST',
        body: { text: savedSource.value.text, sourceLanguage: srcCode, targetLanguages: [lang.language] },
      })
      if (result.translations[lang.language]) {
        langTexts[lang.language] = result.translations[lang.language]!
        // Fetch romanization for new language if non-Latin
        if (NON_LATIN_LANGUAGES.has(lang.language)) {
          if (romanizeTimer) clearTimeout(romanizeTimer)
          romanizeTimer = setTimeout(fetchRomanizations, 300)
        }
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

// Back button closes modal
if (!import.meta.server) {
  watch(showModal, (val) => {
    if (val) {
      window.history.pushState({ modal: true }, '')
      const handler = () => {
        if (showModal.value) {
          showModal.value = false
          search.value = ''
        }
      }
      window.addEventListener('popstate', handler, { once: true })
    }
  })
}

function onTouchStart(e: TouchEvent) {
  if (isDraggingLang.value) return
  const touch = e.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchDeltaX = 0
  isSwiping.value = true
}

function onTouchMove(e: TouchEvent) {
  if (isDraggingLang.value) return
  const touch = e.touches[0]
  if (!touch) return
  touchDeltaX = touch.clientX - touchStartX
  swipeDelta.value = touchDeltaX
}

function onTouchEnd() {
  if (isDraggingLang.value) return
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

// ── Desktop focus helpers ──
function setFocusedLang(idx: number) {
  focusedLangIdx.value = idx
  nextTick(() => {
    const ta = langTextareaRefs.value[idx]
    if (ta) {
      ta.focus()
      // Place cursor at end of text
      const len = ta.value.length
      ta.setSelectionRange(len, len)
    }
  })
}

// Desktop grid columns (3 cols default)
const DESKTOP_COLS = 3

function navigateLangGrid(direction: 'left' | 'right' | 'up' | 'down') {
  const total = reversedLanguages.value.length
  if (!total) return
  let idx = focusedLangIdx.value
  const cols = DESKTOP_COLS
  switch (direction) {
    case 'left':
      idx = idx > 0 ? idx - 1 : total - 1
      break
    case 'right':
      idx = idx < total - 1 ? idx + 1 : 0
      break
    case 'up':
      idx = idx - cols >= 0 ? idx - cols : idx
      break
    case 'down':
      idx = idx + cols < total ? idx + cols : idx
      break
  }
  setFocusedLang(idx)
}

function moveLangInGrid(direction: 'left' | 'right' | 'up' | 'down') {
  const arr = selectedLanguages.value
  const reversed = [...arr].reverse()
  const total = reversed.length
  if (!total) return
  const idx = focusedLangIdx.value
  const cols = DESKTOP_COLS
  let targetIdx = idx
  switch (direction) {
    case 'left': targetIdx = idx > 0 ? idx - 1 : idx; break
    case 'right': targetIdx = idx < total - 1 ? idx + 1 : idx; break
    case 'up': targetIdx = idx - cols >= 0 ? idx - cols : idx; break
    case 'down': targetIdx = idx + cols < total ? idx + cols : idx; break
  }
  if (targetIdx === idx) return
  // Convert reversed indices to original array indices
  const srcOrigIdx = arr.length - 1 - idx
  const tgtOrigIdx = arr.length - 1 - targetIdx
  const [moved] = arr.splice(srcOrigIdx, 1)
  arr.splice(tgtOrigIdx, 0, moved!)
  focusedLangIdx.value = targetIdx
}

function navigateTable(direction: 'left' | 'right' | 'up' | 'down') {
  const entries = currentView.value === 'history' ? filteredHistory.value : filteredBookmarks.value
  const cols = displayLanguages.value.length
  if (!entries.length || !cols) return
  switch (direction) {
    case 'left':
      tableColIdx.value = Math.max(0, tableColIdx.value - 1)
      break
    case 'right':
      tableColIdx.value = Math.min(cols - 1, tableColIdx.value + 1)
      break
    case 'up':
      tableRowIdx.value = Math.max(0, tableRowIdx.value - 1)
      break
    case 'down':
      tableRowIdx.value = Math.min(entries.length - 1, tableRowIdx.value + 1)
      break
  }
}

// Reset table indices when switching views
watch(currentView, () => {
  tableRowIdx.value = 0
  tableColIdx.value = 0
})

// ── Keyboard shortcuts ──
function handleKeyboardShortcut(e: KeyboardEvent) {
  // Don't intercept if modal is open
  if (showModal.value || showClearConfirm.value || showHelp.value) return
  if (!e.altKey) return

  const key = e.key.toLowerCase()
  const shift = e.shiftKey

  // Direction mapping for vim keys
  const dirMap: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down',
    h: 'left', l: 'right', k: 'up', j: 'down',
  }
  const dir = dirMap[key]

  // Tab navigation
  if (key === 't') { e.preventDefault(); currentView.value = 'translate'; return }
  if (key === 'b') { e.preventDefault(); currentView.value = 'bookmarks'; return }
  if (key === 'p') { e.preventDefault(); currentView.value = 'history'; return }
  if (key === 'i') { e.preventDefault(); fetchContext(); return }

  // Translate view shortcuts
  if (currentView.value === 'translate') {
    if (dir) {
      e.preventDefault()
      if (shift) {
        moveLangInGrid(dir)
      } else {
        navigateLangGrid(dir)
      }
      return
    }
    if (key === 'n') { e.preventDefault(); showModal.value = true; return }
    if (key === 'd') {
      e.preventDefault()
      const lang = reversedLanguages.value[focusedLangIdx.value]
      if (lang) removeLanguage(lang.language)
      if (focusedLangIdx.value >= reversedLanguages.value.length) {
        focusedLangIdx.value = Math.max(0, reversedLanguages.value.length - 1)
      }
      return
    }
    if (key === 'c' && shift) { e.preventDefault(); copyAll(); return }
    if (key === 'c' && !shift) {
      e.preventDefault()
      const lang = reversedLanguages.value[focusedLangIdx.value]
      if (lang) copyText(lang.language)
      return
    }
    if (key === 's') { e.preventDefault(); savePhrase(); return }
    if (key === 'e') { e.preventDefault(); toggleTranslationApi(); return }
    if (key === 'a') {
      e.preventDefault()
      const lang = reversedLanguages.value[focusedLangIdx.value]
      if (lang) playTts(lang.language)
      return
    }
    if (key === 'o') {
      e.preventDefault()
      const lang = reversedLanguages.value[focusedLangIdx.value]
      if (lang) setSourceAndRetranslate(lang.language)
      return
    }
  }

  // History & Bookmarks shortcuts
  if (currentView.value === 'history' || currentView.value === 'bookmarks') {
    if (dir) {
      e.preventDefault()
      navigateTable(dir)
      return
    }
    if (key === 'r') {
      e.preventDefault()
      const entries = currentView.value === 'history' ? filteredHistory.value : filteredBookmarks.value
      if (entries.length && tableRowIdx.value < entries.length) {
        const entry = entries[tableRowIdx.value]
        if (currentView.value === 'history') {
          const realIdx = history.value.indexOf(entry!)
          if (realIdx !== -1) deleteHistoryEntry(realIdx)
        } else {
          const realIdx = savedPhrases.value.indexOf(entry!)
          if (realIdx !== -1) deletePhrase(realIdx)
        }
        // Adjust index
        const newLen = (currentView.value === 'history' ? filteredHistory.value : filteredBookmarks.value).length
        if (tableRowIdx.value >= newLen) tableRowIdx.value = Math.max(0, newLen - 1)
      }
      return
    }
    if (key === 'x') {
      e.preventDefault()
      if (currentView.value === 'history') exportHistoryCsv()
      else exportBookmarksCsv()
      return
    }
    if (key === 'w') {
      e.preventDefault()
      showClearConfirm.value = currentView.value === 'history' ? 'history' : 'bookmarks'
      return
    }
    if (key === 'enter' || e.key === 'Enter') {
      e.preventDefault()
      const entries = currentView.value === 'history' ? filteredHistory.value : filteredBookmarks.value
      if (entries.length && tableRowIdx.value < entries.length) {
        restoreFromHistory(entries[tableRowIdx.value]!)
      }
      return
    }
  }
}

if (!import.meta.server) {
  onMounted(() => {
    window.addEventListener('keydown', handleKeyboardShortcut)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyboardShortcut)
  })
}

onMounted(async () => {
  savedPhrases.value = loadSavedPhrases()
  history.value = loadHistory()
  // Load context cache
  const ctxCache = loadContextCache()
  if (ctxCache?.data) {
    contextData.value = ctxCache.data
    lastContextSourceText = ctxCache.sourceText
    loadContextLabels(Object.keys(ctxCache.data))
  }
  const src = savedSource.value ?? DEFAULT_SOURCE
  langTexts[src.code] = src.text

  // Try to restore from cache first
  const cache = loadTranslationsCache()
  if (cache && cache.sourceText === src.text && cache.sourceCode === src.code) {
    for (const [code, translated] of Object.entries(cache.translations)) {
      langTexts[code] = translated
    }
    lastTranslatedText = src.text.trim()
    // Translate any newly added languages not in the cache
    const cachedCodes = new Set(Object.keys(cache.translations))
    const missingPrimary: string[] = []
    const missingFallback: string[] = []
    for (const l of selectedLanguages.value) {
      const c = l.language
      if (c === src.code || c === 'auto' || cachedCodes.has(c)) continue
      const engine = getLangEngine(src.code, c)
      if (engine === 'primary') missingPrimary.push(c)
      else if (engine === 'fallback') missingFallback.push(c)
    }
    const srcLang = src.code === 'auto' ? '' : src.code
    const newTranslations: Record<string, string> = {}
    if (missingPrimary.length) {
      try {
        const result = await $fetch<{ translations: Record<string, string> }>(translateEndpoint(), {
          method: 'POST',
          body: { text: src.text, sourceLanguage: srcLang, targetLanguages: missingPrimary },
        })
        for (const [code, translated] of Object.entries(result.translations)) {
          langTexts[code] = translated
          newTranslations[code] = translated
        }
      } catch (e) {
        console.error('Translation for missing languages failed', e)
      }
    }
    if (missingFallback.length) {
      try {
        const result = await $fetch<{ translations: Record<string, string> }>(fallbackEndpoint(), {
          method: 'POST',
          body: { text: src.text, sourceLanguage: srcLang, targetLanguages: missingFallback },
        })
        for (const [code, translated] of Object.entries(result.translations)) {
          langTexts[code] = translated
          newTranslations[code] = translated
        }
      } catch (e) {
        console.error('Fallback translation for missing languages failed', e)
      }
    }
    if (Object.keys(newTranslations).length) {
      persistTranslationsCache(src.code, src.text, { ...cache.translations, ...newTranslations })
    }
    // Fetch romanizations for cached translations
    if (romanizeTimer) clearTimeout(romanizeTimer)
    romanizeTimer = setTimeout(fetchRomanizations, 300)
    return
  }

  const allTargets = selectedLanguages.value
    .map(l => l.language)
    .filter(c => c !== src.code && c !== 'auto')
  const initPrimary: string[] = []
  const initFallback: string[] = []
  for (const c of allTargets) {
    const engine = getLangEngine(src.code, c)
    if (engine === 'primary') initPrimary.push(c)
    else if (engine === 'fallback') initFallback.push(c)
  }
  if (!src.text.trim() || (!initPrimary.length && !initFallback.length)) return
  try {
    if (initPrimary.length) {
      const result = await $fetch<{ sourceLanguage: string; translations: Record<string, string> }>(translateEndpoint(), {
        method: 'POST',
        body: { text: src.text, sourceLanguage: src.code === 'auto' ? '' : src.code, targetLanguages: initPrimary },
      })
      for (const [code, translated] of Object.entries(result.translations)) {
        langTexts[code] = translated
      }
      if (src.code === 'auto' && result.sourceLanguage) {
        detectedLangCode.value = result.sourceLanguage
      }
    }
    if (initFallback.length) {
      const result = await $fetch<{ sourceLanguage: string; translations: Record<string, string> }>(fallbackEndpoint(), {
        method: 'POST',
        body: { text: src.text, sourceLanguage: src.code === 'auto' ? '' : src.code, targetLanguages: initFallback },
      })
      for (const [code, translated] of Object.entries(result.translations)) {
        langTexts[code] = translated
      }
    }
  } catch (e) {
    console.error('Initial translation failed', e)
  }
  // Fetch romanizations for initial translations
  if (romanizeTimer) clearTimeout(romanizeTimer)
  romanizeTimer = setTimeout(fetchRomanizations, 300)
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

const filteredHistory = computed(() => {
  const q = historySearch.value.toLowerCase().trim()
  if (!q) return history.value
  return history.value.filter(entry =>
    entry.sourceText.toLowerCase().includes(q) ||
    Object.values(entry.translations).some(t => t.toLowerCase().includes(q))
  )
})

const filteredBookmarks = computed(() => {
  const q = bookmarksSearch.value.toLowerCase().trim()
  if (!q) return savedPhrases.value
  return savedPhrases.value.filter(phrase =>
    phrase.sourceText.toLowerCase().includes(q) ||
    Object.values(phrase.translations).some(t => t.toLowerCase().includes(q))
  )
})

// Clear confirmation modal
const showClearConfirm = ref<'history' | 'bookmarks' | null>(null)

function closeClearConfirm() {
  showClearConfirm.value = null
}

function confirmClear() {
  if (showClearConfirm.value === 'history') {
    history.value = []
    persistHistory()
  } else if (showClearConfirm.value === 'bookmarks') {
    savedPhrases.value = []
    persistPhrases()
  }
  showClearConfirm.value = null
}

// Back button closes clear confirm modal
if (!import.meta.server) {
  watch(showClearConfirm, (val) => {
    if (val) {
      window.history.pushState({ clearConfirm: true }, '')
      const handler = () => {
        if (showClearConfirm.value) {
          showClearConfirm.value = null
        }
      }
      window.addEventListener('popstate', handler, { once: true })
    }
  })
}

// Back button returns to translate from other views
if (!import.meta.server) {
  watch(currentView, (val, oldVal) => {
    if (val !== 'translate' && oldVal === 'translate') {
      window.history.pushState({ view: val }, '')
      const handler = () => {
        if (currentView.value !== 'translate') {
          currentView.value = 'translate'
        }
      }
      window.addEventListener('popstate', handler, { once: true })
    }
  })
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

// Auto-translate missing languages when entering bookmarks or history view, or when languages change
watch([currentView, () => selectedLanguages.value.length], async ([view]) => {
  if (view !== 'bookmarks' && view !== 'history') return
  const activeCodes = selectedLanguages.value
    .map(l => l.language)
    .filter(c => c !== 'auto')
  const entries = view === 'bookmarks' ? savedPhrases.value : history.value
  let changed = false
  for (const phrase of entries) {
    if (!phrase.sourceText?.trim() || phrase.sourceLang === 'auto') continue
    const allCodes = [phrase.sourceLang, ...Object.keys(phrase.translations)]
    const missing = activeCodes.filter(c => {
      if (allCodes.includes(c)) return false
      if (c === phrase.sourceLang) return false
      // Skip same base language (e.g. pt vs pt-PT)
      if (c.split('-')[0] === phrase.sourceLang.split('-')[0]) return false
      return true
    })
    if (!missing.length) continue
    try {
      const result = await $fetch<{ translations: Record<string, string> }>(translateEndpoint(), {
        method: 'POST',
        body: { text: phrase.sourceText, sourceLanguage: phrase.sourceLang, targetLanguages: missing },
      })
      Object.assign(phrase.translations, result.translations)
      changed = true
    } catch (e) {
      console.error(`Auto-translate ${view} phrase failed`, e)
    }
  }
  if (changed) {
    if (view === 'bookmarks') persistPhrases()
    else persistHistory()
  }
})

// Context feature
interface ContextEntry {
  examples: string[]
  definitions: string[]
  synonyms: string[]
}

const contextData = ref<Record<string, ContextEntry> | null>(null)
const contextPage = ref(0)
const isLoadingContext = ref(false)
const contextPagesContainer = ref<HTMLElement | null>(null)

// Translated context labels ("Definitions", "Examples", "Synonyms" in each language)
interface ContextLabels { definitions: string; examples: string; synonyms: string }
const contextLabels = ref<Record<string, ContextLabels>>({})
const savedContextLabels = useCookie<Record<string, ContextLabels>>('poly-context-labels', {
  default: () => ({}),
  watch: true,
  maxAge: 60 * 60 * 24 * 365,
})

async function loadContextLabels(langCodes: string[]) {
  const cached = savedContextLabels.value ?? {}
  cached['en'] = { definitions: 'Definitions', examples: 'Examples', synonyms: 'Synonyms' }
  contextLabels.value = { ...cached }
  const missing = langCodes.filter(c => c !== 'en' && !cached[c])
  if (!missing.length) return
  // Translate the three label words from English to each missing language
  const words = ['Definitions', 'Examples', 'Synonyms']
  for (const word of words) {
    try {
      const result = await $fetch<{ translations: Record<string, string> }>(translateEndpoint(), {
        method: 'POST',
        body: { text: word, sourceLanguage: 'en', targetLanguages: missing },
      })
      for (const [code, translated] of Object.entries(result.translations)) {
        if (!contextLabels.value[code]) contextLabels.value[code] = { definitions: 'Definitions', examples: 'Examples', synonyms: 'Synonyms' }
        const key = word.toLowerCase() as keyof ContextLabels
        contextLabels.value[code]![key] = translated
      }
    } catch (e) {
      console.error('Label translation failed', e)
    }
  }
  // Persist to cookie
  savedContextLabels.value = { ...contextLabels.value }
}

const contextLanguages = computed(() => {
  if (!contextData.value) return []
  const available = new Set(Object.keys(contextData.value))
  return displayLanguages.value.map(l => l.language).filter(c => available.has(c))
})

const contextPages = computed(() => {
  const langs = contextLanguages.value
  const result: string[][] = []
  for (let i = 0; i < langs.length; i += LANGS_PER_PAGE) {
    result.push(langs.slice(i, i + LANGS_PER_PAGE))
  }
  return result.length ? result : [[]]
})

const contextTotalPages = computed(() => contextPages.value.length)
const contextContainerWidth = computed(() => contextPagesContainer.value?.offsetWidth ?? 0)
const contextTrackOffset = computed(() => {
  return -contextPage.value * contextContainerWidth.value + contextSwipeDelta.value
})

// Context swipe state
const isContextSwiping = ref(false)
let contextTouchStartX = 0
let contextTouchDeltaX = 0
const contextSwipeDelta = ref(0)

function onContextTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  contextTouchStartX = touch.clientX
  contextTouchDeltaX = 0
  isContextSwiping.value = true
}

function onContextTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  contextTouchDeltaX = touch.clientX - contextTouchStartX
  contextSwipeDelta.value = contextTouchDeltaX
}

function onContextTouchEnd() {
  isContextSwiping.value = false
  const threshold = contextContainerWidth.value * 0.25
  if (contextTouchDeltaX < -threshold && contextPage.value < contextTotalPages.value - 1) {
    contextPage.value++
  } else if (contextTouchDeltaX > threshold && contextPage.value > 0) {
    contextPage.value--
  }
  contextSwipeDelta.value = 0
}

function getLanguageName(code: string): string {
  return languages.find(l => l.language === code)?.name ?? code
}

// Context caching
const CONTEXT_KEY = 'poly-context-cache'
let lastContextSourceText = ''

function loadContextCache(): { sourceText: string; data: Record<string, ContextEntry> } | null {
  if (import.meta.server) return null
  try {
    const raw = localStorage.getItem(CONTEXT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function persistContextCache(sourceText: string, data: Record<string, ContextEntry>) {
  if (import.meta.server) return
  localStorage.setItem(CONTEXT_KEY, JSON.stringify({ sourceText, data }))
}

async function fetchContext() {
  const src = savedSource.value
  if (!src || !src.text.trim()) return

  const currentText = src.text.trim()

  // If source text hasn't changed, show cached data
  if (contextData.value && lastContextSourceText === currentText) {
    contextPage.value = 0
    currentView.value = 'context'
    return
  }

  // Try localStorage cache
  const cache = loadContextCache()
  if (cache && cache.sourceText === currentText && cache.data && Object.keys(cache.data).length) {
    contextData.value = cache.data
    lastContextSourceText = currentText
    contextPage.value = 0
    currentView.value = 'context'
    loadContextLabels(Object.keys(cache.data))
    return
  }

  isLoadingContext.value = true
  try {
    const items = selectedLanguages.value
      .filter(l => l.language !== 'auto')
      .map(l => ({
        language: l.language,
        text: langTexts[l.language] ?? src.text,
      }))
      .filter(i => i.text.trim())
    if (!items.length) return

    // Split into chunks of 11 to avoid Gemini token limits
    const CHUNK_SIZE = 11
    let merged: Record<string, ContextEntry> = {}
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE)
      const result = await $fetch<Record<string, ContextEntry>>('/api/context', {
        method: 'POST',
        body: { items: chunk },
      })
      merged = { ...merged, ...result }
    }

    contextData.value = merged
    lastContextSourceText = currentText
    contextPage.value = 0
    currentView.value = 'context'
    persistContextCache(currentText, merged)
    // Load translated labels for context section headers
    loadContextLabels(Object.keys(merged))
  } catch (e) {
    console.error('Context fetch failed', e)
  } finally {
    isLoadingContext.value = false
  }
}

// ── Quiz Feature ──
interface SrsCard {
  key: string // "fromLang:toLang:sourceText"
  interval: number // days until next review
  ease: number // ease factor (2.5 default)
  dueAt: number // timestamp when due
  reps: number // successful consecutive reps
}

const SRS_COOKIE_KEY = 'poly-srs-data'
const srsData = useCookie<Record<string, SrsCard>>(SRS_COOKIE_KEY, {
  default: () => ({}),
  watch: true,
  maxAge: 60 * 60 * 24 * 365 * 5,
})

function srsKey(from: string, to: string, text: string): string {
  return `${from}:${to}:${text}`
}

function getSrsCard(key: string): SrsCard {
  return srsData.value[key] || { key, interval: 0, ease: 2.5, dueAt: 0, reps: 0 }
}

function updateSrs(key: string, correct: boolean) {
  const card = getSrsCard(key)
  if (correct) {
    card.reps++
    if (card.reps === 1) card.interval = 1
    else if (card.reps === 2) card.interval = 3
    else card.interval = Math.round(card.interval * card.ease)
    card.ease = Math.max(1.3, card.ease + 0.1)
  } else {
    card.reps = 0
    card.interval = 0
    card.ease = Math.max(1.3, card.ease - 0.2)
  }
  card.dueAt = Date.now() + card.interval * 24 * 60 * 60 * 1000
  srsData.value = { ...srsData.value, [key]: card }
}

function getSrsMastery(from: string, to: string, text: string): number {
  const card = getSrsCard(srsKey(from, to, text))
  // Mastery: 0-1 based on reps. 5 reps = mastered
  return Math.min(1, card.reps / 5)
}

// CSV export
function escapeCsvCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(escapeCsvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportHistoryCsv() {
  const langCodes = displayLanguages.value.map(l => l.language)
  const header = displayLanguages.value.map(l => l.name)
  const rows = [header]
  for (const entry of history.value) {
    rows.push(langCodes.map(code =>
      code === entry.sourceLang ? entry.sourceText : (entry.translations[code] ?? '')
    ))
  }
  downloadCsv('poly-history.csv', rows)
}

function exportBookmarksCsv() {
  const langCodes = displayLanguages.value.map(l => l.language)
  const header = displayLanguages.value.map(l => l.name)
  const rows = [header]
  for (const phrase of savedPhrases.value) {
    rows.push(langCodes.map(code =>
      code === phrase.sourceLang ? phrase.sourceText : (phrase.translations[code] ?? '')
    ))
  }
  downloadCsv('poly-bookmarks.csv', rows)
}
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
}
@media (prefers-color-scheme: dark) {
  html, body {
    background: #1a1a1a;
  }
}
</style>

<style scoped>
.app-root {
  --bg: #fff;
  --bg-secondary: #fafafa;
  --bg-hover: #f0f0f0;
  --text: #222;
  --text-secondary: #555;
  --text-muted: #999;
  --border: #ddd;
  --border-light: #eee;
  --input-border: #ccc;
  --accent: #222;
  --accent-fg: #fff;
  --dot: #ccc;
  color: var(--text);
  background: var(--bg);
  min-height: 100dvh;
}

@media (prefers-color-scheme: dark) {
  .app-root {
    --bg: #1a1a1a;
    --bg-secondary: #242424;
    --bg-hover: #333;
    --text: #e8e8e8;
    --text-secondary: #aaa;
    --text-muted: #777;
    --border: #444;
    --border-light: #333;
    --input-border: #555;
    --accent: #e8e8e8;
    --accent-fg: #1a1a1a;
    --dot: #555;
  }
}

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
  gap: 8px;
  height: 100%;
}

.lang-grid.grid-2 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
}

.lang-grid.grid-4 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.lang-grid.grid-6 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
}

.lang-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg);
}

.lang-name {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.lang-name-text {
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.lang-name-text:active {
  cursor: grabbing;
}

.lang-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.source-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  line-height: 1;
}

.source-btn:active {
  color: var(--accent);
}

.copy-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  line-height: 1;
}

.copy-btn:active,
.copy-btn.copied {
  color: var(--accent);
}

.tts-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  line-height: 1;
  transition: color 0.15s;
}

.tts-btn:active,
.tts-btn.playing {
  color: var(--accent);
}

.tts-btn.loading {
  color: var(--text-muted);
  cursor: default;
  opacity: 0.7;
}

.tts-btn:disabled {
  cursor: default;
}

.tts-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

.source-indicator {
  color: var(--accent);
  font-size: 10px;
  line-height: 1;
}

.lang-card.dragging {
  opacity: 0.4;
}

.lang-card.drag-over {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.drag-ghost {
  position: fixed;
  transform: translate(-50%, -50%);
  padding: 6px 16px;
  background: var(--accent);
  color: var(--accent-fg);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
  z-index: 200;
  white-space: nowrap;
  opacity: 0.9;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-muted);
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
  font-size: 21px;
  font-family: inherit;
  background: var(--bg);
  color: var(--text);
}

.textarea-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
}

.textarea-wrapper .lang-textarea {
  flex: 1;
}

.translate-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text);
  opacity: 0.45;
  font-size: 14px;
  padding: 16px;
}

.engine-badges {
  position: absolute;
  bottom: 6px;
  right: 8px;
  display: flex;
  gap: 3px;
  pointer-events: none;
}

.engine-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  letter-spacing: 0.3px;
  opacity: 0.3;
  color: #fff;
  transition: opacity 0.2s;
}

.engine-badge.active {
  opacity: 0.85;
}

.engine-badge.gt {
  background: #4285f4;
}

.engine-badge.dl {
  background: #042B48;
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
  background: var(--dot);
  cursor: pointer;
  transition: background 0.2s;
}

.tab-dot.active {
  background: var(--text);
}

.bottom-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 8px 12px 12px;
  background: var(--bg);
}

.nav-center {
  display: flex;
  align-items: center;
  gap: 16px;
}

.save-btn {
  position: absolute;
  right: 12px;
}

.nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:active {
  background: var(--bg-hover);
}

.add-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: var(--accent-fg);
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
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
  border-bottom: 1px solid var(--border);
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 16px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  outline: none;
  background: var(--bg);
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  color: var(--text);
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
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.language-item:active {
  background: var(--bg-hover);
}

.language-item-name {
  flex: 1;
}

.language-item-badges {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.lang-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.lang-badge.gt {
  background: #4285f4;
  color: #fff;
}

.lang-badge.dl {
  background: #042B48;
  color: #fff;
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
  color: var(--text-muted);
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
  background: var(--bg-secondary);
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}

.bookmarks-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border-light);
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
  color: var(--text);
}

.history-row {
  cursor: pointer;
}

.history-row:active {
  background: var(--bg-hover);
}

.context-btn {
  position: absolute;
  left: 12px;
}

.api-toggle-btn {
  position: absolute;
  left: 56px;
}

.api-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.context-btn.loading {
  pointer-events: none;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.context-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px;
  font-size: 12px;
}

.context-section {
  margin-bottom: 8px;
}

.context-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-list {
  margin: 0;
  padding-left: 20px;
  font-size: 15px;
  line-height: 1.6;
}

.context-synonyms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.context-synonym {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  font-size: 13px;
}

.clear-btn {
  position: absolute;
  right: 56px;
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-modal {
  background: var(--bg);
  border-radius: 14px;
  padding: 24px;
  min-width: 260px;
  text-align: center;
}

.confirm-modal p {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-cancel,
.confirm-delete {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  border: none;
}

.confirm-cancel {
  background: var(--bg-secondary);
  color: var(--text);
  border: 1px solid var(--border);
}

.confirm-delete {
  background: #e00;
  color: #fff;
}

/* Missing utility classes */
.romanization {
  padding: 4px 12px 2px;
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.3;
  max-height: 40px;
  overflow-y: auto;
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 8px 4px;
  min-height: 22px;
}

.char-count {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

.copyall-btn {
  position: absolute;
  right: 56px;
}

.copyall-btn.copied {
  color: var(--accent);
}

.list-search-bar {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
}

.list-search-bar .search-input {
  width: 100%;
  box-sizing: border-box;
}

/* SRS progress bars on saved phrases */
.srs-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.srs-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s;
}

/* ═══════════════════ DESKTOP STYLES ═══════════════════ */
.desktop {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

/* Top Nav */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.desktop .nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  white-space: nowrap;
  height: 36px;
}

.desktop .nav-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.desktop .nav-btn.active {
  color: var(--text);
  background: var(--bg-hover);
}

.desktop .nav-btn.copied {
  color: var(--accent);
}

.nav-label {
  font-weight: 500;
}

.help-btn {
  margin-left: 8px;
}

.add-lang-btn {
  border: 1px solid var(--border) !important;
}

/* Help Popup */
.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-popup {
  background: var(--bg);
  border-radius: 14px;
  padding: 0;
  max-width: 520px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-light);
}

.help-header h3 {
  margin: 0;
  font-size: 18px;
}

.help-content {
  padding: 12px 20px 20px;
}

.help-section {
  margin-bottom: 16px;
}

.help-section h4 {
  margin: 0 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
}

.shortcut-row span {
  color: var(--text-secondary);
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 1px 0 var(--border);
}

/* Desktop grid */
.desktop-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.desktop-lang-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  min-height: 0;
}

.desktop-lang-grid .lang-card {
  min-height: 200px;
}

.desktop-lang-grid .lang-card.focused {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
  box-shadow: 0 0 0 3px rgba(128, 128, 128, 0.15);
}

.desktop-lang-grid .lang-textarea {
  min-height: 120px;
}

/* Desktop List View */
.desktop-list-view {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.desktop-list-view .list-search-bar {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.desktop-list-view .bookmarks-table-wrapper {
  flex: 1;
  overflow: auto;
}

.desktop-list-view .bookmarks-table {
  font-size: 14px;
}

/* Table highlight for keyboard navigation */
.row-highlight {
  background: var(--bg-hover) !important;
}

.col-highlight {
  background: rgba(128, 128, 128, 0.08);
}

.cell-highlight {
  background: rgba(128, 128, 128, 0.18) !important;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* Desktop Modal */
.desktop-modal-overlay {
  background: rgba(0, 0, 0, 0.4);
}

.desktop-modal {
  max-width: 460px;
  width: 90%;
  max-height: 70vh;
  margin: auto;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

/* Spinner small variant */
.spinner.sm {
  width: 14px;
  height: 14px;
  border-width: 1.5px;
}

/* Context grid on desktop */
.context-grid .lang-card {
  min-height: 240px;
}
</style>

