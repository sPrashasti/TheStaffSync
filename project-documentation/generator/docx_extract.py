"""Reads a .docx in document order with the standard library only.

Prints headings/paragraphs (with style), tables (row by row, cell text), text boxes, and image
placeholders; saves every embedded image to an output folder so it can be inspected visually.
Usage: python docx_extract.py <file.docx> <image_out_dir>
"""
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
V = 'urn:schemas-microsoft-com:vml'
NS = {'w': W, 'r': R, 'a': A, 'v': V}


def q(ns, tag):
    return '{%s}%s' % (NS[ns], tag)


def load_styles(z):
    names = {}
    if 'word/styles.xml' in z.namelist():
        root = ET.fromstring(z.read('word/styles.xml'))
        for s in root.iter(q('w', 'style')):
            sid = s.get(q('w', 'styleId'))
            n = s.find(q('w', 'name'))
            names[sid] = n.get(q('w', 'val')) if n is not None else sid
    return names


def load_rels(z):
    rels = {}
    path = 'word/_rels/document.xml.rels'
    if path in z.namelist():
        root = ET.fromstring(z.read(path))
        for rel in root:
            rels[rel.get('Id')] = rel.get('Target')
    return rels


def para_text(p):
    out = []
    for node in p.iter():
        if node.tag == q('w', 't'):
            out.append(node.text or '')
        elif node.tag == q('w', 'tab'):
            out.append('\t')
        elif node.tag in (q('w', 'br'), q('w', 'cr')):
            out.append('\n')
    return ''.join(out)


def images_in(el, rels):
    found = []
    for blip in el.iter(q('a', 'blip')):
        rid = blip.get(q('r', 'embed'))
        if rid in rels:
            found.append(rels[rid])
    for im in el.iter(q('v', 'imagedata')):
        rid = im.get(q('r', 'id'))
        if rid in rels:
            found.append(rels[rid])
    return found


def textboxes_in(el):
    boxes = []
    for tb in el.iter(q('w', 'txbxContent')):
        t = ' / '.join(x for x in (para_text(p).strip() for p in tb.iter(q('w', 'p'))) if x)
        if t:
            boxes.append(t)
    return boxes


def walk(body, styles, rels, out, depth=0):
    ind = '  ' * depth
    for child in body:
        if child.tag == q('w', 'p'):
            ppr = child.find(q('w', 'pPr'))
            style = ''
            if ppr is not None and ppr.find(q('w', 'pStyle')) is not None:
                style = styles.get(ppr.find(q('w', 'pStyle')).get(q('w', 'val')), '')
            # paragraph text excluding text-box content (reported separately)
            clone_text = []
            for node in child.iter():
                if node.tag == q('w', 'txbxContent'):
                    continue
            text = para_text(child)
            boxes = textboxes_in(child)
            for b in boxes:
                text = text.replace(b.replace(' / ', ''), '')
            imgs = images_in(child, rels)
            label = f'[{style}] ' if style and style not in ('Normal', 'normal') else ''
            if text.strip():
                out.append(f'{ind}{label}{text.strip()}')
            for b in boxes:
                out.append(f'{ind}  <TEXTBOX> {b}')
            for i in imgs:
                out.append(f'{ind}  <IMAGE {os.path.basename(i)}>')
        elif child.tag == q('w', 'tbl'):
            rows = child.findall(q('w', 'tr'))
            out.append(f'{ind}<TABLE {len(rows)} rows>')
            for ri, tr in enumerate(rows):
                cells = []
                for tc in tr.findall(q('w', 'tc')):
                    ctext = ' | '.join(x for x in (para_text(p).strip() for p in tc.findall('.//' + q('w', 'p'))) if x)
                    imgs = images_in(tc, rels)
                    if imgs:
                        ctext += ' ' + ' '.join(f'<IMAGE {os.path.basename(i)}>' for i in imgs)
                    cells.append(ctext)
                out.append(f'{ind}  R{ri + 1}: ' + ' || '.join(cells))
            out.append(f'{ind}</TABLE>')
        elif child.tag == q('w', 'sdt'):
            content = child.find(q('w', 'sdtContent'))
            if content is not None:
                walk(content, styles, rels, out, depth)


def main(path, img_dir):
    z = zipfile.ZipFile(path)
    styles = load_styles(z)
    rels = load_rels(z)
    root = ET.fromstring(z.read('word/document.xml'))
    body = root.find(q('w', 'body'))
    out = []
    walk(body, styles, rels, out)
    # headers/footers
    for name in sorted(n for n in z.namelist() if re.match(r'word/(header|footer)\d*\.xml', n)):
        t = ' '.join(para_text(p).strip() for p in ET.fromstring(z.read(name)).iter(q('w', 'p'))).strip()
        if t:
            out.append(f'<{name}> {t}')
    os.makedirs(img_dir, exist_ok=True)
    media = [n for n in z.namelist() if n.startswith('word/media/') and not n.endswith('/')]
    for m in media:
        with open(os.path.join(img_dir, os.path.basename(m)), 'wb') as f:
            f.write(z.read(m))
    out.append(f'<MEDIA FILES: {", ".join(os.path.basename(m) for m in media) or "none"}>')
    print('\n'.join(out))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], sys.argv[2])
