import { supabase } from "./supabase";

// Mencatat aktivitas untuk ditampilkan di dashboard. Gagal mencatat tidak boleh mengganggu aksi utama.
export async function logActivity(type, message) {
  try {
    await supabase.from("activities").insert({ type, message });
  } catch (e) {
    // diabaikan
  }
}
