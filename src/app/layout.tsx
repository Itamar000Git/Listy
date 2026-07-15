import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MusicProvider } from "@/components/music/MusicProvider";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "Listy",
  description: "לוח משימות חזותי למשפחה",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="flex h-full min-h-dvh flex-col bg-background text-text">
        <AuthProvider>
          <MusicProvider>{children}</MusicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
