#!/usr/bin/env bash
set -euo pipefail

CAPTURE_URL="${CAPTURE_URL:-}"
CAPTURE_DIR="${CAPTURE_DIR:-}"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"

if [[ -z "$CAPTURE_URL" || -z "$CAPTURE_DIR" ]]; then
  echo 'Set CAPTURE_URL and CAPTURE_DIR.' >&2
  exit 1
fi
/usr/bin/time -p test -f "$RUNTIME_DIR/scripts/default-capture.mjs"
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"

# The runtime capture closes Chromium in its finally block and deliberately
# does not stop the already-running application. Its transient browser/network
# errors use exit 75; rendering and published-build errors use exit 1.
/usr/bin/time -p env CAPTURE_URL="$CAPTURE_URL" CAPTURE_DIR="$CAPTURE_DIR" \
  CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-#game}" \
  node "$RUNTIME_DIR/scripts/default-capture.mjs"

# Keep artifacts suitable for lightweight validation previews. Chromium's
# desktop preset is 1440px wide; cap the saved artifact at 1280px without
# requiring an optional image package in the deployment environment.
if command -v python3 >/dev/null 2>&1; then
  /usr/bin/time -p python3 - "$CAPTURE_DIR" <<'PY'
from pathlib import Path
import struct, sys, zlib, binascii

def resize_png(path, max_width=1280):
    raw = path.read_bytes()
    if raw[:8] != b'\x89PNG\r\n\x1a\n': return
    pos = 8; chunks = []; width = height = depth = color = None; packed = b''
    while pos < len(raw):
        n = struct.unpack('>I', raw[pos:pos+4])[0]; typ = raw[pos+4:pos+8]; data = raw[pos+8:pos+8+n]; pos += 12+n
        if typ == b'IHDR': width, height, depth, color, _, _, _ = struct.unpack('>IIBBBBB', data)
        elif typ == b'IDAT': packed += data
        elif typ == b'IEND': break
        else: chunks.append((typ, data))
    if not width or width <= max_width or depth != 8 or color not in (2, 6): return
    channels = 3 if color == 2 else 4; stride = width * channels
    decoded = zlib.decompress(packed); rows = []; prev = bytearray(stride); at = 0
    for _ in range(height):
        filt = decoded[at]; at += 1; cur = bytearray(decoded[at:at+stride]); at += stride
        for i in range(stride):
            left = cur[i-channels] if i >= channels else 0; up = prev[i]; ul = prev[i-channels] if i >= channels else 0
            if filt == 1: cur[i] = (cur[i] + left) & 255
            elif filt == 2: cur[i] = (cur[i] + up) & 255
            elif filt == 3: cur[i] = (cur[i] + ((left + up)//2)) & 255
            elif filt == 4:
                p = left + up - ul; pa = abs(p-left); pb = abs(p-up); pc = abs(p-ul); cur[i] = (cur[i] + (left if pa <= pb and pa <= pc else up if pb <= pc else ul)) & 255
        rows.append(cur); prev = cur
    new_w = max_width; new_h = round(height * new_w / width); out = bytearray()
    for y in range(new_h):
        row = rows[min(height-1, y * height // new_h)]; out.append(0)
        for x in range(new_w):
            i = min(width-1, x * width // new_w) * channels; out.extend(row[i:i+channels])
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', binascii.crc32(t+d) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', new_w, new_h, 8, color, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(out), 6)) + chunk(b'IEND', b''))

root = Path(sys.argv[1])
resize_png(root / 'final-desktop.png') if (root / 'final-desktop.png').exists() else None
resize_png(root / 'final-mobile.png') if (root / 'final-mobile.png').exists() else None
PY
fi
