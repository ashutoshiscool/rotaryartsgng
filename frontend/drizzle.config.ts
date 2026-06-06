import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: (process.env.DATABASE_URL || 'postgresql://postgres.hrwgpdifxzszcgdzhunr:ILovemynepaL%40123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres') + '?sslmode=require'
  }
});
