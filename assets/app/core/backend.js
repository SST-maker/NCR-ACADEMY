import { firebaseConfig, firebaseRuntime } from '../firebase.config.js';

let firebasePromise = null;

function hasValidConfig() {
  return Boolean(
    firebaseRuntime && firebaseRuntime.enabled === true &&
    firebaseConfig &&
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.apiKey.indexOf('YOUR_') === -1
  );
}

export function isBackendEnabled() {
  return hasValidConfig();
}

export function allowDemoFallback() {
  return !hasValidConfig() || firebaseRuntime.allowDemoFallback !== false;
}

async function loadFirebase() {
  if (!hasValidConfig()) return null;
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js')
    ]).then(function initFirebase(modules) {
      const appModule = modules[0];
      const authModule = modules[1];
      const firestoreModule = modules[2];
      const storageModule = modules[3];
      const app = appModule.initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);
      const db = firestoreModule.getFirestore(app);
      const storage = storageModule.getStorage(app);
      return { appModule, authModule, firestoreModule, storageModule, app, auth, db, storage };
    });
  }
  return firebasePromise;
}

function normalizeCourses(value) {
  if (Array.isArray(value) && value.length) return value;
  return firebaseRuntime.defaultCourses.slice();
}

export async function signInBackend(email, password) {
  const sdk = await loadFirebase();
  if (!sdk) throw new Error('Firebase n’est pas encore configuré.');
  const credential = await sdk.authModule.signInWithEmailAndPassword(sdk.auth, String(email || '').trim(), password);
  const user = credential.user;
  const profileRef = sdk.firestoreModule.doc(sdk.db, 'users', user.uid);
  const profileSnap = await sdk.firestoreModule.getDoc(profileRef);
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const role = profile.role === 'trainer' ? 'trainer' : 'student';
  return {
    id: user.uid,
    role: role,
    name: profile.name || user.displayName || user.email || 'Utilisateur NCR',
    email: user.email || String(email || '').trim().toLowerCase(),
    courses: normalizeCourses(profile.courses),
    loggedAt: new Date().toISOString(),
    backend: 'firebase'
  };
}

export async function signOutBackend() {
  const sdk = await loadFirebase();
  if (!sdk) return;
  await sdk.authModule.signOut(sdk.auth);
}

export async function loadRemoteState(session) {
  if (!hasValidConfig() || !session || !session.id) return null;
  const sdk = await loadFirebase();
  const ref = sdk.firestoreModule.doc(sdk.db, 'userStates', session.id);
  const snap = await sdk.firestoreModule.getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data && data.state ? data.state : null;
}

export async function saveRemoteState(session, state, reason) {
  if (!hasValidConfig() || !session || !session.id) return false;
  const sdk = await loadFirebase();
  const ref = sdk.firestoreModule.doc(sdk.db, 'userStates', session.id);
  await sdk.firestoreModule.setDoc(ref, {
    userId: session.id,
    email: session.email,
    role: session.role,
    state: state,
    reason: reason || 'sync',
    updatedAt: sdk.firestoreModule.serverTimestamp()
  }, { merge: true });
  return true;
}

export async function recordRemoteEvent(session, event) {
  if (!hasValidConfig() || !session || !session.id || !event) return false;
  const sdk = await loadFirebase();
  const ref = sdk.firestoreModule.doc(sdk.db, 'trackingEvents', event.id || `${session.id}-${Date.now()}`);
  await sdk.firestoreModule.setDoc(ref, {
    userId: session.id,
    email: session.email,
    role: session.role,
    type: event.type,
    payload: event.payload || {},
    createdAt: event.createdAt || new Date().toISOString(),
    url: event.url || location.href,
    userAgent: event.userAgent || navigator.userAgent
  }, { merge: true });
  return true;
}

export async function createRemoteTicket(session, ticket) {
  if (!hasValidConfig() || !session || !session.id || !ticket) return false;
  const sdk = await loadFirebase();
  const ref = sdk.firestoreModule.doc(sdk.db, 'tickets', ticket.id);
  await sdk.firestoreModule.setDoc(ref, {
    id: ticket.id,
    authorId: session.id,
    authorName: session.name,
    authorEmail: session.email,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status || 'ouvert',
    priority: ticket.priority || 'normal',
    createdAt: ticket.createdAt || new Date().toISOString(),
    updatedAt: sdk.firestoreModule.serverTimestamp()
  }, { merge: true });
  return true;
}

export async function listRemoteDocuments(session) {
  if (!hasValidConfig() || !session || !session.id) return [];
  const sdk = await loadFirebase();
  const collectionRef = sdk.firestoreModule.collection(sdk.db, 'documents');
  const snapshot = await sdk.firestoreModule.getDocs(collectionRef);
  const items = [];
  snapshot.forEach(function addDoc(docSnap) {
    const item = docSnap.data();
    const roles = Array.isArray(item.roles) ? item.roles : ['student', 'trainer'];
    const courses = Array.isArray(item.courses) ? item.courses : [];
    const allowedByRole = roles.indexOf(session.role) !== -1;
    const allowedByCourse = !courses.length || courses.some(function inCourses(courseId) { return session.courses.indexOf(courseId) !== -1; });
    if (allowedByRole && allowedByCourse) items.push(Object.assign({ id: docSnap.id }, item));
  });
  return items;
}
