import { useEffect } from 'react';
import { useStore } from './store';
import { socket } from './socket';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import Game from './screens/Game';
import Ranking from './screens/Ranking';

export default function App() {
  const { token, roomCode, roomStatus, setSession, setRoomState, setChallenge, showDrink, showDenounce, showDenounceResult, setRanking, setError, clearSession } = useStore();

  useEffect(() => {
    socket.connect();

    // Re-emit reconnect_player on every connect/reconnect so socket.data stays populated on the server
    function handleConnect() {
      const { token: t, roomCode: rc } = useStore.getState();
      if (t && rc) socket.emit('reconnect_player', { token: t });
    }

    socket.on('connect', handleConnect);

    socket.on('reconnect_failed', () => {
      clearSession();
    });

    socket.on('joined', ({ token: t, playerId, isHost }) => {
      setSession({ token: t, playerId, isHost });
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
      const store = useStore.getState();
      if (store.roomCode !== state.code) store.setSession({ roomCode: state.code });
    });

    socket.on('game_started', () => {
      useStore.getState().setSession({ roomStatus: 'playing' });
    });

    socket.on('new_challenge', (challenge) => {
      setChallenge(challenge);
    });

    socket.on('drink', (data) => {
      showDrink(data);
    });

    socket.on('denounced', (data) => {
      showDenounce(data);
    });

    socket.on('denounce_resolved', (data) => {
      showDenounceResult(data);
    });

    socket.on('game_ended', ({ ranking }) => {
      useStore.getState().setSession({ roomStatus: 'ended' });
      setRanking(ranking);
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => useStore.getState().clearError(), 4000);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('reconnect_failed');
      socket.off('joined');
      socket.off('room_state');
      socket.off('game_started');
      socket.off('new_challenge');
      socket.off('drink');
      socket.off('denounced');
      socket.off('denounce_resolved');
      socket.off('game_ended');
      socket.off('error');
    };
  }, []);

  if (roomStatus === 'ended') return <Ranking />;
  if (roomStatus === 'playing') return <Game />;
  if (roomCode && roomStatus === 'waiting') return <Lobby />;
  return <Home />;
}
