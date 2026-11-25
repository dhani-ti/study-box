"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const TransitionContext = createContext({ go: () => {}, supported: false });

/**
 * Morph Transition antar halaman memakai View Transitions API.
 * - Konten halaman memakai view-transition-name "page" (fade + geser halus).
 * - Indikator menu aktif memakai "nav-pill" sehingga bentuknya berpindah (morph) antar menu.
 * Browser yang belum mendukung otomatis memakai animasi fade-up biasa.
 */
export function TransitionProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const resolver = useRef(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const ok =
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSupported(ok);
  }, []);

  // Setelah rute berubah, selesaikan transisi agar snapshot "baru" diambil.
  useEffect(() => {
    if (resolver.current) {
      const done = resolver.current;
      resolver.current = null;
      requestAnimationFrame(() => requestAnimationFrame(done));
    }
  }, [pathname]);

  const go = useCallback(
    (href) => {
      if (href === pathname) return;
      if (!supported) {
        router.push(href);
        return;
      }
      document.startViewTransition(
        () =>
          new Promise((resolve) => {
            resolver.current = resolve;
            router.push(href);
            setTimeout(resolve, 1200); // pengaman bila navigasi lambat
          })
      );
    },
    [pathname, router, supported]
  );

  return (
    <TransitionContext.Provider value={{ go, supported }}>
      {children}
    </TransitionContext.Provider>
  );
}

export const useTransitionNav = () => useContext(TransitionContext);
