import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.storage.createBucket('rotaryarts', { public: true });
  if (error) {
    console.error("Error creating bucket (may already exist):", error.message);
  } else {
    console.log("Bucket created!");
  }
  
  // Try uploading a test file
  const { data: uploadData, error: uploadError } = await supabase.storage.from('rotaryarts').upload('test-doc.txt', 'This is a test document', { contentType: 'text/plain' });
  if (uploadError) {
    console.error("Upload error:", uploadError.message);
  } else {
    console.log("Upload success:", uploadData);
  }
  process.exit(0);
}
run();
