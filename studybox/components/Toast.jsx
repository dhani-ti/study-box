"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(() => {});

const STYLES = {
  success: { icon: CheckCircle2, color: "text-emerald-500" },
  error: { icon: AlertCircle, color: "text-rose-500" },
  info: { icon: Info, color: "text-brand-500" },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((p) => p.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "success") => {
      const id = ++idRef.current;
      setItems((p) => [...p, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:items-end">
        {items.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-lift backdrop-blur-xl"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.color}`} />
              <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink/30 transition hover:text-ink"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
