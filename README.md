# Quiz Instagram Borne2Play

App de test end-to-end pour l'outil de quiz Instagram hebdomadaire de Borne2Play :
parcours participant (accueil, questions, fin) et parcours admin (publication,
clôture, classement), connectés à la vraie base Supabase.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) pour le parcours participant,
et [http://localhost:3000/admin](http://localhost:3000/admin) pour l'admin.

## Configuration

Les variables d'environnement vivent dans `.env.local` (non commité) :

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : utilisées
  côté navigateur pour le parcours participant (lecture des quiz/questions ouverts,
  RPC `has_participated` et `submit_participation`).
- `SUPABASE_SERVICE_ROLE_KEY` : utilisée uniquement côté serveur (routes
  `src/app/api/admin/*`) pour créer/clôturer les quiz et lire le classement.
  Ne jamais exposer cette clé au client.
- `ADMIN_TOKEN` : jeton simple protégeant les routes admin (généré aléatoirement
  lors du setup). À saisir dans l'écran de connexion de `/admin`.

Voir `.env.local.example` pour le format attendu.

## Format du fichier JSON d'import (admin)

```json
{
  "theme": "Thème du quiz",
  "questions": [
    {
      "question_text": "...",
      "choice_a": "...",
      "choice_b": "...",
      "choice_c": "...",
      "choice_d": "...",
      "correct_choice": "A"
    }
  ]
}
```

## Test end-to-end automatisé

Le script `scripts/e2e-test.mjs` crée un quiz de test, le publie, soumet une
participation, vérifie le score calculé côté serveur, vérifie qu'une deuxième
participation avec le même pseudo est bloquée, clôture le quiz, vérifie qu'une
nouvelle participation est refusée, puis nettoie les données de test créées.

```bash
node --env-file=.env.local scripts/e2e-test.mjs
```
