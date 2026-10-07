# Comptes KFFR et sauvegarde (#24)

Décision produit d’Antonin du 7 octobre 2026 : Histoire et Contrée utilisent
le même projet Supabase, le même `auth.users.id` et un seul pseudo,
**`public.profiles.username`**. Histoire lit cette table directement et modifie
seulement la ligne du compte connecté, avec son client Supabase SSR normal et
les RLS existantes. Aucun client administrateur/service_role.

Les règles sont celles de `AntoninKFFR/Contree-KFFR/lib/profiles.ts` : `trim`,
espaces consécutifs remplacés par un espace, 1 à 40 caractères selon la validation
JavaScript existante, refus des caractères de contrôle restants. Unicité exacte,
sensible à la casse, garantie par l’index existant. L’inscription vérifie la
disponibilité avec la RPC **existante** `public.is_username_taken` ; l’écriture
traite aussi `23505`, car cette vérification ne réserve pas un pseudo.

Chaque lecture relit `profiles` sans cache applicatif. Une modification depuis
Histoire est immédiatement dans la source commune pour Contrée. Histoire
rafraîchit aussi sa page au retour de focus/visibilité après un changement dans
Contrée. Aucun trigger, colonne miroir ni mécanisme de synchronisation. L’onglet
Contrée déjà ouvert dépend de son propre mécanisme de rafraîchissement : son code
reste inchangé dans cette issue.

`histoire.ensure_player()` crée uniquement `players.id = auth.uid()`, de façon
idempotente, en `SECURITY INVOKER` sous les RLS existantes. Les pages authentifiées
et le lancement d’une partie via les actions Histoire assurent cette première
utilisation. `players.display_name` reste présent et nullable, **legacy**, jamais
lu ou maintenu pour l’identité. Aucun trigger sur `auth.users`.

## Parcours Auth

- `/connexion` conserve email/mot de passe et Google OAuth/PKCE. Tous les retours
  passent par `safeNextPath`, y compris email/mot de passe et inscription.
- `/inscription` demande un pseudo commun et un mot de passe confirmé. Le mot de
  passe est envoyé uniquement à Supabase Auth. Histoire ne fournit pas le pseudo
  dans les métadonnées du signup et ne dépend pas du trigger de Contrée pour
  écrire le profil : l’écriture intervient comme utilisateur authentifié.
- Avec confirmation email, un cookie provisoire `histoire-pending-username`
  httpOnly, Lax, Secure en production, limité à 24 h, garde uniquement le pseudo
  et l’UUID renvoyé par Auth dans une valeur JSON. Le callback/login vérifie
  l’utilisateur avec `getUser()` et exige une correspondance exacte des UUID.
  Une connexion à un autre compte conserve l’intention sans l’appliquer ; les
  anciens cookies sans UUID sont supprimés. Le pseudo déjà enregistré dans
  Contrée reste prioritaire. Le cookie est supprimé après finalisation pour son
  compte, et conservé si l’écriture échoue. Sur un autre navigateur,
  ou si le pseudo a été pris entre-temps, `/profil` permet de le choisir à nouveau.
- Google sans pseudo passe par `/profil?next=…` avant le retour prévu. Les
  sauvegardes et nouvelles parties connectées nécessitent le pseudo.
- `/profil` affiche email et pseudo, permet le changement global et la
  déconnexion. Aucun dashboard/statistique de #25.
- `/mot-de-passe-oublie` demande l’email, sans confirmer l’existence du compte.
  L’email revient au callback PKCE puis `/nouveau-mot-de-passe`. L’action de
  changement exige un utilisateur vérifié par `getUser()` et appelle `updateUser`.

L’origine des emails vient de `NEXT_PUBLIC_SITE_URL`, si configurée, sinon du
header Origin vérifié contre Host de la Server Action. Les redirections finales
du callback restent sur l’origine de la requête, sans confiance dans
`x-forwarded-host`. Les domaines/callbacks Histoire doivent être autorisés dans
la configuration Auth **existante** ; aucune configuration distante n’est modifiée.

## Partie anonyme après connexion

La future interface #18/#20 peut naviguer vers `/partie/<game_id>` après
`finishGame`. Cette route fournit le bilan et « Se connecter pour sauvegarder ».
Après login/inscription/onboarding, le retour retrouve le bilan puis lance une
Server Action de claim : le navigateur reçoit uniquement le game_id et un
état de sauvegarde. Il ne lit jamais le secret.

Après callback externe, `/auth/retour?next=…` affiche une page du même site puis
navigue vers la destination validée. Cela termine la chaîne de navigation externe
pour retrouver les cookies anonymes **SameSite=Strict**, sans changer leur
protection. Un lien fonctionne également sans JavaScript ; le claim automatique
nécessite JavaScript comme la future interface de jeu.

`histoire.claim_anonymous_game(uuid,text)` exige Auth, verrouille la partie avec
`FOR UPDATE`, refuse les parties connectées, en cours ou expirées, compare
uniquement SHA-256 au hash déjà utilisé. Aucun user_id en paramètre. Dans la même
transaction, il assure le joueur et fixe `user_id=auth.uid()`,
`anonymous_token_hash=NULL`, `expires_at=NULL`. Le résultat et les questions
restent intacts. Un deuxième claim échoue, même concurrent. Les accès ultérieurs
utilisent uniquement le propriétaire Auth ; l’ancien token ne fonctionne plus.
Le serveur supprime uniquement le cookie de cette partie après succès.

Les nouvelles parties connectées étaient déjà rattachées par `start_game`.
`games` et `game_questions` suffisent à l’historique futur #25, sans copie du
score. La rétention/purge/plafond anonymes restent inchangés.

## Migration et validation

`20261006233631_comptes_sauvegarde.sql` crée seulement deux fonctions dans
`histoire`, documente le champ legacy et inscrit le registre Histoire. Aucun
DDL/policy/fonction/trigger public, private, auth ou storage dans cette migration.
**Aucune écriture distante dans ce travail**, même sur la base de Max. Mise en
production séparée après revue, GO écrit Max et GO écrit Antonin.

`scripts/tests-sql.sh` vérifie Postgres vide et connexion locale avant de charger
le simulateur. `supabase/fixtures/kffr_profiles.sql` reproduit le contrat externe
de Contrée exclusivement pour ce simulateur : il est **hors migrations** et ne
doit pas être appliqué à une base existante. Les tests couvrent RLS, validation,
unicité, players, tous les refus de claim, conservation complète date/inverse,
purge et concurrence (deux comptes, un seul claim valide).

`npm test`, lint, typecheck et build couvrent aussi les formulaires, redirections,
cookies SSR/claim, onboarding, identité fraîche, inscription et reset.

Un smoke réel supplémentaire est disponible :

```powershell
# Projet Supabase LOCAL JETABLE avec contrat profiles existant préparé en seed,
# API :55321, Mailpit :55324, confirmation email désactivée pour ce premier test.
$env:KFFR_LOCAL_PUBLISHABLE_KEY = '<clé publique locale sb_publishable_…>'
npm exec -- tsx scripts/test-comptes-local.ts
```

Ce script refuse toute URL distante et toute clé autre que publishable. Il teste
Auth réel, échanges de pseudo entre deux clients du même projet, RLS A/B, unicité,
players idempotent, claim date/inverse, login/logout et reset email local/PKCE.
Il crée des comptes fictifs dans ce projet local jetable. Google réel et les
emails/domaines du projet partagé restent à vérifier par les humains : aucun
secret OAuth, login distant ni réglage Auth partagé n’est utilisé ici.

Le parcours a aussi été vérifié dans le navigateur local : inscription sans
confirmation, changement du pseudo avec nettoyage des espaces, déconnexion,
puis inscription avec confirmation activée uniquement dans le projet jetable.
Le lien capturé dans Mailpit échange le code PKCE, complète le pseudo sous la
session du nouveau compte et l’affiche immédiatement dans l’en-tête.
