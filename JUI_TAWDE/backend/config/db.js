const mongoose = require('mongoose');

// In-memory fallback history array if MongoDB instance is unavailable
const fallbackHistory = [];

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tictactoe';
    console.log(`Connecting to MongoDB at: ${connStr}`);
    
    // Set connection timeout so if mongodb isn't running it doesn't hang indefinitely
    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ MongoDB Connected Successfully using Mongoose ODM.');
    return true;
  } catch (err) {
    console.warn('⚠️  MongoDB Connection Warning:', err.message);
    console.log('🔄 Operating with Mongoose schema & graceful in-memory storage fallback.');
    return false;
  }
};

module.exports = { connectDB, fallbackHistory };
