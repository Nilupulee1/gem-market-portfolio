import mongoose from 'mongoose';

const redactMongoUri = (uri: string) => uri.replace(/\/\/.*@/, '//<credentials>@');

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📚 Database: ${mongoose.connection.name}`);
  } catch (error) {
    const mongooseError = error as Error & { name?: string };
    const message = mongooseError.message || '';
    const isSrvUri = mongoUri.startsWith('mongodb+srv://');

    console.error('❌ MongoDB connection error:', message);
    console.error(`🔗 URI: ${redactMongoUri(mongoUri)}`);

    if (message.includes('querySrv ECONNREFUSED')) {
      console.error('🛠️ DNS troubleshooting:');
      console.error('  1) Your DNS resolver refused Atlas SRV lookup.');
      console.error('  2) Switch DNS to 8.8.8.8 or 1.1.1.1, then flush DNS cache.');
      console.error('  3) Or use non-SRV mongodb:// host list URI (already configured).');
    }

    if (mongooseError.name === 'MongooseServerSelectionError') {
      console.error('🛠️ Atlas troubleshooting:');
      console.error('  1) In Atlas, allow your current IP in Network Access.');
      console.error('  2) Ensure the Atlas cluster is Running (not paused).');
      console.error('  3) Ensure the Atlas DB user exists and password is correct.');
      console.error('  4) Ensure the DB user has readWrite access to gem-marketplace.');

      if (isSrvUri) {
        console.error('  5) If DNS blocks SRV lookups, use the Atlas non-SRV mongodb:// host list URI.');
      } else {
        console.error('  5) Verify all shard hosts and replicaSet in your mongodb:// URI match Atlas exactly.');
      }

      console.error('  6) If your network blocks 27017, try a different network/hotspot.');
    }

    process.exit(1);
  }
};