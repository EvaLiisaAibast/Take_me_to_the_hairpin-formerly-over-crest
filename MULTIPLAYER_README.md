# Rally Pacenote Academy - Multiplayer Setup

## Overview
The game uses a **hybrid multiplayer architecture**:
- **Node.js/Bun Backend** (`server.js`): Handles accounts, authentication, leaderboards, and career persistence
- **PeerJS P2P** (`multiplayer-p2p.js`): Handles real-time race synchronization via direct peer-to-peer connections

Players can create lobbies, join with a code, and race against each other on the same stage notes with low-latency P2P sync.

## Server Setup (Node.js/Bun Backend)

### Prerequisites
- Node.js 16+ or Bun installed
- npm (comes with Node.js) or bun

### Installation

1. Navigate to the game directory:
```bash
cd "Take_me_to_the_hairpin-formerly-over-crest-game"
```

2. Install dependencies:
```bash
npm install
# or with bun:
bun install
```

3. Start the server:
```bash
npm start
# or with bun:
bun run server.js
```

The server will start on port 3000 by default.

### Development Mode (with auto-reload)
```bash
npm run dev
```

## Playing Multiplayer

1. Open the game in your browser (file:// or localhost)
2. Click the **Multiplayer** button in the main menu (it has a 👥 icon)
3. Enter your name when prompted
4. Choose one of the following:
   - **Leave blank** and click OK to **create a new lobby** (shows a 6-character code)
   - **Enter a lobby code** to join an existing lobby
5. Share the lobby code with friends to let them join
6. Race! You'll see other players' progress in real-time via P2P connection
7. Results are sent to the backend for leaderboards

## Features

### Lobby System (P2P)
- Create private lobbies with automatic 6-character codes
- Join lobbies using the code
- Direct peer-to-peer connection for low-latency racing
- No server required for live race sync

### Synchronized Racing (P2P)
- All players get the **same stage notes** for fair competition
- Real-time progress tracking via WebRTC
- Live notifications when players finish
- Automatic ranking at the end of the race

### Backend Services (Node.js/Bun)
- User accounts and authentication
- Leaderboards and high scores
- Career progress persistence
- Race result validation and storage

## Architecture

### Server (`server.js`)
- Express web server for serving the game client
- Socket.IO for backend communication (accounts, leaderboards)
- User authentication and session management
- Leaderboard storage and retrieval
- Career progress persistence

### P2P Layer (`multiplayer-p2p.js`)
- PeerJS for WebRTC peer-to-peer connections
- Lobby code generation and management
- Direct peer connection establishment
- Real-time race state synchronization
- Progress reporting during races

### Client (`rally.js`)
- Socket.IO client for backend communication
- PeerJS client for P2P race sync
- Lobby UI and management
- Race state synchronization
- Progress reporting during races
- Result display and leaderboard updates

## Technical Details

### P2P (PeerJS) Events

#### Peer → Peer
- `player-info` - Player joins and sends info
- `lobby-state` - Host sends current lobby state
- `player-list` - Host sends updated player list
- `player-ready` - Player toggles ready status
- `race-start` - Host starts the race with note data
- `player-progress` - Progress update during race
- `player-finished` - Player completed the race
- `rematch-request` - Request to race again
- `rematch-confirm` - Accept rematch request

### Backend (Socket.IO) Events

#### Client → Server
- `submit-race-result` - Submit race completion for leaderboard
- `get-leaderboard` - Request leaderboard data
- `save-progress` - Save career progress

#### Server → Client
- `leaderboard-data` - Leaderboard rankings
- `progress-saved` - Career progress confirmation

## Customization

### Change Backend Server URL
Edit the `connect()` call in `rally.js`:
```javascript
Multiplayer.connect('http://your-server-url:3000');
```

### Change Backend Port
Set the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### Self-Host PeerJS Signaling (Optional)
By default, PeerJS uses their free public signaling server. For production, you can run your own:
```javascript
// In multiplayer-p2p.js
this.peer = new Peer(null, {
  debug: 2,
  host: 'your-signaling-server.com',
  port: 9000,
  path: '/peerjs'
});
```

## Troubleshooting

### Cannot connect to backend server
- Ensure the server is running (`npm start`)
- Check firewall settings for port 3000
- Verify the server URL in the client code

### P2P connection fails
- Some networks may block P2P connections (NAT traversal issues)
- Try with players on different networks to test
- Consider adding a TURN server for better NAT traversal

### Socket.IO not loading
- Check internet connection (Socket.IO is loaded from CDN)
- Or download `socket.io.min.js` and reference it locally

### PeerJS not loading
- Check internet connection (PeerJS is loaded from CDN)
- Or download `peerjs.min.js` and reference it locally

### Players not seeing each other
- Ensure all players are using the same lobby code
- Check browser console for WebRTC errors
- Try refreshing and rejoining the lobby

## Notes
- **Hybrid architecture**: Backend handles persistent data, P2P handles live race sync
- P2P uses synchronized stage notes - all players see the same sequence
- Progress updates are sent via direct peer connection for low latency
- Race results are sent to backend for leaderboards and validation
- DNF (Did Not Finish) players are ranked below finishers
- The free PeerJS signaling server is suitable for development; consider self-hosting for production
