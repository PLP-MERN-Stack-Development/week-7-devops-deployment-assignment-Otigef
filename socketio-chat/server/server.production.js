const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const config = require('./config/production');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO with production configuration
const io = new Server(server, {
  cors: {
    origin: config.SOCKET_CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// MongoDB Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true, index: true },
  content: { type: String, required: true, maxlength: 1000 },
  room: { type: String, index: true },
  recipient: { type: String, index: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Connect to MongoDB with retry logic
async function connectToMongoDB() {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(config.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ Connected to MongoDB');
      break;
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries} failed:`, err.message);
      if (retries === maxRetries) {
        console.error('❌ Failed to connect to MongoDB after all retries');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Initialize database connection
connectToMongoDB();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Auth endpoints with enhanced security
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username taken' });
    }
    
    const hashed = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const user = await User.create({ 
      username, 
      password: hashed,
      online: false 
    });
    
    console.log('User registered successfully:', username);
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username }, 
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
    
    user.online = true;
    user.lastSeen = new Date();
    await user.save();
    
    console.log('Login successful for user:', username);
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware for JWT auth
const auth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    
    const payload = jwt.verify(token, config.JWT_SECRET);
    socket.user = payload;
    
    await User.findByIdAndUpdate(payload.id, { 
      online: true, 
      lastSeen: new Date() 
    });
    next();
  } catch (err) {
    next(new Error('Auth error'));
  }
};

io.use(auth);

// Socket.IO connection with monitoring
io.on('connection', (socket) => {
  console.log('User connected:', socket.user.username);
  
  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('message', async (data) => {
    try {
      const { content, room, recipient } = data;
      
      if (!content || content.trim().length === 0) {
        return;
      }
      
      if (content.length > 1000) {
        socket.emit('error', { message: 'Message too long' });
        return;
      }
      
      const msg = await Message.create({
        sender: socket.user.id,
        content: content.trim(),
        room,
        recipient,
        read: false
      });
      
      if (room) {
        io.to(room).emit('message', { 
          sender: socket.user.username, 
          content: content.trim(), 
          room,
          timestamp: new Date()
        });
      } else if (recipient) {
        io.to(recipient).emit('privateMessage', { 
          sender: socket.user.username, 
          content: content.trim(),
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing', (room) => {
    socket.to(room).emit('typing', socket.user.username);
  });

  socket.on('read', async (msgId) => {
    try {
      await Message.findByIdAndUpdate(msgId, { read: true });
      socket.emit('readReceipt', msgId);
    } catch (err) {
      console.error('Error updating read status:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      await User.findByIdAndUpdate(socket.user.id, { 
        online: false,
        lastSeen: new Date()
      });
      console.log('User disconnected:', socket.user.username);
    } catch (err) {
      console.error('Error updating user status:', err);
    }
  });
});

// API endpoints with error handling
app.get('/api/messages/room/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .populate('sender', 'username')
      .sort('createdAt')
      .limit(100);
    res.json(messages);
  } catch (err) {
    console.error('Error fetching room messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/messages/private/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).populate('sender', 'username').populate('recipient', 'username').sort('createdAt').limit(100);
    res.json(messages);
  } catch (err) {
    console.error('Error fetching private messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username online lastSeen').sort('lastSeen');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`📊 Monitoring: ${config.ENABLE_MONITORING ? 'Enabled' : 'Disabled'}`);
}); 