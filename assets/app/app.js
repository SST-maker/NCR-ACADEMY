import { login, logout, getSession } from './core/auth.js';
import { loadState, patchState, replaceState } from './core/state.js';
import { addEvent, listEvents, exportEvents } from './core/tracking.js';
import { isBackendEnabled, getBackendDiagnosticSnapshot, testBackendConnection, loadRemoteState, saveRemoteState, recordRemoteEvent, createRemoteTicket, listRemoteDocuments, listRemoteUsers, uploadRemoteDocument, listRemoteSessions, createRemoteSession } from './core/backend.js';
import { courses, getCourse } from './data/catalog.js';
import { qualiopiChecklist, documentTemplates } from './data/qualopi.js';

const app = document.querySelector('#app');
const ASSET_VERSION = '5.3.3';
const BRAND_LOGO = `${new URL('../brand/logo-ncr-academy.png', import.meta.url).href}?v=${ASSET_VERSION}`;
let state = loadState();
let session = getSession();
let drawerOpen = false;
let remoteDocuments = [];
let remoteUsers = [];
let remoteSessions = [];
let remoteHydratedFor = null;

function isRemoteSession() {
  return Boolean(session && session.backend === 'supabase' && isBackendEnabled());
}

async function hydrateRemoteData() {
  if (!isRemoteSession() || remoteHydratedFor === session.id) return;
  try {
    const remoteState = await loadRemoteState(session);
    if (remoteState) state = replaceState(remoteState);
    remoteDocuments = await listRemoteDocuments(session);
    remoteUsers = session.role === 'trainer' ? await listRemoteUsers(session) : [];
    remoteSessions = session.role === 'trainer' ? await listRemoteSessions(session) : [];
    remoteHydratedFor = session.id;
  } catch (error) {
    console.warn('Synchronisation distante indisponible', error);
  }
}

async function syncState(reason) {
  if (!isRemoteSession()) return;
  try {
    await saveRemoteState(session, state, reason);
  } catch (error) {
    console.warn('Sauvegarde distante indisponible', error);
  }
}

function trackEvent(type, payload) {
  const event = addEvent(type, payload || {});
  if (isRemoteSession()) {
    recordRemoteEvent(session, event).catch(function ignoreRemoteError(error) {
      console.warn('Traçabilité distante indisponible', error);
    });
  }
  return event;
}

const icons = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 11.2 12 4l8.4 7.2v8.2a1.6 1.6 0 0 1-1.6 1.6h-4.3v-6.2h-5V21H5.2a1.6 1.6 0 0 1-1.6-1.6v-8.2Z"/></svg>',
  lessons: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 3.5h10.7a2 2 0 0 1 2 2v15l-2.7-1.7-2.7 1.7-2.7-1.7-2.7 1.7-3-1.9V5.5a2 2 0 0 1 2-2Zm2 4v1.6h7.8V7.5H8.2Zm0 4v1.6h7.8v-1.6H8.2Z"/></svg>',
  quiz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4Zm-.4 13.4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1.9-4.8c-.8.5-.9.8-.9 1.4h-2c0-1.5.6-2.2 1.8-3 .8-.5 1.2-.9 1.2-1.5 0-.8-.6-1.3-1.5-1.3-.9 0-1.5.5-1.8 1.4L8.5 7.6C9 6 10.3 5.1 12.2 5.1c2.1 0 3.6 1.2 3.6 3.1 0 1.5-.8 2.3-2.3 3.2Z"/></svg>',
  memo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.8h12a1.7 1.7 0 0 1 1.7 1.7v13a1.7 1.7 0 0 1-1.7 1.7H6a1.7 1.7 0 0 1-1.7-1.7v-13A1.7 1.7 0 0 1 6 3.8Zm2.2 4.1v1.5h7.6V7.9H8.2Zm0 3.5v1.5h7.6v-1.5H8.2Zm0 3.5v1.5h5.2v-1.5H8.2Z"/></svg>',
  documents: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 3.4h7.5l3.9 4.1v11a2 2 0 0 1-2 2H6.8a2 2 0 0 1-2-2V5.4a2 2 0 0 1 2-2Zm6.8 1.8v3.1h3L13.6 5.2Z"/></svg>',
  contact: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15a1.8 1.8 0 0 1 1.8 1.8v8.8a1.8 1.8 0 0 1-1.8 1.8H9l-4.6 3v-3H4.5a1.8 1.8 0 0 1-1.8-1.8V7.3a1.8 1.8 0 0 1 1.8-1.8Zm2.4 3.2v1.5h10.2V8.7H6.9Zm0 3.3v1.5h7.4V12H6.9Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.2h16v1.8H4V7.2Zm0 4h16V13H4v-1.8Zm0 4h16V17H4v-1.8Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.2 7.5 1.3-1.3 4.5 4.5 4.5-4.5 1.3 1.3-4.5 4.5 4.5 4.5-1.3 1.3-4.5-4.5-4.5 4.5-1.3-1.3 4.5-4.5-4.5-4.5Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.4 16.8-4-4 1.4-1.4 2.6 2.6 7.8-7.8 1.4 1.4-9.2 9.2Z"/></svg>'
};

function template(parts) {
  const values = Array.prototype.slice.call(arguments, 1);
  let output = '';
  for (let index = 0; index < parts.length; index += 1) {
    output += parts[index];
    if (index < values.length) output += values[index] == null ? '' : values[index];
  }
  return output;
}

function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>'"]/g, function replaceChar(char) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
    return map[char];
  });
}

function cloneObject(source) {
  return Object.assign({}, source || {});
}

function percent(value) {
  const clean = Math.min(100, Math.max(0, Math.round(value || 0)));
  return `${clean}%`;
}

function formatFrenchDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00`));
  } catch (_) {
    return String(value);
  }
}

function courseTitle(courseId) {
  const course = getCourse(courseId);
  return course ? course.title : courseId || 'Formation';
}

function navigate(path) {
  drawerOpen = false;
  window.location.hash = path;
}

function currentRoute() {
  return window.location.hash.replace('#', '') || '/login';
}

function availableCourses() {
  const allowed = session && Array.isArray(session.courses) ? session.courses : [];
  return courses.filter(function filterCourse(course) {
    return allowed.indexOf(course.id) !== -1;
  });
}

function selectedCourse() {
  const allowed = session && Array.isArray(session.courses) ? session.courses : [];
  const courseId = allowed.indexOf(state.selectedCourseId) !== -1 ? state.selectedCourseId : allowed[0];
  return getCourse(courseId) || courses[0];
}

function averageProgress(course) {
  const progress = state.progress && state.progress[course.id] ? state.progress[course.id] : { completedModules: [] };
  const completed = Array.isArray(progress.completedModules) ? progress.completedModules.length : 0;
  return Math.round((completed / Math.max(course.modules.length, 1)) * 100);
}

function completedModuleIndexes(course) {
  const progress = state.progress && state.progress[course.id] ? state.progress[course.id] : { completedModules: [] };
  return Array.isArray(progress.completedModules) ? progress.completedModules : [];
}

function isRouteActive(route, targets) {
  return targets.indexOf(route) !== -1;
}

function appShell(content, role) {
  const current = currentRoute();
  const pageRole = role || 'student';
  return template`
    <main class="app-shell ${pageRole}" id="top">
      <header class="app-header glass-bar" aria-label="En-tête N.C.R Academy">
        <button class="icon-button" type="button" data-action="open-drawer" aria-label="Ouvrir le menu">${icons.menu}</button>
        <a class="header-brand" href="#${pageRole === 'trainer' ? '/trainer' : '/student/home'}" aria-label="Accueil N.C.R Academy">
          <img src="${BRAND_LOGO}" alt="N.C.R Academy" decoding="async" />
        </a>
        <span class="header-ghost" aria-hidden="true"></span>
      </header>
      ${sideDrawer(pageRole)}
      <section class="workspace" tabindex="-1">${content}</section>
      ${pageRole === 'student' ? bottomTabBar(current) : ''}
    </main>
  `;
}

function sideDrawer(role) {
  const current = currentRoute();
  const course = selectedCourse();
  const roleLinks = role === 'trainer' ? trainerDrawerLinks(current) : studentDrawerLinks(current);
  const drawerClass = drawerOpen ? 'drawer is-open' : 'drawer';
  return template`
    <div class="${drawerClass}" aria-hidden="${drawerOpen ? 'false' : 'true'}">
      <button class="drawer-backdrop" type="button" data-action="close-drawer" aria-label="Fermer le menu"></button>
      <aside class="drawer-panel glass-panel" aria-label="Menu latéral">
        <div class="drawer-head">
          <img src="${BRAND_LOGO}" alt="N.C.R Academy" decoding="async" />
          <button class="icon-button small" type="button" data-action="close-drawer" aria-label="Fermer">${icons.close}</button>
        </div>
        <div class="profile-card">
          <span class="profile-avatar">${escapeHTML((session && session.name ? session.name : 'N').slice(0, 1))}</span>
          <div><strong>${escapeHTML(session && session.name ? session.name : 'Invité')}</strong><small>${role === 'trainer' ? 'Espace Formateur' : 'Espace Stagiaire'}</small></div>
        </div>
        <section class="drawer-section" aria-labelledby="drawer-formations">
          <p class="drawer-title" id="drawer-formations">Domaines de formation</p>
          <div class="course-list">
            ${availableCourses().map(function renderCourse(item) {
              return `<button class="course-pill ${item.id === course.id ? 'active' : ''}" type="button" data-course-id="${escapeHTML(item.id)}"><span>${escapeHTML(item.category)}</span><strong>${escapeHTML(item.title)}</strong></button>`;
            }).join('')}
          </div>
        </section>
        <nav class="drawer-section drawer-links" aria-label="Navigation secondaire">
          <p class="drawer-title">Accès rapides</p>
          ${roleLinks}
          <button class="drawer-link danger" type="button" data-action="logout">Déconnexion</button>
        </nav>
      </aside>
    </div>
  `;
}

function studentDrawerLinks(current) {
  const links = [
    ['/student/documents', 'Documents formation', icons.documents],
    ['/student/contact', 'Contact et assistance', icons.contact]
  ];
  return links.map(function renderLink(item) {
    const active = current === item[0] ? 'active' : '';
    return `<a class="drawer-link ${active}" href="#${item[0]}">${item[2]}<span>${escapeHTML(item[1])}</span></a>`;
  }).join('');
}

function trainerDrawerLinks(current) {
  const links = [
    ['/trainer', 'Suivi général'],
    ['/trainer/guide', 'Guide formateur'],
    ['/trainer/validations', 'Validations'],
    ['/trainer/tickets', 'Tickets stagiaires'],
    ['/trainer/sessions', 'Sessions'],
    ['/trainer/documents', 'Documents'],
    ['/trainer/settings', 'Paramètres']
  ];
  return links.map(function renderTrainerLink(item) {
    const active = current === item[0] ? 'active' : '';
    return `<a class="drawer-link ${active}" href="#${item[0]}"><span>${escapeHTML(item[1])}</span></a>`;
  }).join('');
}

function bottomTabBar(route) {
  const tabs = [
    ['/student/home', 'Accueil', icons.home, ['/student/home', '/student/dashboard']],
    ['/student/learning', 'Leçons', icons.lessons, ['/student/learning']],
    ['/student/quiz', 'Quiz', icons.quiz, ['/student/quiz']],
    ['/student/memo', 'Mémo', icons.memo, ['/student/memo']]
  ];
  return template`
    <nav class="bottom-tabs glass-bar" aria-label="Navigation stagiaire">
      ${tabs.map(function renderTab(tab) {
        const active = isRouteActive(route, tab[3]) ? 'active' : '';
        return `<a class="bottom-tab ${active}" href="#${tab[0]}" aria-label="${escapeHTML(tab[1])}">${tab[2]}<span>${escapeHTML(tab[1])}</span></a>`;
      }).join('')}
    </nav>
  `;
}

function loginView() {
  return template`
    <main class="login-page">
      <section class="login-card glass-panel" aria-labelledby="login-title">
        <div class="login-brand"><img src="${BRAND_LOGO}" alt="Logo N.C.R Academy" decoding="async" /></div>
        <p class="eyebrow">PWA LMS • Mobile-first</p>
        <h1 id="login-title">Connexion à N.C.R Academy</h1>
        <p class="lead">Un espace unique pour apprendre, réviser, s’évaluer et retrouver les documents utiles.</p>
        <form id="login-form" class="auth-form">
          <label>Email<input name="email" type="email" autocomplete="username" required /></label>
          <label>Mot de passe<input name="password" type="password" autocomplete="current-password" required /></label>
          <button class="primary-button" type="submit">Entrer dans l’espace</button>
          <p class="form-error" role="alert" hidden></p>
        </form>
        <div class="demo-box">
          <strong>Comptes de démo</strong>
          <span>Stagiaire : stagiaire@ncr.demo / ncr2026</span>
          <span>Formateur : formateur@ncr.demo / ncr2026</span>
        </div>
        <div class="diagnostic-box" id="supabase-diagnostic">
          <strong>Diagnostic Supabase V5.2</strong>
          <span>${escapeHTML(getBackendDiagnosticSnapshot().message)}</span>
          <button class="secondary-button" type="button" data-action="test-supabase">Tester Supabase avec ces identifiants</button>
          <p class="diagnostic-result" aria-live="polite"></p>
        </div>
      </section>
    </main>
  `;
}

function studentHomeView() {
  const course = selectedCourse();
  const progress = averageProgress(course);
  const score = state.quizScores && state.quizScores[course.id] != null ? state.quizScores[course.id] : null;
  const certified = state.certificates && state.certificates[course.id];
  return appShell(template`
    <section class="hero-card home-hero glass-panel fade-in">
      <p class="eyebrow">Formation active</p>
      <h1>${escapeHTML(course.title)}</h1>
      <p>${escapeHTML(course.public)}</p>
      <div class="meta-grid compact">
        <span>Durée <strong>${escapeHTML(course.duration)}</strong></span>
        <span>Format <strong>${escapeHTML(course.format)}</strong></span>
        <span>Prérequis <strong>${escapeHTML(course.prerequisite)}</strong></span>
      </div>
    </section>
    <section class="quick-grid fade-in delay-1" aria-label="Résumé progression">
      <article class="glass-panel metric-card"><span class="ring" style="--progress:${progress}">${percent(progress)}</span><strong>Progression</strong><small>Leçons consultées</small></article>
      <article class="glass-panel metric-card"><span class="metric">${score == null ? '—' : `${score}%`}</span><strong>Quiz</strong><small>Dernier résultat</small></article>
      <article class="glass-panel metric-card"><span class="metric">${certified ? 'OK' : '—'}</span><strong>Réussite</strong><small>Déblocage à 80%</small></article>
    </section>
    <section class="section-card glass-panel fade-in delay-2">
      <div class="section-heading"><p class="eyebrow">Ton parcours</p><h2>Compétences travaillées</h2></div>
      <ul class="check-list clean">${course.objectives.map(function renderObjective(item) { return `<li>${escapeHTML(item)}</li>`; }).join('')}</ul>
    </section>
    <section class="action-grid fade-in delay-3" aria-label="Actions principales">
      <a class="action-card glass-panel" href="#/student/learning">${icons.lessons}<strong>Continuer les leçons</strong><span>Reprendre le contenu d’étude</span></a>
      <a class="action-card glass-panel" href="#/student/quiz">${icons.quiz}<strong>S’entraîner</strong><span>Répondre aux QCM</span></a>
      <a class="action-card glass-panel" href="#/student/memo">${icons.memo}<strong>Réviser vite</strong><span>Fiches mémo et lexique</span></a>
    </section>
  `, 'student');
}

function containsInternalInstruction(text) {
  const value = String(text || '').toLowerCase();
  const blocked = [
    'aide le formateur',
    'formateur à évaluer',
    'validation possible par observation formateur',
    'traçabilité pédagogique',
    'critères objectifs',
    'consigne formateur',
    'guide du formateur'
  ];
  return blocked.some(function hasBlocked(entry) { return value.indexOf(entry) !== -1; });
}

function studentParagraphs(part) {
  const paragraphs = Array.isArray(part.paragraphs) ? part.paragraphs : [];
  return paragraphs.filter(function keepParagraph(paragraph) {
    return !containsInternalInstruction(paragraph);
  });
}

function learnerActivity(text) {
  let clean = String(text || '').replace('Le stagiaire doit produire une réponse ou une action structurée, puis vérifier le résultat avec les critères de réussite.', 'À toi de produire une réponse ou une action structurée, claire et directement exploitable.');
  clean = clean.replace('Le stagiaire doit', 'Tu dois');
  clean = clean.replace('le stagiaire doit', 'tu dois');
  clean = clean.replace('critères de réussite', 'points de contrôle');
  return clean;
}

function learningView() {
  const course = selectedCourse();
  const completed = completedModuleIndexes(course);
  return appShell(template`
    <section class="page-intro fade-in">
      <p class="eyebrow">Leçons</p>
      <h1>${escapeHTML(course.title)}</h1>
      <p>Contenu d’étude clair, progressif et centré sur ce que tu dois comprendre et savoir appliquer.</p>
    </section>
    <section class="module-list" aria-label="Leçons de formation">
      ${course.modules.map(function renderModule(module, index) {
        const done = completed.indexOf(index) !== -1;
        return template`
          <article class="module-card glass-panel fade-in ${done ? 'done' : ''}">
            <div class="module-topline"><span class="module-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHTML(module.time || 'À ton rythme')}</span></div>
            <h2>${escapeHTML(module.title)}</h2>
            <div class="concept-row">${(module.concepts || []).slice(0, 6).map(function renderConcept(point) { return `<span>${escapeHTML(point)}</span>`; }).join('')}</div>
            ${(module.details || []).map(function renderDetail(part) {
              const paragraphs = studentParagraphs(part);
              if (!paragraphs.length && !(part.keyPoints || []).length) return '';
              return template`
                <section class="lesson-detail">
                  <h3>${escapeHTML(part.title)}</h3>
                  ${paragraphs.map(function renderParagraph(paragraph) { return `<p>${escapeHTML(paragraph)}</p>`; }).join('')}
                  <div class="mini-points">${(part.keyPoints || []).map(function renderPoint(point) { return `<span>${escapeHTML(point)}</span>`; }).join('')}</div>
                </section>
              `;
            }).join('')}
            ${module.activity ? `<div class="practice-box"><strong>Cas pratique</strong><p>${escapeHTML(learnerActivity(module.activity))}</p></div>` : ''}
            <button class="pill-button" type="button" data-action="complete-module" data-index="${index}">${done ? `${icons.check} Compris` : 'Marquer comme compris'}</button>
          </article>
        `;
      }).join('')}
    </section>
  `, 'student');
}

function quizView() {
  const course = selectedCourse();
  const score = state.quizScores && state.quizScores[course.id] != null ? state.quizScores[course.id] : undefined;
  const certified = state.certificates && state.certificates[course.id];
  return appShell(template`
    <section class="page-intro fade-in">
      <p class="eyebrow">Quiz gamifié</p>
      <h1>${escapeHTML(course.title)}</h1>
      <p>Objectif : atteindre 80 % pour débloquer la réussite du module.</p>
    </section>
    <section class="glass-panel content-card fade-in delay-1">
      ${score !== undefined ? `<div class="score-banner ${certified ? 'success' : ''}"><strong>Dernier score : ${score}%</strong><span>${certified ? 'Réussite débloquée' : 'Tu peux recommencer pour progresser'}</span></div>` : ''}
      <form id="quiz-form" class="quiz-form">
        ${course.quiz.map(function renderQuestion(q, index) {
          return template`
            <fieldset class="quiz-question">
              <legend>${index + 1}. ${escapeHTML(q.question)}</legend>
              ${q.options.map(function renderOption(option, optionIndex) {
                return `<label><input type="radio" name="q${index}" value="${optionIndex}" required /> <span>${escapeHTML(option)}</span></label>`;
              }).join('')}
              ${score !== undefined ? `<div class="correction"><strong>Corrigé commenté</strong><p>Réponse attendue : ${escapeHTML(q.options[q.answer])}</p><p>${escapeHTML(q.explanation || 'Cette réponse correspond à la logique du module.')}</p></div>` : ''}
            </fieldset>
          `;
        }).join('')}
        <button class="primary-button" type="submit">Valider mon quiz</button>
      </form>
      ${certified ? certificateCard(course) : ''}
    </section>
  `, 'student');
}

function certificateCard(course) {
  const certificate = state.certificates && state.certificates[course.id] ? state.certificates[course.id] : { date: new Date().toISOString(), score: 0 };
  return `<article class="certificate-card"><p class="eyebrow">Réussite débloquée</p><h3>${escapeHTML(course.title)}</h3><p>Débloquée le ${new Date(certificate.date).toLocaleString('fr-FR')} avec ${certificate.score}%.</p><button class="pill-button" type="button" data-action="print-certificate">Imprimer</button></article>`;
}

function memoView() {
  const course = selectedCourse();
  return appShell(template`
    <section class="page-intro fade-in">
      <p class="eyebrow">Révision rapide</p>
      <h1>Fiches mémo</h1>
      <p>Les points essentiels pour revoir rapidement avant un exercice ou un quiz.</p>
    </section>
    <section class="section-grid two fade-in delay-1">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">À retenir</p><h2>${escapeHTML(course.title)}</h2></div>
        <ul class="memo-list">${course.memo.map(function renderMemo(item) { return `<li>${escapeHTML(item)}</li>`; }).join('')}</ul>
      </article>
      <article class="glass-panel content-card accent-card">
        <div class="section-heading"><p class="eyebrow">Lexique</p><h2>Notions importantes</h2></div>
        <dl class="lexicon-list">${(course.lexicon || []).map(function renderTerm(item) { return `<div><dt>${escapeHTML(item.term)}</dt><dd>${escapeHTML(item.definition)}</dd></div>`; }).join('')}</dl>
      </article>
    </section>
  `, 'student');
}

function contactView() {
  return appShell(template`
    <section class="section-grid two fade-in">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Contact interne</p><h1>Créer une demande</h1></div>
        <p class="lead small">Utilise cet espace pour poser une question liée à ton parcours, un document ou une difficulté d’apprentissage.</p>
        <form id="ticket-form" class="auth-form">
          <label>Sujet<input name="subject" required /></label>
          <label>Message<textarea name="message" rows="5" required></textarea></label>
          <button class="primary-button" type="submit">Envoyer la demande</button>
        </form>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Historique</p><h2>Tickets récents</h2></div>
        ${ticketList()}
      </article>
    </section>
  `, 'student');
}

function ticketList() {
  const tickets = state.tickets || [];
  if (!tickets.length) return '<p>Aucun ticket pour le moment.</p>';
  return `<div class="ticket-list">${tickets.map(function renderTicket(ticket) { return `<article><strong>${escapeHTML(ticket.subject)}</strong><span>${escapeHTML(ticket.status)} • ${new Date(ticket.createdAt).toLocaleString('fr-FR')}</span><p>${escapeHTML(ticket.message)}</p></article>`; }).join('')}</div>`;
}

function documentsView(role) {
  const supabaseDocs = remoteDocuments.map(function normalizeRemoteDoc(doc) {
    return {
      name: doc.name || doc.title || 'Document Supabase',
      type: doc.type || 'Document',
      status: doc.status || 'Disponible en ligne',
      href: doc.downloadUrl || doc.href || '',
      courseId: doc.course_id || '',
      visibility: doc.visibility || 'course'
    };
  });
    const allDocs = supabaseDocs;
  const trainerUpload = role === 'trainer' ? trainerDocumentUpload() : '';
  const emptyRemoteNotice = isRemoteSession() ? '' : '<div class="info-banner"><strong>Mode local actif</strong><span>Renseigne Supabase pour afficher les convocations, attestations et livrets privés côté serveur.</span></div>';
  return appShell(template`
    <section class="glass-panel content-card fade-in">
      <div class="section-heading"><p class="eyebrow">Espace documents</p><h1>Documents liés à la formation</h1></div>
      <p class="lead small">Les documents pédagogiques et légaux générés depuis Supabase apparaissent ici quand le compte est connecté. Les anciens modèles locaux ont été retirés pour épurer l’espace documents.</p>
      ${emptyRemoteNotice}
      ${trainerUpload}
      <div class="document-grid">
        ${allDocs.length ? allDocs.map(function renderDoc(doc) {
          return `<article><span>${escapeHTML(doc.type)}</span><strong>${escapeHTML(doc.name)}</strong><p>${escapeHTML(doc.status)}</p>${doc.href ? `<a class="ghost-button doc-link" href="${escapeHTML(doc.href)}" target="_blank" rel="noopener">Ouvrir</a>` : '<button class="ghost-button" disabled>À connecter</button>'}</article>`;
        }).join('') : '<article><strong>Aucun document disponible</strong><p>Crée une session, dépose un livret ou génère une convocation pour alimenter cet espace.</p><button class="ghost-button" disabled>En attente</button></article>'}
      </div>
    </section>
  `, role || 'student');
}

function trainerDocumentUpload() {
  const students = remoteUsers.filter(function onlyStudents(user) { return user.role === 'student'; });
  const courseOptions = courses.map(function renderCourseOption(course) {
    return `<option value="${escapeHTML(course.id)}">${escapeHTML(course.title)}</option>`;
  }).join('');
  const studentOptions = students.map(function renderStudentOption(user) {
    const label = `${user.name}${user.email ? ' — ' + user.email : ''}`;
    return `<option value="${escapeHTML(user.id)}">${escapeHTML(label)}</option>`;
  }).join('');
  const remoteNotice = isRemoteSession()
    ? '<p class="lead small">Dépose un PDF, une convocation, une attestation ou un livret. Supabase gère l’accès sécurisé.</p>'
    : '<p class="lead small">Connecte Supabase pour activer l’upload réel. En mode démo, ce formulaire reste verrouillé.</p>';
  return template`
    <div class="upload-zone glass-panel">
      <div class="section-heading"><p class="eyebrow">Gestion formateur</p><h2>Ajouter un document sécurisé</h2></div>
      ${remoteNotice}
      <form id="document-upload-form" class="auth-form compact-form">
        <label>Titre du document<input name="title" required placeholder="Convocation formation SST" /></label>
        <label>Type de document
          <select name="type" required>
            <option value="convocation">Convocation</option>
            <option value="attestation">Attestation</option>
            <option value="livret">Livret</option>
            <option value="support">Support pédagogique</option>
            <option value="autre">Autre document</option>
          </select>
        </label>
        <label>Formation concernée
          <select name="courseId" required>${courseOptions}</select>
        </label>
        <label>Stagiaire destinataire
          <select name="targetUserId">
            <option value="">Document partagé avec les stagiaires de la formation</option>
            ${studentOptions}
          </select>
        </label>
        <label>Fichier à envoyer<input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required /></label>
        <p class="form-help">Pour une convocation ou une attestation nominative, choisis obligatoirement un stagiaire. Pour un livret, laisse le champ stagiaire vide.</p>
        <p class="form-error" role="alert" hidden></p>
        <button class="primary-button" type="submit" ${isRemoteSession() ? '' : 'disabled'}>Envoyer dans Supabase</button>
      </form>
    </div>
  `;
}

function trainerOverview() {
  const events = listEvents();
  return appShell(template`
    <section class="hero-card glass-panel fade-in">
      <p class="eyebrow">Espace Formateur</p>
      <h1>Pilotage pédagogique</h1>
      <p>Suivi local de la progression, des quiz, des demandes et des traces exportables.</p>
    </section>
    <section class="quick-grid fade-in delay-1">
      <article class="glass-panel metric-card"><span class="metric">${events.length}</span><strong>Évènements tracés</strong><button class="pill-button compact" type="button" data-action="export-events">Exporter JSON</button></article>
      <article class="glass-panel metric-card"><span class="metric">${courses.length}</span><strong>Domaines</strong><small>Catalogue actif</small></article>
      <article class="glass-panel metric-card"><span class="metric">${(state.tickets || []).length}</span><strong>Tickets</strong><small>Demandes stagiaires</small></article>
      <article class="glass-panel metric-card"><span class="metric">+</span><strong>Sessions</strong><a class="pill-button compact" href="#/trainer/sessions">Créer</a></article>
    </section>
    <section class="section-grid two fade-in delay-2">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Conformité</p><h2>Points Qualiopi intégrés</h2></div>
        <ul class="check-list clean">${qualiopiChecklist.map(function renderItem(item) { return `<li><strong>${escapeHTML(item.label)}</strong><span>${escapeHTML(item.detail)}</span></li>`; }).join('')}</ul>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Journal</p><h2>Dernières actions</h2></div>
        ${events.slice(0, 8).map(function renderEvent(event) { return `<p class="event-line"><strong>${escapeHTML(event.type)}</strong><span>${new Date(event.createdAt).toLocaleString('fr-FR')}</span></p>`; }).join('') || '<p>Aucun évènement pour le moment.</p>'}
      </article>
    </section>
  `, 'trainer');
}

function trainerGuideView() {
  const course = selectedCourse();
  return appShell(template`
    <section class="page-intro fade-in">
      <p class="eyebrow">Guide formateur</p>
      <h1>${escapeHTML(course.title)}</h1>
      <p>Les consignes d’animation, les critères de réussite et les éléments de validation sont volontairement réservés à cet espace.</p>
    </section>
    <section class="glass-panel content-card fade-in delay-1">
      <div class="section-heading"><p class="eyebrow">Cadrage</p><h2>Objectifs pédagogiques publics</h2></div>
      <ul class="check-list clean">${course.objectives.map(function renderObj(item) { return `<li>${escapeHTML(item)}</li>`; }).join('')}</ul>
    </section>
    <section class="module-list trainer-guide" aria-label="Guide d’animation formateur">
      ${course.modules.map(function renderModule(module, index) {
        return template`
          <article class="module-card glass-panel fade-in">
            <div class="module-topline"><span class="module-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHTML(module.time || 'Temps à adapter')}</span></div>
            <h2>${escapeHTML(module.title)}</h2>
            <section class="lesson-detail trainer-only"><h3>Intentions d’animation</h3><div class="mini-points">${(module.goals || []).map(function renderGoal(goal) { return `<span>${escapeHTML(goal)}</span>`; }).join('')}</div></section>
            <section class="lesson-detail"><h3>Déroulé conseillé</h3>${(module.details || []).map(function renderDetail(part) { return `<div class="trainer-step"><strong>${escapeHTML(part.title)}</strong>${(part.paragraphs || []).map(function renderP(paragraph) { return `<p>${escapeHTML(paragraph)}</p>`; }).join('')}</div>`; }).join('')}</section>
            ${module.activity ? `<div class="practice-box"><strong>Activité d’apprentissage</strong><p>${escapeHTML(module.activity)}</p></div>` : ''}
            <div class="criteria-box"><strong>Critères de réussite</strong><ul>${(module.criteria || []).map(function renderCriterion(item) { return `<li>${escapeHTML(item)}</li>`; }).join('')}</ul><p>${escapeHTML(module.traceability || 'Trace possible par observation, production ou résultat de quiz.')}</p></div>
          </article>
        `;
      }).join('')}
    </section>
  `, 'trainer');
}

function trainerValidations() {
  return appShell(template`
    <section class="glass-panel content-card fade-in">
      <div class="section-heading"><p class="eyebrow">Validations</p><h1>Progression par formation</h1></div>
      <div class="validation-list">
        ${courses.map(function renderValidation(course) {
          const progress = averageProgress(course);
          const score = state.quizScores && state.quizScores[course.id] != null ? state.quizScores[course.id] : '—';
          const cert = state.certificates && state.certificates[course.id] ? 'Débloquée' : 'Non validée';
          return `<article><strong>${escapeHTML(course.title)}</strong><span>Progression ${progress}%</span><span>Quiz ${score}%</span><span>${cert}</span></article>`;
        }).join('') : '<article><strong>Aucun document disponible</strong><p>Crée une session, dépose un livret ou génère une convocation pour alimenter cet espace.</p><button class="ghost-button" disabled>En attente</button></article>'}
      </div>
    </section>
  `, 'trainer');
}

function trainerTickets() {
  return appShell(template`
    <section class="glass-panel content-card fade-in">
      <div class="section-heading"><p class="eyebrow">Assistance</p><h1>Tickets stagiaires</h1></div>
      ${ticketList()}
    </section>
  `, 'trainer');
}


function trainerSessionsView() {
  const courseOptions = courses.map(function renderCourseOption(course) {
    return `<option value="${escapeHTML(course.id)}">${escapeHTML(course.title)}</option>`;
  }).join('');
  const students = remoteUsers.filter(function onlyStudents(user) { return user.role === 'student'; });
  const studentOptions = students.map(function renderStudentOption(user) {
    const label = `${user.name || user.full_name || 'Stagiaire'}${user.email ? ' — ' + user.email : ''}`;
    return `<option value="${escapeHTML(user.id)}">${escapeHTML(label)}</option>`;
  }).join('');
  const studentNotice = isRemoteSession()
    ? '<p class="form-help">Sélectionne les stagiaires déjà créés dans Supabase. Si un élève n’apparaît pas, vérifie sa ligne dans profiles avec role = student.</p>'
    : '<p class="form-help">Connecte Supabase pour charger la liste réelle des stagiaires.</p>';
  const sessionsHtml = remoteSessions.length
    ? `<div class="validation-list">${remoteSessions.map(function renderSession(item) {
        const studentsText = item.studentCount > 1 ? `${item.studentCount} stagiaires` : `${item.studentCount} stagiaire`;
        const convocationText = `${item.convocationCount || 0}/${item.studentCount || 0} convocation${(item.studentCount || 0) > 1 ? 's' : ''}`;
        return `<article>
          <strong>${escapeHTML(item.title || 'Session de formation')}</strong>
          <span>${escapeHTML(courseTitle(item.course_id))}</span>
          <span>${formatFrenchDate(item.start_date)} → ${formatFrenchDate(item.end_date)}${item.start_time ? ' · ' + escapeHTML(String(item.start_time).slice(0, 5)) : ''}${item.end_time ? '-' + escapeHTML(String(item.end_time).slice(0, 5)) : ''}</span>
          <span>${escapeHTML(item.location || 'Lieu à préciser')} · ${studentsText} · ${convocationText} · ${escapeHTML(item.status || 'scheduled')}</span>
        </article>`;
      }).join('')}</div>`
    : '<p class="form-help">Aucune session enregistrée pour l’instant. Crée ta première session ci-dessous.</p>';

  return appShell(template`
    <section class="hero-card glass-panel fade-in">
      <p class="eyebrow">Espace Formateur</p>
      <h1>Sessions de formation</h1>
      <p>Crée une session réelle dans Supabase, rattache les stagiaires et génère automatiquement les convocations PDF dans leurs espaces documents.</p>
    </section>

    <section class="glass-panel content-card fade-in delay-1">
      <div class="section-heading"><p class="eyebrow">Planning</p><h2>Sessions enregistrées</h2></div>
      ${sessionsHtml}
    </section>

    <section class="section-grid two fade-in delay-2">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Nouvelle session</p><h2>Créer une session</h2></div>
        <form id="session-create-form" class="auth-form compact-form">
          <label>Titre de la session<input name="title" required placeholder="Formation SST initiale" /></label>
          <label>Formation concernée<select name="courseId" required>${courseOptions}</select></label>
          <label>Date de début<input name="startDate" type="date" required /></label>
          <label>Date de fin<input name="endDate" type="date" required /></label>
          <label>Heure de début<input name="startTime" type="time" value="09:00" /></label>
          <label>Heure de fin<input name="endTime" type="time" value="17:00" /></label>
          <label>Lieu<input name="location" placeholder="Adresse, salle ou distanciel" /></label>
          <label>Stagiaires à rattacher
            <select name="studentIds" multiple size="6" ${students.length ? '' : 'disabled'}>
              ${studentOptions || '<option>Aucun stagiaire disponible</option>'}
            </select>
          </label>
          ${studentNotice}
          <p class="form-error" role="status" hidden></p>
          <button class="primary-button" type="submit" ${isRemoteSession() ? '' : 'disabled'}>Créer la session et les convocations</button>
        </form>
      </article>

      <article class="glass-panel content-card accent-card">
        <div class="section-heading"><p class="eyebrow">Étape suivante</p><h2>Documents automatiques</h2></div>
        <ul class="check-list clean">
          <li><strong>Session créée</strong><span>La formation, les dates, le lieu et le formateur sont enregistrés dans training_sessions.</span></li>
          <li><strong>Stagiaires rattachés</strong><span>Les élèves sélectionnés sont ajoutés dans session_students et inscrits à la formation si besoin.</span></li>
          <li><strong>Convocations</strong><span>Chaque création de session génère automatiquement une convocation PDF par stagiaire dans le bucket documents-prives.</span></li>
          <li><strong>Attestations</strong><span>Elles seront générées à la clôture uniquement pour les stagiaires validés.</span></li>
        </ul>
      </article>
    </section>
  `, 'trainer');
}

function trainerSettings() {
  return appShell(template`
    <section class="section-grid two fade-in">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Production</p><h1>Étapes techniques restantes</h1></div>
        <ul class="soft-list">
          <li>Activer Supabase Auth puis désactiver le fallback démo dans supabase.config.js.</li>
          <li>Utiliser Supabase Storage pour les convocations, attestations et livrets privés.</li>
          <li>Envoyer les traces dans Supabase avec export possible depuis le dashboard.</li>
          <li>Générer les attestations avec un vrai moteur PDF côté serveur ou fonction cloud.</li>
        </ul>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">PWA</p><h2>Offline basique actif</h2></div>
        <p>Le service worker met en cache l’interface, les styles, les données pédagogiques et les modèles de documents pour une consultation hors ligne basique.</p>
      </article>
    </section>
  `, 'trainer');
}


async function handleSupabaseDiagnostic(event) {
  event.preventDefault();
  const form = document.querySelector('#login-form');
  const box = document.querySelector('#supabase-diagnostic');
  const result = box ? box.querySelector('.diagnostic-result') : null;
  const button = event.currentTarget;
  if (!form || !result) return;
  if (button) button.disabled = true;
  result.textContent = 'Test Supabase en cours...';
  try {
    const diagnostic = await testBackendConnection(form.email.value, form.password.value);
    if (diagnostic.ok) {
      result.textContent = `OK Supabase : utilisateur ${diagnostic.email || diagnostic.userId}, rôle ${diagnostic.role}.`;
      result.classList.remove('is-error');
      result.classList.add('is-success');
    } else {
      result.textContent = `Blocage ${diagnostic.step || 'configuration'} : ${diagnostic.error || diagnostic.message || 'erreur non précisée'}`;
      result.classList.remove('is-success');
      result.classList.add('is-error');
    }
  } catch (error) {
    result.textContent = error && error.message ? error.message : String(error);
    result.classList.remove('is-success');
    result.classList.add('is-error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const error = form.querySelector('.form-error');
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  if (error) error.hidden = true;
  try {
    session = await login(form.email.value, form.password.value);
    remoteHydratedFor = null;
    await hydrateRemoteData();
    trackEvent('login_success', { role: session.role, email: session.email, backend: session.backend });
    navigate(session.role === 'trainer' ? '/trainer' : '/student/home');
  } catch (err) {
    if (error) {
      error.textContent = err.message;
      error.hidden = false;
    }
    trackEvent('login_failed', { email: form.email.value });
  } finally {
    if (submit) submit.disabled = false;
  }
}

function bindEvents() {
  const loginForm = document.querySelector('#login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

  document.querySelectorAll('[data-action="test-supabase"]').forEach(function bindSupabaseDiagnostic(button) {
    button.addEventListener('click', handleSupabaseDiagnostic);
  });

  document.querySelectorAll('[data-action="open-drawer"]').forEach(function bindOpen(button) {
    button.addEventListener('click', function openDrawer() {
      drawerOpen = true;
      render();
    });
  });

  document.querySelectorAll('[data-action="close-drawer"]').forEach(function bindClose(button) {
    button.addEventListener('click', function closeDrawer() {
      drawerOpen = false;
      render();
    });
  });

  document.querySelectorAll('[data-action="logout"]').forEach(function bindLogout(button) {
    button.addEventListener('click', async function doLogout() {
      trackEvent('logout', { user: session && session.email ? session.email : 'unknown' });
      await logout();
      session = null;
      remoteHydratedFor = null;
      remoteDocuments = [];
      remoteUsers = [];
      remoteSessions = [];
      drawerOpen = false;
      navigate('/login');
    });
  });

  document.querySelectorAll('[data-course-id]').forEach(function bindCourse(button) {
    button.addEventListener('click', function changeCourse() {
      state = patchState({ selectedCourseId: button.dataset.courseId });
      syncState('course_selected');
      drawerOpen = false;
      trackEvent('course_selected', { courseId: button.dataset.courseId });
      render();
    });
  });

  document.querySelectorAll('[data-action="complete-module"]').forEach(function bindComplete(button) {
    button.addEventListener('click', function completeModule() {
      const course = selectedCourse();
      const index = Number(button.dataset.index);
      const progress = cloneObject(state.progress);
      const currentProgress = progress[course.id] || { completedModules: [] };
      const nextCompleted = currentProgress.completedModules ? currentProgress.completedModules.slice() : [];
      if (nextCompleted.indexOf(index) === -1) nextCompleted.push(index);
      progress[course.id] = { completedModules: nextCompleted, updatedAt: new Date().toISOString() };
      state = patchState({ progress: progress });
      syncState('module_completed');
      trackEvent('module_completed', { courseId: course.id, moduleIndex: index, moduleTitle: course.modules[index].title });
      render();
    });
  });

  const quizForm = document.querySelector('#quiz-form');
  if (quizForm) quizForm.addEventListener('submit', function submitQuiz(event) {
    event.preventDefault();
    const course = selectedCourse();
    const data = new FormData(quizForm);
    let correct = 0;
    course.quiz.forEach(function markQuestion(q, index) {
      const value = Number(data.get(`q${index}`));
      if (value === q.answer) correct += 1;
    });
    const score = Math.round((correct / course.quiz.length) * 100);
    const quizScores = cloneObject(state.quizScores);
    const certificates = cloneObject(state.certificates);
    quizScores[course.id] = score;
    if (score >= 80) certificates[course.id] = { score: score, date: new Date().toISOString(), title: course.title };
    state = patchState({ quizScores: quizScores, certificates: certificates });
    syncState('quiz_submitted');
    trackEvent('quiz_submitted', { courseId: course.id, score: score, certified: score >= 80 });
    render();
  });

  const ticketForm = document.querySelector('#ticket-form');
  if (ticketForm) ticketForm.addEventListener('submit', function submitTicket(event) {
    event.preventDefault();
    const data = new FormData(ticketForm);
    const ticket = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ticket-${Date.now()}`,
      status: 'ouvert',
      priority: 'normal',
      subject: data.get('subject'),
      message: data.get('message'),
      createdAt: new Date().toISOString(),
      author: session && session.name ? session.name : 'Stagiaire'
    };
    const tickets = (state.tickets || []).slice();
    tickets.unshift(ticket);
    state = patchState({ tickets: tickets });
    syncState('ticket_created');
    if (isRemoteSession()) createRemoteTicket(session, ticket).catch(function ignoreTicketError(error) { console.warn('Ticket distant indisponible', error); });
    trackEvent('ticket_created', { ticketId: ticket.id, subject: ticket.subject });
    render();
  });

  const sessionCreateForm = document.querySelector('#session-create-form');
  if (sessionCreateForm) sessionCreateForm.addEventListener('submit', async function submitSessionDraft(event) {
    event.preventDefault();
    const notice = sessionCreateForm.querySelector('.form-error');
    const submit = sessionCreateForm.querySelector('button[type="submit"]');
    const data = new FormData(sessionCreateForm);
    const select = sessionCreateForm.querySelector('select[name="studentIds"]');
    const studentIds = select ? Array.from(select.selectedOptions).map(function optionValue(option) { return option.value; }).filter(Boolean) : [];
    if (notice) notice.hidden = true;
    if (!isRemoteSession()) {
      if (notice) {
        notice.textContent = 'Supabase doit être activé pour créer une session réelle.';
        notice.hidden = false;
      }
      return;
    }
    if (!studentIds.length) {
      if (notice) {
        notice.textContent = 'Sélectionne au moins un stagiaire pour créer la session.';
        notice.hidden = false;
      }
      return;
    }
    if (submit) submit.disabled = true;
    try {
      const created = await createRemoteSession(session, {
        title: data.get('title'),
        courseId: data.get('courseId'),
        startDate: data.get('startDate'),
        endDate: data.get('endDate'),
        startTime: data.get('startTime'),
        endTime: data.get('endTime'),
        location: data.get('location'),
        studentIds
      });
      remoteSessions = await listRemoteSessions(session);
      remoteDocuments = await listRemoteDocuments(session);
      trackEvent('session_created', { sessionId: created.id, courseId: data.get('courseId'), studentCount: studentIds.length, convocationCount: created.convocationCount || 0 });
      sessionCreateForm.reset();
      render();
    } catch (sessionError) {
      if (notice) {
        notice.textContent = sessionError.message || 'Création de session impossible. Vérifie les tables training_sessions, session_students, training_documents et les règles Storage.';
        notice.hidden = false;
      }
    } finally {
      if (submit) submit.disabled = !isRemoteSession();
    }
  });

  const documentUploadForm = document.querySelector('#document-upload-form');
  if (documentUploadForm) documentUploadForm.addEventListener('submit', async function submitDocument(event) {
    event.preventDefault();
    const error = documentUploadForm.querySelector('.form-error');
    const submit = documentUploadForm.querySelector('button[type="submit"]');
    const data = new FormData(documentUploadForm);
    const fileInput = documentUploadForm.querySelector('input[name="file"]');
    if (error) error.hidden = true;
    if (submit) submit.disabled = true;
    try {
      await uploadRemoteDocument(session, {
        title: data.get('title'),
        type: data.get('type'),
        courseId: data.get('courseId'),
        targetUserId: data.get('targetUserId'),
        file: fileInput && fileInput.files ? fileInput.files[0] : null
      });
      remoteDocuments = await listRemoteDocuments(session);
      trackEvent('document_uploaded', { title: data.get('title'), type: data.get('type'), courseId: data.get('courseId') });
      render();
    } catch (uploadError) {
      if (error) {
        error.textContent = uploadError.message || 'Upload impossible. Vérifie Supabase et les règles de sécurité.';
        error.hidden = false;
      }
    } finally {
      if (submit) submit.disabled = !isRemoteSession();
    }
  });

  document.querySelectorAll('[data-action="print-certificate"]').forEach(function bindPrint(button) {
    button.addEventListener('click', function printCertificate() { window.print(); });
  });

  document.querySelectorAll('[data-action="export-events"]').forEach(function bindExport(button) {
    button.addEventListener('click', exportEvents);
  });

  document.querySelectorAll('.drawer-link, .bottom-tab, .action-card, .header-brand').forEach(function bindNavigationLink(link) {
    link.addEventListener('click', function closeAfterLink() { drawerOpen = false; });
  });
}

function guarded(route) {
  if (!session && route !== '/login') {
    navigate('/login');
    return loginView();
  }
  if (session && route === '/login') {
    navigate(session.role === 'trainer' ? '/trainer' : '/student/home');
    return session.role === 'trainer' ? trainerOverview() : studentHomeView();
  }
  if (session && session.role === 'student' && route.startsWith('/trainer')) return studentHomeView();
  if (session && session.role === 'trainer' && route.startsWith('/student')) return trainerOverview();

  switch (route) {
    case '/login': return loginView();
    case '/student/dashboard':
    case '/student/home': return studentHomeView();
    case '/student/learning': return learningView();
    case '/student/quiz': return quizView();
    case '/student/memo': return memoView();
    case '/student/contact': return contactView();
    case '/student/documents': return documentsView('student');
    case '/trainer': return trainerOverview();
    case '/trainer/guide': return trainerGuideView();
    case '/trainer/validations': return trainerValidations();
    case '/trainer/tickets': return trainerTickets();
    case '/trainer/sessions': return trainerSessionsView();
    case '/trainer/documents': return documentsView('trainer');
    case '/trainer/settings': return trainerSettings();
    default: return session && session.role === 'trainer' ? trainerOverview() : studentHomeView();
  }
}

async function render() {
  state = loadState();
  session = getSession();
  await hydrateRemoteData();
  app.innerHTML = guarded(currentRoute());
  document.body.classList.toggle('drawer-lock', drawerOpen);
  bindEvents();
}

window.addEventListener('hashchange', function onHashChange() { render(); });
window.addEventListener('DOMContentLoaded', function ready() {
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(function swError(error) {
      console.warn('Service worker non enregistré', error);
    });
  }
});
