import { db } from './index';
import { documents } from './schema';

async function seedDocs() {
  await db.insert(documents).values([
    {
      name: 'Technical Rider 2024.pdf',
      category: 'Technical',
      eventId: null,
      entityType: 'general',
      entityId: null,
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      name: 'Hospitality Requirements.pdf',
      category: 'Hospitality',
      eventId: null,
      entityType: 'general',
      entityId: null,
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }
  ]);
  console.log('Documents seeded');
  process.exit(0);
}
seedDocs();
