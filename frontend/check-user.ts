import { db } from './src/db/index';
import { users } from './src/db/schema';
async function run() {
  const allUsers = await db.select().from(users);
  console.log("Users:", allUsers);
  process.exit(0);
}
run();
