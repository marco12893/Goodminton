import Link from "next/link";

export default function BackIcon({ href, className = "" }) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white/8 p-3 text-white/92 backdrop-blur-xl transition-all hover:bg-white/12 hover:scale-105 ${className}`}
      aria-label="Back to previous page"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </Link>
  );
}
