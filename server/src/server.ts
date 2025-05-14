import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Room, User, Card, RoomState } from './types';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { RoomService } from './services/RoomService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/retro-board';

// Подключение к MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

const app = express();
const httpServer = createServer(app);

// Настраиваем CORS для Express с учетом Vercel
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://sorryangelina.vercel.app', 'https://sorryangelina-git-main-borisgadaborshevs-projects.vercel.app']
    : "http://localhost:3000",
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Serve static files from the React app
const clientBuildPath = path.join(__dirname, '../../../client/build');
console.log('Client build path:', clientBuildPath);
app.use(express.static(clientBuildPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: connectionCount,
    uptime: process.uptime()
  });
});

// Clear database endpoint
app.post('/api/clear-database', async (req, res) => {
  try {
    await RoomService.clearDatabase();
    res.json({ message: 'Database cleared successfully' });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// Get available rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await RoomService.getAllRooms();
    res.json(rooms.map(room => ({
      id: room.id,
      usersCount: room.users.length,
      phase: room.phase
    })));
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// Настраиваем Socket.IO с учетом Vercel
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? "https://sorryangelina.vercel.app"
      : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  path: "/socket.io/",
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  upgradeTimeout: 10000,
  allowEIO3: true
});

// Add connection error handling
io.engine.on("connection_error", (err) => {
  console.log('Connection error:', err);
});

const rooms = new Map<string, Room>();
const roomStates = new Map<string, RoomState>();

// Helper function to get sorted cards by votes
const getSortedCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => ((b.likes?.length || 0) - (b.dislikes?.length || 0)) - ((a.likes?.length || 0) - (a.dislikes?.length || 0)));
};

// Connection monitoring
let connectionCount = 0;

io.on('connection', (socket) => {
  connectionCount++;
  console.log(`Client connected (${connectionCount} total):`, socket.id);
  console.log('Connection details:', {
    transport: socket.conn.transport.name,
    remoteAddress: socket.handshake.address,
    timestamp: new Date().toISOString()
  });
  
  let currentUser: User | null = null;

  socket.on('restore-session', async ({ roomId, userId }) => {
    console.log('Attempting to restore session:', { roomId, userId });
    
    try {
      const { room, user } = await RoomService.restoreSession(roomId, userId, socket.id);
      
      if (!room || !user) {
        console.log('Failed to restore session:', { roomId, userId });
        socket.emit('session-expired');
        return;
      }

      socket.join(roomId);
      currentUser = user;
      
      console.log('Session restored successfully:', { roomId, userId });
      socket.emit('room-joined', { 
        room, 
        state: { 
          cards: room.cards, 
          phase: room.phase, 
          users: room.users 
        } 
      });
    } catch (error) {
      console.error('Error restoring session:', error);
      socket.emit('session-expired');
    }
  });

  socket.on('create-room', async ({ roomId, password, username }) => {
    console.log('Attempting to create room:', { roomId, username });
    
    try {
      const existingRoom = await RoomService.getRoom(roomId);
      if (existingRoom) {
        console.log('Room already exists:', roomId);
        socket.emit('error', 'Room already exists');
        return;
      }

      const room = await RoomService.createRoom(roomId, password, socket.id, username);
      socket.join(roomId);
      currentUser = { 
        id: socket.id, 
        name: username, 
        roomId,
        role: 'admin'
      };
      
      console.log('Room created successfully:', roomId);
      socket.emit('room-joined', { 
        room, 
        state: { 
          cards: room.cards, 
          phase: room.phase, 
          users: room.users 
        },
        userId: socket.id
      });
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', 'Failed to create room');
    }
  });

  socket.on('join-room', async ({ roomId, password, username }) => {
    console.log('Attempting to join room:', { roomId, username });
    
    try {
      const isValid = await RoomService.validatePassword(roomId, password);
      if (!isValid) {
        console.log('Invalid password for room:', roomId);
        socket.emit('error', 'Invalid password');
        return;
      }

      // Check for existing user first
      const existingUser = await RoomService.findExistingUser(roomId, username);
      const user: User = {
        id: socket.id,
        name: username,
        roomId,
        role: 'user'
      };

      // If user exists, we'll reuse their original ID for card ownership
      if (existingUser) {
        console.log('User rejoining room:', { roomId, username });
        user.id = existingUser.id;
      }

      const room = await RoomService.addUser(roomId, user);
      
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      socket.join(roomId);
      currentUser = user;
      
      console.log('User joined room successfully:', { roomId, username, isRejoin: !!existingUser });
      socket.emit('room-joined', { 
        room, 
        state: { 
          cards: room.cards, 
          phase: room.phase, 
          users: room.users 
        },
        userId: user.id
      });
      socket.to(roomId).emit('user-joined', user);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });

  socket.on('add-card', async ({ text, type, column }) => {
    if (!currentUser) return;

    try {
      const room = await RoomService.getRoom(currentUser.roomId);
      if (!room || room.phase !== 'creation') return;

      const card: Card = {
        id: Date.now().toString(),
        text,
        type,
        createdBy: currentUser.name,
        likes: [],
        dislikes: [],
        column
      };

      const updatedRoom = await RoomService.addCard(currentUser.roomId, card);
      if (updatedRoom) {
        // Обновляем состояние в памяти
        const roomState = roomStates.get(currentUser.roomId);
        if (roomState) {
          roomState.cards.push(card);
        }
        rooms.set(currentUser.roomId, updatedRoom);
        
        // Отправляем обновление всем клиентам в комнате
        io.to(currentUser.roomId).emit('card-added', card);
        io.to(currentUser.roomId).emit('state-updated', {
          cards: updatedRoom.cards,
          phase: updatedRoom.phase,
          users: updatedRoom.users
        });
      }
    } catch (error) {
      console.error('Error adding card:', error);
      socket.emit('error', 'Failed to add card');
    }
  });

  socket.on('update-card', async ({ cardId, text }) => {
    if (!currentUser) return;

    try {
      const room = await RoomService.getRoom(currentUser.roomId);
      if (!room || room.phase !== 'creation') return;

      const card = room.cards.find(c => c.id === cardId);
      if (!card || card.createdBy !== currentUser.name) return;

      const updatedRoom = await RoomService.updateCard(currentUser.roomId, cardId, { text });
      if (updatedRoom) {
        io.to(currentUser.roomId).emit('card-updated', { cardId, text });
        io.to(currentUser.roomId).emit('state-updated', {
          cards: updatedRoom.cards,
          phase: updatedRoom.phase,
          users: updatedRoom.users
        });
      }
    } catch (error) {
      console.error('Error updating card:', error);
      socket.emit('error', 'Failed to update card');
    }
  });

  socket.on('delete-card', async ({ cardId }) => {
    if (!currentUser) return;

    try {
      const room = await RoomService.getRoom(currentUser.roomId);
      if (!room || room.phase !== 'creation') return;

      const card = room.cards.find(c => c.id === cardId);
      if (!card || card.createdBy !== currentUser.name) return;

      const updatedRoom = await RoomService.deleteCard(currentUser.roomId, cardId);
      if (updatedRoom) {
        io.to(currentUser.roomId).emit('card-deleted', cardId);
        io.to(currentUser.roomId).emit('state-updated', {
          cards: updatedRoom.cards,
          phase: updatedRoom.phase,
          users: updatedRoom.users
        });
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      socket.emit('error', 'Failed to delete card');
    }
  });

  socket.on('move-card', ({ cardId, column }) => {
    if (!currentUser) return;

    const roomState = roomStates.get(currentUser.roomId);
    if (!roomState) return;

    const card = roomState.cards.find(c => c.id === cardId);
    if (!card) return;

    card.column = column;
    io.to(currentUser.roomId).emit('card-moved', { cardId, column });
  });

  socket.on('vote-card', async ({ cardId, voteType }) => {
    if (!currentUser) return;

    try {
      const room = await RoomService.getRoom(currentUser.roomId);
      if (!room || room.phase !== 'voting') return;

      const card = room.cards.find(c => c.id === cardId);
      if (!card) return;

      const updatedRoom = await RoomService.updateCardVotes(currentUser.roomId, cardId, currentUser.id, voteType);
      if (updatedRoom) {
        const updatedCard = updatedRoom.cards.find(c => c.id === cardId);
        if (updatedCard) {
          io.to(currentUser.roomId).emit('card-voted', { 
            cardId, 
            likes: updatedCard.likes,
            dislikes: updatedCard.dislikes
          });
          io.to(currentUser.roomId).emit('state-updated', {
            cards: updatedRoom.cards,
            phase: updatedRoom.phase,
            users: updatedRoom.users
          });
        }
      }
    } catch (error) {
      console.error('Error voting for card:', error);
      socket.emit('error', 'Failed to vote for card');
    }
  });

  socket.on('update-ready-state', async ({ isReady }) => {
    if (!currentUser?.roomId) return;

    console.log('Received ready state update:', {
      userId: currentUser.id,
      userName: currentUser.name,
      isReady
    });

    try {
      const room = await RoomService.updateUserReadyState(currentUser.roomId, currentUser.id, isReady);
      if (room) {
        io.to(currentUser.roomId).emit('state-updated', {
          cards: room.cards,
          phase: room.phase,
          users: room.users
        });
      }
    } catch (error) {
      console.error('Error updating ready state:', error);
    }
  });

  socket.on('change-phase', async ({ phase }) => {
    if (!currentUser?.roomId) return;

    console.log('Phase change requested:', {
      userId: currentUser.id,
      userName: currentUser.name,
      phase
    });

    try {
      // Сначала меняем фазу
      const updatedRoom = await RoomService.updatePhase(currentUser.roomId, phase as 'creation' | 'voting' | 'discussion', currentUser.id);
      if (!updatedRoom) {
        socket.emit('error', 'Failed to change phase');
        return;
      }

      // Если фаза обсуждения, сортируем карточки по голосам
      let sortedCards = updatedRoom.cards;
      if (phase === 'discussion') {
        console.log('Sorting cards for discussion phase');
        sortedCards = getSortedCards(updatedRoom.cards);
        console.log('Sorted cards:', sortedCards.map(c => ({
          id: c.id,
          text: c.text,
          likes: c.likes?.length || 0,
          dislikes: c.dislikes?.length || 0,
          score: (c.likes?.length || 0) - (c.dislikes?.length || 0)
        })));
      }

      // После смены фазы сбрасываем состояния готовности всех пользователей
      const roomWithResetStates = await RoomService.resetUsersReadyState(currentUser.roomId);
      if (roomWithResetStates) {
        // Отправляем оба события для обновления UI
        io.to(currentUser.roomId).emit('phase-changed', { 
          phase: roomWithResetStates.phase, 
          cards: sortedCards 
        });
        io.to(currentUser.roomId).emit('state-updated', {
          cards: sortedCards,
          phase: roomWithResetStates.phase,
          users: roomWithResetStates.users
        });
      }
    } catch (error) {
      console.error('Error changing phase:', error);
      socket.emit('error', 'Failed to change phase');
    }
  });

  socket.on('disconnect', async (reason) => {
    connectionCount--;
    console.log(`Client disconnected (${connectionCount} total):`, socket.id);
    console.log('Disconnect reason:', reason);
    
    if (!currentUser) return;

    try {
      const room = await RoomService.getRoom(currentUser.roomId);
      if (!room) return;

      const updatedRoom = await RoomService.removeUser(currentUser.roomId, currentUser.id);
      if (!updatedRoom) return;

      if (updatedRoom.users.length === 0) {
        // If the room is empty, we might want to keep it for some time before deletion
        // For now, we'll keep the room in the database
        console.log('Room is empty:', currentUser.roomId);
      } else {
        socket.to(currentUser.roomId).emit('user-left', currentUser);
        socket.to(currentUser.roomId).emit('state-updated', {
          cards: updatedRoom.cards,
          phase: updatedRoom.phase,
          users: updatedRoom.users
        });
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error for client:', socket.id, error);
  });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  console.log('Serving index.html for path:', req.path);
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 