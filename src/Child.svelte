<script>
  let { value, children } = $props();
</script>

<span data-value={value}>{@render children?.()}</span>
