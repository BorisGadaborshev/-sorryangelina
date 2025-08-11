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
exports.RoomService = void 0;
const Room_1 = require("../models/Room");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class RoomService {
    static createRoom(roomId, password, owner, username) {
        return __awaiter(this, void 0, void 0, function* () {
            const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
            const user = {
                id: owner,
                name: username,
                roomId,
                role: 'admin',
                isReady: false
            };
            console.log('Creating room with admin user:', user);
            const room = yield Room_1.RoomModel.create({
                id: roomId,
                password: hashedPassword,
                owner: username,
                phase: 'creation',
                users: [user],
                cards: []
            });
            const convertedRoom = this.convertToRoom(room);
            console.log('Room created and converted:', {
                originalUsers: room.users,
                convertedUsers: convertedRoom.users
            });
            return convertedRoom;
        });
    }
    static getRoom(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOne({ id: roomId });
            return room ? this.convertToRoom(room) : null;
        });
    }
    static validatePassword(roomId, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOne({ id: roomId });
            if (!room)
                return false;
            return bcryptjs_1.default.compare(password, room.password);
        });
    }
    static findExistingUser(roomId, username) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOne({ id: roomId });
            if (!room)
                return null;
            const existingUser = room.users.find(user => user.name === username);
            if (existingUser) {
                // Находим первого пользователя (создателя) комнаты
                const creatorUser = room.users[0];
                // Проверяем, является ли пользователь создателем комнаты по имени
                const isCreator = username === creatorUser.name;
                console.log('Found existing user check:', {
                    username,
                    creatorUsername: creatorUser.name,
                    isCreator,
                    roomOwner: room.owner,
                    firstUser: room.users[0].name
                });
                // Если имя совпадает с именем создателя - даём права админа
                return Object.assign(Object.assign({}, existingUser), { role: isCreator ? 'admin' : 'user' });
            }
            return null;
        });
    }
    static addUser(roomId, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOne({ id: roomId });
            if (!room)
                return null;
            // Проверяем, существует ли пользователь с таким именем
            const existingUser = yield this.findExistingUser(roomId, user.name);
            if (existingUser) {
                // Находим создателя комнаты
                const creatorUser = room.users[0];
                const isCreator = user.name === creatorUser.name;
                const userWithRole = Object.assign(Object.assign({}, user), { role: isCreator ? 'admin' : 'user' });
                console.log('Updating existing user:', {
                    user: userWithRole,
                    isCreator,
                    creatorName: creatorUser.name
                });
                const updatedRoom = yield Room_1.RoomModel.findOneAndUpdate({
                    id: roomId,
                    'users.name': user.name
                }, {
                    $set: {
                        'users.$.id': user.id,
                        'users.$.role': userWithRole.role
                    }
                }, { new: true });
                return updatedRoom ? this.convertToRoom(updatedRoom) : null;
            }
            // Если пользователь новый, проверяем не является ли он первым в комнате
            const isFirstUser = room.users.length === 0;
            const userWithRole = Object.assign(Object.assign({}, user), { role: isFirstUser ? 'admin' : 'user' });
            console.log('Adding new user:', {
                user: userWithRole,
                isFirstUser,
                existingUsersCount: room.users.length
            });
            const updatedRoom = yield Room_1.RoomModel.findOneAndUpdate({ id: roomId }, {
                $addToSet: { users: userWithRole }
            }, { new: true });
            return updatedRoom ? this.convertToRoom(updatedRoom) : null;
        });
    }
    static removeUser(roomId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOneAndUpdate({ id: roomId }, {
                $pull: { users: { id: userId } }
            }, { new: true });
            return room ? this.convertToRoom(room) : null;
        });
    }
    static addCard(roomId, card) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOneAndUpdate({ id: roomId }, {
                $push: { cards: card }
            }, { new: true });
            return room ? this.convertToRoom(room) : null;
        });
    }
    static updateCard(roomId, cardId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOneAndUpdate({
                id: roomId,
                'cards.id': cardId
            }, {
                $set: Object.entries(updates).reduce((acc, [key, value]) => (Object.assign(Object.assign({}, acc), { [`cards.$.${key}`]: value })), {})
            }, { new: true });
            return room ? this.convertToRoom(room) : null;
        });
    }
    static deleteCard(roomId, cardId) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield Room_1.RoomModel.findOneAndUpdate({ id: roomId }, {
                $pull: { cards: { id: cardId } }
            }, { new: true });
            return room ? this.convertToRoom(room) : null;
        });
    }
    static updatePhase(roomId, phase, userId, userName) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Attempting to update phase:', { roomId, phase, userId });
            // Получаем комнату и проверяем существование
            const room = yield Room_1.RoomModel.findOne({ id: roomId });
            if (!room) {
                console.log('Room not found for phase update');
                return null;
            }
            // Находим пользователя по id, иначе по имени (на случай смены socket.id)
            let user = room.users.find(u => u.id === userId);
            if (!user && userName) {
                user = room.users.find(u => u.name === userName);
            }
            if (!user) {
                console.log('User not found for phase update:', { userId, userName, availableUsers: room.users });
                return null;
            }
            // Проверяем право: админ по роли, или владелец комнаты по имени, или первый пользователь
            const isOwnerByName = userName ? userName === room.owner : false;
            const isFirstUser = room.users.length > 0 && room.users[0].name === user.name;
            const hasAdminRole = user.role === 'admin' || isOwnerByName || isFirstUser;
            console.log('Checking phase update permissions:', {
                userName: user.name,
                userRole: user.role,
                hasAdminRole,
                currentPhase: room.phase,
                requestedPhase: phase
            });
            if (!hasAdminRole) {
                console.log('Permission denied: user is not admin');
                return null;
            }
            // Обновляем фазу
            const updatedRoom = yield Room_1.RoomModel.findOneAndUpdate({ id: roomId }, { $set: { phase } }, { new: true });
            if (!updatedRoom) {
                console.log('Failed to update room phase');
                return null;
            }
            console.log('Phase updated successfully:', {
                newPhase: updatedRoom.phase,
                roomId: updatedRoom.id
            });
            return this.convertToRoom(updatedRoom);
        });
    }
    static updateCardVotes(roomId, cardId, userId, voteType) {
        return __awaiter(this, void 0, void 0, function* () {
            // First remove user from both likes and dislikes
            yield Room_1.RoomModel.updateOne({ id: roomId, 'cards.id': cardId }, {
                $pull: {
                    'cards.$.likes': userId,
                    'cards.$.dislikes': userId
                }
            });
            // Then add the vote to the appropriate array
            const room = yield Room_1.RoomModel.findOneAndUpdate({ id: roomId, 'cards.id': cardId }, {
                $addToSet: {
                    [`cards.$.${voteType}s`]: userId
                }
            }, { new: true });
            return room ? this.convertToRoom(room) : null;
        });
    }
    static deleteRoom(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Room_1.RoomModel.deleteOne({ id: roomId });
        });
    }
    static getAllRooms() {
        return __awaiter(this, void 0, void 0, function* () {
            const rooms = yield Room_1.RoomModel.find();
            return rooms.map(room => this.convertToRoom(room));
        });
    }
    static restoreSession(roomId, userId, newSocketId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting session restoration:', { roomId, userId, newSocketId });
            const room = yield Room_1.RoomModel.findOne({ id: roomId });
            if (!room) {
                console.log('Room not found during session restoration');
                return { room: null, user: null };
            }
            const existingUser = room.users.find(user => user.id === userId);
            if (!existingUser) {
                console.log('User not found during session restoration');
                return { room: null, user: null };
            }
            console.log('Found existing user:', existingUser);
            // Находим создателя комнаты
            const creatorUser = room.users[0];
            // Проверяем, является ли пользователь создателем комнаты по имени
            const isCreator = existingUser.name === creatorUser.name;
            const role = isCreator ? 'admin' : 'user';
            console.log('Role determination during restore:', {
                username: existingUser.name,
                creatorUsername: creatorUser.name,
                isCreator,
                assignedRole: role,
                currentRole: existingUser.role
            });
            // Update socket ID and role for the existing user
            const updatedRoom = yield Room_1.RoomModel.findOneAndUpdate({
                id: roomId,
                'users.id': userId
            }, {
                $set: {
                    'users.$.id': newSocketId,
                    'users.$.role': role
                }
            }, { new: true });
            if (!updatedRoom) {
                console.log('Failed to update room during session restoration');
                return { room: null, user: null };
            }
            const updatedUser = Object.assign(Object.assign({}, existingUser), { id: newSocketId, role });
            console.log('Session restoration complete:', {
                user: updatedUser,
                userRole: updatedUser.role,
                roomUsers: updatedRoom.users.map(u => ({ name: u.name, role: u.role }))
            });
            const convertedRoom = this.convertToRoom(updatedRoom);
            console.log('Converted room after restoration:', {
                users: convertedRoom.users.map(u => ({ name: u.name, role: u.role }))
            });
            return {
                room: convertedRoom,
                user: updatedUser
            };
        });
    }
    static clearDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Room_1.RoomModel.deleteMany();
            console.log('Database cleared successfully');
        });
    }
    static updateUserReadyState(roomId, userId, isReady) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Updating user ready state:', { roomId, userId, isReady });
            const room = yield Room_1.RoomModel.findOneAndUpdate({
                id: roomId,
                'users.id': userId
            }, {
                $set: {
                    'users.$.isReady': isReady
                }
            }, { new: true });
            if (!room) {
                console.log('Room or user not found while updating ready state');
                return null;
            }
            console.log('User ready state updated:', {
                userId,
                isReady,
                allUsers: room.users.map(u => ({ name: u.name, isReady: u.isReady }))
            });
            return this.convertToRoom(room);
        });
    }
    static resetUsersReadyState(roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Resetting ready states for room:', roomId);
            const room = yield Room_1.RoomModel.findOneAndUpdate({ id: roomId }, {
                $set: {
                    'users.$[].isReady': false
                }
            }, { new: true });
            if (!room) {
                console.log('Room not found while resetting ready states');
                return null;
            }
            console.log('Ready states reset for room:', {
                roomId,
                users: room.users.map(u => ({ name: u.name, isReady: u.isReady }))
            });
            return this.convertToRoom(room);
        });
    }
    static convertToRoom(doc) {
        const { id, owner, phase, users, cards } = doc;
        console.log('Converting room document:', {
            owner,
            originalUsers: users === null || users === void 0 ? void 0 : users.map(u => ({ name: u.name, role: u.role }))
        });
        const convertedRoom = {
            id,
            owner,
            phase,
            users: users ? users.map(user => ({
                id: user.id,
                name: user.name,
                roomId: id,
                role: user.role || 'user',
                isReady: user.isReady
            })) : [],
            cards: cards || []
        };
        console.log('Room conversion result:', {
            convertedUsers: convertedRoom.users.map(u => ({ name: u.name, role: u.role }))
        });
        return convertedRoom;
    }
}
exports.RoomService = RoomService;
