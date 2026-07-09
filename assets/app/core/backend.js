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

function createRestBuilder(client, table) {
  const state = {
    table,
    op: 'select',
    columns: '*',
    filters: [],
    orderBy: null,
    ascending: true,
    body: null,
    singular: false,
    maybe: false,
    onConflict: ''
  };

  function encodeColumns(columns) {
    return String(columns || '*').replace(/\s+/g, '');
  }

  function buildQuery() {
    const params = new URLSearchParams();
    if (state.op === 'select') params.set('select', encodeColumns(state.columns));
    if ((state.op === 'insert' || state.op === 'upsert') && state.columns) params.set('select', encodeColumns(state.columns));
    if (state.orderBy) params.set('order', `${state.orderBy}.${state.ascending ? 'asc' : 'desc'}`);
    if (state.onConflict) params.set('on_conflict', state.onConflict);
    state.filters.forEach(function filter(item) {
      params.append(item.column, `eq.${String(item.value)}`);
    });
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  function headers(extra) {
    const token = client.getAccessToken();
    return Object.assign({
      apikey: client.key,
      Authorization: `Bearer ${token || client.key}`,
      'Content-Type': 'application/json',
      Prefer: state.singular ? 'return=representation' : 'return=representation'
    }, extra || {});
  }

  async function execute() {
    let method = 'GET';
    let body;
    const extraHeaders = {};

    if (state.op === 'insert') {
      method = 'POST';
      body = JSON.stringify(state.body);
    } else if (state.op === 'upsert') {
      method = 'POST';
      body = JSON.stringify(state.body);
      extraHeaders.Prefer = 'resolution=merge-duplicates,return=representation';
    } else if (state.op === 'update') {
      method = 'PATCH';
      body = JSON.stringify(state.body);
    }

    if (state.singular) {
      extraHeaders.Accept = 'application/vnd.pgrst.object+json';
    }

    const url = `${client.url}/rest/v1/${state.table}${buildQuery()}`;
    const response = await fetch(url, { method, headers: headers(extraHeaders), body });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = raw; }

    if (!response.ok) {
      if (state.maybe && response.status === 406) return { data: null, error: null };
      const error = data && typeof data === 'object' ? data : { message: raw || response.statusText };
      error.status = response.status;
      return { data: null, error };
    }

    if (state.maybe && Array.isArray(data)) {
      return { data: data.length ? data[0] : null, error: null };
    }
    if (state.singular && Array.isArray(data)) {
      return { data: data.length ? data[0] : null, error: null };
    }
    return { data, error: null };
  }

  const builder = {
    select(columns) {
      state.op = state.op === 'select' ? 'select' : state.op;
      state.columns = columns || '*';
      return builder;
    },
    eq(column, value) {
      state.filters.push({ column, value });
      return builder;
    },
    order(column, options) {
      state.orderBy = column;
      state.ascending = !(options && options.ascending === false);
      return builder;
    },
    insert(body) {
      state.op = 'insert';
      state.body = body;
      return builder;
    },
    upsert(body, options) {
      state.op = 'upsert';
      state.body = body;
      state.onConflict = options && options.onConflict ? options.onConflict : '';
      return builder;
    },
    update(body) {
      state.op = 'update';
      state.body = body;
      return builder;
    },
    maybeSingle() {
      state.maybe = true;
      state.singular = true;
      return execute();
    },
    single() {
      state.singular = true;
      return execute();
    },
    then(resolve, reject) {
      return execute().then(resolve, reject);
    },
    catch(reject) {
      return execute().catch(reject);
    }
  };
  return builder;
}

function createRestClient(status) {
  const sessionKey = 'ncr-academy-supabase-rest-auth-v53';
  let accessToken = '';
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    accessToken = saved && saved.access_token ? saved.access_token : '';
  } catch (_) {
    accessToken = '';
  }

  const client = {
    url: status.url.replace(/\/$/, ''),
    key: status.key,
    getAccessToken() {
      return accessToken;
    },
    auth: {
      async signInWithPassword(credentials) {
        try {
          const response = await fetch(`${client.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              apikey: client.key,
              Authorization: `Bearer ${client.key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });
          const raw = await response.text();
          let data = null;
          try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = { message: raw }; }
          if (!response.ok) {
            const error = data && typeof data === 'object' ? data : { message: raw || response.statusText };
            error.status = response.status;
            return { data: null, error };
          }
          accessToken = data && data.access_token ? data.access_token : '';
          try { localStorage.setItem(sessionKey, JSON.stringify(data)); } catch (_) {}
          return { data: { user: data.user, session: data }, error: null };
        } catch (error) {
          return { data: null, error: { message: error && error.message ? error.message : String(error) } };
        }
      },
      async signOut() {
        accessToken = '';
        try { localStorage.removeItem(sessionKey); } catch (_) {}
        return { error: null };
      }
    },
    from(table) {
      return createRestBuilder(client, table);
    },
    storage: {
      from(bucket) {
        return {
          async createSignedUrl(path, expiresIn) {
            const token = client.getAccessToken();
            const safePath = String(path || '').split('/').map(encodeURIComponent).join('/');
            const response = await fetch(`${client.url}/storage/v1/object/sign/${bucket}/${safePath}`, {
              method: 'POST',
              headers: {
                apikey: client.key,
                Authorization: `Bearer ${token || client.key}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ expiresIn: expiresIn || 3600 })
            });
            const data = await response.json().catch(function fallback() { return null; });
            if (!response.ok) return { data: null, error: data || { message: response.statusText, status: response.status } };
            const signedPath = data && (data.signedURL || data.signedUrl);
            const signedUrl = signedPath ? (signedPath.startsWith('http') ? signedPath : `${client.url}/storage/v1${signedPath}`) : '';
            return { data: { signedUrl }, error: null };
          },
          async upload(path, file, options) {
            const token = client.getAccessToken();
            const safePath = String(path || '').split('/').map(encodeURIComponent).join('/');
            const response = await fetch(`${client.url}/storage/v1/object/${bucket}/${safePath}`, {
              method: 'POST',
              headers: {
                apikey: client.key,
                Authorization: `Bearer ${token || client.key}`,
                'Content-Type': (options && options.contentType) || (file && file.type) || 'application/octet-stream',
                'x-upsert': options && options.upsert ? 'true' : 'false'
              },
              body: file
            });
            const raw = await response.text();
            let data = null;
            try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = raw; }
            if (!response.ok) return { data: null, error: data || { message: raw || response.statusText, status: response.status } };
            return { data, error: null };
          }
        };
      }
    }
  };
  return client;
}

async function loadSupabase() {
  if (!hasValidConfig()) return null;
  if (!supabasePromise) {
    const status = getConfigStatus();
    supabasePromise = Promise.resolve({
      module: null,
      client: createRestClient(status),
      status,
      mode: 'rest-no-cdn'
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
    version: '5.3.3',
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

export async function listRemoteTickets(session) {
  if (!hasValidConfig() || !session || !session.id) return [];
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('tickets')
    .select('id, author_id, author_name, author_email, subject, message, status, priority, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (response.error) throw response.error;

  const repliesResponse = await sdk.client
    .from('ticket_replies')
    .select('id, ticket_id, author_id, author_name, author_email, author_role, message, created_at')
    .order('created_at', { ascending: true });
  if (repliesResponse.error) throw repliesResponse.error;

  const repliesByTicket = new Map();
  (repliesResponse.data || []).forEach(function mapReply(reply) {
    if (!repliesByTicket.has(reply.ticket_id)) repliesByTicket.set(reply.ticket_id, []);
    repliesByTicket.get(reply.ticket_id).push({
      id: reply.id,
      ticketId: reply.ticket_id,
      authorId: reply.author_id,
      authorName: reply.author_name || '',
      authorEmail: reply.author_email || '',
      authorRole: reply.author_role || 'trainer',
      message: reply.message || '',
      createdAt: reply.created_at
    });
  });

  return (response.data || []).map(function normalizeTicket(ticket) {
    return {
      id: ticket.id,
      authorId: ticket.author_id,
      authorName: ticket.author_name || '',
      authorEmail: ticket.author_email || '',
      subject: ticket.subject || 'Ticket',
      message: ticket.message || '',
      status: ticket.status || 'ouvert',
      priority: ticket.priority || 'normal',
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      replies: repliesByTicket.get(ticket.id) || []
    };
  });
}

export async function updateRemoteTicketStatus(session, ticketId, status) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Mise à jour réservée au formateur connecté.');
  const cleanStatus = String(status || 'ouvert');
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('tickets')
    .update({
      status: cleanStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .select()
    .single();
  if (response.error) throw new Error(`Mise à jour ticket : ${readableSupabaseError(response.error)}`);
  return response.data;
}


export async function createRemoteTicketReply(session, ticketId, message) {
  if (!hasValidConfig() || !session || !session.id) throw new Error('Réponse réservée aux utilisateurs connectés.');
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) throw new Error('La réponse ne peut pas être vide.');
  const sdk = await loadSupabase();
  const response = await sdk.client
    .from('ticket_replies')
    .insert({
      ticket_id: ticketId,
      author_id: session.id,
      author_name: session.name || session.email || (session.role === 'trainer' ? 'Formateur' : 'Stagiaire'),
      author_email: session.email || '',
      author_role: session.role === 'trainer' ? 'trainer' : 'student',
      message: cleanMessage,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  if (response.error) throw new Error(`Réponse ticket : ${readableSupabaseError(response.error)}`);
  return response.data;
}

export async function createRemoteStudent(session, payload) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Création réservée au formateur connecté.');
  const sdk = await loadSupabase();
  const email = clean(payload && payload.email).toLowerCase();
  const password = String(payload && payload.password || '').trim();
  const fullName = String(payload && payload.fullName || '').trim();
  const courseIds = Array.isArray(payload && payload.courseIds) ? payload.courseIds.filter(Boolean) : [];

  if (!fullName) throw new Error('Le nom complet est obligatoire.');
  if (!email) throw new Error('L’email est obligatoire.');
  if (password.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères.');

  const signupResponse = await fetch(`${sdk.client.url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: sdk.client.key,
      Authorization: `Bearer ${sdk.client.key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: fullName,
        name: fullName,
        role: 'student'
      }
    })
  });

  const raw = await signupResponse.text();
  let authData = null;
  try { authData = raw ? JSON.parse(raw) : null; } catch (_) { authData = null; }
  if (!signupResponse.ok) {
    const message = authData && (authData.msg || authData.message || authData.error_description || authData.error)
      ? (authData.msg || authData.message || authData.error_description || authData.error)
      : raw || signupResponse.statusText;
    throw new Error(`Création Auth stagiaire : ${message}`);
  }

  const userId = authData && authData.user && authData.user.id ? authData.user.id : authData && authData.id ? authData.id : '';
  if (!userId) throw new Error('Le compte Auth a été créé mais aucun identifiant utilisateur n’a été retourné.');

  const profileResponse = await sdk.client
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      name: fullName,
      role: 'student',
      courses: courseIds,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    .select()
    .single();
  if (profileResponse.error) throw new Error(`Profil stagiaire : ${readableSupabaseError(profileResponse.error)}`);

  if (courseIds.length) {
    const enrollmentRows = courseIds.map(function buildEnrollment(courseId) {
      return {
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date().toISOString()
      };
    });
    const enrollments = await sdk.client
      .from('enrollments')
      .upsert(enrollmentRows, { onConflict: 'user_id,course_id' });
    if (enrollments.error) throw new Error(`Inscriptions stagiaire : ${readableSupabaseError(enrollments.error)}`);
  }

  return {
    id: userId,
    name: fullName,
    email,
    role: 'student',
    courses: courseIds
  };
}



export async function updateRemoteStudent(session, studentId, payload) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Modification réservée au formateur connecté.');
  const sdk = await loadSupabase();
  const fullName = String(payload && payload.fullName || '').trim();
  const courseIds = Array.isArray(payload && payload.courseIds) ? payload.courseIds.filter(Boolean) : [];

  if (!studentId) throw new Error('Stagiaire introuvable.');
  if (!fullName) throw new Error('Le nom complet est obligatoire.');

  const profileResponse = await sdk.client
    .from('profiles')
    .update({
      full_name: fullName,
      name: fullName,
      courses: courseIds,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId)
    .select()
    .single();
  if (profileResponse.error) throw new Error(`Profil stagiaire : ${readableSupabaseError(profileResponse.error)}`);

  const disableEnrollments = await sdk.client
    .from('enrollments')
    .update({
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', studentId);
  if (disableEnrollments.error) throw new Error(`Désactivation anciennes formations : ${readableSupabaseError(disableEnrollments.error)}`);

  if (courseIds.length) {
    const enrollmentRows = courseIds.map(function buildEnrollment(courseId) {
      return {
        user_id: studentId,
        course_id: courseId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    const enrollments = await sdk.client
      .from('enrollments')
      .upsert(enrollmentRows, { onConflict: 'user_id,course_id' });
    if (enrollments.error) throw new Error(`Inscriptions stagiaire : ${readableSupabaseError(enrollments.error)}`);
  }

  return {
    id: studentId,
    name: fullName,
    role: 'student',
    courses: courseIds
  };
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
    .select('id, full_name, name, email, role, courses')
    .order('full_name', { ascending: true });
  if (response.error) throw response.error;
  return (response.data || []).map(function normalizeUser(user) {
    return {
      id: user.id,
      name: user.full_name || user.name || user.email || 'Utilisateur',
      email: user.email || '',
      role: user.role || 'student',
      courses: Array.isArray(user.courses) ? user.courses : []
    };
  });
}

export async function listRemoteSessions(session) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') return [];
  const sdk = await loadSupabase();
  const sessionsResponse = await sdk.client
    .from('training_sessions')
    .select('id, course_id, title, start_date, end_date, start_time, end_time, location, trainer_id, status, created_at')
    .order('start_date', { ascending: false });
  if (sessionsResponse.error) throw sessionsResponse.error;

  const studentsResponse = await sdk.client
    .from('session_students')
    .select('id, session_id, student_id, attendance_status, completion_status, convocation_document_id, certificate_document_id, created_at')
    .order('created_at', { ascending: true });
  if (studentsResponse.error) throw studentsResponse.error;

  const profilesResponse = await sdk.client
    .from('profiles')
    .select('id, full_name, name, email, role');
  if (profilesResponse.error) throw profilesResponse.error;

  const profiles = new Map((profilesResponse.data || []).map(function mapProfile(profile) {
    return [profile.id, {
      id: profile.id,
      name: profile.full_name || profile.name || profile.email || 'Stagiaire',
      email: profile.email || '',
      role: profile.role || 'student'
    }];
  }));

  const bySession = new Map();
  (studentsResponse.data || []).forEach(function attachStudent(row) {
    if (!bySession.has(row.session_id)) bySession.set(row.session_id, []);
    const profile = profiles.get(row.student_id) || { id: row.student_id, name: 'Stagiaire', email: '' };
    bySession.get(row.session_id).push(Object.assign({}, row, { profile }));
  });

  return (sessionsResponse.data || []).map(function normalizeSession(item) {
    const students = bySession.get(item.id) || [];
    const convocationCount = students.filter(function hasConvocation(student) { return Boolean(student.convocation_document_id); }).length;
    const certificateCount = students.filter(function hasCertificate(student) { return Boolean(student.certificate_document_id); }).length;
    return Object.assign({}, item, {
      students,
      studentCount: students.length,
      convocationCount,
      certificateCount
    });
  });
}


function courseTitleForDocuments(courseId) {
  const titles = {
    'communication-digitale': 'Communication interne et externe',
    'outils-bureautiques': 'Outils numériques et bureautiques',
    'litiges-clients': 'Gestion et désamorçage des litiges clients',
    'community-manager': 'Community Manager',
    'acteur-sst': 'Acteur SST'
  };
  return titles[courseId] || courseId || 'Formation';
}

function formatDocumentDate(value) {
  if (!value) return 'Non précisée';
  try { return new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00`)); } catch (_) { return String(value); }
}

function formatDocumentTime(value) {
  return value ? String(value).slice(0, 5).replace(':', 'h') : '';
}

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function pdfText(value) {
  return stripAccents(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/€/g, 'EUR')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapPdfLine(value, maxLength) {
  const text = stripAccents(value || '');
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(function appendWord(word) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxLength) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}


function dataUrlToUint8Array(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 255;
  return bytes;
}

function concatBytes(parts) {
  const total = parts.reduce(function sum(acc, part) { return acc + (part ? part.length : 0); }, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  parts.forEach(function append(part) {
    if (!part || !part.length) return;
    merged.set(part, offset);
    offset += part.length;
  });
  return merged;
}

function buildPdfFromJpegBytes(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const imageRatio = imageWidth / imageHeight;
  const pageRatio = pageWidth / pageHeight;
  let drawWidth = pageWidth;
  let drawHeight = pageHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > pageRatio) {
    drawWidth = pageWidth;
    drawHeight = pageWidth / imageRatio;
    offsetY = (pageHeight - drawHeight) / 2;
  } else {
    drawHeight = pageHeight;
    drawWidth = pageHeight * imageRatio;
    offsetX = (pageWidth - drawWidth) / 2;
  }

  const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${offsetX.toFixed(2)} ${offsetY.toFixed(2)} cm\n/Im0 Do\nQ`;
  const contentBytes = encoder.encode(content);
  const objects = [
    encoder.encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    encoder.encode('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    encoder.encode('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n'),
    encoder.encode(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream\nendobj\n`),
    concatBytes([
      encoder.encode(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`),
      jpegBytes,
      encoder.encode('\nendstream\nendobj\n')
    ])
  ];

  const header = encoder.encode('%PDF-1.4\n');
  const offsets = [0];
  let runningLength = header.length;
  objects.forEach(function countObject(objectBytes) {
    offsets.push(runningLength);
    runningLength += objectBytes.length;
  });

  const xrefOffset = runningLength;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const pdfBytes = concatBytes([header].concat(objects).concat([encoder.encode(xref), encoder.encode(trailer)]));
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const content = String(text || '').trim();
  if (!content) return [''];
  const words = content.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(function append(word) {
    const test = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function drawParagraph(ctx, text, x, y, maxWidth, lineHeight, color) {
  ctx.fillStyle = color || '#1f2937';
  const lines = wrapCanvasText(ctx, text, maxWidth);
  lines.forEach(function draw(line, index) {
    ctx.fillText(line, x, y + (index * lineHeight));
  });
  return y + (lines.length * lineHeight);
}

function drawLabeledLines(ctx, heading, lines, box) {
  roundedRect(ctx, box.x, box.y, box.width, box.height, 20);
  ctx.fillStyle = box.fill || '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = box.stroke || '#d7e5f8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0d3b78';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(heading, box.x + 24, box.y + 36);

  ctx.fillStyle = '#1f2937';
  ctx.font = '18px Arial';
  let currentY = box.y + 72;
  lines.forEach(function renderLine(line) {
    currentY = drawParagraph(ctx, line, box.x + 24, currentY, box.width - 48, 26, '#374151') + 8;
  });
}

async function loadDocumentLogo() {
  const src = new URL('../../brand/logo-ncr-solutions.png', import.meta.url).href;
  return await new Promise(function resolveLogo(resolve) {
    const img = new Image();
    img.onload = function loaded() { resolve(img); };
    img.onerror = function failed() { resolve(null); };
    img.src = src;
  });
}

async function buildConvocationPdf(session, studentProfile, trainerSession) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  const courseTitle = courseTitleForDocuments(session.course_id);
  const startTime = formatDocumentTime(session.start_time);
  const endTime = formatDocumentTime(session.end_time);
  const schedule = startTime || endTime ? `${startTime || 'heure à confirmer'} - ${endTime || 'heure à confirmer'}` : 'Horaires à confirmer';
  const generatedDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
  const startDate = formatDocumentDate(session.start_date);
  const endDate = formatDocumentDate(session.end_date);
  const dateText = startDate === endDate ? `Le ${startDate}` : `Du ${startDate} au ${endDate}`;
  const studentName = studentProfile.name || studentProfile.email || 'Stagiaire';
  const trainerName = trainerSession.name || trainerSession.email || 'N.C.R Solutions';

  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 260);
  gradient.addColorStop(0, '#0d3b78');
  gradient.addColorStop(1, '#24518e');
  ctx.fillStyle = gradient;
  roundedRect(ctx, 60, 54, 1120, 250, 36);
  ctx.fill();

  const logo = await loadDocumentLogo();
  if (logo) {
    const targetHeight = 110;
    const ratio = logo.width / logo.height || 1;
    const targetWidth = Math.min(430, targetHeight * ratio);
    ctx.drawImage(logo, 86, 92, targetWidth, targetHeight);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('N.C.R Solutions', 86, 240);
  ctx.font = '22px Arial';
  ctx.globalAlpha = 0.92;
  ctx.fillText('Formations & Résolutions', 86, 274);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'right';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('Convocation de formation', 1136, 146);
  ctx.font = '22px Arial';
  ctx.fillText('Document nominatif', 1136, 184);
  ctx.font = '18px Arial';
  ctx.globalAlpha = 0.9;
  ctx.fillText(`Émis le ${generatedDate}`, 1136, 220);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  roundedRect(ctx, 60, 338, 1120, 124, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#d6e2f2';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0d3b78';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('Convocation officielle', 92, 386);
  ctx.fillStyle = '#374151';
  ctx.font = '20px Arial';
  drawParagraph(ctx, `Nous vous informons que ${studentName} est convoqué à la session de formation « ${session.title || courseTitle} ». Merci de prendre connaissance des informations ci-dessous et de vous présenter à l’horaire indiqué.`, 92, 424, 1058, 28, '#374151');

  drawLabeledLines(ctx, 'Stagiaire', [
    `Nom : ${studentName}`,
    `Email : ${studentProfile.email || 'Non précisé'}`
  ], { x: 60, y: 500, width: 520, height: 180, fill: '#ffffff', stroke: '#d6e2f2' });

  drawLabeledLines(ctx, 'Formation', [
    `Intitulé : ${courseTitle}`,
    `Session : ${session.title || courseTitle}`,
    `Formateur : ${trainerName}`
  ], { x: 660, y: 500, width: 520, height: 180, fill: '#ffffff', stroke: '#d6e2f2' });

  drawLabeledLines(ctx, 'Organisation', [
    `Dates : ${dateText}`,
    `Horaires : ${schedule}`,
    `Lieu : ${session.location || 'Lieu à confirmer'}`
  ], { x: 60, y: 712, width: 1120, height: 206, fill: '#ffffff', stroke: '#d6e2f2' });

  drawLabeledLines(ctx, 'Consignes utiles', [
    'Merci de vous présenter 10 minutes avant le début de la session.',
    'Apportez une pièce d’identité ainsi que le matériel nécessaire si votre formation le requiert.',
    'En cas d’empêchement, prévenez N.C.R Solutions dans les meilleurs délais afin de réorganiser votre accueil.'
  ], { x: 60, y: 950, width: 1120, height: 262, fill: '#ffffff', stroke: '#d6e2f2' });

  drawLabeledLines(ctx, 'Accès aux documents', [
    'Vos supports pédagogiques, convocations et futurs justificatifs sont centralisés dans votre espace stagiaire sécurisé.',
    'Conservez cette convocation et présentez-la si besoin lors de votre arrivée en formation.'
  ], { x: 60, y: 1244, width: 1120, height: 172, fill: '#eef5ff', stroke: '#d6e2f2' });

  ctx.fillStyle = '#6b7280';
  ctx.font = '16px Arial';
  ctx.fillText('N.C.R Solutions • Document généré automatiquement depuis votre environnement de formation.', 84, 1498);
  ctx.fillText('Pour toute question, contactez votre formateur ou votre référent administratif.', 84, 1526);

  roundedRect(ctx, 60, 1560, 1120, 110, 24);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('N.C.R Solutions', 88, 1608);
  ctx.font = '16px Arial';
  ctx.fillText('Formations & Résolutions • Convocation individuelle de formation', 88, 1640);
  ctx.textAlign = 'right';
  ctx.fillText(generatedDate, 1150, 1640);
  ctx.textAlign = 'left';

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return buildPdfFromJpegBytes(dataUrlToUint8Array(jpegDataUrl), canvas.width, canvas.height);
}

async function fetchStudentProfiles(client, studentIds) {
  const profilesResponse = await client
    .from('profiles')
    .select('id, full_name, name, email, role');
  if (profilesResponse.error) throw new Error(`Profils stagiaires : ${readableSupabaseError(profilesResponse.error)}`);
  const profiles = new Map((profilesResponse.data || []).map(function mapProfile(profile) {
    return [profile.id, {
      id: profile.id,
      name: profile.full_name || profile.name || profile.email || 'Stagiaire',
      email: profile.email || '',
      role: profile.role || 'student'
    }];
  }));
  return studentIds.map(function toProfile(id) {
    return profiles.get(id) || { id, name: 'Stagiaire', email: '' };
  });
}

async function createConvocationForStudent(client, trainerSession, sessionRow, studentProfile) {
  const cleanStudentName = sanitizeFileName(studentProfile.name || studentProfile.email || 'stagiaire');
  const storagePath = `${studentProfile.id}/convocation/${sessionRow.id}-convocation-${cleanStudentName}.pdf`;
  const pdf = await buildConvocationPdf(sessionRow, studentProfile, trainerSession);
  const uploadResponse = await client.storage
    .from('documents-prives')
    .upload(storagePath, pdf, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf'
    });
  if (uploadResponse.error) throw new Error(`Upload convocation ${studentProfile.name || studentProfile.email || ''} : ${readableSupabaseError(uploadResponse.error)}`);
  const documentTitle = `Convocation - ${courseTitleForDocuments(sessionRow.course_id)} - ${studentProfile.name || studentProfile.email || 'Stagiaire'}`;
  const insertResponse = await client
    .from('training_documents')
    .insert({
      title: documentTitle,
      name: documentTitle,
      type: 'convocation',
      course_id: sessionRow.course_id || null,
      target_user_id: studentProfile.id,
      bucket: 'documents-prives',
      storage_path: storagePath,
      status: 'active',
      visibility: 'user',
      created_by: trainerSession.id,
      session_id: sessionRow.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  if (insertResponse.error) throw new Error(`Fiche convocation ${studentProfile.name || studentProfile.email || ''} : ${readableSupabaseError(insertResponse.error)}`);
  const updateResponse = await client
    .from('session_students')
    .update({ convocation_document_id: insertResponse.data.id })
    .eq('session_id', sessionRow.id)
    .eq('student_id', studentProfile.id);
  if (updateResponse.error) throw new Error(`Lien convocation session : ${readableSupabaseError(updateResponse.error)}`);
  return insertResponse.data;
}


async function buildCertificatePdf(session, studentProfile, trainerSession) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  const courseTitle = courseTitleForDocuments(session.course_id);
  const generatedDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
  const startDate = formatDocumentDate(session.start_date);
  const endDate = formatDocumentDate(session.end_date);
  const dateText = startDate === endDate ? `le ${startDate}` : `du ${startDate} au ${endDate}`;
  const studentName = studentProfile.name || studentProfile.email || 'Stagiaire';
  const trainerName = trainerSession.name || trainerSession.email || 'N.C.R Solutions';

  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 300);
  gradient.addColorStop(0, '#0d3b78');
  gradient.addColorStop(1, '#24518e');
  ctx.fillStyle = gradient;
  roundedRect(ctx, 60, 54, 1120, 270, 38);
  ctx.fill();

  const logo = await loadDocumentLogo();
  if (logo) {
    const targetHeight = 110;
    const ratio = logo.width / logo.height || 1;
    const targetWidth = Math.min(430, targetHeight * ratio);
    ctx.drawImage(logo, 86, 96, targetWidth, targetHeight);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Arial';
  ctx.fillText('N.C.R Solutions', 86, 246);
  ctx.font = '22px Arial';
  ctx.globalAlpha = 0.92;
  ctx.fillText('Formations & Résolutions', 86, 282);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'right';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('Attestation de fin de stage', 1136, 150);
  ctx.font = '22px Arial';
  ctx.fillText('Document nominatif', 1136, 190);
  ctx.font = '18px Arial';
  ctx.fillText(`Émise le ${generatedDate}`, 1136, 230);
  ctx.textAlign = 'left';

  roundedRect(ctx, 90, 390, 1060, 260, 34);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#d6e2f2';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0d3b78';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('Attestation de participation et de réalisation', 136, 458);

  ctx.fillStyle = '#111827';
  ctx.font = '24px Arial';
  drawParagraph(ctx, `N.C.R Solutions atteste que ${studentName} a participé à la formation « ${courseTitle} » organisée ${dateText}.`, 136, 520, 968, 34, '#111827');

  drawLabeledLines(ctx, 'Bénéficiaire', [
    `Nom : ${studentName}`,
    `Email : ${studentProfile.email || 'Non précisé'}`
  ], { x: 90, y: 710, width: 500, height: 176, fill: '#ffffff', stroke: '#d6e2f2' });

  drawLabeledLines(ctx, 'Formation réalisée', [
    `Intitulé : ${courseTitle}`,
    `Session : ${session.title || courseTitle}`,
    `Période : ${dateText}`
  ], { x: 650, y: 710, width: 500, height: 176, fill: '#ffffff', stroke: '#d6e2f2' });

  drawLabeledLines(ctx, 'Validation', [
    'Présence : validée par le formateur',
    'Réalisation : formation clôturée',
    `Formateur référent : ${trainerName}`
  ], { x: 90, y: 940, width: 1060, height: 220, fill: '#eef5ff', stroke: '#d6e2f2' });

  ctx.fillStyle = '#374151';
  ctx.font = '20px Arial';
  drawParagraph(ctx, 'Cette attestation est générée automatiquement après clôture de la session. Elle certifie la participation du stagiaire et la réalisation du parcours indiqué. Elle ne remplace pas un certificat réglementaire lorsque celui-ci exige une procédure officielle spécifique.', 90, 1228, 1060, 30, '#374151');

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(750, 1408);
  ctx.lineTo(1120, 1408);
  ctx.stroke();

  ctx.fillStyle = '#6b7280';
  ctx.font = '17px Arial';
  ctx.fillText('Signature / cachet de l’organisme', 790, 1440);

  roundedRect(ctx, 60, 1560, 1120, 110, 24);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('N.C.R Solutions', 88, 1608);
  ctx.font = '16px Arial';
  ctx.fillText('Formations & Résolutions • Attestation individuelle de fin de stage', 88, 1640);
  ctx.textAlign = 'right';
  ctx.fillText(generatedDate, 1150, 1640);
  ctx.textAlign = 'left';

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return buildPdfFromJpegBytes(dataUrlToUint8Array(jpegDataUrl), canvas.width, canvas.height);
}

async function createCertificateForStudent(client, trainerSession, sessionRow, studentProfile, sessionStudentRow) {
  const cleanStudentName = sanitizeFileName(studentProfile.name || studentProfile.email || 'stagiaire');
  const storagePath = `${studentProfile.id}/attestation/${sessionRow.id}-attestation-${cleanStudentName}.pdf`;
  const pdf = await buildCertificatePdf(sessionRow, studentProfile, trainerSession);
  const uploadResponse = await client.storage
    .from('documents-prives')
    .upload(storagePath, pdf, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf'
    });
  if (uploadResponse.error) throw new Error(`Upload attestation ${studentProfile.name || studentProfile.email || ''} : ${readableSupabaseError(uploadResponse.error)}`);

  const documentTitle = `Attestation de fin de stage - ${courseTitleForDocuments(sessionRow.course_id)} - ${studentProfile.name || studentProfile.email || 'Stagiaire'}`;
  const insertResponse = await client
    .from('training_documents')
    .insert({
      title: documentTitle,
      name: documentTitle,
      type: 'attestation',
      course_id: sessionRow.course_id || null,
      target_user_id: studentProfile.id,
      bucket: 'documents-prives',
      storage_path: storagePath,
      status: 'active',
      visibility: 'user',
      created_by: trainerSession.id,
      session_id: sessionRow.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  if (insertResponse.error) throw new Error(`Fiche attestation ${studentProfile.name || studentProfile.email || ''} : ${readableSupabaseError(insertResponse.error)}`);

  const updateResponse = await client
    .from('session_students')
    .update({ certificate_document_id: insertResponse.data.id })
    .eq('id', sessionStudentRow.id);
  if (updateResponse.error) throw new Error(`Lien attestation session : ${readableSupabaseError(updateResponse.error)}`);

  return insertResponse.data;
}

export async function updateRemoteSessionStudent(session, sessionStudentId, payload) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Mise à jour réservée au formateur connecté.');
  const sdk = await loadSupabase();
  const attendanceStatus = String(payload && payload.attendanceStatus || 'pending');
  const completionStatus = String(payload && payload.completionStatus || 'pending');
  const response = await sdk.client
    .from('session_students')
    .update({
      attendance_status: attendanceStatus,
      completion_status: completionStatus
    })
    .eq('id', sessionStudentId)
    .select()
    .single();
  if (response.error) throw new Error(`Mise à jour stagiaire : ${readableSupabaseError(response.error)}`);
  return response.data;
}


function attendanceModeLabel(mode) {
  if (mode === 'matin') return 'Matin';
  if (mode === 'apres-midi' || mode === 'apres_midi') return 'Après-midi';
  return 'Journée complète';
}

function attendanceStorageSlug(mode) {
  if (mode === 'matin') return 'matin';
  if (mode === 'apres-midi' || mode === 'apres_midi') return 'apres-midi';
  return 'journee';
}

async function fetchSessionWithStudents(client, sessionId) {
  const sessionResponse = await client
    .from('training_sessions')
    .select('id, course_id, title, start_date, end_date, start_time, end_time, location, trainer_id, status, created_at')
    .eq('id', sessionId)
    .single();
  if (sessionResponse.error) throw new Error(`Session : ${readableSupabaseError(sessionResponse.error)}`);

  const studentsResponse = await client
    .from('session_students')
    .select('id, session_id, student_id, attendance_status, completion_status, convocation_document_id, certificate_document_id, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (studentsResponse.error) throw new Error(`Stagiaires : ${readableSupabaseError(studentsResponse.error)}`);

  const studentIds = (studentsResponse.data || []).map(function getId(row) { return row.student_id; });
  const profiles = studentIds.length ? await fetchStudentProfiles(client, studentIds) : [];
  const profileMap = new Map(profiles.map(function mapProfile(profile) { return [profile.id, profile]; }));
  const students = (studentsResponse.data || []).map(function attachProfile(row) {
    return Object.assign({}, row, {
      profile: profileMap.get(row.student_id) || { id: row.student_id, name: 'Stagiaire', email: '' }
    });
  });

  return {
    session: sessionResponse.data,
    students
  };
}

async function buildAttendanceSheetPdf(sessionRow, sessionStudents, trainerSession, mode) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  const generatedDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
  const startDate = formatDocumentDate(sessionRow.start_date);
  const endDate = formatDocumentDate(sessionRow.end_date);
  const dateText = startDate === endDate ? startDate : `${startDate} au ${endDate}`;
  const courseTitle = courseTitleForDocuments(sessionRow.course_id);
  const modeLabel = attendanceModeLabel(mode);
  const students = sessionStudents && sessionStudents.length ? sessionStudents : [];
  const useTwoSignatures = modeLabel === 'Journée complète';

  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 260);
  gradient.addColorStop(0, '#0d3b78');
  gradient.addColorStop(1, '#24518e');
  ctx.fillStyle = gradient;
  roundedRect(ctx, 60, 54, 1120, 260, 38);
  ctx.fill();

  const logo = await loadDocumentLogo();
  if (logo) {
    const targetHeight = 96;
    const ratio = logo.width / logo.height || 1;
    const targetWidth = Math.min(380, targetHeight * ratio);
    ctx.drawImage(logo, 86, 94, targetWidth, targetHeight);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('N.C.R Solutions', 86, 234);
  ctx.font = '20px Arial';
  ctx.globalAlpha = 0.92;
  ctx.fillText('Formations & Résolutions', 86, 270);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'right';
  ctx.font = 'bold 44px Arial';
  ctx.fillText('Feuille d’émargement', 1136, 142);
  ctx.font = '22px Arial';
  ctx.fillText(modeLabel, 1136, 184);
  ctx.font = '18px Arial';
  ctx.fillText(`Générée le ${generatedDate}`, 1136, 226);
  ctx.textAlign = 'left';

  roundedRect(ctx, 80, 370, 1080, 220, 30);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#d6e2f2';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0d3b78';
  ctx.font = 'bold 26px Arial';
  ctx.fillText('Informations de session', 112, 424);

  ctx.fillStyle = '#111827';
  ctx.font = '20px Arial';
  ctx.fillText(`Formation : ${courseTitle}`, 112, 474);
  ctx.fillText(`Session : ${sessionRow.title || courseTitle}`, 112, 514);
  ctx.fillText(`Date : ${dateText}`, 112, 554);
  ctx.fillText(`Horaires : ${(formatDocumentTime(sessionRow.start_time) || '—')} - ${(formatDocumentTime(sessionRow.end_time) || '—')}`, 700, 474);
  ctx.fillText(`Lieu : ${sessionRow.location || 'Non précisé'}`, 700, 514);
  ctx.fillText(`Formateur : ${trainerSession.name || trainerSession.email || 'N.C.R Solutions'}`, 700, 554);

  const tableX = 80;
  const tableY = 660;
  const tableW = 1080;
  const headerH = 58;
  const maxRowsArea = 720;
  const rowCount = Math.max(students.length, 1);
  const rowH = Math.max(52, Math.min(74, Math.floor(maxRowsArea / Math.min(rowCount, 14))));
  const colNameW = useTwoSignatures ? 380 : 500;
  const colSigW = useTwoSignatures ? 350 : 580;

  ctx.fillStyle = '#0f172a';
  roundedRect(ctx, tableX, tableY, tableW, headerH, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Stagiaire', tableX + 22, tableY + 37);
  if (useTwoSignatures) {
    ctx.fillText('Signature matin', tableX + colNameW + 22, tableY + 37);
    ctx.fillText('Signature après-midi', tableX + colNameW + colSigW + 22, tableY + 37);
  } else {
    ctx.fillText(`Signature ${modeLabel.toLowerCase()}`, tableX + colNameW + 22, tableY + 37);
  }

  ctx.strokeStyle = '#d6e2f2';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#ffffff';

  const visibleStudents = students.slice(0, 14);
  visibleStudents.forEach(function drawStudent(row, index) {
    const y = tableY + headerH + index * rowH;
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fbff';
    ctx.fillRect(tableX, y, tableW, rowH);
    ctx.strokeRect(tableX, y, tableW, rowH);

    ctx.strokeStyle = '#d6e2f2';
    ctx.beginPath();
    ctx.moveTo(tableX + colNameW, y);
    ctx.lineTo(tableX + colNameW, y + rowH);
    ctx.stroke();

    if (useTwoSignatures) {
      ctx.beginPath();
      ctx.moveTo(tableX + colNameW + colSigW, y);
      ctx.lineTo(tableX + colNameW + colSigW, y + rowH);
      ctx.stroke();
    }

    const profile = row.profile || {};
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(profile.name || 'Stagiaire', tableX + 20, y + 28);
    ctx.fillStyle = '#6b7280';
    ctx.font = '15px Arial';
    ctx.fillText(profile.email || '', tableX + 20, y + 50);
  });

  if (!students.length) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tableX, tableY + headerH, tableW, rowH);
    ctx.strokeStyle = '#d6e2f2';
    ctx.strokeRect(tableX, tableY + headerH, tableW, rowH);
    ctx.fillStyle = '#6b7280';
    ctx.font = '18px Arial';
    ctx.fillText('Aucun stagiaire rattaché à cette session.', tableX + 20, tableY + headerH + 36);
  }

  if (students.length > 14) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Arial';
    ctx.fillText(`Attention : ${students.length - 14} stagiaire(s) supplémentaire(s) non affiché(s) sur cette feuille. Génère une feuille complémentaire si besoin.`, 80, 1470);
  }

  roundedRect(ctx, 80, 1460, 1080, 120, 24);
  ctx.fillStyle = '#eef5ff';
  ctx.fill();
  ctx.strokeStyle = '#d6e2f2';
  ctx.stroke();

  ctx.fillStyle = '#374151';
  ctx.font = '18px Arial';
  drawParagraph(ctx, 'Chaque participant signe dans la colonne correspondant à la période suivie. La feuille complétée doit être conservée avec les preuves de réalisation de la session.', 112, 1508, 1016, 28, '#374151');

  roundedRect(ctx, 60, 1625, 1120, 74, 22);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('N.C.R Solutions', 88, 1666);
  ctx.font = '15px Arial';
  ctx.fillText('Feuille d’émargement à signer par les participants', 260, 1666);
  ctx.textAlign = 'right';
  ctx.fillText(modeLabel, 1150, 1666);
  ctx.textAlign = 'left';

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return buildPdfFromJpegBytes(dataUrlToUint8Array(jpegDataUrl), canvas.width, canvas.height);
}

export async function generateRemoteAttendanceSheet(session, sessionId, mode) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Génération réservée au formateur connecté.');
  const sdk = await loadSupabase();
  const modeSlug = attendanceStorageSlug(mode);
  const modeLabel = attendanceModeLabel(mode);
  const data = await fetchSessionWithStudents(sdk.client, sessionId);
  const sessionRow = data.session;
  const pdf = await buildAttendanceSheetPdf(sessionRow, data.students, session, modeSlug);
  const safeTitle = sanitizeFileName(sessionRow.title || sessionRow.id || 'session');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const storagePath = `formateur/emargements/${sessionRow.id}/${stamp}-emargement-${modeSlug}-${safeTitle}.pdf`;

  const uploadResponse = await sdk.client.storage
    .from('documents-prives')
    .upload(storagePath, pdf, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf'
    });
  if (uploadResponse.error) throw new Error(`Upload feuille d’émargement : ${readableSupabaseError(uploadResponse.error)}`);

  const documentTitle = `Feuille d’émargement ${modeLabel} - ${sessionRow.title || courseTitleForDocuments(sessionRow.course_id)}`;
  const insertResponse = await sdk.client
    .from('training_documents')
    .insert({
      title: documentTitle,
      name: documentTitle,
      type: 'emargement',
      course_id: sessionRow.course_id || null,
      target_user_id: null,
      bucket: 'documents-prives',
      storage_path: storagePath,
      status: 'active',
      visibility: 'user',
      created_by: session.id,
      session_id: sessionRow.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  if (insertResponse.error) throw new Error(`Fiche document émargement : ${readableSupabaseError(insertResponse.error)}`);

  return insertResponse.data;
}


export async function closeRemoteSession(session, sessionId) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Clôture réservée au formateur connecté.');
  const sdk = await loadSupabase();

  const sessionResponse = await sdk.client
    .from('training_sessions')
    .select('id, course_id, title, start_date, end_date, start_time, end_time, location, trainer_id, status, created_at')
    .eq('id', sessionId)
    .single();
  if (sessionResponse.error) throw new Error(`Session à clôturer : ${readableSupabaseError(sessionResponse.error)}`);
  const sessionRow = sessionResponse.data;

  const studentsResponse = await sdk.client
    .from('session_students')
    .select('id, session_id, student_id, attendance_status, completion_status, convocation_document_id, certificate_document_id, created_at')
    .eq('session_id', sessionId);
  if (studentsResponse.error) throw new Error(`Stagiaires à clôturer : ${readableSupabaseError(studentsResponse.error)}`);

  const eligibleRows = (studentsResponse.data || []).filter(function eligible(row) {
    return row.attendance_status === 'present' && row.completion_status === 'validated' && !row.certificate_document_id;
  });

  const generated = [];
  if (eligibleRows.length) {
    const profiles = await fetchStudentProfiles(sdk.client, eligibleRows.map(function ids(row) { return row.student_id; }));
    const profilesById = new Map(profiles.map(function item(profile) { return [profile.id, profile]; }));
    for (const row of eligibleRows) {
      const profile = profilesById.get(row.student_id) || { id: row.student_id, name: 'Stagiaire', email: '' };
      const document = await createCertificateForStudent(sdk.client, session, sessionRow, profile, row);
      generated.push(document);
    }
  }

  const updateSession = await sdk.client
    .from('training_sessions')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single();
  if (updateSession.error) throw new Error(`Clôture session : ${readableSupabaseError(updateSession.error)}`);

  return Object.assign({}, updateSession.data, {
    certificateCount: generated.length,
    generatedDocuments: generated
  });
}



export async function createRemoteSession(session, payload) {
  if (!hasValidConfig() || !session || session.role !== 'trainer') throw new Error('Création de session réservée au formateur connecté.');
  const sdk = await loadSupabase();
  const title = String(payload && payload.title || '').trim();
  const courseId = String(payload && payload.courseId || '').trim();
  const startDate = String(payload && payload.startDate || '').trim();
  const endDate = String(payload && payload.endDate || '').trim();
  const startTime = String(payload && payload.startTime || '').trim();
  const endTime = String(payload && payload.endTime || '').trim();
  const locationValue = String(payload && payload.location || '').trim();
  const studentIds = Array.isArray(payload && payload.studentIds) ? payload.studentIds.filter(Boolean) : [];

  if (!title) throw new Error('Le titre de session est obligatoire.');
  if (!courseId) throw new Error('La formation est obligatoire.');
  if (!startDate || !endDate) throw new Error('Les dates de début et de fin sont obligatoires.');
  if (!studentIds.length) throw new Error('Sélectionne au moins un stagiaire.');

  const insertSession = await sdk.client
    .from('training_sessions')
    .insert({
      title,
      course_id: courseId,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime || null,
      end_time: endTime || null,
      location: locationValue || null,
      trainer_id: session.id,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id, course_id, title, start_date, end_date, start_time, end_time, location, trainer_id, status, created_at')
    .single();

  if (insertSession.error) throw new Error(`Session Supabase : ${readableSupabaseError(insertSession.error)}`);
  const created = insertSession.data;

  const studentRows = studentIds.map(function buildStudentRow(studentId) {
    return {
      session_id: created.id,
      student_id: studentId,
      attendance_status: 'pending',
      completion_status: 'pending',
      created_at: new Date().toISOString()
    };
  });

  const insertStudents = await sdk.client
    .from('session_students')
    .insert(studentRows)
    .select();
  if (insertStudents.error) throw new Error(`Stagiaires de session : ${readableSupabaseError(insertStudents.error)}`);

  const enrollmentRows = studentIds.map(function buildEnrollment(studentId) {
    return {
      user_id: studentId,
      course_id: courseId,
      status: 'active',
      created_at: new Date().toISOString()
    };
  });
  const enrollments = await sdk.client
    .from('enrollments')
    .upsert(enrollmentRows, { onConflict: 'user_id,course_id' });
  if (enrollments.error) throw new Error(`Inscriptions formation : ${readableSupabaseError(enrollments.error)}`);

  const studentProfiles = await fetchStudentProfiles(sdk.client, studentIds);
  const convocations = [];
  for (const studentProfile of studentProfiles) {
    const document = await createConvocationForStudent(sdk.client, session, created, studentProfile);
    convocations.push(document);
  }

  return Object.assign({}, created, {
    students: insertStudents.data || [],
    studentCount: studentRows.length,
    convocationCount: convocations.length,
    generatedDocuments: convocations
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
