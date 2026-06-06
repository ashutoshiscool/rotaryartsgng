import fs from 'fs';
import path from 'path';
import { db } from './src/db/index';
import { documents } from './src/db/schema';
import { supabase } from './src/utils/supabase';

const LEGACY_UPLOADS_DIR = '/home/admin/dati/dash-v2/backend/uploads';

async function main() {
    if (!fs.existsSync(LEGACY_UPLOADS_DIR)) {
        console.error(`Directory not found: ${LEGACY_UPLOADS_DIR}`);
        return;
    }

    const files = fs.readdirSync(LEGACY_UPLOADS_DIR).filter(f => f.endsWith('.pdf'));
    console.log(`Found ${files.length} PDFs to insert into the database.`);

    for (const file of files) {
        // Get the public URL
        const { data: publicUrlData } = supabase.storage.from('rotaryarts').getPublicUrl(file);
        const url = publicUrlData.publicUrl;

        console.log(`Inserting document: ${file}`);
        try {
            await db.insert(documents).values({
                name: file,
                type: 'pdf',
                url: url,
                category: 'General',
                tags: []
            });
            console.log(`[SUCCESS] Inserted document ${file}`);
        } catch (err) {
            console.error(`[ERROR] Failed to insert document ${file}:`, err);
        }
    }
    console.log('Document insertion complete.');
    process.exit(0);
}

main().catch(console.error);
