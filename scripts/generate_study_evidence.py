import os
import struct
import zlib

def create_png(width, height, get_pixel_func):
    """Generates an uncompressed RGBA PNG in memory."""
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type None
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), level=9)
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', 13))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))
    
    # IDAT
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))
    
    # IEND
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))
    
    return bytes(png)

FRAGMENTS = {
    'ES01': {'bg': (10, 28, 18), 'ink': (61, 255, 139), 'type': 'fanfold', 'mark': 'DUMP'},
    'ES02': {'bg': (15, 20, 16), 'ink': (182, 255, 209), 'type': 'tape', 'mark': 'BITS_A'},
    'ES03': {'bg': (24, 28, 22), 'ink': (255, 235, 120), 'type': 'tape', 'mark': 'BITS_B'},
    'ES04': {'bg': (12, 24, 18), 'ink': (61, 255, 139), 'type': 'log', 'mark': 'LOG_1'},
    'ES05': {'bg': (35, 38, 15), 'ink': (255, 255, 140), 'type': 'sticky', 'mark': 'BITS_C'},
    'ES06': {'bg': (8, 20, 14), 'ink': (61, 255, 139), 'type': 'crash', 'mark': 'ORBIT'},
    'ES07': {'bg': (12, 24, 18), 'ink': (61, 255, 139), 'type': 'log', 'mark': 'LOG_2'},
    'ES08': {'bg': (35, 38, 15), 'ink': (255, 255, 140), 'type': 'sticky', 'mark': 'BITS_D'},
    'ES09': {'bg': (15, 20, 16), 'ink': (182, 255, 209), 'type': 'tape', 'mark': 'BITS_E'},
    'ES10': {'bg': (12, 24, 18), 'ink': (255, 90, 90), 'type': 'log', 'mark': 'ERR_SRC9'},
    'ES11': {'bg': (20, 26, 22), 'ink': (182, 255, 209), 'type': 'memo', 'mark': 'HALTED'},
    'ES12': {'bg': (22, 28, 24), 'ink': (120, 255, 180), 'type': 'clear', 'mark': 'ALPHA_NOTE'},
    'EK02': {'bg': (25, 15, 15), 'ink': (255, 80, 80), 'type': 'reel', 'mark': 'REEL_STATIC'},
    'EK03': {'bg': (38, 32, 20), 'ink': (120, 180, 255), 'type': 'aged', 'mark': 'CIPHER_NOTE'},
    'XS01': {'bg': (10, 22, 16), 'ink': (61, 200, 120), 'type': 'decoy', 'mark': 'DECOY_DUMP'},
    'XS02': {'bg': (32, 34, 16), 'ink': (240, 240, 100), 'type': 'decoy', 'mark': 'DECOY_NOTE'},
}

def make_fragment_pixel(frag_id):
    cfg = FRAGMENTS[frag_id]
    bg_r, bg_g, bg_b = cfg['bg']
    ink_r, ink_g, ink_b = cfg['ink']
    
    def pixel_func(x, y, w, h):
        # Border
        if x < 4 or x >= w - 4 or y < 4 or y >= h - 4:
            return (ink_r // 3, ink_g // 3, ink_b // 3, 255)
        
        # Scanlines / ruled lines
        is_grid = (y % 16 == 0) or (x % 32 == 0 and cfg['type'] in ('log', 'fanfold'))
        
        # Header strip
        if y < 32:
            return (bg_r + 15, bg_g + 15, bg_b + 15, 255)
        
        # Center badge or simulated text stripes
        text_row = (36 <= y <= 220) and ((y // 12) % 2 == 0) and (20 <= x <= w - 20)
        
        if text_row:
            # Hash-based pseudo noise for text lines
            n = (x * 37 + y * 59 + ord(frag_id[0]) * 17) % 100
            if n > 25:
                return (ink_r, ink_g, ink_b, 255)
        
        if is_grid:
            return (bg_r + 20, bg_g + 20, bg_b + 20, 255)
            
        return (bg_r, bg_g, bg_b, 255)
        
    return pixel_func

def main():
    target_dirs = [
        os.path.join(r"c:\Users\SUBHAM DAS\CODING\CURSE THE CODE 2\curse-the-code\frontend\public\evidence\study"),
        os.path.join(r"c:\Users\SUBHAM DAS\CODING\CURSE THE CODE 2\curse-the-code\frontend\public\evidence")
    ]
    
    for d in target_dirs:
        os.makedirs(d, exist_ok=True)
        
    for frag_id in FRAGMENTS:
        png_data = create_png(256, 256, make_fragment_pixel(frag_id))
        for d in target_dirs:
            file_path = os.path.join(d, f"{frag_id}.png")
            with open(file_path, "wb") as f:
                f.write(png_data)
        # Also save as evidence_<id_lowercase>.png in public/evidence for consistency
        legacy_path = os.path.join(target_dirs[1], f"evidence_{frag_id.lower()}.png")
        with open(legacy_path, "wb") as f:
            f.write(png_data)
            
    print(f"Generated {len(FRAGMENTS)} study evidence PNGs successfully!")

if __name__ == '__main__':
    main()
