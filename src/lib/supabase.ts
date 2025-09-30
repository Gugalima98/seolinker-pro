import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Client Init: URL:', supabaseUrl ? 'Loaded' : 'NOT LOADED', 'Anon Key:', supabaseAnonKey ? 'Loaded' : 'NOT LOADED'); // NOVO LOG

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase Client created:', supabase ? 'YES' : 'NO'); // NOVO LOG