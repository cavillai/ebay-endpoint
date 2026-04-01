# eBay Video Production Rules

## Always load these Remotion skill files before writing any code:
- rules/animations.md
- rules/audio.md
- rules/audio-visualization.md
- rules/light-leaks.md
- rules/sequencing.md
- rules/fonts.md
- rules/images.md

## Safe Zone (MANDATORY — never violate):
- Top: 150px minimum clearance
- Bottom: 170px minimum clearance
- Side margins: 60px minimum

## Minimum Font Sizes (MANDATORY):
- Headlines: 56px+
- Body/subtitles: 36px+
- Labels/small text: 28px absolute minimum

## Brand:
- Store: prompt for store name variable and it should be put on end of url "https://www.ebay.com/str/"
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

---

## Video Prompt Library

Start every single prompt with:
> **"Use the Remotion best practices skill."**

---

### PROMPT 1 — The Viral Hook Machine
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/audio.md, rules/light-leaks.md.

Build a 15-second Remotion video (1080x1920, 30fps) for [store name]
eBay listing data: {title}, {price}, {condition}, {primaryImage},
{additionalImages}.

HOOK (0-2s): Black screen. Single word explodes in from center at
200% scale and springs down to 100% in 8 frames. Word: "WAIT."
White on black. Frame pulses white on beat 1.

REVEAL (2s-8s): Product image enters with aggressive Ken Burns —
starts at 140% scale zoomed into product detail, slowly pulls back
to 100% over 180 frames. Light leak overlay (@remotion/light-leaks)
flashes at 2.2s. Title uses createTikTokStyleCaptions() — each word
slams in with a 4-frame scale bounce from 130% to 100%.

ENERGY (8s-12s): Price counter animates from $0 to {price} using
easeOutExpo curve over 60 frames. Condition badge slides up from
bottom with spring (stiffness: 200, damping: 20). [store name] logo
pulses with a heartbeat scale animation (100%→105%→100% every 30
frames).

CTA (12s-15s): "Link in bio 👇" types out character by character
over 40 frames. Entire frame does a subtle zoom in (100%→103%)
during CTA. Pulsing arrow pointing down animates at 2fps strobe.

AUDIO: Import public/music/energetic-beat.mp3. Volume 70%. Duck
to 25% during caption frames. Add swoosh sound effect on each
element entrance using rules/sound-effects.md.

SAFE ZONE: All text 150px from top, 170px from bottom, 60px sides.
```

---

### PROMPT 2 — Ken Burns Product Showcase
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/images.md, rules/audio.md.

15-second Remotion video (1080x1920, 30fps) for [store name] listing:
{primaryImage}, {additionalImages} up to 4 images, {title}, {price}.

CAMERA WORK — treat each image like a cinematographer:
- Image 1 (0-4s): Start zoomed to top-left corner at 130%,
  slowly pan diagonally to bottom-right, ending at 110% scale.
- Image 2 (4-8s): Start at bottom-right 125%, pan up and left
  to center, scale to 100%.
- Image 3 (8-11s): Zoom into product's most interesting detail
  at 150%, hold for 1s, then pull back to 105%.
- Image 4 (11-13s): Wide establishing shot, slow zoom in
  100% to 112%.

Each image transition: 12-frame cross-dissolve with a white
flash frame 6 frames before cut.

OVERLAYS: Title pinned bottom in createTikTokStyleCaptions()
style, fades in at frame 30. Price badge top-right corner,
slight rotation -3deg, drops in with spring at frame 60.
[store name] logo top-left watermark 50% opacity throughout.

CTA last 2 seconds: "Shop [store name] — link in bio 👇" slides
up from bottom with spring physics.

AUDIO: Chill lo-fi beat at 60% volume throughout.
```

---

### PROMPT 3 — Beat-Synced Energy Reel
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/audio.md, rules/audio-visualization.md.

15-second 1080x1920 30fps Remotion video for [store name].
Music file: public/music/trap-beat.mp3 (120 BPM = beat every
15 frames at 30fps). Randomly select music for every generation.

BEAT MAP — sync ALL transitions and animations to frame 15
intervals (every beat):
- Frame 0: HOOK text "This just dropped 🔥" slams in
- Frame 15: Product image 1 cuts in with flash
- Frame 30: Price badge bounces in
- Frame 45: Image 2 cuts in with flash
- Frame 60: Condition text slams in from left
- Frame 75: Image 3 cuts in with flash
- Frame 90: Title scrolls in word by word
- Frame 105: Image 4 cuts in with flash
- Frame 120: Brand/size specifics pop in as stickers
- Frame 150: Logo slam + "Link in bio" CTA
- Frame 180: Final freeze frame with pulse effect

On every beat (every 15 frames): subtle full-frame scale pulse
(100%→101.5%→100% in 4 frames) to feel the music.

Audio visualization: bottom 60px of frame shows bass-reactive
bar visualization using rules/audio-visualization.md, 20% opacity.

SAFE ZONE enforced strictly.
```

---

### PROMPT 4 — Cinematic Luxury
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/light-leaks.md, rules/fonts.md, rules/audio.md.

15-second 1080x1920 30fps Remotion video. [store name] luxury aesthetic.
Data: {title}, {price}, {brand from itemSpecifics}, {primaryImage},
{additionalImages}.

OPENING (0-3s): Pure black. Thin horizontal white line draws
from left to right over 45 frames. Brand name fades in above
line in elegant thin serif (load Playfair Display via rules/fonts.md).
Light leak flares from top-right corner at 1.5s.

PRODUCT (3s-10s): Image fades in at 80% opacity, slowly
brightens to 100% over 30 frames. Ken Burns: slow upward pan,
scale 108% to 100% over 210 frames. Second image cross-fades
at 7s with same treatment.

DETAILS (10s-13s): Item specifics appear as elegant gold text
lines, each fading in 10 frames apart: Brand → Condition →
Size → Price. Price in largest font 72px.

CTA (13s-15s): "Shop [store name]" fades in. Below it, "Link in
bio 👇" with a thin underline that draws in from left.
[store name] logo centered, fades in last.

AUDIO: Cinematic ambient music 50% volume. Gentle rise in
volume during CTA.

Color palette: black, white, gold (#C9A84C). No harsh cuts —
everything fades or springs.
```

---

### PROMPT 5 — TikTok Dopamine Scroll
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/audio.md.

15-second 1080x1920 30fps Remotion TikTok video for [store name].
Data: fetch 5 listings from [store name] eBay — title, price,
primaryImage for each.

STRUCTURE — rapid fire, 2.5 seconds per listing:
Each listing segment:
- Hard cut in (0 frames transition)
- Image fills frame, instant Ken Burns kick (starts 115%,
  animates to 108% over 75 frames)
- Price SLAMS in from top in 6 frames, bounces with spring
- Title createTikTokStyleCaptions() at bottom
- On cut-out: white flash 3 frames

Between listings 3 and 4: 0.5s "[store name] Drop 🔥" full
screen text interstitial, black background, spring scale
entrance from 200% to 100%.

FINAL CARD (last 2s): 2x3 grid of all listing thumbnail
images, each popping in sequentially with spring physics.
"Search "[store name]" on eBay 🔍" large text below grid.

AUDIO: Viral trending-style audio at 80% volume. Hard
cuts sync with audio transients.
```

---

### PROMPT 6 — Unboxing Energy
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/audio.md, rules/light-leaks.md.

15-second 1080x1920 30fps for [store name] eBay listing.
Data: {title}, {price}, {condition}, {primaryImage},
{additionalImages}.

TEASE (0-3s): Blurred product image fills frame (CSS blur 20px).
Text "Guess the price 👀" in createTikTokStyleCaptions() appears
word by word. Blur slowly reduces from 20px to 0px over 90 frames.

REVEAL (3s-7s): At frame 90, light leak flare covers screen for
8 frames, then drops to reveal crisp product image. Scale punches
from 90% to 100% with spring (stiffness: 300). Crowd-reaction
style text "IT'S {condition}!" slams in.

PRICE MOMENT (7s-10s): Cut to black for 6 frames. Price appears
large center (80px font) counting up from $0 with easeOutExpo.
On price landing: screen shake 3px for 6 frames.

SPECS (10s-12s): Item specifics appear as tags morphing in from
small dots, each tag expands to show text (scale 0→1 with spring).

CTA (12s-15s): "Link in bio to grab this 👇" in bold. [store name]
logo + pulsing down arrow. Ken Burns on background product image
throughout CTA.

AUDIO: Unboxing-style audio — suspenseful build during blur,
reveal sting at 3s, upbeat music after.
```

---

### PROMPT 7 — Sticker Bomb Explosion
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/audio.md.

15-second 1080x1920 30fps for [store name]. Data: {title}, {price},
{brand}, {size}, {color}, {condition}, {primaryImage}.

BACKGROUND: Product image fills frame with slow Ken Burns
zoom-out (110%→100% over 450 frames). Slight dark vignette
overlay 40% opacity.

STICKER DROPS (staggered over 0-10s): Each sticker falls
from above the frame and bounces to its position with spring
physics (stiffness: 150, damping: 12):
- Frame 0: Price sticker (bright yellow, rotated -5deg)
- Frame 20: Condition badge (green pill, rotated +3deg)
- Frame 40: Brand tag (white label, rotated -2deg)
- Frame 60: Size circle (blue, rotated +6deg)
- Frame 80: Color dot (actual color, rotated -4deg)
- Frame 100: "🔥 Hot Deal" sticker (red, rotated +2deg)
- Frame 120: [store name] store sticker (logo, rotated -3deg)

Each sticker has a slight perpetual wobble animation (±1deg
rotation, 60-frame cycle) after landing.

CTA (13s-15s): "Link in bio 👇" sticker drops last,
largest, center-bottom. Bounces dramatically.

AUDIO: Satisfying pop/bounce sound effects for each sticker
using rules/sound-effects.md. Upbeat background music 60%.
```

---

### PROMPT 8 — 3D Product Spin
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/3d.md, rules/audio.md.

15-second 1080x1920 30fps for [store name] using Three.js via
rules/3d.md. Data: {primaryImage}, {additionalImages},
{title}, {price}.

OPENING (0-4s): Product image mapped onto a 3D plane in
Three.js. Plane rotates on Y-axis from -30deg to 0deg
(swings in from right) with spring physics. Background:
gradient from #0a0a0a to #1a1a2e.

SHOWCASE (4s-10s): 3D plane performs slow continuous Y-axis
oscillation (-8deg to +8deg, 120-frame cycle) while
additional images cross-fade on the plane texture every
3 seconds. Subtle rim lighting effect on plane edges.

DETAILS (10s-12s): 3D plane scales down to 60% and moves
to top half. Bottom half reveals title, price, condition
animating in from right with stagger.

CTA (12s-15s): Plane rotates to face-on, full scale returns
spring to 100%. "Link in bio 👇" overlays in bold. [store name]
logo appears. Subtle particle effect (small dots floating up).

AUDIO: Electronic/tech feel music 65% volume.
```

---

### PROMPT 9 — Split Personality (Instagram)
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/audio.md, rules/sequencing.md.

15-second 1080x1920 30fps Instagram Reel for [store name].
Data: {primaryImage}, {additionalImages}, {title}, {price},
{condition}, {itemSpecifics}.

STRUCTURE: Frame split diagonally from top-left to
bottom-right. Left triangle: product imagery. Right triangle:
information panels. The diagonal line itself animates —
starts vertical at center and rotates to final 45deg
diagonal position over 30 frames at open.

LEFT SIDE: Product images with Ken Burns (slow zoom,
alternate direction each image). Images cycle every 4s
with cross-fade.

RIGHT SIDE: Dark background (#111). Information stacks in
sequentially using spring physics with 15-frame stagger:
1. Brand name (small, grey)
2. Title (medium, white, 2 lines max)
3. Condition badge (colored pill)
4. Price (large, green, 56px)
5. [store name] logo (bottom of right panel)

DIAGONAL LINE: Animated gradient line (gold) between panels
with a traveling light shimmer effect (moves top to bottom
every 90 frames).

CTA (12s-15s): Right panel switches to "Shop Now → Link
in bio 👇" full panel, white text on dark, pulsing.

AUDIO: Upbeat electronic 70% volume.
```

---

### PROMPT 10 — The Urgency Engine
```
Use the Remotion best practices skill. Load rules/animations.md,
rules/audio.md, rules/audio-visualization.md.

15-second 1080x1920 30fps for [store name]. Data: {title},
{price}, {itemEndDate}, {buyingOptions}, {primaryImage},
{condition}.

URGENCY HOOK (0-2s): Red screen flash (3 frames), then
black. "⚠️ ENDING SOON" in white on red pill badge
slams in from top with shake effect. Product image
sweeps in from bottom in 8 frames.

COUNTDOWN (2s-9s): If AUCTION + itemEndDate within 72
hours: large flip-clock countdown timer center frame,
calculating real remaining time from {itemEndDate}.
Timer digits flip with mechanical animation. Red pulsing
border around entire frame (2px, pulses 0%↔100% opacity
every 30 frames). Ken Burns on background product image.

If FIXED_PRICE: Replace countdown with price in large
animated number that bounces on entrance, with "Buy It
Now" badge in blue.

SPECS (9s-12s): Title in createTikTokStyleCaptions().
Condition badge. Price (if auction, show current bid).

CTA (12s-15s): Full red background. "Don't miss this —
Link in bio NOW 👇" in white bold. [store name] logo.
Countdown timer continues in corner if auction.

AUDIO: Ticking clock sound effect layered under music.
Music builds in intensity. Stinger sound on CTA entrance.
Bass-reactive visualization at frame bottom 40px height.
```
