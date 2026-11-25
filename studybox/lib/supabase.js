import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anon);

// Placeholder dipakai agar build tidak error saat .env belum diisi.
export const supabase = createClient(
  url || "http://localhost:54321",
  anon || "public-anon-key-placeholder"
);

export const BUCKET = "pdfs";
export const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25 MB
