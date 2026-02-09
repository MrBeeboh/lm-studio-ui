import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (_) {}
    }
    return hljs.highlightAuto(code).value;
  },
});

/**
 * @param {string} raw
 * @returns {string} HTML string (use with {@html} in Svelte, or sanitize first)
 */
export function renderMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return marked.parse(raw, { async: false });
}
