// Install ws package: npm install ws
const WebSocket = require('ws');

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