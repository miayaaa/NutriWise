import * as React from "react"

interface KeyboardState {
  keyboardOffset: number
  /** Actual visible viewport height (excludes keyboard). Px value, safe for CSS calculations. */
  visualHeight: number
}

/**
 * Tracks keyboard height and visible viewport height using the visualViewport API.
 * Supported on iOS Safari 13+ and Android Chrome.
 */
export function useKeyboardOffset(): KeyboardState {
  const [state, setState] = React.useState<KeyboardState>({
    keyboardOffset: 0,
    visualHeight: typeof window !== "undefined" ? window.innerHeight : 800,
  })

  React.useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      const kh = Math.max(0, Math.round(window.innerHeight - vv!.height - (vv!.offsetTop ?? 0)))
      setState({ keyboardOffset: kh, visualHeight: Math.round(vv!.height) })
    }

    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  return state
}
