# VIDEO PRODUCTION RULES — READ ENTIRELY BEFORE WRITING CODE

## VIRAL VIDEO PRINCIPLES — ENFORCE ON EVERY BUILD:
- **Hooks must appear within the first 2 seconds** (≤ 60 frames at 30fps)
- **Scene pacing must be fast** — 1–2 seconds per scene max (30–60 frames)
- **No static frames** — something must be moving in every single frame
- **Text must be large, bold, and mobile-optimized** — min 56px, prefer 72px+
- **Videos must loop seamlessly** — last frame should visually connect to first
- **Use curiosity gaps and delayed reveals** — never show price before building tension
- **Include pattern interrupts frequently** — flash cuts, scale punches, color shifts every 2–3s
- **Follow narrative structure strictly: Hook → Value → Proof → CTA**
- **End with urgency-driven CTA** — scarcity, FOMO, or time pressure
- **Adapt style based on platform:**
  - TikTok: aggressive hooks, rapid cuts, informal language, trend-aware
  - Instagram: cleaner aesthetic, slightly slower pacing, premium tone

## MULTI-VARIANT A/B HOOK GENERATION — MANDATORY:
Always generate **3 hook variants** covering different emotional triggers:
```typescript
const HOOK_VARIANTS = {
  curiosity:  "HOW IS THIS STILL AVAILABLE",   // open loop
  value:      "THIS SHOULDN'T BE THIS CHEAP",   // price shock
  scarcity:   "LAST ONE IN STOCK",              // FOMO
};
```
- Render all 3 as separate output files: `out/[name]-hook-a.mp4`, `[name]-hook-b.mp4`, `[name]-hook-c.mp4`
- Only the hook scene changes between variants — all other scenes are identical
- Report which hook variant was used in console output

## CRITICAL FAILURES TO NEVER REPEAT:
- NEVER show a gradient/color background without a product image underneath it
- NEVER put hook text over a product image — hook gets its own isolated black frame
- NEVER show a price reveal on empty black background
- NEVER use system fonts — always load a Google Font
- NEVER let product images have padding/letterboxing — they MUST fill the entire frame edge to edge using objectFit: cover
- NEVER fade to near-empty frames during image transitions

## Always load these Remotion skill files before writing any code:
- rules/animations.md
- rules/audio.md
- rules/audio-visualization.md
- rules/light-leaks.md
- rules/sequencing.md
- rules/fonts.md
- rules/images.md
- rules/transitions.md

## FONT RULES — MANDATORY:
Load these exact fonts using @remotion/google-fonts BEFORE any component renders:
```typescript
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: bebas } = loadBebasNeue();
const { fontFamily: inter } = loadInter();
```

- Hook text: Bebas Neue, 120px, letterSpacing: 4px
- Price: Bebas Neue, 96px, color #00FF88
- Title: Inter 700, 44px
- Badges/labels: Inter 600, 32px
- CTA: Bebas Neue, 72px

## IMAGE RULES — MANDATORY:
Every product image MUST:
- Fill 100% width AND 100% height of composition
- Use objectFit: 'cover' — NEVER contain or fill with padding
- Apply Ken Burns: alternate scale 110%→100% and 100%→110% and pan direction per image
- Cross-fade: opacity goes [0, 1, 1, 0] over [0, 8, durationFrames-12, durationFrames]
- During cross-fade the NEXT image must already be rendering underneath so there is NEVER an empty frame

## SCENE STRUCTURE — MANDATORY 5 SCENES:

### SCENE 1 — HOOK (frames 0-40, pure black background):
- AbsoluteFill background: #000000
- NO product image in this scene
- Hook text ONLY, center frame
- Font: Bebas Neue 120px white
- Animation: spring scale 4.0→1.0, damping:10, stiffness:200
- Subtle radial gradient glow behind text matching brand color

### SCENE 2 — GALLERY (frames 40 to 40+(numImages*75)):
- ALL images cycle using <Sequence> — use this exact pattern:
  const allImages = [primaryImage, ...(additionalImages ?? [])].filter(Boolean)
  const FRAMES_PER_IMAGE = 75
  Each image in its own <Sequence from={40 + i*75} durationInFrames={90}>
- Each image fills FULL frame, objectFit: cover
- Ken Burns alternates direction per image
- Light leak sweep on EVERY image transition using @remotion/light-leaks
- Progress dots bottom center showing current image / total
- Brand name watermark top-left: Inter 600, 28px, 50% opacity

### SCENE 3 — PRICE REVEAL (60 frames):
- Product image STAYS as background (use last gallery image)
- Dark overlay: rgba(0,0,0,0.55)
- Count-up price animation using interpolate + spring
- Screen shake: Math.sin(frame*2.8)*interpolate(frame,[0,15],[6,0])
- 20-particle burst in brand accent color expanding outward
- "Only" label above price: Inter 400, 36px, gray
- Price: Bebas Neue 112px #00FF88
- Condition badge springs up from bottom

### SCENE 4 — DETAILS (45 frames):
- Product image continues as background
- Dark overlay rgba(0,0,0,0.6)
- Item specifics stagger in from right, 12-frame delays: Brand → Size → Color → Condition
- Each as a pill badge with colored background
- Spring entrance: translateX from +300px to 0

### SCENE 5 — CTA (last 45 frames):
- Product image background with vignette
- Store name large: Bebas Neue 80px white, top safe zone
- Hook reprise: smaller, italic
- Large arrow pointing down: animated bounce translateY -20px↔0px every 25 frames
- "LINK IN BIO" or "SEARCH ON EBAY": Bebas Neue 72px
- Pulsing border around entire frame: 4px, brand color, opacity sin wave
- Store logo bottom center if available

## ANIMATION RULES — EVERY ELEMENT:
- spring() for ALL entrances — NEVER interpolate for entrance
- Typical spring config: { damping: 14, stiffness: 180 }
- Stagger related elements: 12-frame delay between each
- Exits: interpolate opacity 1→0 over last 8 frames
- Background always has something moving (Ken Burns minimum)

## SAFE ZONES — NON-NEGOTIABLE:
- Top: 150px
- Bottom: 170px
- Sides: 60px
- Progress dots: 140px from bottom

## AUDIO:
- <Audio src={staticFile('music/beat.mp3')} volume={0.65} loop />
- Duck to 0.2 volume during caption text using interpolate
- Add swoosh sound effect on each image cut

## Brand:
- Store: prompt for store name variable → append to "https://www.ebay.com/str/"
- Logo: public/[store name]-logo.png
- Colors: review logo and banner coloring for brand colors

## CTA Rules:
- Instagram: "Shop [store name] → Link in bio 👇"
- TikTok standard: "Search [Store Name] on eBay 🔍"
- TikTok Shop: no text CTA — product tag handles it

## Music:
- All videos must include royalty-free background music from public/music/
- Audio rule: music starts at 80% volume, ducks to 30% when caption text appears
- Use rules/audio.md for implementation

## Energy Requirements:
- No static frames — something must always be moving
- Minimum 1 zoom or pan per 2 seconds
- Spring physics on ALL element entrances (never linear)
- Ken Burns on ALL product images (minimum 3% scale drift per 3 seconds)

## PACING RULES — MANDATORY:
- Hook scene: ≤ 60 frames (2 seconds)
- Gallery per image: 60–75 frames (2–2.5 seconds)
- Price reveal: 45–60 frames (1.5–2 seconds)
- Details: 45 frames (1.5 seconds)
- CTA: 45 frames (1.5 seconds)
- **Total target: 15 seconds (450 frames) for TikTok/Reels**

## LOOP SEAMLESSLY:
Last frame of CTA must fade to black matching first frame of Hook.
Add `opacity: interpolate(frame, [CTA_FRAMES - 10, CTA_FRAMES], [1, 0])` on the CTA scene
so the video fades to black and loops cleanly back to the hook.

## PATTERN INTERRUPTS — USE AT LEAST 3 PER VIDEO:
Examples: white flash frame (2–3 frames), scale punch (110%→100% in 4 frames),
color overlay flash, text slam, speed ramp. Place one every 2–3 seconds.

## BEFORE RENDERING CHECKLIST — CONFIRM ALL:
- [ ] Hook appears within first 2 seconds (≤ 60 frames)
- [ ] 3 hook variants generated (A/B/C) with different emotional triggers
- [ ] Scene pacing ≤ 2s each
- [ ] No static frames — motion in every frame
- [ ] allImages combines primaryImage + additionalImages
- [ ] Every image fills full frame with objectFit:cover
- [ ] Ken Burns on every image with alternating direction
- [ ] Cross-fades never show empty/gradient-only frames
- [ ] Bebas Neue loaded and used for hook/price/CTA
- [ ] Hook is on isolated black frame (no product behind it)
- [ ] Price reveal has product image background
- [ ] CTA scene has product background + bouncing arrow
- [ ] Particle burst implemented on price reveal
- [ ] Progress dots showing image count
- [ ] Audio imported and looping
- [ ] Screen shake on price reveal
- [ ] Safe zones enforced throughout
- [ ] Video loops seamlessly (CTA fades to black)
- [ ] Pattern interrupts every 2–3 seconds

---

## Video Prompt Library

Start every single prompt with:
> **"Use the Remotion best practices skill."**

### PROMPT 1 — The Viral Hook Machine
[See full prompt in conversation history]

### PROMPT 2 — Ken Burns Product Showcase
### PROMPT 3 — Beat-Synced Energy Reel
### PROMPT 4 — Cinematic Luxury
### PROMPT 5 — TikTok Dopamine Scroll
### PROMPT 6 — Unboxing Energy
### PROMPT 7 — Sticker Bomb Explosion
### PROMPT 8 — 3D Product Spin
### PROMPT 9 — Split Personality
### PROMPT 10 — The Urgency Engine
