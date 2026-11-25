"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Eye,
  Download,
  Trash2,
  Pencil,
  Search,
  ExternalLink,
} from "lucide-react";
import { supabase, BUCKET, MAX_PDF_SIZE } from "@/lib/supabase";
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
import { cn, formatBytes, formatDate } from "@/lib/utils";

export default function FilesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const subjects = useSubjects();
  const inputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadSubject, setUploadSubject] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const [preview, setPreview] = useState(null); // { file, url }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast("Gagal memuat file: " + error.message, "error");
        setFiles(data || []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return files.filter((f) => {
      const inSubject =
        filter === "all" ? true : filter === "none" ? !f.subject_id : f.subject_id === filter;
      return inSubject && (!s || f.name.toLowerCase().includes(s));
    });
  }, [files, q, filter]);

  async function uploadFiles(list) {
    const selected = Array.from(list || []);
    if (!selected.length) return;
    setUploading(true);
    let ok = 0;

    for (const file of selected) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast(`"${file.name}" bukan file PDF.`, "error");
        continue;
      }
      if (file.size > MAX_PDF_SIZE) {
        toast(`"${file.name}" melebihi batas ${formatBytes(MAX_PDF_SIZE)}.`, "error");
        continue;
      }

      const path = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) {
        toast(`Gagal mengunggah "${file.name}": ${upErr.message}`, "error");
        continue;
      }

      const { data, error: dbErr } = await supabase
        .from("files")
        .insert({
          name: file.name,
          path,
          size: file.size,
          mime: "application/pdf",
          subject_id: uploadSubject || null,
        })
        .select()
        .single();
      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path]); // rollback
        toast(`Gagal menyimpan data "${file.name}": ${dbErr.message}`, "error");
        continue;
      }

      setFiles((p) => [data, ...p]);
      logActivity("file", `Mengunggah PDF "${file.name}"`);
      ok++;
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (ok > 0) toast(ok === 1 ? "PDF berhasil diunggah." : `${ok} PDF berhasil diunggah.`, "success");
  }

  async function openPreview(file) {
    setPreviewLoading(file.id);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 3600);
    setPreviewLoading(false);
    if (error) return toast("Gagal membuka preview: " + error.message, "error");
    setPreview({ file, url: data.signedUrl });
  }

  async function download(file) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.path, 120, { download: file.name });
    if (error) return toast("Gagal mengunduh: " + error.message, "error");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Unduhan dimulai.", "info");
  }

  function startEdit(file) {
    setEditing(file);
    setEditName(file.name);
    setEditSubject(file.subject_id || "");
  }

  async function saveEdit(e) {
    e.preventDefault();
    const name = editName.trim();
    if (!name) return toast("Nama file tidak boleh kosong.", "error");
    setSavingEdit(true);
    const { data, error } = await supabase
      .from("files")
      .update({ name, subject_id: editSubject || null })
      .eq("id", editing.id)
      .select()
      .single();
    setSavingEdit(false);
    if (error) return toast("Gagal menyimpan: " + error.message, "error");
    setFiles((p) => p.map((f) => (f.id === data.id ? data : f)));
    toast("File diperbarui.", "success");
    setEditing(null);
  }

  async function confirmDelete() {
    setDeleting(true);
    const { error: stErr } = await supabase.storage.from(BUCKET).remove([toDelete.path]);
    if (stErr) {
      setDeleting(false);
      return toast("Gagal menghapus file: " + stErr.message, "error");
    }
    const { error } = await supabase.from("files").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast("Gagal menghapus data: " + error.message, "error");
    setFiles((p) => p.filter((f) => f.id !== toDelete.id));
    logActivity("file", `Menghapus PDF "${toDelete.name}"`);
    toast("File dihapus.", "success");
    setToDelete(null);
  }

  return (
    <div>
      <PageHeader title="My Files" subtitle="Perpustakaan PDF pribadimu. Maksimal 25 MB per file.">
        <Button icon={UploadCloud} onClick={() => inputRef.current?.click()} loading={uploading}>
          Upload PDF
        </Button>
      </PageHeader>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "mb-6 flex flex-col items-center gap-4 rounded-[32px] border-2 border-dashed p-6 text-center transition sm:flex-row sm:text-left",
          dragging ? "border-brand-500 bg-lavender-200/70" : "border-lavender-300 bg-white/50"
        )}
      >
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-soft">
          <UploadCloud className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <p className="font-extrabold">
            {uploading ? "Mengunggah…" : "Tarik & lepas PDF di sini"}
          </p>
          <p className="text-sm text-ink/55">atau klik tombol Upload PDF. Bisa pilih beberapa file sekaligus.</p>
        </div>
        <div className="w-full sm:w-56">
          <label className="label">Simpan ke subject</label>
          <SubjectSelect value={uploadSubject} onChange={setUploadSubject} subjects={subjects} />
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          className="input !rounded-full !bg-white !pl-11"
          placeholder="Cari nama file…"
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
        <ListSkeleton />
      ) : files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada file PDF"
          message="Unggah materi, modul, atau jurnal PDF-mu dan buka kapan saja."
          action={
            <Button icon={UploadCloud} onClick={() => inputRef.current?.click()}>
              Upload PDF pertama
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Tidak ada hasil" message="Coba kata kunci atau kategori lain." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((f, i) => (
            <li
              key={f.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="glass flex animate-fade-up flex-col gap-3 rounded-[28px] p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-500">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{f.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/50">
                    <span className="font-semibold">{formatBytes(f.size)}</span>
                    <span>Diunggah {formatDate(f.created_at)}</span>
                    <SubjectBadge subject={subjectMap[f.subject_id]} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <IconButton
                  icon={Eye}
                  label="Preview"
                  onClick={() => openPreview(f)}
                  disabled={previewLoading === f.id}
                />
                <IconButton icon={Download} label="Download" onClick={() => download(f)} />
                <IconButton icon={Pencil} label="Ubah" onClick={() => startEdit(f)} />
                <IconButton icon={Trash2} tone="danger" label="Hapus" onClick={() => setToDelete(f)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <Modal onClose={() => setPreview(null)} title={preview.file.name} size="full">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm" variant="soft" icon={Download} onClick={() => download(preview.file)}>
              Download
            </Button>
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-lavender-100 px-4 text-xs font-semibold text-brand-700 transition hover:bg-lavender-200"
            >
              <ExternalLink className="h-4 w-4" /> Buka di tab baru
            </a>
          </div>
          <iframe
            src={preview.url}
            title={preview.file.name}
            className="h-[70vh] w-full rounded-3xl border border-lavender-200 bg-lavender-50"
          />
        </Modal>
      )}

      {editing && (
        <Modal
          onClose={() => setEditing(null)}
          title="Ubah file"
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button onClick={saveEdit} loading={savingEdit}>
                Simpan
              </Button>
            </>
          }
        >
          <form onSubmit={saveEdit} className="space-y-4 pt-2">
            <div>
              <label className="label">Nama file</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="label">Subject</label>
              <SubjectSelect value={editSubject} onChange={setEditSubject} subjects={subjects} />
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Hapus file ini?"
          message={`"${toDelete.name}" akan dihapus permanen dari penyimpanan.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
