"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Modal, IconButton, SubjectSelect } from "./ui";

const STATUS = {
  saved: { icon: Check, text: "Tersimpan", cls: "text-emerald-600" },
  dirty: { icon: Loader2, text: "Mengetik…", cls: "text-ink/40" },
  saving: { icon: Loader2, text: "Menyimpan…", cls: "text-brand-600" },
  error: { icon: AlertCircle, text: "Gagal menyimpan", cls: "text-rose-500" },
};

// Editor catatan dengan simpan otomatis (debounce 800 ms).
export default function NoteEditor({ note, subjects, onSaved, onClose, onDelete }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [subjectId, setSubjectId] = useState(note.subject_id || "");
  const [status, setStatus] = useState("saved");

  const dirty = useRef(false);
  const timer = useRef(null);
  const latest = useRef({});
  latest.current = { title, content, subjectId };

  const save = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    const { title, content, subjectId } = latest.current;
    const { data, error } = await supabase
      .from("notes")
      .update({
        title: title.trim() || "Tanpa judul",
        content,
        subject_id: subjectId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", note.id)
      .select()
      .single();
    if (error) {
      dirty.current = true;
      setStatus("error");
      return;
    }
    setStatus(dirty.current ? "dirty" : "saved");
    onSaved(data);
  }, [note.id, onSaved]);

  function touch() {
    dirty.current = true;
    setStatus("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  async function close() {
    clearTimeout(timer.current);
    await save();
    onClose();
  }

  const S = STATUS[status];

  return (
    <Modal onClose={close} size="xl">
      <div className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${S.cls}`}>
            <S.icon className={`h-3.5 w-3.5 ${status === "saving" || status === "dirty" ? "animate-spin" : ""}`} />
            {S.text}
          </span>
          <div className="flex items-center gap-1">
            <IconButton icon={Trash2} tone="danger" label="Hapus catatan" onClick={() => onDelete(note)} />
            <button
              onClick={close}
              className="h-9 rounded-full bg-ink px-5 text-xs font-semibold text-white transition hover:bg-black active:scale-95"
            >
              Selesai
            </button>
          </div>
        </div>

        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            touch();
          }}
          placeholder="Judul catatan"
          className="w-full bg-transparent text-3xl font-extrabold tracking-tight outline-none placeholder:text-ink/25"
          autoFocus
        />

        <div className="max-w-xs">
          <SubjectSelect
            value={subjectId}
            subjects={subjects}
            onChange={(v) => {
              setSubjectId(v);
              touch();
            }}
          />
        </div>

        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            touch();
          }}
          placeholder="Mulai menulis catatanmu di sini…"
          className="min-h-[45vh] w-full resize-none rounded-3xl bg-lavender-50 p-5 text-[15px] leading-relaxed outline-none transition placeholder:text-ink/30 focus:ring-4 focus:ring-brand-500/15"
        />
      </div>
    </Modal>
  );
}
