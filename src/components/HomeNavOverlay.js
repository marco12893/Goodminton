"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";

const NavOverlayContext = createContext(() => {});

export function HomeNavOverlayProvider({ children }) {
  const [pending, setPending] = useState(false);

  return (
    <NavOverlayContext.Provider value={() => setPending(true)}>
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07131f]/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-8 py-6 shadow-2xl">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-teal-400 border-r-transparent" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Loading</p>
              <p className="text-xs text-slate-400">Taking you there…</p>
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </NavOverlayContext.Provider>
  );
}

export function HomeNavLink({ href, className, children, ...props }) {
  const start = useContext(NavOverlayContext);

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (props.onClick) props.onClick(event);
        if (!event.defaultPrevented) {
          start();
        }
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
