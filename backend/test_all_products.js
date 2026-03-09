require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jshsryngogxsmdhwzije.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_G6Q2fWrkczI4ndzG1mXDyw_ma6pNowr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllProducts() {
  console.log("=== VÉRIFICATION DU CATALOGUE COMPLET ===\n");

  try {
    // We remove the .eq() filter this time to get EVERYTHING
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('name, category');

    if (error) {
      console.error("❌ Erreur:", error.message);
      return;
    }

    console.log(`✅ Nombre TOTAL de produits dans la base de données : ${allProducts.length}`);
    
    // Let's count how many we have per category
    const categoriesCount = allProducts.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});

    console.log("\nRépartition par catégorie :");
    console.table(categoriesCount);

    if (allProducts.length < 54) {
      console.log(`\n⚠️ Il manque des produits. Vous avez ${allProducts.length} produits enregistrés, mais vous en attendez 54.`);
      console.log("Cela signifie que le script d'importation (seed) n'a pas tout importé ou s'est arrêté en cours de route.");
    }

  } catch (err) {
    console.error("Erreur générale :", err);
  }
}

checkAllProducts();
