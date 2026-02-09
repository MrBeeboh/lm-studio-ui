<script>
  import { uiTheme } from '$lib/stores.js';
  import { UI_THEME_OPTIONS } from '$lib/themeOptions.js';

  /** When true, use a compact select (smaller padding, shorter label). */
  let { compact = false } = $props();
</script>

<select
  class="rounded-lg px-2 text-xs font-medium cursor-pointer border transition-colors focus:outline-none focus:ring-1 {compact ? 'py-1.5' : 'py-2'}"
  style="background: var(--ui-input-bg); color: var(--ui-text-primary); border-color: var(--ui-border); min-width: {compact ? '8rem' : '10rem'};"
  bind:value={$uiTheme}
  title="UI color theme"
  aria-label="UI color theme">
  {#each UI_THEME_OPTIONS as opt}
    <option value={opt.value}>{opt.label}</option>
  {/each}
</select>
