// Audio and Haptic Feedback Helpers

export function vibrate(pattern: number | number[] = 25) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

export function playTickSound() {
  // Silent - no sound
}

export function playSuccessSound() {
  // Silent - no sound
}
