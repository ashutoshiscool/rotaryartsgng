import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabaseUrl = process.env.ROTARY_SUPABASE_URL || 'https://hrwgpdifxzszcgdzhunr.supabase.co';
const supabaseKey = process.env.ROTARY_SUPABASE_ANON_KEY || 'sb_publishable_lSAJ_ZBzDk5RkTXKc8zt1Q_gra0FGpA';

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: SUPABASE_URL and SUPABASE_ANON_KEY must be provided in the environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

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
