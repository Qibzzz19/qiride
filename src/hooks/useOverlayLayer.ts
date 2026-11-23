import { useEffect, useRef, type RefObject } from 'react'

interface OverlayEntry {
  close: () => void
}

const closeStack: OverlayEntry[] = []
let scrollLocks = 0
let previousOverflow = ''
let keyListenerAttached = false
let popstateListenerAttached = false
/** Popstate events produced by our own history.back() bookkeeping — must be swallowed. */
let ignorePopCount = 0

const SENTINEL_KEY = 'motologOverlay'

function topEntry(): OverlayEntry | undefined {
  return closeStack[closeStack.length - 1]
}

function sentinelState(): Record<string, unknown> | null {
  const state = window.history.state as Record<string, unknown> | null
  return state && state[SENTINEL_KEY] === true ? state : null
}

function sentinelPresent(): boolean {
  return sentinelState() !== null
}

/**
 * Keep exactly ONE history entry alive while any overlay is open. Using a
 * single shared sentinel (instead of one entry per overlay) makes the effect
 * idempotent: React StrictMode's double mount, rapid reopen, and a pending
 * async history.back() can never stack or swallow entries.
 *
 * On popstate we tell which entry was popped by looking at the state we
 * LANDED on: landing on the sentinel means a non-overlay entry (a tab) was
 * popped; landing below it means the sentinel itself was popped, i.e. a real
 * back gesture targeting an overlay.
 */
function pushSentinel(): void {
  if (sentinelPresent()) return
  try {
    window.history.pushState({ ...(window.history.state ?? {}), [SENTINEL_KEY]: true }, '')
  } catch {
    // Sandboxed context: overlays simply fall back to the old behavior.
  }
}

/** Rewind the sentinel when the last overlay closes from the UI (X/save/backdrop). */
function releaseSentinel(): void {
  if (closeStack.length > 0) return
  if (!sentinelPresent()) return
  ignorePopCount += 1
  try {
    window.history.back()
  } catch {
    ignorePopCount -= 1
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  const entry = topEntry()
  if (!entry) return
  event.preventDefault()
  entry.close()
}

/**
 * Phone/browser back button.
 * - Landed on the sentinel → a tab (or other) entry was popped: leave overlays
 *   alone, App's hashchange handler switches the tab.
 * - Landed below the sentinel → the sentinel was popped: close the topmost
 *   overlay, and re-arm the sentinel if layers remain below it.
 */
function handlePopState(event: PopStateEvent) {
  if (ignorePopCount > 0) {
    ignorePopCount -= 1
    // Our own rewind landed while overlays were reopened meanwhile (or by
    // StrictMode's remount): restore the sentinel so back still targets them.
    if (closeStack.length > 0) pushSentinel()
    return
  }
  if ((event.state as Record<string, unknown> | null)?.[SENTINEL_KEY] === true) {
    // Popped a non-overlay entry and are back on our sentinel — nothing to close.
    return
  }
  const entry = topEntry()
  if (!entry) return
  const remaining = closeStack.length - 1
  entry.close()
  // Re-arm only when another layer is still open below the one we just closed.
  if (remaining > 0) pushSentinel()
}

function attachKeyListener() {
  if (keyListenerAttached) return
  window.addEventListener('keydown', handleKeyDown)
  keyListenerAttached = true
}

function detachKeyListener() {
  if (!keyListenerAttached || closeStack.length > 0) return
  window.removeEventListener('keydown', handleKeyDown)
  keyListenerAttached = false
}

function attachPopstateListener() {
  if (popstateListenerAttached) return
  window.addEventListener('popstate', handlePopState)
  popstateListenerAttached = true
}

function lockScroll() {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) {
    document.body.style.overflow = previousOverflow
  }
}

// A reload leaves history.state behind, but no overlay survives a reload —
// drop the stale marker so the first open pushes a fresh sentinel.
try {
  if (sentinelPresent() && closeStack.length === 0) {
    const { [SENTINEL_KEY]: _stale, ...rest } = window.history.state as Record<string, unknown>
    window.history.replaceState(rest, '')
  }
} catch {
  // ignore
}

/**
 * Shared overlay behavior for nested sheets/dialogs/lightboxes:
 * - locks page scroll (reference counted)
 * - Escape closes only the topmost layer
 * - focus moves into the panel and returns to the trigger on close
 * - the phone's back button closes the topmost layer before leaving the app
 *   (a single shared history sentinel is armed while any overlay is open)
 */
export function useOverlayLayer<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<T | null>,
) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const entry: OverlayEntry = {
      close: () => closeRef.current(),
    }
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

    lockScroll()
    closeStack.push(entry)
    attachKeyListener()
    attachPopstateListener()
    pushSentinel()

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus({ preventScroll: true })
    }, 80)

    return () => {
      window.clearTimeout(focusTimer)
      const index = closeStack.lastIndexOf(entry)
      if (index >= 0) closeStack.splice(index, 1)
      releaseSentinel()
      detachKeyListener()
      unlockScroll()
      previousFocus?.focus?.({ preventScroll: true })
    }
  }, [open, panelRef])
}
