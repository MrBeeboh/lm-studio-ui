import { conversations, activeConversationId } from '$lib/stores.js';
import { deleteAllConversations, createConversation, listConversations, getMessageCount } from '$lib/db.js';

/**
 * Delete all conversations and messages, create one new conversation, and set it active.
 * Call after user confirms. Updates conversations and activeConversationId stores.
 */
export async function bulkEraseChats() {
  await deleteAllConversations();
  const id = await createConversation();
  let list = await listConversations();
  list = await Promise.all(list.map(async (c) => ({ ...c, messageCount: await getMessageCount(c.id) })));
  conversations.set(list);
  activeConversationId.set(id);
}
