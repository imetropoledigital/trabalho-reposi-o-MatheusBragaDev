import { ObjectId } from 'mongodb';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';

export async function vendaRoutes(fastify) {
  fastify.post('/vendas', async (request, reply) => {
    const { produtoId, quantidade } = request.body;
    const qty = parseInt(quantidade);
    const produto = await db.collection('produtos').findOne({ _id: new ObjectId(produtoId) });
    if (!produto) return reply.code(404).send({ error: 'Produto inexistente' });

    const novaVenda = { produtoId: new ObjectId(produtoId), quantidade: qty, valorTotal: produto.preco * qty, data: new Date() };
    await db.collection('vendas').insertOne(novaVenda);
    await redis.zincrby('ranking:produtos', qty, produtoId);
    return reply.code(201).send(novaVenda);
  });

  fastify.get('/relatorios/vendas', async (request, reply) => {
    const pipeline = [
      { $match: { data: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } } },
      { $group: { _id: '$produtoId', totalUnidades: { $sum: '$quantidade' }, receitaBruta: { $sum: '$valorTotal' } } },
      { $lookup: { from: 'produtos', localField: '_id', foreignField: '_id', as: 'dadosProduto' } },
      { $unwind: '$dadosProduto' },
      { $project: { _id: 1, totalUnidades: 1, receitaBruta: 1, nome: '$dadosProduto.nome', categoria: '$dadosProduto.categoria' } },
      { $sort: { receitaBruta: -1 } }
    ];
    return await db.collection('vendas').aggregate(pipeline).toArray();
  });
}