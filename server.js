const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto'); // For generating unique shareable links

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const documents = {}; // To store documents with auth codes
const users = {}; // To store user information
const shareLinks = {}; // To store shareable links

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  let currentRoom = null;
  let userName = '';

  socket.on('join', ({ fileName, authCode, name }) => {
    const key = `${fileName}-${authCode}`;

    if (!documents[key]) {
      documents[key] = ''; // Initialize new document if it does not exist
    }

    currentRoom = key;
    userName = name;

    if (!users[currentRoom]) {
      users[currentRoom] = [];
    }

    users[currentRoom].push(userName);
    socket.join(currentRoom);

    socket.emit('loadDocument', {
      text: documents[currentRoom],
      fileName: fileName,
      authCode: authCode
    });

    io.to(currentRoom).emit('updateUsers', users[currentRoom]);

    socket.on('editDocument', (text) => {
      documents[currentRoom] = text;
      socket.to(currentRoom).emit('updateDocument', text);
    });

    socket.on('generateShareLink', () => {
      const link = crypto.randomBytes(16).toString('hex');
      shareLinks[link] = currentRoom;
      socket.emit('shareLink', link);
    });

    socket.on('disconnect', () => {
      users[currentRoom] = users[currentRoom].filter(user => user !== userName);
      if (users[currentRoom].length === 0) {
        // Optionally, remove the document if no users are left
        delete documents[currentRoom];
        delete users[currentRoom];
        delete shareLinks[Object.keys(shareLinks).find(key => shareLinks[key] === currentRoom)];
      } else {
        io.to(currentRoom).emit('updateUsers', users[currentRoom]);
      }
      socket.leave(currentRoom);
    });
  });

  socket.on('joinWithLink', (link) => {
    const room = shareLinks[link];
    if (room) {
      socket.join(room);
      socket.emit('loadDocument', {
        text: documents[room],
        fileName: room.split('-')[0],
        authCode: room.split('-')[1]
      });
      io.to(room).emit('updateUsers', users[room]);
    }
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
