# Connexion Google (issue #45)

Le bouton « Continuer avec Google » utilise le client navigateur `@supabase/ssr`
existant et `signInWithOAuth({ provider: "google", options: { redirectTo } })`.
Le retour est construit à partir de l'origine du navigateur Histoire, jamais de
la Site URL de Contrée. Sans destination particulière, il pointe vers
`/auth/callback` ; un `next` interne peut être transmis pour revenir à une page.

Le Route Handler `/auth/callback` échange le code PKCE avec le client Supabase
serveur existant. Ses cookies de session sont transmis par Next.js à la réponse
de redirection. Aucun profil ou objet SQL n'est créé ou modifié par le code
Histoire. Contrairement à Contrée, ce parcours ne fait pas appel à `ensureProfile`.

Les destinations externes, les doubles slashs, les backslashs, les caractères de
contrôle, les encodages invalides ou imbriqués dangereux et les destinations de
connexion/authentification sont remplacés par `/`. Les erreurs OAuth reviennent
sur `/connexion?erreur=oauth`, avec le `next` validé pour réessayer. Aucun code,
jeton ou message technique du fournisseur n'est affiché ou journalisé par ce code.
Le callback interdit la mise en cache et l'envoi de son URL comme référent.

La connexion email/mot de passe conserve son formulaire, son action serveur,
ses messages et son retour à l'accueil.

## Configuration distante vérifiée en lecture seule

Le 6 octobre 2026, le Dashboard du projet partagé `bskyfdjwcdvzhlugtknb` contient :

- `https://k-iffeur-d-histoire.vercel.app/**`
- `https://*-kffrh.vercel.app/**`
- `https://*-antoninkffrs-projects.vercel.app/**`
- `http://localhost:3000/auth/callback`

Le callback de production `https://k-iffeur-d-histoire.vercel.app/auth/callback`
et ses paramètres sont couverts par la première règle. Aucun changement de
configuration n'a été effectué. La Site URL reste celle de Contrée.

Les aperçus et le développement peuvent utiliser le projet de test de Max selon
leurs variables Vercel : Google doit déjà être activé sur le projet utilisé, et
l'origine doit déjà être autorisée. Les tests automatisés utilisent des clients
simulés, sans connexion aux projets Supabase ni modification de base.
Si le Dashboard du projet utilisé ne couvre pas l'URL effective `redirectTo`,
arrêter la vérification réelle et demander à Antonin d'ajouter cette URL exacte.

## Vérifier

1. Ouvrir `/connexion` sur le site Histoire et cliquer sur « Continuer avec Google ».
2. Terminer la connexion Google : revenir à l'accueil Histoire, avec une session.
3. Ouvrir `/connexion?next=%2Fapercu` en production, se connecter et vérifier
   l'arrivée sur `/apercu` ; une destination externe doit ramener à l'accueil.
4. Refuser l'autorisation Google : voir le message d'erreur de connexion et pouvoir
   réessayer. Un callback sans code doit afficher le même message.
5. Se connecter avec email/mot de passe : comportement inchangé.

`npm test` vérifie le bouton, l'appel Google, le code OAuth, `next`, les protections
de redirection, la session/cookies SSR et le formulaire existant. Exécuter aussi
`npm run lint`, `npm run typecheck` et `npm run build`.
