import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  const { data, error } = await supabase.from('medicines').select('id, name').limit(1);
  console.log('Test Med:', data);
  if (data && data.length > 0) {
     const { error: delError } = await supabase.from('medicines').delete().eq('id', data[0].id);
     console.log('Delete error?', delError);
  }
}
checkRLS();
