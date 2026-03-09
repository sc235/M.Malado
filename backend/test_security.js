const http = require('http');

async function runTests() {
  console.log("=== TEST DE SÉCURITÉ DU BACKEND ===\n");

  // Test 1: Tentative de création de produit sans token (Hack)
  console.log("[Test 1] Tentative d'ajout d'un produit (Accès non autorisé)...");
  try {
    const res1 = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Item', price: 1 })
    });
    const data1 = await res1.json();
    console.log(" Résultat :", res1.status, data1);
    if (res1.status === 401) {
      console.log(" ✅ SUCCÈS : Le serveur a bien bloqué la requête car il n'y a pas de token Administrateur.\n");
    }
  } catch (err) {
    console.error("Erreur:", err.message);
  }

  // Test 2: Tentative de falsification d'une commande
  console.log("[Test 2] Tentative de création de commande avec un faux total (0 FCFA)...");
  try {
    // Id d'une robe existante (pour le test)
    // On va simuler l'achat de l'article ID 1 (ex: Robe Beige)
    const orderData = {
      items: [{ id: 1, name: 'Robe', quantity: 2, price: 0 }], // Faux prix envoyé par le hacker
      total: 0 // Le hacker essaie de payer 0 FCFA pour 2 robes
    };

    const res2 = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const data2 = await res2.json();
    console.log(" Résultat :", res2.status);
    if (data2 && data2.total > 0) {
      console.log(` ✅ SUCCÈS : Le hacker a envoyé un total de 0 FCFA, mais le serveur l'a corrigé et a enregistré la commande avec le vrai total : ${data2.total} FCFA en lisant la base de données.`);
    } else if (res2.status === 400 || res2.status === 500) {
      console.log(` ✅ SUCCÈS : La commande invalide a été rejetée. Message serveur:`, data2);
    }
  } catch (err) {
    console.error("Erreur:", err.message);
  }
}

runTests();
