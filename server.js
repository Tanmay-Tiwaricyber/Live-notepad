const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const documents = {};
const users = {};
const shareLinks = {};
const documentHistory = {};
const comments = {}; // To store comments

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    let currentRoom = null;
    let userName = '';

    socket.on('join', ({ fileName, authCode, name }) => {
        const key = `${fileName}-${authCode}`;

        if (!documents[key]) {
            documents[key] = '';
            documentHistory[key] = [];
            comments[key] = []; // Initialize comments
        }

        currentRoom = key;
        userName = name;

        if (!users[currentRoom]) {
            users[currentRoom] = [];
        }

        users[currentRoom].push({ name: userName, cursorPos: 0 });
        socket.join(currentRoom);

        // Send current document, comments, and user info
        socket.emit('loadDocument', {
            text: documents[currentRoom],
            fileName: fileName,
            authCode: authCode,
            history: documentHistory[currentRoom],
            comments: comments[currentRoom]
        });

        io.to(currentRoom).emit('updateUsers', users[currentRoom]);
        io.to(currentRoom).emit('notify', `${userName} has joined the document`);

        // Handle document edits
        socket.on('editDocument', (text) => {
            documents[currentRoom] = text;
            documentHistory[currentRoom].push({ text, timestamp: new Date() });
            socket.to(currentRoom).emit('updateDocument', text);
        });

        // Handle cursor position updates
        socket.on('updateCursor', (cursorPos) => {
            const user = users[currentRoom].find(u => u.name === userName);
            if (user) {
                user.cursorPos = cursorPos;
                io.to(currentRoom).emit('updateCursors', users[currentRoom]);
            }
        });

        // Handle comments and annotations
        socket.on('addComment', (comment) => {
            comments[currentRoom].push(comment);
            io.to(currentRoom).emit('updateComments', comments[currentRoom]);
            io.to(currentRoom).emit('notify', `${userName} added a comment`);
        });

        // Handle file upload
        socket.on('uploadFile', (fileContent) => {
            documents[currentRoom] = fileContent;
            io.to(currentRoom).emit('updateDocument', fileContent);
        });

        // Handle document export
        socket.on('exportDocument', (format) => {
            let data;
            if (format === 'txt') {
                data = documents[currentRoom];
            } else if (format === 'json') {
                data = JSON.stringify({
                    text: documents[currentRoom],
                    comments: comments[currentRoom]
                });
            }
            socket.emit('downloadFile', { data, format });
        });

        // Handle checkboxes and task lists
        socket.on('toggleCheckbox', (index) => {
            documents[currentRoom] = documents[currentRoom].split('\n').map((line, i) => {
                if (i === index) {
                    return line.startsWith('[ ]') ? '[x]' + line.slice(3) : '[ ]' + line.slice(3);
                }
                return line;
            }).join('\n');
            socket.to(currentRoom).emit('updateDocument', documents[currentRoom]);
        });

        // Generate share link
        socket.on('generateShareLink', () => {
            const link = crypto.randomBytes(16).toString('hex');
            shareLinks[link] = currentRoom;
            socket.emit('shareLink', link);
        });

        // Disconnect handling
        socket.on('disconnect', () => {
            users[currentRoom] = users[currentRoom].filter(user => user.name !== userName);
            io.to(currentRoom).emit('updateUsers', users[currentRoom]);
            io.to(currentRoom).emit('notify', `${userName} has left the document`);
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
                authCode: room.split('-')[1],
                history: documentHistory[room],
                comments: comments[room]
            });
            io.to(room).emit('updateUsers', users[room]);
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
