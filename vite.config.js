import { defineConfig } from "vite";

// The official plugin is the default; `RSVELTE=1` swaps in rsvelte for the same component.
const { svelte } =
  process.env.RSVELTE === "1"
    ? await import("@rsvelte/vite-plugin-svelte")
    : await import("@sveltejs/vite-plugin-svelte");

export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: false, experimental: { async: true } } })],
});
