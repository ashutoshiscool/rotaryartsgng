import fs from 'fs';
import WebSocket from 'ws';
Object.assign(global, { WebSocket });
import path from 'path';
import { uploadToSupabase, supabase } from './src/utils/supabase';

const LEGACY_UPLOADS_DIR = '/home/admin/dati/dash-v2/backend/uploads';

async function main() {
    if (!fs.existsSync(LEGACY_UPLOADS_DIR)) {
        console.error(`Directory not found: ${LEGACY_UPLOADS_DIR}`);
        return;
    }

    const files = fs.readdirSync(LEGACY_UPLOADS_DIR);
    console.log(`Found ${files.length} items in ${LEGACY_UPLOADS_DIR}`);

    console.log(`Ensuring bucket 'rotaryarts' exists...`);
    try {
        await supabase.storage.createBucket('rotaryarts', { public: true });
        console.log("Created bucket 'rotaryarts'");
    } catch (err: any) {
        if (!err.message?.includes('already exists')) {
            console.warn("Could not create bucket (maybe it exists?):", err.message);
        }
    }

    const { data: buckets } = await supabase.storage.listBuckets();
    console.log("Existing buckets:", buckets?.map(b => b.name));

    await new Promise(r => setTimeout(r, 2000));

    for (const file of files) {
        const filePath = path.join(LEGACY_UPLOADS_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
            console.log(`Uploading ${file}...`);
            const buffer = fs.readFileSync(filePath);
            const ext = path.extname(file).toLowerCase();
            let mimeType = 'application/octet-stream';
            
            if (ext === '.pdf') mimeType = 'application/pdf';
            if (ext === '.png') mimeType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            
            try {
                const { data, error } = await supabase.storage.from('rotaryarts').upload(file, buffer, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: true
                });
                if (error) {
                    console.error(`[ERROR] Supabase Error uploading ${file}:`, error);
                } else {
                    const { data: publicUrlData } = supabase.storage.from('rotaryarts').getPublicUrl(file);
                    console.log(`[SUCCESS] ${file} -> ${publicUrlData.publicUrl}`);
                }
            } catch (err) {
                console.error(`[ERROR] Exception uploading ${file}:`, err);
            }
        }
    }
}

main();
