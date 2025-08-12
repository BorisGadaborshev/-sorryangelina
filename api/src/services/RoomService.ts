import { RoomModel } from '../models/Room';
import { Room, RoomDocument, User } from '../types';
import bcrypt from 'bcryptjs';

export class RoomService {
  static async createRoom(roomId: string, password: string, owner: string, username: string): Promise<Room> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user: User = { 
        id: owner, 
        name: username, 
        roomId,
        role: 'admin',
        isReady: false
      };
      
      console.log('Creating room with admin user:', user);
      
      const room = await RoomModel.create({
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
    } catch (error) {
      console.error('Error in createRoom:', error);
      throw error;
    }
  }

  static async getRoom(roomId: string): Promise<Room | null> {
    try {
      const room = await RoomModel.findOne({ id: roomId });
      return room ? this.convertToRoom(room) : null;
    } catch (error) {
      console.error('Error in getRoom:', error);
      throw error;
    }
  }

  static async validatePassword(roomId: string, password: string): Promise<boolean> {
    try {
      const room = await RoomModel.findOne({ id: roomId });
      if (!room) return false;
      return bcrypt.compare(password, room.password);
    } catch (error) {
      console.error('Error in validatePassword:', error);
      throw error;
    }
  }

  static async addUser(roomId: string, user: User): Promise<Room | null> {
    try {
      const room = await RoomModel.findOne({ id: roomId });
      if (!room) return null;

      // Проверяем, существует ли пользователь с таким именем
      const existingUser = room.users.find(u => u.name === user.name);
      
      if (existingUser) {
        // Находим создателя комнаты
        const creatorUser = room.users[0];
        const isCreator = user.name === creatorUser.name;
        
        const userWithRole = { 
          ...user, 
          role: isCreator ? 'admin' as const : 'user' as const 
        };
        
        console.log('Updating existing user:', {
          user: userWithRole,
          isCreator,
          creatorName: creatorUser.name
        });
        
        const updatedRoom = await RoomModel.findOneAndUpdate(
          { 
            id: roomId,
            'users.name': user.name 
          },
          { 
            $set: { 
              'users.$.id': user.id,
              'users.$.role': userWithRole.role
            }
          },
          { new: true }
        );
        return updatedRoom ? this.convertToRoom(updatedRoom) : null;
      }

      // Если пользователь новый, добавляем его
      const userWithRole = { ...user, role: 'user' as const };
      
      console.log('Adding new user:', {
        user: userWithRole,
        existingUsersCount: room.users.length
      });

      const updatedRoom = await RoomModel.findOneAndUpdate(
        { id: roomId },
        { 
          $addToSet: { users: userWithRole }
        },
        { new: true }
      );
      return updatedRoom ? this.convertToRoom(updatedRoom) : null;
    } catch (error) {
      console.error('Error in addUser:', error);
      throw error;
    }
  }

  static async updateUserReadyState(roomId: string, userId: string, isReady: boolean): Promise<Room | null> {
    const room = await RoomModel.findOneAndUpdate(
      { id: roomId, 'users.id': userId },
      { $set: { 'users.$.isReady': isReady } },
      { new: true }
    );
    return room ? this.convertToRoom(room) : null;
  }

  static async resetUsersReadyState(roomId: string): Promise<Room | null> {
    const room = await RoomModel.findOneAndUpdate(
      { id: roomId },
      { $set: { 'users.$[].isReady': false } },
      { new: true }
    );
    return room ? this.convertToRoom(room) : null;
  }

  static async updatePhase(
    roomId: string,
    phase: 'creation' | 'voting' | 'discussion',
    userId: string,
    userName?: string
  ): Promise<Room | null> {
    const room = await RoomModel.findOne({ id: roomId });
    if (!room) return null;

    let user = room.users.find(u => u.id === userId);
    if (!user && userName) {
      user = room.users.find(u => u.name === userName);
    }
    if (!user) return null;

    const isOwnerByName = userName ? userName === room.owner : false;
    const isFirstUser = room.users.length > 0 && room.users[0].name === user.name;
    const hasAdminRole = user.role === 'admin' || isOwnerByName || isFirstUser;
    if (!hasAdminRole) return null;

    const updatedRoom = await RoomModel.findOneAndUpdate(
      { id: roomId },
      { $set: { phase } },
      { new: true }
    );
    return updatedRoom ? this.convertToRoom(updatedRoom) : null;
  }

  static async getAllRooms(): Promise<Room[]> {
    const rooms = await RoomModel.find();
    return rooms.map((r) => this.convertToRoom(r));
  }

  private static convertToRoom(doc: RoomDocument): Room {
    const { id, owner, phase, users, cards } = doc;
    return { id, owner, phase, users, cards };
  }
} 