import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        login({ username: data.username }, data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/80">Sign in to your account</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="username" className="text-white/90 text-sm font-medium">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-white/90 text-sm font-medium">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              id="login-button"
              name="login-button"
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                isLoading 
                  ? 'bg-white/20 text-white/50 cursor-not-allowed' 
                  : 'bg-white text-purple-600 hover:bg-white/90 hover:shadow-lg transform hover:scale-105'
              }`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-white/70 text-sm">
              Don't have an account?{' '}
              <a href="/register" className="text-white font-semibold hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 