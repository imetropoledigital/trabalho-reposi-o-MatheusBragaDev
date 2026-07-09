import { ObjectId } from 'mongodb';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';

export async function produtoRoutes(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    const ip = request.ip;
    const rateKey = `rate:${ip}`;
    const currentRequests = await redis.incr(rateKey);
    if (currentRequests === 1) await redis.expire(rateKey, 60);
    if (currentRequests > 150) {
      return reply.code(429).send({ error: 'Too Many Requests - Limite excedido' });
    }
  });

  fastify.post('/produtos', async (request, reply) => {
    const { nome, categoria, preco, estoque } = request.body;
    const novoProduto = { nome, categoria, preco: parseFloat(preco), estoque: parseInt(estoque), createdAt: new Date() };
    const result = await db.collection('produtos').insertOne(novoProduto);
    return reply.code(201).send({ _id: result.insertedId, ...novoProduto });
  });

  fastify.get('/produtos', async (request, reply) => {
    const { categoria, page = 1, limit = 10 } = request.query;
    const filter = categoria ? { categoria } : {};
    const skipPage = (parseInt(page) - 1) * parseInt(limit);
    return await db.collection('produtos').find(filter).skip(skipPage).limit(parseInt(limit)).toArray();
  });

  fastify.get('/produtos/:id', async (request, reply) => {
    const { id } = request.params;
    const { bypassCache } = request.query;
    const cacheKey = `produto:${id}`;

    if (!bypassCache) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return JSON.parse(cached);
      }
    }

    reply.header('X-Cache', 'MISS');
    const produto = await db.collection('produtos').findOne({ _id: new ObjectId(id) });
    if (!produto) return reply.code(404).send({ error: 'Produto não encontrado' });

    if (!bypassCache) await redis.setex(cacheKey, 300, JSON.stringify(produto));
    return produto;
  });

  fastify.put('/produtos/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, categoria, preco, estoque } = request.body;
    await db.collection('produtos').updateOne(
      { _id: new ObjectId(id) },
      { $set: { nome, categoria, preco: parseFloat(preco), estoque: parseInt(estoque) } }
    );
    await redis.del(`produto:${id}`);
    return { message: 'Produto atualizado e cache limpo' };
  });

  fastify.delete('/produtos/:id', async (request, reply) => {
    const { id } = request.params;
    await db.collection('produtos').deleteOne({ _id: new ObjectId(id) });
    await redis.del(`produto:${id}`);
    return { message: 'Produto removido e cache limpo' };
  });
}