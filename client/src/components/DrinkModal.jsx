import { useStore } from '../store';

export default function DrinkModal() {
  const { drinkVisible, hideDrink } = useStore();
  const executorName = typeof drinkVisible === 'object' ? drinkVisible.executorName : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={hideDrink}>
      <div className="card max-w-xs w-full text-center space-y-6 border-accent/50 bg-accent/10" onClick={e => e.stopPropagation()}>
        <div className="text-7xl animate-bounce">🍺</div>
        <div>
          <h2 className="text-3xl font-black text-accent">¡Bebe!</h2>
          {executorName ? (
            <p className="text-white/70 mt-2 text-lg">
              <span className="text-white font-bold">{executorName}</span> ha completado un reto contigo
            </p>
          ) : (
            <p className="text-white/50 mt-2">Alguien ha completado un reto contigo</p>
          )}
        </div>
        <button className="btn-primary" onClick={hideDrink}>
          ¡Salud! 🥂
        </button>
      </div>
    </div>
  );
}
