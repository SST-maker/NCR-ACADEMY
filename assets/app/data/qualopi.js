export const qualiopiChecklist = [
  { label: 'Objectifs affichés', detail: 'Chaque formation présente ses objectifs, son public, sa durée, son format et ses prérequis.' },
  { label: 'Contenus structurés', detail: 'Les modules contiennent leçon complète, cas pratique, critères de réussite et trace pédagogique.' },
  { label: 'Accessibilité', detail: 'Navigation lisible, mode clair ou sombre automatique, contrastes élevés et contenus découpés.' },
  { label: 'Évaluation', detail: 'Quiz avec corrigés commentés, score, seuil de réussite et certification pédagogique.' },
  { label: 'Traçabilité', detail: 'Connexions, validations, tickets et quiz sont horodatés dans le journal local exportable.' },
  { label: 'Documents', detail: 'Convocation, livret, attestation, questionnaire et registre sont disponibles dans l’espace documents.' }
];

export const documentTemplates = [
  { name: 'Livret d’accueil stagiaire', type: 'Markdown', status: 'Disponible dans le ZIP', href: './documents/livret-accueil-stagiaire.md' },
  { name: 'Convocation de formation', type: 'Markdown', status: 'Disponible dans le ZIP', href: './documents/convocation-formation.md' },
  { name: 'Attestation de fin de formation', type: 'Markdown', status: 'Disponible dans le ZIP', href: './documents/attestation-fin-formation.md' },
  { name: 'Questionnaire de satisfaction à chaud', type: 'Markdown', status: 'Disponible dans le ZIP', href: './documents/questionnaire-satisfaction.md' },
  { name: 'Registre de traçabilité pédagogique', type: 'Markdown', status: 'Disponible dans le ZIP', href: './documents/registre-tracabilite.md' }
];
