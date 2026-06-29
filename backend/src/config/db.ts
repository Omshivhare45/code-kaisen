import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { seedDatabase } from '../db/seed';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_db';

export async function initializeDatabase() {
  try {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected.');
    });

    await mongoose.connect(MONGODB_URI);
    
    // Seed initial data if database is empty
    await seedDatabase();

  } catch (error) {
    console.error('Failed to initialize MongoDB database:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
