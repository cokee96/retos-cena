import { socket } from '../socket';
import { useStore } from '../store';

export default function DenounceModal() {
  const { denounceVisible, hideDenounce } = useStore();
  const { denounceEventId, denouncerName } = denounceVisible || {};

  function admit() {
    socket.emit('admit_denounce', { denounceEventId });
    hideDenounce();
  }

  function deny() {
    socket.emit('deny_denounce', { denounceEventId });
    hideDenounce();
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="card max-w-xs w-full text-center space-y-6 border-gold/50 bg-gold/5">
        <div className="text-6xl">🚨</div>
        <div>
          <h2 className="text-2xl font-black text-gold">Te han denunciado</h2>
          {denouncerName && (
            <p className="text-white/60 mt-1 text-sm">
              <span className="text-white font-semibold">{denouncerName}</span> sospecha que les estás haciendo un reto
            </p>
          )}
          <p className="text-white/50 mt-3 text-base">¿Lo admites?</p>
        </div>
        <div className="space-y-3">
          <button
            className="w-full py-4 rounded-2xl bg-accent hover:bg-accent-dark text-white font-bold text-lg transition-all"
            onClick={admit}
          >
            Sí, lo admito 🍺
          </button>
          <button
            className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg transition-all"
            onClick={deny}
          >
            No, lo niego 🙅
          </button>
        </div>
        <p className="text-white/25 text-xs">
          Tu honor está en juego
        </p>
      </div>
    </div>
  );
}
