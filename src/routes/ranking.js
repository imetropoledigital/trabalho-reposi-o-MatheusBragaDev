import { redis } from '../config/redis.js';

export async function rankingRoutes(fastify) {
  fastify.get('/ranking/mais-vendidos', async (request, reply) => {
    const { limit = 5 } = request.query;
    const raw = await redis.zrevrange('ranking:produtos', 0, parseInt(limit) - 1, 'WITHSCORES');
    const resultado = [];
    for (let i = 0; i < raw.length; i += 2) {
      resultado.push({ produtoId: raw[i], totalVendido: parseInt(raw[i + 1]) });
    }
    return resultado;
  });
}