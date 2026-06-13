import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const LOGO =
  "https://xmfllrzxkcqexehrveur.supabase.co/storage/v1/object/public/avatars/IMG_7212.png";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ background: "#09090b" }}>
      <head>
        <link rel="apple-touch-icon" href={LOGO} />
        <link rel="preload" as="image" href={LOGO} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { background: #09090b !important; }
              #grove-splash {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #09090b;
                transition: opacity 0.45s ease;
              }
              #grove-splash img {
                width: 104px;
                height: 104px;
                border-radius: 24px;
                animation: grovePulse 1.3s ease-in-out infinite;
              }
              @keyframes grovePulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(0.9); opacity: 0.65; }
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
          <img src={LOGO} alt="GroveChat" fetchPriority="high" />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function hide() {
                  var s = document.getElementById('grove-splash');
                  if (!s) return;
                  s.classList.add('grove-hide');
                  setTimeout(function () { if (s) s.remove(); }, 500);
                }
                if (document.readyState === 'complete') {
                  setTimeout(hide, 300);
                } else {
                  window.addEventListener('load', function () { setTimeout(hide, 300); });
                }
              })();
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
