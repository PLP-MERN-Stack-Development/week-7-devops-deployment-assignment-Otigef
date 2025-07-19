const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
  credentials: true
}));
app.use(express.json());

// MongoDB Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  content: { type: String, required: true },
  room: { type: String },
  recipient: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Fallback in-memory storage
const fallbackUsers = new Map();
const fallbackMessages = [];
let fallbackMessageId = 1;
let useFallback = false;

// Connect to MongoDB with fallback
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/socketio-chat', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    useFallback = false;
  } catch (err) {
    console.log('❌ MongoDB connection failed, using in-memory storage');
    console.log('💡 To use MongoDB, set up MongoDB Atlas or install MongoDB locally');
    useFallback = true;
  }
}

// Initialize database connection
connectToMongoDB();

// Auth endpoints
app.post('/api/register', async (req, res) => {
  console.log('Register request received:', req.body);
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    if (useFallback) {
      // Fallback: in-memory storage
      if (fallbackUsers.has(username)) {
        console.log('Username already taken:', username);
        return res.status(400).json({ error: 'Username taken' });
      }
      
      const hashed = await bcrypt.hash(password, 10);
      fallbackUsers.set(username, { 
        id: username, 
        username, 
        password: hashed, 
        online: false 
      });
      
      console.log('User registered successfully (fallback):', username);
      res.status(201).json({ message: 'User registered' });
    } else {
      // MongoDB storage
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        console.log('Username already taken:', username);
        return res.status(400).json({ error: 'Username taken' });
      }
      
      const hashed = await bcrypt.hash(password, 10);
      await User.create({ 
        username, 
        password: hashed,
        online: false 
      });
      
      console.log('User registered successfully (MongoDB):', username);
      res.status(201).json({ message: 'User registered' });
    }
  } catch (err) {
    console.log('Registration error:', err.message);
    res.status(400).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  console.log('Login request received:', req.body);
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    if (useFallback) {
      // Fallback: in-memory storage
      const user = fallbackUsers.get(username);
      if (!user) {
        console.log('User not found:', username);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        console.log('Password mismatch for user:', username);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret');
      user.online = true;
      
      console.log('Login successful (fallback):', username);
      res.json({ token, username: user.username });
    } else {
      // MongoDB storage
      const user = await User.findOne({ username });
      if (!user) {
        console.log('User not found:', username);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        console.log('Password mismatch for user:', username);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'secret');
      user.online = true;
      await user.save();
      
      console.log('Login successful (MongoDB):', username);
      res.json({ token, username: user.username });
    }
  } catch (err) {
    console.log('Login error:', err.message);
    res.status(400).json({ error: 'Invalid credentials' });
  }
});

// Middleware for JWT auth
const auth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    socket.user = payload;
    
    if (!useFallback) {
      await User.findByIdAndUpdate(payload.id, { online: true });
    }
    next();
  } catch (err) {
    next(new Error('Auth error'));
  }
};

io.use(auth);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.user.username);
  
  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('message', async (data) => {
    const { content, room, recipient } = data;
    try {
      if (useFallback) {
        // Fallback: in-memory storage
        const msg = {
          _id: fallbackMessageId++,
          sender: socket.user.id,
          content,
          room,
          recipient,
          createdAt: new Date(),
          read: false
        };
        fallbackMessages.push(msg);
      } else {
        // MongoDB storage
        await Message.create({
          sender: socket.user.id,
          content,
          room,
          recipient,
          read: false
        });
      }
      
      if (room) {
        io.to(room).emit('message', { sender: socket.user.username, content, room });
      } else if (recipient) {
        io.to(recipient).emit('privateMessage', { sender: socket.user.username, content });
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('typing', (room) => {
    socket.to(room).emit('typing', socket.user.username);
  });

  socket.on('read', async (msgId) => {
    try {
      if (useFallback) {
        const msg = fallbackMessages.find(m => m._id === msgId);
        if (msg) msg.read = true;
      } else {
        await Message.findByIdAndUpdate(msgId, { read: true });
      }
      socket.emit('readReceipt', msgId);
    } catch (err) {
      console.error('Error updating read status:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      if (!useFallback) {
        await User.findByIdAndUpdate(socket.user.id, { online: false });
      }
      console.log('User disconnected:', socket.user.username);
    } catch (err) {
      console.error('Error updating user status:', err);
    }
  });
});

// Fetch chat history for a room
app.get('/api/messages/room/:room', async (req, res) => {
  try {
    if (useFallback) {
      const roomMessages = fallbackMessages.filter(m => m.room === req.params.room);
      res.json(roomMessages);
    } else {
      const messages = await Message.find({ room: req.params.room })
        .populate('sender', 'username')
        .sort('createdAt');
      res.json(messages);
    }
  } catch (err) {
    console.error('Error fetching room messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Fetch private chat history between two users
app.get('/api/messages/private/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    if (useFallback) {
      const privateMessages = fallbackMessages.filter(m => 
        (m.sender === user1 && m.recipient === user2) ||
        (m.sender === user2 && m.recipient === user1)
      );
      res.json(privateMessages);
    } else {
      const messages = await Message.find({
        $or: [
          { sender: user1, recipient: user2 },
          { sender: user2, recipient: user1 }
        ]
      }).populate('sender', 'username').populate('recipient', 'username').sort('createdAt');
      res.json(messages);
    }
  } catch (err) {
    console.error('Error fetching private messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Fetch user list
app.get('/api/users', async (req, res) => {
  try {
    if (useFallback) {
      const userList = Array.from(fallbackUsers.values()).map(u => ({
        username: u.username,
        online: u.online
      }));
      res.json(userList);
    } else {
      const users = await User.find({}, 'username online');
      res.json(users);
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💾 Storage: ${useFallback ? 'In-Memory (temporary)' : 'MongoDB'}`);
  if (useFallback) {
    console.log('💡 To enable MongoDB persistence:');
    console.log('   1. Set up MongoDB Atlas (free cloud database)');
    console.log('   2. Update MONGO_URI in .env file');
    console.log('   3. Restart the server');
  }
}); 