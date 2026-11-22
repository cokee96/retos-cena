const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const roomsRouter = require('./routes/rooms');
const { registerHandlers } = require('./sockets/handlers');

// Ensure DB is initialized
require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/rooms', roomsRouter);

// Serve built React client (dev: ../client/dist, prod Docker: ./public)
const fs = require('fs');
const clientBuild = [
  path.join(__dirname, '../../public'),           // Docker: /app/public
  path.join(__dirname, '../../client/dist'),      // local dev build
].find(p => fs.existsSync(p));
if (clientBuild) {
  app.use(express.static(clientBuild));
  app.get('*', (_, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

// Socket.io
io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Retos Cena server running on port ${PORT}`);
});
