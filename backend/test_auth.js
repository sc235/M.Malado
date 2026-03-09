require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jshsryngogxsmdhwzije.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_G6Q2fWrkczI4ndzG1mXDyw_ma6pNowr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseAuth() {
  console.log("=== VÉRIFICATION DE LA CONNEXION SUPABASE ===\n");
  
  try {
    console.log("1. Test de la connexion à la base de données (lecture des produits)...");
    const { data: products, error: dbError } = await supabase.from('products').select('id, name').limit(1);
    
    if (dbError) {
      console.log("❌ ÉCHEC : Erreur de connexion à la base de données.");
      console.error(dbError);
    } else {
      console.log("✅ SUCCÈS : Connexion à la base de données OK. (Produits trouvés : " + products.length + ")\n");
    }

    console.log("2. Test du module d'Authentification Supabase...");
    // We attempt a generic auth check to verify the auth endpoints are reachable and configured.
    // Creating a fake user just to see if the API responds correctly (it should return an error like "Email exists" or "Password too short" or success).
    const testEmail = `test_${Date.now()}@mojomolado.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'password123456!'
    });

    if (authError) {
       console.log("❌ ERREUR LORS DU TEST D'INSCRIPTION :", authError.message);
    } else {
       console.log(`✅ SUCCÈS : Le service d'authentification fonctionne parfaitement. L'utilisateur test (${testEmail}) a pu s'inscrire.`);
       console.log("   Session générée :", authData.session ? "Oui (Connecté)" : "Non (Doit confirmer son email selon vos réglages Supabase)");
    }

  } catch (err) {
    console.error("Erreur générale :", err);
  }
}

testSupabaseAuth();
