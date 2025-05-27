import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { initDb } from './config/db.cjs';
import User from './models/User.js';
import ActiveSession from './models/ActiveSession.js';
import { handleOperation, joinSession, leaveSession } from './controllers/collabController.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Set up Socket.io
const io = new SocketIoServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Routes
import authRoutes from './routes/authRoutes.js';
import planRoutes from './routes/planRoutes.js';
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.user = user;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }

    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  // Connection event - logging removed to reduce noise

  // Join collaboration session
  socket.on('join_session', (data) => {
    joinSession(io, socket, data, socket.user);
  });

  // Leave collaboration session
  socket.on('leave_session', (data) => {
    leaveSession(io, socket, data, socket.user);
  });

  // Handle operation
  socket.on('operation', (data) => {
    handleOperation(io, socket, data, socket.user);
  });

  // Disconnect
  socket.on('disconnect', async () => {
    try {
      // Get all active sessions for this socket
      const sessions = await ActiveSession.removeBySocketId(socket.id);

      // For each session, notify other users in the room
      if (socket.user) {
        // Get all rooms this socket was in
        const rooms = Array.from(socket.rooms).filter(room => room.startsWith('plan:'));

        // For each room, notify other users and clean up
        for (const room of rooms) {
          const planId = room.replace('plan:', '');

          // Remove cursor position
          await CursorPosition.remove(socket.user.id, planId);

          // Notify other users
          socket.to(room).emit('user_left', {
            user: {
              id: socket.user.id,
              username: socket.user.username
            }
          });
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Start server
const PORT = process.env.PORT || 3001;

// Initialize database and start server
initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

export { app, server };