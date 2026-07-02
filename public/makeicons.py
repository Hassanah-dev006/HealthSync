# save as makeicons.py, then: python makeicons.py
from PIL import Image, ImageDraw
def make(sz, path):
    img = Image.new('RGBA', (sz, sz), (0,0,0,0)); d = ImageDraw.Draw(img)
    pad = int(sz*0.06); r = int(sz*0.18)
    d.rounded_rectangle([pad,pad,sz-pad,sz-pad], radius=r, fill=(14,91,97,255))
    cw = int(sz*0.12); cx=cy=sz//2; arm=int(sz*0.26)
    d.rounded_rectangle([cx-cw//2, cy-arm, cx+cw//2, cy+arm], radius=cw//3, fill=(255,255,255,255))
    d.rounded_rectangle([cx-arm, cy-cw//2, cx+arm, cy+cw//2], radius=cw//3, fill=(255,255,255,255))
    d.ellipse([int(sz*0.62),int(sz*0.16),int(sz*0.62)+int(sz*0.12),int(sz*0.16)+int(sz*0.12)], fill=(31,184,166,255))
    img.save(path)
make(192,'public/icons/icon-192.png')
make(512,'public/icons/icon-512.png')
make(512,'public/icons/maskable-512.png')
print('done')