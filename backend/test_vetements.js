require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 1. On donne l'URL et la clé publique de notre projet Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://jshsryngogxsmdhwzije.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_G6Q2fWrkczI4ndzG1mXDyw_ma6pNowr';

// 2. On crée le "client" (la connexion)
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchClothes() {
  console.log("⏳ Appel Supabase en cours...");
  console.log("Demande : Récupérer tous les produits où la catégorie est 'Vêtements'\n");

  try {
    // 3. On utilise la connexion pour faire notre requête
    // .from('products') -> "Va dans la table 'products'"
    // .select('name, price') -> "Je ne veux que le nom et le prix"
    // .eq('category', 'Vêtements') -> "Où 'category' est EQual (égal) à 'Vêtements'"
    
    const { data, error } = await supabase
      .from('products')
      .select('name, price, category')
      .eq('category', 'Vêtements');

    if (error) {
      console.error("❌ Erreur lors de la récupération:", error.message);
      return;
    }

    // 4. On affiche le résultat
    console.log(`✅ Succès ! ${data.length} vêtement(s) trouvé(s) :`);
    console.table(data);

  } catch (err) {
    console.error("Erreur serveur:", err);
  }
}

fetchClothes();
