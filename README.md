# 👑 Mojo Malado - L'Élégance Africaine Contemporaine

Bienvenue dans le dépôt officiel de **Mojo Malado**, une plateforme e-commerce premium dédiée à la mode africaine, aux sacs de créateurs, aux sandales et aux parfums d'exception. 

Conçue pour offrir une expérience utilisateur luxueuse, cette plateforme allie une vitrine immersive côté client à un puissant système d'administration (ERP/CRM) invisible, permettant une gestion fluide du catalogue, des commandes et des clients.

---

## ✨ Fonctionnalités Principales

### 🛍️ Vitrine Client (Frontend)
- **Expérience Premium & UI Immersive :** Un design raffiné avec basculement fluide entre le thème sombre et clair, animations subtiles et typographie soignée (Outfit & Playfair Display).
- **Parcours d'Achat Optimisé :** Catalogue dynamique avec recherche instantanée, filtrage par catégories, panier persistant et système de favoris (Wishlist).
- **Paiements Flexibles & Locaux :** 
  - Intégration transparente pour payer via **Wave**, **Orange Money** et **Cartes Bancaires**.
  - Possibilité de finaliser sa commande directement sur **WhatsApp** via des messages automatisés.
- **Transparence & Confiance :** Suivi des commandes en temps réel et système d'avis vérifiés.

### 🛡️ Espace Administration (Gestion Privée)
- **Interface Cloisonnée :** Un tableau de bord privé, accessible de manière sécurisée (protégé par JWT), invisible pour les visiteurs classiques. L'accès est simplifié via un lien discret dans le footer pour le personnel autorisé.
- **Dashboard Analytique :** Suivi en temps réel des performances des ventes grâce à des graphiques dynamiques (*Recharts*).
- **Gestion Avancée du Catalogue :** Ajout, modification inline des stocks, prix, et descriptions. Upload et gestion optimisée des images produits.
- **Suivi des Commandes :** Historique complet des transactions, gestion des statuts de livraison, et traçabilité des paiements via webhooks.

---

## 🛠️ Stack Technologique (Moderne & Performante)

- **Frontend :** [React.js](https://reactjs.org/) propulsé par [Vite](https://vitejs.dev/) pour une vélocité maximale. Routage via React Router, gestion de l'état avancée.
- **Backend :** [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/), architecture robuste avec middlewares de sécurité (Helmet, Rate-Limiter).
- **Base de Données :** [PostgreSQL](https://www.postgresql.org/), robuste et relationnel, interfacé via `pg`.
- **Authentification :** JSON Web Tokens (JWT) et hachage sécurisé (Bcryptjs).

---

## 🚀 Installation & Lancement (Local)

### 1. Prérequis
- **Node.js** (v18+)
- **PostgreSQL** installé et configuré localement.

### 2. Démarrage de l'API (Backend)
```bash
cd backend
# 1. Configurer l'environnement : dupliquez .env.example vers .env
cp .env.example .env

# 2. Renseignez la variable DATABASE_URL dans votre fichier .env 
# (ex: postgresql://postgres:motdepasse@localhost:5432/mojomalado)

# 3. Installer les dépendances
npm install

# 4. Initialiser la base (création des tables, produits et compte admin)
npm run setup

# 5. Lancer le serveur (Port 5000)
npm run dev
```

### 3. Démarrage de la Boutique (Frontend)
```bash
cd frontend
# 1. Installer les dépendances
npm install

# 2. Lancer l'interface web (Port 5173 par défaut)
npm run dev
```
La plateforme est maintenant accessible sur **[http://localhost:5173](http://localhost:5173)**.

---

## 🔐 Accès à l'Espace Administrateur

Lors de l'étape `npm run setup`, un compte administrateur est créé en fonction des variables `ADMIN_EMAIL` et `ADMIN_PASSWORD` définies dans votre `.env`.

* **Connexion :** Cliquez sur le lien "Administration" dans le pied de page du site ou rendez-vous sur `/secret-mojo-gate`.
* **Identifiants par défaut :** Ce sont ceux que vous avez configurés dans votre fichier `.env` (`ADMIN_EMAIL` et `ADMIN_PASSWORD`).

Une fois connecté, une icône **⚙️ (Paramètres)** apparaît dans la barre de navigation du site principal pour basculer facilement vers le tableau de bord privé (`/gestion-mojo-privee`).

---

## 🌐 Déploiement

Le projet est conçu pour être facilement déployé sur les plateformes cloud modernes :
- **Frontend :** Déploiement optimal "Zéro-Config" sur **Vercel** ou Netlify.
- **Backend & Base de données :** Déploiement automatique recommandé sur **Railway** (fichier `railway.json` inclus) ou **Render**.
