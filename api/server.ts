import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import '../server/src/server';
import { VercelRequest, VercelResponse } from '@vercel/node';

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? "https://sorryangelina.vercel.app"
    : "http://localhost:3000",
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'production') {
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  httpServer.listen(3001, () => {
    console.log('Server running on port 3001');
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This function exists just to satisfy Vercel's requirements
  // The actual server is imported and started above
  res.status(200).end();
} 