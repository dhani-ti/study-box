"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AuthForm from "@/components/AuthForm";
import { FullLoader } from "@/components/ui";

// Halaman utama: tampilkan login / daftar dulu bila belum masuk,
// dan arahkan ke dashboard bila sudah punya sesi.
export default function Home() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  // belum dicek
  if (session === undefined) return <FullLoader />;
  // sudah login -> sedang diarahkan ke dashboard
  if (session) return <FullLoader />;
  // belum login -> tampilkan form login / daftar
  return <AuthForm />;
}
