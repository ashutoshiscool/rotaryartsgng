import { db } from './src/db/index';
import { users } from './src/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    const res = await db.select().from(users).limit(1);
    console.log("Success:", res);
  } catch (e) {
    console.error("Error cause:", e.cause);
    console.error("Error full:", e);
  }
  process.exit(0);
}
run();
