# Mettre l'API en ligne sur Railway

Le dépôt contient deux applications : `frontend/` part sur Vercel, `backend/`
sur Railway. Ce guide ne traite que du backend.

---

## 1. Créer le projet

1. <https://railway.app> → **New Project** → **Deploy from GitHub repo** →
   choisissez ce dépôt.
2. Railway crée un service. Ouvrez-le → **Settings** :
   - **Root Directory** : `backend`
     *Sans cela, Railway tente de construire le dépôt entier et échoue :
     il trouve deux `package.json` et ne sait pas lequel utiliser.*
   - **Start Command** : laissez vide, `railway.json` s'en charge.

---

## 2. Ajouter la base de données

Dans le projet Railway : **+ New** → **Database** → **Add PostgreSQL**.

Railway crée un service `Postgres` avec ses propres identifiants. **Ne les
recopiez pas à la main** : ils changent si la base est recréée.

---

## 3. Variables d'environnement

Service de l'API → onglet **Variables** → **Raw Editor**, puis collez :

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
PGSSL=disable

JWT_SECRET=collez_ici_le_resultat_de_npm_run_secret

CORS_ORIGINS=https://mojo-malado.vercel.app
SITE_URL=https://mojo-malado.vercel.app

ADMIN_EMAIL=habib@gmail.com
ADMIN_PASSWORD=un_mot_de_passe_de_10_caracteres_minimum

FREE_SHIPPING_FROM=50000
SHIPPING_DAKAR=2000
SHIPPING_REGIONS=3500
SHOP_PHONE=710433624

PAYMENT_PROVIDER=
NABOO_API_KEY=
WAVE_API_KEY=
WEBHOOK_SECRET=
RATE_LIMIT_MAX=300
```

Quatre pièges, dans l'ordre où ils font perdre du temps :

**`JWT_SECRET`, pas `SUPABASE_JWT_SECRET`.** L'ancienne documentation cite le
second nom. Le code v2 lit `JWT_SECRET` et **arrête le serveur** s'il est
absent — vous verriez le service redémarrer en boucle sans explication claire.
Générez la valeur avec `npm run secret` dans `backend/`.

**`${{Postgres.DATABASE_URL}}` est une référence, pas du texte.** Railway la
résout vers le service PostgreSQL. Si vous avez renommé ce service, remplacez
`Postgres` par son nom exact.

**`PGSSL=disable`** car cette référence pointe vers le réseau privé
(`postgres.railway.internal`), qui ne présente pas de certificat. Forcer TLS
donnerait `the server does not support SSL connections`. Si vous connectez
l'API depuis l'extérieur (adresse en `…proxy.rlwy.net`), passez à
`PGSSL=require`.

**Ne définissez pas `PORT`.** Railway l'impose et `server.js` le lit déjà.

---

## 4. Premier déploiement

Railway déploie automatiquement. Le `startCommand` de `railway.json` est :

```
npm run migrate && node server.js
```

Les tables sont donc créées à chaque démarrage — l'opération est idempotente,
elle ne détruit ni ne duplique rien.

**Le catalogue, lui, n'est pas importé automatiquement.** Une fois le service
en ligne, ouvrez son terminal (onglet du service → menu ⋯ → **Shell**) et
lancez **une seule fois** :

```bash
npm run seed
```

Cela crée les 4 catégories, importe les 26 produits avec leurs déclinaisons,
et crée le compte administrateur.

> **Ne remettez pas `npm run seed` dans la commande de démarrage.** Le script
> réécrit le mot de passe administrateur à partir de `ADMIN_PASSWORD` : si vous
> le changez un jour depuis le back-office, le déploiement suivant le
> réinitialiserait sans prévenir.

---

## 5. Exposer l'API

Service de l'API → **Settings** → **Networking** → **Generate Domain**.

Vous obtenez une adresse du type `https://mojomalado-api.up.railway.app`.
Vérifiez-la :

```
https://VOTRE-DOMAINE.up.railway.app/api/health
```

Réponse attendue : `{"status":"ok","db":"ok","time":"…"}`.
Si `db` vaut `ko`, le problème vient de `DATABASE_URL` ou de `PGSSL`.

Complétez alors la variable Railway `API_URL` avec cette adresse.

---

## 6. Relier la boutique

Trois valeurs à mettre à jour **hors de Railway** :

**Vercel** → Settings → Environment Variables :

```
VITE_API_URL=https://VOTRE-DOMAINE.up.railway.app/api
```

Notez le `/api` final. Redéployez ensuite depuis Vercel : les variables
`VITE_*` sont figées dans le fichier construit, un simple redémarrage ne
suffit pas.

**`frontend/vercel.json`** → remplacez les deux occurrences de
`REMPLACER-PAR-VOTRE-DOMAINE-RAILWAY.up.railway.app` par votre domaine.
Ces réécritures servent `/sitemap.xml` et `/robots.txt` depuis l'adresse de la
boutique, seul endroit où Google les cherche. Vercel n'accepte pas de variable
d'environnement dans une réécriture : c'est le seul fichier à modifier à la main.

**`CORS_ORIGINS` sur Railway** doit contenir l'adresse exacte du site, sans
barre oblique finale. Laissée vide, l'API accepte tous les domaines.

---

## 7. Vérifications finales

| À vérifier | Comment |
|---|---|
| L'API répond | `…/api/health` → `db: ok` |
| Le catalogue est importé | `…/api/products` → `total: 26` |
| Le plan du site se génère | `…/sitemap.xml` → 34 adresses |
| La boutique joint l'API | Ouvrir la boutique, les produits s'affichent |
| Le sitemap est au bon endroit | `https://mojo-malado.vercel.app/sitemap.xml` |
| L'administration fonctionne | `/secret-mojo-gate` avec `ADMIN_EMAIL` |

---

## 8. Ce que Railway ne fait pas

- **Pas de sauvegarde automatique** sur le forfait gratuit. Exportez
  régulièrement : `pg_dump "$DATABASE_URL" > sauvegarde.sql`.
- **Le forfait gratuit s'arrête** au-delà du crédit mensuel. Pour une boutique
  réellement ouverte, comptez le forfait Hobby.
- **Les photos sont stockées dans la base** (data URL). Elles voyagent donc
  avec la sauvegarde, mais alourdissent chaque requête produit. Au-delà de
  quelques centaines d'articles, passez à un service de stockage.
