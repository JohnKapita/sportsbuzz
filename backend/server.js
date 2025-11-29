const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://localhost:5000', 
      'http://127.0.0.1:3000',
      'https://yourdomain.com'  // Add your production domain
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Get the correct project root directory
const projectRoot = path.join(__dirname, '..');
const frontendPublicDir = path.join(projectRoot, 'frontend', 'public');

console.log('📁 Directory Info:', {
  projectRoot,
  frontendPublicDir,
  backendDir: __dirname
});

// Static files - FIXED: Serve from correct frontend/public directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendPublicDir));

// Database connection with error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sportbuzz', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

// Initialize default admin
const initializeAdmin = async () => {
  const User = require('./models/User');
  try {
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'admin',
        password: 'admin123',
        email: 'admin@sportbuzz.com',
        role: 'admin'
      });
      await adminUser.save();
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Admin initialization error:', error);
  }
};

// ✅ Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/articles', require('./routes/articles'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/analytics', require('./routes/analytics'));

// Serve frontend - FIXED: Correct paths to frontend/public
app.get('/', (req, res) => {
  const indexPath = path.join(frontendPublicDir, 'index.html');
  console.log('📄 Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

app.get('/admin', (req, res) => {
  const adminPath = path.join(frontendPublicDir, 'admin.html');
  console.log('📄 Serving admin.html from:', adminPath);
  res.sendFile(adminPath);
});

// Serve article.html
app.get('/article.html', (req, res) => {
  const articlePath = path.join(frontendPublicDir, 'article.html');
  console.log('📄 Serving article.html from:', articlePath);
  res.sendFile(articlePath);
});

// Serve CSS and JS files explicitly
app.get('/css/:file', (req, res) => {
  const cssPath = path.join(frontendPublicDir, 'css', req.params.file);
  res.sendFile(cssPath);
});

app.get('/js/:file', (req, res) => {
  const jsPath = path.join(frontendPublicDir, 'js', req.params.file);
  res.sendFile(jsPath);
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// 404 handler for frontend routes - serve index.html for SPA
app.use('*', (req, res) => {
  const indexPath = path.join(frontendPublicDir, 'index.html');
  console.log('🔄 Serving index.html for unknown route:', req.originalUrl);
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Error:', error);
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : error.message 
  });
});

const PORT = process.env.PORT || 5000;

// Initialize and start server
mongoose.connection.once('open', async () => {
  console.log('📊 Initializing admin user...');
  await initializeAdmin();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`⚙️  Admin: http://localhost:${PORT}/admin`);
    console.log(`📄 Articles: http://localhost:${PORT}/article.html`);
    console.log('\n🔑 Default Admin Login:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  });
});