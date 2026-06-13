// app/manifest.ts — Next.js auto-generates /manifest.webmanifest from this
import type { MetadataRoute } from "next";

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
      { src: "/IMG_7506.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/IMG_7505.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/IMG_7507.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
