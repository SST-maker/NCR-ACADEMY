import { signInBackend, signOutBackend, isBackendEnabled, allowDemoFallback } from './backend.js';

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

const SESSION_KEY = 'ncr_academy_session_v5_supabase';

function localLogin(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = USERS.find(function findUser(item) {
    return item.email === normalized && item.password === password;
  });
  if (!user) {
    throw new Error('Identifiants invalides. En mode démo : stagiaire@ncr.demo ou formateur@ncr.demo avec le mot de passe ncr2026.');
  }
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    courses: user.courses.slice(),
    loggedAt: new Date().toISOString(),
    backend: 'local-demo'
  };
}

function isDemoCredential(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return USERS.some(function matchDemo(user) { return user.email === normalized; });
}

export async function login(email, password) {
  let session;
  if (isBackendEnabled()) {
    try {
      session = await signInBackend(email, password);
    } catch (error) {
      // Ancienne version : l’erreur Supabase était masquée par le fallback démo.
      // V5.2 : pour un vrai email, on affiche la vraie erreur afin de diagnostiquer proprement.
      if (!allowDemoFallback() || !isDemoCredential(email)) {
        throw new Error(error && error.message ? error.message : 'Connexion Supabase refusée.');
      }
      session = localLogin(email, password);
      session.backendWarning = 'Supabase configuré mais connexion refusée : fallback démo activé.';
    }
  } else {
    session = localLogin(email, password);
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function logout() {
  try {
    if (isBackendEnabled()) await signOutBackend();
  } finally {
    localStorage.removeItem(SESSION_KEY);
  }
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
