"""
Generates high-fidelity evidence images for Room 2: Daniel's Study matching content.live.json.
All fragments retain authentic retro visual styling (terminal CRT green, fanfold logs, aged parchment).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TARGET_DIR = PROJECT_ROOT / "frontend" / "public" / "evidence" / "study"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

# Fragment definitions matching content.live.json exactly
FRAGMENTS_DATA = {
    'ES01': {
        'bg': (10, 28, 18),
        'ink': (61, 255, 139),
        'accent': (40, 180, 90),
        'header': 'TERMINAL DUMP • CRASH_1031.LOG',
        'type': 'crash_dump',
        'lines': [
            'crash_1031.log',
            '[23:44:50] net: peer joined',
            '[23:46:31] auth: sig mismatch',
            'DUMP SEGMENT A:',
            '43 52 41 53 48 20 32 33',
            '3A 34 37 3A 31 32',
            '|CRASH 23:47:12|'
        ]
    },
    'ES02': {
        'bg': (15, 20, 16),
        'ink': (182, 255, 209),
        'accent': (80, 160, 110),
        'header': 'CRT SCREEN DUMP TAPE 1',
        'type': 'tape',
        'lines': [
            'BUFFER TAPE [A]',
            'BINARY RECOVERY:',
            '01010011 01001001',
            'BASE64 CHUNK:',
            'SXQgY29waWVzIG91ciB2',
            'b2ljZXMuIF',
            '("It copies our voices. ")'
        ]
    },
    'ES03': {
        'bg': (24, 28, 22),
        'ink': (255, 235, 120),
        'accent': (180, 160, 80),
        'header': 'STICKY NOTE • PASSCODE SCRAP A',
        'type': 'sticky',
        'lines': [
            'DANIEL\'S DESK BLOTTER',
            'RECOVERED STRIP A:',
            '01010100 01001000',
            '--------------------',
            'BYTE 1: 01010100 (T)',
            'BYTE 2: 01001000 (H)',
            '[SEAM: MATCH WITH SCRAP B]'
        ]
    },
    'ES04': {
        'bg': (12, 24, 18),
        'ink': (61, 255, 139),
        'accent': (40, 150, 80),
        'header': 'FANFOLD SHEET 1 • LOGINS DISPATCH',
        'type': 'log',
        'lines': [
            'WS-DANIEL   token=TK-01',
            'WS-MARA     token=TK-02',
            'TABLET-01   token=TK-03',
            'SRC-0311    token=TK-04',
            'HOUSE-CORE  token=TK-05',
            'TABLET-02   token=TK-06',
            'SRC-0477    token=TK-07'
        ]
    },
    'ES05': {
        'bg': (35, 38, 15),
        'ink': (255, 255, 140),
        'accent': (180, 180, 90),
        'header': 'CRT SCREEN DUMP TAPE 2',
        'type': 'tape',
        'lines': [
            'BUFFER TAPE [B]',
            'BINARY RECOVERY:',
            '01000111 01001110',
            'BASE64 CHUNK:',
            'RoZSBkb29yIG11c3Qgb',
            'mV2ZXIgYmUg',
            '("The door must never be ")'
        ]
    },
    'ES06': {
        'bg': (8, 20, 14),
        'ink': (61, 255, 139),
        'accent': (40, 160, 80),
        'header': 'EDITOR WINDOW • CORE_DUMP.C',
        'type': 'crash_dump',
        'lines': [
            '// core_dump.c',
            '// DUMP continues:',
            '20 50 52 4F 43 45 53 53',
            '20 48 4F 4C 4C 4F',
            '| PROCESS HOLLO|',
            '[THREAD 4 FAULT DETECTED]'
        ]
    },
    'ES07': {
        'bg': (12, 24, 18),
        'ink': (61, 255, 139),
        'accent': (40, 150, 80),
        'header': 'FANFOLD SHEET 2 • TOKEN LEDGER',
        'type': 'log',
        'lines': [
            'TK-01: 1996-10-31 16:12:44',
            'TK-02: 1996-10-31 17:03:10',
            'TK-03: 1996-10-31 18:40:27',
            'TK-04: 1996-10-31 20:31:05',
            'TK-05: 1996-10-31 21:15:52',
            'TK-06: 1996-10-31 22:09:33',
            'TK-07: 2026-10-31 23:47:09'
        ]
    },
    'ES08': {
        'bg': (35, 38, 15),
        'ink': (255, 255, 140),
        'accent': (180, 180, 80),
        'header': 'CABLE TAG • PASSCODE SCRAP B',
        'type': 'sticky',
        'lines': [
            'TAGGED AT TERMINAL 02',
            'RECOVERED STRIP B:',
            '01000101 01001111',
            '--------------------',
            'BYTE 3: 01000101 (E)',
            'BYTE 4: 01001111 (O)',
            '[SEAM: MATCH WITH SCRAP A]'
        ]
    },
    'ES09': {
        'bg': (15, 20, 16),
        'ink': (182, 255, 209),
        'accent': (80, 160, 110),
        'header': 'CRT SCREEN DUMP TAPE 3',
        'type': 'tape',
        'lines': [
            'BUFFER TAPE [C]',
            'BINARY RECOVERY:',
            '01000001 01001100',
            'BASE64 CHUNK:',
            'b3BlbmVkIGZyb20gaW5',
            'zaWRlLg==',
            '("opened from inside.")'
        ]
    },
    'ES10': {
        'bg': (12, 24, 18),
        'ink': (255, 110, 110),
        'accent': (180, 60, 60),
        'header': 'FANFOLD SHEET 3 • SECURITY POLICY',
        'type': 'log',
        'lines': [
            'AUTHORISED SOURCES:',
            'WS-DANIEL, WS-MARA,',
            'TABLET-01, TABLET-02,',
            'HOUSE-CORE',
            '----------------------',
            'HOUSE SEALED:',
            '1996-10-31 23:59:59',
            'POST-SEAL TOKENS INVALID'
        ]
    },
    'ES11': {
        'bg': (20, 26, 22),
        'ink': (182, 255, 209),
        'accent': (90, 150, 120),
        'header': 'PRINTED MEMO • MEMORY DUMP END',
        'type': 'crash_dump',
        'lines': [
            '...end of dump:',
            '57 2E 53 59 53 20 48',
            '41 4C 54 45 44',
            '|W.SYS HALTED|',
            '----------------------',
            'FATAL CRASH COMPLETE:',
            'PROCESS: HOLLOW.SYS'
        ]
    },
    'ES12': {
        'bg': (22, 28, 24),
        'ink': (120, 255, 180),
        'accent': (80, 180, 130),
        'header': 'SCREEN PROTECTOR SCRAP • NOTE',
        'type': 'memo',
        'lines': [
            'RECOVERED RIDDLE NOTE:',
            '',
            '"Passcode: the name of',
            'the youngest one.',
            'Four letters."',
            '',
            '[DANIEL\'S HANDWRITING]'
        ]
    },
    'EK02': {
        'bg': (25, 15, 15),
        'ink': (255, 80, 80),
        'accent': (160, 40, 40),
        'header': 'REEL RECORDER SPOOL SEGMENT',
        'type': 'reel',
        'lines': [
            '[AUDIO TAPE CORRUPTED]',
            'STATIC FREQUENCY OVERRIDE',
            'TRANSMISSION INTEGRITY: 0%',
            '',
            'SPOKEN WORD DETECTED:',
            '>>> "CLOSE" <<<',
            '(FREQUENCY INTERCEPTED)'
        ]
    },
    'EK03': {
        'bg': (38, 32, 20),
        'ink': (255, 220, 160),
        'accent': (180, 140, 80),
        'header': 'ESTATE ARCHIVE • CIPHER SCRAP B',
        'type': 'aged',
        'lines': [
            'Daniel\'s Bookshelf Recess',
            'TRIAD CIPHER (PART B):',
            '',
            'FFA JCXAZAASD NZ',
            '',
            'Concealed behind ledger.',
            'Central cipher phrase.'
        ]
    },
    'XS01': {
        'bg': (10, 22, 16),
        'ink': (61, 200, 120),
        'accent': (40, 140, 80),
        'header': 'OLD TERMINAL PRINTOUT [DECOY]',
        'type': 'decoy',
        'lines': [
            'DUMP (OLD ARCHIVE):',
            '4B 45 45 50 20 54 48 45',
            '20 4C 49 47 48 54 53 20',
            '4F 4E',
            '|KEEP THE LIGHTS ON|',
            '[MAINTENANCE ARCHIVE]'
        ]
    },
    'XS02': {
        'bg': (32, 34, 16),
        'ink': (240, 240, 100),
        'accent': (170, 170, 60),
        'header': 'DECOY STICKY NOTE [RADIATOR]',
        'type': 'decoy',
        'lines': [
            'SCRAP DISCARD:',
            '01001100 01000101',
            '01001110 01000001',
            '--------------------',
            'ASCII: L E N A',
            '[MISDIRECTION NOTE]'
        ]
    },
}

def render_fragment(frag_id):
    cfg = FRAGMENTS_DATA[frag_id]
    w, h = 256, 256
    img = Image.new('RGBA', (w, h), cfg['bg'] + (255,))
    draw = ImageDraw.Draw(img)

    # 1. Background grid / scanlines
    bg_r, bg_g, bg_b = cfg['bg']
    grid_col = (min(255, bg_r + 15), min(255, bg_g + 15), min(255, bg_b + 15), 255)
    for y in range(0, h, 16):
        draw.line([(0, y), (w, y)], fill=grid_col, width=1)
    if cfg['type'] in ('log', 'fanfold', 'crash_dump'):
        for x in range(0, w, 32):
            draw.line([(x, 0), (x, h)], fill=grid_col, width=1)

    # 2. Border
    border_col = cfg['accent'] + (255,)
    draw.rectangle([(2, 2), (w - 3, h - 3)], outline=border_col, width=2)
    draw.rectangle([(5, 5), (w - 6, h - 6)], outline=(bg_r + 25, bg_g + 25, bg_b + 25, 255), width=1)

    # 3. Header bar
    header_bg = (min(255, bg_r + 20), min(255, bg_g + 20), min(255, bg_b + 20), 255)
    draw.rectangle([(6, 6), (w - 7, 28)], fill=header_bg)
    draw.line([(6, 28), (w - 7, 28)], fill=border_col, width=1)

    font_hdr = ImageFont.truetype('C:\\Windows\\Fonts\\consola.ttf', 9)
    draw.text((10, 11), cfg['header'], fill=cfg['ink'] + (255,), font=font_hdr)

    # 4. Content lines
    font_body = ImageFont.truetype('C:\\Windows\\Fonts\\consola.ttf', 10)
    font_bold = ImageFont.truetype('C:\\Windows\\Fonts\\consolab.ttf', 11)
    font_title = ImageFont.truetype('C:\\Windows\\Fonts\\courbd.ttf', 14)

    start_y = 38
    line_h = 16

    if frag_id == 'EK03':
        # Large centered cipher triad scrap
        draw.text((12, start_y), cfg['lines'][0], fill=cfg['accent'] + (255,), font=font_body)
        draw.text((12, start_y + 16), cfg['lines'][1], fill=cfg['ink'] + (255,), font=font_bold)
        
        # Big bold cipher line centered
        cipher_text = cfg['lines'][3]
        bbox = font_title.getbbox(cipher_text)
        tw = bbox[2] - bbox[0]
        cx = (w - tw) // 2
        
        draw.rectangle([(16, 105), (w - 17, 145)], fill=(bg_r + 30, bg_g + 25, bg_b + 15, 255), outline=border_col, width=1)
        draw.text((cx, 117), cipher_text, fill=(255, 240, 190, 255), font=font_title)

        draw.text((12, 175), cfg['lines'][5], fill=(180, 170, 140, 255), font=font_body)
        draw.text((12, 192), cfg['lines'][6], fill=(180, 170, 140, 255), font=font_body)
    else:
        for idx, line in enumerate(cfg['lines']):
            cur_y = start_y + idx * line_h
            if cur_y > h - 20:
                break
            
            # Highlight important data lines
            is_highlight = any(k in line for k in ('DUMP', 'BINARY', 'BASE64', 'TK-07', 'SRC-0477', 'HOLLOW', 'CLOSE', 'Passcode'))
            line_font = font_bold if is_highlight else font_body
            ink_col = cfg['ink'] + (255,) if is_highlight else (min(255, cfg['ink'][0] - 30), min(255, cfg['ink'][1] - 30), min(255, cfg['ink'][2] - 30), 235)
            
            draw.text((14, cur_y), line, fill=ink_col, font=line_font)

    # 5. Footer tag
    draw.line([(6, h - 18), (w - 7, h - 18)], fill=header_bg, width=1)
    footer_text = f"SEC-ID: {frag_id} // H-HOUSE STUDY"
    draw.text((10, h - 14), footer_text, fill=(cfg['accent'][0], cfg['accent'][1], cfg['accent'][2], 180), font=font_hdr)

    out_file = TARGET_DIR / f"{frag_id}.png"
    img.save(out_file, "PNG")
    print(f"Generated {frag_id}.png -> {out_file}")

def main():
    print(f"Generating {len(FRAGMENTS_DATA)} study evidence fragments into {TARGET_DIR}...")
    for fid in FRAGMENTS_DATA:
        render_fragment(fid)
    print("Room 2 Study evidence generation complete!")

if __name__ == '__main__':
    main()
