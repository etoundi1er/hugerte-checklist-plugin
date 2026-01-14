/**
 * Custom Checklist Plugin for HugerRTE
 * Provides checklist/checkbox functionality without using the paid TinyMCE plugin
 * Uses CSS pseudo-elements for checkbox visual and data attributes for state
 */

// Checklist CSS styles
// Injected into the editor's iframe (head) on initialization
const checklistStyles = `
    ul.tox-checklist {
        list-style: none;
        list-style-type: none;
        margin-bottom: 1em;
    }

    ul.tox-checklist li {
        list-style: none;
        list-style-type: none;
    }

    ul.tox-checklist .tox-checklist-item {
        list-style: none;
        list-style-type: none;
        position: relative;
        padding: 0.1em 0;
        margin: 0;
        line-height: 1;
        min-height: 1.40rem;
        display: flex;
        align-items: baseline;
    }

    ul.tox-checklist .tox-checklist-item::before {
        content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cg%20id%3D%22checklist-unchecked%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Crect%20id%3D%22Rectangle%22%20width%3D%2215%22%20height%3D%2215%22%20x%3D%22.5%22%20y%3D%22.5%22%20fill-rule%3D%22nonzero%22%20stroke%3D%22%234C4C4C%22%20rx%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E%0A");
        display: inline-block;
        cursor: pointer;
        margin-right: 0.5em;
        width: 0.952em;
    }

    ul.tox-checklist .tox-checklist-item[data-checked="true"]::before {
        content: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cg%20id%3D%22checklist-checked%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Crect%20id%3D%22Rectangle%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22%234099FF%22%20fill-rule%3D%22nonzero%22%20rx%3D%222%22%2F%3E%3Cpath%20id%3D%22Path%22%20fill%3D%22%23FFF%22%20fill-rule%3D%22nonzero%22%20d%3D%22M11.5703186%2C3.14417309%20C11.8516238%2C2.73724603%2012.4164781%2C2.62829933%2012.83558%2C2.89774797%20C13.260121%2C3.17069355%2013.3759736%2C3.72932262%2013.0909105%2C4.14168582%20L7.7580587%2C11.8560195%20C7.43776896%2C12.3193404%206.76483983%2C12.3852142%206.35607322%2C11.9948725%20L3.02491697%2C8.8138662%20C2.66090143%2C8.46625845%202.65798871%2C7.89594698%203.01850234%2C7.54483354%20C3.373942%2C7.19866177%203.94940006%2C7.19592841%204.30829608%2C7.5386474%20L6.85276923%2C9.9684299%20L11.5703186%2C3.14417309%20Z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E%0A');
    }

    ul.tox-checklist .tox-checklist-text {
        display: inline;
        word-break: break-word;
    }

    ul.tox-checklist .tox-checklist-item.tox-checklist--checked .tox-checklist-text {
        text-decoration: line-through;
    }
`

// Callback registry for state changes
let checklistStateChangeCallbacks = []
let checklistIdCounter = 0

function generateChecklistId() {
    return `tox-checklist-${++checklistIdCounter}`
}

const checklistPlugin = (editor) => {
    // Inject CSS into the editor's iframe on initialization
    editor.on('init', () => {
        const doc = editor.getDoc()
        if (doc && doc.head) {
            const style = doc.createElement('style')
            style.textContent = checklistStyles
            doc.head.appendChild(style)
        }
    })
    // Register the checklist commands
    editor.addCommand('toggleChecklist', (ui, value) => {
        const selection = editor.selection
        const node = selection.getNode()

        // Get or create a list
        let list = editor.dom.getParent(node, 'ul,ol')

        if (list && list.classList.contains('tox-checklist')) {
            // Already in a checklist, exit it
            exitChecklist(editor)
        } else {
            // Create a new checklist
            createChecklist(editor)
        }
    })

    editor.addCommand('toggleChecklistItem', (ui, value) => {
        const node = editor.selection.getNode()
        const li = editor.dom.getParent(node, 'li')

        if (li && editor.dom.getParent(li, 'ul.tox-checklist')) {
            toggleCheckboxState(li)
        }
    })

    // Register buttons
    editor.ui.registry.addButton('checklist', {
        icon: 'checklist',
        tooltip: 'Checklist',
        onAction: () => editor.execCommand('toggleChecklist')
    })

    // Register menu items
    editor.ui.registry.addMenuItem('checklist', {
        icon: 'checklist',
        text: 'Checklist',
        onAction: () => editor.execCommand('toggleChecklist')
    })

    // Handle keyboard shortcuts
    editor.on('KeyDown', (e) => {
        const node = editor.selection.getNode()
        const li = editor.dom.getParent(node, 'li')

        if (!li || !editor.dom.getParent(li, 'ul.tox-checklist')) {
            return
        }

        // Ctrl+Enter or Cmd+Enter to toggle checkbox
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
            e.preventDefault()
            editor.execCommand('toggleChecklistItem')
        }

        // Enter key to create new list item or exit checklist if item is empty
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault()
            const text = li.textContent.trim()
            const isEmpty = !text

            if (isEmpty) {
                // If current item is empty, exit the checklist
                exitChecklistAndCreateParagraph(editor, li)
            } else {
                // Create a new checklist item
                const newLi = createChecklistItem()
                li.parentNode.insertBefore(newLi, li.nextSibling)
                // Set cursor at the beginning of new item
                const rng = editor.dom.createRng()
                rng.setStart(newLi, 0)
                rng.collapse(true)
                editor.selection.setRng(rng)
                editor.setDirty(true)
            }
        }

        // Backspace on empty checklist item to exit
        if (e.keyCode === 8) {
            const text = li.textContent.trim()
            const isEmpty = !text

            if (isEmpty) {
                const caretPosition = editor.selection.getRng()
                // Check if cursor is at the beginning
                if (caretPosition.startOffset === 0) {
                    e.preventDefault()
                    exitChecklist(editor)
                }
            }
        }
    })

    // Handle checkbox clicks via mousedown on the checkbox area
    editor.on('mousedown', (e) => {
        const li = editor.dom.getParent(e.target, 'li.tox-checklist-item')
        if (li && editor.dom.getParent(li, 'ul.tox-checklist')) {
            // Calculate if click was in the checkbox area (left side before text)
            const rect = li.getBoundingClientRect()
            const clickX = e.clientX - rect.left

            if (clickX < 40) {
                // Click was on the left side where checkbox pseudo-element is
                e.preventDefault()
                e.stopPropagation()
                toggleCheckboxState(li)
                editor.setDirty(true)
                return false
            }
        }
    })

    // Also handle keyboard spacebar on checklist item to toggle
    editor.on('keydown', (e) => {
        if (e.keyCode === 32) {
            // Spacebar
            const li = editor.dom.getParent(editor.selection.getNode(), 'li.tox-checklist-item')
            if (li && editor.dom.getParent(li, 'ul.tox-checklist')) {
                // Only toggle if cursor is at the very beginning
                const rng = editor.selection.getRng()
                if (rng.startOffset === 0) {
                    e.preventDefault()
                    toggleCheckboxState(li)
                    editor.setDirty(true)
                }
            }
        }
    })

    // Ensure dirty state is tracked on paste/cut
    editor.on('paste cut', () => {
        editor.setDirty(true)
    })
}

function createChecklist(editor) {
    const selection = editor.selection
    const node = selection.getNode()

    // Check if we're in a list already
    let list = editor.dom.getParent(node, 'ul,ol')

    if (list) {
        // Convert existing list to checklist
        convertToChecklist(editor, list)
    } else {
        // Create a new checklist
        const ul = editor.dom.create('ul', { class: 'tox-checklist', id: generateChecklistId() })
        const li = createChecklistItem()
        ul.appendChild(li)
        node.parentNode.insertBefore(ul, node.nextSibling)
        // Set cursor in the list item
        const rng = editor.dom.createRng()
        rng.setStart(li, 0)
        rng.collapse(true)
        editor.selection.setRng(rng)
    }

    editor.setDirty(true)
}

function convertToChecklist(editor, list) {
    editor.dom.addClass(list, 'tox-checklist')

    // Assign unique ID if not already present
    if (!list.id) {
        list.id = generateChecklistId()
    }

    editor.dom.select('li', list).forEach((li) => {
        if (!li.classList.contains('tox-checklist-item')) {
            li.classList.add('tox-checklist-item')
            li.setAttribute('data-checked', 'false')
        }
    })
}

function createChecklistItem(isChecked = false) {
    const li = document.createElement('li')
    li.className = 'tox-checklist-item'
    li.setAttribute('data-checked', isChecked ? 'true' : 'false')

    if (isChecked) {
        li.classList.add('tox-checklist--checked')
    }

    return li
}

function toggleCheckboxState(liElement) {
    const currentState = liElement.getAttribute('data-checked') === 'true'
    const newState = !currentState

    liElement.setAttribute('data-checked', newState ? 'true' : 'false')

    if (newState) {
        liElement.classList.add('tox-checklist--checked')
    } else {
        liElement.classList.remove('tox-checklist--checked')
    }

    // Fire callbacks to notify listeners of state change
    fireChecklistStateChange(liElement)
}

function fireChecklistStateChange(liElement) {
    const event = {
        element: liElement,
        checked: liElement.getAttribute('data-checked') === 'true',
        text: liElement.textContent || ''
    }

    // Call all registered callbacks
    checklistStateChangeCallbacks.forEach((callback) => {
        try {
            callback(event)
        } catch (err) {
            console.error('Error in checklist state change callback:', err)
        }
    })

    // Also dispatch a custom event on the element
    const customEvent = new CustomEvent('checklistStateChange', {
        detail: event,
        bubbles: true
    })
    liElement.dispatchEvent(customEvent)
}

function exitChecklist(editor) {
    const node = editor.selection.getNode()
    const li = editor.dom.getParent(node, 'li')

    if (!li) {
        return
    }

    const ul = editor.dom.getParent(li, 'ul.tox-checklist')

    if (!ul) {
        return
    }

    // Convert all checklist items back to regular text
    editor.dom.select('li', ul).forEach((item) => {
        item.classList.remove('tox-checklist-item', 'tox-checklist--checked')
        item.removeAttribute('data-checked')
    })

    ul.classList.remove('tox-checklist')
    editor.setDirty(true)
}

function exitChecklistAndCreateParagraph(editor, liElement) {
    const ul = editor.dom.getParent(liElement, 'ul.tox-checklist')

    if (!ul) {
        return
    }

    const ulParent = ul.parentNode

    // Get all items after the current item
    const allItems = Array.from(ul.querySelectorAll('li.tox-checklist-item'))
    const currentIndex = allItems.indexOf(liElement)
    const itemsAfter = allItems.slice(currentIndex + 1)

    // Remove the empty list item
    liElement.remove()

    // If there are items after, create a new list with them
    if (itemsAfter.length > 0) {
        const newUl = editor.dom.create('ul', { class: 'tox-checklist', id: generateChecklistId() })

        itemsAfter.forEach(item => {
            newUl.appendChild(item.cloneNode(true))
        })
        // Remove items from original list
        itemsAfter.forEach(item => item.remove())
        // Insert new list after the original
        ul.parentNode.insertBefore(newUl, ul.nextSibling)
    }

    // If the original list is now empty, remove it
    if (ul.querySelectorAll('li').length === 0) {
        ul.remove()
    }

    // Check if there's already an empty paragraph after the first list
    const firstList = ulParent.querySelector('ul.tox-checklist')
    let p = firstList ? firstList.nextSibling : ul.nextSibling
    const shouldCreateNew = !p || p.tagName !== 'P' || p.textContent.trim() !== ''

    if (shouldCreateNew) {
        // Create a new paragraph between the lists (or after if only one list)
        p = editor.dom.create('p')
        if (firstList) {
            firstList.parentNode.insertBefore(p, firstList.nextSibling)
        } else if (ulParent) {
            ulParent.insertBefore(p, ulParent.firstChild)
        }
    }

    // If the paragraph is empty, add a bogus br element for editing
    if (p.textContent.trim() === '') {
        const br = editor.dom.create('br', { 'data-mce-bogus': '1' })
        p.appendChild(br)
    }

    // Set cursor at the start of the paragraph
    const rng = editor.dom.createRng()
    rng.setStart(p, 0)
    rng.collapse(true)
    editor.selection.setRng(rng)

    // Force focus on the editor
    editor.focus()
    editor.setDirty(true)
}

/**
 * Public API: Register a callback for checklist state changes
 * @param {Function} callback - Function to call when checklist state changes
 * @returns {Function} - Function to unregister the callback
 *
 * @example
 * // Basic usage - listen to any checklist state change
 * import { onChecklistStateChange } from './hugerte_checklist_plugin.js'
 *
 * const unsubscribe = onChecklistStateChange((event) => {
 *     console.log('Item:', event.text)
 *     console.log('Checked:', event.checked)
 *     console.log('Element:', event.element)
 * })
 *
 * // Later, to stop listening:
 * unsubscribe()
 *
 * @example
 * // Save checklist state to a backend when items change
 * onChecklistStateChange((event) => {
 *     fetch('/api/checklist-items', {
 *         method: 'PATCH',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({
 *             id: event.element.id,
 *             text: event.text,
 *             completed: event.checked
 *         })
 *     })
 * })
 *
 * @example
 * // Update UI when checklist items change
 * onChecklistStateChange((event) => {
 *     const completedCount = document.querySelectorAll('[data-checked="true"]').length
 *     const totalCount = document.querySelectorAll('.tox-checklist-item').length
 *     document.getElementById('progress').textContent = `${completedCount}/${totalCount}`
 * })
 */
export function onChecklistStateChange(callback) {
    checklistStateChangeCallbacks.push(callback)

    // Return an unregister function
    return () => {
        checklistStateChangeCallbacks = checklistStateChangeCallbacks.filter((cb) => cb !== callback)
    }
}

/**
 * Public API: Get all checklist items in the editor content
 * @param {HTMLElement} container - Container element (e.g., editor body or iframe document)
 * @returns {Array} - Array of checklist item objects with text and checked state
 *
 * @example
 * // Get all checklist items from the editor
 * import { getChecklistItems } from './hugerte_checklist_plugin.js'
 *
 * const editor = tinymce.get('my-editor')
 * const items = getChecklistItems(editor.getBody())
 *
 * console.log(items)
 * // Output:
 * // [
 * //   { element: <li>, text: 'Buy groceries', checked: true },
 * //   { element: <li>, text: 'Cook dinner', checked: false },
 * //   { element: <li>, text: 'Clean up', checked: false }
 * // ]
 *
 * @example
 * // Filter only completed items
 * const editor = tinymce.get('my-editor')
 * const allItems = getChecklistItems(editor.getBody())
 * const completedItems = allItems.filter(item => item.checked)
 *
 * console.log(`${completedItems.length} items completed`)
 *
 * @example
 * // Export checklist data
 * const editor = tinymce.get('my-editor')
 * const items = getChecklistItems(editor.getBody())
 *
 * const checklistData = items.map(item => ({
 *     text: item.text,
 *     completed: item.checked
 * }))
 *
 * // Save to backend
 * fetch('/api/checklists/save', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(checklistData)
 * })
 *
 * @example
 * // Get statistics about the checklist
 * const editor = tinymce.get('my-editor')
 * const items = getChecklistItems(editor.getBody())
 *
 * const total = items.length
 * const completed = items.filter(item => item.checked).length
 * const pending = total - completed
 * const percentage = Math.round((completed / total) * 100)
 *
 * console.log(`Progress: ${percentage}% (${completed}/${total})`)
 */
export function getChecklistItems(container) {
    if (!container) return []

    const items = []
    const listItems = container.querySelectorAll('li.tox-checklist-item')

    listItems.forEach((li) => {
        items.push({
            element: li,
            text: li.textContent || '',
            checked: li.getAttribute('data-checked') === 'true'
        })
    })

    return items
}

// Auto-register the plugin with TinyMCE/HugeRTE when this module loads
if (typeof tinymce !== 'undefined' && tinymce.PluginManager) {
    tinymce.PluginManager.add('checklist', checklistPlugin)
} else if (typeof hugerte !== 'undefined' && hugerte.PluginManager) {
    hugerte.PluginManager.add('checklist', checklistPlugin)
}

// Export the plugin function for manual use
export default checklistPlugin
