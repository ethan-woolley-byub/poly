export const useDevice = () => {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isTouchDevice = ref(false)

  const check = () => {
    const width = window.innerWidth
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    isTouchDevice.value = touch
    isTablet.value = touch && width >= 768
    // Tablets should use mobile format since they are touch-driven
    isMobile.value = width < 768 || isTablet.value
  }

  onMounted(() => {
    check()
    window.addEventListener('resize', check)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', check)
  })

  return { isMobile, isTablet, isTouchDevice }
}
