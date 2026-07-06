import { supabaseConfig, supabaseRuntime } from '../supabase.config.js';

let supabasePromise = null;

function hasValidConfig() {
  return Boolean(
    supabaseRuntime && supabaseRuntime.enabled === true &&
    supabaseConfig &&
    supabaseConfig.url &&
    supabaseConfig.anonKey &&
    supabaseConfig.url.indexOf('YOUR_') === -1 &&
    supabaseConfig.anonKey.indexOf('YOUR_') === -1
  );
}

export function isBackendEnabled() {
  return hasValidConfig();
}

export function allowDemoFallback() {
  return !hasValidConfig() || supabaseRuntime.allowDemoFallback !== false;
}

async function loadSupabase() {
  if (!hasValidConfig()) return null;
  if (!supabasePromise) {
    supabasePromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(function initSupabase(module) {
        const client = module.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        return { module, client };
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
    role: role,
    name: profile && (profile.full_name || profile.name) ? (profile.full_name || profile.name) : user.email || 'Utilisateur NCR',
    email: user.email || String(email || '').trim().toLowerCase(),
    courses: courses,
    loggedAt: new Date().toISOString(),
    backend: 'supabase'
  };
}

export async function signInBackend(email, password) {
  const sdk = await loadSupabase();
  if (!sdk) throw new Error('Supabase n’est pas encore configuré.');
  const authResponse = await sdk.client.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: password
  });
  if (authResponse.error) throw authResponse.error;
  const user = authResponse.data.user;
  const profileResponse = await sdk.client
    .from('profiles')
    .select('id, full_name, name, email, role, courses')
    .eq('id', user.id)
    .maybeSingle();
  if (profileResponse.error) throw profileResponse.error;
  const enrollmentResponse = await sdk.client
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (enrollmentResponse.error) throw enrollmentResponse.error;
  return normalizeProfile(profileResponse.data || {}, user, email, enrollmentResponse.data || []);
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
