@echo off
echo 🚀 Préparation du déploiement Mojo Molado...
echo.

echo 📁 Vérification des fichiers...
if not exist "index.html" (
    echo ❌ Erreur: index.html manquant
    pause
    exit /b 1
)

if not exist "assets\css\main.css" (
    echo ❌ Erreur: assets\css\main.css manquant
    pause
    exit /b 1
)

if not exist "assets\js\app.js" (
    echo ❌ Erreur: assets\js\app.js manquant
    pause
    exit /b 1
)

if not exist "data\products.json" (
    echo ❌ Erreur: data\products.json manquant
    pause
    exit /b 1
)

echo ✅ Tous les fichiers sont présents !
echo.

echo 🌐 Options de déploiement :
echo.
echo 1. Netlify (Recommandé) - https://netlify.com
echo 2. Vercel - https://vercel.com  
echo 3. GitHub Pages - https://pages.github.com
echo 4. Firebase Hosting - https://firebase.google.com
echo.

echo 📋 Instructions rapides pour Netlify :
echo 1. Aller sur https://netlify.com
echo 2. Créer un compte gratuit
echo 3. Glisser-déposer ce dossier sur la page
echo 4. Votre site sera en ligne !
echo.

echo 🧪 Test local (optionnel) :
echo python -m http.server 8000
echo Puis ouvrir http://localhost:8000
echo.

echo 📖 Guide complet dans DEPLOYMENT.md
echo.

pause
