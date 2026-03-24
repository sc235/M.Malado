require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://jshsryngogxsmdhwzije.supabase.co";
const supabaseKey = "sb_publishable_G6Q2fWrkczI4nd";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase credentials in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
