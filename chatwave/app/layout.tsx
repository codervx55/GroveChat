import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroveChat",
  description: "Real-time chat, simple and fast.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GroveChat",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

const LOGO =
  "https://xmfllrzxkcqexehrveur.supabase.co/storage/v1/object/public/avatars/IMG_7212.png";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href={LOGO} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #grove-splash {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #09090b;
                transition: opacity 0.5s ease;
              }
              #grove-splash img {
                width: 96px;
                height: 96px;
                border-radius: 22px;
                animation: grovePulse 1.4s ease-in-out infinite;
              }
              @keyframes grovePulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(0.92); opacity: 0.7; }
              }
              #grove-splash.grove-hide {
                opacity: 0;
                pointer-events: none;
              }
            `,
          }}
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <div id="grove-splash">
          <img src={LOGO} alt="GroveChat" />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function () {
                setTimeout(function () {
                  var s = document.getElementById('grove-splash');
                  if (s) {
                    s.classList.add('grove-hide');
                    setTimeout(function () { s.remove(); }, 600);
                  }
                }, 400);
              });
            `,
          }}
        />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #27272a",
            },
          }}
        />
      </body>
    </html>
  );
}
