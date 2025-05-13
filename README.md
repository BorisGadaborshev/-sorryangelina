# Retro Board Application

A real-time collaborative retrospective board application built with React, TypeScript, Express.js, and Socket.IO.

## Features

- Real-time collaboration
- Password-protected rooms
- Three phases: Creation, Voting, and Discussion
- Drag and drop cards between columns
- Voting system
- Card management (create, edit, delete)
- Material-UI design

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Project Structure

```
.
├── client/          # React frontend
└── server/          # Express.js backend
```

## Setup and Running

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will run on http://localhost:3001

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will open in your default browser at http://localhost:3000

## Usage

1. Create a new room:
   - Enter a room ID
   - Set a password
   - Enter your name
   - Click "Create Room"

2. Join an existing room:
   - Enter the room ID
   - Enter the room password
   - Enter your name
   - Click "Join Room"

3. Using the board:
   - Creation Phase:
     - Add cards to any column
     - Edit or delete your own cards
     - Move cards between columns
   
   - Voting Phase:
     - Vote on cards
     - Cannot create or move cards
   
   - Discussion Phase:
     - Cards are sorted by votes
     - Discuss cards starting with the most voted

## Technologies Used

- Frontend:
  - React
  - TypeScript
  - Material-UI
  - MobX
  - Socket.IO Client
  - React Beautiful DnD

- Backend:
  - Express.js
  - Socket.IO
  - TypeScript
  - bcryptjs for password hashing 