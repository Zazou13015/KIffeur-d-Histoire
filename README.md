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
| `npm run db:test-securite` | Vérifie sur la base locale que le navigateur ne peut lire ni les dates, ni les alias, ni les descriptions |
| `npm run db:test-score` | Vérifie sur la base locale le calcul du score (exemple du PRD, dates av. J.-C., chrono) |
| `npm run db:test-solo` | Vérifie le moteur solo avec/sans compte, les filtres, le chrono et les autorisations ([contrat RPC](docs/solo-serveur.md)) |
| `npm run db:test-solo-retention` | Vérifie l'expiration à 24 h, la purge/cascade et le budget anonyme sans modifier les parties connectées |
| `npm run db:test-inverse` | Vérifie le mode inversé, les dates distinctes, la tolérance, le score et la sécurité des questions |
| `scripts/tests-sql.sh` | Sans Docker, sur un Postgres vide : applique migrations + seed et lance tous les tests SQL (c'est ce que fait la CI) |

## Travailler à deux

1. Pars toujours de `main` à jour : `git checkout main && git pull`.
2. Crée une branche : `git checkout -b ma-fonctionnalite`.
3. Commit, pousse, ouvre une Pull Request. La CI vérifie lint, types et build ; Vercel publie une URL de prévisualisation.
4. L'autre relit, puis on merge dans `main`, qui part en production.

## La base de données (important)

Il y a deux projets Supabase, avec exactement la même structure pour le jeu :

| Base | Propriétaire | Sert à | Branchée sur |
|---|---|---|---|
| **Test** (`baezxgddyoweryeivivs`) | Maxou | Développer et tester sans risque | Les PC de dev, les prévisualisations Vercel |
| **Production** (projet KFFR contrée) | Antonin | Les vrais joueurs, comptes partagés avec KFFR contrée | Le site de production |

- Toutes nos tables sont dans le schéma `histoire`. On ne touche jamais aux schémas `public`, `private` ni `auth` (ceux de KFFR).
- Une modification de la base = un fichier de migration (`npm run db:new ...`), relu en PR, appliqué d'abord sur la base de test, puis seulement ensuite sur la production.
- Chaque migration se termine par une ligne dans le registre : `insert into histoire.migrations_appliquees (version, nom) values ('<version>', '<nom>');`
- On n'édite jamais les tables de prod depuis le tableau de bord Supabase.

### Base de test

Les migrations s'y appliquent normalement (`npx supabase link --project-ref baezxgddyoweryeivivs` puis `npx supabase db push`, ou via l'agent Claude).

### Mise en production de la base (projet KFFR)

**Pas de `supabase db push` vers le projet KFFR.** Sa liste de migrations (`supabase_migrations.schema_migrations`) appartient au dépôt [Contree-KFFR](https://github.com/AntoninKFFR/Contree-KFFR) : y inscrire nos versions bloquerait les prochains `db push` d'Antonin. Nos migrations sont suivies dans `histoire.migrations_appliquees` à la place.

Pour chaque migration pas encore présente dans ce registre (`select version from histoire.migrations_appliquees`) :
1. Relire le fichier à deux (Maxou + Antonin) : il ne doit toucher qu'à `histoire` (et aux extensions `unaccent`/`pg_trgm` du schéma `extensions`).
2. L'exécuter tel quel dans une transaction (*SQL Editor* du projet KFFR, ou l'agent Claude via le connecteur Supabase), dans l'ordre des versions. Le fichier inscrit lui-même sa ligne dans le registre.
3. Vérifier que KFFR contrée fonctionne toujours.

Une fois au départ, dans le tableau de bord du projet KFFR (Antonin) :
- *Project Settings → Data API → Exposed schemas* : ajouter `histoire`, sans retirer les schémas déjà exposés ;
- *Authentication → URL Configuration → Redirect URLs* : ajouter `https://k-iffeur-d-histoire.vercel.app/**` et `https://*-kffrh.vercel.app/**` (ne pas changer la *Site URL*, c'est celle de KFFR).

## Déploiement Vercel

1. Sur vercel.com, *Add New → Project*, importer ce dépôt GitHub (Vercel détecte Next.js tout seul).
2. Dans *Settings → Environment Variables*, ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : celles du projet KFFR pour *Production*, celles de la base de test pour *Preview* et *Development*.
3. Inviter Antonin/Maxou dans l'équipe Vercel pour que chacun voie les déploiements.
