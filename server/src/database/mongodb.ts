import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASSWORD;
const host = process.env.MONGO_HOST;
const port = process.env.MONGO_PORT;
const url = `mongodb://${username}:${password}@${host}:${port}/?authSource=admin`;
const dbName = process.env.MONGO_DB;

const options: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  dbName: dbName,
};

async function connect() {
  try {
    await mongoose.connect(url, options);
    console.log(`Connected successfully to ${dbName}`);
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(-1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(-1);
  }
});

export default { connect };
