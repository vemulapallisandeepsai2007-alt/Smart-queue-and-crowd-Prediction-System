const mongoose = require('mongoose');

let memoryServerInstance = null;

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_queue';
  
  try {
    // Attempt cloud/local connection with a 15-second server selection timeout
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(` MongoDB Connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (err) {
    console.warn(`⚠️ Could not connect to primary MongoDB at ${primaryUri} (${err.message}).`);
    console.log('🔄 Initializing in-memory MongoDB server for seamless zero-config operation...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'smart_queue',
        },
      });
      const memoryUri = memoryServerInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log(` In-Memory MongoDB running and connected at: ${memoryUri}`);
      return mongoose.connection;
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB server:', memErr.message);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
  } catch (error) {
    console.error('Error disconnecting database:', error);
  }
};

module.exports = { connectDB, disconnectDB };
