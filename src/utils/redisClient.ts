import Redis from 'ioredis';

const redisClient = new Redis(); // Dfults to localhost:6379

redisClient.on('connect', () => console.log('Connected to Redis!'));
redisClient.on('error', (err) => console.error('Redis Error:', err));

export default redisClient;
