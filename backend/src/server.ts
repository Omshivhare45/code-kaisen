import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initializeDatabase } from './config/db';
import { getQueue } from './config/redis';

// We will also import/initialize our SLA workers here
import './workers/slaWorker';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Bind Socket.IO to express app to make it accessible to routers/workers
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_permits', () => {
    socket.join('permits');
    console.log(`Client ${socket.id} joined permits room`);
  });

  socket.on('join_complaints', () => {
    socket.join('complaints');
    console.log(`Client ${socket.id} joined complaints room`);
  });

  socket.on('join_department', (deptId) => {
    socket.join(`dept_${deptId}`);
    console.log(`Client ${socket.id} joined department room: dept_${deptId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
async function start() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`SETU coordination server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { server };
