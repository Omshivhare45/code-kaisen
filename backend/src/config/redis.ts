import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import * as dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export let redisClient: Redis | null = null;
export let isRedisConnected = false;

// Create connection
try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  
  redisClient.connect()
    .then(() => {
      console.log('Redis connected successfully.');
      isRedisConnected = true;
    })
    .catch((err) => {
      console.warn('Redis connection failed. Graceful fallback mode enabled.', err.message);
      isRedisConnected = false;
      redisClient = null;
    });
} catch (e: any) {
  console.warn('Could not initialize Redis client:', e.message);
}

// In-Memory Fallback Queue for BullMQ if Redis is not running
class MockQueue {
  private name: string;
  constructor(name: string) {
    this.name = name;
  }
  async add(name: string, data: any) {
    console.log(`[MockQueue:${this.name}] Added job "${name}" with data:`, data);
    // Execute job asynchronously
    setTimeout(async () => {
      const handler = mockWorkers.get(this.name);
      if (handler) {
        try {
          await handler({ data });
        } catch (err) {
          console.error(`[MockQueue:${this.name}] Job failed:`, err);
        }
      }
    }, 100);
    return { id: Math.random().toString(36).substr(2, 9) };
  }
  async close() {}
}

const mockWorkers = new Map<string, (job: any) => Promise<any>>();

export function getQueue(queueName: string): any {
  if (isRedisConnected && redisClient) {
    return new Queue(queueName, {
      connection: redisClient as any,
    });
  }
  return new MockQueue(queueName);
}

export function createWorker(queueName: string, processor: (job: any) => Promise<any>): any {
  if (isRedisConnected && redisClient) {
    return new Worker(queueName, processor, {
      connection: redisClient as any,
    });
  }
  mockWorkers.set(queueName, processor);
  console.log(`[MockWorker] Registered worker for queue: ${queueName}`);
  return {
    close: async () => {
      mockWorkers.delete(queueName);
    }
  };
}
