import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

export async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) return;

  const configuredUri = process.env.MONGODB_URI;

  if (configuredUri) {
    try {
      await mongoose.connect(configuredUri);
      console.log(`MongoDB conectado em ${configuredUri}`);
      return;
    } catch (error) {
      console.warn(`Falha ao conectar em ${configuredUri}. Tentando MongoDB em memória...`);
    }
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
