# 👑 Mojo Molado - Boutique de Mode Africaine & Accessoires

Bienvenue dans le dépôt de **Mojo Molado**, une boutique en ligne haut de gamme dédiée à la mode africaine contemporaine, aux sacs de créateurs, aux sandales et aux parfums d'exception. 

Cette plateforme moderne combine un design luxueux côté utilisateur et un panneau d'administration puissant et sécurisé pour gérer les ventes et le catalogue.

---

## 🚀 Fonctionnalités Clés

### Côté Client (Frontend)
* **Design Luxueux & Immersif** : Esthétique premium avec typographie élégante (*Outfit* et *Playfair Display*), basculement dynamique du thème sombre/clair, et animations fluides.
* **Bannière Héro & Grille d'Avantages** : Section d'accueil haut de gamme et mise en avant des services phares (Livraison Express, Qualité Premium, Commande WhatsApp).
* **Catalogue Dynamique** : Recherche textuelle instantanée, filtrage par catégorie (Vêtements, Sandales, Sacs, Parfums) et tri par prix.
* **Panier & Liste de Souhaits (Wishlist)** : Expérience d'achat fluide avec mise à jour en temps réel des articles.
* **Intégration WhatsApp & Passerelles de Paiement** :
  * Commande directe par message WhatsApp pré-rempli.
  * Paiement en ligne via **NabooPay** (Wave, Orange Money) avec redirection et traitement des statuts.
  * Achat express Wave en mode simulation.
* **Avis Clients** : Espace interactif pour laisser et consulter les avis de la communauté.

### Espace Administration (Gestion Privée)
* **Tableau de Bord des Ventes** : Graphique d'activité interactif (via *Recharts*) et historique des transactions avec suivi automatique des statuts de paiement (NabooPay webhook).
* **Gestion du Catalogue** :
  * Ajout de nouveaux produits avec upload d'images.
  * Modification inline du **nom du produit** (via bouton crayon `✏️`).
  * Modification rapide de la **catégorie** (via liste déroulante instantanée).
  * Modification rapide du **prix** de vente.
  * Suppression de produits.
* **Gestion des Accès** : Possibilité de créer de nouveaux comptes administrateurs de confiance.

---

## 🛠️ Stack Technique

* **Frontend** : React.js, Vite, React Router DOM, Recharts, CSS3 (variables de thèmes, animations).
* **Backend** : Node.js, Express, JWT (JSON Web Tokens), Bcryptjs, Helmet & Rate-Limiter (sécurisation des requêtes).
* **Base de données** : PostgreSQL (`pg` pool).

---

## ⚙️ Configuration & Installation

### 1. Prérequis
Vous devez disposer de **Node.js** (v16+) et d'une instance **PostgreSQL** active (locale ou hébergée en ligne comme Render, Neon ou Supabase).

### 2. Configuration du Backend
1. Rendez-vous dans le dossier `backend/`.
2. Créez ou modifiez le fichier `.env` et configurez vos variables d'environnement :
   ```env
   # Port d'écoute du serveur
   PORT=5000

   # Chaîne de connexion PostgreSQL (Exemple local)
   DATABASE_URL=postgres://postgres:motdepasse@localhost:5432/mojomalado

   # Clé secrète de chiffrement des tokens de session admin
   SUPABASE_JWT_SECRET=votre_cle_secrete_jwt

   # Clés API de Paiement (NabooPay, Wave...)
   NABOO_API_KEY=votre_cle_api_naboopay
   WAVE_API_KEY=votre_cle_api_wave
   ```

3. Installez les dépendances et démarrez le serveur :
   ```bash
   npm install
   npm start
   ```
   *Note : Le backend détecte automatiquement si la base de données `mojomalado` et les tables associées existent. Si elles sont absentes, il les crée et injecte automatiquement les 26 produits initiaux ainsi que le compte administrateur par défaut :*
   * **Email** : `habib@gmail.com`
   * **Mot de passe** : `habib123`

### 3. Configuration du Frontend
1. Rendez-vous dans le dossier `frontend/`.
2. Installez les dépendances et démarrez le serveur de développement :
   ```bash
   npm install
   npm run dev
   ```
3. Le site web est désormais accessible sur **`http://localhost:5173/`**.

---

## 🔒 Accès aux URL Administrateur

* **Page de connexion secrète** : `http://localhost:5173/secret-mojo-gate` (ou `https://mojo-malado.vercel.app/secret-mojo-gate` en production)
* **Tableau de bord protégé** : `http://localhost:5173/gestion-mojo-privee` (ou `https://mojo-malado.vercel.app/gestion-mojo-privee` en production)

---

## 🌐 Déploiement

* **Frontend** : Déployé sur **Vercel**. Les commits sur la branche `main` déclenchent un déploiement automatique.
* **Backend** : Déployé sur **Render**. Pensez à configurer la variable d'environnement `DATABASE_URL` dans l'onglet *Environment* de votre Web Service sur Render.
* **Base de données** : PostgreSQL hébergé en ligne (par exemple sur Render Database).
