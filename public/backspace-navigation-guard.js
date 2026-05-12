(() => {
  const nonTextInputTypes = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
  ])

  const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement)) {
      return false
    }

    if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
      return true
    }

    if (target instanceof HTMLTextAreaElement) {
      return !target.disabled && !target.readOnly
    }

    if (target instanceof HTMLSelectElement) {
      return !target.disabled
    }

    if (target instanceof HTMLInputElement) {
      if (target.disabled || target.readOnly) {
        return false
      }

      return !nonTextInputTypes.has((target.type || 'text').toLowerCase())
    }

    return false
  }

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Backspace') {
      return
    }

    if (event.ctrlKey || event.altKey || event.metaKey) {
      return
    }

    const target = event.target instanceof HTMLElement ? event.target : document.activeElement

    if (!isEditableTarget(target)) {
      event.preventDefault()
    }
  }, true)
})()