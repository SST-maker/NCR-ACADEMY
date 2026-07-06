const STATE_KEY = 'ncr_academy_state_v3_mobile_first';

const initialState = {
  selectedCourseId: 'communication-digitale',
  activeStudentTab: 'home',
  activeTrainerTab: 'overview',
  progress: {},
  quizScores: {},
  certificates: {},
  tickets: [
    {
      id: 'ticket-demo-1',
      status: 'ouvert',
      priority: 'normal',
      subject: 'Question sur le module de démonstration',
      message: 'Bonjour, je voudrais revoir la fiche mémo avant le quiz.',
      createdAt: new Date().toISOString(),
      author: 'Stagiaire Démo'
    }
  ]
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

export function patchState(patch) {
  const current = loadState();
  const next = Object.assign({}, current, patch || {});
  saveState(next);
  return next;
}

export function resetState() {
  localStorage.removeItem(STATE_KEY);
  return loadState();
}
