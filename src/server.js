import Fastify from 'fastify';
import { connectMongo } from './config/database.js';
import { produtoRoutes } from './routes/produtos.js';
import { vendaRoutes } from './routes/vendas.js';
import { rankingRoutes } from './routes/ranking.js';

const fastify = Fastify({ logger: false });
fastify.register(produtoRoutes);
fastify.register(vendaRoutes);
fastify.register(rankingRoutes);

const run = async () => {
  try {
    await connectMongo();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('=> API Fastify ativa na porta 3000.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();