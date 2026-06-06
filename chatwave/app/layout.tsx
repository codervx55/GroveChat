import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: "GroveChat — Real-time Messaging",
  description: "A modern real-time chat application",
  icons: {
    icon: "https://xmfllrzxkcqexehrveur.supabase.co/storage/v1/object/public/avatars/IMG_7205.png",
    apple: "https://xmfllrzxkcqexehrveur.supabase.co/storage/v1/object/public/avatars/IMG_7205.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${font.variable} antialiased bg-zinc-950 text-zinc-100`}
        style={{ fontFamily: "var(--font-main), system-ui, sans-serif" }}
      >
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #3f3f46",
              borderRadius: "12px",
              fontSize: "14px",
              fontFamily: "var(--font-main)",
            },
          }}
        />
      </body>
    </html>
  );
}
