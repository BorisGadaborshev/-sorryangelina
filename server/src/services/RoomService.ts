import { RoomModel } from '../models/Room';
import { Room, RoomDocument, User, Card } from '../types';
import bcrypt from 'bcryptjs';

export class RoomService {
  static async createRoom(roomId: string, password: string, owner: string, username: string): Promise<Room> {
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
  }

  static async getRoom(roomId: string): Promise<Room | null> {
    const room = await RoomModel.findOne({ id: roomId });
    return room ? this.convertToRoom(room) : null;
  }

  static async validatePassword(roomId: string, password: string): Promise<boolean> {
    const room = await RoomModel.findOne({ id: roomId });
    if (!room) return false;
    return bcrypt.compare(password, room.password);
  }

  static async findExistingUser(roomId: string, username: string): Promise<User | null> {
    const room = await RoomModel.findOne({ id: roomId });
    if (!room) return null;
    
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
      return {
        ...existingUser,
        role: isCreator ? 'admin' as const : 'user' as const
      };
    }
    return null;
  }

  static async addUser(roomId: string, user: User): Promise<Room | null> {
    const room = await RoomModel.findOne({ id: roomId });
    if (!room) return null;

    // Проверяем, существует ли пользователь с таким именем
    const existingUser = await this.findExistingUser(roomId, user.name);
    
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

    // Если пользователь новый, проверяем не является ли он первым в комнате
    const isFirstUser = room.users.length === 0;
    const userWithRole = { 
      ...user, 
      role: isFirstUser ? 'admin' as const : 'user' as const
    };
    
    console.log('Adding new user:', {
      user: userWithRole,
      isFirstUser,
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
  }

  static async removeUser(roomId: string, userId: string): Promise<Room | null> {
    const room = await RoomModel.findOneAndUpdate(
      { id: roomId },
      { 
        $pull: { users: { id: userId } }
      },
      { new: true }
    );
    return room ? this.convertToRoom(room) : null;
  }

  static async addCard(roomId: string, card: Card): Promise<Room | null> {
    const room = await RoomModel.findOneAndUpdate(
      { id: roomId },
      { 
        $push: { cards: card }
      },
      { new: true }
    );
    return room ? this.convertToRoom(room) : null;
  }

  static async updateCard(roomId: string, cardId: string, updates: Partial<Card>): Promise<Room | null> {
    const room = await RoomModel.findOneAndUpdate(
      { 
        id: roomId,
        'cards.id': cardId
      },
      { 
        $set: Object.entries(updates).reduce((acc, [key, value]) => ({
          ...acc,
          [`cards.$.${key}`]: value
        }), {})
      },
      { new: true }
    );
    return room ? this.convertToRoom(room) : null;
  }

  static async deleteCard(roomId: string, cardId: string): Promise<Room | null> {
    const room = await RoomModel.findOneAndUpdate(
      { id: roomId },
      { 
        $pull: { cards: { id: cardId } }
      },
      { new: true }
    );
    return room ? this.convertToRoom(room) : null;
  }

  static async updatePhase(roomId: string, phase: 'creation' | 'voting' | 'discussion', userId: string): Promise<Room | null> {
    console.log('Attempting to update phase:', { roomId, phase, userId });
    
    // Получаем комнату и проверяем существование
    const room = await RoomModel.findOne({ id: roomId });
    if (!room) {
      console.log('Room not found for phase update');
      return null;
    }

    // Находим пользователя
    const user = room.users.find(u => u.id === userId);
    if (!user) {
      console.log('User not found for phase update:', { userId, availableUsers: room.users });
      return null;
    }

    // Проверяем только роль админа
    const hasAdminRole = user.role === 'admin';
    
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
    const updatedRoom = await RoomModel.findOneAndUpdate(
      { id: roomId },
      { phase },
      { new: true }
    );

    if (!updatedRoom) {
      console.log('Failed to update room phase');
      return null;
    }

    console.log('Phase updated successfully:', {
      newPhase: updatedRoom.phase,
      roomId: updatedRoom.id
    });

    return this.convertToRoom(updatedRoom);
  }

  static async updateCardVotes(
    roomId: string, 
    cardId: string, 
    userId: string, 
    voteType: 'like' | 'dislike'
  ): Promise<Room | null> {
    // First remove user from both likes and dislikes
    await RoomModel.updateOne(
      { id: roomId, 'cards.id': cardId },
      { 
        $pull: {
          'cards.$.likes': userId,
          'cards.$.dislikes': userId
        }
      }
    );

    // Then add the vote to the appropriate array
    const room = await RoomModel.findOneAndUpdate(
      { id: roomId, 'cards.id': cardId },
      { 
        $addToSet: {
          [`cards.$.${voteType}s`]: userId
        }
      },
      { new: true }
    );
    return room ? this.convertToRoom(room) : null;
  }

  static async deleteRoom(roomId: string): Promise<void> {
    await RoomModel.deleteOne({ id: roomId });
  }

  static async getAllRooms(): Promise<Room[]> {
    const rooms = await RoomModel.find({}, {
      id: 1,
      owner: 1,
      phase: 1,
      users: 1,
      _id: 0
    });
    return rooms.map(room => this.convertToRoom(room));
  }

  static async restoreSession(roomId: string, userId: string, newSocketId: string): Promise<{ room: Room | null, user: User | null }> {
    console.log('Starting session restoration:', { roomId, userId, newSocketId });
    const room = await RoomModel.findOne({ id: roomId });
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
    const role = isCreator ? 'admin' as const : 'user' as const;

    console.log('Role determination during restore:', {
      username: existingUser.name,
      creatorUsername: creatorUser.name,
      isCreator,
      assignedRole: role,
      currentRole: existingUser.role
    });

    // Update socket ID and role for the existing user
    const updatedRoom = await RoomModel.findOneAndUpdate(
      { 
        id: roomId,
        'users.id': userId 
      },
      { 
        $set: { 
          'users.$.id': newSocketId,
          'users.$.role': role
        }
      },
      { new: true }
    );

    if (!updatedRoom) {
      console.log('Failed to update room during session restoration');
      return { room: null, user: null };
    }

    const updatedUser = {
      ...existingUser,
      id: newSocketId,
      role
    };

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
  }

  static async clearDatabase(): Promise<void> {
    await RoomModel.deleteMany({});
    console.log('Database cleared successfully');
  }

  static async updateUserReadyState(roomId: string, userId: string, isReady: boolean): Promise<Room | null> {
    console.log('Updating user ready state:', { roomId, userId, isReady });
    
    const room = await RoomModel.findOneAndUpdate(
      { 
        id: roomId,
        'users.id': userId 
      },
      { 
        $set: { 
          'users.$.isReady': isReady 
        }
      },
      { new: true }
    );

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
  }

  static async resetUsersReadyState(roomId: string): Promise<Room | null> {
    console.log('Resetting ready states for room:', roomId);
    
    const room = await RoomModel.findOneAndUpdate(
      { id: roomId },
      { 
        $set: { 
          'users.$[].isReady': false 
        }
      },
      { new: true }
    );

    if (!room) {
      console.log('Room not found while resetting ready states');
      return null;
    }

    console.log('Ready states reset for room:', {
      roomId,
      users: room.users.map(u => ({ name: u.name, isReady: u.isReady }))
    });

    return this.convertToRoom(room);
  }

  private static convertToRoom(doc: RoomDocument): Room {
    const { id, owner, phase, users, cards } = doc;
    console.log('Converting room document:', {
      owner,
      originalUsers: users?.map(u => ({ name: u.name, role: u.role }))
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