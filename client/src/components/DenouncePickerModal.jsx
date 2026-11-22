import { socket } from '../socket';

export default function DenouncePickerModal({ players, onClose }) {
  function denounce(targetId) {
    socket.emit('denounce', { targetId });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="card max-w-xs w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-4xl mb-2">🚨</div>
          <h2 className="text-xl font-black">¿A quién denuncias?</h2>
          <p className="text-white/40 text-sm mt-1">Crees que te están haciendo un reto</p>
        </div>
        <div className="space-y-2">
          {players.map(p => (
            <button
              key={p.id}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-accent/20 transition-all"
              onClick={() => denounce(p.id)}
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                {p.name[0].toUpperCase()}
              </div>
              <span className="font-medium">{p.name}</span>
            </button>
          ))}
        </div>
        <button className="btn-secondary py-3 text-sm" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}
