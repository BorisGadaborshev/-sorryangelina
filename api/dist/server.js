"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./src/config/database");
const RoomService_1 = require("./src/services/RoomService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://sorryangelina.vercel.app', 'https://sorryangelina-git-main-borisgadaborshevs-projects.vercel.app']
        : 'http://localhost:3000',
    credentials: true
}));
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? ['https://sorryangelina.vercel.app', 'https://sorryangelina-git-main-borisgadaborshevs-projects.vercel.app']
            : 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    addTrailingSlash: false
});
(0, database_1.connectDB)().catch(console.error);
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('create-room', async ({ roomId, password, username }) => {
        console.log('Attempting to create room:', { roomId, username, socketId: socket.id });
        try {
            const existingRoom = await RoomService_1.RoomService.getRoom(roomId);
            if (existingRoom) {
                console.log('Room already exists:', roomId);
                socket.emit('error', 'Room with this ID already exists');
                return;
            }
            const room = await RoomService_1.RoomService.createRoom(roomId, password, socket.id, username);
            if (!room) {
                console.log('Failed to create room - room is null');
                socket.emit('error', 'Failed to create room');
                return;
            }
            await socket.join(roomId);
            console.log('Room created and joined successfully:', { roomId, username });
            socket.emit('room-joined', {
                room,
                userId: socket.id,
                state: {
                    cards: room.cards,
                    phase: room.phase,
                    users: room.users
                }
            });
        }
        catch (error) {
            console.error('Error in create-room handler:', error);
            socket.emit('error', error instanceof Error ? error.message : 'Failed to create room');
        }
    });
    socket.on('join-room', async ({ roomId, password, username }) => {
        console.log('Attempting to join room:', { roomId, username, socketId: socket.id });
        try {
            const room = await RoomService_1.RoomService.getRoom(roomId);
            if (!room) {
                console.log('Room not found:', roomId);
                socket.emit('error', 'Room not found');
                return;
            }
            const isValidPassword = await RoomService_1.RoomService.validatePassword(roomId, password);
            if (!isValidPassword) {
                console.log('Invalid password for room:', roomId);
                socket.emit('error', 'Invalid password');
                return;
            }
            const updatedRoom = await RoomService_1.RoomService.addUser(roomId, {
                id: socket.id,
                name: username,
                roomId,
                role: 'user',
                isReady: false
            });
            if (!updatedRoom) {
                console.log('Failed to add user to room');
                socket.emit('error', 'Failed to join room');
                return;
            }
            await socket.join(roomId);
            console.log('Room joined successfully:', { roomId, username });
            socket.emit('room-joined', {
                room: updatedRoom,
                userId: socket.id,
                state: {
                    cards: updatedRoom.cards,
                    phase: updatedRoom.phase,
                    users: updatedRoom.users
                }
            });
            socket.to(roomId).emit('user-joined', updatedRoom.users.find(u => u.id === socket.id));
        }
        catch (error) {
            console.error('Error in join-room handler:', error);
            socket.emit('error', error instanceof Error ? error.message : 'Failed to join room');
        }
    });
    socket.on('update-ready-state', async ({ isReady }) => {
        try {
            const roomId = Array.from(socket.rooms).find((r) => r !== socket.id);
            if (!roomId)
                return;
            const room = await RoomService_1.RoomService.updateUserReadyState(roomId, socket.id, isReady);
            if (room) {
                io.to(roomId).emit('state-updated', {
                    cards: room.cards,
                    phase: room.phase,
                    users: room.users
                });
            }
        }
        catch (error) {
            console.error('Error in update-ready-state:', error);
        }
    });
    socket.on('change-phase', async ({ phase }) => {
        try {
            const roomId = Array.from(socket.rooms).find((r) => r !== socket.id);
            if (!roomId)
                return;
            const updatedRoom = await RoomService_1.RoomService.updatePhase(roomId, phase, socket.id);
            if (!updatedRoom) {
                socket.emit('error', 'Failed to change phase');
                return;
            }
            let sortedCards = updatedRoom.cards;
            if (phase === 'discussion') {
                sortedCards = [...updatedRoom.cards].sort((a, b) => { var _a, _b, _c, _d; return ((((_a = b.likes) === null || _a === void 0 ? void 0 : _a.length) || 0) - (((_b = b.dislikes) === null || _b === void 0 ? void 0 : _b.length) || 0)) - ((((_c = a.likes) === null || _c === void 0 ? void 0 : _c.length) || 0) - (((_d = a.dislikes) === null || _d === void 0 ? void 0 : _d.length) || 0)); });
            }
            const roomWithReset = await RoomService_1.RoomService.resetUsersReadyState(roomId);
            if (roomWithReset) {
                io.to(roomId).emit('phase-changed', { phase: roomWithReset.phase, cards: sortedCards });
                io.to(roomId).emit('state-updated', {
                    cards: sortedCards,
                    phase: roomWithReset.phase,
                    users: roomWithReset.users
                });
            }
        }
        catch (error) {
            console.error('Error in change-phase:', error);
            socket.emit('error', 'Failed to change phase');
        }
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
async function handler(req, res) {
    try {
        const { pathname, search } = new URL(req.url, 'http://localhost');
        if (req.method === 'GET' && (pathname === '/api/health' || pathname === '/health')) {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
            return;
        }
        if (req.method === 'GET' && pathname === '/api/rooms') {
            try {
                const rooms = await RoomService_1.RoomService.getAllRooms();
                res.json(rooms.map((r) => ({ id: r.id, usersCount: r.users.length, phase: r.phase })));
            }
            catch (e) {
                console.error('Error getting rooms (serverless):', e);
                res.status(500).json({ error: 'Failed to get rooms' });
            }
            return;
        }
        const isSocketPath = pathname === '/socket.io' ||
            (pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/socket.io/')) ||
            pathname === '/api/server' ||
            (pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/api/server'));
        const looksLikeEngineIo = (search || '').includes('EIO=');
        if (isSocketPath || looksLikeEngineIo) {
            io.engine.handleRequest(req, res);
            return;
        }
        res.status(404).end();
    }
    catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
//# sourceMappingURL=server.js.map