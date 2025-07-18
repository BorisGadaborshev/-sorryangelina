export interface User {
  id: string;
  name: string;
  roomId: string;
  role: 'admin' | 'user';
  isReady?: boolean;
}

export interface Card {
  id: string;
  text: string;
  type: 'liked' | 'disliked' | 'suggestion';
  createdBy: string;
  likes: string[];
  dislikes: string[];
  column: number;
}

// Интерфейс для комнаты в базе данных
export interface RoomDocument {
  id: string;
  password: string;
  owner: string;
  phase: 'creation' | 'voting' | 'discussion';
  users: User[];
  cards: Card[];
}

// Интерфейс для комнаты, отправляемой клиенту
export interface Room {
  id: string;
  owner: string;
  phase: 'creation' | 'voting' | 'discussion';
  users: User[];
  cards: Card[];
}

export interface RoomState {
  cards: Card[];
  phase: 'creation' | 'voting' | 'discussion';
  users: User[];
} 