"""Удаляет метаданные C2PA из ассетов (webp и mp3).

Некоторые инструменты при копировании дописывают в файлы блок C2PA («учётные данные контента»):
в WebP — чанк `C2PA` после данных изображения, в MP3 — кадр ID3 `GEOB` с типом application/c2pa.
Chrome такие файлы читает, а Safari на iPhone отказывается декодировать простые WebP с лишним
чанком, и игра остаётся с чёрным экраном.

  python3 tools/strip_c2pa.py          # почистить файлы в assets/
  python3 tools/strip_c2pa.py --check  # только проверить (для CI), код 1 если что-то найдено
"""
import pathlib
import sys


def strip_webp(data: bytes) -> bytes:
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        return data
    out, i = [], 12
    while i + 8 <= len(data):
        tag, n = data[i:i + 4], int.from_bytes(data[i + 4:i + 8], 'little')
        end = i + 8 + n + (n & 1)
        if tag != b'C2PA':
            out.append(data[i:end])
        i = end
    body = b'WEBP' + b''.join(out)
    return b'RIFF' + len(body).to_bytes(4, 'little') + body


def syncsafe(n: int) -> bytes:
    return bytes([(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127])


def unsync(b: bytes) -> int:
    return (b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3]


def strip_mp3(data: bytes) -> bytes:
    if data[:3] != b'ID3' or data[3] not in (3, 4) or data[5] & 0x40:
        return data
    size, ver = unsync(data[6:10]), data[3]
    frames, i, end = [], 10, 10 + size
    while i + 10 <= end and data[i] != 0:
        n = unsync(data[i + 4:i + 8]) if ver == 4 else int.from_bytes(data[i + 4:i + 8], 'big')
        frame = data[i:i + 10 + n]
        if not (frame[:4] == b'GEOB' and b'application/c2pa' in frame[:64]):
            frames.append(frame)
        i += 10 + n
    tag = b''.join(frames)
    return data[:6] + syncsafe(len(tag)) + tag + data[end:]


def main() -> int:
    check = '--check' in sys.argv
    root = pathlib.Path(__file__).resolve().parent.parent / 'assets'
    found = []
    for p in sorted(root.rglob('*')):
        if 'incoming' in p.parts or p.suffix not in ('.webp', '.mp3'):
            continue
        data = p.read_bytes()
        clean = strip_webp(data) if p.suffix == '.webp' else strip_mp3(data)
        if clean != data:
            found.append(p.relative_to(root.parent))
            if not check:
                p.write_bytes(clean)
    verb = 'с C2PA' if check else 'очищено'
    print(f'{verb}: {len(found)}')
    for p in found[:20]:
        print(' ', p)
    return 1 if check and found else 0


if __name__ == '__main__':
    sys.exit(main())
