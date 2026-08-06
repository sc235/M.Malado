# 🚀 Guide de Déploiement - Mojo Molado

## 📋 Préparation

Votre site est prêt pour le déploiement ! Voici les fichiers à déployer :

```
modjo_market/
├── index.html          # Page principale
├── assets/
│   ├── css/
│   │   └── main.css    # Styles
│   └── js/
│       └── app.js      # Logique JavaScript
├── data/
│   └── products.json   # Données produits
├── images/             # Images des produits
└── README.md
```

## 🌐 Options de Déploiement Gratuites

### 1. **Netlify** (Recommandé) ⭐
- **URL** : https://netlify.com
- **Avantages** : Simple, rapide, HTTPS automatique
- **Étapes** :
  1. Créer un compte sur Netlify
  2. Glisser-déposer le dossier `modjo_market` sur la page
  3. Votre site sera en ligne en quelques secondes !

### 2. **Vercel**
- **URL** : https://vercel.com
- **Avantages** : Excellent pour les sites statiques
- **Étapes** :
  1. Créer un compte Vercel
  2. Importer le projet
  3. Déployer automatiquement

### 3. **GitHub Pages**
- **URL** : https://pages.github.com
- **Avantages** : Intégration Git, gratuit
- **Étapes** :
  1. Créer un repository GitHub
  2. Uploader les fichiers
  3. Activer GitHub Pages dans les settings

### 4. **Firebase Hosting**
- **URL** : https://firebase.google.com
- **Avantages** : Google, très fiable
- **Étapes** :
  1. Créer un projet Firebase
  2. Installer Firebase CLI
  3. Déployer avec `firebase deploy`

## 🎯 Déploiement Rapide avec Netlify

### Méthode 1 : Drag & Drop
1. Aller sur https://netlify.com
2. S'inscrire (gratuit)
3. Glisser le dossier `modjo_market` sur la zone de déploiement
4. Attendre quelques secondes
5. Votre site est en ligne ! 🎉

### Méthode 2 : Netlify Drop
1. Aller sur https://app.netlify.com/drop
2. Glisser le dossier directement
3. Obtenir l'URL instantanément

## 🔧 Optimisations Avant Déploiement

### 1. Vérifier les Chemins
- ✅ Tous les chemins sont relatifs
- ✅ Images dans le dossier `images/`
- ✅ CSS et JS dans `assets/`

### 2. Tester Localement
```bash
# Ouvrir index.html dans le navigateur
# Ou utiliser un serveur local :
python -m http.server 8000
# Puis aller sur http://localhost:8000
```

### 3. Optimiser les Images
- Compresser les images si nécessaire
- Formats : JPG pour photos, PNG pour transparence

## 📱 Configuration du Domaine

### Domaine Personnalisé (Optionnel)
1. Acheter un domaine (ex: mojomolado.com)
2. Configurer les DNS dans Netlify
3. Activer HTTPS automatique

### Sous-domaine Netlify
- Votre site aura une URL comme : `amazing-name-123456.netlify.app`
- Vous pouvez la personnaliser dans les settings

## 🚀 Commandes Utiles

### Test Local
```bash
# Dans le dossier du projet
python -m http.server 8000
# Ou
npx serve .
```

### Vérification
- [ ] Site s'ouvre correctement
- [ ] Images se chargent
- [ ] Panier fonctionne
- [ ] Mode sombre/clair fonctionne
- [ ] Responsive sur mobile

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifier la console du navigateur (F12)
2. S'assurer que tous les fichiers sont uploadés
3. Vérifier les chemins des images

## 🎉 Félicitations !

Une fois déployé, votre site Mojo Molado sera accessible 24h/24, 7j/7 !

**URL de votre site** : `https://votre-nom.netlify.app`
