import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert to medicines table...');
  const { data, error } = await supabase.from('medicines').insert([
    {
      name: 'Test Med',
      dosage: '1',
      schedule_time: '10:00',
      start_date: '2025-01-01',
      end_date: '2025-01-02',
      patient_id: '00000000-0000-0000-0000-000000000000'
    }
  ]);

  if (error) {
    console.log('Insert Failed with Error Object:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('Insert Successful:', data);
  }
}

testInsert();
