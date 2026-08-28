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
      host: "localhost",
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
