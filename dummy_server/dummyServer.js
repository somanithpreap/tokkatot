
const WebSocket = require('ws');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const secretKey = 'your_secret_key'; // Replace with a secure key

app.use(bodyParser.json());
app.use(cors());

let users = []; // In-memory user storage, replace with a database in production

// Endpoint for user registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(user => user.username === username)) {
    return res.status(400).json({ message: 'User already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.status(201).json({ message: 'User registered successfully' });
});

// Endpoint for user login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(user => user.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: '1h' });
  res.status(200).json({ message: 'Login successful', token });
});

app.listen(port, () => {
  console.log(`HTTP server running at http://localhost:${port}`);
});

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket) => {
  console.log('Client connected');

  // Send a message to the client
  socket.send(JSON.stringify({ message: "Welcome to Smart Poultry WebSocket" }));

  // Receive messages from the client
  socket.on('message', (data) => {
    console.log(`Received: ${data}`);
    // Echo the message back
    socket.send(JSON.stringify({ message: `Echo: ${data}` }));
  });

  socket.on('close', () => console.log('Client disconnected'));
});

console.log('WebSocket server running on ws://localhost:8080');