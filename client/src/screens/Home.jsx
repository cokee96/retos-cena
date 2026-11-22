import { useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';

export default function Home() {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSession, errorMessage, clearError } = useStore();

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const { code: roomCode } = await res.json();
      setSession({ playerName: name.trim(), roomCode });
      socket.emit('join_room', { code: roomCode, name: name.trim() });
    } catch {
      useStore.getState().setError('Error al crear la sala');
    } finally {
      setLoading(false);
    }
  }

  function handleJoin() {
    if (!name.trim() || code.length !== 4) return;
    setSession({ playerName: name.trim() });
    socket.emit('join_room', { code: code.toUpperCase(), name: name.trim() });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🍺</div>
          <h1 className="text-4xl font-black tracking-tight">Retos Cena</h1>
          <p className="text-white/50">Retos secretos para cenas con amigos</p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="bg-accent/20 border border-accent rounded-2xl p-4 text-center text-sm" onClick={clearError}>
            {errorMessage}
          </div>
        )}

        {!mode && (
          <div className="space-y-3 pt-4">
            <button className="btn-primary" onClick={() => setMode('create')}>
              Crear sala
            </button>
            <button className="btn-secondary" onClick={() => setMode('join')}>
              Unirme a una sala
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <input
              className="input-field"
              placeholder="Tu nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button className="btn-primary" onClick={handleCreate} disabled={!name.trim() || loading}>
              {loading ? 'Creando...' : 'Crear sala'}
            </button>
            <button className="btn-secondary" onClick={() => setMode(null)}>Volver</button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <input
              className="input-field"
              placeholder="Tu nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <input
              className="input-field text-center text-2xl font-bold uppercase tracking-widest"
              placeholder="CÓDIGO"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button
              className="btn-primary"
              onClick={handleJoin}
              disabled={!name.trim() || code.length !== 4}
            >
              Unirme
            </button>
            <button className="btn-secondary" onClick={() => setMode(null)}>Volver</button>
          </div>
        )}
      </div>
    </div>
  );
}
