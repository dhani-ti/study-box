"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { supabase, isConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

const COPY = {
  login: { title: "Masuk", desc: "Masukkan email dan password untuk mengakses akunmu." },
  register: { title: "Buat Akun", desc: "Isi data diri, lalu verifikasi emailmu dengan kode OTP." },
  forgot: { title: "Lupa Password", desc: "Masukkan email untuk menerima kode reset password." },
  otp: { title: "Masukkan Kode", desc: "Kode 6 digit sudah kami kirim ke emailmu." },
  recoveryOtp: { title: "Reset Password", desc: "Masukkan kode dari email dan password baru." },
};

function translateError(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email atau password salah.";
  if (m.includes("already registered")) return "Email ini sudah terdaftar. Silakan masuk.";
  if (m.includes("password should be")) return "Password minimal 6 karakter.";
  if (m.includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk kamu.";
  if (m.includes("signups not allowed") || m.includes("user not found"))
    return "Email belum terdaftar. Silakan daftar dulu.";
  if (m.includes("token has expired") || m.includes("invalid otp") || m.includes("otp_expired"))
    return "Kode OTP salah atau sudah kadaluarsa. Minta kode baru.";
  if (m.includes("security purposes") || m.includes("rate limit"))
    return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
  return msg || "Terjadi kesalahan. Coba lagi.";
}

const fieldCls =
  "h-12 w-full rounded-full border border-white/70 bg-white/55 pl-12 pr-12 text-sm text-slate-700 placeholder:text-slate-400 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-xl transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15";

function Field({ icon: Icon, children, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className={fieldCls} {...props} />
      {children}
    </div>
  );
}

function SocialRow({ onPick }) {
  const items = [
    { provider: "facebook", label: "Facebook", glyph: "f", color: "#1877f2" },
    { provider: "google", label: "Google", glyph: "G", color: "#4285f4" },
  ];
  return (
    <div className="flex justify-center gap-4">
      {items.map((it) => (
        <button
          key={it.provider}
          type="button"
          aria-label={`Lanjutkan dengan ${it.label}`}
          onClick={() => onPick(it.provider)}
          className="liquid-surface grid h-12 w-12 place-items-center rounded-full text-lg font-bold transition active:scale-95"
          style={{ color: it.color }}
        >
          {it.glyph}
        </button>
      ))}
    </div>
  );
}

export default function AuthForm() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();

  // "login" | "register" | "forgot" | "otp"
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // state OTP (dipakai untuk daftar maupun masuk tanpa password)
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPurpose, setOtpPurpose] = useState("login");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (session && !(mode === "otp" && otpPurpose === "recovery")) router.replace("/dashboard");
  }, [session, mode, otpPurpose, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (mode === "otp") otpInputRef.current?.focus();
  }, [mode]);

  function goTo(next) {
    setMode(next);
    setOtpCode("");
  }

  function goBack() {
    if (mode === "otp") {
      return goTo(
        otpPurpose === "register" ? "register" : otpPurpose === "recovery" ? "forgot" : "login"
      );
    }
    goTo("login");
  }

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast(translateError(error.message), "error");
    toast("Selamat datang kembali!", "success");
    router.replace("/dashboard");
  }

  // Kirim kode OTP. purpose "register" -> buat akun baru bila belum ada;
  // purpose "login" -> hanya untuk akun yang sudah terdaftar.
  async function requestOtp(purpose, target) {
    setBusy(true);
    const { error } =
      purpose === "recovery"
        ? await supabase.auth.resetPasswordForEmail(target)
        : await supabase.auth.signInWithOtp({
            email: target,
            options: {
              shouldCreateUser: purpose === "register",
              ...(purpose === "register" ? { data: { full_name: name.trim() } } : {}),
            },
          });
    setBusy(false);
    if (error) return toast(translateError(error.message), "error");
    setOtpEmail(target);
    setOtpPurpose(purpose);
    setOtpCode("");
    setNewPassword("");
    setCooldown(RESEND_SECONDS);
    setMode("otp");
    toast(`Kode sudah dikirim ke ${target}.`, "success");
  }

  function sendFromRegister(e) {
    e.preventDefault();
    if (!name.trim()) return toast("Isi nama kamu terlebih dahulu.", "error");
    requestOtp("register", email.trim());
  }

  function sendFromLogin() {
    if (!email.trim()) return toast("Isi email terlebih dahulu.", "error");
    requestOtp("login", email.trim());
  }

  async function forgot(e) {
    e.preventDefault();
    if (!email.trim()) return toast("Isi email terlebih dahulu.", "error");
    requestOtp("recovery", email.trim());
  }

  async function verifyOtp(e) {
    e.preventDefault();
    const code = otpCode.trim();
    if (code.length < OTP_LENGTH) return toast(`Masukkan kode OTP ${OTP_LENGTH} digit.`, "error");
    if (otpPurpose === "recovery" && newPassword.length < 6) {
      return toast("Password baru minimal 6 karakter.", "error");
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: code,
      type: otpPurpose === "recovery" ? "recovery" : "email",
    });
    setBusy(false);
    if (error) return toast(translateError(error.message), "error");
    if (otpPurpose === "recovery") {
      setBusy(true);
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      setBusy(false);
      if (updateError) return toast(translateError(updateError.message), "error");
      toast("Password berhasil diubah.", "success");
      router.replace("/dashboard");
      return;
    }
    toast("Berhasil masuk. Selamat belajar!", "success");
    router.replace("/dashboard");
  }

  async function resendOtp() {
    if (cooldown > 0 || busy) return;
    requestOtp(otpPurpose, otpEmail);
  }

  async function social(provider) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast(translateError(error.message), "error");
  }

  const showBack = mode !== "login";
  const copy = mode === "otp" && otpPurpose === "recovery" ? COPY.recoveryOtp : COPY[mode];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <div className="pointer-events-none absolute h-72 w-72 -translate-x-52 -translate-y-28 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute h-80 w-80 translate-x-52 translate-y-32 rounded-full bg-violet-400/35 blur-3xl" />
      <div className="liquid-surface relative w-full max-w-sm animate-fade-up rounded-[32px] p-6 sm:p-8">
        {showBack ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Kembali"
            className="liquid-surface mb-5 grid h-10 w-10 place-items-center rounded-full transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
        ) : (
          <div className="mb-5 h-10" />
        )}

        <h1 className="text-center text-3xl font-extrabold tracking-tight text-slate-800">{copy.title}</h1>
        <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">{copy.desc}</p>

        {!isConfigured && (
          <div className="mt-5 flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Supabase belum dikonfigurasi. Isi <b>.env.local</b> dengan URL dan anon key, lalu jalankan ulang server.
            </p>
          </div>
        )}

        {/* ---------- LOGIN ---------- */}
        {mode === "login" && (
          <form onSubmit={login} className="mt-7 space-y-4">
            <Field
              icon={Mail}
              id="email"
              type="email"
              placeholder="Alamat email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field
              icon={Lock}
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            >
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => goTo("forgot")}
                className="text-xs font-semibold text-slate-500 hover:text-brand-600"
              >
                Lupa password?
              </button>
            </div>

            <PrimaryButton loading={busy}>Masuk</PrimaryButton>

            <button
              type="button"
              onClick={sendFromLogin}
              disabled={busy}
              className="liquid-surface flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-brand-700 transition hover:bg-white/60 active:scale-[.98] disabled:opacity-60"
            >
              Masuk dengan kode OTP
            </button>

            <p className="pt-2 text-center text-xs text-slate-500">
              Belum punya akun?{" "}
              <button type="button" onClick={() => goTo("register")} className="font-semibold text-brand-600 hover:underline">
                Daftar di sini
              </button>
            </p>
          </form>
        )}

        {/* ---------- REGISTER (OTP) ---------- */}
        {mode === "register" && (
          <form onSubmit={sendFromRegister} className="mt-7 space-y-4">
            <Field
              icon={User}
              id="name"
              placeholder="Nama panggilan"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Field
              icon={Mail}
              id="reg-email"
              type="email"
              placeholder="Alamat email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <PrimaryButton loading={busy}>Kirim Kode OTP</PrimaryButton>

            <p className="pt-2 text-center text-xs text-slate-500">
              Sudah punya akun?{" "}
              <button type="button" onClick={() => goTo("login")} className="font-semibold text-brand-600 hover:underline">
                Masuk di sini
              </button>
            </p>

            <Divider />
            <SocialRow onPick={social} />
          </form>
        )}

        {/* ---------- LUPA PASSWORD ---------- */}
        {mode === "forgot" && (
          <form onSubmit={forgot} className="mt-7 space-y-4">
            <Field
              icon={Mail}
              id="forgot-email"
              type="email"
              placeholder="Alamat email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PrimaryButton loading={busy}>Lanjutkan</PrimaryButton>
          </form>
        )}

        {/* ---------- VERIFIKASI OTP ---------- */}
        {mode === "otp" && (
          <form onSubmit={verifyOtp} className="mt-7 space-y-4">
            <p className="text-center text-sm font-semibold text-slate-700 break-all">{otpEmail}</p>
            <input
              id="otp-code"
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={OTP_LENGTH}
              placeholder={"000000"}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
              required
              className="h-14 w-full rounded-2xl border border-white/70 bg-white/55 text-center text-2xl font-bold tracking-[0.5em] text-slate-700 placeholder:text-slate-300 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-xl focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
            />

            {otpPurpose === "recovery" && (
              <Field
                icon={Lock}
                id="new-password"
                type="password"
                placeholder="Password baru"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            )}

            <PrimaryButton loading={busy}>
              {otpPurpose === "recovery" ? "Verifikasi & Ubah Password" : "Verifikasi & Masuk"}
            </PrimaryButton>

            <button
              type="button"
              onClick={resendOtp}
              disabled={cooldown > 0 || busy}
              className="w-full text-center text-xs font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Kirim ulang kode (${cooldown}s)` : "Kirim ulang kode"}
            </button>
          </form>
        )}

        {/* ---------- Lupa password: kembali ---------- */}
        {mode === "forgot" && (
          <p className="mt-6 text-center text-xs text-slate-500">
            Ingat password?{" "}
            <button type="button" onClick={() => goTo("login")} className="font-semibold text-brand-600 hover:underline">
              Masuk
            </button>
          </p>
        )}

        {mode === "login" && (
          <>
            <Divider />
            <SocialRow onPick={social} />
          </>
        )}
      </div>
    </div>
  );
}

function PrimaryButton({ loading, children, disabled, ...props }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-gradient-to-r from-brand-500 to-brand-600 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgba(106,71,234,.75)] backdrop-blur-xl transition hover:brightness-105 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-[11px] text-slate-400">
      <span className="h-px flex-1 bg-slate-300/70" />
      Atau lanjutkan dengan
      <span className="h-px flex-1 bg-slate-300/70" />
    </div>
  );
}
