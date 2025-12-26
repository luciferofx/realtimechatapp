const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Serve static files (index.html)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Keep track of connected users: socket.id → display name
const connectedUsers = new Map(); // socket.id => displayName

io.on('connection', (socket) => {
  // Get the display name sent from client (query.userId is actually the display name now)
  let displayName = socket.handshake.query.userId || 'Anonymous';

  // Store the current display name for this socket
  connectedUsers.set(socket.id, displayName);

  // Notify ALL clients (including sender) that someone joined, using their current display name
  io.emit('user joined', displayName);

  // Broadcast incoming messages to everyone EXCEPT the sender
  socket.on('chat message', (msg) => {
    const currentName = connectedUsers.get(socket.id) || displayName;
    const messageData = { userId: currentName, msg };
    socket.broadcast.emit('chat message', messageData);
  });

  // Optional: Add a handler for name changes (future-proof if you want real-time updates)
  // Currently name changes are client-side only, but this prepares for broadcasting them
  socket.on('update name', (newName) => {
    const oldName = connectedUsers.get(socket.id);
    connectedUsers.set(socket.id, newName);
    // Notify everyone about the name change
    io.emit('name changed', { oldName, newName });
  });

  // When someone disconnects
  socket.on('disconnect', () => {
    const leavingName = connectedUsers.get(socket.id) || displayName;
    connectedUsers.delete(socket.id);
    // Notify everyone else
    socket.broadcast.emit('user left', leavingName);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});