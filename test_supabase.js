const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jshsryngogxsmdhwzije.supabase.co';
const supabaseKey = 'sb_publishable_G6Q2fWrkczI4ndzG1mXDyw_ma6pNowr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  const { data, error } = await supabase.from('products').select('id, name');
  if (error) {
    console.error('Error fetching products:', error);
  } else {
    console.log('Products found:', data.length);
    console.log('Sample:', data.slice(0, 3));
  }
}

checkProducts();
