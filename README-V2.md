# Mojo Malado — Plateforme v2

Reconstruction complète : nouvelle base de données, nouvelle API, nouvelle boutique,
nouveau back-office. La pile reste celle que vous connaissez — **React + Vite,
Express, PostgreSQL**.

---

## 1. Installation

### Base de données

Une base PostgreSQL est nécessaire (Supabase, Neon ou Render conviennent).

> **Installation locale déjà en place.** PostgreSQL 17 tourne sur le port 5432
> et la base `mojomalado` est prête. L'authentification locale est en `trust`
> (voir `pg_hba.conf`) : aucun mot de passe n'est demandé, d'où le
> `DATABASE_URL=postgresql://postgres@127.0.0.1:5432/mojomalado` de `.env`.
>
> Les tables de l'ancienne v1 (`products`, `sales`, `users`) n'ont pas été
> détruites : elles ont été déplacées dans le schéma `legacy` pour libérer
> `public`. Pour les consulter : `SELECT * FROM legacy.products;` — et pour
> les remettre en place, `ALTER TABLE legacy.products SET SCHEMA public;`.

```bash
cd backend
cp .env.example .env          # puis remplissez DATABASE_URL
npm run secret                # génère un JWT_SECRET, à coller dans .env
npm install
npm run setup                 # crée les tables + importe vos 26 produits
npm run dev                   # http://localhost:5000
```

`npm run setup` est **relançable sans risque** : les produits déjà importés sont
mis à jour, jamais dupliqués, et les stocks saisis à la main ne sont pas écrasés.

### Boutique

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### Compte administrateur

Il est créé par `npm run seed` à partir de `ADMIN_EMAIL` et `ADMIN_PASSWORD`
dans `backend/.env` (10 caractères minimum). Connexion sur `/secret-mojo-gate`.

---

## 2. Ce qui change par rapport à la v1

| | Avant | Maintenant |
|---|---|---|
| Produits | un prix, une photo, pas de stock | déclinaisons taille/couleur, stock par déclinaison, jusqu'à 8 photos |
| Stock | inexistant | décrémenté à la commande, remis en rayon à l'annulation |
| Clientes | aucune notion de compte | inscription, profil, adresses enregistrées, historique |
| Commandes | ligne unique dans `sales` | commande + lignes figées + historique de statuts |
| Suivi | aucun | page publique par référence + téléphone |
| Back-office | liste de produits | tableau de bord, stock, commandes, clientes, avis |
| Sécurité | total accepté du navigateur | tout recalculé côté serveur |

---

## 3. Modèle de données

```
categories ──< products ──< product_images
                   │
                   └──< product_variants   (taille, couleur, stock, prix)
                             │
customers ──< addresses      │
     │                       │
     └──< orders ──< order_items ──┘
              └──< order_events     (l'historique que voit la cliente)
products ──< reviews                (publiés uniquement après validation)
```

Trois décisions structurantes :

**Les prix sont des entiers.** En FCFA il n'y a pas de centimes ; stocker des
nombres à virgule ferait apparaître des `14999,999999` à l'affichage.

**Les lignes de commande sont figées.** `order_items` copie le nom, la taille, la
couleur, la photo et le prix au moment de l'achat. Renommer un produit ou changer
son prix ne réécrit pas les factures passées.

**Un produit vendu n'est jamais supprimé, seulement masqué.** Le supprimer
effacerait le lien avec les commandes déjà passées.

---

## 4. Le stock, en détail

C'est le point le plus délicat d'une boutique, et celui où les erreurs coûtent
le plus cher : vendre un article qu'on n'a pas.

À la création d'une commande, le serveur ouvre une transaction et verrouille les
lignes de stock concernées (`SELECT … FOR UPDATE`). Deux clientes qui achètent le
dernier exemplaire au même instant ne peuvent donc pas passer toutes les deux :
la seconde reçoit *« Robe beige (S) est épuisé »*. Vérifié en conditions réelles
avec deux requêtes simultanées.

L'annulation d'une commande depuis le back-office remet automatiquement les
articles en rayon. La réactivation d'une commande annulée revérifie le stock
avant d'accepter.

---

## 5. Sécurité

Ce qui était ouvert dans la v1 et ne l'est plus :

- **Le montant ne vient plus du navigateur.** Le serveur relit les prix en base et
  recalcule le total. Une requête forgée à 100 FCFA pour une robe à 15 000 est
  facturée 15 000.
- **Mots de passe hachés avec bcrypt** (coût 12), et comparaison effectuée même
  quand le compte n'existe pas — sinon le temps de réponse révèle quelles adresses
  sont enregistrées.
- **Connexion administrateur limitée à 5 tentatives par quart d'heure.**
- **Jetons séparés** pour les clientes et l'administration : une session cliente
  ne peut jamais atteindre le back-office.
- **CORS en liste blanche** via `CORS_ORIGINS`.
- **Webhook de paiement vérifié** : la notification sert seulement à connaître la
  référence ; le statut réel est redemandé au prestataire.

Restent à faire de votre côté :

1. **Révoquer la clé Supabase** publiée dans l'ancien `supabaseClient.js` — elle
   est dans l'historique Git.
2. **Ne jamais commiter `backend/.env`** (il est dans `.gitignore`).

---

## 5 bis. Codes promo

Trois natures de remise, créées depuis `/gestion-mojo-privee/promos` :

| Type | Effet | Exemple |
|---|---|---|
| `percent` | pourcentage du sous-total | `BIENVENUE10` → −10 % |
| `amount` | montant fixe en FCFA | `MOJO5000` → −5 000 FCFA |
| `shipping` | annule les frais de port | `LIVRAISON` |

Chaque code accepte un achat minimum, un nombre d'utilisations et une date de
fin. Le montant de la remise **n'est jamais transmis par le navigateur** : il
est recalculé côté serveur à la validation, à partir de la ligne lue en base.
Une requête forgée avec `discount: 41000` est ignorée — vérifié.

Le code est relu une seconde fois *dans la transaction de commande*, avec
`SELECT … FOR UPDATE` : entre l'aperçu affiché à la cliente et sa validation,
il a pu expirer ou atteindre sa limite, et deux commandes simultanées ne
peuvent pas consommer la même dernière utilisation.

---

## 5 ter. Référencement

Chaque page pose ses propres balises via `<Seo>` (`src/components/Seo.jsx`) :
titre, description, adresse canonique et aperçu de partage. Auparavant les
26 fiches produit partageaient toutes le même titre — Google n'y voyait
qu'une seule page.

Les fiches produit publient en plus des **données structurées** `Product` :
prix, disponibilité et avis. C'est ce qui permet à Google d'afficher le prix
directement sous le lien. La note agrégée n'est déclarée que si des avis
existent réellement — l'inventer expose à une pénalité.

`sitemap.xml` est **généré à la demande** par l'API : il suit le catalogue,
là où un fichier figé finirait par pointer vers des produits retirés. Les
pages de compte, de suivi et l'administration en sont exclues, comme dans
`robots.txt`.

Ces deux adresses doivent répondre depuis le domaine de la boutique : la
redirection est faite par `frontend/vercel.json`. **Si vous changez l'adresse
de l'API, mettez-y à jour les deux `destination`.**

Les pages sans intérêt pour la recherche (recherche interne, tri, panier,
compte) sont marquées `noindex` : sans cela, `?tri=note` et `?q=robe`
créeraient des dizaines de pages quasi identiques.

---

## 6. Paiement en ligne

Rien à changer dans le code : renseignez `PAYMENT_PROVIDER` dans `backend/.env`
(`paydunya`, `cinetpay`, `naboopay` ou `wave`) et les clés correspondantes.

**Tant qu'aucun prestataire n'est configuré, la boutique fonctionne** : la commande
est enregistrée, le stock réservé, et la cliente voit l'écran de transfert manuel
(numéro à copier) puis confirme sur WhatsApp. Vous pouvez mettre le site en ligne
aujourd'hui et brancher le paiement plus tard.

Le comparatif détaillé des prestataires est dans `PAIEMENTS-Mojo-Malado.html`.

---

## 7. Adresses du site

| Adresse | Rôle |
|---|---|
| `/` | Accueil |
| `/boutique` | Catalogue — filtres reflétés dans l'URL, donc partageables |
| `/produit/:slug` | Fiche produit : galerie plein écran, sélecteur de taille, guide des tailles |
| `/commande` | Tunnel d'achat en pleine page (coordonnées, livraison, paiement, code promo) |
| `/merci/:reference` | Confirmation et, si besoin, instructions de transfert Wave / Orange Money |
| `/connexion` · `/inscription` | Comptes clientes |
| `/compte` · `/compte/commandes` | Profil, adresses, historique |
| `/suivi` · `/commande/:reference` | Suivi (référence + téléphone) |
| `/a-propos` · `/contact` | Pages de la maison |
| `/secret-mojo-gate` | Connexion administration |
| `/gestion-mojo-privee` | Back-office (dont `/promos` pour les codes de réduction) |

---

## 8. API

Publique :

```
GET  /api/categories
GET  /api/products?categorie=&q=&tri=&page=&limite=&enStock=&vedette=
GET  /api/products/:idOuSlug
GET  /api/reviews?limite=          (avis validés, pour l'accueil)
POST /api/products/:id/reviews
POST /api/newsletter
POST /api/orders
POST /api/orders/promo             (aperçu d'un code, ne le consomme pas)
POST /api/orders/:reference/pay
GET  /api/orders/track/:reference?phone=
POST /api/webhooks/payment

GET  /sitemap.xml                  (hors /api — emplacement imposé par Google)
GET  /robots.txt
```

Cliente connectée (`Authorization: Bearer …`) :

```
POST   /api/auth/register · /login
GET    /api/auth/me            PATCH /api/auth/me
POST   /api/auth/me/password
POST   /api/auth/me/addresses  DELETE /api/auth/me/addresses/:id
GET    /api/orders/mine
```

Administration :

```
POST   /api/admin/login
GET    /api/admin/stats
GET    /api/admin/products     POST /api/admin/products
GET    /api/admin/products/:id PUT  /api/admin/products/:id  DELETE …
PATCH  /api/admin/products/variants/:id/stock
GET    /api/admin/orders       GET  /api/admin/orders/:id
PATCH  /api/admin/orders/:id/status  · /payment
GET    /api/admin/customers · /categories · /reviews
GET    /api/admin/orders/export.csv?statut=&depuis=
GET    /api/admin/promos       POST /api/admin/promos
PATCH  /api/admin/promos/:id   DELETE /api/admin/promos/:id
```

---

## 9. Mise en ligne

**Backend (Railway)** — la marche à suivre complète est dans
[`DEPLOIEMENT-RAILWAY.md`](DEPLOIEMENT-RAILWAY.md). En résumé : *Root Directory*
sur `backend`, un service PostgreSQL ajouté au projet, puis
`DATABASE_URL=${{Postgres.DATABASE_URL}}` et `PGSSL=disable`.

Le `startCommand` applique les migrations à chaque démarrage (idempotent).
`npm run seed` se lance **une seule fois**, à la main, depuis le shell Railway :
il réécrit le mot de passe administrateur et ne doit donc pas être automatisé.

**Frontend (Vercel)** — variable d'environnement :

```
VITE_API_URL=https://VOTRE-DOMAINE.up.railway.app/api
```

Aucune adresse d'API n'est écrite en dur dans le code : sans cette variable, la
boutique affiche une erreur explicite en console plutôt que d'appeler
silencieusement un serveur qui n'existe plus.

Deux valeurs restent à modifier à la main dans `frontend/vercel.json` (les
réécritures de `/sitemap.xml` et `/robots.txt`), Vercel n'acceptant pas de
variable d'environnement à cet endroit.

Pensez à renseigner `CORS_ORIGINS` avec l'adresse exacte du site en production,
sinon l'API reste ouverte à tous les domaines.

> **Attention au nom de la variable de session.** L'ancienne documentation cite
> `SUPABASE_JWT_SECRET` ; le code v2 lit **`JWT_SECRET`**. Avec le mauvais nom,
> le serveur s'arrête au démarrage et redémarre en boucle.

---

## 10. Ce qui n'est pas encore fait

Honnêtement, pour que vous sachiez où vous en êtes :

- **Les photos sont stockées en base** (data URL). C'est simple et sans service
  externe, mais lourd au-delà de quelques centaines de produits. Le jour venu :
  Supabase Storage ou Cloudinary.
- **Pas d'email transactionnel.** Les confirmations passent par WhatsApp. Ajouter
  Resend ou Brevo est une demi-journée de travail.
- **Pas de programme de fidélité** (les codes promo, eux, sont en place).
- **Un seul compte administrateur** (la table en accepte plusieurs, il n'y a pas
  encore d'écran pour les gérer).
- **Les produits importés n'ont qu'une photo chacun** — celle de l'ancien site.
  Les photos supplémentaires s'ajoutent depuis le back-office ; la visionneuse
  plein écran et les vignettes n'ont alors tout leur intérêt.
- **Les avis de l'accueil viennent de la base.** Tant qu'aucun avis n'est validé
  dans le back-office, la section ne s'affiche pas — c'est voulu.
- **Le guide des tailles utilise des mesures standard**, à ajuster dans
  `src/components/SizeGuide.jsx` si vos fournisseurs taillent différemment.
