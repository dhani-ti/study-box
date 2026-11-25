"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, NotebookPen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useSubjects } from "@/lib/hooks";
import { logActivity } from "@/lib/activity";
import NoteEditor from "@/components/NoteEditor";
import {
  Button,
  Chip,
  CardSkeleton,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  SubjectBadge,
} from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export default function NotesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const subjects = useSubjects();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast("Gagal memuat catatan: " + error.message, "error");
        setNotes(data || []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return notes.filter((n) => {
      const inSubject =
        filter === "all" ? true : filter === "none" ? !n.subject_id : n.subject_id === filter;
      const inText = !s || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s);
      return inSubject && inText;
    });
  }, [notes, q, filter]);

  async function create() {
    setCreating(true);
    const { data, error } = await supabase
      .from("notes")
      .insert({
        title: "Catatan baru",
        content: "",
        subject_id: filter !== "all" && filter !== "none" ? filter : null,
      })
      .select()
      .single();
    setCreating(false);
    if (error) return toast("Gagal membuat catatan: " + error.message, "error");
    setNotes((p) => [data, ...p]);
    setEditing(data);
    logActivity("note", "Membuat catatan baru");
  }

  const onSaved = useCallback((updated) => {
    setNotes((p) =>
      [updated, ...p.filter((n) => n.id !== updated.id)].sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      )
    );
  }, []);

  async function confirmDelete() {
    setDeleting(true);
    const { error } = await supabase.from("notes").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast("Gagal menghapus: " + error.message, "error");
    setNotes((p) => p.filter((n) => n.id !== toDelete.id));
    logActivity("note", `Menghapus catatan "${toDelete.title}"`);
    toast("Catatan dihapus.", "success");
    if (editing?.id === toDelete.id) setEditing(null);
    setToDelete(null);
  }

  return (
    <div>
      <PageHeader title="My Notes" subtitle="Semua catatan belajarmu, tersimpan otomatis.">
        <Button variant="dark" icon={Plus} onClick={create} loading={creating}>
          Catatan baru
        </Button>
      </PageHeader>

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          className="input !rounded-full !bg-white !pl-11"
          placeholder="Cari judul atau isi catatan…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Semua
        </Chip>
        {subjects.map((s) => (
          <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </Chip>
        ))}
        <Chip active={filter === "none"} onClick={() => setFilter("none")}>
          Tanpa subject
        </Chip>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Belum ada catatan"
          message="Tulis catatan pertamamu. Semua perubahan akan tersimpan otomatis."
          action={
            <Button icon={Plus} onClick={create} loading={creating}>
              Buat catatan
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Tidak ada hasil"
          message="Coba kata kunci atau kategori lain."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n, i) => (
            <article
              key={n.id}
              onClick={() => setEditing(n)}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="glass group flex h-52 animate-fade-up cursor-pointer flex-col rounded-[28px] p-5 transition hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-2">
                <SubjectBadge subject={subjectMap[n.subject_id]} />
                <IconButton
                  icon={Trash2}
                  tone="danger"
                  label="Hapus catatan"
                  className="-mr-1 -mt-1 opacity-0 transition group-hover:opacity-100 max-md:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToDelete(n);
                  }}
                />
              </div>
              <h3 className="mt-2 line-clamp-2 text-lg font-extrabold leading-snug">{n.title}</h3>
              <p className="mt-1 line-clamp-3 flex-1 whitespace-pre-line text-sm text-ink/55">
                {n.content || "Catatan kosong"}
              </p>
              <p className="mt-2 text-xs font-medium text-ink/40">{timeAgo(n.updated_at)}</p>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <NoteEditor
          key={editing.id}
          note={editing}
          subjects={subjects}
          onSaved={onSaved}
          onClose={() => setEditing(null)}
          onDelete={(n) => setToDelete(n)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Hapus catatan ini?"
          message={`"${toDelete.title}" akan dihapus permanen dan tidak bisa dikembalikan.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
