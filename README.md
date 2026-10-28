# rsvelte: SSR drops `$$renderer.async_block` around a component that reads an async `{const}`

Reproduction for a server-side rendering (SSR) bug in
[rsvelte](https://github.com/baseballyama/rsvelte) 0.5.3
(`@rsvelte/vite-plugin-svelte` 0.5.3, `@rsvelte/vite-plugin-svelte-native` 0.3.17).

```sh
pnpm install
pnpm run repro           # rsvelte: TypeError: v is not a function
pnpm run repro:official  # @sveltejs/vite-plugin-svelte: renders fine
```

`src/App.svelte` reads a `{const … = $derived(await …)}` value as a prop of a child component:

```svelte
<svelte:boundary>
  {const h = $derived(await Promise.resolve({ vitals: { n: 42 } }))}
  {const v = $derived(h.vitals)}
  <Child value={v.n}>{v.n}</Child>
</svelte:boundary>
```

`pnpm run show` and `pnpm run show:official` print the generated server code. The official
compiler wraps the `Child` call so it waits for `promises[1]` (the `v` derived):

```js
$$renderer.async_block([promises[1]], ($$renderer) => {
  Child($$renderer, { value: v().n, … });
});
```

rsvelte emits the call without that wrapper, so `v().n` runs before the `run([...])` step
has assigned `v`:

```
TypeError: v is not a function
    at App (src/App.svelte:25:11)
```

`vite.config.js` picks the plugin from the environment: `RSVELTE=1` loads rsvelte, anything else
the official plugin. The `repro` and `show` scripts set it; the `:official` ones do not.

Versions: Svelte 5.57.2, Vite 8.3.4, `experimental.async: true`, `dev: false`.
