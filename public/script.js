const socket = io();

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

document.getElementById('generateLinkBtn').addEventListener('click', () => {
    socket.emit('generateShareLink');
});

document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    alert('Share link copied to clipboard!');
});

// Handle file upload
document.getElementById('fileUpload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        socket.emit('uploadFile', reader.result);
    };
    reader.readAsText(file);
});

// Handle comments
document.getElementById('addCommentBtn').addEventListener('click', () => {
    const commentText = document.getElementById('commentText').value;
    const selectionStart = document.getElementById('editor').selectionStart;
    const selectionEnd = document.getElementById('editor').selectionEnd;
    if (commentText) {
        socket.emit('addComment', {
            text: commentText,
            range: [selectionStart, selectionEnd],
            author: document.getElementById('userName').value
        });
        document.getElementById('commentText').value = '';
    }
});

// Handle document export
document.getElementById('exportBtn').addEventListener('click', () => {
    const format = document.getElementById('exportFormat').value;
    socket.emit('exportDocument', format);
});

socket.on('loadDocument', ({ text, fileName, authCode, history, comments }) => {
    document.getElementById('editor').value = text;
    document.getElementById('fileTitle').textContent = fileName;
    document.getElementById('authTitle').textContent = authCode;
    document.getElementById('historyList').innerHTML = history.map(
        (entry, index) => `<li>Version ${index + 1} - ${new Date(entry.timestamp).toLocaleString()}</li>`
    ).join('');
    document.getElementById('commentList').innerHTML = comments.map(
        comment => `<li>${comment.author}: ${comment.text} [${comment.range.join('-')}]</li>`
    ).join('');
});

document.getElementById('editor').addEventListener('input', () => {
    const text = document.getElementById('editor').value;
    socket.emit('editDocument', text);
});

socket.on('updateDocument', (text) => {
    document.getElementById('editor').value = text;
});

socket.on('updateUsers', (users) => {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.name} (Cursor: ${user.cursorPos})`;
        userList.appendChild(li);
    });
});

socket.on('updateComments', (comments) => {
    const commentList = document.getElementById('commentList');
    commentList.innerHTML = comments.map(
        comment => `<li>${comment.author}: ${comment.text} [${comment.range.join('-')}]</li>`
    ).join('');
});

socket.on('notify', (message) => {
    alert(message);
});

socket.on('shareLink', (link) => {
    document.getElementById('shareLink').value = `${window.location.origin}/?link=${link}`;
});

socket.on('downloadFile', ({ data, format }) => {
    const blob = new Blob([data], { type: format === 'txt' ? 'text/plain' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document.${format}`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('editor').addEventListener('mouseup', () => {
    const cursorPos = document.getElementById('editor').selectionStart;
    socket.emit('updateCursor', cursorPos);
});

const queryParams = new URLSearchParams(window.location.search);
const link = queryParams.get('link');
if (link) {
    socket.emit('joinWithLink', link);
}
