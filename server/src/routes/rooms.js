const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateRoomCode, getRanking } = require('../gameLogic');

const router = express.Router();

// POST /rooms — create a new room
router.post('/', (req, res) => {
  const { categories, maxDenounces } = req.body || {};
  const id = uuidv4();
  const code = generateRoomCode();
  const config = {
    categories: categories || ['conversation', 'physical', 'daring', 'innocent', 'group'],
    maxDenounces: maxDenounces ?? 3,
  };
  db.prepare('INSERT INTO rooms (id, code, config_json) VALUES (?, ?, ?)').run(id, code, JSON.stringify(config));
  res.json({ roomId: id, code });
});

// GET /rooms/:code — get room status
router.get('/:code', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const players = db.prepare('SELECT id, name, denounces_left, is_host FROM players WHERE room_id = ?').all(room.id);
  res.json({
    code: room.code,
    status: room.status,
    config: JSON.parse(room.config_json),
    players: players.map(p => ({ id: p.id, name: p.name, denouncesLeft: p.denounces_left, isHost: !!p.is_host })),
  });
});

// GET /rooms/:code/ranking
router.get('/:code/ranking', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json({ ranking: getRanking(room.id) });
});

module.exports = router;
