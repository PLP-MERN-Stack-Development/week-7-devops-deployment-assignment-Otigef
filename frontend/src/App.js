import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState([]);

    useEffect(() => {
        socket.on('message', (msg) => setChat((prevChat) => [...prevChat, msg]));
        return () => socket.disconnect();
    }, []);

    const sendMessage = () => {
        socket.emit('message', message);
        setMessage('');
    };

    return (
        <div>
            <h2>Chat App</h2>
            <div>
                {chat.map((msg, idx) => (
                    <p key={idx}>{msg}</p>
                ))}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
}

export default App;