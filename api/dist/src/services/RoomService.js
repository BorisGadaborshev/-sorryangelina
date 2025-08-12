"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const Room_1 = require("../models/Room");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class RoomService {
    static async createRoom(roomId, password, owner, username) {
        try {
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = {
                id: owner,
                name: username,
                roomId,
                role: 'admin',
                isReady: false
            };
            console.log('Creating room with admin user:', user);
            const room = await Room_1.RoomModel.create({
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
        }
        catch (error) {
            console.error('Error in createRoom:', error);
            throw error;
        }
    }
    static async getRoom(roomId) {
        try {
            const room = await Room_1.RoomModel.findOne({ id: roomId });
            return room ? this.convertToRoom(room) : null;
        }
        catch (error) {
            console.error('Error in getRoom:', error);
            throw error;
        }
    }
    static async validatePassword(roomId, password) {
        try {
            const room = await Room_1.RoomModel.findOne({ id: roomId });
            if (!room)
                return false;
            return bcryptjs_1.default.compare(password, room.password);
        }
        catch (error) {
            console.error('Error in validatePassword:', error);
            throw error;
        }
    }
    static async addUser(roomId, user) {
        try {
            const room = await Room_1.RoomModel.findOne({ id: roomId });
            if (!room)
                return null;
            const existingUser = room.users.find(u => u.name === user.name);
            if (existingUser) {
                const creatorUser = room.users[0];
                const isCreator = user.name === creatorUser.name;
                const userWithRole = {
                    ...user,
                    role: isCreator ? 'admin' : 'user'
                };
                console.log('Updating existing user:', {
                    user: userWithRole,
                    isCreator,
                    creatorName: creatorUser.name
                });
                const updatedRoom = await Room_1.RoomModel.findOneAndUpdate({
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
            const userWithRole = { ...user, role: 'user' };
            console.log('Adding new user:', {
                user: userWithRole,
                existingUsersCount: room.users.length
            });
            const updatedRoom = await Room_1.RoomModel.findOneAndUpdate({ id: roomId }, {
                $addToSet: { users: userWithRole }
            }, { new: true });
            return updatedRoom ? this.convertToRoom(updatedRoom) : null;
        }
        catch (error) {
            console.error('Error in addUser:', error);
            throw error;
        }
    }
    static async updateUserReadyState(roomId, userId, isReady) {
        const room = await Room_1.RoomModel.findOneAndUpdate({ id: roomId, 'users.id': userId }, { $set: { 'users.$.isReady': isReady } }, { new: true });
        return room ? this.convertToRoom(room) : null;
    }
    static async resetUsersReadyState(roomId) {
        const room = await Room_1.RoomModel.findOneAndUpdate({ id: roomId }, { $set: { 'users.$[].isReady': false } }, { new: true });
        return room ? this.convertToRoom(room) : null;
    }
    static async updatePhase(roomId, phase, userId, userName) {
        const room = await Room_1.RoomModel.findOne({ id: roomId });
        if (!room)
            return null;
        let user = room.users.find(u => u.id === userId);
        if (!user && userName) {
            user = room.users.find(u => u.name === userName);
        }
        if (!user)
            return null;
        const isOwnerByName = userName ? userName === room.owner : false;
        const isFirstUser = room.users.length > 0 && room.users[0].name === user.name;
        const hasAdminRole = user.role === 'admin' || isOwnerByName || isFirstUser;
        if (!hasAdminRole)
            return null;
        const updatedRoom = await Room_1.RoomModel.findOneAndUpdate({ id: roomId }, { $set: { phase } }, { new: true });
        return updatedRoom ? this.convertToRoom(updatedRoom) : null;
    }
    static async getAllRooms() {
        const rooms = await Room_1.RoomModel.find();
        return rooms.map((r) => this.convertToRoom(r));
    }
    static convertToRoom(doc) {
        const { id, owner, phase, users, cards } = doc;
        return { id, owner, phase, users, cards };
    }
}
exports.RoomService = RoomService;
//# sourceMappingURL=RoomService.js.map