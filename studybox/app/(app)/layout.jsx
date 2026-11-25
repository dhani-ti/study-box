"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useTransitionNav } from "@/components/TransitionProvider";
import { Sidebar, MobileNav, Logo } from "@/components/Sidebar";
import Avatar from "@/components/Avatar";
import { FullLoader } from "@/components/ui";
import { displayName } from "@/lib/utils";

export default function AppLayout({ children }) {
  const { session, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { supported } = useTransitionNav();

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  if (!session) return <FullLoader />;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        {/* Header mobile */}
        <header className="flex items-center justify-between px-5 pb-1 pt-5 md:hidden">
          <Logo />
          <Avatar name={displayName(user)} size={40} />
        </header>

        <main className="relative px-5 pb-32 pt-4 md:px-8 md:pb-12 md:pt-8 lg:px-10">
          <div
            key={pathname}
            style={{ viewTransitionName: "page" }}
            className={`mx-auto max-w-6xl ${supported ? "" : "animate-fade-up"}`}
          >
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
