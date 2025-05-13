export interface User {
  id: string;
  name: string;
  roomId: string;
  role: 'admin' | 'user';
  isReady?: boolean;
}

export interface Room {
  id: string;
  owner: string;
  phase: 'creation' | 'voting' | 'discussion';
  users: User[];
  cards: Card[];
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

export interface RoomState {
  cards: Card[];
  phase: 'creation' | 'voting' | 'discussion';
  users: User[];
} 