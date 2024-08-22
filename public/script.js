const socket = io();

// Handle Join Button Click
document.getElementById('joinBtn').addEventListener('click', () => {
    const fileName = document.getElementById('fileName').value.trim();
    const authCode = document.getElementById('authCode').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const errorMessage = document.getElementById('error-message');

    if (!fileName || !userName) {
        errorMessage.textContent = 'File Name and Your Name are required!';
        return;
    }

    errorMessage.textContent = '';

    socket.emit('join', { fileName, authCode, name: userName });
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('editor-container').style.display = 'block';
});

// Handle Generate Share Link Button Click
document.getElementById('generateLinkBtn').addEventListener('click', () => {
    socket.emit('generateShareLink');
});

// Handle Copy Share Link Button Click
document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    alert('Share link copied to clipboard!');
});

// Load Document and User Information
socket.on('loadDocument', ({ text, fileName, authCode }) => {
    document.getElementById('editor').value = text;
    document.getElementById('fileTitle').textContent = fileName;
    document.getElementById('authTitle').textContent = authCode;
    document.getElementById('status-message').textContent = 'You are now editing this document.';
});

// Update Document in Real-Time
document.getElementById('editor').addEventListener('input', () => {
    const text = document.getElementById('editor').value;
    socket.emit('editDocument', text);
});

// Update Document for Other Users
socket.on('updateDocument', (text) => {
    document.getElementById('editor').value = text;
});

// Update Users List
socket.on('updateUsers', (users) => {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        userList.appendChild(li);
    });
});

// Handle Share Link
socket.on('shareLink', (link) => {
    document.getElementById('shareLink').value = `${window.location.origin}/?link=${link}`;
});

// Join with Share Link
const queryParams = new URLSearchParams(window.location.search);
const link = queryParams.get('link');
if (link) {
    socket.emit('joinWithLink', link);
}
