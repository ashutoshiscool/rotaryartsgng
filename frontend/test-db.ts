import { db } from './src/db/index';
import { users } from './src/db/schema';

async function run() {
  try {
    const res = await db.select().from(users).limit(1);
    console.log("Success:", res.length);
  } catch (e: any) {
    console.error("Error message:", e.message);
    console.error("Error cause:", e.cause);
    console.error("Full Error:", e);
  }
  process.exit(0);
}
run();
