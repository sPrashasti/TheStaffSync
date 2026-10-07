const dns = require('dns');
const mongoose = require('mongoose');

// Node on Windows can fall back to 127.0.0.1 as its only DNS server when the
// system resolver is an IPv6 link-local address, which breaks mongodb+srv:// lookups.
const isLoopbackOnly = dns.getServers().every((s) => s === '127.0.0.1' || s === '::1');
if (isLoopbackOnly) {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

// Throw on query filters that use fields not in the schema. With 'true' Mongoose would drop
// the unknown field, turning e.g. { notAField: 1 } into {} and matching every document.
mongoose.set('strictQuery', 'throw');

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV !== 'test') console.warn('MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

// Resolves once connected; the caller decides what to do if it rejects.
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. Add it to server/.env (see .env.example).');
  }
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

const disconnectDB = () => mongoose.connection.close();

module.exports = { connectDB, disconnectDB };
