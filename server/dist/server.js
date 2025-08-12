"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const RoomService_1 = require("./services/RoomService");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
dotenv_1.default.config();
// Connect to Postgres
(0, database_1.connectDB)().catch((err) => {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
});
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Настраиваем CORS для Express с учетом Vercel
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://sorryangelina.vercel.app', 'https://sorryangelina-git-main-borisgadaborshevs-projects.vercel.app']
        : "http://localhost:3000",
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express_1.default.json());
// Serve static files from the React app
const clientBuildPath = path_1.default.join(__dirname, '../../../client/build');
console.log('Client build path:', clientBuildPath);
app.use(express_1.default.static(clientBuildPath));
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
app.post('/api/clear-database', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield RoomService_1.RoomService.clearDatabase();
        res.json({ message: 'Database cleared successfully' });
    }
    catch (error) {
        console.error('Error clearing database:', error);
        res.status(500).json({ error: 'Failed to clear database' });
    }
}));
// Get available rooms
app.get('/api/rooms', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rooms = yield RoomService_1.RoomService.getAllRooms();
        res.json(rooms.map(room => ({
            id: room.id,
            usersCount: room.users.length,
            phase: room.phase
        })));
    }
    catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).json({ error: 'Failed to get rooms' });
    }
}));
// Настраиваем Socket.IO с учетом Vercel
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? "https://sorryangelina.vercel.app"
            : "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },
    path: "/socket.io",
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
const rooms = new Map();
const roomStates = new Map();
// Helper function to get sorted cards by votes
const getSortedCards = (cards) => {
    return [...cards].sort((a, b) => { var _a, _b, _c, _d; return ((((_a = b.likes) === null || _a === void 0 ? void 0 : _a.length) || 0) - (((_b = b.dislikes) === null || _b === void 0 ? void 0 : _b.length) || 0)) - ((((_c = a.likes) === null || _c === void 0 ? void 0 : _c.length) || 0) - (((_d = a.dislikes) === null || _d === void 0 ? void 0 : _d.length) || 0)); });
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
    let currentUser = null;
    socket.on('restore-session', ({ roomId, userId }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Attempting to restore session:', { roomId, userId });
        try {
            const { room, user } = yield RoomService_1.RoomService.restoreSession(roomId, userId, socket.id);
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
        }
        catch (error) {
            console.error('Error restoring session:', error);
            socket.emit('session-expired');
        }
    }));
    socket.on('create-room', ({ roomId, password, username }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Attempting to create room:', { roomId, username });
        try {
            const existingRoom = yield RoomService_1.RoomService.getRoom(roomId);
            if (existingRoom) {
                console.log('Room already exists:', roomId);
                socket.emit('error', 'Room already exists');
                return;
            }
            const room = yield RoomService_1.RoomService.createRoom(roomId, password, socket.id, username);
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
        }
        catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', 'Failed to create room');
        }
    }));
    socket.on('join-room', ({ roomId, password, username }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Attempting to join room:', { roomId, username });
        try {
            const isValid = yield RoomService_1.RoomService.validatePassword(roomId, password);
            if (!isValid) {
                console.log('Invalid password for room:', roomId);
                socket.emit('error', 'Invalid password');
                return;
            }
            // Check for existing user first
            const existingUser = yield RoomService_1.RoomService.findExistingUser(roomId, username);
            const user = {
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
            const room = yield RoomService_1.RoomService.addUser(roomId, user);
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
        }
        catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', 'Failed to join room');
        }
    }));
    socket.on('add-card', ({ text, type, column }) => __awaiter(void 0, void 0, void 0, function* () {
        if (!currentUser)
            return;
        try {
            console.log('Received add-card event:', { text, type, column, userId: currentUser.id });
            const room = yield RoomService_1.RoomService.getRoom(currentUser.roomId);
            if (!room || room.phase !== 'creation')
                return;
            const card = {
                id: Date.now().toString(),
                text,
                type,
                createdBy: currentUser.name,
                likes: [],
                dislikes: [],
                column
            };
            const updatedRoom = yield RoomService_1.RoomService.addCard(currentUser.roomId, card);
            if (updatedRoom) {
                // Обновляем состояние в памяти
                const roomState = roomStates.get(currentUser.roomId);
                if (roomState) {
                    roomState.cards.push(card);
                }
                rooms.set(currentUser.roomId, updatedRoom);
                // Отправляем обновление всем клиентам в комнате
                console.log('Broadcasting card-added to room:', currentUser.roomId);
                io.to(currentUser.roomId).emit('card-added', card);
                io.to(currentUser.roomId).emit('state-updated', {
                    cards: updatedRoom.cards,
                    phase: updatedRoom.phase,
                    users: updatedRoom.users
                });
            }
        }
        catch (error) {
            console.error('Error adding card:', error);
            socket.emit('error', 'Failed to add card');
        }
    }));
    socket.on('update-card', ({ cardId, text }) => __awaiter(void 0, void 0, void 0, function* () {
        if (!currentUser)
            return;
        try {
            const room = yield RoomService_1.RoomService.getRoom(currentUser.roomId);
            if (!room || room.phase !== 'creation')
                return;
            const card = room.cards.find(c => c.id === cardId);
            if (!card || card.createdBy !== currentUser.name)
                return;
            const updatedRoom = yield RoomService_1.RoomService.updateCard(currentUser.roomId, cardId, { text });
            if (updatedRoom) {
                io.to(currentUser.roomId).emit('card-updated', { cardId, text });
                io.to(currentUser.roomId).emit('state-updated', {
                    cards: updatedRoom.cards,
                    phase: updatedRoom.phase,
                    users: updatedRoom.users
                });
            }
        }
        catch (error) {
            console.error('Error updating card:', error);
            socket.emit('error', 'Failed to update card');
        }
    }));
    socket.on('delete-card', ({ cardId }) => __awaiter(void 0, void 0, void 0, function* () {
        if (!currentUser)
            return;
        try {
            const room = yield RoomService_1.RoomService.getRoom(currentUser.roomId);
            if (!room || room.phase !== 'creation')
                return;
            const card = room.cards.find(c => c.id === cardId);
            if (!card || card.createdBy !== currentUser.name)
                return;
            const updatedRoom = yield RoomService_1.RoomService.deleteCard(currentUser.roomId, cardId);
            if (updatedRoom) {
                io.to(currentUser.roomId).emit('card-deleted', cardId);
                io.to(currentUser.roomId).emit('state-updated', {
                    cards: updatedRoom.cards,
                    phase: updatedRoom.phase,
                    users: updatedRoom.users
                });
            }
        }
        catch (error) {
            console.error('Error deleting card:', error);
            socket.emit('error', 'Failed to delete card');
        }
    }));
    socket.on('move-card', ({ cardId, column }) => {
        if (!currentUser)
            return;
        const roomState = roomStates.get(currentUser.roomId);
        if (!roomState)
            return;
        const card = roomState.cards.find(c => c.id === cardId);
        if (!card)
            return;
        card.column = column;
        io.to(currentUser.roomId).emit('card-moved', { cardId, column });
    });
    socket.on('vote-card', ({ cardId, voteType }) => __awaiter(void 0, void 0, void 0, function* () {
        if (!currentUser)
            return;
        try {
            const room = yield RoomService_1.RoomService.getRoom(currentUser.roomId);
            if (!room || room.phase !== 'voting')
                return;
            const card = room.cards.find(c => c.id === cardId);
            if (!card)
                return;
            const updatedRoom = yield RoomService_1.RoomService.updateCardVotes(currentUser.roomId, cardId, currentUser.id, voteType);
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
        }
        catch (error) {
            console.error('Error voting for card:', error);
            socket.emit('error', 'Failed to vote for card');
        }
    }));
    socket.on('update-ready-state', ({ isReady }) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(currentUser === null || currentUser === void 0 ? void 0 : currentUser.roomId))
            return;
        console.log('Received ready state update:', {
            userId: currentUser.id,
            userName: currentUser.name,
            isReady
        });
        try {
            const room = yield RoomService_1.RoomService.updateUserReadyState(currentUser.roomId, currentUser.id, isReady);
            if (room) {
                io.to(currentUser.roomId).emit('state-updated', {
                    cards: room.cards,
                    phase: room.phase,
                    users: room.users
                });
            }
        }
        catch (error) {
            console.error('Error updating ready state:', error);
        }
    }));
    socket.on('change-phase', ({ phase }) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(currentUser === null || currentUser === void 0 ? void 0 : currentUser.roomId))
            return;
        console.log('Phase change requested:', {
            userId: currentUser.id,
            userName: currentUser.name,
            phase
        });
        try {
            // Сначала меняем фазу
            const updatedRoom = yield RoomService_1.RoomService.updatePhase(currentUser.roomId, phase, currentUser.id);
            if (!updatedRoom) {
                socket.emit('error', 'Failed to change phase');
                return;
            }
            // Если фаза обсуждения, сортируем карточки по голосам
            let sortedCards = updatedRoom.cards;
            if (phase === 'discussion') {
                console.log('Sorting cards for discussion phase');
                sortedCards = getSortedCards(updatedRoom.cards);
                console.log('Sorted cards:', sortedCards.map(c => {
                    var _a, _b, _c, _d;
                    return ({
                        id: c.id,
                        text: c.text,
                        likes: ((_a = c.likes) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        dislikes: ((_b = c.dislikes) === null || _b === void 0 ? void 0 : _b.length) || 0,
                        score: (((_c = c.likes) === null || _c === void 0 ? void 0 : _c.length) || 0) - (((_d = c.dislikes) === null || _d === void 0 ? void 0 : _d.length) || 0)
                    });
                }));
            }
            // После смены фазы сбрасываем состояния готовности всех пользователей
            const roomWithResetStates = yield RoomService_1.RoomService.resetUsersReadyState(currentUser.roomId);
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
        }
        catch (error) {
            console.error('Error changing phase:', error);
            socket.emit('error', 'Failed to change phase');
        }
    }));
    socket.on('disconnect', (reason) => __awaiter(void 0, void 0, void 0, function* () {
        connectionCount--;
        console.log(`Client disconnected (${connectionCount} total):`, socket.id);
        console.log('Disconnect reason:', reason);
        if (!currentUser)
            return;
        try {
            const room = yield RoomService_1.RoomService.getRoom(currentUser.roomId);
            if (!room)
                return;
            const updatedRoom = yield RoomService_1.RoomService.removeUser(currentUser.roomId, currentUser.id);
            if (!updatedRoom)
                return;
            if (updatedRoom.users.length === 0) {
                // If the room is empty, we might want to keep it for some time before deletion
                // For now, we'll keep the room in the database
                console.log('Room is empty:', currentUser.roomId);
            }
            else {
                socket.to(currentUser.roomId).emit('user-left', currentUser);
                socket.to(currentUser.roomId).emit('state-updated', {
                    cards: updatedRoom.cards,
                    phase: updatedRoom.phase,
                    users: updatedRoom.users
                });
            }
        }
        catch (error) {
            console.error('Error handling disconnect:', error);
        }
    }));
    socket.on('error', (error) => {
        console.error('Socket error for client:', socket.id, error);
    });
});
// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    console.log('Serving index.html for path:', req.path);
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
