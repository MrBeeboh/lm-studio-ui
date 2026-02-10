# Metrics server (VRAM + DRAM for floating panel)

The floating **Metrics** panel in ATOM can show **Tok/s**, **VRAM**, and **DRAM**. Tok/s comes from the app; VRAM and DRAM come from this local Python server (Windows Task Manager–style data).

## Quick start

1. **Install dependency (once):**
   ```bash
   pip install -r scripts/requirements-metrics.txt
   ```
   Or: `pip install psutil`

2. **Run the server:**
   ```bash
   python scripts/metrics_server.py
   ```
   Default port: **8766**. Use another port if needed: `python scripts/metrics_server.py 8767`

3. **Use the app:** Open the Metrics panel (📊). The UI polls `http://localhost:8766/metrics` every 2.5s. VRAM and DRAM will show as "used / total GB" when the server is running.

## What it uses

- **DRAM:** `psutil` (system RAM — same kind of info as Task Manager’s “Memory”).
- **VRAM:** `nvidia-smi` (NVIDIA GPU memory). Requires NVIDIA drivers and `nvidia-smi` in your PATH. If you don’t have an NVIDIA GPU or nvidia-smi isn’t available, VRAM will show "—" and DRAM will still work.

## Custom URL

If you run the server on a different host/port, set in the browser console (or we could add a setting later):

```js
localStorage.setItem('metricsEndpointUrl', 'http://localhost:8767');
```

Then reload the app.
