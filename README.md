# 🎮 Real-Time Multiplayer Tic-Tac-Toe

A modern **real-time multiplayer Tic-Tac-Toe game** built using **Node.js, Express.js, Socket.IO, MongoDB, and Mongoose**.

The application allows two players to create or join a private game room and play Tic-Tac-Toe together in real time. Game actions are synchronized instantly between both players using Socket.IO, while completed matches can be stored and retrieved through MongoDB.

🌐 **Live Demo:** https://tic-tac-toe-30yg.onrender.com/

---

## ✨ Features

### 🎮 Multiplayer Gameplay

* Real-time two-player Tic-Tac-Toe
* Player 1 is automatically assigned **X**
* Player 2 is automatically assigned **O**
* Maximum of two players per room
* Players can create and join rooms using a unique room code

### ⚡ Real-Time Communication

* Built using **Socket.IO**
* Moves are synchronized instantly between players
* Real-time turn updates
* Real-time player status
* Handles player connection and disconnection events

### 🏠 Room System

* Create a new game room
* Automatically generates a unique room code
* Share the room code with another player
* Join an existing room
* Prevents additional players from joining a full room

### 🏆 Game Logic

* Automatic winner detection
* Draw detection
* Turn management
* Move validation
* Total move tracking
* Game-over state
* Play Again functionality

### 💾 Game History

Completed games can be stored using **MongoDB and Mongoose**, including information such as:

* Player X
* Player O
* Winner
* Total moves
* Date and time

### 🔄 Rematch System

After a game ends, players can:

* Play again
* Leave the room
* Wait for the other player to confirm a rematch

### 🎨 User Interface

* Modern and responsive interface
* Player status indicators
* Room code display
* Game result screen
* Interactive Tic-Tac-Toe board
* Responsive design for different screen sizes

---

## 🛠️ Technologies Used

| Technology     | Purpose                               |
| -------------- | ------------------------------------- |
| **HTML5**      | Frontend structure                    |
| **CSS3**       | Styling, layout and responsive design |
| **JavaScript** | Frontend game interaction             |
| **Node.js**    | Backend runtime                       |
| **Express.js** | Web server and backend framework      |
| **Socket.IO**  | Real-time multiplayer communication   |
| **MongoDB**    | Database for game history             |
| **Mongoose**   | MongoDB object modeling               |
| **dotenv**     | Environment variable management       |
| **Render**     | Deployment and hosting                |

---

## 🏗️ How the Application Works

The application follows a **client-server architecture**.

```text
                    ┌─────────────────────┐
                    │      Player 1       │
                    │         X           │
                    └──────────┬──────────┘
                               │
                               │ Socket.IO
                               ▼
                    ┌─────────────────────┐
                    │   Node.js Server    │
                    │     + Express       │
                    │     + Socket.IO     │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              Game State             MongoDB
              Management            Game History
                    │
                    │ Socket.IO
                    ▼
                    ┌─────────────────────┐
                    │      Player 2       │
                    │         O           │
                    └─────────────────────┘
```

### Game Flow

```text
Player 1
   ↓
Creates Room
   ↓
Unique Room Code Generated
   ↓
Player 2
   ↓
Joins Room
   ↓
Server Assigns X and O
   ↓
Game Starts
   ↓
Players Make Moves
   ↓
Socket.IO Synchronizes Moves
   ↓
Winner / Draw Detected
   ↓
Game Result Saved
   ↓
Play Again / Leave Room
```

---

## 🔌 Socket.IO Communication

Socket.IO is used to provide real-time communication between the frontend and backend.

Important events include:

```text
user-login
     ↓
login-success / login-error
     ↓
players-update
     ↓
game-start
     ↓
make-move
     ↓
move-made
     ↓
game-over
     ↓
reset-game
     ↓
game-reset
```

This allows both players to see game updates without manually refreshing the page.

---

## 🗄️ Database

The project uses **MongoDB** with **Mongoose** for storing game history.

A completed game can contain information such as:

```text
Player X
Player O
Winner
Total Moves
Date / Time
```

MongoDB can be hosted locally or through **MongoDB Atlas**.

---

## 📁 Project Structure

```text
tic-tac-toe/
│
├── Assignment 5.txt
│
└── JUI_TAWDE/
    │
    ├── backend/
    │   ├── server.js
    │   ├── package.json
    │   ├── package-lock.json
    │   ├── models/
    │   └── ...
    │
    └── frontend/
        ├── index.html
        ├── style.css
        ├── script.js
        └── ...
```

> The exact files and folders may vary depending on the final project structure.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* MongoDB / MongoDB Atlas
* Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/juitawde/tic-tac-toe.git
```

Navigate into the project:

```bash
cd tic-tac-toe
```

---

### 2. Navigate to the Project

```bash
cd JUI_TAWDE
```

Install the required dependencies:

```bash
npm install
```

---

### 3. Configure Environment Variables

Create a `.env` file in the backend/project directory.

Example:

```env
MONGO_URI=your_mongodb_connection_string
PORT=3000
```

Replace the MongoDB connection string with your own MongoDB Atlas URI.

⚠️ **Do not upload your `.env` file to GitHub.**

Add this to `.gitignore`:

```text
.env
node_modules/
```

---

### 4. Start the Server

```bash
npm start
```

Or, if your project uses a development script:

```bash
npm run dev
```

The application should then be available locally at:

```text
http://localhost:3000
```

---

## 🌐 Live Deployment

The application is deployed using **Render**.

### Live Application

**https://tic-tac-toe-30yg.onrender.com/**

The deployed application provides:

* Room creation
* Room joining
* Real-time multiplayer gameplay
* Socket.IO communication
* Game state synchronization
* Winner detection
* Rematch functionality
* MongoDB/Mongoose integration

---

## 🧪 Testing Multiplayer Mode

To test the real-time functionality:

### Player 1

1. Open the game.
2. Enter your name.
3. Select **Create Room**.
4. Start the game.
5. Copy the generated room code.

### Player 2

1. Open the game in another browser or incognito window.
2. Enter Player 2's name.
3. Enter the room code.
4. Select **Join Room**.

The two players should now be connected to the same game.

### Test Real-Time Communication

Make a move as Player 1.

The move should immediately appear on Player 2's screen.

Then Player 2 can make a move and Player 1 should receive the update instantly.

---

## 📸 Screenshots

Add screenshots of the application here.

1. Home / Create Room screen
<img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/db7142b1-29ea-4fb0-a39f-f4b2669449b2" />

3. Join Room screen
  <img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/2be87497-a351-447b-8559-24f7f02de7fd" />

5. Waiting for Player 2
  <img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/cb351a0b-44d7-4aae-87b7-2658db7db3d0" />

7. Active multiplayer game
<img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/777a4659-8219-4c90-a2c3-5955e1a81aba" />

9. Winner / Game Over screen
<img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/59e8503b-a34c-4d44-83dc-6cb734247389" />

11. Match History
<img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/26795066-9cc7-4ac6-8342-40687cfe35b2" />

---

## 🧠 Learning Outcomes

This project helped demonstrate practical understanding of:

* Node.js backend development
* Express.js server setup
* Socket.IO and WebSocket-style communication
* Real-time event handling
* Client-server communication
* Multiplayer game-state management
* Room-based communication
* JavaScript DOM manipulation
* Game logic and winner detection
* MongoDB database integration
* Mongoose schemas and models
* Environment variables
* Error handling
* Deployment using Render
* Frontend-backend integration

---

## 🔮 Future Improvements

Possible future enhancements include:

* 🤖 Single-player mode with AI
* 🧠 Multiple AI difficulty levels
* 👥 Spectator mode
* 💬 In-game chat
* 🏆 Global leaderboard
* 👤 Player profiles
* 🔐 User authentication
* 📊 Detailed player statistics
* 🔊 Sound effects
* ✨ Advanced game animations
* 📱 Progressive Web App support

---

## ⚠️ Important

This project was developed as part of a **Real-Time Tic-Tac-Toe / Socket Programming assignment**.

The implementation demonstrates the concepts required by the assignment while adding a customized user interface and multiplayer experience.

---

## 👩‍💻 Author

### Jui Tawde

**B.Tech Computer Science Engineering**

---

## ⭐ Project Highlights

```text
🎮 Real-Time Multiplayer
⚡ Socket.IO Communication
🏠 Multi-Room Gameplay
❌ Player X
⭕ Player O
🏆 Winner Detection
🔄 Play Again System
💾 MongoDB Game History
🌐 Render Deployment
📱 Responsive UI
```

---

### 🎯 Live Demo

**Play the game:**
https://tic-tac-toe-30yg.onrender.com/

Have fun! 🎮✨
