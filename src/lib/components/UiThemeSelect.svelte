<script>
  import { uiTheme } from '$lib/stores.js';
  import { UI_THEME_OPTIONS } from '$lib/themeOptions.js';
  import ThemePickerModal from '$lib/components/ThemePickerModal.svelte';

  /** When true, use a compact select (smaller padding, shorter label). */
  let { compact = false } = $props();
  let pickerOpen = $state(false);

  const currentLabel = $derived(UI_THEME_OPTIONS.find((o) => o.value === $uiTheme)?.label ?? $uiTheme);
</script>

<button
  type="button"
  class="rounded-lg px-2 text-xs font-semibold cursor-pointer border transition-colors focus:outline-none focus:ring-1 truncate {compact ? 'py-1.5' : 'py-2'}"
  style="background: var(--ui-input-bg); color: var(--ui-text-primary); border-color: var(--ui-border); min-width: {compact ? '8rem' : '10rem'}; letter-spacing: 0.02em; text-transform: none;"
  title="UI color theme"
  aria-label="UI color theme"
  onclick={() => (pickerOpen = true)}>
  <span style="opacity:0.7; font-weight:600; margin-right:0.4em;">Theme</span> {currentLabel}
</button>

<ThemePickerModal bind:open={pickerOpen} />
