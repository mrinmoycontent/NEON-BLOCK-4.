import { GameStatus } from './types';

export interface NavigationState {
  status: GameStatus;
  history: GameStatus[];
}

export const MAX_NAV_HISTORY = 20;

export const INITIAL_NAV_STATE: NavigationState = {
  status: 'TITLE_MENU',
  history: [],
};

function appendHistory(history: GameStatus[], entry: GameStatus): GameStatus[] {
  if (history[history.length - 1] === entry) {
    return history;
  }
  const next = [...history, entry];
  return next.length > MAX_NAV_HISTORY
    ? next.slice(next.length - MAX_NAV_HISTORY)
    : next;
}

function stripRunStates(history: GameStatus[]): GameStatus[] {
  let end = history.length;
  while (
    end > 0 &&
    (history[end - 1] === 'PLAYING' ||
      history[end - 1] === 'PAUSED' ||
      history[end - 1] === 'GAME_OVER')
  ) {
    end--;
  }
  return history.slice(0, end);
}

/**
 * Navigates to a target menu or overlay view, pushing the current state onto history.
 */
export function navigateToView(
  state: NavigationState,
  target: GameStatus
): NavigationState {
  if (target === state.status) {
    return state;
  }

  if (target === 'TITLE_MENU') {
    return { status: 'TITLE_MENU', history: [] };
  }

  if (
    state.status === 'PLAYING' &&
    (target === 'DASHBOARD' || target === 'DAILY_SCREEN')
  ) {
    // Stepping out of an active run into a menu pauses safely underneath so Escape returns to PAUSED -> PLAYING.
    const withPlay = appendHistory(state.history, 'PLAYING');
    const withPause = appendHistory(withPlay, 'PAUSED');
    return { status: target, history: withPause };
  }

  return {
    status: target,
    history: appendHistory(state.history, state.status),
  };
}

/**
 * Transitions into active gameplay while keeping the originating menu stack clean underneath.
 */
export function startGameView(state: NavigationState): NavigationState {
  const baseMenuHistory =
    state.status === 'PLAYING' ||
    state.status === 'PAUSED' ||
    state.status === 'GAME_OVER'
      ? stripRunStates(state.history)
      : appendHistory(stripRunStates(state.history), state.status);

  return {
    status: 'PLAYING',
    history: baseMenuHistory.length > 0 ? baseMenuHistory : ['TITLE_MENU'],
  };
}

/**
 * Transitions to Game Over without allowing Escape to step back into an ended board.
 */
export function enterGameOverView(state: NavigationState): NavigationState {
  const baseMenuHistory = stripRunStates(state.history);
  return {
    status: 'GAME_OVER',
    history: baseMenuHistory.length > 0 ? baseMenuHistory : ['TITLE_MENU'],
  };
}

/**
 * Toggles between PLAYING and PAUSED while keeping the history stack consistent.
 */
export function togglePauseView(state: NavigationState): NavigationState {
  if (state.status === 'PLAYING') {
    return {
      status: 'PAUSED',
      history: appendHistory(state.history, 'PLAYING'),
    };
  }

  if (state.status === 'PAUSED') {
    const nextHistory =
      state.history[state.history.length - 1] === 'PLAYING'
        ? state.history.slice(0, -1)
        : state.history;
    return {
      status: 'PLAYING',
      history: nextHistory.length > 0 ? nextHistory : ['TITLE_MENU'],
    };
  }

  return state;
}

/**
 * Returns to the previous menu state (or pauses active gameplay on Escape).
 */
export function navigateBack(state: NavigationState): NavigationState {
  if (state.status === 'TITLE_MENU') {
    return state;
  }

  if (state.status === 'PLAYING') {
    return togglePauseView(state);
  }

  if (state.history.length > 0) {
    const prev = state.history[state.history.length - 1];
    return {
      status: prev,
      history: state.history.slice(0, -1),
    };
  }

  if (state.status === 'PAUSED') {
    return { status: 'PLAYING', history: ['TITLE_MENU'] };
  }

  return { status: 'TITLE_MENU', history: [] };
}
