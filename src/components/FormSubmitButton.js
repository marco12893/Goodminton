"use client";

import { useFormStatus } from "react-dom";

export default function FormSubmitButton({ idleLabel, pendingLabel, className }) {
  const { pending } = useFormStatus();
  const label = pending ? pendingLabel : idleLabel;

  return (
    <button className={className} disabled={pending} aria-disabled={pending}>
      {label}
    </button>
  );
}
