"use client";

import Link from "next/link";
import { useState } from "react";

export default function DownloadLink({ href, className, children, durationMs = 2000, ...props }) {
  const [pending, setPending] = useState(false);

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (props.onClick) props.onClick(event);
        if (!event.defaultPrevented) {
          setPending(true);
          window.setTimeout(() => setPending(false), durationMs);
        }
      }}
      aria-busy={pending}
      {...props}
    >
      <span className="inline-flex h-full w-full items-center justify-center">
        {pending ? (
          <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : (
          children
        )}
      </span>
    </Link>
  );
}
