"use client";

import { usePathname } from "next/navigation";
import { Home, Share2, PieChart, Settings, Trophy } from "lucide-react";
import { FullscreenNavLink } from "@/components/FullscreenNavOverlay";

const navItems = [
  { label: "Home", href: "", icon: Home },
  { label: "Tournament", href: "/tournaments", icon: Trophy },
  { label: "Compare", href: "/compare", icon: Share2 },
  { label: "Match Log", href: "/match-log", icon: PieChart },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function ClubBottomNav({ clubSlug, pendingJoinRequestsCount = 0 }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 w-full bg-[#1c1d22] px-3 pb-6 pt-3 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] border-t border-white/10">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1.5">
        {navItems.map((item) => {
          const href = `/clubs/${clubSlug}${item.href}`;
          const isActive = pathname === href;
          const Icon = item.icon;

          const showBadge = item.label === "Settings" && pendingJoinRequestsCount > 0;

          return (
            <FullscreenNavLink
              key={item.label}
              href={href}
              className={`relative flex flex-1 flex-col items-center justify-center rounded-xl py-2.5 transition-all duration-200 ${
                isActive
                  ? "bg-white text-[#1c1d22] shadow-sm" // Background putih, teks parent gelap
                  : "bg-transparent text-white/50 hover:text-white/90"
              }`}
            >
              {showBadge && (
                <span className="absolute right-2 top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white shadow-lg">
                  {pendingJoinRequestsCount > 9 ? "9+" : pendingJoinRequestsCount}
                </span>
              )}
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
            </FullscreenNavLink>
          );
        })}
      </div>
    </nav>
  );
}
