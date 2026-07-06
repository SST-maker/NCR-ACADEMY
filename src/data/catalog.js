export const courses = [
  {
    id: 'communication-digitale',
    title: 'Communication digitale en entreprise',
    category: 'Communication',
    duration: '1 jour ou demi-journée',
    format: 'Présentiel ou à distance',
    prerequisite: 'Aucun',
    public: 'Salariés, indépendants, demandeurs d’emploi, particuliers',
    source: 'Fiches synthèse N.C.R Solutions',
    objectives: [
      'Identifier les causes de conflit',
      'Communiquer avec calme et assurance',
      'Répondre efficacement aux réclamations'
    ],
    modules: [
      {
        title: 'Comprendre les conflits clients',
        time: '35 min',
        bullets: ['Identifier les profils difficiles', 'Analyser les causes fréquentes des litiges', 'Distinguer l’émotionnel du factuel'],
        activity: 'Analyse guidée d’un échange client tendu et repérage des faits vérifiables.'
      },
      {
        title: 'Adopter une posture professionnelle',
        time: '45 min',
        bullets: ['Écoute active', 'Reformulation', 'Empathie', 'Désamorçage verbal', 'Gestion du stress'],
        activity: 'Jeu de rôle avec feedback formateur sur la posture, le ton et la reformulation.'
      },
      {
        title: 'Réagir efficacement à l’écrit ou à l’oral',
        time: '45 min',
        bullets: ['Réponse claire et apaisée', 'Limites sans agressivité', 'Mail, téléphone et face à face'],
        activity: 'Rédaction d’une réponse professionnelle courte, claire et rassurante.'
      },
      {
        title: 'Transformer un conflit en opportunité',
        time: '35 min',
        bullets: ['Clôturer proprement', 'Préserver la relation', 'Prévenir les récidives'],
        activity: 'Construction d’un mini-plan de suivi client après réclamation.'
      }
    ],
    memo: ['Factuel avant émotionnel', 'Reformuler avant de répondre', 'Une limite claire peut rester respectueuse', 'Toujours clôturer avec une action concrète'],
    quiz: [
      { question: 'Quelle première action aide à désamorcer un échange tendu ?', options: ['Couper la parole', 'Reformuler calmement', 'Répondre plus fort'], answer: 1 },
      { question: 'Dans un litige, le factuel sert surtout à…', options: ['Poser une base commune', 'Prouver que le client a tort', 'Éviter toute solution'], answer: 0 }
    ]
  },
  {
    id: 'outils-bureautiques',
    title: 'Outils numériques au bureau',
    category: 'Bureautique',
    duration: '1 à 2 jours',
    format: 'Présentiel ou à distance',
    prerequisite: 'Aucun',
    public: 'Salariés, indépendants, demandeurs d’emploi, particuliers',
    source: 'Fiches synthèse N.C.R Solutions',
    objectives: [
      'Maîtriser les outils numériques essentiels du bureau',
      'Gagner du temps avec Word, Excel et PowerPoint',
      'Collaborer efficacement avec des outils partagés et sécurisés'
    ],
    modules: [
      { title: 'Environnement numérique', time: '40 min', bullets: ['Optimiser Windows/macOS', 'Organiser fichiers et dossiers', 'Comprendre cloud vs local'], activity: 'Réorganisation d’une arborescence de travail.' },
      { title: 'Bureautique essentielle', time: '1 h', bullets: ['Word professionnel', 'Excel formules simples', 'PowerPoint visuel'], activity: 'Création d’un mini-pack : document, tableau et slide.' },
      { title: 'Collaboration à distance', time: '45 min', bullets: ['Google Workspace', 'Microsoft 365', 'Partage et coédition'], activity: 'Travail en binôme sur un document partagé.' },
      { title: 'Sécurité numérique', time: '40 min', bullets: ['Organisation mail', 'Phishing', 'Mots de passe et sauvegardes'], activity: 'Tri d’exemples : mail fiable, douteux ou dangereux.' }
    ],
    memo: ['Nommer clairement ses fichiers', 'Sauvegarder au bon endroit', 'Vérifier expéditeur + lien avant clic', 'Partager avec le niveau de droit minimum'],
    quiz: [
      { question: 'Quel réflexe réduit les erreurs de version ?', options: ['Envoyer 8 pièces jointes', 'Utiliser la coédition', 'Renommer au hasard'], answer: 1 },
      { question: 'Un mail suspect demande un mot de passe. Que faire ?', options: ['Cliquer vite', 'Vérifier et signaler', 'Répondre avec ses codes'], answer: 1 }
    ]
  },
  {
    id: 'litiges-clients',
    title: 'Gérer et désamorcer les litiges clients',
    category: 'Relation client',
    duration: '1 jour ou demi-journée',
    format: 'Présentiel ou à distance',
    prerequisite: 'Aucun',
    public: 'Salariés, indépendants, demandeurs d’emploi, particuliers',
    source: 'Fiches synthèse N.C.R Solutions',
    objectives: ['Identifier les causes de conflit', 'Communiquer avec calme et assurance', 'Répondre efficacement aux réclamations'],
    modules: [
      { title: 'Lire la situation', time: '35 min', bullets: ['Besoin réel', 'Émotion exprimée', 'Contrainte métier'], activity: 'Carte mentale d’un litige courant.' },
      { title: 'Méthode 5C', time: '45 min', bullets: ['Contact', 'Compréhension', 'Cadre', 'Choix', 'Clôture'], activity: 'Script d’entretien minute par minute.' },
      { title: 'Gérer l’escalade', time: '45 min', bullets: ['Rester calme', 'Poser le cadre', 'Passer le relais si nécessaire'], activity: 'Simulation avec client agressif verbalement.' },
      { title: 'Tracer et prévenir', time: '30 min', bullets: ['Compte rendu', 'Causes racines', 'Actions correctives'], activity: 'Rédaction d’une trace exploitable.' }
    ],
    memo: ['Ne jamais répondre à chaud', 'Poser le cadre sans humilier', 'Conserver une trace propre', 'Transformer le litige en amélioration'],
    quiz: [
      { question: 'Le meilleur indicateur d’un bon désamorçage est…', options: ['La vitesse', 'La baisse de tension et une solution claire', 'Le silence du client'], answer: 1 },
      { question: 'Pourquoi tracer un litige ?', options: ['Pour accuser', 'Pour prévenir et améliorer', 'Pour rallonger le dossier'], answer: 1 }
    ]
  },
  {
    id: 'community-manager',
    title: 'Community Manager',
    category: 'Réseaux sociaux',
    duration: '2 jours',
    format: 'Présentiel ou à distance',
    prerequisite: 'Aucun, aisance numérique recommandée',
    public: 'Entrepreneurs, salariés, associations, indépendants',
    source: 'Architecture demandée N.C.R Academy',
    objectives: ['Construire une présence cohérente', 'Planifier des contenus utiles', 'Analyser les performances sans se perdre dans les chiffres'],
    modules: [
      { title: 'Positionnement éditorial', time: '45 min', bullets: ['Cible', 'Promesse', 'Ton', 'Piliers de contenu'], activity: 'Définir 4 piliers éditoriaux.' },
      { title: 'Création de contenu', time: '1 h', bullets: ['Accroche', 'Visuel', 'CTA', 'Formats courts'], activity: 'Transformer une idée en post prêt à publier.' },
      { title: 'Planning & régularité', time: '45 min', bullets: ['Calendrier', 'Batching', 'Réutilisation intelligente'], activity: 'Construire une semaine de publications.' },
      { title: 'Mesure & amélioration', time: '40 min', bullets: ['Portée', 'Engagement', 'Leads', 'Ajustement'], activity: 'Lire un mini-tableau de bord.' }
    ],
    memo: ['Une cible claire avant un beau visuel', 'Un post = une idée', 'Régularité > perfection', 'Mesurer pour améliorer'],
    quiz: [
      { question: 'Un bon pilier de contenu sert à…', options: ['Improviser plus', 'Structurer la ligne éditoriale', 'Copier les concurrents'], answer: 1 },
      { question: 'Le CTA doit être…', options: ['Clair et simple', 'Caché', 'Toujours agressif'], answer: 0 }
    ]
  },
  {
    id: 'acteur-sst',
    title: 'Acteur SST',
    category: 'Sauveteur Secouriste du Travail',
    duration: 'Selon référentiel de formation SST',
    format: 'Présentiel avec mises en situation',
    prerequisite: 'Selon dispositif SST applicable',
    public: 'Salariés amenés à contribuer aux secours et à la prévention en entreprise',
    source: 'Guide des données techniques INRS V5_01/2024',
    objectives: ['Protéger', 'Examiner', 'Faire alerter ou alerter', 'Secourir selon la situation'],
    modules: [
      { title: 'Protéger', time: '45 min', bullets: ['Analyser la situation', 'Identifier les dangers persistants', 'Supprimer, isoler ou soustraire sans s’exposer'], activity: 'Lecture de scène : mécanique, électrique, thermique, atmosphère toxique.' },
      { title: 'Examiner', time: '45 min', bullets: ['Saignement abondant', 'Étouffement', 'Réponse de la victime', 'Respiration'], activity: 'Checklist d’examen avec priorités vitales.' },
      { title: 'Faire alerter ou alerter', time: '30 min', bullets: ['Qui alerter', 'Message structuré', 'Consignes des secours'], activity: 'Simulation d’appel : identité, lieu, nature, état de la victime, gestes réalisés.' },
      { title: 'Secourir', time: '1 h 30', bullets: ['Saignement', 'Étouffement', 'Malaise', 'Brûlure', 'Traumatisme', 'Plaie', 'Inconscience avec respiration', 'Arrêt respiratoire'], activity: 'Mises en situation progressives et feedback critérié.' }
    ],
    memo: ['Moins de trois minutes pour agir', 'Ne pas se mettre en danger', 'Observer avant de toucher', 'Toujours surveiller et rassurer la victime'],
    quiz: [
      { question: 'Les quatre grandes actions SST sont…', options: ['Protéger, examiner, alerter, secourir', 'Courir, déplacer, appeler, partir', 'Analyser, diagnostiquer, prescrire, soigner'], answer: 0 },
      { question: 'Face à un danger non contrôlable, le SST doit…', options: ['S’exposer pour aller plus vite', 'Isoler la zone et faire alerter si la soustraction est impossible sans risque', 'Déplacer toujours la victime'], answer: 1 }
    ]
  }
];

export function getCourse(id) {
  return courses.find(course => course.id === id) || courses[0];
}
