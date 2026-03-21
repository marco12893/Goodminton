"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoadingLink({ href, className, children, spinnerClassName, ...props }) {
  const [pending, setPending] = useState(false);

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (props.onClick) props.onClick(event);
        if (!event.defaultPrevented) {
          setPending(true);
        }
      }}
      aria-busy={pending}
      {...props}
    >
      <span className="relative inline-flex w-full items-center justify-center">
        {children}
        {pending ? (
          <span
            className={`absolute right-4 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${spinnerClassName ?? ""}`}
          />
        ) : null}
      </span>
    </Link>
  );
}
