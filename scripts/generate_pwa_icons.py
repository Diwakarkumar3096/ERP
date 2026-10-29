import zlib
import struct
import math
import os

def create_png(width, height, draw_func):
    """Creates a raw uncompressed RGBA PNG image."""
    raw_rows = []
    for y in range(height):
        row = bytearray([0]) # filter type 0: None
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            row.extend([r, g, b, a])
        raw_rows.append(bytes(row))
    
    raw_data = b''.join(raw_rows)
    compressed = zlib.compress(raw_data, 9)

    def chunk(tag, data):
        length = struct.pack('>I', len(data))
        crc = struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        return length + tag + data + crc

    # PNG Signature
    png = b'\x89PNG\r\n\x1a\n'
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png += chunk(b'IHDR', ihdr_data)
    # IDAT
    png += chunk(b'IDAT', compressed)
    # IEND
    png += chunk(b'IEND', b'')
    return png

def draw_icon(x, y, w, h, is_maskable=False):
    # Normalized coordinates [-1, 1]
    scale = 0.7 if is_maskable else 0.88
    nx = (x / (w - 1) * 2 - 1) / scale
    ny = (y / (h - 1) * 2 - 1) / scale

    # Background
    if is_maskable:
        # Full bleed dark slate background
        bg_r, bg_g, bg_b = 15, 23, 42
    else:
        # Rounded rectangle background
        bg_r, bg_g, bg_b = 15, 23, 42
    
    dist_center = math.sqrt(nx*nx + ny*ny)
    
    # Check if point inside rounded rect for standard icon
    if not is_maskable:
        # Corner radius check
        rx = abs(nx)
        ry = abs(ny)
        # Rounded rect boundary
        rad = 0.28
        in_bg = True
        if rx > 0.96 or ry > 0.96:
            in_bg = False
        elif rx > (0.96 - rad) and ry > (0.96 - rad):
            corner_d = math.sqrt((rx - (0.96 - rad))**2 + (ry - (0.96 - rad))**2)
            if corner_d > rad:
                in_bg = False
        if not in_bg:
            return (0, 0, 0, 0) # Transparent outside
    
    # Draw School ERP Emblem:
    # 1. Graduation Cap Top (Diamond)
    # vertices: (0, -0.45), (0.55, -0.22), (0, 0.0), (-0.55, -0.22)
    # Equation for rhombus
    cap_x = abs(nx) / 0.55
    cap_y = abs(ny - (-0.22)) / 0.22
    in_cap = (cap_x + cap_y) <= 1.0

    # 2. Open Book / Pillars at bottom
    # Left page: from x in [-0.45, -0.05], y in [0.08, 0.42]
    in_left_page = (-0.45 <= nx <= -0.05) and (0.08 <= ny <= 0.42)
    in_right_page = (0.05 <= nx <= 0.45) and (0.08 <= ny <= 0.42)
    # Tassel
    in_tassel = (0.35 <= nx <= 0.42) and (-0.22 <= ny <= 0.05)

    if in_cap:
        # Vibrant Indigo
        return (79, 70, 229, 255)
    elif in_tassel:
        # Gold/Amber
        return (245, 158, 11, 255)
    elif in_left_page or in_right_page:
        # Emerald / White highlight
        if (nx > -0.08 and nx < -0.05) or (nx > 0.05 and nx < 0.08) or ny > 0.38:
            return (16, 185, 129, 255) # Emerald border
        return (248, 250, 252, 255) # Slate-50 page

    # Subtle inner shield or central glow
    if dist_center < 0.7:
        return (30, 41, 59, 255) # Slate-800
    
    return (bg_r, bg_g, bg_b, 255)

os.makedirs('public', exist_ok=True)

# Generate 192x192
png_192 = create_png(192, 192, lambda x, y, w, h: draw_icon(x, y, w, h, False))
with open('public/pwa-192x192.png', 'wb') as f:
    f.write(png_192)

# Generate 512x512
png_512 = create_png(512, 512, lambda x, y, w, h: draw_icon(x, y, w, h, False))
with open('public/pwa-512x512.png', 'wb') as f:
    f.write(png_512)

# Generate Maskable 512x512
png_maskable = create_png(512, 512, lambda x, y, w, h: draw_icon(x, y, w, h, True))
with open('public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(png_maskable)

# Generate Apple Touch Icon (180x180)
png_apple = create_png(180, 180, lambda x, y, w, h: draw_icon(x, y, w, h, False))
with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(png_apple)

# Generate 64x64 favicon
png_64 = create_png(64, 64, lambda x, y, w, h: draw_icon(x, y, w, h, False))
with open('public/favicon.ico', 'wb') as f:
    f.write(png_64)

# Generate clean SVG
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#0F172A"/>
  <circle cx="256" cy="256" r="180" fill="#1E293B"/>
  <!-- Graduation Cap -->
  <path d="M256 120 L400 190 L256 260 L112 190 Z" fill="#4F46E5"/>
  <path d="M360 210 V280 C360 286 365 290 370 290 C375 290 380 286 380 280 V210" stroke="#F59E0B" stroke-width="8" stroke-linecap="round"/>
  <!-- Open Book Base -->
  <path d="M140 280 H240 V380 H140 C120 380 120 280 140 280 Z" fill="#F8FAFC"/>
  <path d="M372 280 H272 V380 H372 C392 380 392 280 372 280 Z" fill="#F8FAFC"/>
  <path d="M256 280 V380" stroke="#10B981" stroke-width="12" stroke-linecap="round"/>
  <path d="M140 374 C180 374 220 380 248 384" stroke="#CBD5E1" stroke-width="4"/>
  <path d="M372 374 C332 374 292 380 264 384" stroke="#CBD5E1" stroke-width="4"/>
</svg>'''

with open('public/icon.svg', 'w') as f:
    f.write(svg_content)

print("PWA icons generated successfully!")
