// app-maps.js - Microsoft Map 98 / Haritalar for IdiotPhone

const AppMaps = {
  currentLat: 41.0082, // Default Istanbul/Central
  currentLon: 28.9784,
  currentZoom: 13,
  mapIframe: null,

  init() {
    this.initControls();
  },

  initControls() {
    const searchInput = document.getElementById("maps-search-input");
    const searchBtn = document.getElementById("maps-search-btn");
    const gpsBtn = document.getElementById("maps-gps-btn");
    const zoomInBtn = document.getElementById("maps-zoomin-btn");
    const zoomOutBtn = document.getElementById("maps-zoomout-btn");
    this.mapIframe = document.getElementById("maps-iframe");

    if (searchBtn && searchInput) {
      searchBtn.addEventListener("click", () => this.searchPlace(searchInput.value.trim()));
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.searchPlace(searchInput.value.trim());
      });
    }

    if (gpsBtn) {
      gpsBtn.addEventListener("click", () => this.locateUser());
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => {
        SoundManager.playClick();
        this.currentZoom = Math.min(18, this.currentZoom + 1);
        this.updateMapUrl();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => {
        SoundManager.playClick();
        this.currentZoom = Math.max(3, this.currentZoom - 1);
        this.updateMapUrl();
      });
    }

    // Initial load
    this.updateMapUrl();
  },

  updateMapUrl() {
    if (!this.mapIframe) return;
    const bboxDelta = 0.02 * Math.pow(2, 13 - this.currentZoom);
    const minLon = this.currentLon - bboxDelta;
    const minLat = this.currentLat - bboxDelta;
    const maxLon = this.currentLon + bboxDelta;
    const maxLat = this.currentLat + bboxDelta;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${this.currentLat}%2C${this.currentLon}`;
    this.mapIframe.src = url;
  },

  searchPlace(query) {
    if (!query) return;
    SoundManager.playClick();
    const statusEl = document.getElementById("maps-status");
    if (statusEl) statusEl.textContent = `Searching "${query}"...`;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          this.currentLat = parseFloat(data[0].lat);
          this.currentLon = parseFloat(data[0].lon);
          this.currentZoom = 14;
          this.updateMapUrl();
          if (statusEl) statusEl.textContent = data[0].display_name.split(",")[0];
        } else {
          SoundManager.playChord();
          if (statusEl) statusEl.textContent = "Location not found.";
        }
      })
      .catch(err => {
        console.error("Geocoding failed", err);
        if (statusEl) statusEl.textContent = "Search error.";
      });
  },

  locateUser() {
    SoundManager.playClick();
    const statusEl = document.getElementById("maps-status");
    if (statusEl) statusEl.textContent = "Acquiring GPS position...";

    // 1. Try native AndroidBridge first (reliable on file:// origin)
    if (window.AndroidBridge && window.AndroidBridge.getCurrentLocationJson) {
      try {
        const json = window.AndroidBridge.getCurrentLocationJson();
        if (json && json.length > 2) {
          const loc = JSON.parse(json);
          if (loc.lat && loc.lon) {
            this.currentLat = loc.lat;
            this.currentLon = loc.lon;
            this.currentZoom = 15;
            this.updateMapUrl();
            SoundManager.playDing();
            if (statusEl) statusEl.textContent = `GPS: ${this.currentLat.toFixed(4)}, ${this.currentLon.toFixed(4)}`;
            return;
          }
        }
      } catch (e) {
        console.warn("AndroidBridge location failed, trying HTML5", e);
      }
    }

    // 2. Fallback to HTML5 Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentLat = pos.coords.latitude;
          this.currentLon = pos.coords.longitude;
          this.currentZoom = 15;
          this.updateMapUrl();
          SoundManager.playDing();
          if (statusEl) statusEl.textContent = `GPS: ${this.currentLat.toFixed(4)}, ${this.currentLon.toFixed(4)}`;
        },
        (err) => {
          SoundManager.playChord();
          if (statusEl) statusEl.textContent = "GPS Unavailable. Check permissions.";
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      if (statusEl) statusEl.textContent = "Geolocation not supported.";
    }
  }
};

window.AppMaps = AppMaps;
document.addEventListener("DOMContentLoaded", () => AppMaps.init());
