import type { MetadataRoute } from "next";

/**
 * Drecera a la pantalla d'inici del mòbil (Android/Chrome): nom, icona i
 * pantalla completa, sense la barra d'adreces del navegador.
 * L'icona surt de deploy/icon/icon.svg.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hyrox Control",
    short_name: "Hyrox",
    start_url: "/",
    display: "standalone",
    background_color: "#FF9500",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
