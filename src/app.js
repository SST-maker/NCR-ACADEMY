import { login, logout, getSession } from './core/auth.js';
import { loadState, saveState, patchState } from './core/state.js';
import { addEvent, listEvents, exportEvents } from './core/tracking.js';
import { courses, getCourse } from './data/catalog.js';
import { qualiopiChecklist, documentTemplates } from './data/qualopi.js';

const app = document.querySelector('#app');
let state = loadState();
let session = getSession();

const icons = {
  learning: '􀉉', quiz: '􀛹', memo: '􀈕', contact: '􀌤', documents: '􀈷', overview: '􀎭', validations: '􀁢', tickets: '􀍕', settings: '􀍟'
};

function navigate(path) {
  window.location.hash = path;
}

function currentRoute() {
  return window.location.hash.replace('#', '') || '/login';
}

function h(strings, ...values) {
  return strings.reduce((acc, string, index) => acc + string + (values[index] ?? ''), '');
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function percent(value) {
  return `${Math.min(100, Math.max(0, Math.round(value || 0)))}%`;
}

function averageProgress(course) {
  const completed = state.progress?.[course.id]?.completedModules || [];
  return Math.round((completed.length / Math.max(course.modules.length, 1)) * 100);
}

function selectedCourse() {
  const allowed = session?.courses || [];
  const exists = allowed.includes(state.selectedCourseId);
  return getCourse(exists ? state.selectedCourseId : allowed[0]);
}

function courseSwitcher() {
  return h`
    <label class="select-label" for="course-select">Formation active</label>
    <select id="course-select" class="course-select" aria-label="Choisir une formation">
      ${courses.filter(course => session?.courses?.includes(course.id)).map(course => `
        <option value="${course.id}" ${course.id === selectedCourse().id ? 'selected' : ''}>${escapeHTML(course.title)}</option>
      `).join('')}
    </select>
  `;
}

function shell(content, role = 'student') {
  const route = currentRoute();
  return h`
    <main class="app-shell ${role}" id="top">
      <aside class="sidebar glass-panel" aria-label="Navigation principale">
        <a class="brand" href="#/${role === 'trainer' ? 'trainer' : 'student/dashboard'}" aria-label="Accueil N.C.R Academy">
          <img src="./assets/brand/logo-ncr-academy.png" alt="N.C.R Solutions" />
        </a>
        <nav class="side-nav">
          ${role === 'trainer' ? trainerNav(route) : studentNav(route)}
        </nav>
        <div class="sidebar-footer">
          <button class="ghost-button" data-action="logout">Déconnexion</button>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar glass-panel">
          <div>
            <p class="eyebrow">${role === 'trainer' ? 'Espace Formateur' : 'Espace Stagiaire'}</p>
            <h1>${role === 'trainer' ? 'Pilotage pédagogique' : 'Tableau de bord formation'}</h1>
          </div>
          <div class="topbar-actions">
            ${courseSwitcher()}
            <span class="user-chip">${escapeHTML(session?.name || 'Invité')}</span>
          </div>
        </header>
        ${content}
      </section>
    </main>
  `;
}

function studentNav(route) {
  const items = [
    ['learning', '/student/learning', 'Apprentissage'],
    ['quiz', '/student/quiz', 'Quiz'],
    ['memo', '/student/memo', 'Fiches mémo'],
    ['contact', '/student/contact', 'Contact'],
    ['documents', '/student/documents', 'Documents']
  ];
  return items.map(([key, path, label]) => `<a class="nav-item ${route === path || (route === '/student/dashboard' && key === 'learning') ? 'active' : ''}" href="#${path}"><span>${icons[key]}</span>${label}</a>`).join('');
}

function trainerNav(route) {
  const items = [
    ['overview', '/trainer', 'Suivi'],
    ['validations', '/trainer/validations', 'Validations'],
    ['tickets', '/trainer/tickets', 'Tickets'],
    ['documents', '/trainer/documents', 'Documents'],
    ['settings', '/trainer/settings', 'Paramètres']
  ];
  return items.map(([key, path, label]) => `<a class="nav-item ${route === path ? 'active' : ''}" href="#${path}"><span>${icons[key]}</span>${label}</a>`).join('');
}

function loginView() {
  return h`
    <main class="login-page">
      <section class="login-card glass-panel" aria-labelledby="login-title">
        <div class="login-brand">
          <img src="./assets/brand/logo-ncr-academy.png" alt="Logo N.C.R Solutions" />
        </div>
        <p class="eyebrow">PWA LMS • Qualiopi ready</p>
        <h1 id="login-title">Connexion à N.C.R Academy</h1>
        <p class="lead">Un seul compte pour accéder à plusieurs formations, suivre les validations et retrouver les documents utiles.</p>
        <form id="login-form" class="auth-form">
          <label>Email
            <input name="email" type="email" autocomplete="username" required />
          </label>
          <label>Mot de passe
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="primary-button" type="submit">Entrer dans l’espace</button>
          <p class="form-error" role="alert" hidden></p>
        </form>
        <div class="demo-box">
          <strong>Comptes de démo</strong>
          <span>Stagiaire : stagiaire@ncr.demo / ncr2026</span>
          <span>Formateur : formateur@ncr.demo / ncr2026</span>
        </div>
      </section>
    </main>
  `;
}

function learningView() {
  const course = selectedCourse();
  const completed = state.progress?.[course.id]?.completedModules || [];
  return shell(h`
    <section class="hero-grid">
      <article class="hero-card glass-panel">
        <p class="eyebrow">${escapeHTML(course.category)}</p>
        <h2>${escapeHTML(course.title)}</h2>
        <p>${escapeHTML(course.public)}</p>
        <div class="meta-grid">
          <span>Durée <strong>${escapeHTML(course.duration)}</strong></span>
          <span>Format <strong>${escapeHTML(course.format)}</strong></span>
          <span>Prérequis <strong>${escapeHTML(course.prerequisite)}</strong></span>
        </div>
      </article>
      <article class="glass-panel progress-card">
        <span class="ring" style="--progress:${averageProgress(course)}">${percent(averageProgress(course))}</span>
        <h3>Progression pédagogique</h3>
        <p>Consultation et validation horodatées localement pour la traçabilité.</p>
      </article>
    </section>

    <section class="section-grid two">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Objectifs</p><h3>Ce que le stagiaire doit savoir faire</h3></div>
        <ul class="check-list">${course.objectives.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Parcours complet</p><h3>Leçons, cas pratiques, critères</h3></div>
        <ul class="soft-list">
          <li>Leçon structurée avec explications métier</li>
          <li>Cas pratique contextualisé en entreprise</li>
          <li>Critères de réussite observables</li>
          <li>Trace pédagogique associée au module</li>
        </ul>
      </article>
    </section>

    <section class="module-list" aria-label="Modules de formation">
      ${course.modules.map((module, index) => `
        <article class="module-card glass-panel ${completed.includes(index) ? 'done' : ''}">
          <div class="module-number">${String(index + 1).padStart(2, '0')}</div>
          <div class="module-rich">
            <p class="eyebrow">${escapeHTML(module.time)}</p>
            <h3>${escapeHTML(module.title)}</h3>
            <div class="goal-chips">${(module.goals || []).map(item => `<span>${escapeHTML(item)}</span>`).join('')}</div>
            ${(module.details || []).map(part => `
              <section class="lesson-detail">
                <h4>${escapeHTML(part.title)}</h4>
                ${(part.paragraphs || []).map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('')}
                <div class="concept-row">${(part.keyPoints || []).map(point => `<span>${escapeHTML(point)}</span>`).join('')}</div>
              </section>
            `).join('')}
            <p class="activity"><strong>Atelier :</strong> ${escapeHTML(module.activity)}</p>
            <div class="criteria-box">
              <strong>Critères de réussite</strong>
              <ul>${(module.criteria || []).map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
              <p>${escapeHTML(module.traceability || 'Validation observable par le formateur.')}</p>
            </div>
          </div>
          <button class="pill-button" data-action="complete-module" data-index="${index}">${completed.includes(index) ? 'Validé' : 'Marquer terminé'}</button>
        </article>
      `).join('')}
    </section>
  `);
}


function quizView() {
  const course = selectedCourse();
  const score = state.quizScores?.[course.id];
  const certified = state.certificates?.[course.id];
  return shell(h`
    <section class="glass-panel content-card">
      <div class="section-heading"><p class="eyebrow">Quiz gamifié</p><h2>${escapeHTML(course.title)}</h2></div>
      <p class="lead small">Objectif : obtenir au moins 80 % pour débloquer la certification de réussite du module.</p>
      ${score !== undefined ? `<div class="score-banner ${certified ? 'success' : ''}"><strong>Dernier score : ${score}%</strong><span>${certified ? 'Certification débloquée' : 'Réessaie pour valider le module'}</span></div>` : ''}
      <form id="quiz-form" class="quiz-form">
        ${course.quiz.map((q, index) => `
          <fieldset class="quiz-question">
            <legend>${index + 1}. ${escapeHTML(q.question)}</legend>
            ${q.options.map((option, optionIndex) => `
              <label><input type="radio" name="q${index}" value="${optionIndex}" required /> ${escapeHTML(option)}</label>
            `).join('')}
            ${score !== undefined ? `<div class="correction"><strong>Corrigé commenté</strong><p>Réponse attendue : ${escapeHTML(q.options[q.answer])}</p><p>${escapeHTML(q.explanation || 'La réponse attendue correspond au principe pédagogique du module.')}</p></div>` : ''}
          </fieldset>
        `).join('')}
        <button class="primary-button" type="submit">Valider mon quiz</button>
      </form>
      ${certified ? certificateCard(course) : ''}
    </section>
  `);
}


function certificateCard(course) {
  const certificate = state.certificates?.[course.id];
  return `<article class="certificate-card"><p class="eyebrow">Certification de réussite</p><h3>${escapeHTML(course.title)}</h3><p>Débloquée le ${new Date(certificate.date).toLocaleString('fr-FR')} avec ${certificate.score}%.</p><button class="pill-button" data-action="print-certificate">Imprimer</button></article>`;
}

function memoView() {
  const course = selectedCourse();
  return shell(h`
    <section class="section-grid two">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Révision rapide</p><h2>Fiches mémo</h2></div>
        <ul class="memo-list">${course.memo.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
      </article>
      <article class="glass-panel content-card accent-card">
        <div class="section-heading"><p class="eyebrow">Lexique</p><h3>Notions importantes</h3></div>
        <dl class="lexicon-list">
          ${(course.lexicon || []).map(item => `<div><dt>${escapeHTML(item.term)}</dt><dd>${escapeHTML(item.definition)}</dd></div>`).join('')}
        </dl>
      </article>
    </section>
  `);
}


function contactView() {
  return shell(h`
    <section class="section-grid two">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Contact interne</p><h2>Créer un ticket</h2></div>
        <form id="ticket-form" class="auth-form">
          <label>Sujet<input name="subject" required /></label>
          <label>Message<textarea name="message" rows="5" required></textarea></label>
          <button class="primary-button" type="submit">Envoyer au formateur</button>
        </form>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Tickets récents</p><h2>Suivi</h2></div>
        ${ticketList()}
      </article>
    </section>
  `);
}

function ticketList() {
  const tickets = state.tickets || [];
  if (!tickets.length) return '<p>Aucun ticket pour le moment.</p>';
  return `<div class="ticket-list">${tickets.map(ticket => `<article><strong>${escapeHTML(ticket.subject)}</strong><span>${escapeHTML(ticket.status)} • ${new Date(ticket.createdAt).toLocaleString('fr-FR')}</span><p>${escapeHTML(ticket.message)}</p></article>`).join('')}</div>`;
}

function documentsView(role = 'student') {
  return shell(h`
    <section class="glass-panel content-card">
      <div class="section-heading"><p class="eyebrow">Espace documents</p><h2>Documents liés à la formation</h2></div>
      <p class="lead small">Les modèles inclus sont prêts pour une mise à disposition stagiaire. En production, les documents sensibles devront passer par un stockage sécurisé.</p>
      <div class="document-grid">
        ${documentTemplates.map(doc => `<article><span>${escapeHTML(doc.type)}</span><strong>${escapeHTML(doc.name)}</strong><p>${escapeHTML(doc.status)}</p>${doc.href ? `<a class="ghost-button doc-link" href="${escapeHTML(doc.href)}" download>Télécharger</a>` : '<button class="ghost-button" disabled>À connecter</button>'}</article>`).join('')}
      </div>
    </section>
  `, role);
}


function trainerOverview() {
  const events = listEvents();
  return shell(h`
    <section class="hero-grid">
      <article class="hero-card glass-panel">
        <p class="eyebrow">Suivi pédagogique</p>
        <h2>Vision globale stagiaires</h2>
        <p>Prototype local : les données sont stockées dans le navigateur. Pour production, brancher une base sécurisée.</p>
      </article>
      <article class="glass-panel progress-card">
        <span class="metric">${events.length}</span>
        <h3>Évènements tracés</h3>
        <button class="pill-button" data-action="export-events">Exporter JSON</button>
      </article>
    </section>
    <section class="section-grid two">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Conformité</p><h3>Points Qualiopi intégrés</h3></div>
        <ul class="check-list">${qualiopiChecklist.map(item => `<li><strong>${escapeHTML(item.label)}</strong><span>${escapeHTML(item.detail)}</span></li>`).join('')}</ul>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Journal</p><h3>Dernières actions</h3></div>
        ${events.slice(0,8).map(event => `<p class="event-line"><strong>${escapeHTML(event.type)}</strong><span>${new Date(event.createdAt).toLocaleString('fr-FR')}</span></p>`).join('') || '<p>Aucun évènement pour le moment.</p>'}
      </article>
    </section>
  `, 'trainer');
}

function trainerValidations() {
  return shell(h`
    <section class="glass-panel content-card">
      <div class="section-heading"><p class="eyebrow">Validations</p><h2>Progression par formation</h2></div>
      <div class="validation-list">
        ${courses.map(course => {
          const progress = averageProgress(course);
          const score = state.quizScores?.[course.id] ?? '—';
          const cert = state.certificates?.[course.id] ? 'Débloquée' : 'Non validée';
          return `<article><strong>${escapeHTML(course.title)}</strong><span>Progression ${progress}%</span><span>Quiz ${score}%</span><span>${cert}</span></article>`;
        }).join('')}
      </div>
    </section>
  `, 'trainer');
}

function trainerTickets() {
  return shell(h`
    <section class="glass-panel content-card">
      <div class="section-heading"><p class="eyebrow">Assistance</p><h2>Tickets stagiaires</h2></div>
      ${ticketList()}
    </section>
  `, 'trainer');
}

function trainerSettings() {
  return shell(h`
    <section class="section-grid two">
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Technique</p><h2>Production ready</h2></div>
        <ul class="soft-list">
          <li>Remplacer l’authentification démo par Firebase Auth ou Supabase Auth.</li>
          <li>Brancher le stockage documents côté serveur.</li>
          <li>Envoyer les traces dans une base horodatée et exportable.</li>
          <li>Créer une vraie génération PDF d’attestation.</li>
        </ul>
      </article>
      <article class="glass-panel content-card">
        <div class="section-heading"><p class="eyebrow">Offline</p><h2>PWA active</h2></div>
        <p>Le service worker met en cache l’interface de base pour une consultation hors ligne basique.</p>
      </article>
    </section>
  `, 'trainer');
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const error = form.querySelector('.form-error');
  try {
    session = login(form.email.value, form.password.value);
    addEvent('login_success', { role: session.role, email: session.email });
    navigate(session.role === 'trainer' ? '/trainer' : '/student/dashboard');
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    addEvent('login_failed', { email: form.email.value });
  }
}

function bindEvents() {
  const loginForm = document.querySelector('#login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

  document.querySelectorAll('[data-action="logout"]').forEach(button => button.addEventListener('click', () => {
    addEvent('logout', { user: session?.email });
    logout();
    session = null;
    navigate('/login');
  }));

  const courseSelect = document.querySelector('#course-select');
  if (courseSelect) courseSelect.addEventListener('change', event => {
    state = patchState({ selectedCourseId: event.target.value });
    addEvent('course_selected', { courseId: event.target.value });
    render();
  });

  document.querySelectorAll('[data-action="complete-module"]').forEach(button => button.addEventListener('click', () => {
    const course = selectedCourse();
    const index = Number(button.dataset.index);
    const progress = state.progress || {};
    const courseProgress = progress[course.id] || { completedModules: [] };
    const completedModules = Array.from(new Set([...courseProgress.completedModules, index]));
    state = patchState({ progress: { ...progress, [course.id]: { completedModules, updatedAt: new Date().toISOString() } } });
    addEvent('module_completed', { courseId: course.id, moduleIndex: index, moduleTitle: course.modules[index].title });
    render();
  }));

  const quizForm = document.querySelector('#quiz-form');
  if (quizForm) quizForm.addEventListener('submit', event => {
    event.preventDefault();
    const course = selectedCourse();
    let correct = 0;
    course.quiz.forEach((q, index) => {
      const value = Number(new FormData(quizForm).get(`q${index}`));
      if (value === q.answer) correct += 1;
    });
    const score = Math.round((correct / course.quiz.length) * 100);
    const quizScores = { ...(state.quizScores || {}), [course.id]: score };
    const certificates = { ...(state.certificates || {}) };
    if (score >= 80) certificates[course.id] = { score, date: new Date().toISOString(), title: course.title };
    state = patchState({ quizScores, certificates });
    addEvent('quiz_submitted', { courseId: course.id, score, certified: score >= 80 });
    render();
  });

  const ticketForm = document.querySelector('#ticket-form');
  if (ticketForm) ticketForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(ticketForm);
    const ticket = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ticket-${Date.now()}`,
      status: 'ouvert',
      priority: 'normal',
      subject: data.get('subject'),
      message: data.get('message'),
      createdAt: new Date().toISOString(),
      author: session?.name || 'Stagiaire'
    };
    state = patchState({ tickets: [ticket, ...(state.tickets || [])] });
    addEvent('ticket_created', { ticketId: ticket.id, subject: ticket.subject });
    render();
  });

  document.querySelectorAll('[data-action="print-certificate"]').forEach(button => button.addEventListener('click', () => window.print()));
  document.querySelectorAll('[data-action="export-events"]').forEach(button => button.addEventListener('click', exportEvents));
}

function guarded(route) {
  if (!session && route !== '/login') {
    navigate('/login');
    return loginView();
  }
  if (session && route === '/login') {
    navigate(session.role === 'trainer' ? '/trainer' : '/student/dashboard');
  }
  if (session?.role === 'student' && route.startsWith('/trainer')) return learningView();
  if (session?.role === 'trainer' && route.startsWith('/student')) return trainerOverview();

  switch (route) {
    case '/login': return loginView();
    case '/student/dashboard':
    case '/student/learning': return learningView();
    case '/student/quiz': return quizView();
    case '/student/memo': return memoView();
    case '/student/contact': return contactView();
    case '/student/documents': return documentsView('student');
    case '/trainer': return trainerOverview();
    case '/trainer/validations': return trainerValidations();
    case '/trainer/tickets': return trainerTickets();
    case '/trainer/documents': return documentsView('trainer');
    case '/trainer/settings': return trainerSettings();
    default: return session?.role === 'trainer' ? trainerOverview() : learningView();
  }
}

function render() {
  state = loadState();
  session = getSession();
  app.innerHTML = guarded(currentRoute());
  bindEvents();
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Service worker non enregistré', error));
  }
});
