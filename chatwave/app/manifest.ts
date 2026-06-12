// app/manifest.ts — Next.js auto-generates /manifest.webmanifest from this
import type { MetadataRoute } from "next";

const ICON =
  "https://xmfllrzxkcqexehrveur.supabase.co/storage/v1/object/public/avatars/IMG_7212.png";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GroveChat",
    short_name: "GroveChat",
    description: "Real-time messaging with friends",
    start_url: "/chat",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait",
    icons: [
      { src: ICON, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICON, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: ICON, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
