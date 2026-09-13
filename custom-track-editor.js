// Custom Track Editor - Leaflet.js + CARTO basemap integration
// Allows players to draw routes and add pacenotes for custom stages

const CustomTrackEditor = {
  map: null,
  drawnItems: null,
  routeLayer: null,
  noteMarkers: [],
  isDrawing: false,
  isAddingMarker: false,
  currentRoute: [],
  customNotes: [],
  
  // Initialize the map
  init() {
    if (typeof L === 'undefined') {
      console.error('Leaflet not loaded');
      return;
    }
    
    // Initialize map centered on a rally-friendly location
    this.map = L.map('editor-map').setView([60.1695, 24.9354], 13); // Helsinki, Finland
    
    // Add map tiles (CARTO basemaps, built on OpenStreetMap data).
    // NOTE: don't use tile.openstreetmap.org here — its volunteer-run servers
    // block apps that don't follow osm.wiki/Tile+usage+policy (403 "Access blocked").
    // CARTO requires a free API key for raster basemaps (carto.com/basemaps/apikey);
    // without it tiles render behind an "API KEY REQUIRED" watermark.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_3j7b_1_5c03214d220c6d99ef5122b8', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);
    
    // Initialize layer for drawn items
    this.drawnItems = L.featureGroup().addTo(this.map);
    this.routeLayer = L.featureGroup().addTo(this.map);
    
    // Single persistent map click handler that dispatches on the active mode.
    // (Do NOT add/remove click handlers per mode and do NOT call map.off('click'):
    // that used to strip every handler, permanently killing pacenote placement.)
    this.map.on('click', (e) => {
      if (this.isAddingMarker) {
        this.addNoteMarker(e.latlng);
      } else if (this.isDrawing) {
        this.addRoutePoint(e.latlng);
      }
    });
  },
  
  // Toggle route drawing mode
  toggleDrawMode() {
    this.isDrawing = !this.isDrawing;
    this.isAddingMarker = false;
    
    const btn = document.getElementById('draw-mode-btn');
    const markerBtn = document.getElementById('marker-mode-btn');
    
    if (btn) {
      btn.style.background = this.isDrawing ? 'var(--red)' : '';
      btn.textContent = this.isDrawing ? '✏️ Drawing...' : '✏️ Draw Route';
    }
    if (markerBtn) {
      markerBtn.style.background = '';
      markerBtn.textContent = '📍 Add Note';
    }
    
    this.map.getContainer().style.cursor = this.isDrawing ? 'crosshair' : '';
  },
  
  // Toggle marker adding mode
  addMarkerMode() {
    this.isAddingMarker = !this.isAddingMarker;
    this.isDrawing = false;
    
    const btn = document.getElementById('marker-mode-btn');
    const drawBtn = document.getElementById('draw-mode-btn');
    
    if (btn) {
      btn.style.background = this.isAddingMarker ? 'var(--red)' : '';
      btn.textContent = this.isAddingMarker ? '📍 Placing...' : '📍 Add Note';
    }
    if (drawBtn) {
      drawBtn.style.background = '';
      drawBtn.textContent = '✏️ Draw Route';
    }
    
    this.map.getContainer().style.cursor = this.isAddingMarker ? 'pointer' : '';
  },
  
  // Add point to route
  addRoutePoint(latlng) {
    if (!this.isDrawing) return;
    
    this.currentRoute.push(latlng);
    
    // Draw line segment
    if (this.currentRoute.length > 1) {
      const prevPoint = this.currentRoute[this.currentRoute.length - 2];
      const line = L.polyline([prevPoint, latlng], {
        color: '#e8291c',
        weight: 4,
        opacity: 0.8
      }).addTo(this.routeLayer);
    }
    
    // Add marker for point
    const marker = L.circleMarker(latlng, {
      radius: 6,
      color: '#e8291c',
      fillColor: '#e8291c',
      fillOpacity: 1
    }).addTo(this.drawnItems);
  },
  
  // Add pacenote marker at location
  addNoteMarker(latlng) {
    const noteText = document.getElementById('editor-note-input').value.trim();
    if (!noteText) {
      alert('Please enter a pacenote first');
      return;
    }
    
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'custom-note-marker',
        html: '<div style="background:#f5c518;color:#000;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;white-space:nowrap;">📍</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(this.drawnItems);
    
    // Add popup with note
    marker.bindPopup(`<b>Pacenote:</b><br>${noteText}`);
    
    // Store note data
    this.customNotes.push({
      latlng: latlng,
      text: noteText,
      marker: marker
    });
    
    // Update note list UI
    this.updateNoteList();
    
    // Clear input
    document.getElementById('editor-note-input').value = '';
    
    // Exit marker mode
    this.isAddingMarker = false;
    const btn = document.getElementById('marker-mode-btn');
    if (btn) {
      btn.style.background = '';
      btn.textContent = '📍 Add Note';
    }
    this.map.getContainer().style.cursor = '';
  },
  
  // Update note list UI
  updateNoteList() {
    const listEl = document.getElementById('editor-note-list');
    if (!listEl) return;
    
    listEl.innerHTML = this.customNotes.map((note, idx) => `
      <div style="background:var(--surf2);border:1px solid var(--brd2);padding:6px 8px;font-size:11px;font-family:'IBM Plex Mono',monospace;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--gold)">${note.text}</span>
        <button onclick="CustomTrackEditor.removeNote(${idx})" style="background:none;border:none;color:#e8291c;cursor:pointer;font-size:14px">×</button>
      </div>
    `).join('');
  },
  
  // Remove note by index
  removeNote(idx) {
    const note = this.customNotes[idx];
    if (note && note.marker) {
      this.drawnItems.removeLayer(note.marker);
    }
    this.customNotes.splice(idx, 1);
    this.updateNoteList();
  },
  
  // Clear all track data
  clear() {
    this.currentRoute = [];
    this.customNotes = [];
    this.drawnItems.clearLayers();
    this.routeLayer.clearLayers();
    this.updateNoteList();
    
    // Reset buttons
    this.isDrawing = false;
    this.isAddingMarker = false;
    const drawBtn = document.getElementById('draw-mode-btn');
    const markerBtn = document.getElementById('marker-mode-btn');
    if (drawBtn) {
      drawBtn.style.background = '';
      drawBtn.textContent = '✏️ Draw Route';
    }
    if (markerBtn) {
      markerBtn.style.background = '';
      markerBtn.textContent = '📍 Add Note';
    }
    this.map.getContainer().style.cursor = '';
  },
  
  // Export custom track as stage data
  exportTrack() {
    const stageName = document.getElementById('editor-stage-name').value || 'Custom Stage';
    
    // Convert route points to simple format
    const routePoints = this.currentRoute.map(p => ({
      lat: p.lat,
      lng: p.lng
    }));
    
    // Convert notes to game format
    const notes = this.customNotes.map(note => ({
      raw: note.text,
      ans: typeof PacenoteSystem !== 'undefined' ? PacenoteSystem.translate(note.text) : note.text
    }));
    
    return {
      name: stageName,
      route: routePoints,
      notes: notes,
      custom: true
    };
  },
  
  // Import track data
  importTrack(data) {
    this.clear();
    
    // Set stage name
    if (data.name) {
      document.getElementById('editor-stage-name').value = data.name;
    }
    
    // Restore route
    if (data.route && Array.isArray(data.route)) {
      this.currentRoute = data.route.map(p => L.latLng(p.lat, p.lng));
      
      // Draw route
      for (let i = 1; i < this.currentRoute.length; i++) {
        const prevPoint = this.currentRoute[i - 1];
        const currPoint = this.currentRoute[i];
        L.polyline([prevPoint, currPoint], {
          color: '#e8291c',
          weight: 4,
          opacity: 0.8
        }).addTo(this.routeLayer);
        
        L.circleMarker(currPoint, {
          radius: 6,
          color: '#e8291c',
          fillColor: '#e8291c',
          fillOpacity: 1
        }).addTo(this.drawnItems);
      }
      
      // Fit map to route
      if (this.currentRoute.length > 0) {
        this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
      }
    }
    
    // Restore notes
    if (data.notes && Array.isArray(data.notes)) {
      data.notes.forEach(note => {
        const latlng = this.currentRoute.length > 0 
          ? this.currentRoute[Math.floor(Math.random() * this.currentRoute.length)]
          : L.latLng(60.1695, 24.9354);
        
        const marker = L.marker(latlng, {
          icon: L.divIcon({
            className: 'custom-note-marker',
            html: '<div style="background:#f5c518;color:#000;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;white-space:nowrap;">📍</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(this.drawnItems);
        
        marker.bindPopup(`<b>Pacenote:</b><br>${note.raw}`);
        
        this.customNotes.push({
          latlng: latlng,
          text: note.raw,
          marker: marker
        });
      });
      
      this.updateNoteList();
    }
  }
};

// Global functions for HTML onclick handlers.
// NOTE: the editor buttons are wired ONLY through these onclick attributes in
// index.html — do not also addEventListener to the same buttons, or every
// click fires the handler twice and each mode instantly cancels itself.
function toggleDrawMode() {
  CustomTrackEditor.toggleDrawMode();
}

function addMarkerMode() {
  CustomTrackEditor.addMarkerMode();
}

function clearCustomTrack() {
  if (confirm('Clear all route and notes?')) {
    CustomTrackEditor.clear();
  }
}

function editorAddNote() {
  // Get the last route point or map center
  let latlng;
  if (CustomTrackEditor.currentRoute.length > 0) {
    latlng = CustomTrackEditor.currentRoute[CustomTrackEditor.currentRoute.length - 1];
  } else {
    latlng = CustomTrackEditor.map.getCenter();
  }
  CustomTrackEditor.addNoteMarker(latlng);
}

function editorImport() {
  const jsonStr = document.getElementById('editor-import-json').value.trim();
  if (!jsonStr) {
    alert('Please paste stage JSON data');
    return;
  }
  
  try {
    const data = JSON.parse(jsonStr);
    CustomTrackEditor.importTrack(data);
    document.getElementById('editor-import-json').value = '';
  } catch (e) {
    alert('Invalid JSON data');
  }
}

// Initialize editor when the editor screen is first shown.
// Guarded so a missing/unreassignable show() can never throw at load time.
if (typeof show === 'function') {
  const originalShow = show;
  show = function(screenId) {
    originalShow(screenId);
    if (screenId === 'editor' && !CustomTrackEditor.map) {
      setTimeout(() => CustomTrackEditor.init(), 100);
    }
  };
}
