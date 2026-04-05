import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const GITCV_API_URL = process.env.GITCV_API_URL || "http://localhost:5079";

function scopeGithubDarkMarkdown(): Plugin {
  return {
    name: "scope-github-dark-markdown",
    transform(code, id) {
      if (!id.includes("github-markdown-dark")) return;
      return {
        code: code.replace(/\.markdown-body/g, ".dark .markdown-body"),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), scopeGithubDarkMarkdown()],
  server: {
    proxy: {
      "/api": {
        target: GITCV_API_URL,
        changeOrigin: true,
      },
    },
  },
});
