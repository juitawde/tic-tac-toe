const mongoose = require('mongoose');

// In-memory fallback history array if MongoDB instance is unavailable
const fallbackHistory = [];

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tictactoe';
    console.log(`Connecting to MongoDB Atlas...`);

    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 8000,  // Atlas needs more time than localhost
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB Atlas Connected Successfully!');
    return true;
  } catch (err) {
    console.warn('⚠️  MongoDB Connection Warning:', err.message);
    console.log('🔄 Operating with in-memory storage fallback (game history stored in RAM).');
    return false;
  }
};

module.exports = { connectDB, fallbackHistory };
