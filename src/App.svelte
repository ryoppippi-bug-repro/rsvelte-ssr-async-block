<script>
  import Child from "./Child.svelte";
</script>

<svelte:boundary>
  {const h = $derived(await Promise.resolve({ vitals: { n: 42 } }))}
  {const v = $derived(h.vitals)}
  <Child value={v.n}>{v.n}</Child>
</svelte:boundary>
