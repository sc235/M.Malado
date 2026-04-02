const { createClient } = require('@supabase/supabase-js');

// Using the credentials I found in the project
const supabaseUrl = 'https://jshsryngogxsmdhwzije.supabase.co';
const supabaseKey = 'sb_publishable_G6Q2fWrkczI4ndzG1mXDyw_ma6pNowr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  try {
    const { data, error } = await supabase.from('products').select('id, name');
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      console.log('Products found in Supabase:', data ? data.length : 0);
      if (data && data.length > 0) {
        console.log('Sample products:', data.slice(0, 3));
      } else {
        console.log('WARNING: The products table is EMPTY.');
      }
    }
  } catch (err) {
    console.error('Execution error:', err.message);
  }
}

checkProducts();
