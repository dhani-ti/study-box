"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Library, NotebookPen, FileText, ListChecks, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { logActivity } from "@/lib/activity";
import {
  Button,
  CardSkeleton,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
} from "@/components/ui";
import { SUBJECT_COLORS, cn } from "@/lib/utils";

export default function SubjectsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [subjects, setSubjects] = useState([]);
  const [items, setItems] = useState({ notes: [], files: [], tasks: [] });
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(null); // { id?, name, color }
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, n, f, t] = await Promise.all([
        supabase.from("subjects").select("*").order("name", { ascending: true }),
        supabase.from("notes").select("id,title,subject_id"),
        supabase.from("files").select("id,name,subject_id"),
        supabase.from("tasks").select("id,title,status,subject_id"),
      ]);
      const err = [s, n, f, t].find((r) => r.error);
      if (err) toast("Gagal memuat data: " + err.error.message, "error");
      setSubjects(s.data || []);
      setItems({ notes: n.data || [], files: f.data || [], tasks: t.data || [] });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const counts = useMemo(() => {
    const c = {};
    subjects.forEach((s) => (c[s.id] = { notes: 0, files: 0, tasks: 0 }));
    items.notes.forEach((x) => x.subject_id && c[x.subject_id] && c[x.subject_id].notes++);
    items.files.forEach((x) => x.subject_id && c[x.subject_id] && c[x.subject_id].files++);
    items.tasks.forEach((x) => x.subject_id && c[x.subject_id] && c[x.subject_id].tasks++);
    return c;
  }, [subjects, items]);

  async function save(e) {
    e?.preventDefault();
    const name = form.name.trim();
    if (!name) return toast("Nama subject tidak boleh kosong.", "error");
    if (subjects.some((s) => s.id !== form.id && s.name.toLowerCase() === name.toLowerCase()))
      return toast("Subject dengan nama ini sudah ada.", "error");

    setSaving(true);
    if (form.id) {
      const { data, error } = await supabase
        .from("subjects")
        .update({ name, color: form.color })
        .eq("id", form.id)
        .select()
        .single();
      setSaving(false);
      if (error) return toast("Gagal menyimpan: " + error.message, "error");
      setSubjects((p) => p.map((s) => (s.id === data.id ? data : s)).sort((a, b) => a.name.localeCompare(b.name)));
      toast("Subject diperbarui.", "success");
    } else {
      const { data, error } = await supabase
        .from("subjects")
        .insert({ name, color: form.color })
        .select()
        .single();
      setSaving(false);
      if (error) return toast("Gagal menambah subject: " + error.message, "error");
      setSubjects((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
      logActivity("subject", `Menambah subject "${name}"`);
      toast("Subject ditambahkan.", "success");
    }
    setForm(null);
  }

  async function confirmDelete() {
    setDeleting(true);
    const { error } = await supabase.from("subjects").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast("Gagal menghapus: " + error.message, "error");
    setSubjects((p) => p.filter((s) => s.id !== toDelete.id));
    // item terkait menjadi "tanpa subject" (on delete set null)
    const clear = (arr) => arr.map((x) => (x.subject_id === toDelete.id ? { ...x, subject_id: null } : x));
    setItems((p) => ({ notes: clear(p.notes), files: clear(p.files), tasks: clear(p.tasks) }));
    logActivity("subject", `Menghapus subject "${toDelete.name}"`);
    toast("Subject dihapus.", "success");
    setToDelete(null);
  }

  const detailItems = detail && {
    notes: items.notes.filter((x) => x.subject_id === detail.id),
    files: items.files.filter((x) => x.subject_id === detail.id),
    tasks: items.tasks.filter((x) => x.subject_id === detail.id),
  };

  return (
    <div>
      <PageHeader title="Subjects" subtitle="Kelompokkan catatan, PDF, dan tugas berdasarkan mata pelajaran.">
        <Button icon={Plus} onClick={() => setForm({ name: "", color: SUBJECT_COLORS[0] })}>
          Tambah subject
        </Button>
      </PageHeader>

      {loading ? (
        <CardSkeleton height="h-44" />
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Belum ada subject"
          message="Buat subject seperti Matematika atau Biologi, lalu hubungkan catatan dan PDF ke dalamnya."
          action={
            <Button icon={Plus} onClick={() => setForm({ name: "", color: SUBJECT_COLORS[0] })}>
              Buat subject pertama
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s, i) => {
            const c = counts[s.id] || { notes: 0, files: 0, tasks: 0 };
            return (
              <article
                key={s.id}
                onClick={() => setDetail(s)}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="glass group animate-fade-up cursor-pointer overflow-hidden rounded-[28px] p-5 transition hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-extrabold text-white shadow-soft"
                    style={{ background: s.color }}
                  >
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div className="-mr-1 flex">
                    <IconButton
                      icon={Pencil}
                      label="Ubah subject"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm({ id: s.id, name: s.name, color: s.color });
                      }}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      label="Hapus subject"
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete(s);
                      }}
                    />
                  </div>
                </div>
                <h3 className="mt-4 truncate text-xl font-extrabold">{s.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/60">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1.5">
                    <NotebookPen className="h-3.5 w-3.5" /> {c.notes} catatan
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1.5">
                    <FileText className="h-3.5 w-3.5" /> {c.files} PDF
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1.5">
                    <ListChecks className="h-3.5 w-3.5" /> {c.tasks} tugas
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Form tambah / edit */}
      {form && (
        <Modal
          onClose={() => setForm(null)}
          title={form.id ? "Ubah subject" : "Subject baru"}
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
          <form onSubmit={save} className="space-y-5 pt-2">
            <div>
              <label className="label">Nama subject</label>
              <input
                className="input"
                placeholder="Contoh: Matematika"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                maxLength={40}
              />
            </div>
            <div>
              <label className="label">Warna</label>
              <div className="flex flex-wrap gap-3">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={`Pilih warna ${c}`}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-full text-white transition active:scale-90",
                      form.color === c && "ring-4 ring-brand-500/25"
                    )}
                    style={{ background: c }}
                  >
                    {form.color === c && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="hidden" />
          </form>
        </Modal>
      )}

      {/* Detail isi subject */}
      {detail && (
        <Modal onClose={() => setDetail(null)} title={detail.name} size="lg">
          <div className="space-y-6 pt-2">
            {[
              { key: "notes", label: "Catatan", icon: NotebookPen, name: (x) => x.title },
              { key: "files", label: "File PDF", icon: FileText, name: (x) => x.name },
              {
                key: "tasks",
                label: "Tugas",
                icon: ListChecks,
                name: (x) => `${x.title}${x.status === "completed" ? " ✓" : ""}`,
              },
            ].map(({ key, label, icon: Icon, name }) => (
              <section key={key}>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
                  <Icon className="h-4 w-4 text-brand-600" /> {label}
                  <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-xs text-brand-700">
                    {detailItems[key].length}
                  </span>
                </h4>
                {detailItems[key].length === 0 ? (
                  <p className="rounded-2xl bg-lavender-50 px-4 py-3 text-sm text-ink/50">
                    Belum ada. Pilih subject ini saat membuat atau mengubah {label.toLowerCase()}.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {detailItems[key].map((x) => (
                      <li key={x.id} className="truncate rounded-2xl bg-lavender-50 px-4 py-2.5 text-sm font-semibold">
                        {name(x)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Hapus subject ini?"
          message={`Subject "${toDelete.name}" akan dihapus. Catatan, PDF, dan tugas di dalamnya tidak ikut terhapus, hanya menjadi "Tanpa subject".`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
