#!/usr/bin/env python3
"""Recolour the Switchyard into KULT World's "Neon Dusk" palette.

Every colour literal in the stylesheets and the 3D district (0xRRGGBB) is
mapped by hue, so no shade is missed:
  lime / yellow-green (the old Syndicates accent) -> Syndicates hot orange
  navy and blue-grey neutrals                     -> KULT World violet night
  dark green tints                                -> violet
  lavender / violet                               -> KULT violet
  cyan, warm tones and bright success greens      -> unchanged
Run it once on the original files; it is not meant to be applied twice.
    python scripts/kult_theme.py web/world.css web/district-ux.css web/style.css web/district3d.js
"""
import colorsys, re, sys

def hexrgb(h):
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]

def rgbhex(r, g, b):
    return ''.join(f'{max(0, min(255, round(v * 255))):02x}' for v in (r, g, b))

def remap(h6):
    r, g, b = hexrgb(h6)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if s < 0.1:                       # near-grey: tint toward violet night
        if l > 0.93: return h6        # white stays white
        return rgbhex(*colorsys.hls_to_rgb(258 / 360, l, min(0.38, s + 0.22)))
    if 55 <= deg <= 118:              # lime / yellow-green: the old accent
        return rgbhex(*colorsys.hls_to_rgb(16 / 360, min(max(l, 0.42), 0.72), max(s, 0.88)))
    if 118 < deg <= 175:              # greens
        if l < 0.32: return rgbhex(*colorsys.hls_to_rgb(262 / 360, l, min(0.45, s + 0.1)))
        return h6                     # success greens stay readable
    if 175 < deg <= 198 and s > 0.35 and l > 0.45:
        return h6                     # cyan highlights stay
    if 175 < deg <= 245:              # navy / blue-grey neutrals
        return rgbhex(*colorsys.hls_to_rgb(258 / 360, l * 0.96, min(0.55, s * 1.15 + 0.05)))
    if 245 < deg <= 290:              # lavender / violet
        return rgbhex(*colorsys.hls_to_rgb(262 / 360, l, s))
    return h6

def recolour(text):
    def css(m):
        h = m.group(1); alpha = m.group(2) or ''
        return '#' + remap(h.lower()) + alpha
    text = re.sub(r'#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?(?![0-9a-fA-F])', css, text)
    text = re.sub(r'#([0-9a-fA-F]{3})(?![0-9a-fA-F])', lambda m: '#' + remap(m.group(1).lower()), text)
    text = re.sub(r'0x([0-9a-fA-F]{6})\b', lambda m: '0x' + remap(m.group(1).lower()), text)
    return text

for path in sys.argv[1:]:
    src = open(path, encoding='utf-8').read()
    out = recolour(src)
    open(path, 'w', encoding='utf-8', newline='').write(out)
    print(path, 'recoloured')
