<script>
  import { onMount } from 'svelte';
  import { isStreaming, settings } from '$lib/stores.js';
  import { primeAudio, playTyping } from '$lib/audio.js';

  let typingTimer = null;

  function startTypingLoop() {
    if (typingTimer) return;
    typingTimer = setInterval(() => {
      if ($settings.audio_enabled && $settings.audio_typing && $isStreaming) {
        playTyping($settings.audio_volume);
      }
    }, 120);
  }

  function stopTypingLoop() {
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
  }

  $effect(() => {
    if ($settings.audio_enabled && $settings.audio_typing && $isStreaming) startTypingLoop();
    else stopTypingLoop();
  });

  onMount(() => {
    const prime = () => primeAudio();
    window.addEventListener('pointerdown', prime, { passive: true });
    window.addEventListener('keydown', prime);
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
      stopTypingLoop();
    };
  });
</script>
