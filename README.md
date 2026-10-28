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

## Analysis

This comes from reading rsvelte at `5ed8ea3a34` (`crates/rsvelte_core/src/compiler/phases/3_transform/server/`). I have not patched and rebuilt it, so treat it as a likely cause rather than a confirmed one.

rsvelte tracks two kinds of async blockers on the server:

- **Instance blockers** come from top-level `await` in `<script>`. They are looked up in `eval_inputs.top_level_blocker_map` and carried as indices (`$$promises[N]`).
- **Local blockers** come from an async `{const}` / `{@const}` inside a block. `declaration_tag.rs` (around line 534) records each binding in `state.const_blocker_map` with a source string such as `promises[1]`.

`PromiseOptimiser::check_blockers` (`ast/visitors/shared.rs`, around line 1718) decides whether a component call needs `async_block`. It calls `expr_text_blockers`, which reads only `top_level_blocker_map`. The local map is never consulted. For `<Child value={v.n}>`, `v` is a local const, so no blocker is found, `optimiser.is_async()` stays false, and `component.rs` emits the bare call.

The visitors that do handle local consts, such as `each_block.rs` and `debug_tag.rs`, call `expr_local_const_blockers` as well and then use `create_child_block_combined`. The `PromiseOptimiser` path used by `component.rs` has no equivalent. Its `blockers` field is a `Vec<usize>`, which cannot hold a local source string like `promises[1]`.

A fix would likely mean letting `PromiseOptimiser` also collect local const blocker sources from `check_blockers`, and wrapping with `create_child_block_combined` in `render_block`. Any other visitor that goes through the optimiser (`render_tag.rs` and others) may have the same gap; I only checked components.

What the evidence in this repository shows:

- Only the missing wrapper differs between the official and rsvelte output (`pnpm run show` vs `pnpm run show:official`).
- Dropping the `{const}` and reading the value from a `<script>`-level `await` instead is not covered here, so I do not know whether that case works.

## How it was found

I found it in a SvelteKit app, not in plain Vite. I replaced `@sveltejs/vite-plugin-svelte` with `@rsvelte/vite-plugin-svelte` through a package-manager override, as the rsvelte README describes for SvelteKit:

```yaml
overrides:
  "@sveltejs/vite-plugin-svelte": npm:@rsvelte/vite-plugin-svelte@^0.5.3
```

- `@sveltejs/kit` 3.0.1, Svelte 5.57.2, Vite 8.3.4, `experimental.async: true`.
- Typecheck, the production build and the unit tests all passed.
- Rendering the home page in `vite dev` returned a 500 with `TypeError: v is not a function`. The same app with the official plugin returned 200.
- The failing component is a `{const h = $derived(await …)}` / `{const v = $derived(h.vitals)}` pair inside `<svelte:boundary>`, where `v` is passed as a prop to child components.

SvelteKit is not needed to reproduce it. The reduced case in this repository uses plain Vite and `svelte/server`.

## Files

`vite.config.js` picks the plugin from the environment: `RSVELTE=1` loads rsvelte, anything else
the official plugin. The `repro` and `show` scripts set it; the `:official` ones do not.

Versions: Svelte 5.57.2, Vite 8.3.4, `experimental.async: true`, `dev: false`.
