/**
 * Get provider/designer emoji icon for a model based on its name.
 * Used next to model names in dropdowns and displays.
 * @param {string} modelName - The model identifier
 * @returns {string} Emoji icon
 */
export function getModelProviderIcon(modelName) {
  if (!modelName || typeof modelName !== 'string') return '🤖';
  const name = modelName.toLowerCase();
  if (/qwen|qwq/.test(name)) return '🔷';
  if (/dolphin/.test(name)) return '🐬';
  if (/llama|meta/.test(name)) return '🦙';
  if (/mistral|mixtral/.test(name)) return '🌪️';
  if (/gemma|google/.test(name)) return '💎';
  if (/phi|microsoft/.test(name)) return '🔵';
  if (/gpt|openai/.test(name)) return '🤖';
  if (/claude|anthropic/.test(name)) return '🟠';
  if (/zai|inference/.test(name)) return '⚡';
  if (/codegen|starcoder/.test(name)) return '💻';
  if (/codellama|code.?llama/.test(name)) return '💻';
  if (/wizardlm|wizard/.test(name)) return '🧙';
  if (/deepseek/.test(name)) return '🔍';
  if (/vicuna/.test(name)) return '🦙';
  if (/orca/.test(name)) return '🐋';
  if (/yi|01-ai/.test(name)) return '🎯';
  if (/code/.test(name)) return '💻';
  return '🤖';
}
