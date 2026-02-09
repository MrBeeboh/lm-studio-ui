import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const target = document.getElementById('app')
if (!target) {
  document.body.innerHTML = '<pre style="padding:1rem;color:red;">No #app element found.</pre>'
} else {
  try {
    mount(App, { target })
  } catch (err) {
    target.innerHTML = `<pre style="padding:1rem;white-space:pre-wrap;color:red;font-family:monospace;">Mount failed:\n${err?.message ?? err}\n\n${err?.stack ?? ''}</pre>`
    console.error('ATOM mount error', err)
  }
}
