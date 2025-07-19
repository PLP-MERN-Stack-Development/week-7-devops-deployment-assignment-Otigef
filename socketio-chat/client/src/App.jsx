import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Chat from './pages/Chat';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthContext.Consumer>
          {({ user }) => (
            <Routes>
              {!user && <>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>}
              {user && <>
                <Route path="/chat" element={<Chat />} />
                <Route path="*" element={<Navigate to="/chat" />} />
              </>}
            </Routes>
          )}
        </AuthContext.Consumer>
      </Router>
    </AuthProvider>
  );
}

export default App;
