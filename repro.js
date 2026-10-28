import "svelte/internal/flags/async";
import { createServer } from "vite";
import { render } from "svelte/server";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { default: App } = await server.ssrLoadModule("/src/App.svelte");
  const { body } = await render(App, { props: {} });
  console.log(body);
} finally {
  await server.close();
}
