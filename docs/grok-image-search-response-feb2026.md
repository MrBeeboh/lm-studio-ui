# Grok API – Image Search & Rendering (Response from Grok, Feb 14, 2026)

**Goal:** Search the web for real images and render them in our UI (carousel). No image generation.

**Summary of Grok's answers:**

- **Q1:** No public `search_images` tool. Images appear via **render markup** in the stream (e.g. `<render_searched_image image_id="...">`) in `output_text.delta`. API does not return plain image URLs in a field; we must parse deltas and interpret `image_id` (fetch from xAI CDN or placeholder).
- **Q2:** Add **`enable_image_understanding: true`** at the root of the request (not inside tools). No new tool type. Keeps `web_search` + `x_search`. This gives Grok `view_image` for analysis and can increase image render markup in the stream.
- **Q3:** No dedicated images array. Images are **embed in stream** as render components. Typical format: `<render_searched_image image_id="123"/>`. Parser must look for these tags in deltas, extract `image_id`, and display (fetch by id from xAI CDN or placeholder). `server_side_tool_usage` may mention `SERVER_SIDE_TOOL_VIEW_IMAGE` (metadata only).
- **Q4:** Minimal body that often triggers render markup: same as ours plus `"enable_image_understanding": true`. Example query: "Show me large pictures of the Numerica Skate Ribbon in Spokane Valley at night during Valentine's Day". Stream and watch deltas for `render_searched_image` with `image_id`. Exact CDN URL for image by id not public—test by logging raw deltas.

**Implementation:** Add `enable_image_understanding: true` to Grok request; parse deltas for `<render_searched_image image_id="..." size="...">`; strip tags from text; emit image refs to UI; render carousel.

**Follow-up from Grok (when model said "I cannot display images"):**
- Add **`{ "type": "search_images" }`** to the tools array (built-in, like web_search/x_search). We now send it.
- Rendering can also use internal tags in the stream. `enable_image_understanding: true` is required (we send it).
- Use **explicit visual prompts** to trigger render: "Show me pictures of...", "Render large photos of...", "Visuals of...".
- Parser now extracts optional `size`; CDN URL pattern to try: `https://cdn.x.ai/images?id={image_id}&size=LARGE` (log raw deltas if no images to confirm tag format).
- Test queries that trigger reliably: "Render large photos of couples skating at Numerica Skate Ribbon on Valentine's night"; "Show me images of Spokane Chiefs hockey action at the arena".
