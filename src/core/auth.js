const USERS = [
  {
    id: 'stu-demo-001',
    role: 'student',
    name: 'Stagiaire Démo',
    email: 'stagiaire@ncr.demo',
    password: 'ncr2026',
    courses: ['communication-digitale', 'outils-bureautiques', 'litiges-clients', 'community-manager', 'acteur-sst']
  },
  {
    id: 'trainer-demo-001',
    role: 'trainer',
    name: 'Formateur NCR',
    email: 'formateur@ncr.demo',
    password: 'ncr2026',
    courses: ['communication-digitale', 'outils-bureautiques', 'litiges-clients', 'community-manager', 'acteur-sst']
  }
];

const SESSION_KEY = 'ncr_academy_session_v3';

export function login(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = USERS.find(function findUser(item) {
    return item.email === normalized && item.password === password;
  });
  if (!user) {
    throw new Error('Identifiants invalides. Essaie stagiaire@ncr.demo ou formateur@ncr.demo avec le mot de passe ncr2026.');
  }
  const session = {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    courses: user.courses.slice(),
    loggedAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (_) {
    return null;
  }
}

export function getDemoUsers() {
  return USERS.map(function sanitizeUser(user) {
    return {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      courses: user.courses.slice()
    };
  });
}
