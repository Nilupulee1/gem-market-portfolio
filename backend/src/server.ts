import './config/env';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import authRoutes from './routes/authRoutes';
import gemRoutes from './routes/gemRoutes';
import auctionRoutes from './routes/auctionRoutes';
import adminRoutes from './routes/adminRoutes';
import buyerRoutes from './routes/buyerRoutes';

const app = express();

const isLocalDevOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gems', gemRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/buyer', buyerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Server Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🔍 Checking environment variables...');
    console.log('📦 Cloudinary Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('🔑 Cloudinary API Key:', process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('🔐 Cloudinary API Secret:', process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Not set');
    
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();