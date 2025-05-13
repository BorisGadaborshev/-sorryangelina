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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const rooms = new Map();
const roomStates = new Map();
// Helper function to get sorted cards by votes
const getSortedCards = (cards) => {
    return [...cards].sort((a, b) => b.votes.length - a.votes.length);
};
io.on('connection', (socket) => {
    let currentUser = null;
    socket.on('create-room', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, password, username }) {
        if (rooms.has(roomId)) {
            socket.emit('error', 'Room already exists');
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = { id: socket.id, name: username, roomId };
        const room = {
            id: roomId,
            password: hashedPassword,
            owner: socket.id,
            phase: 'creation',
            users: [user]
        };
        const roomState = {
            cards: [],
            phase: 'creation',
            users: [user]
        };
        rooms.set(roomId, room);
        roomStates.set(roomId, roomState);
        socket.join(roomId);
        currentUser = user;
        socket.emit('room-joined', { room, state: roomState });
    }));
    socket.on('join-room', (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, password, username }) {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(password, room.password);
        if (!isPasswordValid) {
            socket.emit('error', 'Invalid password');
            return;
        }
        const user = { id: socket.id, name: username, roomId };
        room.users.push(user);
        const roomState = roomStates.get(roomId);
        roomState.users.push(user);
        socket.join(roomId);
        currentUser = user;
        socket.emit('room-joined', { room, state: roomState });
        socket.to(roomId).emit('user-joined', user);
    }));
    socket.on('add-card', ({ text, type, column }) => {
        if (!currentUser)
            return;
        const roomState = roomStates.get(currentUser.roomId);
        if (!roomState || roomState.phase !== 'creation')
            return;
        const card = {
            id: Date.now().toString(),
            text,
            type,
            createdBy: currentUser.id,
            votes: [],
            column
        };
        roomState.cards.push(card);
        io.to(currentUser.roomId).emit('card-added', card);
    });
    socket.on('update-card', ({ cardId, text }) => {
        if (!currentUser)
            return;
        const roomState = roomStates.get(currentUser.roomId);
        if (!roomState)
            return;
        const card = roomState.cards.find(c => c.id === cardId);
        if (!card || card.createdBy !== currentUser.id)
            return;
        card.text = text;
        io.to(currentUser.roomId).emit('card-updated', card);
    });
    socket.on('delete-card', ({ cardId }) => {
        if (!currentUser)
            return;
        const roomState = roomStates.get(currentUser.roomId);
        if (!roomState)
            return;
        const cardIndex = roomState.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1)
            return;
        const card = roomState.cards[cardIndex];
        if (card.createdBy !== currentUser.id)
            return;
        roomState.cards.splice(cardIndex, 1);
        io.to(currentUser.roomId).emit('card-deleted', cardId);
    });
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
    socket.on('vote-card', ({ cardId }) => {
        if (!currentUser)
            return;
        const roomState = roomStates.get(currentUser.roomId);
        if (!roomState || roomState.phase !== 'voting')
            return;
        const card = roomState.cards.find(c => c.id === cardId);
        if (!card)
            return;
        const voteIndex = card.votes.indexOf(currentUser.id);
        if (voteIndex === -1) {
            card.votes.push(currentUser.id);
        }
        else {
            card.votes.splice(voteIndex, 1);
        }
        io.to(currentUser.roomId).emit('card-voted', { cardId, votes: card.votes });
    });
    socket.on('change-phase', (phase) => {
        if (!currentUser)
            return;
        const room = rooms.get(currentUser.roomId);
        if (!room || room.owner !== currentUser.id)
            return;
        const roomState = roomStates.get(currentUser.roomId);
        room.phase = phase;
        roomState.phase = phase;
        if (phase === 'discussion') {
            roomState.cards = getSortedCards(roomState.cards);
        }
        io.to(currentUser.roomId).emit('phase-changed', { phase, cards: roomState.cards });
    });
    socket.on('disconnect', () => {
        if (!currentUser)
            return;
        const room = rooms.get(currentUser.roomId);
        if (!room)
            return;
        room.users = room.users.filter(u => u.id !== currentUser.id);
        const roomState = roomStates.get(currentUser.roomId);
        roomState.users = roomState.users.filter(u => u.id !== currentUser.id);
        if (room.users.length === 0) {
            rooms.delete(currentUser.roomId);
            roomStates.delete(currentUser.roomId);
        }
        else {
            socket.to(currentUser.roomId).emit('user-left', currentUser);
        }
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
