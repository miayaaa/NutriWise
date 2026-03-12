import * as React from "react"

/**
 * Returns the height of the on-screen keyboard in pixels.
 * Uses the visualViewport API which is supported on iOS Safari 13+ and Android Chrome.
 * Falls back to 0 (no offset) when not available.
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = React.useState(0)

  React.useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      // keyboard height = layout viewport height minus the visible area
      const kh = window.innerHeight - vv!.height - (vv!.offsetTop ?? 0)
      setOffset(Math.max(0, Math.round(kh)))
    }

    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  return offset
}
