# HugeRTE Checklist Plugin

A lightweight checklist plugin for HugeRTE/TinyMCE that adds interactive checkbox functionality.

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
        // Listen to checklist state changes
        onChecklistStateChange((event) => {
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

### `onChecklistStateChange(callback)`
Register a callback for checkbox state changes.

```javascript
// Basic usage - listen to any checklist state change
import { onChecklistStateChange } from './hugerte_checklist_plugin.js'

const unsubscribe = onChecklistStateChange((event) => {
    console.log('Item:', event.text)
    console.log('Checked:', event.checked)
    console.log('Element:', event.element)
})

// Later, to stop listening:
unsubscribe()

// Save checklist state to a backend when items change
onChecklistStateChange((event) => {
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

// Update UI when checklist items change
onChecklistStateChange((event) => {
    const completedCount = document.querySelectorAll('[data-checked="true"]').length
    const totalCount = document.querySelectorAll('.tox-checklist-item').length
    document.getElementById('progress').textContent = `${completedCount}/${totalCount}`
})
```

### `getChecklistItems(element)`
Get all checklist items with their state.

```javascript
// Get all checklist items from the editor
import { getChecklistItems } from './hugerte_checklist_plugin.js'

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
