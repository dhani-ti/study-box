"use client";

import Link from "next/link";
import { useTransitionNav } from "./TransitionProvider";

// Link yang menjalankan morph transition saat berpindah halaman.
export default function TLink({ href, children, onClick, ...props }) {
  const { go } = useTransitionNav();
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(href);
      }}
    >
      {children}
    </Link>
  );
}
