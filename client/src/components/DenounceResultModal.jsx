import { useStore } from '../store';

export default function DenounceResultModal() {
  const { denounceResultVisible, hideDenounceResult } = useStore();
  const data = denounceResultVisible;
  if (!data) return null;

  const { result, accusedName } = data;

  const content = {
    admitted: {
      emoji: '✅',
      title: '¡Denuncia correcta!',
      text: `${accusedName} lo ha admitido y bebe`,
      color: 'border-green-500/50 bg-green-500/10',
      titleColor: 'text-green-400',
    },
    denied: {
      emoji: '🙅',
      title: 'Denuncia rechazada',
      text: `${accusedName} lo ha negado. Cuestión de honor.`,
      color: 'border-white/20 bg-white/5',
      titleColor: 'text-white',
    },
    denied_won: {
      emoji: '😎',
      title: '¡Denuncia rechazada!',
      text: 'Negado. Que cargue con ello en su conciencia.',
      color: 'border-green-500/50 bg-green-500/10',
      titleColor: 'text-green-400',
    },
  }[result] || {};

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={hideDenounceResult}>
      <div className={`card max-w-xs w-full text-center space-y-5 ${content.color}`} onClick={e => e.stopPropagation()}>
        <div className="text-6xl">{content.emoji}</div>
        <div>
          <h2 className={`text-2xl font-black ${content.titleColor}`}>{content.title}</h2>
          <p className="text-white/60 mt-2 text-sm">{content.text}</p>
        </div>
        <button className="btn-primary" onClick={hideDenounceResult}>OK</button>
      </div>
    </div>
  );
}
