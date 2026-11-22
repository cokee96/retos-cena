import { useEffect } from 'react';
import { useStore } from './store';
import { socket } from './socket';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import Game from './screens/Game';
import Ranking from './screens/Ranking';

export default function App() {
  const { token, roomCode, roomStatus, setSession, setRoomState, setChallenge, showDrink, showDenounce, showDenounceResult, setRanking, setError } = useStore();

  useEffect(() => {
    socket.connect();

    // If we have a saved session, attempt reconnect
    if (token && roomCode) {
      socket.emit('reconnect_player', { token });
    }

    socket.on('joined', ({ token: t, playerId, isHost }) => {
      setSession({ token: t, playerId, isHost });
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
      useStore.setState({ roomCode: state.code });
      const session = JSON.parse(localStorage.getItem('retos-cena-session') || '{}');
      if (session.roomCode !== state.code) {
        const store = useStore.getState();
        store.setSession({ roomCode: state.code });
      }
    });

    socket.on('game_started', () => {
      useStore.setState({ roomStatus: 'playing' });
    });

    socket.on('new_challenge', (challenge) => {
      setChallenge(challenge);
    });

    socket.on('drink', (data) => {
      showDrink(data); // data = { executorName } or empty
    });

    socket.on('denounced', (data) => {
      showDenounce(data); // data = { denounceEventId, denouncerName }
    });

    socket.on('denounce_resolved', (data) => {
      showDenounceResult(data);
    });

    socket.on('game_ended', ({ ranking }) => {
      useStore.setState({ roomStatus: 'ended' });
      setRanking(ranking);
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => useStore.getState().clearError(), 4000);
    });

    return () => {
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
