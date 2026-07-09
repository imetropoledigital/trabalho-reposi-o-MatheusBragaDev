import Redis from 'ioredis';
const redisUri = process.env.REDIS_URI || 'redis://localhost:6379';
export const redis = new Redis(redisUri);
redis.on('connect', () => console.log('=> Conexão com o Redis estabelecida.'));