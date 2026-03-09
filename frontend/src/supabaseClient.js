import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jshsryngogxsmdhwzije.supabase.co';
const supabaseKey = 'sb_publishable_G6Q2fWrkczI4ndzG1mXDyw_ma6pNowr';

export const supabase = createClient(supabaseUrl, supabaseKey);
