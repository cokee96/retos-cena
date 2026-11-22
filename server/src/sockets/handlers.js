const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { assignChallenge, logEvent, getRanking, getActivePlayers } = require('../gameLogic');

function getRoomState(roomId) {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) return null;
  const players = db.prepare('SELECT id, name, denounces_left, is_host FROM players WHERE room_id = ?').all(roomId);
  return {
    code: room.code,
    status: room.status,
    config: JSON.parse(room.config_json),
    players: players.map(p => ({ id: p.id, name: p.name, denouncesLeft: p.denounces_left, isHost: !!p.is_host })),
  };
}

function findSocket(io, playerId) {
  return [...io.sockets.sockets.values()].find(s => s.data.playerId === playerId);
}

function registerHandlers(io, socket) {

  // --- JOIN ROOM ---
  socket.on('join_room', ({ code, name, token }) => {
    const room = db.prepare("SELECT * FROM rooms WHERE code = ? AND status = 'waiting'").get(code?.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Sala no encontrada o ya iniciada' });

    let player = token ? db.prepare('SELECT * FROM players WHERE token = ?').get(token) : null;
    if (player && player.room_id !== room.id) player = null;

    if (!player) {
      const taken = db.prepare('SELECT id FROM players WHERE room_id = ? AND name = ?').get(room.id, name);
      if (taken) return socket.emit('error', { message: 'Ese nombre ya está en uso en esta sala' });

      const isFirstPlayer = db.prepare('SELECT COUNT(*) as c FROM players WHERE room_id = ?').get(room.id).c === 0;
      const config = JSON.parse(room.config_json);
      const newToken = uuidv4();
      const newId = uuidv4();
      db.prepare(
        'INSERT INTO players (id, room_id, name, socket_id, denounces_left, token, is_host) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(newId, room.id, name, socket.id, config.maxDenounces ?? 3, newToken, isFirstPlayer ? 1 : 0);
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(newId);
    } else {
      db.prepare('UPDATE players SET socket_id = ? WHERE id = ?').run(socket.id, player.id);
    }

    socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.roomCode = room.code;
    socket.data.roomId = room.id;

    socket.emit('joined', { token: player.token, playerId: player.id, isHost: !!player.is_host });
    io.to(room.code).emit('room_state', getRoomState(room.id));
  });

  // --- RECONNECT ---
  socket.on('reconnect_player', ({ token }) => {
    const player = token ? db.prepare('SELECT * FROM players WHERE token = ?').get(token) : null;
    if (!player) return socket.emit('reconnect_failed', { reason: 'invalid_token' });

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(player.room_id);
    if (!room) return socket.emit('reconnect_failed', { reason: 'room_not_found' });

    db.prepare('UPDATE players SET socket_id = ? WHERE id = ?').run(socket.id, player.id);
    socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.roomCode = room.code;
    socket.data.roomId = room.id;

    socket.emit('joined', { token: player.token, playerId: player.id, isHost: !!player.is_host });
    socket.emit('room_state', getRoomState(room.id));

    if (room.status === 'playing') {
      const activeChallenge = db.prepare(
        "SELECT * FROM challenges WHERE executor_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
      ).get(player.id);
      if (activeChallenge) {
        const target = activeChallenge.target_id
          ? db.prepare('SELECT name FROM players WHERE id = ?').get(activeChallenge.target_id)
          : null;
        socket.emit('new_challenge', { id: activeChallenge.id, text: activeChallenge.text, targetName: target?.name ?? null });
      }
    } else if (room.status === 'ended') {
      socket.emit('game_ended', { ranking: getRanking(room.id) });
    }
  });

  // --- UPDATE CONFIG ---
  socket.on('update_config', ({ categories, maxDenounces }) => {
    const { playerId, roomId, roomCode } = socket.data;
    if (!playerId) return;
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player?.is_host) return;
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (room.status !== 'waiting') return;

    const config = JSON.parse(room.config_json);
    if (categories) config.categories = categories;
    if (maxDenounces != null) {
      config.maxDenounces = maxDenounces;
      db.prepare('UPDATE players SET denounces_left = ? WHERE room_id = ?').run(maxDenounces, roomId);
    }
    db.prepare('UPDATE rooms SET config_json = ? WHERE id = ?').run(JSON.stringify(config), roomId);
    io.to(roomCode).emit('room_state', getRoomState(roomId));
  });

  // --- START GAME ---
  socket.on('start_game', () => {
    const { playerId, roomId, roomCode } = socket.data;
    if (!playerId) return;
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player?.is_host) return socket.emit('error', { message: 'Solo el host puede iniciar la partida' });

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (room.status !== 'waiting') return;

    const players = getActivePlayers(roomId);
    if (players.length < 2) return socket.emit('error', { message: 'Se necesitan al menos 2 jugadores' });

    db.prepare("UPDATE rooms SET status = 'playing' WHERE id = ?").run(roomId);
    io.to(roomCode).emit('game_started');

    for (const p of players) {
      const challenge = assignChallenge(roomId, p.id);
      if (!challenge) continue;
      const ps = findSocket(io, p.id);
      if (ps) ps.emit('new_challenge', { id: challenge.id, text: challenge.text, targetName: challenge.targetName });
    }
  });

  // --- CHALLENGE DONE ---
  socket.on('challenge_done', ({ challengeId }) => {
    const { playerId, roomId, roomCode } = socket.data;
    if (!playerId) return;

    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ? AND executor_id = ?').get(challengeId, playerId);
    if (!challenge || challenge.status !== 'pending') return socket.emit('error', { message: 'Reto no válido' });

    db.prepare("UPDATE challenges SET status = 'done' WHERE id = ?").run(challengeId);
    logEvent(roomId, 'challenge_done', { executorId: playerId, challengeId });

    // Executor name for the drink notification
    const executor = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);

    if (challenge.target_id) {
      // 1-on-1: target gets a drink notification with who did it
      logEvent(roomId, 'drink', { targetId: challenge.target_id, challengeId });
      const targetSocket = findSocket(io, challenge.target_id);
      if (targetSocket) targetSocket.emit('drink', { executorName: executor?.name });
    }
    // Group challenges: no drink sent — the challenge text itself describes what happens

    // Assign new challenge to executor
    const newChallenge = assignChallenge(roomId, playerId);
    if (newChallenge) {
      socket.emit('new_challenge', { id: newChallenge.id, text: newChallenge.text, targetName: newChallenge.targetName });
    } else {
      db.prepare("UPDATE rooms SET status = 'ended' WHERE id = ?").run(roomId);
      io.to(roomCode).emit('game_ended', { ranking: getRanking(roomId) });
    }
  });

  // --- DENOUNCE ---
  // Spends 1 denounce immediately. Honor system: accused decides to admit or deny.
  socket.on('denounce', ({ targetId }) => {
    const { playerId, roomId } = socket.data;
    if (!playerId) return;

    const denouncer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!denouncer || denouncer.denounces_left <= 0) return socket.emit('error', { message: 'Sin denuncias disponibles' });

    // Spend the denounce immediately
    db.prepare('UPDATE players SET denounces_left = denounces_left - 1 WHERE id = ?').run(playerId);
    const newDenounces = denouncer.denounces_left - 1;

    // Find active challenge from accused targeting denouncer (if any)
    const challenge = db.prepare(
      "SELECT * FROM challenges WHERE executor_id = ? AND target_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
    ).get(targetId, playerId);

    if (challenge) {
      db.prepare("UPDATE challenges SET status = 'denounced' WHERE id = ?").run(challenge.id);
    }

    logEvent(roomId, 'denounce', { denouncerId: playerId, accusedId: targetId, challengeId: challenge?.id ?? null });

    const denounceEventId = uuidv4();
    db.prepare('INSERT INTO events (id, room_id, type, payload_json) VALUES (?, ?, ?, ?)').run(
      denounceEventId, roomId, 'denounce_pending',
      JSON.stringify({ denouncerId: playerId, accusedId: targetId, challengeId: challenge?.id ?? null })
    );

    const accusedSocket = findSocket(io, targetId);
    if (accusedSocket) {
      accusedSocket.emit('denounced', { denounceEventId, denouncerName: denouncer.name });
    }
    socket.emit('denounce_sent', { denounceEventId, denouncesLeft: newDenounces });
  });

  // --- ADMIT DENOUNCE ---
  socket.on('admit_denounce', ({ denounceEventId }) => {
    const { playerId, roomId } = socket.data;
    if (!playerId) return;

    const event = db.prepare("SELECT * FROM events WHERE id = ? AND type = 'denounce_pending'").get(denounceEventId);
    if (!event) return socket.emit('error', { message: 'Denuncia no encontrada' });

    const payload = JSON.parse(event.payload_json);
    if (payload.accusedId !== playerId) return socket.emit('error', { message: 'No autorizado' });

    db.prepare("UPDATE events SET type = 'denounce_resolved' WHERE id = ?").run(denounceEventId);
    logEvent(roomId, 'drink', { targetId: playerId, denounceEventId });
    logEvent(roomId, 'denounce_correct', { denouncerId: payload.denouncerId, accusedId: playerId });

    // Accused drinks
    socket.emit('drink', { executorName: null }); // anonymous drink on admit

    // Notify denouncer
    const denouncerSocket = findSocket(io, payload.denouncerId);
    const accusedPlayer = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
    if (denouncerSocket) {
      denouncerSocket.emit('denounce_resolved', { result: 'admitted', accusedName: accusedPlayer?.name });
    }

    // Assign new challenge to accused
    const newChallenge = assignChallenge(roomId, playerId);
    if (newChallenge) {
      socket.emit('new_challenge', { id: newChallenge.id, text: newChallenge.text, targetName: newChallenge.targetName });
    }
  });

  // --- DENY DENOUNCE (honor system — no mechanical consequence) ---
  socket.on('deny_denounce', ({ denounceEventId }) => {
    const { playerId, roomId } = socket.data;
    if (!playerId) return;

    const event = db.prepare("SELECT * FROM events WHERE id = ? AND type = 'denounce_pending'").get(denounceEventId);
    if (!event) return socket.emit('error', { message: 'Denuncia no encontrada' });

    const payload = JSON.parse(event.payload_json);
    if (payload.accusedId !== playerId) return socket.emit('error', { message: 'No autorizado' });

    db.prepare("UPDATE events SET type = 'denounce_resolved' WHERE id = ?").run(denounceEventId);

    // Restore challenge if it was paused by the denounce
    if (payload.challengeId) {
      db.prepare("UPDATE challenges SET status = 'pending' WHERE id = ?").run(payload.challengeId);
      const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(payload.challengeId);
      const target = challenge.target_id
        ? db.prepare('SELECT name FROM players WHERE id = ?').get(challenge.target_id)
        : null;
      socket.emit('new_challenge', { id: challenge.id, text: challenge.text, targetName: target?.name ?? null });
    }

    // Notify denouncer: denied, no mechanical consequence
    const denouncerSocket = findSocket(io, payload.denouncerId);
    const accusedPlayer = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
    if (denouncerSocket) {
      denouncerSocket.emit('denounce_resolved', { result: 'denied', accusedName: accusedPlayer?.name });
    }

    socket.emit('denounce_resolved', { result: 'denied_won' });
  });

  // --- END GAME ---
  socket.on('end_game', () => {
    const { playerId, roomId, roomCode } = socket.data;
    if (!playerId) return;
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player?.is_host) return socket.emit('error', { message: 'Solo el host puede terminar la partida' });
    db.prepare("UPDATE rooms SET status = 'ended' WHERE id = ?").run(roomId);
    io.to(roomCode).emit('game_ended', { ranking: getRanking(roomId) });
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    const { playerId } = socket.data;
    if (playerId) db.prepare('UPDATE players SET socket_id = NULL WHERE id = ?').run(playerId);
  });
}

module.exports = { registerHandlers };
