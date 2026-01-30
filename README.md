# HugeRTE/TinyMCE Checklist Plugin (Forever Free)

A lightweight checklist plugin for HugeRTE/TinyMCE that adds interactive checkbox functionality.

[See Demo](https://etoundi1er.github.io/hugerte-checklist-plugin/demo.html)

## Installation

```bash
npm install @etoundi1er/hugerte-checklist-plugin
```

## Usage

```javascript
import { onChecklistStateChange, getChecklistItems } from '@etoundi1er/hugerte-checklist-plugin';

hugerte.init({
    selector: '#editor',
    plugins: 'lists checklist',
    toolbar: 'checklist bullist numlist',
    setup: (editor) => {
        // Listen to checklist state changes (scoped to this editor)
        onChecklistStateChange(editor, (event) => {
            console.log('Editor:', event.editor.id);
            console.log('Item toggled:', event.text, event.checked);
        });
    }
});
```

## Keyboard Shortcuts

- `Enter` - Create new checklist item
- `Ctrl+Enter` / `Cmd+Enter` - Toggle checkbox
- `Backspace` on empty item - Exit checklist

## API

### `onChecklistStateChange(editor, callback)`
Register a callback for checkbox state changes, scoped to a specific editor instance. This ensures that when you have multiple editors on a page, callbacks are only triggered for the editor they were registered with.

**Parameters:**
- `editor` - The HugeRTE/TinyMCE editor instance
- `callback` - Function called when a checkbox state changes

**Event object properties:**
- `editor` - The editor instance where the change occurred
- `element` - The checkbox `<li>` element
- `text` - The text content of the checkbox item
- `checked` - Boolean indicating if the item is checked

```javascript
// Inside setup (most common pattern)
import { onChecklistStateChange } from '@etoundi1er/hugerte-checklist-plugin'

hugerte.init({
    selector: '#my-editor',
    plugins: 'lists checklist',
    toolbar: 'checklist bullist numlist',
    setup: (editor) => {
        const unsubscribe = onChecklistStateChange(editor, (event) => {
            console.log('Editor:', event.editor.id)
            console.log('Item:', event.text)
            console.log('Checked:', event.checked)
            console.log('Element:', event.element)
        })

        // Later, to stop listening (e.g., on editor remove):
        editor.on('remove', () => unsubscribe())
    }
})

// Save checklist state to a backend when items change
hugerte.init({
    selector: '#my-editor',
    plugins: 'lists checklist',
    setup: (editor) => {
        onChecklistStateChange(editor, (event) => {
            fetch('/api/checklist-items', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: event.element.id,
                    text: event.text,
                    completed: event.checked
                })
            })
        })
    }
})

// Update UI when checklist items change (scoped to editor)
hugerte.init({
    selector: '#my-editor',
    plugins: 'lists checklist',
    setup: (editor) => {
        onChecklistStateChange(editor, (event) => {
            const body = event.editor.getBody()
            const completedCount = body.querySelectorAll('[data-checked="true"]').length
            const totalCount = body.querySelectorAll('.tox-checklist-item').length
            document.getElementById('progress').textContent = `${completedCount}/${totalCount}`
        })
    }
})
```

### `getChecklistItems(element)`
Get all checklist items with their state.

```javascript
// Get all checklist items from the editor
import { getChecklistItems } from '@etoundi1er/hugerte-checklist-plugin'

const editor = tinymce.get('my-editor')
const items = getChecklistItems(editor.getBody())

console.log(items)
// Output:
// [
//   { element: <li>, text: 'Buy groceries', checked: true },
//   { element: <li>, text: 'Cook dinner', checked: false },
//   { element: <li>, text: 'Clean up', checked: false }
// ]

// Filter only completed items
const editor = tinymce.get('my-editor')
const allItems = getChecklistItems(editor.getBody())
const completedItems = allItems.filter(item => item.checked)

console.log(`${completedItems.length} items completed`)

// Export checklist data
const editor = tinymce.get('my-editor')
const items = getChecklistItems(editor.getBody())

const checklistData = items.map(item => ({
    text: item.text,
    completed: item.checked
}))

// Save to backend
fetch('/api/checklists/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checklistData)
})

// Get statistics about the checklist
const editor = tinymce.get('my-editor')
const items = getChecklistItems(editor.getBody())

const total = items.length
const completed = items.filter(item => item.checked).length
const pending = total - completed
const percentage = Math.round((completed / total) * 100)

console.log(`Progress: ${percentage}% (${completed}/${total})`)
```

## Local server

`python3 -m http.server 8000`

## License

MIT
