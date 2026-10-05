# Kiffeurs d'Histoire

Jeu web de dates historiques : placer des événements sur une frise, en solo, en lobby, en 1v1 classé, et réviser le programme de terminale.

Stack : Next.js (App Router, TypeScript, Tailwind) sur Vercel, Supabase (Postgres, Auth, Realtime, Storage). Architecture détaillée dans [docs/architecture.md](docs/architecture.md).

Feuille de route V1 : [issue de suivi #31](https://github.com/Zazou13015/KIffeur-d-Histoire/issues/31). Pour prendre une étape (humain ou agent IA), suivre la section « Traiter une issue » de [CLAUDE.md](CLAUDE.md).

## Démarrer en local

Prérequis : [Node.js 22](https://nodejs.org), [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pour la base locale), Git.

```bash
git clone <url-du-depot>
cd kiffeurs-histoire
npm install

# 1. Base de données locale (Docker doit être lancé)
npm run db:start          # démarre Supabase en local et applique migrations + données de test
                          # note l'« API URL » et la « Publishable key » affichées

# 2. Variables d'environnement
cp .env.example .env.local
# colle la Publishable key dans .env.local

# 3. Application
npm run dev               # http://localhost:3000
```

La page d'accueil liste les événements de test : si tu les vois, l'app parle bien à la base.
Le tableau de bord Supabase local est sur http://127.0.0.1:54323 (tu peux y créer un utilisateur de test dans *Authentication* pour essayer la connexion).

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Lance le site en local |
| `npm run lint` / `npm run typecheck` | Vérifications avant de pousser (la CI fait pareil) |
| `npm run db:start` / `npm run db:stop` | Démarre / arrête la base locale |
| `npm run db:reset` | Recrée la base locale depuis les migrations + `supabase/seed.sql` |
| `npm run db:new nom_du_changement` | Crée un nouveau fichier de migration vide |

## Travailler à deux

1. Pars toujours de `main` à jour : `git checkout main && git pull`.
2. Crée une branche : `git checkout -b ma-fonctionnalite`.
3. Commit, pousse, ouvre une Pull Request. La CI vérifie lint, types et build ; Vercel publie une URL de prévisualisation.
4. L'autre relit, puis on merge dans `main`, qui part en production.

## La base de données (important)

En production, ce jeu utilise **le même projet Supabase que KFFR contrée** : les joueurs ont un seul compte pour les deux jeux.

- Toutes nos tables sont dans le schéma `histoire`. On ne touche jamais au schéma `public` (celui de KFFR).
- Une modification de la base = un fichier de migration (`npm run db:new ...`), testé en local avec `npm run db:reset`, relu en PR.
- On n'édite jamais les tables de prod depuis le tableau de bord Supabase.

### Mise en production de la base (une seule fois au départ, puis à chaque nouvelle migration)

```bash
npx supabase login
npx supabase link --project-ref <ref-du-projet-KFFR>
npx supabase db push --dry-run   # affiche ce qui va être appliqué : vérifier qu'il n'y a que du « histoire »
npx supabase db push
```

Puis, dans le tableau de bord du projet KFFR :
- *Settings → API → Exposed schemas* : ajouter `histoire` ;
- *Authentication → URL Configuration → Redirect URLs* : ajouter l'URL Vercel du jeu.

## Déploiement Vercel

1. Sur vercel.com, *Add New → Project*, importer ce dépôt GitHub (Vercel détecte Next.js tout seul).
2. Dans *Settings → Environment Variables*, ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` du projet Supabase de KFFR.
3. Inviter Antonin/Maxou dans l'équipe Vercel pour que chacun voie les déploiements.
