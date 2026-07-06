export const qualiopiChecklist = [
  { label: 'Objectifs affichés', detail: 'Chaque formation présente ses objectifs dès l’entrée dans le module.' },
  { label: 'Prérequis et public', detail: 'Public, format, durée et prérequis visibles dans les fiches formation.' },
  { label: 'Accessibilité', detail: 'Bloc accessibilité prévu pour adapter le parcours aux personnes en situation de handicap.' },
  { label: 'Évaluation', detail: 'Quiz, mises en situation et validation de module avec horodatage.' },
  { label: 'Traçabilité', detail: 'Journal local des connexions, consultations, validations et scores exportable en JSON.' },
  { label: 'Documents', detail: 'Espace prévu pour convocation, livret d’accueil, attestation et ressources.' }
];

export const documentTemplates = [
  { name: 'Convocation de formation', type: 'PDF', status: 'À connecter au stockage sécurisé' },
  { name: 'Livret d’accueil stagiaire', type: 'PDF', status: 'À connecter au stockage sécurisé' },
  { name: 'Attestation de fin de formation', type: 'PDF', status: 'Générée après validation' },
  { name: 'Questionnaire de satisfaction à chaud', type: 'Formulaire', status: 'Prévu dans la roadmap' }
];
