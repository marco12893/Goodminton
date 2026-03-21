"use client";

import { useFormStatus } from "react-dom";

export default function PendingButton({ children, pendingLabel, className }) {
  const { pending } = useFormStatus();
  const label = pendingLabel ?? children;

  return (
    <button className={className} disabled={pending} aria-disabled={pending}>
      <span className={`inline-flex items-center justify-center gap-2 ${pending ? "opacity-90" : ""}`}>
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : null}
        {pending ? (
          <span className="text-center">{label}</span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">{children}</span>
        )}
      </span>
    </button>
  );
}
