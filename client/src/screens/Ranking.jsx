import { useStore } from '../store';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const { ranking, clearSession } = useStore();

  function playAgain() {
    clearSession();
    window.location.reload();
  }

  if (!ranking || ranking.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">🏁</div>
          <h1 className="text-3xl font-black">¡Partida terminada!</h1>
          <button className="btn-primary mt-6" onClick={playAgain}>Jugar de nuevo</button>
        </div>
      </div>
    );
  }

  const mvp = ranking.reduce((best, p) => (!best || p.completed > best.completed ? p : best), null);

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-sm mx-auto">
      <div className="text-center space-y-2 py-6">
        <div className="text-5xl">🏆</div>
        <h1 className="text-3xl font-black">Ranking Final</h1>
      </div>

      {/* MVP badge */}
      {mvp && (
        <div className="card bg-gold/10 border-gold/30 text-center mb-4 space-y-1">
          <p className="text-gold text-xs uppercase tracking-widest">Jugador del año</p>
          <p className="text-2xl font-black">{mvp.name}</p>
          <p className="text-white/50 text-sm">{mvp.completed} retos sin ser pillado</p>
        </div>
      )}

      {/* Ranking list */}
      <div className="space-y-3 flex-1">
        {ranking.map((player, i) => (
          <div key={player.name} className="card flex items-center gap-4">
            <span className="text-2xl w-8 text-center">{MEDALS[i] || `${i + 1}`}</span>
            <div className="flex-1">
              <p className="font-bold text-lg">{player.name}</p>
              <div className="flex gap-3 text-sm text-white/50 mt-1 flex-wrap">
                <span>✅ {player.completed} retos</span>
                <span>🍺 {player.drinks} tragos</span>
                <span>🎯 {player.denouncesCorrect}✓ / {player.denouncesFailed}✗</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 space-y-3">
        <button className="btn-primary" onClick={playAgain}>
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}
