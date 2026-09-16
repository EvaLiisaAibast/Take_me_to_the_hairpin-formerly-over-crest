// PeerJS-based P2P Multiplayer for Rally Pacenote Academy
// Hybrid approach: Node.js/Bun backend handles accounts/leaderboards, PeerJS handles live race sync

const MultiplayerP2P = {
  peer: null,
  connections: new Map(), // peerId -> connection
  isHost: false,
  hostPeerId: null,
  playerName: null,
  lobbyCode: null,
  players: new Map(), // peerId -> player info
  raceInProgress: false,
  raceData: null,
  
  // Initialize PeerJS
  init(playerName) {
    this.playerName = playerName || 'Player';
    
    try {
      // Create peer with free PeerJS cloud signaling server
      this.peer = new Peer(null, {
        debug: 2
      });
      
      this.peer.on('open', (id) => {
        console.log('[P2P] My peer ID:', id);
        this.hostPeerId = id;
        this.onPeerReady(id);
      });
      
      this.peer.on('connection', (conn) => {
        console.log('[P2P] Incoming connection from:', conn.peer);
        this.setupConnection(conn);
      });
      
      this.peer.on('error', (err) => {
        console.error('[P2P] Peer error:', err);
        this.onError(err);
      });
      
      this.peer.on('disconnected', () => {
        console.log('[P2P] Disconnected from signaling server');
        // Reconnect
        this.peer.reconnect();
      });
      
      return true;
    } catch (e) {
      console.error('[P2P] Failed to initialize:', e);
      return false;
    }
  },
  
  onPeerReady(peerId) {
    // Generate lobby code from peer ID (last 6 chars)
    this.lobbyCode = peerId.slice(-6).toUpperCase();
    console.log('[P2P] Lobby code:', this.lobbyCode);
    
    // Show lobby info to user
    this.showLobbyInfo(this.lobbyCode, peerId);
  },
  
  // Join an existing lobby
  joinLobby(hostPeerId, playerName) {
    this.playerName = playerName || 'Player';
    this.isHost = false;
    this.hostPeerId = hostPeerId;
    
    try {
      const conn = this.peer.connect(hostPeerId, {
        metadata: { playerName: this.playerName }
      });
      
      this.setupConnection(conn);
      return true;
    } catch (e) {
      console.error('[P2P] Failed to join lobby:', e);
      return false;
    }
  },
  
  // Setup connection event handlers
  setupConnection(conn) {
    conn.on('open', () => {
      console.log('[P2P] Connection established with:', conn.peer);
      this.connections.set(conn.peer, conn);
      
      // Send player info
      conn.send({
        type: 'player-info',
        playerName: this.playerName,
        peerId: this.peer.id
      });
      
      // If host, send current lobby state
      if (this.isHost) {
        conn.send({
          type: 'lobby-state',
          players: Array.from(this.players.values()),
          raceInProgress: this.raceInProgress,
          raceData: this.raceData
        });
      }
    });
    
    conn.on('data', (data) => {
      this.handleMessage(conn.peer, data);
    });
    
    conn.on('close', () => {
      console.log('[P2P] Connection closed:', conn.peer);
      this.connections.delete(conn.peer);
      this.players.delete(conn.peer);
      this.onPlayerLeft(conn.peer);
    });
    
    conn.on('error', (err) => {
      console.error('[P2P] Connection error:', err);
    });
  },
  
  // Handle incoming messages
  handleMessage(peerId, data) {
    switch (data.type) {
      case 'player-info':
        this.players.set(peerId, {
          peerId: peerId,
          playerName: data.playerName,
          ready: false,
          progress: 0,
          finished: false
        });
        this.onPlayerJoined(data.playerName);
        this.broadcastPlayerList();
        break;
        
      case 'lobby-state':
        // Update lobby state from host
        data.players.forEach(p => {
          this.players.set(p.peerId, p);
        });
        this.raceInProgress = data.raceInProgress;
        this.raceData = data.raceData;
        this.onLobbyStateUpdate();
        break;
        
      case 'player-list':
        // Update player list from host
        this.players.clear();
        data.players.forEach(p => {
          this.players.set(p.peerId, p);
        });
        this.onPlayerListUpdate();
        break;
        
      case 'player-ready':
        const player = this.players.get(peerId);
        if (player) {
          player.ready = data.ready;
          this.onPlayerReady(peerId, data.ready);
        }
        break;
        
      case 'race-countdown':
        this.onRaceCountdown(data.countdown);
        break;
        
      case 'race-start':
        this.raceData = data.raceData;
        this.onRaceStart(data.raceData);
        break;
        
      case 'player-progress':
        const p = this.players.get(peerId);
        if (p) {
          p.progress = data.progress;
          this.onPlayerProgress(peerId, data.progress);
        }
        break;
        
      case 'player-finished':
        const pf = this.players.get(peerId);
        if (pf) {
          pf.finished = true;
          pf.finishTime = data.time;
          this.onPlayerFinished(peerId, data.time);
        }
        break;
        
      case 'race-complete':
        this.onRaceComplete(data.results);
        break;
        
      case 'rematch-request':
        this.onRematchRequest();
        break;
        
      case 'rematch-confirm':
        this.onRematchConfirm();
        break;
        
      default:
        console.log('[P2P] Unknown message type:', data.type);
    }
  },
  
  // Broadcast message to all connected peers
  broadcast(message) {
    this.connections.forEach((conn) => {
      conn.send(message);
    });
  },
  
  // Broadcast updated player list (host only)
  broadcastPlayerList() {
    if (!this.isHost) return;
    
    this.broadcast({
      type: 'player-list',
      players: Array.from(this.players.values())
    });
  },
  
  // Set ready status
  setReady(ready) {
    this.broadcast({
      type: 'player-ready',
      ready: ready
    });
  },
  
  // Start race (host only)
  startRace(raceData) {
    if (!this.isHost) return;
    
    this.raceInProgress = true;
    this.raceData = raceData;
    
    this.broadcast({
      type: 'race-start',
      raceData: raceData
    });
    
    this.onRaceStart(raceData);
  },
  
  // Send progress update
  sendProgress(progress) {
    this.broadcast({
      type: 'player-progress',
      progress: progress
    });
  },
  
  // Send finish notification
  sendFinish(time) {
    this.broadcast({
      type: 'player-finished',
      time: time
    });
  },
  
  // Request rematch
  requestRematch() {
    this.broadcast({
      type: 'rematch-request'
    });
  },
  
  // Confirm rematch
  confirmRematch() {
    this.broadcast({
      type: 'rematch-confirm'
    });
  },
  
  // Disconnect
  disconnect() {
    this.connections.forEach((conn) => {
      conn.close();
    });
    this.connections.clear();
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.players.clear();
    this.raceInProgress = false;
    this.raceData = null;
  },
  
  // UI Callbacks (to be implemented by game)
  onPeerReady: function(peerId) {
    this.updatePlayerCount();
  },
  onPlayerJoined: function(playerName) {
    this.updatePlayerCount();
    alert(`${playerName} joined the lobby!`);
  },
  onPlayerLeft: function(peerId) {
    this.updatePlayerCount();
  },
  onLobbyStateUpdate: function() {
    this.updatePlayerCount();
  },
  onPlayerListUpdate: function() {
    this.updatePlayerCount();
  },
  onPlayerReady: function(peerId, ready) {},
  onRaceCountdown: function(countdown) {
    alert(`Race starting in ${countdown}...`);
  },
  onRaceStart: function(raceData) {
    // Start the race with the provided data
    if (raceData && raceData.notes) {
      // Initialize game with race data
      G.notes = raceData.notes;
      G.idx = 0;
      G.correct = 0;
      G.crashCount = 0;
      G.dnf = false;
      RALLY_STATE.startTime = Date.now();
      show('game');
      loadNote();
    }
  },
  onPlayerProgress: function(peerId, progress) {
    // Update UI to show opponent progress
    console.log(`Player ${peerId} progress: ${progress}%`);
  },
  onPlayerFinished: function(peerId, time) {
    alert(`Player finished in ${(time/1000).toFixed(2)}s`);
  },
  onRaceComplete: function(results) {
    alert('Race complete! Results: ' + JSON.stringify(results));
  },
  onRematchRequest: function() {
    if (confirm('Opponent wants to rematch. Accept?')) {
      this.confirmRematch();
    }
  },
  onRematchConfirm: function() {
    alert('Rematch accepted!');
  },
  onError: function(err) {
    alert('Multiplayer error: ' + err.message);
  },
  
  // UI Helpers
  showLobbyInfo: function(code, peerId) {
    const existing = document.getElementById('p2p-lobby-info');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.id = 'p2p-lobby-info';
    div.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: var(--paper);
      border: 2px solid var(--red);
      padding: 1rem;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 12px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    div.innerHTML = `
      <div style="margin-bottom: 0.5rem; font-weight: bold; color: var(--red);">
        <i class="bi bi-ethernet"></i> P2P LOBBY
      </div>
      <div style="margin-bottom: 0.25rem;">
        <span style="color: var(--text3);">Code:</span>
        <span style="font-weight: bold; color: var(--gold);">${code}</span>
      </div>
      <div style="margin-bottom: 0.25rem;">
        <span style="color: var(--text3);">Players:</span>
        <span id="p2p-player-count">1</span>
      </div>
      <button onclick="MultiplayerP2P.disconnect()" 
              style="margin-top: 0.5rem; background: var(--red); color: white; border: none; padding: 4px 8px; cursor: pointer;">
        <i class="bi bi-x-lg"></i> Leave
      </button>
    `;
    document.body.appendChild(div);
  },
  
  updatePlayerCount: function() {
    const el = document.getElementById('p2p-player-count');
    if (el) el.textContent = this.players.size + 1; // +1 for self
  }
};
