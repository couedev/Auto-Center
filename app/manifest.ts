import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lava Jato - Gestão ",
    short_name: "Lava Jato",
    description: "Gestão de atendimentos, clientes e serviços do seu lava-jato.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0f0c",
    theme_color: "#0d0f0c",
    categories: ["productivity", "education"],
    icons: [
      {
        src: "/icon/icon-autocenter-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/icon-autocenter-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
