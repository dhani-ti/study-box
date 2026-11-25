"use client";

import { useEffect } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */
const VARIANTS = {
  dark: "bg-ink text-white hover:bg-black",
  brand:
    "border border-white/50 bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-soft backdrop-blur-xl hover:brightness-110",
  soft: "border border-white/60 bg-lavender-100/80 text-brand-700 backdrop-blur-xl hover:bg-lavender-100",
  ghost: "border border-white/70 bg-white/55 text-ink backdrop-blur-xl hover:bg-white/75",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
  white: "bg-white text-ink hover:bg-lavender-50",
};
const SIZES = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

export function Button({
  variant = "dark",
  size = "md",
  loading = false,
  icon: Icon,
  children,
  className,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, tone = "default", className, ...props }) {
  const tones = {
    default: "text-ink/50 hover:bg-lavender-100 hover:text-brand-700",
    danger: "text-ink/50 hover:bg-rose-50 hover:text-rose-500",
  };
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:scale-90",
        tones[tone],
        className
      )}
      {...props}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

/* ---------------- Page header ---------------- */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------------- Chip (filter pill) ---------------- */
export function Chip({ active, children, className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-95",
        active
          ? "bg-ink text-white shadow-soft"
          : "border border-lavender-200 bg-white/70 text-ink/70 hover:bg-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Subject badge ---------------- */
export function SubjectBadge({ subject }) {
  if (!subject) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ink/70 ring-1 ring-lavender-200">
      <span className="h-2 w-2 rounded-full" style={{ background: subject.color }} />
      {subject.name}
    </span>
  );
}

export function SubjectSelect({ value, onChange, subjects, className }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn("input appearance-none", className)}
    >
      <option value="">Tanpa subject</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ open = true, onClose, title, children, size = "md", footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { md: "sm:max-w-lg", lg: "sm:max-w-3xl", xl: "sm:max-w-4xl", full: "sm:max-w-6xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-up bg-ink/40 backdrop-blur-sm"
        style={{ animationDuration: ".2s" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "liquid-surface relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-[32px] shadow-lift sm:rounded-[32px]",
          widths[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-6 sm:px-8 sm:pt-7">
            <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
            <IconButton icon={X} label="Tutup" onClick={onClose} />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2 sm:px-8">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-lavender-100 px-6 py-4 sm:px-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Hapus", loading, onConfirm, onCancel }) {
  return (
    <Modal
      onClose={loading ? undefined : onCancel}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-extrabold">{title}</h3>
        <p className="max-w-sm text-sm text-ink/60">{message}</p>
      </div>
    </Modal>
  );
}

/* ---------------- Empty / Loading states ---------------- */
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="glass flex animate-fade-up flex-col items-center gap-3 rounded-4xl px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-lavender-200 to-lavender-100 text-brand-600">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="max-w-sm text-sm text-ink/55">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function CardSkeleton({ count = 6, height = "h-40", className = "" }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("skeleton", height)} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-20" />
      ))}
    </div>
  );
}

export function FullLoader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-14 w-14 animate-pulse place-items-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lift">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-ink/50">Memuat StudyBox…</p>
      </div>
    </div>
  );
}
