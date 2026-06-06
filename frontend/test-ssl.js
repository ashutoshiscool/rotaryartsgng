const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.hrwgpdifxzszcgdzhunr:ILovemynepaL%40123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT 1').then(() => {
  console.log("SUCCESS");
  process.exit(0);
}).catch(e => {
  console.log("FAILED WITH:", e.message);
  process.exit(1);
});
