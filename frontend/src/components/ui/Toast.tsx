"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "info";
  onDismiss: () => void;
}

export function Toast({ message, type = "error", onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-sans ${
        type === "error"
          ? "bg-destructive text-destructive-foreground"
          : "bg-card text-card-foreground border border-border"
      }`}
      role="alert"
    >
      {message}
      <button onClick={onDismiss} className="ml-3 font-bold opacity-70 hover:opacity-100">
        &times;
      </button>
    </div>
  );
}
