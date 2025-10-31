const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity. For production, you'd restrict this.
    methods: ["GET", "POST"]
  }
});

const rooms = {}; // In-memory store for rooms

// Game Constants (mirrored from frontend)
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const VERTICAL_PADDLE_WIDTH = 15;
const VERTICAL_PADDLE_HEIGHT = 100;
const HORIZONTAL_PADDLE_WIDTH = 100;
const HORIZONTAL_PADDLE_HEIGHT = 15;
const PADDLE_MARGIN_X = 20;
const PADDLE_MARGIN_Y = 20;
const BALL_RADIUS = 10;
const MAX_PLAYERS = 4;

const createInitialGameState = () => ({
  ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, dx: 0, dy: 0, radius: BALL_RADIUS },
  paddles: {},
  scores: {},
  status: 'waiting',
  winner: null,
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', (hostId) => {
    let roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    // Ensure room code is unique
    while (rooms[roomCode]) {
      roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    }
    
    rooms[roomCode] = {
      id: roomCode,
      hostId: socket.id, // Use socket.id for the host
      players: [],
      gameState: createInitialGameState(),
      playerInputs: {},
    };
    
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
    console.log(`Room created: ${roomCode} by host ${socket.id}`);
  });

  socket.on('joinRoom', ({ roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (!room) {
      return socket.emit('error', 'Room not found.');
    }
    if (room.players.length >= MAX_PLAYERS) {
      return socket.emit('error', 'Room is full.');
    }

    socket.join(roomCode);

    const newPlayer = { id: playerId, name: `Player ${room.players.length + 1}`, socketId: socket.id };
    room.players.push(newPlayer);
    
    // Initialize player state
    const playerIndex = room.players.length - 1;
    const { paddles, scores } = room.gameState;
    switch (playerIndex) {
        case 0: // P1 Left
            paddles[playerId] = { x: PADDLE_MARGIN_X, y: GAME_HEIGHT / 2 - VERTICAL_PADDLE_HEIGHT / 2, width: VERTICAL_PADDLE_WIDTH, height: VERTICAL_PADDLE_HEIGHT }; break;
        case 1: // P2 Right
            paddles[playerId] = { x: GAME_WIDTH - VERTICAL_PADDLE_WIDTH - PADDLE_MARGIN_X, y: GAME_HEIGHT / 2 - VERTICAL_PADDLE_HEIGHT / 2, width: VERTICAL_PADDLE_WIDTH, height: VERTICAL_PADDLE_HEIGHT }; break;
        case 2: // P3 Top
            paddles[playerId] = { x: GAME_WIDTH / 2 - HORIZONTAL_PADDLE_WIDTH / 2, y: PADDLE_MARGIN_Y, width: HORIZONTAL_PADDLE_WIDTH, height: HORIZONTAL_PADDLE_HEIGHT }; break;
        case 3: // P4 Bottom
            paddles[playerId] = { x: GAME_WIDTH / 2 - HORIZONTAL_PADDLE_WIDTH / 2, y: GAME_HEIGHT - HORIZONTAL_PADDLE_HEIGHT - PADDLE_MARGIN_Y, width: HORIZONTAL_PADDLE_WIDTH, height: HORIZONTAL_PADDLE_HEIGHT }; break;
    }
    scores[playerId] = 0;

    // Notify player they joined successfully
    socket.emit('joinSuccess', { playerId, players: room.players, gameState: room.gameState });
    // Notify everyone in the room (including host) about the new player list
    io.to(roomCode).emit('playerListUpdate', room.players);
    console.log(`Player ${playerId} joined room ${roomCode}`);
  });

  socket.on('input', ({ roomCode, playerId, direction, action }) => {
      const room = rooms[roomCode];
      if (room) {
          io.to(room.hostId).emit('playerInput', { playerId, direction, action });
      }
  });

  socket.on('gameStateUpdate', ({ roomCode, gameState }) => {
      // Broadcast state from host to all players in the room
      socket.to(roomCode).emit('gameStateUpdate', gameState);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

      if (socket.id === room.hostId) {
        console.log(`Host of room ${roomCode} disconnected. Closing room.`);
        io.to(roomCode).emit('error', 'Host disconnected. Game over.');
        delete rooms[roomCode];
        break;
      }

      if (playerIndex > -1) {
        const leavingPlayer = room.players[playerIndex];
        console.log(`Player ${leavingPlayer.id} left room ${roomCode}`);
        
        // Clean up game state for the leaving player
        delete room.gameState.paddles[leavingPlayer.id];
        delete room.gameState.scores[leavingPlayer.id];

        room.players.splice(playerIndex, 1);
        io.to(roomCode).emit('playerListUpdate', room.players);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
