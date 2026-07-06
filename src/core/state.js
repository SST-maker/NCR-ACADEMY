const STATE_KEY = 'ncr_academy_state_v1';

const initialState = {
  selectedCourseId: 'communication-digitale',
  activeStudentTab: 'learning',
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

export function loadState() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STATE_KEY)) };
  } catch (_) {
    return { ...initialState };
  }
}

export function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function patchState(patch) {
  const current = loadState();
  const next = { ...current, ...patch };
  saveState(next);
  return next;
}

export function resetState() {
  localStorage.removeItem(STATE_KEY);
  return loadState();
}
