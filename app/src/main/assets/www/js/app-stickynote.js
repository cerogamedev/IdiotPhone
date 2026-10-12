// app-stickynote.js - Desktop Sticky Notes 98 for IdiotPhone
// Features: Multiple note colors, auto-save to localStorage, Desktop Pinning widget.

const AppStickyNote = {
  KEY_NOTE: 'idiotphone_stickynote_content',
  KEY_COLOR: 'idiotphone_stickynote_color',
  KEY_PINNED: 'idiotphone_stickynote_pinned',

  currentColor: '#fff8a6',

  init() {
    this.loadNote();
    this.updateDesktopWidget();
  },

  loadNote() {
    const text = localStorage.getItem(this.KEY_NOTE) || '• Buy groceries\n• Drink 2L water\n• Call mom at 5 PM\n• Read 20 pages';
    const color = localStorage.getItem(this.KEY_COLOR) || '#fff8a6';
    this.currentColor = color;

    const textarea = document.getElementById('stickynote-text');
    if (textarea) {
      textarea.value = text;
      textarea.style.backgroundColor = color;
    }
  },

  saveNote() {
    const textarea = document.getElementById('stickynote-text');
    if (!textarea) return;
    const text = textarea.value;
    localStorage.setItem(this.KEY_NOTE, text);
    this.updateDesktopWidget();
  },

  setColor(color) {
    this.currentColor = color;
    localStorage.setItem(this.KEY_COLOR, color);
    const textarea = document.getElementById('stickynote-text');
    if (textarea) textarea.style.backgroundColor = color;
    this.updateDesktopWidget();
  },

  togglePinDesktop() {
    const current = localStorage.getItem(this.KEY_PINNED) === 'true';
    const next = !current;
    localStorage.setItem(this.KEY_PINNED, next ? 'true' : 'false');
    this.updateDesktopWidget();
    if (window.Desktop) {
      Desktop.showRetroNotification(
        'Sticky Note',
        next ? 'Sticky Note pinned directly to your Desktop wallpaper!' : 'Sticky Note unpinned from Desktop.',
        'info'
      );
    }
  },

  unpinFromDesktop() {
    localStorage.setItem(this.KEY_PINNED, 'false');
    this.updateDesktopWidget();
  },

  updateDesktopWidget() {
    const widget = document.getElementById('desktop-pinned-stickynote');
    const preview = document.getElementById('desktop-stickynote-preview');
    if (!widget || !preview) return;

    const isPinned = localStorage.getItem(this.KEY_PINNED) === 'true';
    if (!isPinned) {
      widget.style.display = 'none';
      return;
    }

    const text = localStorage.getItem(this.KEY_NOTE) || '';
    const color = localStorage.getItem(this.KEY_COLOR) || '#fff8a6';

    widget.style.display = 'block';
    widget.style.backgroundColor = color;
    preview.textContent = text || '(Empty Note)';
  },

  clearNote() {
    if (confirm('Clear note contents?')) {
      const textarea = document.getElementById('stickynote-text');
      if (textarea) textarea.value = '';
      this.saveNote();
    }
  }
};

window.AppStickyNote = AppStickyNote;
