import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: SUPABASE_URL and SUPABASE_ANON_KEY must be provided in the environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadToSupabase(buffer: Buffer, originalName: string, mimeType: string, bucket: string = 'rotaryarts'): Promise<string | null> {
    if (!buffer || buffer.length === 0) return null;
    
    const ext = path.extname(originalName) || '.png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${ext}`;
    
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error("Supabase storage upload error:", error);
        return null;
    }

    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}
