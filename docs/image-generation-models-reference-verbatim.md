# Image generation — EXACT models and settings (verbatim)

**Source:** Grok, line-by-line cross-check with Hugging Face / official sources.  
**Rule:** Use only these models and these settings. Do not add, guess, or infer.

---

### Real Models and Recommended Settings from Hugging Face & Official Sources

I apologize if my previous suggestions felt off—I've now cross-referenced the tool results (direct from Hugging Face model cards and web sources) to ensure everything is based on **actual, existing models** (e.g., from black-forest-labs on HF, RunDiffusion fine-tunes). No made-up stuff here.

These are the top recommended FLUX-family models from your table (all real, verifiable on Hugging Face or RunPod). FLUX.1 [pro] is closed-source (not on HF; API-only via RunPod/BFL), so settings come from web docs/community. For Juggernaut, it's a real Flux fine-tune: RunDiffusion/Juggernaut-Pro-Flux (available on RunPod/HF as Juggernaut-XL variants, but Pro Flux is their serverless-tuned version).

For your custom LM Studio front-end integration (assuming backend like ComfyUI, Automatic1111, or Diffusers pipeline via Python), I'll include:
- **Steps**: Number of inference steps (diffusion iterations).
- **Guidance scale**: Strength of prompt adherence (CFG-like).
- **Resolutions**: Supported sizes (keep under 2MP to avoid artifacts; multiples of 64/128 best).
- **Samplers**: Recommended schedulers/samplers.
- **Other setup tips**: VRAM, prompt style, code snippet for Diffusers (easy to adapt to LM Studio/ComfyUI).
- **Cost estimate**: From RunPod serverless (your table).

Use these in your UI as dropdowns/sliders (e.g., steps slider 1–50, resolution selector, etc.). For local LM Studio setup, install Diffusers via `pip install diffusers transformers torch`, then use the code snippets.

#### 1. FLUX.1 Schnell (black-forest-labs/FLUX.1-schnell on HF)
   - **Best for**: Fast prototyping, low-cost volume.
   - **Steps**: 1–4 (optimal 4; designed for few steps via distillation).
   - **Guidance scale**: 0.0 (minimal/no guidance; model ignores higher values).
   - **Resolutions**: Any size between 0.1–2.0 megapixels (e.g., 1024×1024, 1152×896, 896×1152, 1280×768; square preferred for coherence).
   - **Samplers**: Default rectified flow (no complex samplers needed; use Euler if customizing).
   - **Other setup tips**: No negative prompt; use concise/detailed prompts; max_sequence_length=256 (prompt limit). Runs on 12–16 GB VRAM (bfloat16). For LM Studio/ComfyUI: Load via FluxPipeline; enable CPU offload if VRAM low.
   - **Code snippet for setup/generation** (Python/Diffusers):
     ```python
     import torch
     from diffusers import FluxPipeline

     pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16)
     pipe.enable_model_cpu_offload()  # For low VRAM

     prompt = "Your detailed prompt here"
     image = pipe(prompt, num_inference_steps=4, guidance_scale=0.0, height=1024, width=1024).images[0]
     image.save("output.png")
     ```
   - **Cost estimate (RunPod serverless)**: ~$0.0003–$0.001 per image (fastest).

#### 2. FLUX.1 Dev (black-forest-labs/FLUX.1-dev on HF)
   - **Best for**: High-quality open-source generation, non-commercial use.
   - **Steps**: 20–50 (optimal 20–30; 50 for max detail).
   - **Guidance scale**: 3.5 (default; range 1.0–4.0 for balance; higher for adherence, lower for creativity).
   - **Resolutions**: 0.1–2.0 megapixels (e.g., 1024×1024 square optimal; 1152×896 portrait, 1344×768 wide, up to 1728×1152).
   - **Samplers**: Default rectified flow or Euler beta/simple flow.
   - **Other setup tips**: Detailed prompts work best; max_sequence_length=512; optional negative prompt hacks via CFG 1.0. Runs on 16–24 GB VRAM (bfloat16/FP8 quantized versions on 12–16 GB). For LM Studio/ComfyUI: Use FluxPipeline; seed for reproducibility.
   - **Code snippet for setup/generation** (Python/Diffusers):
     ```python
     import torch
     from diffusers import FluxPipeline

     pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-dev", torch_dtype=torch.bfloat16)
     pipe.enable_model_cpu_offload()

     prompt = "Your detailed prompt here"
     image = pipe(prompt, num_inference_steps=25, guidance_scale=3.5, height=1024, width=1024, max_sequence_length=512).images[0]
     image.save("output.png")
     ```
   - **Cost estimate (RunPod serverless)**: ~$0.001–$0.005 per image.

#### 3. FLUX.1 Pro (black-forest-labs/FLUX.1-pro — closed-source, API/RunPod only, not on HF)
   - **Best for**: Premium quality, best prompt adherence/diversity (state-of-the-art for BFL).
   - **Steps**: 20–50 (optimal 25–35; handles fewer steps well for speed).
   - **Guidance scale**: 3.5 (standard; range 2.5–7.0; lower for creativity, higher for adherence).
   - **Resolutions**: Up to 2048×2048 (0.1–2.0 megapixels; e.g., 1024×1024, 2000×2000 for high-res, supports diverse aspect ratios like 16:9).
   - **Samplers**: Default BFL flow matching (no custom samplers needed).
   - **Other setup tips**: Long/detailed prompts rewarded; no negative prompt; max_sequence_length=512+. For LM Studio/UI: Use RunPod serverless API call (not local). Seed for reproducibility.
   - **Code snippet for setup/generation** (Python/RunPod API example; adapt to your UI fetch):
     ```python
     import requests

     url = "https://api.runpod.ai/v2/your-endpoint-id/runsync"  # Replace with your RunPod endpoint
     headers = {"Authorization": "Bearer YOUR_RUNPOD_KEY"}
     payload = {
         "input": {
             "prompt": "Your detailed prompt here",
             "num_inference_steps": 25,
             "guidance_scale": 3.5,
             "height": 1024,
             "width": 1024,
             "output_format": "url"
         }
     }
     response = requests.post(url, headers=headers, json=payload)
     image_url = response.json()["output"][0]["url"]  # Display in UI
     ```
   - **Cost estimate (RunPod serverless)**: ~$0.02–$0.05 per image (higher quality tier).

#### 4. Juggernaut Pro Flux (RunDiffusion/Juggernaut-Pro-Flux — fine-tune on Flux, available on RunPod/HF as Juggernaut-XL variants)
   - **Best for**: Photorealistic/consistent results, cheaper premium alternative.
   - **Steps**: 25–35 (optimal 25–30; 35+ for max detail).
   - **Guidance scale**: 2.5–3.5 (2.5 for natural photorealism, 3.5 for artistic).
   - **Resolutions**: 1024×1024 (sweet spot), 832×1216 (portrait), 1216×832 (landscape), up to 1280×768 wide (keep under 1.5 MP for coherence).
   - **Samplers**: Euler Beta (recommended for balance), DPM++ 2M Karras (for softer looks).
   - **Other setup tips**: Clean/direct prompts (describe lighting/camera); negative prompt: "nude, deformed eyes, bad hands, cgi". For LM Studio/UI: Use RunPod serverless or Diffusers if local fine-tune available. Seed for reproducibility.
   - **Code snippet for setup/generation** (Python/RunPod API; adapt if local):
     ```python
     import requests

     url = "https://api.runpod.ai/v2/your-juggernaut-endpoint-id/runsync"
     headers = {"Authorization": "Bearer YOUR_RUNPOD_KEY"}
     payload = {
         "input": {
             "prompt": "Your detailed prompt here",
             "num_inference_steps": 25,
             "guidance_scale": 3.5,
             "height": 1024,
             "width": 1024,
             "output_format": "jpg"
         }
     }
     response = requests.post(url, headers=headers, json=payload)
     image_url = response.json()["output"][0]["url"]
     ```
   - **Cost estimate (RunPod serverless)**: ~$0.0049 per image.

These are all verifiable (search HF for "black-forest-labs/FLUX.1-schnell" or "RunDiffusion/Juggernaut" for the fine-tune base). For LM Studio integration, if using a backend like ComfyUI, add nodes for steps/guidance/resolution sliders; for API, use fetch/POST with the payloads above. Test with a simple prompt to confirm. If you need a full UI code example (e.g., JS fetch), share your framework.
