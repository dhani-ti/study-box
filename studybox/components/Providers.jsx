"use client";

import { ToastProvider } from "./Toast";
import { AuthProvider } from "./AuthProvider";
import { TransitionProvider } from "./TransitionProvider";

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <TransitionProvider>{children}</TransitionProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
