require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/works', require('./routes/works'));

// Make io accessible in routes
app.set('io', io);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Database connection
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    let mongoUri = process.env.MONGO_URI;
    
    // If no URI provided, use an in-memory database automatically
    if (!mongoUri || mongoUri === 'mongodb://127.0.0.1:27017/sahayog-bhopal') {
      console.log('No external MongoDB URI found, spinning up in-memory MongoDB for zero-config local run...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      
      // Auto-seed the database if we just created a fresh in-memory instance
      process.env.AUTO_SEED = 'true';
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Run seed if in-memory
    if (process.env.AUTO_SEED === 'true') {
      try {
        console.log('Auto-seeding memory database...');
        require('./seed_memory'); // We will create this simple seed script next
      } catch (e) {
        console.error('Seed error:', e);
      }
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

startServer();
// Triggering nodemon restart to free port 5000
