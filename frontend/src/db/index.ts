import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';


const connectionUrl = process.env.DATABASE_URL || 'postgresql://postgres.hrwgpdifxzszcgdzhunr:ILovemynepaL%40123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';
const connectionString = connectionUrl.replace('?sslmode=require', '');
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
