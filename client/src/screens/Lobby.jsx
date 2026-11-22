import { useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';

const CATEGORIES = [
  { id: 'conversation', label: '💬 Conversación' },
  { id: 'physical', label: '🏃 Físico' },
  { id: 'daring', label: '🔥 Atrevido' },
  { id: 'innocent', label: '😇 Inocente' },
  { id: 'group', label: '🍺 Grupales' },
];

export default function Lobby() {
  const { roomCode, players, config, isHost, errorMessage, clearError, clearSession } = useStore();
  const [showConfig, setShowConfig] = useState(false);
  const [localCategories, setLocalCategories] = useState(
    config.categories || ['conversation', 'physical', 'daring', 'innocent', 'group']
  );
  const [localDenounces, setLocalDenounces] = useState(config.maxDenounces ?? 3);

  function toggleCategory(id) {
    if (localCategories.includes(id)) {
      if (localCategories.length === 1) return; // at least 1 required
      setLocalCategories(localCategories.filter(c => c !== id));
    } else {
      setLocalCategories([...localCategories, id]);
    }
  }

  function saveConfig() {
    socket.emit('update_config', { categories: localCategories, maxDenounces: localDenounces });
    setShowConfig(false);
  }

  function startGame() {
    socket.emit('start_game');
  }

  function leaveRoom() {
    clearSession();
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center space-y-1 pt-4 pb-6">
        <p className="text-white/50 text-sm uppercase tracking-widest">Sala</p>
        <h1 className="text-5xl font-black tracking-widest text-accent">{roomCode}</h1>
        <p className="text-white/40 text-sm">Comparte este código con tus amigos</p>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="bg-accent/20 border border-accent rounded-2xl p-3 text-center text-sm mb-4" onClick={clearError}>
          {errorMessage}
        </div>
      )}

      {/* Players list */}
      <div className="card flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Jugadores</h2>
          <span className="text-white/40 text-sm">{players.length} en sala</span>
        </div>
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold">
                {p.name[0].toUpperCase()}
              </div>
              <span className="font-medium">{p.name}</span>
              {p.isHost && <span className="ml-auto text-xs text-gold bg-gold/10 px-2 py-1 rounded-full">Host</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Config (host only) */}
      {isHost && (
        <div className="mt-4">
          {!showConfig ? (
            <button className="btn-secondary text-sm py-3" onClick={() => setShowConfig(true)}>
              ⚙️ Configurar partida
            </button>
          ) : (
            <div className="card space-y-5">
              <h3 className="font-bold">Configuración</h3>
              <div className="space-y-2">
                <p className="text-white/50 text-sm">Categorías</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        localCategories.includes(cat.id)
                          ? 'bg-accent text-white'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white/50 text-sm">Denuncias por jugador: <strong className="text-white">{localDenounces}</strong></p>
                <input
                  type="range" min="1" max="10" value={localDenounces}
                  onChange={e => setLocalDenounces(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
              <div className="flex gap-3">
                <button className="btn-primary py-3 text-base" onClick={saveConfig}>Guardar</button>
                <button className="btn-secondary py-3 text-base" onClick={() => setShowConfig(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 space-y-3">
        {isHost && (
          <button className="btn-primary" onClick={startGame} disabled={players.length < 2}>
            {players.length < 2 ? 'Esperando jugadores...' : '¡Empezar!'}
          </button>
        )}
        {!isHost && (
          <div className="text-center text-white/40 text-sm py-4 animate-pulse">
            Esperando a que el host inicie la partida...
          </div>
        )}
        <button className="btn-secondary text-sm py-3" onClick={leaveRoom}>
          Salir
        </button>
      </div>
    </div>
  );
}
