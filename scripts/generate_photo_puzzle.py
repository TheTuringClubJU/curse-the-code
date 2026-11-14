import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Set deterministic seed for reproducible gothic aesthetic
random.seed(1892)

WIDTH = 1200
HEIGHT = 600
COLS = 5
ROWS = 2
PIECE_W = WIDTH // COLS  # 240
PIECE_H = HEIGHT // ROWS # 300

# Base image (RGBA)
img = Image.new("RGBA", (WIDTH, HEIGHT), (20, 16, 12, 255))
draw = ImageDraw.Draw(img)

# 1. Background Wall & Wainscoting
# Top wall gradient (antique wallpaper)
for y in range(0, 300):
    t = y / 300.0
    # Sepia brownish olive wallpaper
    r = int(55 * (1 - t) + 40 * t)
    g = int(45 * (1 - t) + 32 * t)
    b = int(35 * (1 - t) + 24 * t)
    draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

# Subtle wallpaper stripes and damask pattern
for x in range(0, WIDTH, 30):
    draw.line([(x, 0), (x, 270)], fill=(32, 25, 18, 120), width=3)
    draw.line([(x + 15, 0), (x + 15, 270)], fill=(48, 38, 28, 80), width=1)

# Victorian Picture Rail Moulding at y=60
draw.rectangle([(0, 56), (WIDTH, 64)], fill=(28, 20, 14, 255))
draw.line([(0, 56), (WIDTH, 56)], fill=(65, 50, 36, 255), width=2)
draw.line([(0, 64), (WIDTH, 64)], fill=(15, 10, 6, 255), width=2)

# Dado rail / Wainscoting transition at y=260 - 290
draw.rectangle([(0, 260), (WIDTH, 272)], fill=(38, 28, 20, 255))
draw.line([(0, 260), (WIDTH, 260)], fill=(75, 58, 42, 255), width=2)
draw.line([(0, 272), (WIDTH, 272)], fill=(18, 12, 8, 255), width=2)

# Wainscoting panels (vertical wooden slats)
for x in range(0, WIDTH, 60):
    draw.rectangle([(x + 6, 274), (x + 54, 298)], fill=(30, 22, 16, 255), outline=(48, 36, 26, 255))

# 2. Wood Floorboards (y = 295 to 600)
for y in range(295, HEIGHT):
    t = (y - 295) / (HEIGHT - 295)
    r = int(42 * (1 - t) + 26 * t)
    g = int(32 * (1 - t) + 18 * t)
    b = int(22 * (1 - t) + 12 * t)
    draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

# Diagonal perspective plank lines
for plank_x in range(-200, WIDTH + 400, 75):
    draw.line([(plank_x, 295), (plank_x + int(plank_x * 0.25 - 120), HEIGHT)], fill=(16, 11, 7, 180), width=2)

# Vintage Persian Parlor Rug across columns 0 to 3 (x=40 to 920, y=340 to 580)
rug_poly = [(60, 360), (900, 360), (940, 570), (20, 570)]
draw.polygon(rug_poly, fill=(58, 24, 22, 220), outline=(90, 48, 36, 255))
# Rug inner ornate border
draw.polygon([(80, 375), (880, 375), (915, 555), (45, 555)], outline=(115, 80, 48, 220), width=3)
# Rug fringe
for fx in range(30, 935, 12):
    draw.line([(fx, 570), (fx - 4, 582)], fill=(160, 140, 110, 180), width=1)

# 3. Shadows on Floor (Crucial Puzzle Anomaly: Figures 1-4 have shadows, Figure 5 DOES NOT)
shadow_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow_layer)

# Figure 1 Shadow (Father, col 0, center 120) -> casts shadow towards bottom-left
s_draw.ellipse([(60, 490), (190, 570)], fill=(8, 6, 4, 180))
s_draw.polygon([(100, 470), (145, 470), (180, 550), (70, 550)], fill=(8, 6, 4, 160))

# Figure 2 Shadow (Mother, col 1, center 360) -> broad dress shadow
s_draw.ellipse([(280, 480), (430, 575)], fill=(8, 6, 4, 190))

# Figure 3 Shadow (Daughter, col 2, center 600) -> smaller slender shadow
s_draw.ellipse([(550, 495), (655, 560)], fill=(8, 6, 4, 180))

# Figure 4 Shadow (Son, col 3, center 840) -> slender standing shadow
s_draw.ellipse([(785, 485), (890, 565)], fill=(8, 6, 4, 180))

# FIGURE 5 (Col 4, center 1080): NO SHADOW! (THE ANOMALY)
# We blur the shadow layer for realistic lantern light projection
shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=8))
img.paste(shadow_layer, (0, 0), shadow_layer)

# 4. Draw The Five Figures
fig_draw = ImageDraw.Draw(img)

def draw_victorian_father(cx):
    # Suit body
    # Shoulders at y=170, waist at y=300, legs to y=520
    # Head & Top (y=90 to 300)
    # Head
    fig_draw.ellipse([(cx - 26, 95), (cx + 26, 155)], fill=(175, 145, 120, 255))
    # Dark parted hair
    fig_draw.chord([(cx - 28, 88), (cx + 28, 130)], 180, 360, fill=(35, 25, 20, 255))
    # Full Victorian beard & mustache
    fig_draw.chord([(cx - 24, 122), (cx + 24, 162)], 0, 180, fill=(40, 28, 22, 255))
    # Stern dark eyes and brow
    fig_draw.ellipse([(cx - 14, 118), (cx - 6, 124)], fill=(30, 20, 15, 255))
    fig_draw.ellipse([(cx + 6, 118), (cx + 14, 124)], fill=(30, 20, 15, 255))
    fig_draw.line([(cx - 18, 114), (cx - 4, 114)], fill=(20, 15, 10, 255), width=2)
    fig_draw.line([(cx + 4, 114), (cx + 18, 114)], fill=(20, 15, 10, 255), width=2)
    # High stiff collar & dark cravat
    fig_draw.polygon([(cx - 14, 150), (cx + 14, 150), (cx + 8, 175), (cx - 8, 175)], fill=(210, 195, 175, 255))
    fig_draw.polygon([(cx - 6, 160), (cx + 6, 160), (cx + 4, 182), (cx - 4, 182)], fill=(25, 18, 14, 255))
    # Frock Coat / Torso
    fig_draw.polygon([(cx - 52, 170), (cx + 52, 170), (cx + 42, 330), (cx - 42, 330)], fill=(32, 24, 20, 255))
    # Coat lapels and brass watch chain
    fig_draw.line([(cx - 22, 170), (cx, 240)], fill=(50, 38, 30, 255), width=3)
    fig_draw.line([(cx + 22, 170), (cx, 240)], fill=(50, 38, 30, 255), width=3)
    fig_draw.arc([(cx - 12, 235), (cx + 16, 255)], 0, 180, fill=(160, 130, 70, 255), width=2)
    # Hands at sides
    fig_draw.ellipse([(cx - 48, 310), (cx - 36, 335)], fill=(165, 138, 115, 255))
    fig_draw.ellipse([(cx + 36, 310), (cx + 48, 335)], fill=(165, 138, 115, 255))
    # Trousers (y=320 to 500)
    fig_draw.polygon([(cx - 38, 325), (cx - 6, 325), (cx - 10, 495), (cx - 32, 495)], fill=(25, 20, 16, 255))
    fig_draw.polygon([(cx + 6, 325), (cx + 38, 325), (cx + 32, 495), (cx + 10, 495)], fill=(25, 20, 16, 255))
    # Victorian leather boots
    fig_draw.rectangle([(cx - 34, 495), (cx - 10, 515)], fill=(15, 12, 10, 255))
    fig_draw.rectangle([(cx + 10, 495), (cx + 34, 515)], fill=(15, 12, 10, 255))

def draw_victorian_mother(cx):
    # Hair in tight braided bun
    fig_draw.ellipse([(cx - 24, 98), (cx + 24, 140)], fill=(30, 22, 18, 255))
    # Face
    fig_draw.ellipse([(cx - 20, 110), (cx + 20, 155)], fill=(185, 155, 130, 255))
    # Eyes, mouth, Victorian solemn expression
    fig_draw.ellipse([(cx - 11, 128), (cx - 5, 133)], fill=(40, 28, 20, 255))
    fig_draw.ellipse([(cx + 5, 128), (cx + 11, 133)], fill=(40, 28, 20, 255))
    fig_draw.line([(cx - 6, 145), (cx + 6, 145)], fill=(110, 65, 55, 255), width=2)
    # High lace mourning dress collar & cameo brooch
    fig_draw.polygon([(cx - 16, 152), (cx + 16, 152), (cx + 12, 172), (cx - 12, 172)], fill=(45, 35, 30, 255))
    fig_draw.ellipse([(cx - 5, 160), (cx + 5, 170)], fill=(190, 170, 140, 255), outline=(90, 70, 50, 255))
    # Black lace bodice / corset
    fig_draw.polygon([(cx - 38, 172), (cx + 38, 172), (cx + 22, 285), (cx - 22, 285)], fill=(22, 18, 16, 255))
    # Lace pattern accents
    for ly in range(180, 275, 15):
        fig_draw.line([(cx - 20, ly), (cx + 20, ly)], fill=(40, 32, 28, 255), width=1)
    # Hands folded at waist
    fig_draw.ellipse([(cx - 14, 275), (cx + 14, 295)], fill=(175, 145, 120, 255))
    # Huge bell-shaped Victorian crinoline skirt (y=285 to 525)
    skirt_pts = [(cx - 22, 285), (cx + 22, 285), (cx + 72, 520), (cx - 72, 520)]
    fig_draw.polygon(skirt_pts, fill=(18, 14, 12, 255))
    # Skirt folds / pleats
    for sx in [-45, -20, 0, 20, 45]:
        fig_draw.line([(cx + int(sx * 0.3), 290), (cx + sx, 520)], fill=(32, 25, 22, 255), width=3)

def draw_victorian_daughter(cx):
    # Lena - shoulder length dark curls
    fig_draw.ellipse([(cx - 26, 140), (cx + 26, 205)], fill=(32, 24, 18, 255))
    # Delicate young face
    fig_draw.ellipse([(cx - 18, 145), (cx + 18, 188)], fill=(195, 168, 142, 255))
    fig_draw.ellipse([(cx - 9, 160), (cx - 4, 165)], fill=(35, 25, 18, 255))
    fig_draw.ellipse([(cx + 4, 160), (cx + 9, 165)], fill=(35, 25, 18, 255))
    fig_draw.line([(cx - 5, 176), (cx + 5, 176)], fill=(130, 85, 75, 255), width=1)
    # White lace Peter Pan collar
    fig_draw.arc([(cx - 15, 182), (cx + 15, 200)], 0, 180, fill=(215, 200, 180, 255), width=4)
    # Velvet pinafore dress (y=195 to 390)
    fig_draw.polygon([(cx - 26, 195), (cx + 26, 195), (cx + 42, 385), (cx - 42, 385)], fill=(50, 28, 28, 255))
    # Holding porcelain doll in arms
    fig_draw.rectangle([(cx - 10, 240), (cx + 14, 290)], fill=(180, 160, 140, 255), outline=(40, 25, 20, 255))
    fig_draw.ellipse([(cx - 4, 225), (cx + 8, 242)], fill=(220, 200, 185, 255)) # doll head
    # Black stockings & Mary Jane shoes (y=385 to 495)
    fig_draw.rectangle([(cx - 18, 385), (cx - 8, 485)], fill=(25, 20, 18, 255))
    fig_draw.rectangle([(cx + 8, 385), (cx + 18, 485)], fill=(25, 20, 18, 255))
    fig_draw.ellipse([(cx - 22, 482), (cx - 6, 496)], fill=(12, 10, 8, 255))
    fig_draw.ellipse([(cx + 6, 482), (cx + 22, 496)], fill=(12, 10, 8, 255))

def draw_victorian_son(cx):
    # Daniel - neat parted hair
    fig_draw.chord([(cx - 22, 125), (cx + 22, 165)], 180, 360, fill=(40, 30, 22, 255))
    # Boy's face
    fig_draw.ellipse([(cx - 18, 132), (cx + 18, 175)], fill=(185, 155, 130, 255))
    fig_draw.ellipse([(cx - 10, 148), (cx - 4, 153)], fill=(35, 25, 18, 255))
    fig_draw.ellipse([(cx + 4, 148), (cx + 10, 153)], fill=(35, 25, 18, 255))
    fig_draw.line([(cx - 5, 164), (cx + 5, 164)], fill=(120, 80, 70, 255), width=2)
    # Stiff white collar & Eton bow
    fig_draw.polygon([(cx - 12, 172), (cx + 12, 172), (cx, 185)], fill=(210, 195, 175, 255))
    fig_draw.ellipse([(cx - 6, 180), (cx + 6, 188)], fill=(30, 20, 16, 255))
    # Eton school jacket with brass buttons
    fig_draw.polygon([(cx - 36, 182), (cx + 36, 182), (cx + 28, 320), (cx - 28, 320)], fill=(35, 30, 38, 255))
    for by in [205, 230, 255, 280]:
        fig_draw.ellipse([(cx - 3, by), (cx + 3, by + 6)], fill=(180, 150, 80, 255))
    # Knickerbockers / trousers (y=320 to 480)
    fig_draw.polygon([(cx - 25, 320), (cx - 6, 320), (cx - 8, 470), (cx - 22, 470)], fill=(28, 24, 28, 255))
    fig_draw.polygon([(cx + 6, 320), (cx + 25, 320), (cx + 22, 470), (cx + 8, 470)], fill=(28, 24, 28, 255))
    fig_draw.rectangle([(cx - 24, 470), (cx - 6, 495)], fill=(15, 12, 12, 255))
    fig_draw.rectangle([(cx + 6, 470), (cx + 24, 495)], fill=(15, 12, 12, 255))

def draw_fifth_faceless_entity(cx):
    # THE FIFTH ENTITY - Tall, rigid, featureless void head, NO cast shadow on floor
    # Head: A chilling pale, smooth, completely faceless oval void (NO eyes, NO nose, NO mouth)
    fig_draw.ellipse([(cx - 24, 88), (cx + 24, 150)], fill=(195, 188, 175, 255), outline=(130, 120, 110, 255))
    # Slight eerie mist around the void head
    # Stiff archaic black high-collar coat
    fig_draw.polygon([(cx - 16, 146), (cx + 16, 146), (cx + 10, 175), (cx - 10, 175)], fill=(18, 14, 14, 255))
    # Long shadowy frock coat reaching down past knees
    fig_draw.polygon([(cx - 46, 170), (cx + 46, 170), (cx + 36, 430), (cx - 36, 430)], fill=(15, 12, 12, 255))
    fig_draw.line([(cx, 175), (cx, 430)], fill=(28, 22, 22, 255), width=2)
    # Long spindly pale hands emerging from sleeves
    fig_draw.ellipse([(cx - 42, 330), (cx - 30, 365)], fill=(190, 180, 170, 255))
    fig_draw.ellipse([(cx + 30, 330), (cx + 42, 365)], fill=(190, 180, 170, 255))
    # Dark trousers
    fig_draw.polygon([(cx - 30, 425), (cx - 8, 425), (cx - 10, 505), (cx - 26, 505)], fill=(12, 10, 10, 255))
    fig_draw.polygon([(cx + 8, 425), (cx + 30, 425), (cx + 26, 505), (cx + 10, 505)], fill=(12, 10, 10, 255))
    # Boots standing directly on floor - with ZERO shadow beneath
    fig_draw.rectangle([(cx - 28, 505), (cx - 8, 525)], fill=(8, 6, 6, 255))
    fig_draw.rectangle([(cx + 8, 505), (cx + 28, 525)], fill=(8, 6, 6, 255))

    # STAMPED SECRET CODE '7351' near the fifth figure (Col 4, piece P07)
    # Clear antique engraved numbering visible upon close inspection
    code_text = "7351"
    try:
        font = ImageFont.truetype("arial.ttf", 26)
    except Exception:
        font = ImageFont.load_default()
    # Draw drop shadow for crisp readability
    fig_draw.text((cx + 16, 481), code_text, fill=(5, 5, 5, 240), font=font)
    # Draw crisp antique chalk/patina numbers
    fig_draw.text((cx + 15, 480), code_text, fill=(235, 215, 185, 255), font=font)

# Render each figure in their column center
draw_victorian_father(120)       # Col 0 (P06 top, P05 bottom)
draw_victorian_mother(360)       # Col 1 (P01 top, P02 bottom)
draw_victorian_daughter(600)     # Col 2 (P08 top, P09 bottom)
draw_victorian_son(840)          # Col 3 (P03 top, P04 bottom)
draw_fifth_faceless_entity(1080) # Col 4 (P10 top, P07 bottom - THE FACELESS SHADOWLESS ANOMALY)

# 5. Vintage Film Grain, Scratches & Vignette Texture
overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
o_draw = ImageDraw.Draw(overlay)

# Antique vignette (dark edges and corners)
for r_step in range(0, 120):
    alpha = int(140 * (r_step / 120.0)**1.8)
    o_draw.rectangle([(r_step, r_step), (WIDTH - r_step, HEIGHT - r_step)], outline=(10, 6, 4, alpha), width=2)

# Scratches and hair lines typical of 19th century tintypes
for _ in range(25):
    sx = random.randint(20, WIDTH - 40)
    sy = random.randint(10, HEIGHT - 80)
    slen = random.randint(25, 90)
    o_draw.line([(sx, sy), (sx + random.randint(-5, 5), sy + slen)], fill=(220, 205, 185, 45), width=1)

# Chemical spots / water stains
for _ in range(12):
    sp_x = random.randint(50, WIDTH - 50)
    sp_y = random.randint(40, HEIGHT - 50)
    rad = random.randint(6, 22)
    o_draw.ellipse([(sp_x - rad, sp_y - rad), (sp_x + rad, sp_y + rad)], fill=(60, 45, 30, 30))

img.paste(overlay, (0, 0), overlay)

# Convert to RGB for saving full assembled portrait
full_portrait = img.convert("RGB")
full_path = "frontend/public/photo_full.png"
full_portrait.save(full_path, "PNG", quality=95)
print(f"Saved full portrait to {full_path}")

# 6. Slicing into the 10 Photo Pieces matching Stage 2 solution:
# Row 0 (Top):
#   Col 0 -> P06
#   Col 1 -> P01
#   Col 2 -> P08
#   Col 3 -> P03
#   Col 4 -> P10
# Row 1 (Bottom):
#   Col 0 -> P05
#   Col 1 -> P02
#   Col 2 -> P09
#   Col 3 -> P04
#   Col 4 -> P07

piece_mapping = {
    (0, 0): "P06",
    (0, 1): "P01",
    (0, 2): "P08",
    (0, 3): "P03",
    (0, 4): "P10",
    (1, 0): "P05",
    (1, 1): "P02",
    (1, 2): "P09",
    (1, 3): "P04",
    (1, 4): "P07"
}

output_dir = "frontend/public/photo_pieces"
os.makedirs(output_dir, exist_ok=True)

# Also create evidence piece names (e.g., piece_01.png ... piece_10.png)
piece_num_mapping = {
    "P01": "piece_01.png",
    "P02": "piece_02.png",
    "P03": "piece_03.png",
    "P04": "piece_04.png",
    "P05": "piece_05.png",
    "P06": "piece_06.png",
    "P07": "piece_07.png",
    "P08": "piece_08.png",
    "P09": "piece_09.png",
    "P10": "piece_10.png"
}

for (row, col), piece_id in piece_mapping.items():
    x0 = col * PIECE_W
    y0 = row * PIECE_H
    x1 = x0 + PIECE_W
    y1 = y0 + PIECE_H

    crop = img.crop((x0, y0, x1, y1)).convert("RGBA")

    # Add torn antique paper edge styling and subtle piece token watermark
    piece_draw = ImageDraw.Draw(crop)
    # Frayed paper border
    piece_draw.rectangle([(0, 0), (PIECE_W - 1, PIECE_H - 1)], outline=(190, 170, 140, 80), width=1)
    
    # Small atmospheric identifier badge in corner
    badge_bg = (15, 10, 8, 180)
    piece_draw.rectangle([(6, PIECE_H - 24), (52, PIECE_H - 6)], fill=badge_bg, outline=(180, 140, 90, 120))
    try:
        b_font = ImageFont.truetype("arial.ttf", 11)
    except Exception:
        b_font = ImageFont.load_default()
    piece_draw.text((12, PIECE_H - 22), piece_id, fill=(240, 220, 190, 240), font=b_font)

    # Save strictly as P01.png ... P10.png in photo_pieces
    crop_rgb = crop.convert("RGB")
    p_path = os.path.join(output_dir, f"{piece_id}.png")
    crop_rgb.save(p_path, "PNG", quality=95)
    print(f"Generated {piece_id} -> {p_path} (from Row {row}, Col {col})")

print("All 10 photo pieces successfully generated!")
