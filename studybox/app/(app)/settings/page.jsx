"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, HardDrive, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import { Button, PageHeader } from "@/components/ui";
import { displayName, formatBytes, formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (user) setName(user.user_metadata?.full_name || "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("files")
      .select("size")
      .then(({ data }) => {
        const total = (data || []).reduce((sum, f) => sum + Number(f.size || 0), 0);
        setUsage({ total, count: data?.length || 0 });
      });
  }, [user]);

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSavingName(false);
    if (error) return toast("Gagal menyimpan nama: " + error.message, "error");
    toast("Profil diperbarui.", "success");
  }

  async function savePassword(e) {
    e.preventDefault();
    if (password.length < 6) return toast("Password minimal 6 karakter.", "error");
    if (password !== confirm) return toast("Konfirmasi password tidak sama.", "error");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPw(false);
    if (error) return toast("Gagal mengganti password: " + error.message, "error");
    setPassword("");
    setConfirm("");
    toast("Password berhasil diganti.", "success");
  }

  async function logout() {
    await supabase.auth.signOut();
    toast("Kamu sudah keluar.", "info");
    router.replace("/login");
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Kelola profil, keamanan, dan akunmu." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profil */}
        <section className="glass rounded-[32px] p-6 sm:p-7">
          <div className="flex items-center gap-4">
            <Avatar name={displayName(user)} size={64} />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold">{displayName(user)}</h2>
              <p className="flex items-center gap-1.5 truncate text-sm text-ink/55">
                <Mail className="h-3.5 w-3.5" /> {user?.email}
              </p>
            </div>
          </div>
          <form onSubmit={saveName} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="display-name">Nama tampilan</label>
              <input
                id="display-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama panggilanmu"
              />
            </div>
            <Button type="submit" loading={savingName}>
              Simpan profil
            </Button>
          </form>
          {user?.created_at && (
            <p className="mt-5 text-xs text-ink/40">Bergabung sejak {formatDate(user.created_at)}</p>
          )}
        </section>

        {/* Penyimpanan */}
        <section className="glass rounded-[32px] p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender-200 text-brand-700">
              <HardDrive className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-extrabold">Penyimpanan</h2>
          </div>
          {usage === null ? (
            <div className="skeleton mt-6 h-16" />
          ) : (
            <div className="mt-6">
              <p className="text-4xl font-extrabold tracking-tight">{formatBytes(usage.total)}</p>
              <p className="mt-1 text-sm text-ink/55">dipakai oleh {usage.count} file PDF</p>
            </div>
          )}
        </section>

        {/* Password */}
        <section className="glass rounded-[32px] p-6 sm:p-7">
          <h2 className="text-xl font-extrabold">Ganti password</h2>
          <form onSubmit={savePassword} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="new-pw">Password baru</label>
              <input
                id="new-pw"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div>
              <label className="label" htmlFor="confirm-pw">Ulangi password</label>
              <input
                id="confirm-pw"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" loading={savingPw}>
              Perbarui password
            </Button>
          </form>
        </section>

        {/* Keluar */}
        <section className="glass flex flex-col justify-between rounded-[32px] p-6 sm:p-7">
          <div>
            <h2 className="text-xl font-extrabold">Keluar dari akun</h2>
            <p className="mt-2 text-sm text-ink/55">
              Kamu bisa masuk kembali kapan saja. Semua data tetap tersimpan aman.
            </p>
          </div>
          <Button variant="danger" icon={LogOut} onClick={logout} className="mt-6 self-start">
            Keluar
          </Button>
        </section>
      </div>
    </div>
  );
}
