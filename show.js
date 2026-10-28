import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const result = await server.transformRequest("/src/App.svelte", { ssr: true });
  console.log(result.code);
} finally {
  await server.close();
}
