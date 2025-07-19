const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
  credentials: true
}));
app.use(express.json());

// Simple in-memory storage
const users = new Map();

// Register endpoint
app.post('/api/register', async (req, res) => {
  console.log('Register request received:', req.body);
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  if (users.has(username)) {
    return res.status(400).json({ error: 'Username taken' });
  }
  
  try {
    const hashed = await bcrypt.hash(password, 10);
    users.set(username, { 
      id: username, 
      username, 
      password: hashed, 
      online: false 
    });
    console.log('User registered successfully:', username);
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    console.log('Registration error:', err.message);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  console.log('Login request received:', req.body);
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const user = users.get(username);
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  
  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, 'secret');
    user.online = true;
    console.log('Login successful for user:', username);
    res.json({ token, username: user.username });
  } catch (err) {
    console.log('Login error:', err.message);
    res.status(400).json({ error: 'Invalid credentials' });
  }
});

// Users endpoint
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    username: u.username,
    online: u.online
  }));
  res.json(userList);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
}); 