# 🎮 Real-Time Tic Tac Toe Assignment (Node.js + Express + Socket.io + MongoDB)

**Student Name:** Jui Tawde  
**Assignment:** Real-Time Tic Tac Toe Game  
**Assignment Link:** [itm-real-time-tic-tac-toe-game.netlify.app](https://itm-real-time-tic-tac-toe-game.netlify.app/)

---

## 📌 Project Overview

This project is a **Real-Time Multiplayer Tic Tac Toe Game** built using a clean, modular MVC architecture with **Node.js, Express.js, Socket.io, and MongoDB (Mongoose ODM)**. It features a modern dark neon-glassmorphism interface with live move synchronization, user authentication, turn management, winner detection, celebration animations, and persistent game history storage.

---

## 📁 Modular Directory & File Structure

The project strictly follows clean code principles with separated backend and frontend components:

```
JUI_TAWDE/
├── backend/
│   ├── config/
│   │   └── db.js                    // Database connection & Mongoose ODM setup with graceful fallback
│   ├── controllers/
│   │   ├── gameController.js        // In-memory game state manager & turn mechanics
│   │   └── historyController.js     // Game history DB fetch & save handlers
│   ├── middlewares/
│   │   ├── errorMiddleware.js       // 404 and global error handling middlewares
│   │   └── validationMiddleware.js  // Input validation & string sanitizer middlewares
│   ├── models/
│   │   └── GameHistory.js           // Mongoose ODM Schema for match records
│   ├── routes/
│   │   └── historyRoutes.js         // Express REST API routes for `/api/history`
│   ├── sockets/
│   │   └── gameSocket.js            // Socket.io real-time event router
│   ├── utils/
│   │   └── winnerChecker.js         // Tic-Tac-Toe winning condition evaluator
│   ├── .env                         // Environment configuration (PORT=5000)
│   ├── .env.example                 // Environment template
│   ├── package.json                 // Dependencies (express, socket.io, mongoose, dotenv, cors)
│   └── server.js                    // Main Express server entry point with automatic port fallback
├── frontend/
│   ├── index.html                   // UI (Login modal, 3x3 board grid, player status, winner modal, history drawer)
│   ├── style.css                    // Dark theme neon glassmorphism CSS
│   └── script.js                    // Client-side Socket.io event listeners, UI state manager, and confetti celebrations
├── package.json                     // Root package runner
└── README.md                        // Complete project documentation
```

---

## 🛠️ Tech Stack & Dependencies

- **Runtime & Framework:** Node.js, Express.js (`^4.18.2`)
- **Real-Time WebSockets:** Socket.io (`^4.6.1`)
- **Database Option:** MongoDB (`mongoose ^7.0.3`) - *Stores Player X, Player O, Winner, Total Moves, Played At timestamp*
- **Frontend:** HTML5, CSS3 (Flexbox/Grid, Animations), Vanilla JavaScript (ES6+), FontAwesome Icons, Canvas Confetti

---

## 🔌 Socket.io Events Implementation

| Event Name | Direction | Description |
| :--- | :--- | :--- |
| `user-login` | Client ➔ Server | Client sends requested username |
| `login-success` | Server ➔ Client | Server confirms login and assigns symbol (`X` or `O`) |
| `login-error` | Server ➔ Client | Server rejects login if room is full (2 players) or username is invalid |
| `players-update` | Server ➔ Clients | Server broadcasts list of active players and active count |
| `game-start` | Server ➔ Clients | Server notifies both players when 2 players join to begin match |
| `make-move` | Client ➔ Server | Client sends move payload (`{ index, symbol }`) |
| `move-made` | Server ➔ Clients | Server broadcasts validated board state and next turn |
| `game-over` | Server ➔ Clients | Server announces winner/draw, highlights winning line, and saves record to MongoDB |
| `reset-game` | Client ➔ Server | Client requests room reset |
| `game-reset` | Server ➔ Clients | Server resets board and requires players to re-login |
| `disconnect` | Server ➔ Clients | Server handles client disconnection, cleans player slot, and notifies remaining player |
| `get-history` | Client ➔ Server | Client requests game records saved in MongoDB |

---

## 🗄️ Database Integration (MongoDB & Mongoose)

The application uses **Mongoose ODM** to persist game history records into MongoDB. 

### Mongoose Schema (`models/GameHistory.js`):
```javascript
const gameHistorySchema = new mongoose.Schema({
  playerX: { type: String, required: true },
  playerO: { type: String, required: true },
  winner: { type: String, required: true },
  winningSymbol: { type: String, enum: ['X', 'O', 'Draw'], required: true },
  totalMoves: { type: Number, required: true },
  playedAt: { type: Date, default: Date.now }
});
```

---

## 🚀 Setup & Execution Instructions

### Step 1: Run the Server
Navigate to `JUI_TAWDE/backend`:
```bash
node server.js
```
*Note: Automatic port detection will run the server on port 5000 (or 5001 if 5000 is occupied).*

### Step 2: Open in Browser
Open two browser windows or tabs at:
👉 **`http://localhost:5000`** (or port displayed in terminal output)

1. Enter **Username 1** in Tab 1 (gets **X**).
2. Enter **Username 2** in Tab 2 (gets **O**).
3. Play real-time Tic-Tac-Toe!
