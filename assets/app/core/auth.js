import { signInBackend, signOutBackend, isBackendEnabled } from './backend.js';

const SESSION_KEY = 'ncr_academy_session_v6_production';

export async function login(email, password) {
  if (!isBackendEnabled()) {
    throw new Error('Connexion indisponible : la configuration Supabase de production est requise.');
  }
  const session = await signInBackend(email, password);
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

export function getProductionUsers() {
  return [];
}

