import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

export async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;

  if (uri) {
    await mongoose.connect(uri);
    console.log(`MongoDB conectado em ${uri}`);
    return;
  }

  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create();
  }

  const mongoUri = memoryServer.getUri();
  await mongoose.connect(mongoUri);
  console.log(`MongoDB em memória conectado em ${mongoUri}`);
}

mongoose.connection.on('error', (err) => {
  console.error('Erro de conexão com o MongoDB:', err.message);
});

await ensureMongoConnection();

export { memoryServer };
export default mongoose;
