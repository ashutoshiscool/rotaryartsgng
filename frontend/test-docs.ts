import { db } from './src/db/index';
import { documents } from './src/db/schema';
async function run() {
  const docs = await db.select().from(documents);
  console.log("Documents count:", docs.length);
  process.exit(0);
}
run();
