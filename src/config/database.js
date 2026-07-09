import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/catalogo';
const client = new MongoClient(mongoUri);

export let db;

export async function connectMongo() {
  await client.connect();
  db = client.db();

  const jsonSchemaValidator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['nome', 'categoria', 'preco', 'estoque', 'createdAt'],
      properties: {
        nome: { bsonType: 'string', description: 'Nome é obrigatório e string' },
        categoria: { bsonType: 'string', description: 'Categoria é obrigatória e string' },
        preco: { type: 'number', description: 'Preço é obrigatório e numérico' },
        estoque: { type: 'number', description: 'Estoque é obrigatório e numérico' },
        createdAt: { bsonType: 'date' }
      }
    }
  };

  const collections = await db.listCollections({ name: 'produtos' }).toArray();
  
  if (collections.length === 0) {
    await db.createCollection('produtos', { validator: jsonSchemaValidator });
    console.log('=> Coleção produtos criada com validador.');
  } else {
    await db.command({
      collMod: 'produtos',
      validator: jsonSchemaValidator
    });
    console.log('=> Validador da coleção produtos atualizado.');
  }

  await db.collection('produtos').createIndex({ categoria: 1 });
  console.log('=> MongoDB conectado com sucesso.');
}