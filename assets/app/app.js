import { login, logout, getSession } from './core/auth.js';
import { loadState, patchState, replaceState } from './core/state.js';
import { addEvent, listEvents, exportEvents } from './core/tracking.js';
import { isBackendEnabled, loadRemoteState, saveRemoteState, recordRemoteEvent, createRemoteTicket, listRemoteDocuments, listRemoteUsers, uploadRemoteDocument, listRemoteSessions, createRemoteSession, updateRemoteSessionStudent, closeRemoteSession, listRemoteTickets, updateRemoteTicketStatus, createRemoteStudent, createRemoteTicketReply, updateRemoteStudent, generateRemoteAttendanceSheet, deleteRemoteDocument, listRemoteSatisfaction, createRemoteSatisfaction } from './core/backend.js?v=emails-v6-1';
import { courses, getCourse } from './data/catalog.js';
import { qualiopiChecklist } from './data/qualopi.js';

const app = document.querySelector('#app');
const ASSET_VERSION = '6.1-emails-auto';
const BRAND_LOGO = `${new URL('../brand/logo-ncr-academy.png', import.meta.url).href}?v=${ASSET_VERSION}`;
let state = loadState();
let session = getSession();
let drawerOpen = false;
let remoteDocuments = [];
let remoteUsers = [];
let remoteSessions = [];
let remoteTickets = [];
let remoteSatisfaction = [];
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
    remoteTickets = await listRemoteTickets(session);
    remoteSatisfaction = await listRemoteSatisfaction(session);
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
    ['/trainer/students', 'Mes stagiaires'],
    ['/trainer/sessions', 'Sessions'],
    ['/trainer/documents', 'Documents'],
    ['/trainer/satisfaction', 'Satisfaction'],
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
    ['/student/memo', 'Mémo', icons.memo, ['/student/memo']],
    ['/student/documents', 'Docs', icons.documents, ['/student/documents']],
    ['/student/contact', 'Aide', icons.contact, ['/student/contact']]
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
      </section>
    </main>
  `;
}

function studentHomeView() {
  const course = selectedCourse();
  const progress = averageProgress(course);
  const score = state.quizScores && state.quizScores[course.id] != null ? state.quizScores[course.id] : null;
  const certified = state.certificates && state.certificates[course.id];

  const tickets = isRemoteSession() ? remoteTickets : (state.tickets || []);
  const openTickets = tickets.filter(function isOpen(ticket) {
    return ['ferme', 'traite'].indexOf(ticket.status) === -1;
  });
  const convocations = remoteDocuments.filter(function isConvocation(doc) { return doc.type === 'convocation'; });
  const attestations = remoteDocuments.filter(function isAttestation(doc) { return doc.type === 'attestation'; });
  const learningDocs = remoteDocuments.filter(function isSupport(doc) {
    return ['livret', 'support', 'autre'].indexOf(doc.type) !== -1;
  });
  const latestDocs = remoteDocuments.slice(0, 4);

  return appShell(template`
    <section class="hero-card home-hero glass-panel fade-in">
      <p class="eyebrow">Tableau de bord stagiaire</p>
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
      <article class="glass-panel metric-card"><span class="metric">${openTickets.length}</span><strong>Tickets ouverts</strong><a class="pill-button compact" href="#/student/contact">Voir</a></article>
      <article class="glass-panel metric-card"><span class="metric">${remoteDocuments.length}</span><strong>Documents</strong><a class="pill-button compact" href="#/student/documents">Ouvrir</a></article>
    </section>

    <section class="section-grid two fade-in delay-2">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Documents officiels</p><h2>Convocations et attestations</h2></div>
        <ul class="check-list clean">
          <li><strong>Convocations</strong><span>${convocations.length ? `${convocations.length} document${convocations.length > 1 ? 's' : ''} disponible${convocations.length > 1 ? 's' : ''}` : 'Aucune convocation pour le moment'}</span></li>
          <li><strong>Attestations</strong><span>${attestations.length ? `${attestations.length} attestation${attestations.length > 1 ? 's' : ''} disponible${attestations.length > 1 ? 's' : ''}` : 'Aucune attestation générée pour le moment'}</span></li>
          <li><strong>Supports et livrets</strong><span>${learningDocs.length ? `${learningDocs.length} support${learningDocs.length > 1 ? 's' : ''} disponible${learningDocs.length > 1 ? 's' : ''}` : 'Espace prévu pour tes livrets et supports pédagogiques'}</span></li>
        </ul>
        <a class="ghost-button doc-link" href="#/student/documents">Accéder à mes documents</a>
      </article>

      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Derniers documents</p><h2>À consulter</h2></div>
        ${latestDocs.length ? `<div class="dashboard-doc-list">${latestDocs.map(function renderDoc(doc) {
          return `<article><span>${escapeHTML(doc.type || 'Document')}</span><strong>${escapeHTML(doc.name || doc.title || 'Document')}</strong>${doc.href || doc.downloadUrl ? `<a class="pill-button compact" href="${escapeHTML(doc.href || doc.downloadUrl)}" target="_blank" rel="noopener">Ouvrir</a>` : ''}</article>`;
        }).join('')}</div>` : '<p class="form-help">Tes documents apparaîtront ici : convocation, attestation de fin, livret, support pédagogique.</p>'}
      </article>
    </section>

    <section class="section-card glass-panel fade-in delay-3">
      <div class="section-heading"><p class="eyebrow">Ton parcours</p><h2>Compétences travaillées</h2></div>
      <ul class="check-list clean">${course.objectives.map(function renderObjective(item) { return `<li>${escapeHTML(item)}</li>`; }).join('')}</ul>
    </section>

    <section class="action-grid fade-in delay-4" aria-label="Actions principales">
      <a class="action-card glass-panel" href="#/student/learning">${icons.lessons}<strong>Continuer les leçons</strong><span>Reprendre le contenu d’étude</span></a>
      <a class="action-card glass-panel" href="#/student/quiz">${icons.quiz}<strong>S’entraîner</strong><span>Répondre aux QCM</span></a>
      <a class="action-card glass-panel" href="#/student/contact">${icons.contact}<strong>Échanger avec le formateur</strong><span>Créer ou suivre un ticket</span></a>
      <a class="action-card glass-panel" href="#/student/satisfaction">${icons.quiz}<strong>Donner ton avis</strong><span>Questionnaire de satisfaction</span></a>
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
        ${ticketList('student')}
      </article>
    </section>
  `, 'student');
}

function ticketList(role) {
  const tickets = isRemoteSession() ? remoteTickets : (state.tickets || []);
  if (!tickets.length) return '<p>Aucun ticket pour le moment.</p>';
  return `<div class="ticket-list">${tickets.map(function renderTicket(ticket) {
    const created = ticket.createdAt || ticket.created_at || new Date().toISOString();
    const authorLine = ticket.authorName || ticket.author_name || ticket.author || '';
    const authorEmail = ticket.authorEmail || ticket.author_email || '';
    const replies = ticket.replies || [];
    const closed = ['ferme', 'traite'].indexOf(ticket.status) !== -1;
    const repliesHtml = replies.length
      ? `<div class="ticket-replies">${replies.map(function renderReply(reply) {
          const replyDate = reply.createdAt || reply.created_at || new Date().toISOString();
          return `<article class="ticket-reply ${reply.authorRole === 'trainer' ? 'from-trainer' : 'from-student'}">
            <strong>${escapeHTML(reply.authorName || (reply.authorRole === 'trainer' ? 'Formateur' : 'Stagiaire'))}</strong>
            <span>${escapeHTML(reply.authorRole === 'trainer' ? 'Réponse formateur' : 'Message stagiaire')} • ${new Date(replyDate).toLocaleString('fr-FR')}</span>
            <p>${escapeHTML(reply.message || '')}</p>
          </article>`;
        }).join('')}</div>`
      : '<p class="form-help">Aucune réponse pour le moment.</p>';
    const statusForm = role === 'trainer'
      ? `<form class="ticket-status-form" data-ticket-id="${escapeHTML(ticket.id)}">
          <label>Statut
            <select name="status">
              <option value="ouvert" ${(ticket.status || 'ouvert') === 'ouvert' ? 'selected' : ''}>Ouvert</option>
              <option value="en_cours" ${ticket.status === 'en_cours' ? 'selected' : ''}>En cours</option>
              <option value="traite" ${ticket.status === 'traite' ? 'selected' : ''}>Traité</option>
              <option value="ferme" ${ticket.status === 'ferme' ? 'selected' : ''}>Fermé</option>
            </select>
          </label>
          <button class="ghost-button compact" type="submit">Mettre à jour</button>
        </form>`
      : '';
    const replyForm = !closed
      ? `<form class="ticket-reply-form" data-ticket-id="${escapeHTML(ticket.id)}">
          <label>${role === 'trainer' ? 'Répondre au stagiaire' : 'Répondre au formateur'}
            <textarea name="message" rows="3" required placeholder="${role === 'trainer' ? 'Écris ta réponse directement ici...' : 'Ajoute une précision ou une réponse...'}"></textarea>
          </label>
          <button class="primary-button compact" type="submit">Envoyer la réponse</button>
        </form>`
      : '<p class="form-help">Ce ticket est clôturé.</p>';
    return `<article class="ticket-card">
      <strong>${escapeHTML(ticket.subject)}</strong>
      <span>${escapeHTML(ticket.status || 'ouvert')} • ${new Date(created).toLocaleString('fr-FR')}</span>
      ${authorLine || authorEmail ? `<span>${escapeHTML(authorLine)}${authorEmail ? ' — ' + escapeHTML(authorEmail) : ''}</span>` : ''}
      <p>${escapeHTML(ticket.message)}</p>
      ${repliesHtml}
      <div class="ticket-actions">${statusForm}${replyForm}</div>
    </article>`;
  }).join('')}</div>`;
}

function documentsView(role) {
  const supabaseDocs = remoteDocuments.map(function normalizeRemoteDoc(doc) {
    return {
      id: doc.id,
      name: doc.name || doc.title || 'Document Supabase',
      type: doc.type || 'Document',
      status: doc.status || 'Disponible en ligne',
      href: doc.downloadUrl || doc.href || '',
      courseId: doc.course_id || '',
      targetUserId: doc.target_user_id || doc.targetUserId || '',
      visibility: doc.visibility || 'course'
    };
  });
  const allDocs = supabaseDocs;
  const trainerUpload = role === 'trainer' ? trainerDocumentUpload() : '';
  const emptyRemoteNotice = isRemoteSession() ? '' : '<div class="info-banner"><strong>Mode local actif</strong><span>Renseigne Supabase pour afficher les convocations, attestations et livrets privés côté serveur.</span></div>';
  const groupedCounts = ['convocation', 'attestation', 'emargement', 'livret', 'support'].map(function countType(type) {
    const count = allDocs.filter(function byType(doc) { return doc.type === type; }).length;
    return `<span>${escapeHTML(type)} <strong>${count}</strong></span>`;
  }).join('');

  return appShell(template`
    <section class="glass-panel content-card fade-in">
      <div class="section-heading"><p class="eyebrow">Espace documents</p><h1>${role === 'trainer' ? 'Gestion documentaire avancée' : 'Mes documents'}</h1></div>
      <p class="lead small">${role === 'trainer' ? 'Centralise les supports, livrets, convocations, attestations et feuilles d’émargement.' : 'Retrouve ici tes convocations, attestations, supports pédagogiques et livrets.'}</p>
      ${emptyRemoteNotice}
      <div class="meta-grid compact">${groupedCounts}</div>
      ${trainerUpload}
      <div class="document-grid">
        ${allDocs.length ? allDocs.map(function renderDoc(doc) {
          const deleteButton = role === 'trainer' ? `<button class="ghost-button compact danger" type="button" data-action="delete-document" data-document-id="${escapeHTML(doc.id)}">Supprimer</button>` : '';
          return `<article>
            <span>${escapeHTML(doc.type)}</span>
            <strong>${escapeHTML(doc.name)}</strong>
            <p>${escapeHTML(doc.status)}${doc.courseId ? ' · ' + escapeHTML(courseTitle(doc.courseId)) : ''}</p>
            ${doc.href ? `<a class="ghost-button doc-link" href="${escapeHTML(doc.href)}" target="_blank" rel="noopener">Ouvrir</a>` : ''}
            ${deleteButton}
          </article>`;
        }).join('') : '<p>Aucun document disponible pour le moment.</p>'}
      </div>
    </section>
  `, role);
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
    : '<p class="lead small">Connexion Supabase requise pour activer l’upload sécurisé des documents.</p>';
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
  const tickets = isRemoteSession() ? remoteTickets : (state.tickets || []);
  const openTickets = tickets.filter(function isOpen(ticket) {
    return ['ferme', 'traite'].indexOf(ticket.status) === -1;
  });
  const upcomingSessions = remoteSessions.filter(function upcoming(item) {
    if (!item.start_date || item.status === 'completed' || item.status === 'cancelled') return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(`${item.start_date}T00:00:00`) >= today;
    } catch (_) {
      return false;
    }
  });
  const students = remoteUsers.filter(function onlyStudents(user) { return user.role === 'student'; });
  const missingConvocations = remoteSessions.reduce(function countMissing(total, item) {
    return total + Math.max(0, (item.studentCount || 0) - (item.convocationCount || 0));
  }, 0);
  const certificatesGenerated = remoteSessions.reduce(function countCerts(total, item) {
    return total + (item.certificateCount || 0);
  }, 0);
  const satisfactionAverage = remoteSatisfaction.length
    ? Math.round(remoteSatisfaction.reduce(function sum(acc, item) { return acc + Number(item.rating || 0); }, 0) / remoteSatisfaction.length * 10) / 10
    : null;

  return appShell(template`
    <section class="hero-card glass-panel fade-in">
      <p class="eyebrow">Tableau de bord formateur</p>
      <h1>Pilotage pédagogique premium</h1>
      <p>Vue rapide sur les tickets, les sessions, les stagiaires, les documents, la satisfaction et les exports.</p>
    </section>

    <section class="quick-grid fade-in delay-1">
      <article class="glass-panel metric-card"><span class="metric">${openTickets.length}</span><strong>Tickets ouverts</strong><a class="pill-button compact" href="#/trainer/tickets">Traiter</a></article>
      <article class="glass-panel metric-card"><span class="metric">${upcomingSessions.length}</span><strong>Sessions à venir</strong><a class="pill-button compact" href="#/trainer/sessions">Voir</a></article>
      <article class="glass-panel metric-card"><span class="metric">${students.length}</span><strong>Stagiaires</strong><a class="pill-button compact" href="#/trainer/students">Gérer</a></article>
      <article class="glass-panel metric-card"><span class="metric">${satisfactionAverage == null ? '—' : satisfactionAverage + '/5'}</span><strong>Satisfaction</strong><a class="pill-button compact" href="#/trainer/satisfaction">Voir</a></article>
    </section>

    <section class="section-grid two fade-in delay-2">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Alertes rapides</p><h2>À surveiller</h2></div>
        <ul class="check-list clean">
          <li><strong>Tickets en attente</strong><span>${openTickets.length ? `${openTickets.length} ticket${openTickets.length > 1 ? 's' : ''} à traiter` : 'Aucun ticket ouvert'}</span></li>
          <li><strong>Convocations manquantes</strong><span>${missingConvocations ? `${missingConvocations} convocation${missingConvocations > 1 ? 's' : ''} à vérifier` : 'Toutes les convocations de session sont générées'}</span></li>
          <li><strong>Attestations générées</strong><span>${certificatesGenerated} attestation${certificatesGenerated > 1 ? 's' : ''}</span></li>
          <li><strong>Questionnaires</strong><span>${remoteSatisfaction.length} retour${remoteSatisfaction.length > 1 ? 's' : ''} satisfaction</span></li>
        </ul>
      </article>

      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Exports</p><h2>Preuves et suivi</h2></div>
        <div class="export-grid">
          <button class="ghost-button compact" type="button" data-action="export-csv" data-export="students">Exporter stagiaires CSV</button>
          <button class="ghost-button compact" type="button" data-action="export-csv" data-export="sessions">Exporter sessions CSV</button>
          <button class="ghost-button compact" type="button" data-action="export-csv" data-export="tickets">Exporter tickets CSV</button>
          <button class="ghost-button compact" type="button" data-action="export-csv" data-export="satisfaction">Exporter satisfaction CSV</button>
        </div>
      </article>
    </section>

    <section class="section-grid two fade-in delay-3">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Journal</p><h2>Dernières actions</h2></div>
        ${events.slice(0, 8).map(function renderEvent(event) { return `<p class="event-line"><strong>${escapeHTML(event.type)}</strong><span>${new Date(event.createdAt).toLocaleString('fr-FR')}</span></p>`; }).join('') || '<p>Aucun évènement pour le moment.</p>'}
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Notifications internes</p><h2>Centre d’alerte</h2></div>
        <ul class="check-list clean">
          <li><strong>${openTickets.length ? 'Action requise' : 'OK'}</strong><span>${openTickets.length ? 'Des tickets stagiaires attendent une réponse.' : 'Aucun ticket en attente.'}</span></li>
          <li><strong>${missingConvocations ? 'Documents à vérifier' : 'OK'}</strong><span>${missingConvocations ? 'Certaines sessions semblent sans convocation complète.' : 'Convocations à jour.'}</span></li>
          <li><strong>${remoteSatisfaction.length ? 'Satisfaction disponible' : 'À collecter'}</strong><span>${remoteSatisfaction.length ? 'Des retours stagiaires sont consultables.' : 'Aucun questionnaire reçu.'}</span></li>
        </ul>
      </article>
    </section>

    <section class="action-grid fade-in delay-4" aria-label="Actions formateur">
      <a class="action-card glass-panel" href="#/trainer/students">${icons.contact}<strong>Mes stagiaires</strong><span>Fiches, formations, documents, tickets</span></a>
      <a class="action-card glass-panel" href="#/trainer/tickets">${icons.contact}<strong>Répondre aux tickets</strong><span>Suivre les demandes stagiaires</span></a>
      <a class="action-card glass-panel" href="#/trainer/documents">${icons.documents}<strong>Documents</strong><span>Supports, livrets, attestations, émargements</span></a>
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
        }).join('')}
      </div>
    </section>
  `, 'trainer');
}

function trainerTickets() {
  return appShell(template`
    <section class="glass-panel content-card fade-in">
      <div class="section-heading"><p class="eyebrow">Assistance</p><h1>Tickets stagiaires</h1></div>
      <p class="lead small">Les demandes envoyées par les stagiaires apparaissent ici en temps réel depuis Supabase.</p>
      ${ticketList('trainer')}
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

  const attendanceOptions = [
    ['pending', 'En attente'],
    ['present', 'Présent'],
    ['absent', 'Absent'],
    ['excused', 'Excusé']
  ];
  const completionOptions = [
    ['pending', 'En attente'],
    ['validated', 'Validé'],
    ['not_validated', 'Non validé']
  ];

  function renderSelectOptions(options, selected) {
    return options.map(function option(item) {
      return `<option value="${item[0]}" ${item[0] === selected ? 'selected' : ''}>${item[1]}</option>`;
    }).join('');
  }

  const sessionsHtml = remoteSessions.length
    ? `<div class="validation-list session-list">${remoteSessions.map(function renderSession(item) {
        const studentsText = item.studentCount > 1 ? `${item.studentCount} stagiaires` : `${item.studentCount} stagiaire`;
        const convocationText = `${item.convocationCount || 0}/${item.studentCount || 0} convocation${(item.studentCount || 0) > 1 ? 's' : ''}`;
        const certificateText = `${item.certificateCount || 0}/${item.studentCount || 0} attestation${(item.studentCount || 0) > 1 ? 's' : ''}`;
        const isCompleted = item.status === 'completed';
        const studentRows = (item.students || []).map(function renderStudentRow(row) {
          const profile = row.profile || {};
          return `<form class="session-student-form" data-session-student-id="${escapeHTML(row.id)}">
            <div>
              <strong>${escapeHTML(profile.name || 'Stagiaire')}</strong>
              <span>${escapeHTML(profile.email || '')}</span>
            </div>
            <label>Présence
              <select name="attendanceStatus" ${isCompleted ? 'disabled' : ''}>${renderSelectOptions(attendanceOptions, row.attendance_status || 'pending')}</select>
            </label>
            <label>Résultat
              <select name="completionStatus" ${isCompleted ? 'disabled' : ''}>${renderSelectOptions(completionOptions, row.completion_status || 'pending')}</select>
            </label>
            <span class="badge-soft">${row.certificate_document_id ? 'Attestation générée' : 'Attestation non générée'}</span>
            <button class="ghost-button compact" type="submit" ${isCompleted ? 'disabled' : ''}>Enregistrer</button>
          </form>`;
        }).join('');

        return `<article class="session-card">
          <div class="session-card-head">
            <div>
              <strong>${escapeHTML(item.title || 'Session de formation')}</strong>
              <span>${escapeHTML(courseTitle(item.course_id))}</span>
              <span>${formatFrenchDate(item.start_date)} → ${formatFrenchDate(item.end_date)}${item.start_time ? ' · ' + escapeHTML(String(item.start_time).slice(0, 5)) : ''}${item.end_time ? '-' + escapeHTML(String(item.end_time).slice(0, 5)) : ''}</span>
              <span>${escapeHTML(item.location || 'Lieu à préciser')} · ${studentsText} · ${convocationText} · ${certificateText} · ${escapeHTML(item.status || 'scheduled')}</span>
            </div>
            <div class="session-actions">
              <button class="ghost-button compact" type="button" data-action="generate-attendance" data-mode="journee" data-session-id="${escapeHTML(item.id)}">Émargement journée</button>
              <button class="ghost-button compact" type="button" data-action="generate-attendance" data-mode="matin" data-session-id="${escapeHTML(item.id)}">Émargement matin</button>
              <button class="ghost-button compact" type="button" data-action="generate-attendance" data-mode="apres-midi" data-session-id="${escapeHTML(item.id)}">Émargement après-midi</button>
              <button class="primary-button compact" type="button" data-action="close-session" data-session-id="${escapeHTML(item.id)}" ${isCompleted ? 'disabled' : ''}>Clôturer et générer les attestations</button>
            </div>
          </div>
          <div class="session-students">${studentRows || '<p class="form-help">Aucun stagiaire rattaché.</p>'}</div>
        </article>`;
      }).join('')}</div>`
    : '<p class="form-help">Aucune session enregistrée pour l’instant. Crée ta première session ci-dessous.</p>';

  return appShell(template`
    <section class="hero-card glass-panel fade-in">
      <p class="eyebrow">Espace Formateur</p>
      <h1>Sessions de formation</h1>
      <p>Crée une session, rattache les stagiaires, génère les convocations, puis clôture la session pour créer les attestations de fin de stage.</p>
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
        <div class="section-heading"><p class="eyebrow">Fin de session</p><h2>Présence, validation, attestation</h2></div>
        <ul class="check-list clean">
          <li><strong>Présence</strong><span>Renseigne présent, absent ou excusé pour chaque stagiaire.</span></li>
          <li><strong>Validation</strong><span>Marque validé uniquement si les critères de fin de formation sont atteints.</span></li>
          <li><strong>Attestation</strong><span>La clôture génère automatiquement les attestations uniquement pour les stagiaires présents et validés.</span></li>
          <li><strong>Documents</strong><span>Les attestations sont déposées dans Supabase Storage et visibles dans l’espace Documents du stagiaire.</span></li>
        </ul>
      </article>
    </section>
  `, 'trainer');
}


function trainerStudentsView() {
  const students = remoteUsers.filter(function onlyStudents(user) { return user.role === 'student'; });

  function renderCourseOptions(selectedCourses) {
    const selected = Array.isArray(selectedCourses) ? selectedCourses : [];
    return courses.map(function renderCourseOption(course) {
      return `<option value="${escapeHTML(course.id)}" ${selected.indexOf(course.id) !== -1 ? 'selected' : ''}>${escapeHTML(course.title)}</option>`;
    }).join('');
  }

  const createCourseOptions = renderCourseOptions([]);
  const studentsList = students.length
    ? `<div class="student-admin-list">${students.map(function renderStudent(user) {
        return `<article>
          <form class="student-edit-form" data-student-id="${escapeHTML(user.id)}">
            <div class="student-edit-head">
              <strong>${escapeHTML(user.name || 'Stagiaire')}</strong>
              <span>${escapeHTML(user.email || '')}</span>
              <a class="pill-button compact" href="#/trainer/student/${escapeHTML(user.id)}">Ouvrir la fiche complète</a>
            </div>
            <label>Nom complet<input name="fullName" value="${escapeHTML(user.name || '')}" required /></label>
            <label>Formations accessibles
              <select name="courseIds" multiple size="5">${renderCourseOptions(user.courses || [])}</select>
            </label>
            <p class="form-help">Sélectionne les formations à conserver ou débloquer. Les inscriptions sélectionnées seront activées.</p>
            <button class="ghost-button compact" type="submit">Mettre à jour</button>
          </form>
        </article>`;
      }).join('')}</div>`
    : '<p class="form-help">Aucun stagiaire chargé pour le moment.</p>';

  return appShell(template`
    <section class="section-grid two fade-in">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Mes stagiaires</p><h1>Créer un accès stagiaire</h1></div>
        <p class="lead small">Crée directement un compte stagiaire, son profil et ses inscriptions formation.</p>
        <form id="student-create-form" class="auth-form compact-form">
          <label>Nom complet<input name="fullName" required placeholder="Nom Prénom" /></label>
          <label>Email<input name="email" type="email" required placeholder="stagiaire@email.fr" /></label>
          <label>Mot de passe provisoire<input name="password" type="text" required minlength="6" placeholder="Mot de passe à communiquer" /></label>
          <label>Formations accessibles
            <select name="courseIds" multiple size="5">${createCourseOptions}</select>
          </label>
          <p class="form-help">Sur Mac, utilise ⌘ + clic pour sélectionner plusieurs formations.</p>
          <p class="form-error" role="status" hidden></p>
          <button class="primary-button" type="submit" ${isRemoteSession() ? '' : 'disabled'}>Créer le stagiaire</button>
        </form>
      </article>

      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Liste</p><h2>Modifier les stagiaires</h2></div>
        ${studentsList}
      </article>
    </section>
  `, 'trainer');
}

function trainerStudentDetailView(studentId) {
  const user = remoteUsers.find(function findUser(item) { return item.id === studentId; });
  if (!user) {
    return appShell(`<section class="glass-panel content-card"><h1>Stagiaire introuvable</h1><p>Le profil n’est pas chargé ou n’existe plus.</p><a class="ghost-button" href="#/trainer/students">Retour</a></section>`, 'trainer');
  }
  const userCourses = Array.isArray(user.courses) ? user.courses : [];
  const docs = remoteDocuments.filter(function forUser(doc) { return doc.target_user_id === user.id || doc.targetUserId === user.id; });
  const sessions = remoteSessions.filter(function includesStudent(item) {
    return (item.students || []).some(function hasStudent(row) { return row.student_id === user.id; });
  });
  const tickets = remoteTickets.filter(function fromStudent(ticket) { return ticket.authorId === user.id || ticket.author_id === user.id || ticket.authorEmail === user.email; });
  const satisfaction = remoteSatisfaction.filter(function fromStudent(item) { return item.studentId === user.id || item.student_id === user.id || item.studentEmail === user.email; });

  return appShell(template`
    <section class="hero-card glass-panel fade-in">
      <p class="eyebrow">Fiche stagiaire</p>
      <h1>${escapeHTML(user.name || 'Stagiaire')}</h1>
      <p>${escapeHTML(user.email || '')}</p>
      <div class="meta-grid compact">
        <span>Formations <strong>${userCourses.length}</strong></span>
        <span>Sessions <strong>${sessions.length}</strong></span>
        <span>Documents <strong>${docs.length}</strong></span>
        <span>Tickets <strong>${tickets.length}</strong></span>
      </div>
    </section>

    <section class="section-grid two fade-in delay-1">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Formations</p><h2>Accès débloqués</h2></div>
        <ul class="check-list clean">${userCourses.length ? userCourses.map(function renderCourse(id) { return `<li><strong>${escapeHTML(courseTitle(id))}</strong><span>${escapeHTML(id)}</span></li>`; }).join('') : '<li><strong>Aucune formation</strong><span>Retourne dans Mes stagiaires pour débloquer une formation.</span></li>'}</ul>
        <a class="ghost-button compact" href="#/trainer/students">Modifier les accès</a>
      </article>

      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Satisfaction</p><h2>Retours</h2></div>
        ${satisfaction.length ? satisfaction.map(function renderSat(item) {
          return `<p class="event-line"><strong>${escapeHTML(String(item.rating || '—'))}/5</strong><span>${escapeHTML(item.comment || 'Sans commentaire')}</span></p>`;
        }).join('') : '<p>Aucun questionnaire reçu.</p>'}
      </article>
    </section>

    <section class="section-grid two fade-in delay-2">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Sessions</p><h2>Historique session</h2></div>
        ${sessions.length ? sessions.map(function renderSession(item) {
          const row = (item.students || []).find(function hasStudent(s) { return s.student_id === user.id; }) || {};
          return `<article class="mini-record"><strong>${escapeHTML(item.title || 'Session')}</strong><span>${formatFrenchDate(item.start_date)} → ${formatFrenchDate(item.end_date)}</span><span>Présence : ${escapeHTML(row.attendance_status || '—')} · Résultat : ${escapeHTML(row.completion_status || '—')}</span></article>`;
        }).join('') : '<p>Aucune session rattachée.</p>'}
      </article>

      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Documents</p><h2>Documents personnels</h2></div>
        ${docs.length ? docs.map(function renderDoc(doc) {
          return `<article class="mini-record"><strong>${escapeHTML(doc.name || doc.title || 'Document')}</strong><span>${escapeHTML(doc.type || 'document')}</span>${doc.downloadUrl || doc.href ? `<a class="pill-button compact" target="_blank" rel="noopener" href="${escapeHTML(doc.downloadUrl || doc.href)}">Ouvrir</a>` : ''}</article>`;
        }).join('') : '<p>Aucun document personnel.</p>'}
      </article>
    </section>

    <section class="glass-panel content-card fade-in delay-3">
      <div class="section-heading"><p class="eyebrow">Tickets</p><h2>Demandes du stagiaire</h2></div>
      ${tickets.length ? tickets.map(function renderTicket(ticket) {
        return `<article class="mini-record"><strong>${escapeHTML(ticket.subject)}</strong><span>${escapeHTML(ticket.status || 'ouvert')}</span><p>${escapeHTML(ticket.message || '')}</p></article>`;
      }).join('') : '<p>Aucun ticket ouvert par ce stagiaire.</p>'}
    </section>
  `, 'trainer');
}

function studentSatisfactionView() {
  const alreadySent = remoteSatisfaction.find(function own(item) {
    return item.studentId === (session && session.id) || item.student_id === (session && session.id);
  });
  return appShell(template`
    <section class="glass-panel content-card fade-in">
      <div class="section-heading"><p class="eyebrow">Satisfaction</p><h1>Ton avis sur la formation</h1></div>
      <p class="lead small">Ton retour permet d’améliorer les supports, le rythme et l’accompagnement.</p>
      ${alreadySent ? `<div class="info-banner"><strong>Merci</strong><span>Un questionnaire a déjà été envoyé. Tu peux en envoyer un nouveau si tu veux compléter ton retour.</span></div>` : ''}
      <form id="satisfaction-form" class="auth-form compact-form">
        <label>Formation concernée
          <select name="courseId">${courses.map(function option(course) { return `<option value="${escapeHTML(course.id)}">${escapeHTML(course.title)}</option>`; }).join('')}</select>
        </label>
        <label>Note globale
          <select name="rating" required>
            <option value="5">5 — Excellent</option>
            <option value="4">4 — Très bien</option>
            <option value="3">3 — Correct</option>
            <option value="2">2 — À améliorer</option>
            <option value="1">1 — Insuffisant</option>
          </select>
        </label>
        <label>Ce qui t’a été utile<textarea name="useful" rows="3" placeholder="Exemple : les cas pratiques, les fiches mémo..."></textarea></label>
        <label>Ce qui pourrait être amélioré<textarea name="improvement" rows="3" placeholder="Exemple : rythme, supports, exercices..."></textarea></label>
        <label>Commentaire libre<textarea name="comment" rows="4" placeholder="Ton avis global..."></textarea></label>
        <p class="form-error" role="status" hidden></p>
        <button class="primary-button" type="submit" ${isRemoteSession() ? '' : 'disabled'}>Envoyer mon avis</button>
      </form>
    </section>
  `, 'student');
}

function trainerSatisfactionView() {
  const average = remoteSatisfaction.length
    ? Math.round(remoteSatisfaction.reduce(function sum(acc, item) { return acc + Number(item.rating || 0); }, 0) / remoteSatisfaction.length * 10) / 10
    : null;
  return appShell(template`
    <section class="hero-card glass-panel fade-in">
      <p class="eyebrow">Satisfaction</p>
      <h1>Retours stagiaires</h1>
      <p>Suivi des questionnaires à chaud envoyés par les stagiaires.</p>
      <div class="meta-grid compact">
        <span>Réponses <strong>${remoteSatisfaction.length}</strong></span>
        <span>Moyenne <strong>${average == null ? '—' : average + '/5'}</strong></span>
      </div>
    </section>
    <section class="glass-panel content-card fade-in delay-1">
      <div class="section-heading"><p class="eyebrow">Résultats</p><h2>Questionnaires reçus</h2></div>
      ${remoteSatisfaction.length ? `<div class="satisfaction-list">${remoteSatisfaction.map(function renderSat(item) {
        return `<article>
          <strong>${escapeHTML(item.studentName || 'Stagiaire')} · ${escapeHTML(String(item.rating || '—'))}/5</strong>
          <span>${escapeHTML(courseTitle(item.courseId || item.course_id || ''))} · ${new Date(item.createdAt || item.created_at || Date.now()).toLocaleString('fr-FR')}</span>
          <p><strong>Utile :</strong> ${escapeHTML(item.useful || '')}</p>
          <p><strong>À améliorer :</strong> ${escapeHTML(item.improvement || '')}</p>
          <p>${escapeHTML(item.comment || '')}</p>
        </article>`;
      }).join('')}</div>` : '<p>Aucun questionnaire reçu pour le moment.</p>'}
    </section>
  `, 'trainer');
}

function trainerSettings() {
  return appShell(template`
    <section class="section-grid two fade-in">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Paramètres</p><h1>Configuration application</h1></div>
        <ul class="soft-list">
          <li>Supabase Auth et Storage sont utilisés pour les comptes, documents, tickets et sessions.</li>
          <li>Les stagiaires se créent maintenant dans la rubrique Mes stagiaires.</li>
          <li>Les tickets et réponses sont centralisés dans Assistance.</li>
          <li>Les convocations et attestations restent dans l’espace Documents.</li>
        </ul>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">PWA</p><h2>Service worker stabilisé</h2></div>
        <p>Le service worker évite le cache agressif afin de préserver un chargement stable sur GitHub Pages et iPhone.</p>
      </article>
    </section>
  `, 'trainer');
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

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportRemoteCsv(type) {
  let rows = [];
  let filename = `ncr-export-${type || 'data'}.csv`;
  if (type === 'students') {
    rows = [['Nom', 'Email', 'Formations'], ...remoteUsers.filter(function student(u) { return u.role === 'student'; }).map(function row(u) {
      return [u.name, u.email, (u.courses || []).map(courseTitle).join(' | ')];
    })];
  } else if (type === 'sessions') {
    rows = [['Titre', 'Formation', 'Début', 'Fin', 'Lieu', 'Statut', 'Stagiaires', 'Convocations', 'Attestations'], ...remoteSessions.map(function row(s) {
      return [s.title, courseTitle(s.course_id), s.start_date, s.end_date, s.location, s.status, s.studentCount, s.convocationCount, s.certificateCount];
    })];
  } else if (type === 'tickets') {
    rows = [['Sujet', 'Stagiaire', 'Email', 'Statut', 'Créé le', 'Message'], ...remoteTickets.map(function row(t) {
      return [t.subject, t.authorName, t.authorEmail, t.status, t.createdAt, t.message];
    })];
  } else if (type === 'satisfaction') {
    rows = [['Stagiaire', 'Email', 'Formation', 'Note', 'Utile', 'Amélioration', 'Commentaire', 'Date'], ...remoteSatisfaction.map(function row(s) {
      return [s.studentName, s.studentEmail, courseTitle(s.courseId || s.course_id), s.rating, s.useful, s.improvement, s.comment, s.createdAt || s.created_at];
    })];
  } else {
    rows = [['Aucune donnée']];
  }
  const csv = rows.map(function line(row) { return row.map(csvEscape).join(';'); }).join('\n');
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
}

function bindEvents() {
  const loginForm = document.querySelector('#login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

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
  if (ticketForm) ticketForm.addEventListener('submit', async function submitTicket(event) {
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
    const submit = ticketForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      if (isRemoteSession()) {
        await createRemoteTicket(session, ticket);
        remoteTickets = await listRemoteTickets(session);
      } else {
        const tickets = (state.tickets || []).slice();
        tickets.unshift(ticket);
        state = patchState({ tickets: tickets });
        await syncState('ticket_created');
      }
      trackEvent('ticket_created', { ticketId: ticket.id, subject: ticket.subject });
      ticketForm.reset();
      render();
    } catch (error) {
      window.alert(error.message || 'Ticket impossible à envoyer.');
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  document.querySelectorAll('.ticket-status-form').forEach(function bindTicketStatus(form) {
    form.addEventListener('submit', async function updateTicketStatus(event) {
      event.preventDefault();
      if (!isRemoteSession() || !session || session.role !== 'trainer') return;
      const data = new FormData(form);
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await updateRemoteTicketStatus(session, form.dataset.ticketId, data.get('status'));
        remoteTickets = await listRemoteTickets(session);
        trackEvent('ticket_status_updated', { ticketId: form.dataset.ticketId, status: data.get('status') });
        render();
      } catch (error) {
        window.alert(error.message || 'Statut du ticket impossible à modifier.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  });


  document.querySelectorAll('.ticket-reply-form').forEach(function bindTicketReply(form) {
    form.addEventListener('submit', async function submitTicketReply(event) {
      event.preventDefault();
      if (!isRemoteSession() || !session) return;
      const data = new FormData(form);
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await createRemoteTicketReply(session, form.dataset.ticketId, data.get('message'));
        if (session.role === 'trainer') {
          await updateRemoteTicketStatus(session, form.dataset.ticketId, 'en_cours');
        }
        remoteTickets = await listRemoteTickets(session);
        trackEvent('ticket_reply_created', { ticketId: form.dataset.ticketId, role: session.role });
        form.reset();
        render();
      } catch (error) {
        window.alert(error.message || 'Réponse impossible à envoyer.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  });

  const studentCreateForm = document.querySelector('#student-create-form');
  if (studentCreateForm) studentCreateForm.addEventListener('submit', async function submitStudentCreate(event) {
    event.preventDefault();
    if (!isRemoteSession() || !session || session.role !== 'trainer') return;
    const notice = studentCreateForm.querySelector('.form-error');
    const submit = studentCreateForm.querySelector('button[type="submit"]');
    const data = new FormData(studentCreateForm);
    const select = studentCreateForm.querySelector('select[name="courseIds"]');
    const courseIds = select ? Array.from(select.selectedOptions).map(function optionValue(option) { return option.value; }).filter(Boolean) : [];
    if (notice) notice.hidden = true;
    if (submit) submit.disabled = true;
    try {
      await createRemoteStudent(session, {
        fullName: data.get('fullName'),
        email: data.get('email'),
        password: data.get('password'),
        courseIds
      });
      remoteUsers = await listRemoteUsers(session);
      trackEvent('student_created', { email: data.get('email'), courseCount: courseIds.length });
      studentCreateForm.reset();
      render();
    } catch (error) {
      if (notice) {
        notice.textContent = error.message || 'Création du stagiaire impossible.';
        notice.hidden = false;
      }
    } finally {
      if (submit) submit.disabled = !isRemoteSession();
    }
  });


  document.querySelectorAll('.student-edit-form').forEach(function bindStudentEdit(form) {
    form.addEventListener('submit', async function submitStudentEdit(event) {
      event.preventDefault();
      if (!isRemoteSession() || !session || session.role !== 'trainer') return;
      const data = new FormData(form);
      const select = form.querySelector('select[name="courseIds"]');
      const courseIds = select ? Array.from(select.selectedOptions).map(function optionValue(option) { return option.value; }).filter(Boolean) : [];
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await updateRemoteStudent(session, form.dataset.studentId, {
          fullName: data.get('fullName'),
          courseIds
        });
        remoteUsers = await listRemoteUsers(session);
        remoteSessions = await listRemoteSessions(session);
        trackEvent('student_updated', { studentId: form.dataset.studentId, courseCount: courseIds.length });
        render();
      } catch (error) {
        window.alert(error.message || 'Modification du stagiaire impossible.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });
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


  document.querySelectorAll('.session-student-form').forEach(function bindSessionStudentForm(form) {
    form.addEventListener('submit', async function submitSessionStudent(event) {
      event.preventDefault();
      if (!isRemoteSession()) return;
      const submit = form.querySelector('button[type="submit"]');
      const data = new FormData(form);
      if (submit) submit.disabled = true;
      try {
        await updateRemoteSessionStudent(session, form.dataset.sessionStudentId, {
          attendanceStatus: data.get('attendanceStatus'),
          completionStatus: data.get('completionStatus')
        });
        remoteSessions = await listRemoteSessions(session);
        trackEvent('session_student_updated', { sessionStudentId: form.dataset.sessionStudentId, attendanceStatus: data.get('attendanceStatus'), completionStatus: data.get('completionStatus') });
        render();
      } catch (error) {
        window.alert(error.message || 'Mise à jour impossible.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-action="generate-attendance"]').forEach(function bindAttendanceSheet(button) {
    button.addEventListener('click', async function generateAttendanceClick() {
      if (!isRemoteSession()) return;
      const sessionId = button.dataset.sessionId;
      const mode = button.dataset.mode || 'journee';
      button.disabled = true;
      const originalLabel = button.textContent;
      button.textContent = 'Génération…';
      try {
        const document = await generateRemoteAttendanceSheet(session, sessionId, mode);
        remoteDocuments = await listRemoteDocuments(session);
        trackEvent('attendance_sheet_generated', { sessionId, mode, documentId: document && document.id });
        window.alert('Feuille d’émargement générée dans Documents.');
        render();
      } catch (error) {
        window.alert(error.message || 'Génération de la feuille d’émargement impossible.');
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  });

  document.querySelectorAll('[data-action="close-session"]').forEach(function bindCloseSession(button) {
    button.addEventListener('click', async function closeSessionClick() {
      if (!isRemoteSession()) return;
      const sessionId = button.dataset.sessionId;
      const ok = window.confirm('Clôturer cette session et générer les attestations pour les stagiaires présents et validés ?');
      if (!ok) return;
      button.disabled = true;
      button.textContent = 'Génération en cours…';
      try {
        const result = await closeRemoteSession(session, sessionId);
        remoteSessions = await listRemoteSessions(session);
        remoteDocuments = await listRemoteDocuments(session);
        trackEvent('session_closed', { sessionId, certificateCount: result.certificateCount || 0 });
        render();
      } catch (error) {
        window.alert(error.message || 'Clôture impossible. Vérifie Supabase et les règles Storage.');
        button.disabled = false;
        button.textContent = 'Clôturer et générer les attestations';
      }
    });
  });

  const satisfactionForm = document.querySelector('#satisfaction-form');
  if (satisfactionForm) satisfactionForm.addEventListener('submit', async function submitSatisfaction(event) {
    event.preventDefault();
    if (!isRemoteSession() || !session || session.role !== 'student') return;
    const data = new FormData(satisfactionForm);
    const error = satisfactionForm.querySelector('.form-error');
    const submit = satisfactionForm.querySelector('button[type="submit"]');
    if (error) error.hidden = true;
    if (submit) submit.disabled = true;
    try {
      await createRemoteSatisfaction(session, {
        courseId: data.get('courseId'),
        rating: data.get('rating'),
        useful: data.get('useful'),
        improvement: data.get('improvement'),
        comment: data.get('comment')
      });
      remoteSatisfaction = await listRemoteSatisfaction(session);
      trackEvent('satisfaction_sent', { courseId: data.get('courseId'), rating: data.get('rating') });
      satisfactionForm.reset();
      window.alert('Merci, ton avis a bien été envoyé.');
      render();
    } catch (errorSubmit) {
      if (error) {
        error.textContent = errorSubmit.message || 'Envoi impossible.';
        error.hidden = false;
      }
    } finally {
      if (submit) submit.disabled = !isRemoteSession();
    }
  });

  document.querySelectorAll('[data-action="delete-document"]').forEach(function bindDeleteDocument(button) {
    button.addEventListener('click', async function deleteDocumentClick() {
      if (!isRemoteSession() || !session || session.role !== 'trainer') return;
      const ok = window.confirm('Supprimer ce document et le fichier Supabase associé ?');
      if (!ok) return;
      button.disabled = true;
      try {
        await deleteRemoteDocument(session, button.dataset.documentId);
        remoteDocuments = await listRemoteDocuments(session);
        trackEvent('document_deleted', { documentId: button.dataset.documentId });
        render();
      } catch (error) {
        window.alert(error.message || 'Suppression impossible.');
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-action="export-csv"]').forEach(function bindCsvExport(button) {
    button.addEventListener('click', function exportCsvClick() {
      exportRemoteCsv(button.dataset.export);
    });
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

  if (session && session.role === 'trainer' && route.startsWith('/trainer/student/')) {
    return trainerStudentDetailView(route.replace('/trainer/student/', ''));
  }

  switch (route) {
    case '/login': return loginView();
    case '/student/dashboard':
    case '/student/home': return studentHomeView();
    case '/student/learning': return learningView();
    case '/student/quiz': return quizView();
    case '/student/memo': return memoView();
    case '/student/contact': return contactView();
    case '/student/documents': return documentsView('student');
    case '/student/satisfaction': return studentSatisfactionView();
    case '/trainer': return trainerOverview();
    case '/trainer/guide': return trainerGuideView();
    case '/trainer/validations': return trainerValidations();
    case '/trainer/tickets': return trainerTickets();
    case '/trainer/students': return trainerStudentsView();
    case '/trainer/sessions': return trainerSessionsView();
    case '/trainer/documents': return documentsView('trainer');
    case '/trainer/satisfaction': return trainerSatisfactionView();
    case '/trainer/settings': return trainerSettings();
    default: return session && session.role === 'trainer' ? trainerOverview() : studentHomeView();
  }
}

function paintCurrentRoute() {
  app.innerHTML = guarded(currentRoute());
  document.body.classList.toggle('drawer-lock', drawerOpen);
  bindEvents();
}

let hydrationInProgress = false;

async function refreshRemoteThenPaint() {
  if (!isRemoteSession() || remoteHydratedFor === session.id || hydrationInProgress) return;
  const hydrationSessionId = session.id;
  remoteHydratedFor = hydrationSessionId;
  hydrationInProgress = true;
  try {
    await hydrateRemoteData();
    if (session && session.id === hydrationSessionId) {
      paintCurrentRoute();
    }
  } catch (error) {
    console.warn('Hydratation distante non bloquante', error);
  } finally {
    hydrationInProgress = false;
  }
}

async function render() {
  try {
    state = loadState();
    session = getSession();
    paintCurrentRoute();
    refreshRemoteThenPaint();
  } catch (error) {
    console.error('Erreur de rendu N.C.R Academy', error);
    app.innerHTML = `
      <main class="login-screen">
        <section class="login-card glass-panel">
          <h1>Connexion à N.C.R Academy</h1>
          <p class="lead small">L’application a rencontré une erreur de chargement.</p>
          <button class="primary-button" type="button" id="hard-reset-app">Réinitialiser l’application</button>
          <p class="form-error" style="display:block">Erreur : ${escapeHTML(error && error.message ? error.message : String(error))}</p>
        </section>
      </main>`;
    const resetButton = document.querySelector('#hard-reset-app');
    if (resetButton) {
      resetButton.addEventListener('click', async function hardReset() {
        try {
          localStorage.clear();
          sessionStorage.clear();
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(function removeCache(key) { return caches.delete(key); }));
          }
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(function unregister(reg) { return reg.unregister(); }));
          }
        } catch (_) {}
        window.location.href = window.location.pathname + '?fresh=' + Date.now();
      });
    }
  }
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
