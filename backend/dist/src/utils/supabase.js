"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.uploadToSupabase = uploadToSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.warn("WARNING: SUPABASE_URL and SUPABASE_ANON_KEY must be provided in the environment variables.");
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function uploadToSupabase(buffer, originalName, mimeType, bucket = 'rotaryarts') {
    if (!buffer || buffer.length === 0)
        return null;
    const ext = path_1.default.extname(originalName) || '.png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${ext}`;
    const { data, error } = await exports.supabase.storage
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
    const { data: publicUrlData } = exports.supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}
