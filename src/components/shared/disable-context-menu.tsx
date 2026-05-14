"use client"

import * as React from "react"

const EDITABLE_SELECTOR =
  "input, textarea, [contenteditable='true'], [contenteditable=''], .ProseMirror, .milkdown"

export function DisableContextMenu() {
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest(EDITABLE_SELECTOR)) return
      e.preventDefault()
    }
    document.addEventListener("contextmenu", handler)
    return () => document.removeEventListener("contextmenu", handler)
  }, [])
  return null
}
