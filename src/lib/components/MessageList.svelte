<script>
  import { tick } from 'svelte';
  import { activeMessages } from '$lib/stores.js';
  import MessageBubble from '$lib/components/MessageBubble.svelte';

  let listEl;

  $: msgs = $activeMessages;

  function scrollToBottom() {
    tick().then(() => {
      const scrollParent = listEl?.parentElement;
      if (scrollParent) scrollParent.scrollTop = scrollParent.scrollHeight;
    });
  }

  $: msgs, scrollToBottom();
</script>

<div class="max-w-[min(960px,92%)] mx-auto py-4 px-3 w-full" bind:this={listEl}>
  <div class="space-y-4">
    {#each msgs as msg (msg.id)}
      <div class="message-entrance">
        <MessageBubble message={msg} />
      </div>
    {/each}
  </div>
</div>
