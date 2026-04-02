const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Ignore the placeholder string if it wasn't replaced
if (!supabaseKey || supabaseKey.includes('Collez_votre')) {
  supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ CRITICAL: Missing Supabase credentials in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
