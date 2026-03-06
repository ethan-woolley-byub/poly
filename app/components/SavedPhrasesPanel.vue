<template>
  <!-- SavedPhrasesPanel disabled -->
  <div style="display:none"></div>
</template>

<script setup lang="ts">
// SavedPhrasesPanel component disabled — saved-phrases feature commented out
</script>


<style>

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
}

.filters {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.filter-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #cbd5e0;
  background: white;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #4299e1;
  color: #4299e1;
}

.filter-btn.active {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.phrases-list {
  overflow-y: auto;
  flex: 1;
}

.phrase-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  transition: background 0.2s;
}

.phrase-item:hover {
  background: #f9fafb;
}

.phrase-content {
  flex: 1;
  min-width: 0;
}

.phrase-text {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.phrase-text strong {
  word-break: break-word;
  font-size: 0.95rem;
}

.language-badge {
  display: inline-block;
  background: #edf2f7;
  color: #2d3748;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.phrase-translation {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 4px;
  font-style: italic;
}

.phrase-context {
  font-size: 0.85rem;
  color: #999;
  margin-bottom: 6px;
  max-height: 3em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.phrase-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.8rem;
}

.review-info {
  color: #666;
}

.difficulty-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.difficulty-badge.very-hard {
  background: #fed7d7;
  color: #c53030;
}

.difficulty-badge.hard {
  background: #feebc8;
  color: #c05621;
}

.difficulty-badge.medium {
  background: #fef3c7;
  color: #b45309;
}

.difficulty-badge.easy {
  background: #dcfce7;
  color: #15803d;
}

.difficulty-badge.very-easy {
  background: #ccfbf1;
  color: #0d9488;
}

.next-review {
  color: #4299e1;
  font-weight: 600;
}

.delete-btn {
  background: none;
  border: none;
  color: #e53e3e;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: #fed7d7;
}

@media (max-width: 768px) {
  .saved-phrases-panel {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 0;
    max-width: 100%;
    border-radius: 8px 8px 0 0;
    max-height: 50vh;
  }
}
</style>
