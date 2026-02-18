/**
 * @file cockpitCopy.js
 * @description Witty, contextual status copy for the Cockpit (chat) UI:
 * LM Studio connection, loading models, sending/streaming. Keeps tone consistent with Arena.
 */

// ---------- LM Studio connection status (header) ----------
/** Shown when we're checking the connection (polling). */
export const COCKPIT_LM_CHECKING = [
  'Checking LM Studio…',
  'Pinging the local brain…',
  'Seeing if the server is awake…',
  'Knocking on localhost…',
  'Checking the connection…',
];

/** Shown when LM Studio is connected. */
export const COCKPIT_LM_CONNECTED = [
  'LM Studio connected',
  'LM Studio is here',
  'Ready to talk',
  'Connected',
];

/** Shown when LM Studio is not reachable. */
export const COCKPIT_LM_UNREACHABLE = [
  'LM Studio not reachable',
  'Can\'t reach LM Studio',
  'Server not answering',
  'LM Studio might be sleeping',
];

/** Shown when LM Studio is down but Grok/DeepSeek API keys are set (cloud models still work). */
export const COCKPIT_CLOUD_APIS_AVAILABLE = [
  'Cloud APIs (Grok, DeepSeek) available',
  'Grok / DeepSeek ready',
  'Cloud models available',
];

// ---------- Loading models (model dropdown) ----------
export const COCKPIT_LOADING_MODELS = [
  'Asking LM Studio for the model list…',
  'Loading models…',
  'Fetching the roster…',
  'Seeing who\'s available…',
  'One sec, checking the garage…',
  'Loading the model menu…',
];

// ---------- Sending / streaming (chat input area) ----------
export const COCKPIT_SENDING = [
  'Sending…',
  'Thinking…',
  'Off to the model…',
  'Waiting on the reply…',
  'In the pipeline…',
  'Your message, their problem now…',
];

/** Shown when web search is in progress before send. */
export const COCKPIT_SEARCHING = [
  'Searching the web…',
  'Asking the internet…',
  'Looking it up…',
  'Fact-checking in progress…',
];

/** Pick one at random. */
export function pickWitty(lines) {
  if (!lines?.length) return '';
  return lines[Math.floor(Math.random() * lines.length)];
}
