const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('joinRoom', (room) => {
        socket.join(room);
        socket.to(room).emit('message', `User joined room: ${room}`);
    });

    socket.on('message', (msg) => {
        io.emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});