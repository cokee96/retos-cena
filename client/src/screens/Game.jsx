import { socket } from '../socket';
import { useStore } from '../store';
import DrinkModal from '../components/DrinkModal';
import DenounceModal from '../components/DenounceModal';
import DenouncePickerModal from '../components/DenouncePickerModal';
import DenounceResultModal from '../components/DenounceResultModal';

export default function Game() {
  const {
    currentChallenge,
    players,
    playerId,
    isHost,
    drinkVisible,
    denounceVisible,
    denouncePickerVisible,
    denounceResultVisible,
    errorMessage,
    clearError,
    showDenouncePicker,
    hideDenouncePicker,
  } = useStore();

  const me = players.find(p => p.id === playerId);
  const otherPlayers = players.filter(p => p.id !== playerId);
  const canDenounce = (me?.denouncesLeft ?? 0) > 0;

  function markDone() {
    if (!currentChallenge) return;
    socket.emit('challenge_done', { challengeId: currentChallenge.id });
  }

  function endGame() {
    socket.emit('end_game');
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-sm mx-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center py-2">
        <div className="text-white/40 text-sm">
          🎯 Denuncias: <span className="text-white font-bold">{me?.denouncesLeft ?? 0}</span>
        </div>
        <div className="text-white/40 text-sm">
          👥 {players.length} jugadores
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="bg-accent/20 border border-accent rounded-2xl p-3 text-center text-sm my-2" onClick={clearError}>
          {errorMessage}
        </div>
      )}

      {/* Challenge card */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        <div className="card min-h-48 flex flex-col justify-center">
          {currentChallenge ? (
            <div className="space-y-6 text-center">
              <div className="text-4xl">🎯</div>
              <p className="text-xl font-semibold leading-relaxed">
                {currentChallenge.text}
              </p>
            </div>
          ) : (
            <div className="text-center text-white/40 space-y-3">
              <div className="text-4xl">⏳</div>
              <p>Esperando tu reto...</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            className="btn-primary"
            onClick={markDone}
            disabled={!currentChallenge}
          >
            ✓ ¡Hecho!
          </button>

          <button
            className={`btn-secondary ${!canDenounce ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={() => canDenounce && showDenouncePicker()}
            disabled={!canDenounce || otherPlayers.length === 0}
          >
            🚨 Denunciar {!canDenounce && '(sin denuncias)'}
          </button>
        </div>

        {/* Players overview */}
        <div className="card">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Jugadores</p>
          <div className="flex flex-wrap gap-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold">
                  {p.name[0].toUpperCase()}
                </div>
                <span className="text-sm">{p.name}</span>
                <span className="text-white/30 text-xs">×{p.denouncesLeft}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Host end game */}
        {isHost && (
          <button
            className="text-white/30 text-sm text-center py-2 hover:text-white/60 transition-colors"
            onClick={endGame}
          >
            Terminar partida
          </button>
        )}
      </div>

      {/* Modals */}
      {drinkVisible && <DrinkModal />}
      {denounceVisible && <DenounceModal />}
      {denouncePickerVisible && <DenouncePickerModal players={otherPlayers} onClose={hideDenouncePicker} />}
      {denounceResultVisible && <DenounceResultModal />}
    </div>
  );
}
