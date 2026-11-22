import { create } from 'zustand';

const SESSION_KEY = 'retos-cena-session';

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export const useStore = create((set, get) => ({
  // Session
  token: loadSession().token || null,
  playerId: loadSession().playerId || null,
  playerName: loadSession().playerName || null,
  roomCode: loadSession().roomCode || null,
  isHost: loadSession().isHost || false,

  // Room state
  roomStatus: loadSession().roomStatus || null, // 'waiting' | 'playing' | 'ended'
  players: [],
  config: {},

  // Game state
  currentChallenge: null, // { id, text, targetName }
  drinkVisible: false,
  denounceVisible: false,  // { denounceEventId, denouncerId }
  denounceResultVisible: false, // { result, ... }
  denouncePickerVisible: false,
  errorMessage: null,
  ranking: null,

  setSession: (data) => {
    const session = { ...loadSession(), ...data };
    saveSession(session);
    set(data);
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ token: null, playerId: null, playerName: null, roomCode: null, isHost: false, roomStatus: null });
  },

  setRoomState: (state) => {
    const session = { ...loadSession(), roomStatus: state.status };
    saveSession(session);
    set({ roomStatus: state.status, players: state.players, config: state.config });
  },

  setChallenge: (challenge) => set({ currentChallenge: challenge }),

  showDrink: (data) => set({ drinkVisible: data || true }),
  hideDrink: () => set({ drinkVisible: false }),

  showDenounce: (data) => set({ denounceVisible: data }),
  hideDenounce: () => set({ denounceVisible: false }),

  showDenounceResult: (data) => set({ denounceResultVisible: data }),
  hideDenounceResult: () => set({ denounceResultVisible: false }),

  showDenouncePicker: () => set({ denouncePickerVisible: true }),
  hideDenouncePicker: () => set({ denouncePickerVisible: false }),

  setError: (msg) => set({ errorMessage: msg }),
  clearError: () => set({ errorMessage: null }),

  setRanking: (ranking) => set({ ranking }),
}));
