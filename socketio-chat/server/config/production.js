module.exports = {
  NODE_ENV: 'production',
  PORT: process.env.PORT || 5000,
  
  // MongoDB Configuration
  MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://your-username:your-password@your-cluster.mongodb.net/socketio-chat',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  JWT_EXPIRES_IN: '7d',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://your-frontend-domain.com',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Security
  BCRYPT_ROUNDS: 12,
  
  // Socket.IO Configuration
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'https://your-frontend-domain.com',
  
  // Monitoring
  ENABLE_MONITORING: process.env.ENABLE_MONITORING === 'true',
  
  // Maintenance
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true'
}; 