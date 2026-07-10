const STATE_KEY = 'ncr_academy_state_v6_production';

const initialState = {
  selectedCourseId: 'communication-digitale',
  activeStudentTab: 'home',
  activeTrainerTab: 'overview',
  progress: {},
  quizScores: {},
  certificates: {},
  tickets: []
};

function copyInitialState() {
  return JSON.parse(JSON.stringify(initialState));
}

export function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STATE_KEY));
    return Object.assign(copyInitialState(), stored || {});
  } catch (_) {
    return copyInitialState();
  }
}

export function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function replaceState(nextState) {
  const merged = Object.assign(copyInitialState(), nextState || {});
  saveState(merged);
  return merged;
}

export function patchState(patch) {
  const current = loadState();
  const next = Object.assign(current, patch || {});
  saveState(next);
  return next;
}
