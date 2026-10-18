# Бесшовная петля из сегментов адаптивной музыки Wyrmsun (Marcelo Fernandez, CC-BY 4.0).
# Каждый сегмент — N тактов плюс хвост реверберации. Сегменты ставятся встык по сетке тактов, хвосты
# накладываются на следующий сегмент, а хвост последнего заворачивается в начало: петля звучит без шва.
# Запуск: python3 -I wyrmsun_loop.py <bpm> <out.wav> <seg1.ogg> <seg2.ogg> ...
import sys, subprocess
import numpy as np

bpm, out, segs = float(sys.argv[1]), sys.argv[2], sys.argv[3:]
SR = 44100
unit = 8 * 4 * 60 / bpm  # 8 тактов 4/4 — шаг сетки сегментов


def decode(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


parts, t = [], 0.0
for p in segs:
    a = decode(p)
    bars = max(1, int((len(a) / SR - 1.0) / unit + 0.5))  # длина без хвоста, кратная сетке
    parts.append((round(t * SR), a))
    t += bars * unit
total = round(t * SR)
mix = np.zeros((total, 2), dtype=np.float32)
for start, a in parts:
    for k in range(0, len(a), total):  # всё, что вылезло за конец, — в начало
        chunk = a[k:k + total]
        s = (start + k) % total
        n = min(len(chunk), total - s)
        mix[s:s + n] += chunk[:n]
        if n < len(chunk): mix[:len(chunk) - n] += chunk[n:]
peak = float(np.abs(mix).max())
if peak > 0.98: mix *= 0.98 / peak
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', out],
               input=mix.tobytes(), check=True)
print(f'{out}: {total / SR:.1f} s, peak {20 * np.log10(max(peak, 1e-9)):.1f} dBFS')
