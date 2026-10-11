// app-gmail.js - Outlook Express 5.0 / Gmail Client for IdiotPhone

const AppGmail = {
  init() {
    this.initToolbar();
  },

  initToolbar() {
    const composeBtn = document.getElementById("gmail-compose-btn");
    const openWebBtn = document.getElementById("gmail-openweb-btn");

    if (composeBtn) {
      composeBtn.addEventListener("click", () => {
        this.openComposeModal();
      });
    }

    if (openWebBtn) {
      openWebBtn.addEventListener("click", () => {
        this.openFullWeb();
      });
    }
  },

  openFullWeb() {
    SoundManager.playClick();
    if (window.AndroidBridge && window.AndroidBridge.openRetroBrowser) {
      window.AndroidBridge.openRetroBrowser("https://mail.google.com", "Outlook Express - Gmail");
    } else {
      window.open("https://mail.google.com", "_blank");
    }
  },

  openComposeModal() {
    SoundManager.playClick();
    const modal = document.getElementById("dlg-gmail-compose");
    document.getElementById("gmail-to-input").value = "";
    document.getElementById("gmail-subject-input").value = "";
    document.getElementById("gmail-body-input").value = "";
    modal.style.display = "flex";
    Desktop.bringToFront(modal);
  },

  sendEmail() {
    const to = document.getElementById("gmail-to-input").value.trim();
    const subject = document.getElementById("gmail-subject-input").value.trim();
    const body = document.getElementById("gmail-body-input").value.trim();

    if (!to) {
      SoundManager.playChord();
      alert("Please enter a recipient email address.");
      return;
    }

    SoundManager.playClick();
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    document.getElementById("dlg-gmail-compose").style.display = "none";
    Desktop.showRetroNotification("Message Queued", `Email to ${to} dispatched to Outbox.`, "info");
  }
};

window.AppGmail = AppGmail;
document.addEventListener("DOMContentLoaded", () => AppGmail.init());
