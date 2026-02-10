#!/usr/bin/env python3
"""
Local metrics server for ATOM floating metrics panel.
Serves VRAM (GPU) and DRAM (system RAM) so the browser can display them.

Usage:
  pip install psutil
  python scripts/metrics_server.py [port]

Then in the app, set localStorage 'metricsEndpointUrl' to http://localhost:8766
(or the UI will try that by default). Open the Metrics panel to see Tok/s, VRAM, DRAM.

VRAM: from nvidia-smi (NVIDIA GPUs; must be in PATH).
DRAM: from psutil (system RAM).
"""

import json
import subprocess
import sys

try:
    import psutil
except ImportError:
    print("Install psutil: pip install psutil", file=sys.stderr)
    sys.exit(1)

# Python 3.7+ http.server
from http.server import HTTPServer, BaseHTTPRequestHandler


def get_dram_gb():
    """Return (used_gb, total_gb) for system RAM."""
    v = psutil.virtual_memory()
    return (v.used / (1024 ** 3), v.total / (1024 ** 3))


def get_vram_gb():
    """Return (used_gb, total_gb) for GPU VRAM via nvidia-smi, or (None, None)."""
    try:
        out = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.used,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=3,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0) if sys.platform == "win32" else 0,
        )
        if out.returncode != 0 or not out.stdout or not out.stdout.strip():
            return None, None
        line = out.stdout.strip().split("\n")[0]
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 2:
            def first_number(s):
                for tok in (s or "").split():
                    try:
                        return float(tok)
                    except ValueError:
                        continue
                return 0.0
            used_mib = first_number(parts[0])
            total_mib = first_number(parts[1])
            return (used_mib / 1024, total_mib / 1024)
    except (FileNotFoundError, subprocess.TimeoutExpired, ValueError, IndexError):
        pass
    return None, None


class MetricsHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # quiet by default

    def do_GET(self):
        if self.path in ("/", "/metrics"):
            dram_used, dram_total = get_dram_gb()
            vram_used, vram_total = get_vram_gb()
            data = {
                "dram_used_gb": round(dram_used, 2),
                "dram_total_gb": round(dram_total, 2),
                "vram_used_gb": round(vram_used, 2) if vram_used is not None else None,
                "vram_total_gb": round(vram_total, 2) if vram_total is not None else None,
            }
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f"Metrics server: http://localhost:{port}/metrics")
    print("(VRAM from nvidia-smi, DRAM from psutil; CORS enabled for ATOM UI)")
    try:
        HTTPServer(("", port), MetricsHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    except OSError as e:
        if "WinError 10048" in str(e) or "Address already in use" in str(e):
            print(f"Port {port} in use. Try: python scripts/metrics_server.py 8767", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
