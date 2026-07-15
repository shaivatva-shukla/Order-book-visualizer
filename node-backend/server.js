const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const { Server } = require('socket.io');

const PORT = 3001;
const FRONTEND_ORIGIN = 'http://localhost:5173';
const ENGINE_PATH = path.join(__dirname, '..', 'cpp-engine', 'engine.exe');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
    origin: 'http://localhost:5173', // Matches your Vite frontend
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  }));

app.use(express.json());

const engine = spawn(ENGINE_PATH, [], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let stdoutBuffer = '';

engine.stdout.on('data', (chunk) => {
  stdoutBuffer += chunk.toString();

  const lines = stdoutBuffer.split('\n');
  stdoutBuffer = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const data = JSON.parse(trimmed);
      const isTrade = data.price !== undefined;
      const isCircuitBreaker = data.type === 'CIRCUIT_BREAKER_TRIGGERED';

      if (isTrade || isCircuitBreaker) {
        io.emit('market_data', data);
      }
    } catch (err) {
      console.error('Failed to parse engine output:', trimmed, err.message);
    }
  }
});

engine.stderr.on('data', (chunk) => {
  console.error('[engine stderr]', chunk.toString());
});

engine.on('error', (err) => {
  console.error('Failed to start C++ engine:', err.message);
});

engine.on('close', (code) => {
  console.error(`C++ engine exited with code ${code}`);
});

function writeOrder(side, price, quantity) {
  if (!engine.stdin.writable) {
    return;
  }

  const order = {
    type: 'order',
    side,
    price,
    quantity,
  };

  engine.stdin.write(`${JSON.stringify(order)}\n`);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const orderInterval = setInterval(() => {
  const side = Math.random() < 0.5 ? 'buy' : 'sell';
  const price = randomInt(95, 105);
  const quantity = randomInt(1, 20);
  writeOrder(side, price, quantity);
}, 100);

app.post('/simulate-crash', (req, res) => {
    console.log("!!! SIMULATE CRASH REQUEST RECEIVED !!!"); // Add this
    
    for (let i = 0; i < 50; i++) {
      writeOrder('sell', 50, randomInt(1, 20));
    }
    
    console.log("!!! 50 SELL ORDERS SENT TO ENGINE !!!"); // Add this
    res.json({ status: 'crash simulated', ordersSent: 50 });
  });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  clearInterval(orderInterval);
  engine.stdin.end();
  engine.kill();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  clearInterval(orderInterval);
  engine.stdin.end();
  engine.kill();
  server.close(() => process.exit(0));
});
