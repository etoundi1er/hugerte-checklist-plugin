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

// Constants
const CHECKLIST_SELECTOR = 'ul.tox-checklist'
const CHECKLIST_ITEM_SELECTOR = 'li.tox-checklist-item'
const CHECKBOX_CLICK_AREA = 40

// Helper functions
function generateChecklistId() {
    return `tox-checklist-${++checklistIdCounter}`
}

function getChecklistItem(editor, node) {
    const li = editor.dom.getParent(node || editor.selection.getNode(), 'li')
    if (!li || !editor.dom.getParent(li, CHECKLIST_SELECTOR)) {
        return null
    }
    return li
}

function isChecked(element) {
    return element.getAttribute('data-checked') === 'true'
}

function setChecked(element, checked) {
    element.setAttribute('data-checked', checked ? 'true' : 'false')
    element.classList.toggle('tox-checklist--checked', checked)
}

function isEmptyItem(li) {
    return !li.textContent.trim()
}

function isCaretAtStart(rng) {
    return rng.startOffset === 0
}

function setCursorAtStart(editor, element) {
    const rng = editor.dom.createRng()
    rng.setStart(element, 0)
    rng.collapse(true)
    editor.selection.setRng(rng)
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
        const li = getChecklistItem(editor)
        if (li) {
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
        const li = getChecklistItem(editor)
        if (!li) return

        // Ctrl+Enter or Cmd+Enter to toggle checkbox
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
            e.preventDefault()
            editor.execCommand('toggleChecklistItem')
            return
        }

        // Enter key to create new list item or exit checklist if item is empty
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault()
            if (isEmptyItem(li)) {
                exitChecklistAndCreateParagraph(editor, li)
            } else {
                const newLi = createChecklistItem()
                li.parentNode.insertBefore(newLi, li.nextSibling)
                setCursorAtStart(editor, newLi)
                editor.setDirty(true)
            }
            return
        }

        // Backspace on empty checklist item to exit
        if (e.keyCode === 8 && isEmptyItem(li) && isCaretAtStart(editor.selection.getRng())) {
            e.preventDefault()
            exitChecklist(editor)
            return
        }

        // Spacebar at start to toggle checkbox
        if (e.keyCode === 32 && isCaretAtStart(editor.selection.getRng())) {
            e.preventDefault()
            toggleCheckboxState(li)
            editor.setDirty(true)
        }
    })

    // Handle checkbox clicks via mousedown on the checkbox area
    editor.on('mousedown', (e) => {
        const li = editor.dom.getParent(e.target, CHECKLIST_ITEM_SELECTOR)
        if (li && editor.dom.getParent(li, CHECKLIST_SELECTOR)) {
            const rect = li.getBoundingClientRect()
            const clickX = e.clientX - rect.left

            if (clickX < CHECKBOX_CLICK_AREA) {
                e.preventDefault()
                e.stopPropagation()
                toggleCheckboxState(li)
                editor.setDirty(true)
                return false
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
        setCursorAtStart(editor, li)
    }

    editor.setDirty(true)
}

function convertToChecklist(editor, list) {
    editor.dom.addClass(list, 'tox-checklist')

    if (!list.id) {
        list.id = generateChecklistId()
    }

    editor.dom.select('li', list).forEach((li) => {
        if (!li.classList.contains('tox-checklist-item')) {
            li.classList.add('tox-checklist-item')
            setChecked(li, false)
        }
    })
}

function createChecklistItem(checked = false) {
    const li = document.createElement('li')
    li.className = 'tox-checklist-item'
    setChecked(li, checked)
    return li
}

function toggleCheckboxState(liElement) {
    const newState = !isChecked(liElement)
    setChecked(liElement, newState)
    fireChecklistStateChange(liElement)
}

function fireChecklistStateChange(liElement) {
    const event = {
        element: liElement,
        checked: isChecked(liElement),
        text: liElement.textContent || ''
    }

    checklistStateChangeCallbacks.forEach((callback) => {
        try {
            callback(event)
        } catch (err) {
            console.error('Error in checklist state change callback:', err)
        }
    })

    liElement.dispatchEvent(new CustomEvent('checklistStateChange', {
        detail: event,
        bubbles: true
    }))
}

function exitChecklist(editor) {
    const li = getChecklistItem(editor)
    if (!li) return

    const ul = editor.dom.getParent(li, CHECKLIST_SELECTOR)
    if (!ul) return

    editor.dom.select('li', ul).forEach((item) => {
        item.classList.remove('tox-checklist-item', 'tox-checklist--checked')
        item.removeAttribute('data-checked')
    })

    ul.classList.remove('tox-checklist')
    editor.setDirty(true)
}

function exitChecklistAndCreateParagraph(editor, liElement) {
    const ul = editor.dom.getParent(liElement, CHECKLIST_SELECTOR)
    if (!ul) return

    const ulParent = ul.parentNode
    const allItems = Array.from(ul.querySelectorAll(CHECKLIST_ITEM_SELECTOR))
    const currentIndex = allItems.indexOf(liElement)
    const itemsAfter = allItems.slice(currentIndex + 1)

    liElement.remove()

    let currentList = ul

    // Move items after to a new list
    if (itemsAfter.length > 0) {
        const newUl = editor.dom.create('ul', { class: 'tox-checklist', id: generateChecklistId() })
        itemsAfter.forEach(item => newUl.appendChild(item))
        ul.parentNode.insertBefore(newUl, ul.nextSibling)
    }

    // Remove empty list
    if (ul.querySelectorAll('li').length === 0) {
        ul.remove()
        currentList = null
    }

    // Create or find paragraph
    let p = currentList?.nextSibling
    if (!p || p.tagName !== 'P' || p.textContent.trim()) {
        p = editor.dom.create('p')
        if (currentList) {
            currentList.parentNode.insertBefore(p, currentList.nextSibling)
        } else if (ulParent) {
            ulParent.insertBefore(p, ulParent.firstChild)
        }
    }

    // Add bogus br if empty, it helps ensure correct cursor placement
    if (p && !p.textContent.trim()) {
        p.appendChild(editor.dom.create('br', { 'data-mce-bogus': '1' }))
    }

    // Set cursor
    if (p) {
        setCursorAtStart(editor, p)
    }

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

    return Array.from(container.querySelectorAll(CHECKLIST_ITEM_SELECTOR)).map((li) => ({
        element: li,
        text: li.textContent || '',
        checked: isChecked(li)
    }))
}

// Auto-register the plugin with TinyMCE/HugeRTE when this module loads
if (typeof tinymce !== 'undefined' && tinymce.PluginManager) {
    tinymce.PluginManager.add('checklist', checklistPlugin)
} else if (typeof hugerte !== 'undefined' && hugerte.PluginManager) {
    hugerte.PluginManager.add('checklist', checklistPlugin)
}

// Export the plugin function for manual use
export default checklistPlugin
