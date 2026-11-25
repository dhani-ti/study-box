"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ListChecks, Check, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useSubjects } from "@/lib/hooks";
import { logActivity } from "@/lib/activity";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconButton,
  ListSkeleton,
  Modal,
  PageHeader,
  SubjectBadge,
  SubjectSelect,
} from "@/components/ui";
import { cn, daysUntil, deadlineLabel, formatDate } from "@/lib/utils";

const EMPTY = { title: "", description: "", deadline: "", subject_id: "", status: "pending" };

export default function TasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const subjects = useSubjects();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast("Gagal memuat tugas: " + error.message, "error");
        setTasks(data || []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    }),
    [tasks]
  );

  const visible = useMemo(() => {
    const list = tasks.filter((t) => filter === "all" || t.status === filter);
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [tasks, filter]);

  async function save(e) {
    e?.preventDefault();
    const title = form.title.trim();
    if (!title) return toast("Judul tugas tidak boleh kosong.", "error");
    const payload = {
      title,
      description: form.description.trim(),
      deadline: form.deadline || null,
      subject_id: form.subject_id || null,
      status: form.status,
    };

    setSaving(true);
    if (form.id) {
      const { data, error } = await supabase.from("tasks").update(payload).eq("id", form.id).select().single();
      setSaving(false);
      if (error) return toast("Gagal menyimpan: " + error.message, "error");
      setTasks((p) => p.map((t) => (t.id === data.id ? data : t)));
      toast("Tugas diperbarui.", "success");
    } else {
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      setSaving(false);
      if (error) return toast("Gagal menambah tugas: " + error.message, "error");
      setTasks((p) => [data, ...p]);
      logActivity("task", `Menambah tugas "${title}"`);
      toast("Tugas ditambahkan.", "success");
    }
    setForm(null);
  }

  async function toggle(task) {
    const status = task.status === "completed" ? "pending" : "completed";
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, status } : t))); // optimistis
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) {
      setTasks((p) => p.map((t) => (t.id === task.id ? task : t)));
      return toast("Gagal mengubah status: " + error.message, "error");
    }
    if (status === "completed") {
      logActivity("task", `Menyelesaikan tugas "${task.title}"`);
      toast("Hebat! Tugas selesai 🎉", "success");
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast("Gagal menghapus: " + error.message, "error");
    setTasks((p) => p.filter((t) => t.id !== toDelete.id));
    logActivity("task", `Menghapus tugas "${toDelete.title}"`);
    toast("Tugas dihapus.", "success");
    setToDelete(null);
  }

  return (
    <div>
      <PageHeader title="My Tasks" subtitle="Catat tugas dan pantau deadline-nya.">
        <Button icon={Plus} onClick={() => setForm({ ...EMPTY })}>
          Tambah tugas
        </Button>
      </PageHeader>

      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {[
          ["all", "Semua"],
          ["pending", "Pending"],
          ["completed", "Completed"],
        ].map(([key, label]) => (
          <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
            {label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px]",
                filter === key ? "bg-white/20" : "bg-lavender-100 text-brand-700"
              )}
            >
              {counts[key]}
            </span>
          </Chip>
        ))}
      </div>

      {loading ? (
        <ListSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Belum ada tugas"
          message="Tambahkan tugas pertamamu supaya deadline tidak terlewat."
          action={
            <Button icon={Plus} onClick={() => setForm({ ...EMPTY })}>
              Tambah tugas
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={filter === "pending" ? "Semua tugas selesai!" : "Belum ada tugas selesai"}
          message={
            filter === "pending"
              ? "Tidak ada tugas pending. Waktunya istirahat sejenak."
              : "Selesaikan tugas dan tandai di sini."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((t, i) => {
            const done = t.status === "completed";
            const d = t.deadline ? daysUntil(t.deadline) : null;
            return (
              <li
                key={t.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className={cn(
                  "glass flex animate-fade-up items-start gap-4 rounded-[28px] p-4 transition",
                  done && "opacity-70"
                )}
              >
                <button
                  onClick={() => toggle(t)}
                  aria-label={done ? "Tandai pending" : "Tandai selesai"}
                  className={cn(
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition active:scale-90",
                    done
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-lavender-300 bg-white text-transparent hover:border-brand-500 hover:text-brand-500/40"
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn("font-bold", done && "line-through decoration-ink/30")}>{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-ink/55">{t.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {t.deadline && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          done
                            ? "bg-lavender-100 text-ink/50"
                            : d < 0
                            ? "bg-rose-100 text-rose-600"
                            : d <= 2
                            ? "bg-amber-100 text-amber-700"
                            : "bg-lavender-100 text-brand-700"
                        )}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(t.deadline, { day: "numeric", month: "short", year: "numeric" })}
                        {!done && <span className="opacity-70">· {deadlineLabel(t.deadline)}</span>}
                      </span>
                    )}
                    <SubjectBadge subject={subjectMap[t.subject_id]} />
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
                  <IconButton
                    icon={Pencil}
                    label="Ubah tugas"
                    onClick={() =>
                      setForm({
                        id: t.id,
                        title: t.title,
                        description: t.description || "",
                        deadline: t.deadline || "",
                        subject_id: t.subject_id || "",
                        status: t.status,
                      })
                    }
                  />
                  <IconButton icon={Trash2} tone="danger" label="Hapus tugas" onClick={() => setToDelete(t)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {form && (
        <Modal
          onClose={() => setForm(null)}
          title={form.id ? "Ubah tugas" : "Tugas baru"}
          footer={
            <>
              <Button variant="ghost" onClick={() => setForm(null)}>
                Batal
              </Button>
              <Button onClick={save} loading={saving}>
                {form.id ? "Simpan" : "Tambah"}
              </Button>
            </>
          }
        >
          <form onSubmit={save} className="space-y-4 pt-2">
            <div>
              <label className="label">Judul</label>
              <input
                className="input"
                placeholder="Contoh: Kerjakan laporan praktikum"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea
                className="input min-h-[96px] resize-none"
                placeholder="Detail tugas (opsional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Deadline</label>
                <input
                  type="date"
                  className="input"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Subject</label>
                <SubjectSelect
                  value={form.subject_id}
                  subjects={subjects}
                  onChange={(v) => setForm({ ...form, subject_id: v })}
                />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2">
                {["pending", "completed"].map((s) => (
                  <Chip
                    key={s}
                    type="button"
                    active={form.status === s}
                    onClick={() => setForm({ ...form, status: s })}
                  >
                    {s === "pending" ? "Pending" : "Completed"}
                  </Chip>
                ))}
              </div>
            </div>
            <button type="submit" className="hidden" />
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Hapus tugas ini?"
          message={`"${toDelete.title}" akan dihapus permanen.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
