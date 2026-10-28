import { defineConfig } from "vite";

// `PLUGIN=official` swaps in the reference plugin so the same component can be compared.
const { svelte } =
  process.env.PLUGIN === "official"
    ? await import("@sveltejs/vite-plugin-svelte")
    : await import("@rsvelte/vite-plugin-svelte");

export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: false, experimental: { async: true } } })],
});
