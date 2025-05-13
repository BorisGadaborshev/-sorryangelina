import mongoose, { Document } from 'mongoose';
import { RoomDocument } from '../types';

// Extend Document but omit conflicting 'id' field
interface RoomModel extends Omit<Document, 'id'>, RoomDocument {}

const UserSchema = new mongoose.Schema({
  id: String,
  name: String,
  roomId: String,
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isReady: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const CardSchema = new mongoose.Schema({
  id: String,
  text: String,
  type: {
    type: String,
    enum: ['liked', 'disliked', 'suggestion']
  },
  createdBy: String,
  likes: [String],
  dislikes: [String],
  column: Number
}, { _id: false });

const RoomSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  owner: { type: String, required: true },
  phase: {
    type: String,
    enum: ['creation', 'voting', 'discussion'],
    default: 'creation'
  },
  users: [UserSchema],
  cards: [CardSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Индексы для быстрого поиска
RoomSchema.index({ id: 1 });
RoomSchema.index({ createdAt: 1 });
RoomSchema.index({ 'cards.id': 1 });

export const RoomModel = mongoose.model<RoomModel>('Room', RoomSchema);