import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import '../server/src/server';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? "https://sorryangelina.vercel.app"
    : "http://localhost:3000",
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? "https://sorryangelina.vercel.app"
      : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

export default app; 