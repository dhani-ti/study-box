"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  NotebookPen,
  FileText,
  Library,
  ListChecks,
  Settings,
  LogOut,
  BookOpen,
} from "lucide-react";
import TLink from "./TLink";
import Avatar from "./Avatar";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn, displayName } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "My Notes", icon: NotebookPen },
  { href: "/files", label: "My Files", icon: FileText },
  { href: "/subjects", label: "Subjects", icon: Library },
  { href: "/tasks", label: "My Tasks", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/50 bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-soft">
        <BookOpen className="h-5 w-5" />
      </div>
      <span className={cn("text-xl font-extrabold tracking-tight", light && "text-white")}>
        StudyBox
      </span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const name = displayName(user);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 p-4 md:block">
      <div className="glass flex h-full flex-col rounded-[32px] p-5">
        <div className="px-2 pb-6 pt-1">
          <Logo />
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <TLink
                key={href}
                href={href}
                style={active ? { viewTransitionName: "nav-pill" } : undefined}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold transition",
                  active
                    ? "border border-white/20 bg-ink/90 text-white shadow-soft backdrop-blur-xl"
                    : "text-ink/60 hover:bg-white/55 hover:text-brand-700"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </TLink>
            );
          })}
        </nav>

        <div className="liquid-surface mt-4 rounded-3xl p-3">
          <div className="flex items-center gap-3">
            <Avatar name={name} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="truncate text-xs text-ink/50">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Keluar"
              title="Keluar"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-ink/60 transition hover:bg-white hover:text-rose-500 active:scale-90"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Navigasi bawah untuk smartphone (pill hitam seperti pada referensi desain)
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 md:hidden">
      <div className="liquid-surface flex items-center justify-between rounded-full border border-white/30 bg-ink/90 p-2 shadow-lift">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <TLink
              key={href}
              href={href}
              aria-label={label}
              style={active ? { viewTransitionName: "nav-pill-m" } : undefined}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full transition",
                active ? "bg-white text-ink" : "text-white/60 active:scale-90"
              )}
            >
              <Icon className="h-5 w-5" />
            </TLink>
          );
        })}
      </div>
    </nav>
  );
}
