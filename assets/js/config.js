// Supabase Configuration
const SUPABASE_URL = 'https://jshsryngogxsmdhwzije.supabase.co'; //
const SUPABASE_ANON_KEY = 'sb_publishable_G6Q2fWrkczI4ndzG1mXDyw_ma6pNowr'; //

// On utilise un nom différent pour la constante (ex: supabaseClient) 
// pour éviter le conflit avec l'objet global 'supabase' de la bibliothèque.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export pour l'utiliser dans vos autres fichiers via window.supabase
window.supabase = supabaseClient;