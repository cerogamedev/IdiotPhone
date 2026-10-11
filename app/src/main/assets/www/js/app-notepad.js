// app-notepad.js - Windows 98 Notepad (notepad.exe) for IdiotPhone

const AppNotepad = {
  currentFile: "Untitled.txt",

  init() {
    this.loadCurrentNote();
    const area = document.getElementById("notepad-textarea");
    if (area) {
      area.addEventListener("input", () => {
        this.autoSave();
        this.updateStats();
      });
    }
  },

  updateStats() {
    const area = document.getElementById("notepad-textarea");
    const stats = document.getElementById("notepad-status");
    if (area && stats) {
      const text = area.value;
      const lines = text.split("\n").length;
      const chars = text.length;
      stats.textContent = `Ln ${lines}, Col ${chars}`;
    }
  },

  autoSave() {
    const area = document.getElementById("notepad-textarea");
    if (area) {
      localStorage.setItem("idiotphone_notepad_draft", area.value);
    }
  },

  loadCurrentNote() {
    const area = document.getElementById("notepad-textarea");
    if (area) {
      const saved = localStorage.getItem("idiotphone_notepad_draft");
      if (saved) area.value = saved;
      this.updateStats();
    }
  },

  newFile() {
    SoundManager.playClick();
    const area = document.getElementById("notepad-textarea");
    if (area) {
      area.value = "";
      localStorage.removeItem("idiotphone_notepad_draft");
      this.updateStats();
    }
  },

  saveFile() {
    SoundManager.playClick();
    const area = document.getElementById("notepad-textarea");
    if (area) {
      localStorage.setItem("idiotphone_notepad_draft", area.value);
      Desktop.showRetroNotification("Notepad", "Document saved successfully.", "info");
    }
  }
};

window.AppNotepad = AppNotepad;
document.addEventListener("DOMContentLoaded", () => AppNotepad.init());
