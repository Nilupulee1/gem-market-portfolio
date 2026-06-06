import './config/env';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { connectDatabase } from './config/database';
import { setupWebSocket } from './config/websocket';
import authRoutes from './routes/authRoutes';
import gemRoutes from './routes/gemRoutes';
import auctionRoutes from './routes/auctionRoutes';
import adminRoutes from './routes/adminRoutes';
import buyerRoutes from './routes/buyerRoutes';
import chatRoutes from './routes/chatRoutes';

const app = express();

const isLocalDevOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) { callback(null, true); return; }
    // Allow localhost in development
    if (isLocalDevOrigin(origin)) { callback(null, true); return; }
    // Allow the deployed frontend URL from env
    const allowedOrigin = process.env.FRONTEND_URL;
    if (allowedOrigin && origin === allowedOrigin) { callback(null, true); return; }

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
app.use('/api/chat', chatRoutes);

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

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));
  // Catch-all: send React's index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

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
    
    // Create HTTP server for WebSocket support
    const httpServer = http.createServer(app);
    
    // Setup WebSocket
    setupWebSocket(httpServer);
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    });

    // Error handlers
    httpServer.on('error', (error: any) => {
      console.error('💥 HTTP Server Error:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
    });

    process.on('unhandledRejection', (reason: any) => {
      console.error('❌ Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error: any) => {
      console.error('❌ Uncaught Exception:', error);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();