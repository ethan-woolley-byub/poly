// Saved phrases composable disabled — original implementation commented out.
// If you need this feature re-enabled later, restore the original code above from git history.

// Minimal stub to avoid import/runtime errors when other files still reference this composable.
export const useSavedPhrases = () => {
  const savedPhrases = useCookie('savedPhrases', {
    default: () => [],
    sameSite: 'lax'
  })

  const addPhrase = () => {}
  const removePhrase = () => {}
  const updatePhrase = () => {}
  const recordReview = () => {}

  const dueForReview = computed(() => [])
  const stats = computed(() => ({ total: 0, due: 0, mastered: 0, duePercentage: 0 }))

  return {
    savedPhrases,
    addPhrase,
    removePhrase,
    updatePhrase,
    recordReview,
    dueForReview,
    stats
  }
}
