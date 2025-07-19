import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { connectSocket } from '../socket';

export default function Chat() {
  const { user, token, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [room, setRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [privateMode, setPrivateMode] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    if (token) {
      socketRef.current = connectSocket(token);
      socketRef.current.emit('joinRoom', room);
      socketRef.current.on('message', (msg) => setMessages((prev) => [...prev, msg]));
      socketRef.current.on('privateMessage', (msg) => setMessages((prev) => [...prev, { ...msg, private: true }]));
      socketRef.current.on('typing', (username) => setTyping(`${username} is typing...`));
      socketRef.current.on('readReceipt', (msgId) => setMessages((prev) => prev.map(m => m._id === msgId ? { ...m, read: true } : m)));
      fetchUsers();
      fetchMessages();
    }
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, [token, room, recipient, privateMode]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsers = async () => {
    const res = await fetch('http://localhost:5000/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const fetchMessages = async () => {
    let url = privateMode && recipient
      ? `http://localhost:5000/api/messages/private/${user.username}/${recipient}`
      : `http://localhost:5000/api/messages/room/${room}`;
    const res = await fetch(url);
    const data = await res.json();
    setMessages(data);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    if (privateMode && recipient) {
      socketRef.current.emit('message', { content: message, recipient });
    } else {
      socketRef.current.emit('message', { content: message, room });
    }
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (privateMode && recipient) return;
    socketRef.current.emit('typing', room);
  };

  const handleRead = (msgId) => {
    socketRef.current.emit('read', msgId);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-xl border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Chat App</h1>
              <p className="text-purple-100 text-sm">Real-time messaging</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">{user.username}</span>
              </div>
              <button 
                onClick={logout} 
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Rooms */}
          <div className="p-4">
            <h3 className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wide">Channels</h3>
            <button 
              className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-all duration-200 ${
                !privateMode 
                  ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => { setPrivateMode(false); setRoom('general'); setRecipient(null); }}
            >
              <span className="text-purple-500 mr-2">#</span>
              General
            </button>
          </div>

          {/* Users */}
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wide">Direct Messages</h3>
            <div className="space-y-1">
              {users.map(u => (
                <button
                  key={u.username}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                    privateMode && recipient === u.username 
                      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => { setPrivateMode(true); setRecipient(u.username); setRoom(''); }}
                  disabled={u.username === user.username}
                >
                  <div className={`w-2 h-2 rounded-full ${u.online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <span className="truncate">{u.username}</span>
                  {u.username === user.username && <span className="text-xs text-gray-400">(You)</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-800">
              {privateMode ? `@${recipient}` : `#${room}`}
            </h2>
            {privateMode && (
              <span className="text-sm text-gray-500">Private conversation</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.sender === user.username ? 'justify-end' : 'justify-start'}`}
              onClick={() => handleRead(msg._id)}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                msg.sender === user.username 
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                <div className={`text-xs mb-1 ${
                  msg.sender === user.username ? 'text-purple-100' : 'text-gray-500'
                }`}>
                  {msg.sender || (msg.private ? 'Private' : '')}
                </div>
                <div className="text-sm leading-relaxed">{msg.content}</div>
                {msg.read && (
                  <div className={`text-xs mt-1 ${
                    msg.sender === user.username ? 'text-purple-100' : 'text-gray-400'
                  }`}>
                    ✓ Read
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typing && (
          <div className="px-6 py-2">
            <div className="text-sm text-gray-500 italic">{typing}</div>
          </div>
        )}

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <input
                id="message-input"
                name="message"
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyDown={handleTyping}
                placeholder={`Message ${privateMode ? recipient : room}...`}
              />
              <button 
                id="send-button"
                name="send-button"
                onClick={handleSend}
                disabled={!message.trim()}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-200 ${
                  message.trim() 
                    ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 