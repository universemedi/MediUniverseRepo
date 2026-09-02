import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env["VITE_API_BASE_URL"] || "http://localhost:8080";

  return {
    server: {
      port: 3000,
      strictPort: true,
      // "true" binds both 127.0.0.1 and ::1 — a plain "localhost" bound only to the IPv6
      // loopback on this machine, so a standard (IPv4) hosts-file entry for local org-domain
      // testing (e.g. "127.0.0.1 sunrise.mediunivers.local") couldn't even connect.
      host: true,
      // Lets a locally hosts-file-mapped org domain (e.g. "sunrise.mediunivers.local") through
      // Vite's Host-header check — the server still only binds to localhost above, so this is
      // safe for local dev; a real deployment terminates custom domains at a reverse proxy.
      allowedHosts: true,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        "/oauth2": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    plugins: [
      tsConfigPaths(),
      tanstackStart({
        server: {
          entry: "server",
        },
      }),
      tailwindcss(),
      nitro(),
      react(),
    ],
  };
});
