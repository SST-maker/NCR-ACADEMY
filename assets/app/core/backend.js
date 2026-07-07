import { supabaseConfig, supabaseRuntime } from '../supabase.config.js';

let supabasePromise = null;

function clean(value) {
  return String(value || '').trim();
}

function getSupabaseUrl() {
  return clean(supabaseConfig && supabaseConfig.url);
}

function getSupabaseKey() {
  const candidates = [
    supabaseConfig && supabaseConfig.anonKey,
    supabaseConfig && supabaseConfig.publishableKey,
    supabaseConfig && supabaseConfig.apiKey,
    supabaseConfig && supabaseConfig.key
  ];
  for (const candidate of candidates) {
    const value = clean(candidate);
    if (value) return value;
  }
  return '';
}

function isPlaceholder(value) {
  const cleanValue = clean(value).toUpperCase();
  return !cleanValue || cleanValue.includes('YOUR_') || cleanValue.includes('TON_') || cleanValue.includes('SUPABASE_URL') || cleanValue.includes('SUPABASE_KEY');
}

function getConfigStatus() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  const enabled = Boolean(supabaseRuntime && supabaseRuntime.enabled === true);
  return {
    enabled,
    url,
    key,
    hasUrl: Boolean(url) && !isPlaceholder(url),
    hasKey: Boolean(key) && !isPlaceholder(key),
    allowDemoFallback: supabaseRuntime ? supabaseRuntime.allowDemoFallback !== false : true,
    keyStart: key ? key.slice(0, 18) : '',
    urlHost: url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''
  };
}

function hasValidConfig() {
  const status = getConfigStatus();
  return Boolean(status.enabled && status.hasUrl && status.hasKey);
}

export function isBackendEnabled() {
  return hasValidConfig();
}

export function allowDemoFallback() {
  return !hasValidConfig() || (supabaseRuntime && supabaseRuntime.allowDemoFallback !== false);
}

function readableSupabaseError(error) {
  if (!error) return 'Erreur inconnue.';
  const message = error.message || String(error);
  const code = error.code ? ` (${error.code})` : '';
  const status = error.status ? ` — HTTP ${error.status}` : '';
  const details = error.details ? ` — ${error.details}` : '';
  const hint = error.hint ? ` — ${error.hint}` : '';
  return `${message}${code}${status}${details}${hint}`;
}

async function loadSupabase() {
  if (!hasValidConfig()) return null;
  if (!supabasePromise) {
    const status = getConfigStatus();
    supabasePromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(function initSupabase(module) {
        const client = module.createClient(status.url, status.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'ncr-academy-supabase-auth-v52'
          },
          global: {
            headers: {
              apikey: status.key,
              Authorization: `Bearer ${status.key}`,
              'x-client-info': 'ncr-academy-pwa-v5-2'
            }
          }
        });
        return { module, client, status };
      });
  }
  return supabasePromise;
}

function normalizeCourses(value) {
  if (Array.isArray(value) && value.length) return value;
  return supabaseRuntime.defaultCourses.slice();
}

function normalizeProfile(profile, user, email, enrollmentRows) {
  const enrollmentCourses = Array.isArray(enrollmentRows)
    ? enrollmentRows.map(function toCourse(row) { return row.course_id; }).filter(Boolean)
    : [];
  const profileCourses = profile && Array.isArray(profile.courses) ? profile.courses : [];
  const courses = normalizeCourses(enrollmentCourses.length ? enrollmentCourses : profileCourses);
  const role = profile && profile.role === 'trainer' ? 'trainer' : 'student';
  return {
    id: user.id,
    role,
    name: profile && (profile.full_name || profile.name) ? (profile.full_name || profile.name) : user.email || 'Utilisateur NCR',
    email: user.email || String(email || '').trim().toLowerCase(),
    courses,
    loggedAt: new Date().toISOString(),
    backend: 'supabase'
  };
}

async function fetchProfile(client, user) {
  const mainQuery = await client
    .from('profiles')
    .select('id, full_name, name, email, role, courses')
    .eq('id', user.id)
    .maybeSingle();

  if (!mainQuery.error) return mainQuery.data;

  const minimalQuery = await client
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (minimalQuery.error) {
    throw new Error(`Profil Supabase inaccessible : ${readableSupabaseError(mainQuery.error)} / ${readableSupabaseError(minimalQuery.error)}`);
  }
  return minimalQuery.data;
}

async function fetchEnrollments(client, user) {
  const enrollmentResponse = await client
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (enrollmentResponse.error) {
    console.warn('Inscriptions Supabase non lisibles, cours par défaut utilisés.', enrollmentResponse.error);
    return [];
  }
  return enrollmentResponse.data || [];
}

export function getBackendDiagnosticSnapshot() {
  const status = getConfigStatus();
  return {
    version: '5.2',
    enabled: status.enabled,
    validConfig: hasValidConfig(),
    allowDemoFallback: status.allowDemoFallback,
    urlHost: status.urlHost,
    keyDetected: status.hasKey,
    keyStart: status.keyStart,
    message: hasValidConfig()
      ? 'Configuration Supabase détectée côté application.'
      : 'Supabase non activé ou URL/clé manquante dans assets/app/supabase.config.js.'
  };
}

export async function testBackendConnection(email, password) {
  const snapshot = getBackendDiagnosticSnapshot();
  if (!hasValidConfig()) return Object.assign(snapshot, { ok: false });
  try {
    const sdk = await loadSupabase();
    const result = await sdk.client.auth.signInWithPassword({
      email: String(email || '').trim().toLowerCase(),
      password
    });
    if (result.error) {
      return Object.assign(snapshot, { ok: false, step: 'auth', error: readableSupabaseError(result.error) });
    }
    const user = result.data && result.data.user ? result.data.user : null;
    if (!user) return Object.assign(snapshot, { ok: false, step: 'auth', error: 'Connexion acceptée mais utilisateur introuvable.' });
    const profile = await fetchProfile(sdk.client, user);
    if (!profile) {
      return Object.assign(snapshot, { ok: false, step: 'profile', userId: user.id, error: `Profil absent dans public.profiles pour l’UID ${user.id}.` });
    }
    return Object.assign(snapshot, { ok: true, step: 'ready', userId: user.id, email: user.email, role: profile.role, profileFound: true });
  } catch (error) {
    return Object.assign(snapshot, { ok: false, step: 'exception', error: error && error.message ? error.message : String(error) });
  }
}

export async function signInBackend(email, password) {
  const sdk = await loadSupabase();
  if (!sdk) {
    const status = getConfigStatus();
    throw new Error(`Supabase non configuré : enabled=${status.enabled}, url=${status.hasUrl ? 'OK' : 'manquante'}, clé=${status.hasKey ? 'OK' : 'manquante'}.`);
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  const authResponse = await sdk.client.auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  if (authResponse.error) {
    throw new Error(`Auth Supabase : ${readableSupabaseError(authResponse.error)}`);
  }

  const user = authResponse.data && authResponse.data.user ? authResponse.data.user : null;
  if (!user || !user.id) throw new Error('Auth Supabase : utilisateur connecté introuvable.');

  const profile = await fetchProfile(sdk.client, user);
  if (!profile) {
    throw new Error(`Profil absent : crée une ligne dans public.profiles avec id = ${user.id}, email = ${cleanEmail} et role = trainer ou student.`);
  }

  if (profile.role !== 'trainer' && profile.role !== 'student') {
    throw new Error(`Rôle invalide dans profiles.role : ${profile.role}. Valeurs attendues : trainer ou student.`);
  }

  const enrollments = await fetchEnrollments(sdk.client, user);
  return normalizeProfile(profile, user, cleanEmail, enrollments);
}

export async function signOutBackend() {
  const sdk = await loadSupabase();
  if (!sdk) return;
  await sdk.client.auth.signOut();
}

export async function loadRemoteState(session) {
  if (!hasValidConfig() || !session || !session.id) return null;
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('user_states')
    .select('state')
    .eq('user_id', session.id)
    .maybeSingle();
  if (response.error) throw response.error;
  return response.data && response.data.state ? response.data.state : null;
}

export async function saveRemoteState(session, state, reason) {
  if (!hasValidConfig() || !session || !session.id) return false;
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('user_states')
    .upsert({
      user_id: session.id,
      email: session.email,
      role: session.role,
      state: state,
      reason: reason || 'sync',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  if (response.error) throw response.error;
  return true;
}

export async function recordRemoteEvent(session, event) {
  if (!hasValidConfig() || !session || !session.id || !event) return false;
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('tracking_events')
    .insert({
      id: event.id || (crypto.randomUUID ? crypto.randomUUID() : `${session.id}-${Date.now()}`),
      user_id: session.id,
      email: session.email,
      role: session.role,
      type: event.type,
      payload: event.payload || {},
      created_at: event.createdAt || new Date().toISOString(),
      url: event.url || location.href,
      user_agent: event.userAgent || navigator.userAgent
    });
  if (response.error) throw response.error;
  return true;
}

export async function createRemoteTicket(session, ticket) {
  if (!hasValidConfig() || !session || !session.id || !ticket) return false;
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('tickets')
    .insert({
      id: ticket.id,
      author_id: session.id,
      author_name: session.name,
      author_email: session.email,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status || 'ouvert',
      priority: ticket.priority || 'normal',
      created_at: ticket.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  if (response.error) throw response.error;
  return true;
}

async function signedDocumentUrl(client, document) {
  const bucket = document.bucket || (document.visibility === 'course' ? 'livrets-formation' : 'documents-prives');
  const path = document.storage_path || document.storagePath || '';
  if (!path) return '';
  const signed = await client.storage.from(bucket).createSignedUrl(path, 3600);
  if (signed.error) return '';
  return signed.data && signed.data.signedUrl ? signed.data.signedUrl : '';
}

export async function listRemoteDocuments(session) {
  if (!hasValidConfig() || !session || !session.id) return [];
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('training_documents')
    .select('id, title, name, type, course_id, target_user_id, bucket, storage_path, status, visibility, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (response.error) throw response.error;
  const rows = response.data || [];
  const items = [];
  for (const row of rows) {
    const downloadUrl = await signedDocumentUrl(sdk.client, row);
    items.push(Object.assign({}, row, {
      downloadUrl: downloadUrl,
      name: row.name || row.title || 'Document Supabase',
      status: row.visibility === 'user' ? 'Document personnel sécurisé' : 'Document lié à la formation'
    }));
  }
  return items;
}

export async function listRemoteUsers(session) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') return [];
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('profiles')
    .select('id, full_name, name, email, role')
    .order('full_name', { ascending: true });
  if (response.error) throw response.error;
  return (response.data || []).map(function normalizeUser(user) {
    return {
      id: user.id,
      name: user.full_name || user.name || user.email || 'Utilisateur',
      email: user.email || '',
      role: user.role || 'student'
    };
  });
}

function sanitizeFileName(name) {
  return String(name || 'document.pdf')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export async function uploadRemoteDocument(session, payload) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Upload réservé au formateur connecté.');
  if (!payload || !payload.file) throw new Error('Aucun fichier sélectionné.');
  const sdk = await loadSupabase();
  const title = String(payload.title || payload.file.name || 'Document de formation').trim();
  const type = String(payload.type || 'document').trim();
  const courseId = String(payload.courseId || '').trim();
  const targetUserId = String(payload.targetUserId || '').trim();
  const personalTypes = ['convocation', 'attestation'];
  if (personalTypes.indexOf(type) !== -1 && !targetUserId) throw new Error('Une convocation ou une attestation doit être affectée à un stagiaire.');
  const visibility = targetUserId ? 'user' : 'course';
  const bucket = visibility === 'user' ? 'documents-prives' : 'livrets-formation';
  if (visibility === 'course' && !courseId) throw new Error('Choisis une formation pour un livret ou document partagé.');
  const safeName = sanitizeFileName(payload.file.name);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const storagePath = visibility === 'user'
    ? `${targetUserId}/${type}/${stamp}-${safeName}`
    : `${courseId}/${type}/${stamp}-${safeName}`;
  const uploadResponse = await sdk.client.storage
    .from(bucket)
    .upload(storagePath, payload.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: payload.file.type || 'application/octet-stream'
    });
  if (uploadResponse.error) throw uploadResponse.error;
  const insertResponse = await sdk.client
    .from('training_documents')
    .insert({
      title: title,
      name: title,
      type: type,
      course_id: courseId || null,
      target_user_id: targetUserId || null,
      bucket: bucket,
      storage_path: storagePath,
      status: 'active',
      visibility: visibility,
      created_by: session.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  if (insertResponse.error) throw insertResponse.error;
  return insertResponse.data;
}
