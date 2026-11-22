const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const challengePool = require('../data/challenges.json');

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (db.prepare('SELECT id FROM rooms WHERE code = ?').get(code));
  return code;
}

function pickChallenge(categories, usedTexts = []) {
  const pool = challengePool.filter(c => categories.includes(c.category) && !usedTexts.includes(c.text));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getActivePlayers(roomId) {
  return db.prepare('SELECT * FROM players WHERE room_id = ?').all(roomId);
}

function assignChallenge(roomId, executorId) {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  const config = JSON.parse(room.config_json);
  const categories = config.categories || ['conversation', 'physical', 'daring', 'innocent', 'group'];

  const usedRows = db.prepare('SELECT text FROM challenges WHERE room_id = ?').all(roomId);
  const usedTexts = usedRows.map(r => r.text);

  const challenge = pickChallenge(categories, usedTexts);
  if (!challenge) return null;

  let targetId = null;
  let targetName = null;

  if (challenge.category !== 'group') {
    const players = getActivePlayers(roomId);
    const others = players.filter(p => p.id !== executorId);
    if (others.length === 0) return null;

    // Avoid targeting the same person as the previous challenge
    const lastChallenge = db.prepare(
      "SELECT target_id FROM challenges WHERE executor_id = ? AND status != 'cancelled' ORDER BY created_at DESC LIMIT 1"
    ).get(executorId);
    const lastTargetId = lastChallenge?.target_id;

    let candidates = others.filter(p => p.id !== lastTargetId);
    if (candidates.length === 0) candidates = others;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    targetId = target.id;
    targetName = target.name;
  }

  const text = targetName ? challenge.text.replace('{target}', targetName) : challenge.text;
  const id = uuidv4();
  db.prepare(
    'INSERT INTO challenges (id, room_id, executor_id, target_id, text, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, roomId, executorId, targetId, text, 'pending');

  return { id, text, targetId, targetName, isGroup: challenge.category === 'group' };
}

function logEvent(roomId, type, payload) {
  db.prepare('INSERT INTO events (id, room_id, type, payload_json) VALUES (?, ?, ?, ?)').run(
    uuidv4(), roomId, type, JSON.stringify(payload)
  );
}

function getRanking(roomId) {
  const players = getActivePlayers(roomId);
  const events = db.prepare('SELECT type, payload_json FROM events WHERE room_id = ?').all(roomId);

  const stats = {};
  for (const p of players) {
    stats[p.id] = { name: p.name, completed: 0, drinks: 0, denouncesCorrect: 0 };
  }

  for (const ev of events) {
    const payload = JSON.parse(ev.payload_json);
    switch (ev.type) {
      case 'challenge_done':
        if (stats[payload.executorId]) stats[payload.executorId].completed++;
        break;
      case 'drink':
        if (payload.targetId && stats[payload.targetId]) stats[payload.targetId].drinks++;
        break;
      case 'denounce_correct':
        if (stats[payload.denouncerId]) stats[payload.denouncerId].denouncesCorrect++;
        break;
    }
  }

  return Object.values(stats).sort((a, b) => b.completed - a.completed);
}

module.exports = { generateRoomCode, assignChallenge, logEvent, getRanking, getActivePlayers };
