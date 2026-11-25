"use client";

import { useEffect, useMemo, useState } from "react";
import {
  NotebookPen,
  FileText,
  ListChecks,
  Library,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Activity,
  PartyPopper,
  Plus,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import TLink from "@/components/TLink";
import { IconButton } from "@/components/ui";
import {
  cn,
  daysUntil,
  deadlineLabel,
  displayName,
  greeting,
  parseLocalDate,
  timeAgo,
  toISODate,
} from "@/lib/utils";

const ACTIVITY_ICONS = {
  note: NotebookPen,
  file: FileText,
  task: ListChecks,
  subject: Library,
};

function StatCard({ icon: Icon, label, value, loading, href, tint }) {
  return (
    <TLink
      href={href}
      className="glass group rounded-[28px] p-5 transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className={cn("grid h-12 w-12 place-items-center rounded-2xl", tint)}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-5 text-sm font-semibold text-ink/55">{label}</p>
      {loading ? (
        <div className="skeleton mt-2 h-10 w-16" />
      ) : (
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{value}</p>
      )}
    </TLink>
  );
}

function MiniCalendar({ marks }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = toISODate(new Date());

  return (
    <div className="glass rounded-[32px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-extrabold">
          {cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex gap-1">
          <IconButton
            icon={ChevronLeft}
            label="Bulan sebelumnya"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          />
          <IconButton
            icon={ChevronRight}
            label="Bulan berikutnya"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <span key={d} className="pb-1 text-[11px] font-semibold uppercase text-ink/40">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const str = toISODate(new Date(year, month, d));
          const isToday = str === today;
          const count = marks[str];
          return (
            <div key={str} className="flex justify-center">
              <div
                title={count ? `${count} tugas deadline` : undefined}
                className={cn(
                  "relative grid h-9 w-9 place-items-center rounded-full text-sm font-semibold",
                  isToday ? "bg-ink text-white" : count ? "bg-lavender-200 text-brand-700" : "text-ink/70"
                )}
              >
                {d}
                {count && !isToday && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ notes: 0, files: 0, subjects: 0 });
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [n, f, s, t, a] = await Promise.all([
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase.from("files").select("id", { count: "exact", head: true }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase
          .from("tasks")
          .select("id,title,deadline,status")
          .eq("status", "pending")
          .order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      if (!alive) return;
      const err = [n, f, s, t, a].find((r) => r.error);
      if (err) toast("Gagal memuat sebagian data: " + err.error.message, "error");
      setStats({ notes: n.count ?? 0, files: f.count ?? 0, subjects: s.count ?? 0 });
      setTasks(t.data || []);
      setActivities(a.data || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const upcoming = useMemo(
    () => tasks.filter((t) => t.deadline && daysUntil(t.deadline) <= 7).slice(0, 5),
    [tasks]
  );
  const marks = useMemo(() => {
    const m = {};
    tasks.forEach((t) => {
      if (t.deadline) m[t.deadline] = (m[t.deadline] || 0) + 1;
    });
    return m;
  }, [tasks]);

  const name = displayName(user);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/45 bg-gradient-to-br from-brand-400/95 via-brand-600/95 to-brand-800/95 p-7 text-white shadow-lift backdrop-blur-2xl sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-cyan-200/20 blur-xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-fuchsia-200/20 blur-xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/20 to-transparent" />
        <p className="text-sm font-semibold text-white/70">{greeting()},</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Hey, {name}
        </h1>
        <p className="mt-3 max-w-md text-white/75">
          {loading
            ? "Menyiapkan ruang belajarmu…"
            : tasks.length > 0
            ? `Kamu punya ${tasks.length} tugas aktif. Yuk, selesaikan satu per satu.`
            : "Tidak ada tugas aktif. Saatnya menambah catatan baru!"}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <TLink
            href="/notes"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold transition hover:bg-black active:scale-95"
          >
            <Plus className="h-4 w-4" /> Tulis catatan
          </TLink>
          <TLink
            href="/files"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold backdrop-blur transition hover:bg-white/25 active:scale-95"
          >
            <UploadCloud className="h-4 w-4" /> Unggah PDF
          </TLink>
          <TLink
            href="/tasks"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold backdrop-blur transition hover:bg-white/25 active:scale-95"
          >
            <ListChecks className="h-4 w-4" /> Tambah tugas
          </TLink>
        </div>
      </section>

      {/* Statistik */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={NotebookPen}
          label="Total Catatan"
          value={stats.notes}
          loading={loading}
          href="/notes"
          tint="bg-lavender-200 text-brand-700"
        />
        <StatCard
          icon={FileText}
          label="Total PDF"
          value={stats.files}
          loading={loading}
          href="/files"
          tint="bg-pink-100 text-pink-600"
        />
        <StatCard
          icon={ListChecks}
          label="Tugas Aktif"
          value={tasks.length}
          loading={loading}
          href="/tasks"
          tint="bg-sky-100 text-sky-600"
        />
        <StatCard
          icon={Library}
          label="Subjects"
          value={stats.subjects}
          loading={loading}
          href="/subjects"
          tint="bg-emerald-100 text-emerald-600"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          {/* Deadline */}
          <div className="glass rounded-[32px] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold leading-tight">Mendekati Deadline</h3>
                <p className="text-xs text-ink/50">Tugas jatuh tempo dalam 7 hari</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-16" />
                <div className="skeleton h-16" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-3xl bg-lavender-50 py-8 text-center">
                <PartyPopper className="h-8 w-8 text-brand-500" />
                <p className="text-sm font-semibold">Tidak ada deadline dekat. Aman!</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((t) => {
                  const d = daysUntil(t.deadline);
                  const date = parseLocalDate(t.deadline);
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-4 rounded-3xl bg-white/80 p-3 ring-1 ring-lavender-100"
                    >
                      <div
                        className={cn(
                          "grid h-14 w-14 shrink-0 place-items-center rounded-full text-center leading-none",
                          d < 0 ? "bg-rose-100 text-rose-600" : d <= 2 ? "bg-amber-100 text-amber-700" : "bg-lavender-200 text-brand-700"
                        )}
                      >
                        <span>
                          <span className="block text-lg font-extrabold">{date.getDate()}</span>
                          <span className="block text-[10px] font-semibold uppercase">
                            {date.toLocaleDateString("id-ID", { month: "short" })}
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{t.title}</p>
                        <p
                          className={cn(
                            "text-xs font-semibold",
                            d < 0 ? "text-rose-500" : d <= 2 ? "text-amber-600" : "text-ink/50"
                          )}
                        >
                          {deadlineLabel(t.deadline)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && tasks.length > 0 && (
              <TLink
                href="/tasks"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline"
              >
                Lihat semua tugas <ChevronRight className="h-4 w-4" />
              </TLink>
            )}
          </div>

          {/* Aktivitas */}
          <div className="glass rounded-[32px] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-lavender-200 text-brand-700">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-extrabold">Aktivitas Terbaru</h3>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-12" />
                <div className="skeleton h-12" />
                <div className="skeleton h-12" />
              </div>
            ) : activities.length === 0 ? (
              <div className="rounded-3xl bg-lavender-50 py-8 text-center text-sm text-ink/55">
                Belum ada aktivitas. Mulai dengan menulis catatan pertamamu!
              </div>
            ) : (
              <ul className="space-y-1">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type] || CheckCircle2;
                  return (
                    <li key={a.id} className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-lavender-50">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lavender-100 text-brand-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{a.message}</p>
                      <span className="shrink-0 text-xs text-ink/40">{timeAgo(a.created_at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <MiniCalendar marks={marks} />
        </div>
      </section>
    </div>
  );
}
