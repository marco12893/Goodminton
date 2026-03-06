"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Share2, PieChart, Settings } from "lucide-react";

const navItems = [
  { label: "Home", href: "", icon: Home },
  { label: "Compare", href: "/compare", icon: Share2 },
  { label: "Match Log", href: "/match-log", icon: PieChart },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function ClubBottomNav({ clubSlug }) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 mt-6 rounded-t-[2rem] border border-white/10 bg-[#1c1d22]/95 px-3 pb-5 pt-3 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="mx-auto mb-3 h-1 w-20 rounded-full bg-white/60" />
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {navItems.map((item) => {
          const href = `/clubs/${clubSlug}${item.href}`;
          const isActive = pathname === href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={href}
              className={`flex min-h-20 flex-col items-center justify-center rounded-xl px-1 py-2.5 text-center transition-all duration-200 ${
                isActive
                  ? "bg-white text-[#1c1d22] shadow-sm"
                  : "bg-transparent text-white/50 hover:text-white/90"
              }`}
            >
              <Icon 
                className="mb-1 h-5 w-5"
                strokeWidth={isActive ? 2.5 : 1.5}
                color={isActive ? "#1c1d22" : "currentColor"}
              />
              <span 
                className={`text-[10px] font-semibold tracking-wide ${
                  isActive ? "text-[#1c1d22]" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
