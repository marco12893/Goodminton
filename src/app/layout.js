import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Goodminton",
  description: "Badminton club stats platform for leaderboards, Elo ratings, and player performance analysis.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "1536x1536" }],
    shortcut: "/favicon.png",
    apple: [{ url: "/favicon.png", sizes: "1536x1536", type: "image/png" }],
  },
  openGraph: {
    title: "Goodminton",
    description: "Badminton club stats platform for leaderboards, Elo ratings, and player performance analysis.",
    images: [
      {
        url: "/favicon.png",
        width: 1536,
        height: 1536,
        alt: "Goodminton",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Goodminton",
    description: "Badminton club stats platform for leaderboards, Elo ratings, and player performance analysis.",
    images: ["/favicon.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Goodminton",
  },
};

export const viewport = {
  themeColor: "#07111f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
