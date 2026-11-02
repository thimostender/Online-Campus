# Baut das Campusgebaeude aus 3d/gebaeude.json in Blender und rendert eine Probe oder backt die Lichtkarten.
#   Blender -b -P 3d/bauen.py -- --probe proben/haus.png [--ansicht haus|eg|og1|og2|og3|eingang] [--samples 96]
#   Blender -b -P 3d/bauen.py -- --backen prototyp/campus3d [--samples 128] [--klein]
# Koordinaten wie in prototyp/gebaeude.js: x 0-60 (West-Ost), z 0-20 (Nord-Sued), y Hoehe, Meter. Blender: (x, -z, y).
# Vorbild: Kassencapitano verwaltung-3d (sportheim_bauen.py). Gleiche Fallen beachtet: verschweissen, keine
# deckungsgleichen Flaechen, Metall hoechstens 0.5, Lichtkarten ohne Mipmaps (im Browser).
import bmesh, bpy, json, math, os, random, sys
from mathutils import Matrix, Vector

ARG = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(name, d=None):
    return ARG[ARG.index(name) + 1] if name in ARG else d
HIER = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HIER, "quellen")
G = json.load(open(os.path.join(HIER, "gebaeude.json")))
random.seed(20261102)

GH, SOCKEL, HW = 3.6, 0.3, 3.3          # Geschosshoehe, Fussboden EG ueber Gelaende, lichte Wandhoehe
def y0(n): return n * GH + SOCKEL      # Oberkante Fussboden Geschoss n
B, T = G["breite"], G["tiefe"]
FL0, FL1 = G["flur"]
KERN = G["kern"]
LOCH = (26.3, 30.9, 0.3, 6.3)           # Treppenauge in den Decken ab 1. OG

bpy.ops.wm.read_factory_settings(use_empty=True)
szene = bpy.context.scene

# --- Materialien -------------------------------------------------------------------
def bild(datei, farbe=True):
    i = bpy.data.images.load(os.path.join(Q, datei), check_existing=True)
    i.colorspace_settings.name = "sRGB" if farbe else "Non-Color"
    return i

def rgb(h):
    def s(c):
        c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (s(h >> 16 & 255), s(h >> 8 & 255), s(h & 255), 1)

KACHEL = {}  # Meter je Texturwiederholung
def material(name, id=None, farbe=(0.8, 0.8, 0.8, 1), metall=0.0, rauh=0.6, karte=None, strahlt=0.0, alpha=False, glas=False, kachel=2.0, normalstaerke=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links; p = n["Principled BSDF"]
    p.inputs["Base Color"].default_value = farbe; p.inputs["Metallic"].default_value = min(metall, 0.5); p.inputs["Roughness"].default_value = rauh
    if id:
        d = n.new("ShaderNodeTexImage"); d.image = bild(f"{id}_diff.jpg")
        if tuple(farbe[:3]) != (0.8, 0.8, 0.8):
            g = n.new("ShaderNodeMix"); g.data_type = "RGBA"; g.blend_type = "MULTIPLY"; g.inputs["Factor"].default_value = 1
            l.new(d.outputs["Color"], g.inputs["A"]); g.inputs["B"].default_value = farbe; l.new(g.outputs["Result"], p.inputs["Base Color"])
        else:
            l.new(d.outputs["Color"], p.inputs["Base Color"])
        r = n.new("ShaderNodeTexImage"); r.image = bild(f"{id}_rough.jpg", False); l.new(r.outputs["Color"], p.inputs["Roughness"])
        nt = n.new("ShaderNodeTexImage"); nt.image = bild(f"{id}_nor.jpg", False)
        nm = n.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = normalstaerke
        l.new(nt.outputs["Color"], nm.inputs["Color"]); l.new(nm.outputs["Normal"], p.inputs["Normal"])
    if karte:
        d = n.new("ShaderNodeTexImage"); d.image = bild(karte); l.new(d.outputs["Color"], p.inputs["Base Color"])
        if strahlt:
            l.new(d.outputs["Color"], p.inputs["Emission Color"]); p.inputs["Emission Strength"].default_value = strahlt
        if alpha:
            l.new(d.outputs["Alpha"], p.inputs["Alpha"]); m.blend_method = "CLIP"
    if glas:
        p.inputs["Transmission Weight"].default_value = 1.0; p.inputs["IOR"].default_value = 1.45; p.inputs["Roughness"].default_value = 0.04
    KACHEL[m.name] = kachel
    return m

M = {
    "fassade": material("fassade", "plastered_wall_02", kachel=2.5, normalstaerke=0.6),
    "band": material("band", "rectangular_facade_tiles", farbe=rgb(0x5a5c63), kachel=2.0),
    "sockel": material("sockel", "brick_wall_001", farbe=rgb(0x9c9a96), kachel=1.2),
    "putz": material("putz", "plastered_wall_02", farbe=rgb(0xf4f2ee), kachel=2.5, normalstaerke=0.4),
    "decke": material("decke", farbe=rgb(0xf2f1ee), rauh=0.9),
    "terrazzo": material("terrazzo", "terrazzo_tiles", farbe=rgb(0xc9cbcc), kachel=2.0),
    "holz": material("holz", "oak_wood_planks", kachel=2.0),
    "estrich": material("estrich", "concrete_floor_02", farbe=rgb(0xc9ccd0), kachel=2.5),
    "fliese": material("fliese", "floor_tiles_06", kachel=1.0),
    "wandfliese": material("wandfliese", "interior_tiles", kachel=1.0),
    "beton": material("beton", "concrete_floor_02", kachel=3.0),
    "pflaster": material("pflaster", "gehwegplatten", farbe=rgb(0xb8b6b0), kachel=1.6),
    "asphalt": material("asphalt", "asphalt_02", kachel=4.0),
    "rasen": material("rasen", "leafy_grass", farbe=rgb(0x86b85a), kachel=3.0),
    "kies": material("kies", "concrete_floor_02", farbe=rgb(0x9a9b98), kachel=4.0),
    "rahmen": material("rahmen", farbe=rgb(0x3a3d44), metall=0.4, rauh=0.38),
    "stahl": material("stahl", farbe=rgb(0xa9adb3), metall=0.5, rauh=0.32),
    "schwarz": material("schwarz", farbe=rgb(0x15161a), rauh=0.45),
    "weiss": material("weiss", farbe=rgb(0xf5f5f3), rauh=0.5),
    "lila": material("lila", farbe=rgb(0x5b21b6), rauh=0.45),
    "tisch": material("tisch", farbe=rgb(0xd9c6a5), rauh=0.5),
    "tischbein": material("tischbein", farbe=rgb(0x4b4f57), metall=0.4, rauh=0.4),
    "polster": material("polster", farbe=rgb(0x6d5bd0), rauh=0.85),
    "polster2": material("polster2", farbe=rgb(0x2f6f6a), rauh=0.85),
    "regal": material("regal", farbe=rgb(0xc7a77d), rauh=0.6),
    "monitor": material("monitor", farbe=rgb(0x111318), rauh=0.25),
    "tresen": material("tresen", farbe=rgb(0xe9e4dc), rauh=0.45),
    "rinde": material("rinde", farbe=rgb(0x5a4a3a), rauh=0.9),
    "blatt": material("blatt", karte="blatt.png", alpha=True, rauh=0.8),
    "glas": material("glas", farbe=(0.85, 0.9, 0.92, 1), glas=True),
    "leinwand": material("leinwand", karte="schilder/leinwand.png", strahlt=0.6, rauh=0.6),
    "whiteboard": material("whiteboard", karte="schilder/whiteboard.png", rauh=0.3),
    "schild": material("schild", karte="schilder/campus_schild.png", rauh=0.45),
    "tuerschild": material("tuerschild", karte="schilder/tuerschilder.png", rauh=0.4),
    "geschossschild": material("geschossschild", karte="schilder/geschoss.png", rauh=0.4),
    "anzeige": material("anzeige", karte="schilder/anzeige.png", strahlt=1.0, rauh=0.3),
}
BUCH = [material(f"buch{i}", farbe=rgb(c), rauh=0.7) for i, c in enumerate((0x7f1d1d, 0x1e3a8a, 0x14532d, 0x78350f, 0x4c1d95, 0x334155, 0xa16207, 0x0f766e))]

# --- Sammelnetze ---------------------------------------------------------------------
EINHEITEN = {}
def netz(einheit):
    return EINHEITEN.setdefault(einheit, {"v": [], "f": [], "uv": [], "m": [], "mats": []})
def slot(e, mat):
    if mat not in e["mats"]: e["mats"].append(mat)
    return e["mats"].index(mat)
def bv(x, y, z):
    return Vector((x, -z, y))
def flaeche(e, punkte, uvs, mat):
    i = len(e["v"]); e["v"].extend(punkte); e["f"].append(tuple(range(i, i + len(punkte)))); e["uv"].append(uvs); e["m"].append(slot(e, mat))

def welt_uv(punkte, mat):
    # Weltbezogene UVs: Texturen laufen ueber Stoesse und Oeffnungen durch
    k = KACHEL.get(mat.name, 2.0)
    a = punkte[0]; n = (punkte[1] - a).cross(punkte[2] - a)
    ax = max(range(3), key=lambda i: abs(n[i]))
    if ax == 0: return [(p.y / k, p.z / k) for p in punkte]
    if ax == 1: return [(p.x / k, p.z / k) for p in punkte]
    return [(p.x / k, p.y / k) for p in punkte]

def kiste(b, h, t, mat, x, y, z, einheit, ry=0.0, mats=None, welt=True, basis=None, ohne=()):
    """Quader, Mitte (x, y, z). mats je Seite: [sued(+z), nord(-z), ost(+x), west(-x), oben, unten]. ohne: Seiten weglassen."""
    e = netz(einheit)
    Bm = (basis or Matrix.Identity(4)) @ Matrix.Translation(bv(x, y, z)) @ Matrix.Rotation(ry, 4, "Z")
    hx, hy, hz = b / 2, t / 2, h / 2
    P = lambda a, c, d: (Bm @ Vector((a, c, d)))
    seiten = [
        ((-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz), b, h),
        ((hx, hy, -hz), (-hx, hy, -hz), (-hx, hy, hz), (hx, hy, hz), b, h),
        ((hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz), (hx, -hy, hz), t, h),
        ((-hx, hy, -hz), (-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), t, h),
        ((-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz), b, t),
        ((-hx, hy, -hz), (hx, hy, -hz), (hx, -hy, -hz), (-hx, -hy, -hz), b, t),
    ]
    for i, s in enumerate(seiten):
        if i in ohne: continue
        m_ = mats[i] if mats else mat
        pk = [P(*s[j]) for j in range(4)]
        k = KACHEL.get(m_.name, 2.0)
        uv = welt_uv(pk, m_) if welt else [(0, 0), (s[4] / k, 0), (s[4] / k, s[5] / k), (0, s[5] / k)]
        flaeche(e, pk, uv, m_)

def kasten(x1, x2, y1, y2, z1, z2, mat, einheit, **kw):
    kiste(x2 - x1, y2 - y1, z2 - z1, mat, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, einheit, **kw)

def zylinder(r, h, mat, x, y, z, oben=None, n=12, einheit="aussen", basis=None):
    e = netz(einheit); oben = r if oben is None else oben
    Bm = basis or Matrix.Identity(4); m = bv(x, y, z)
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        pk = lambda a, ra, zz: Bm @ Vector((m.x + ra * math.cos(a), m.y + ra * math.sin(a), m.z + zz))
        flaeche(e, [pk(a0, r, -h / 2), pk(a1, r, -h / 2), pk(a1, oben, h / 2), pk(a0, oben, h / 2)], [(i / n, 0), ((i + 1) / n, 0), ((i + 1) / n, 1), (i / n, 1)], mat)
        flaeche(e, [pk(a0, oben, h / 2), pk(a1, oben, h / 2), Bm @ Vector((m.x, m.y, m.z + h / 2))], [(0, 0), (1, 0), (0.5, 1)], mat)

def tafel(mat, b, h, x, y, z, blick, einheit, uv=(0, 0, 1, 1)):
    """Bildflaeche, die in Richtung blick (+z, -z, +x, -x, oben) zeigt. uv = Ausschnitt (u0, v0, u1, v1)."""
    Bb, H_ = b / 2, h / 2
    if blick == "+z": ecken = [(x - Bb, y - H_, z), (x + Bb, y - H_, z), (x + Bb, y + H_, z), (x - Bb, y + H_, z)]
    elif blick == "-z": ecken = [(x + Bb, y - H_, z), (x - Bb, y - H_, z), (x - Bb, y + H_, z), (x + Bb, y + H_, z)]
    elif blick == "+x": ecken = [(x, y - H_, z + Bb), (x, y - H_, z - Bb), (x, y + H_, z - Bb), (x, y + H_, z + Bb)]
    elif blick == "-x": ecken = [(x, y - H_, z - Bb), (x, y - H_, z + Bb), (x, y + H_, z + Bb), (x, y + H_, z - Bb)]
    else: ecken = [(x - Bb, y, z + H_), (x + Bb, y, z + H_), (x + Bb, y, z - H_), (x - Bb, y, z - H_)]
    u0, v0, u1, v1 = uv
    flaeche(netz(einheit), [bv(*q) for q in ecken], [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], mat)

# --- Waende mit Oeffnungen -------------------------------------------------------------
def wand(achse, a, b, pos, dicke, yu, h, oeff, mat_minus, mat_plus, einheit, laibung=None):
    """Wand entlang achse ('x' oder 'z') von a bis b, Mitte bei pos (die andere Koordinate).
    oeff: [(c1, c2, u0, u1)] mit u relativ zu yu. mat_minus: Seite zur kleineren Koordinate, mat_plus: zur groesseren."""
    laibung = laibung or mat_minus
    stuecke, c = [], a
    for c1, c2, u0, u1 in sorted(oeff):
        if c1 > c: stuecke.append((c, c1, 0, h))
        if u0 > 0: stuecke.append((c1, c2, 0, u0))
        if u1 < h: stuecke.append((c1, c2, u1, h))
        c = c2
    if c < b: stuecke.append((c, b, 0, h))
    for s1, s2, v0, v1 in stuecke:
        if s2 - s1 < 1e-4 or v1 - v0 < 1e-4: continue
        if achse == "x":
            mats = [mat_plus, mat_minus, laibung, laibung, laibung, laibung]
            kasten(s1, s2, yu + v0, yu + v1, pos - dicke / 2, pos + dicke / 2, None, einheit, mats=mats)
        else:
            mats = [laibung, laibung, mat_plus, mat_minus, laibung, laibung]
            kasten(pos - dicke / 2, pos + dicke / 2, yu + v0, yu + v1, s1, s2, None, einheit, mats=mats)

def fenster(achse, c1, c2, pos, yu, u0, u1, einheit_n, n):
    """Glas und Rahmen in eine Aussenwandoeffnung (pos = Wandmitte)."""
    r = 0.06
    if achse == "x":
        kasten(c1, c2, yu + u0, yu + u0 + r, pos - 0.1, pos + 0.1, M["rahmen"], einheit_n)
        kasten(c1, c2, yu + u1 - r, yu + u1, pos - 0.1, pos + 0.1, M["rahmen"], einheit_n)
        for c in (c1, (c1 + c2) / 2 - r / 2, c2 - r): kasten(c, c + r, yu + u0, yu + u1, pos - 0.1, pos + 0.1, M["rahmen"], einheit_n)
        kasten(c1, c2, yu + u0, yu + u0 + 0.03, pos - 0.32 if pos < T / 2 else pos + 0.02, pos - 0.02 if pos < T / 2 else pos + 0.32, M["stahl"], einheit_n)
        tafel(M["glas"], c2 - c1, u1 - u0, (c1 + c2) / 2, yu + (u0 + u1) / 2, pos, "+z", f"fenster{n}")
    else:
        kasten(pos - 0.1, pos + 0.1, yu + u0, yu + u0 + r, c1, c2, M["rahmen"], einheit_n)
        kasten(pos - 0.1, pos + 0.1, yu + u1 - r, yu + u1, c1, c2, M["rahmen"], einheit_n)
        for c in (c1, (c1 + c2) / 2 - r / 2, c2 - r): kasten(pos - 0.1, pos + 0.1, yu + u0, yu + u1, c, c + r, M["rahmen"], einheit_n)
        tafel(M["glas"], c2 - c1, u1 - u0, pos, yu + (u0 + u1) / 2, (c1 + c2) / 2, "+x", f"fenster{n}")

# --- Gebaeude je Geschoss ----------------------------------------------------------------
BODEN = {"hoersaal": "holz", "seminar": "holz", "labor": "estrich", "buero": "holz", "bibliothek": "holz", "wc": "fliese", "offen": "terrazzo"}
def bereich(r):
    return (r["x1"], r["x2"], 0.0, FL0) if r["seite"] == "n" else (r["x1"], r["x2"], FL1, T)

def bodenflaechen(g):
    """Zerlegt den Grundriss in Flaechen mit Bodenbelag: Raeume, Luecken, Flur, Kern."""
    teile = []
    for seite, z1, z2 in (("n", 0.0, FL0), ("s", FL1, T)):
        rs = sorted([r for r in g["raeume"] if r["seite"] == seite], key=lambda r: r["x1"])
        belegt = [(r["x1"], r["x2"], BODEN[r["art"]]) for r in rs]
        if seite == "n": belegt.append((KERN["x1"], KERN["x2"], "terrazzo"))
        belegt.sort(); x = 0.0
        for a, b, mat in belegt:
            if a > x: teile.append((x, a, z1, z2, "terrazzo"))
            teile.append((a, b, z1, z2, mat)); x = b
        if x < B: teile.append((x, B, z1, z2, "terrazzo"))
    teile.append((0.0, B, FL0, FL1, "terrazzo"))
    return teile

def minus_loch(x1, x2, z1, z2):
    """Rechteck ohne Treppenauge, als Liste von Rechtecken."""
    lx1, lx2, lz1, lz2 = LOCH
    if x2 <= lx1 or x1 >= lx2 or z2 <= lz1 or z1 >= lz2: return [(x1, x2, z1, z2)]
    aus = []
    if x1 < lx1: aus.append((x1, lx1, z1, z2))
    if x2 > lx2: aus.append((lx2, x2, z1, z2))
    mx1, mx2 = max(x1, lx1), min(x2, lx2)
    if z1 < lz1: aus.append((mx1, mx2, z1, lz1))
    if z2 > lz2: aus.append((mx1, mx2, lz2, z2))
    return aus

def tuerschild_uv(nr, name):
    from_ = [f"{g['nr']}|{r['name']}" for g in G["geschosse"] for r in g["raeume"] if r["art"] != "offen"]
    i = from_.index(f"{nr}|{name}"); sp, zl = 4, math.ceil(len(from_) / 4)
    c, z = i % sp, i // sp
    return (c / sp, 1 - (z + 1) / zl, (c + 1) / sp, 1 - z / zl)

def geschoss(g):
    n = g["nr"]; E = f"g{n}"; yb = y0(n); dz = 0.3
    # Decke unter diesem Geschoss: Belag oben, weisse Untersicht unten (keine Raender, die Aussenwand deckt sie)
    for x1, x2, z1, z2, mat in bodenflaechen(g):
        rechtecke = minus_loch(x1, x2, z1, z2) if n > 0 else [(x1, x2, z1, z2)]
        for a, b, c, d in rechtecke:
            ob = [bv(a, yb, d), bv(b, yb, d), bv(b, yb, c), bv(a, yb, c)]
            flaeche(netz(E), ob, welt_uv(ob, M[mat]), M[mat])
            if n > 0:
                un = [bv(a, yb - dz, c), bv(b, yb - dz, c), bv(b, yb - dz, d), bv(a, yb - dz, d)]
                flaeche(netz(E), un, welt_uv(un, M["decke"]), M["decke"])
    if n > 0:  # Raender des Treppenauges
        lx1, lx2, lz1, lz2 = LOCH
        kasten(lx1 - 0.001, lx2 + 0.001, yb - dz, yb, lz1 - 0.02, lz1, M["beton"], E, ohne=(4, 5))
        kasten(lx1 - 0.001, lx2 + 0.001, yb - dz, yb, lz2, lz2 + 0.02, M["beton"], E, ohne=(4, 5))
        kasten(lx1 - 0.02, lx1, yb - dz, yb, lz1, lz2, M["beton"], E, ohne=(4, 5))
        kasten(lx2, lx2 + 0.02, yb - dz, yb, lz1, lz2, M["beton"], E, ohne=(4, 5))
        kasten(lx1, lx2, yb + 0.98, yb + 1.02, lz2 - 0.04, lz2, M["stahl"], E)
        for i in range(9): kasten(lx1 + i * (lx2 - lx1) / 8 - 0.015, lx1 + i * (lx2 - lx1) / 8 + 0.015, yb, yb + 0.98, lz2 - 0.035, lz2 - 0.005, M["stahl"], E)

    # Aussenwaende mit Fensterbaendern; Sockelbereich (Deckenstirn) mit Fassade
    yu = yb - dz; hh = HW + dz; u0, u1 = dz + 0.9, dz + 2.85
    sockel_eg = n == 0
    for seite, pos in (("n", -0.15), ("s", T + 0.15)):
        oeff = []
        for i in range(20):
            c = 1.5 + 3 * i
            if seite == "n" and 30.9 < c < 34.2: continue
            if seite == "s" and n == 0 and 27 < c < 33: continue
            oeff.append((c - 1.0, c + 1.0, u0, u1))
        if seite == "s" and n == 0: oeff.append((G["eingang"]["x1"], G["eingang"]["x2"], 0, dz + 2.7))
        aussen, innen = (M["fassade"], M["putz"])
        wand("x", -0.3, B + 0.3, pos, 0.3, yu, hh, oeff, aussen if seite == "n" else innen, innen if seite == "n" else aussen, E, laibung=M["putz"])
        for c1, c2, a, b_ in oeff:
            if a > 0: fenster("x", c1, c2, pos, yu, a, b_, E, n)
        if sockel_eg:
            for a_, b2 in (((-0.36, B + 0.36),) if seite == "n" else ((-0.36, G["eingang"]["x1"]), (G["eingang"]["x2"], B + 0.36))):
                kasten(a_, b2, 0.0, 0.32, pos - 0.21, pos + 0.21, M["sockel"], E, ohne=(5,))
    if n > 0:  # dunkles Band vor der Deckenstirn, rundum
        kasten(-0.33, B + 0.33, yu, yu + dz, -0.33, -0.3, M["band"], E, ohne=(0,))
        kasten(-0.33, B + 0.33, yu, yu + dz, T + 0.3, T + 0.33, M["band"], E, ohne=(1,))
        kasten(-0.33, -0.3, yu, yu + dz, -0.3, T + 0.3, M["band"], E, ohne=(2,))
        kasten(B + 0.3, B + 0.33, yu, yu + dz, -0.3, T + 0.3, M["band"], E, ohne=(3,))
    for seite, pos in (("w", -0.15), ("o", B + 0.15)):
        oeff = [(c - 1.0, c + 1.0, u0, u1) for c in (3.5, 10.0, 16.5)]
        wand("z", 0.0, T, pos, 0.3, yu, hh, oeff, M["fassade"] if seite == "w" else M["putz"], M["putz"] if seite == "w" else M["fassade"], E, laibung=M["putz"])
        for c1, c2, a, b_ in oeff: fenster("z", c1, c2, pos, yu, a, b_, E, n)
    # Eingang: Glastuer mit Rahmen, Pfosten
    if n == 0:
        ex1, ex2 = G["eingang"]["x1"], G["eingang"]["x2"]
        for c in (ex1, (ex1 + ex2) / 2 - 0.04, ex2 - 0.08): kasten(c, c + 0.08, yb, yb + 2.7, T + 0.06, T + 0.24, M["rahmen"], E)
        kasten(ex1, ex2, yb + 2.62, yb + 2.7, T + 0.06, T + 0.24, M["rahmen"], E)
        tafel(M["glas"], ex2 - ex1, 2.6, (ex1 + ex2) / 2, yb + 1.3, T + 0.15, "+z", "fenster0")

    # Innenwaende: Flurwaende mit Tuer, Trennwaende zwischen Raeumen (jede x-Position nur einmal)
    d = 0.15; trenn = {}
    for r in g["raeume"]:
        x1, x2, z1, z2 = bereich(r)
        if r["art"] != "offen":
            zf = FL0 - d / 2 if r["seite"] == "n" else FL1 + d / 2
            tuer = r.get("tuer", (x1 + x2) / 2)
            wand("x", x1, x2, zf, d, yb, HW, [(tuer - 0.6, tuer + 0.6, 0, 2.25)], M["putz"], M["putz"], E)
            # Tuerrahmen und Tuerschild zum Flur
            zs = FL0 + 0.005 if r["seite"] == "n" else FL1 - 0.005
            blick = "+z" if r["seite"] == "n" else "-z"
            kasten(tuer - 0.66, tuer - 0.6, yb, yb + 2.3, zf - d / 2 - 0.02, zf + d / 2 + 0.02, M["rahmen"], E)
            kasten(tuer + 0.6, tuer + 0.66, yb, yb + 2.3, zf - d / 2 - 0.02, zf + d / 2 + 0.02, M["rahmen"], E)
            kasten(tuer - 0.66, tuer + 0.66, yb + 2.25, yb + 2.31, zf - d / 2 - 0.02, zf + d / 2 + 0.02, M["rahmen"], E)
            sx = tuer + (1.35 if r["seite"] == "n" else -1.35)
            tafel(M["tuerschild"], 0.8, 0.2, sx, yb + 1.55, zs + (0.02 if r["seite"] == "n" else -0.02), blick, E, uv=tuerschild_uv(n, r["name"]))
            for x in (x1, x2): trenn[round(x, 2)] = (z1, z2)
        if r["art"] == "wc":
            for x in (x1, x2): trenn[round(x, 2)] = (z1, z2)
    for x, (z1, z2) in trenn.items():
        if x <= 0.01 or x >= B - 0.01: continue
        if r_kern := (KERN["x1"] - 0.01 <= x <= KERN["x2"] + 0.01 and z1 < FL0): continue
        z_a = z1 if z1 > 0 else 0.0; z_b = z2 if z2 < T else T
        if z1 < FL0: z_b = FL0 - d
        else: z_a = FL1 + d
        wand("z", z_a, z_b, x, d, yb, HW, [], M["putz"], M["putz"], E)

    # Kern: Waende, Aufzug, Treppe
    kx1, kx2 = KERN["x1"], KERN["x2"]
    for x in (kx1, kx2): wand("z", 0.0, FL0 - d, x, 0.2, yb, HW, [], M["putz"], M["putz"], E)
    wand("x", kx1 - 0.1, kx2 + 0.1, FL0 - 0.1, 0.2, yb, HW, [(26.5, 30.9, 0, 2.6), (31.6, 33.8, 0, 2.6)], M["putz"], M["putz"], E)
    wand("z", 0.0, 4.0, 31.3, 0.2, yb, HW, [], M["putz"], M["stahl"], E)
    wand("x", 31.3, kx2 - 0.1, 4.0, 0.2, yb, HW, [(32.1, 33.3, 0, 2.2)], M["stahl"], M["putz"], E)
    kasten(32.1, 33.3, yb, yb + 2.2, 4.03, 4.07, M["stahl"], E)  # Aufzugtuer
    tafel(M["geschossschild"], 0.9, 0.22, 31.6, yb + 2.7, FL0 + 0.01, "+z", E, uv=(n / 4, 0, (n + 1) / 4, 1))
    if n < 3:
        stufe, auftritt = GH / 20, 0.3
        for k in range(1, 10):  # Lauf 1: neun Stufen nach Norden, die zehnte ist das Podest
            z_ = 3.3 + auftritt * (9 - k)
            kasten(26.45, 28.55, yb, yb + stufe * k, z_, z_ + auftritt, M["terrazzo"], E)
        kasten(26.45, 30.85, yb, yb + stufe * 10, 0.3, 3.3, M["terrazzo"], E)  # Podest
        for j in range(1, 11):  # Lauf 2: zurueck nach Sueden ins naechste Geschoss
            z_ = 3.3 + auftritt * (j - 1)
            kasten(28.75, 30.85, yb, yb + stufe * (10 + j) - 0.002, z_, z_ + auftritt, M["terrazzo"], E)
        kasten(28.6, 28.7, yb, yb + GH - 0.02, 3.3, 6.3, M["stahl"], E)  # Geländerwange zwischen den Laeufen

    # Moebel und Ausstattung je Raum
    for r in g["raeume"]: einrichten(n, r)

# --- Einrichtung -------------------------------------------------------------------
MOEBEL = {}
def modell(id, n, x, z, ry=0.0, y=None, max_dreiecke=900, skala=1.0):
    bpy.ops.import_scene.gltf(filepath=os.path.join(Q, "modelle", id, id + ".gltf"))
    neu = list(bpy.context.selected_objects)
    MOEBEL.setdefault(n, []).extend(neu)
    netze = [o for o in neu if o.type == "MESH"]
    for o in netze:
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002); bm.to_mesh(o.data); bm.free()
    gesamt = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in netze)
    if gesamt > max_dreiecke:
        for o in netze:
            mod = o.modifiers.new("reduziert", "DECIMATE"); mod.ratio = max_dreiecke / gesamt
    for ob in neu:
        if ob.parent is None:
            ob.scale = ob.scale * skala; ob.location = bv(x, (y0(n) if isinstance(n, int) else 0.0) if y is None else y, z); ob.rotation_mode = "XYZ"; ob.rotation_euler[2] += ry

def tisch(n, x, z, b, t, h=0.74, ry=0.0, mat=None):
    E = f"m{n}"; yb = y0(n)
    kiste(b, 0.03, t, mat or M["tisch"], x, yb + h - 0.015, z, E, ry=ry, welt=False)
    c, s = math.cos(ry), math.sin(ry)
    for dx, dz in ((-b / 2 + 0.05, -t / 2 + 0.05), (b / 2 - 0.05, -t / 2 + 0.05), (-b / 2 + 0.05, t / 2 - 0.05), (b / 2 - 0.05, t / 2 - 0.05)):
        kiste(0.04, h - 0.03, 0.04, M["tischbein"], x + dx * c + dz * s, yb + (h - 0.03) / 2, z - dx * s + dz * c, E, welt=False)

def stuhl(n, x, z, blick):
    """blick: Richtung, in die die Person schaut (Bogenmass um die Hochachse, 0 = Norden/-z)."""
    modell("SchoolChair_01", n, x, z, ry=blick + math.pi, max_dreiecke=520)

def monitor(n, x, z, ry):
    """Bildschirm auf dem Tisch; Tastatur liegt auf der lokalen +z-Seite (zur Person)."""
    E = f"m{n}"; Bm = Matrix.Translation(bv(x, y0(n), z)) @ Matrix.Rotation(ry, 4, "Z")
    kiste(0.56, 0.34, 0.03, M["monitor"], 0, 1.04, -0.08, E, basis=Bm, welt=False)
    kiste(0.05, 0.14, 0.05, M["tischbein"], 0, 0.81, -0.1, E, basis=Bm, welt=False)
    kiste(0.44, 0.02, 0.15, M["schwarz"], 0, 0.75, 0.2, E, basis=Bm, welt=False)

def buecherregal(n, x, z, ry, laenge=1.8):
    E = f"m{n}"; yb = y0(n); h = 2.1; t = 0.35; boeden = 6
    Bm = Matrix.Translation(bv(x, yb, z)) @ Matrix.Rotation(ry, 4, "Z")
    kiste(laenge, h, 0.02, M["regal"], 0, h / 2, -t / 2 + 0.01, E, basis=Bm, welt=False)
    for sx in (-laenge / 2, laenge / 2): kiste(0.03, h, t, M["regal"], sx, h / 2, 0, E, basis=Bm, welt=False)
    for i in range(boeden + 1):
        yy = 0.08 + i * (h - 0.1) / boeden
        kiste(laenge, 0.025, t, M["regal"], 0, yy, 0, E, basis=Bm, welt=False)
        if i == boeden: break
        px = -laenge / 2 + 0.05
        while px < laenge / 2 - 0.08:
            bb = random.uniform(0.025, 0.05); hh = random.uniform(0.2, 0.29) if i else random.uniform(0.22, 0.3)
            if random.random() < 0.06: px += 0.12; continue
            kiste(bb, hh, random.uniform(0.18, 0.24), random.choice(BUCH), px + bb / 2, yy + 0.0125 + hh / 2, 0.02, E, basis=Bm, welt=False, ohne=(1, 5))
            px += bb + 0.003

def pflanze(n, x, z, gross=1.0):
    E = f"m{n}"; yb = y0(n)
    zylinder(0.22 * gross, 0.45 * gross, M["weiss"], x, yb + 0.225 * gross, z, oben=0.26 * gross, n=12, einheit=E)
    belauben([(x, yb + 0.9 * gross, z, 0.38 * gross), (x + 0.15, yb + 1.25 * gross, z - 0.1, 0.3 * gross)], int(70 * gross), 0.22, f"laub{n}")

def sofa(n, x, z, b, ry, mat):
    E = f"m{n}"; yb = y0(n)
    Bm = Matrix.Translation(bv(x, yb, z)) @ Matrix.Rotation(ry, 4, "Z")
    kiste(b, 0.42, 0.85, mat, 0, 0.21, 0, E, basis=Bm, welt=False)
    kiste(b, 0.4, 0.2, mat, 0, 0.62, -0.32, E, basis=Bm, welt=False)
    for sx in (-b / 2 + 0.1, b / 2 - 0.1): kiste(0.2, 0.25, 0.85, mat, sx, 0.545, 0, E, basis=Bm, welt=False)

def tresen(n, x1, x2, z1, z2, mat=None):
    E = f"m{n}"; yb = y0(n)
    kasten(x1, x2, yb, yb + 1.05, z1, z2, mat or M["tresen"], E, welt=False)
    kasten(x1 - 0.04, x2 + 0.04, yb + 1.05, yb + 1.09, z1 - 0.06, z2 + 0.06, M["lila"], E, welt=False)

def einrichten(n, r):
    x1, x2, z1, z2 = bereich(r); E = f"m{n}"; yb = y0(n); art = r["art"]; name = r["name"]
    nord = r["seite"] == "n"
    if art == "hoersaal":
        # Front mit Leinwand an der Westwand, Reihen nach Osten, Gang an der Flurseite
        tafel(M["leinwand"], 4.8, 2.7, x1 + 0.09, yb + 1.85, (z1 + z2) / 2, "+x", E)
        kasten(x1 + 0.9, x1 + 1.6, yb, yb + 1.05, 3.4, 4.4, M["holz"], E, welt=False)  # Pult
        for i in range(10):
            xr = x1 + 4.0 + i * 1.55
            if xr > x2 - 1.0: break
            kasten(xr - 0.25, xr + 0.25, yb + 0.72, yb + 0.75, z1 + 0.6, z2 - 1.7, M["tisch"], E, welt=False)
            kasten(xr - 0.02, xr + 0.02, yb, yb + 0.72, z1 + 0.6, z2 - 1.7, M["tischbein"], E, welt=False)
            for k in range(8):
                zz = z1 + 1.0 + k * 0.72
                if zz > z2 - 2.0: break
                stuhl(n, xr + 0.55, zz, -math.pi / 2)
    elif art == "seminar":
        brett_x = x1 + 0.09
        tafel(M["whiteboard"], 2.6, 1.3, brett_x, yb + 1.45, (z1 + z2) / 2, "+x", E)
        for c in range(3):
            for k in range(2):
                xt = x1 + 3.2 + c * 3.2
                if xt > x2 - 1.5: break
                zt = (z1 + z2) / 2 + (k - 0.5) * 3.0
                tisch(n, xt, zt, 1.4, 0.7, ry=math.pi / 2)
                for dz in (-0.35, 0.35): stuhl(n, xt + 0.65, zt + dz, -math.pi / 2)
    elif art == "labor":
        for c in range(3):
            xt = x1 + 2.5 + c * 3.6
            if xt > x2 - 1.5: break
            for k in range(3):
                zt = z1 + 1.6 + k * 2.4
                tisch(n, xt, zt, 1.6, 0.8, ry=math.pi / 2)
                for dz in (-0.4, 0.4):
                    monitor(n, xt - 0.15, zt + dz, math.pi / 2)
                    stuhl(n, xt + 0.7, zt + dz, -math.pi / 2)
        tafel(M["whiteboard"], 2.4, 1.2, x1 + 0.09, yb + 1.45, (z1 + z2) / 2, "+x", E)
    elif art == "bibliothek":
        for c in range(6):
            xr = x1 + 8.5 + c * 2.1
            if xr > x2 - 0.8: break
            for k in range(2):
                buecherregal(n, xr - 0.18, z1 + 1.4 + k * 2.2, math.pi / 2, laenge=1.9)
                buecherregal(n, xr + 0.18, z1 + 1.4 + k * 2.2, -math.pi / 2, laenge=1.9)
        for zt in (2.6, 5.4):
            tisch(n, x1 + 4.0, zt, 2.2, 1.0)
            for dx in (-0.6, 0.6):
                for s in (-1, 1): stuhl(n, x1 + 4.0 + dx, zt + s * 0.75, 0 if s > 0 else math.pi)
        pflanze(n, x1 + 0.7, z1 + 0.8)
    elif art == "buero":
        anzahl = max(1, min(3, int((x2 - x1) // 3.2)))
        zd = z1 + 1.1 if nord else z2 - 1.1          # Schreibtisch am Fenster
        zs = zd + 0.95 if nord else zd - 0.95        # Stuhl zur Raumseite
        for i in range(anzahl):
            xt = x1 + 1.8 + i * 3.2
            modell("metal_office_desk", n, xt, zd, ry=math.pi if nord else 0, max_dreiecke=1800)
            monitor(n, xt, zd, 0 if nord else math.pi)
            modell("dining_chair_02", n, xt, zs, ry=math.pi if nord else 0, max_dreiecke=700)
        modell("drawer_cabinet", n, x2 - 0.35, (z1 + z2) / 2, ry=-math.pi / 2, max_dreiecke=1500)
        pflanze(n, x1 + 0.5, z2 - 0.5 if nord else z1 + 0.5)
        if name.startswith("Studienbüro") or name.startswith("Prüfungsamt"):
            tresen(n, x1 + 1.0, x2 - 1.4, FL1 + 1.0, FL1 + 1.6)
        if name.startswith("Dozierenden"):
            tisch(n, (x1 + x2) / 2, 5.0, 3.6, 1.2)
            for dx in (-1.2, 0, 1.2):
                for s in (-1, 1): stuhl(n, (x1 + x2) / 2 + dx, 5.0 + s * 0.85, 0 if s > 0 else math.pi)
    elif art == "wc":
        mitte = (x1 + x2) / 2
        for i in range(3):
            zz = z1 + 2.2 + i * 1.6 if not nord else z1 + 1.0 + i * 1.6
            kasten(x1 + 0.1, mitte, yb, yb + 2.0, zz - 0.025, zz + 0.025, M["weiss"], E, welt=False)
        kasten(x2 - 0.55, x2 - 0.1, yb + 0.8, yb + 0.9, z1 + 1.0, z2 - 1.0, M["weiss"], E, welt=False)
    elif art == "offen":
        if name.startswith("Foyer"):
            tresen(n, 25.2, 28.4, 16.2, 17.0)  # Infotheke
            kasten(31.0, 35.0, yb, yb + 0.6, 13.2, 13.5, M["rahmen"], E, welt=False)
            kasten(31.0, 35.0, yb + 0.6, yb + 2.9, 13.2, 13.4, M["schwarz"], E, welt=False)
            tafel(M["anzeige"], 3.8, 2.14, 33.0, yb + 1.75, 13.41, "+z", "anzeige")
            for x in (25.5, 34.0): modell("painted_wooden_bench", n, x, 19.2, ry=math.pi, max_dreiecke=600)
            pflanze(n, 24.8, 19.3, 1.4); pflanze(n, 35.3, 15.0, 1.2)
        elif name.startswith("Cafeteria"):
            tresen(n, x2 - 1.1, x2 - 0.4, z1 + 1.2, z2 - 1.2)
            for c in range(4):
                for k in range(2):
                    xt, zt = x1 + 2.0 + c * 3.4, z1 + 2.2 + k * 3.4
                    modell("dining_table", n, xt, zt, ry=0, max_dreiecke=400, skala=0.7)
                    for s in (-1, 1):
                        for dx in (-0.45, 0.45): modell("dining_chair_02", n, xt + dx, zt + s * 0.75, ry=0 if s > 0 else math.pi, max_dreiecke=500)
        elif name.startswith("Lernzone"):
            for c in range(4):
                xt = x1 + 2.5 + c * 4.6
                tisch(n, xt, z1 + 3.0, 2.4, 1.1)
                for dx in (-0.7, 0.7):
                    for s in (-1, 1): stuhl(n, xt + dx, z1 + 3.0 + s * 0.8, 0 if s > 0 else math.pi)
                sofa(n, xt, z2 - 1.2, 2.0, math.pi, M["polster"] if c % 2 else M["polster2"])
            for x in (x1 + 0.6, x2 - 0.6): pflanze(n, x, z2 - 0.6, 1.3)
        elif name.startswith("Lounge"):
            for c in range(3):
                xt = x1 + 3.5 + c * 6.5
                sofa(n, xt, z1 + 2.2, 2.4, 0, M["polster"]); sofa(n, xt, z2 - 1.6, 2.4, math.pi, M["polster2"])
                kasten(xt - 0.6, xt + 0.6, yb, yb + 0.4, (z1 + z2) / 2 - 0.4, (z1 + z2) / 2 + 0.4, M["holz"], E, welt=False)
                pflanze(n, xt + 2.2, (z1 + z2) / 2, 1.2)

# --- Laub als Blattflaechen (Licht je Blatt an den Eckpunkten, wie im Sportheim) ----------
_s = Vector((40, 70, 55)).normalized(); SONNE3 = (_s.x, _s.y, _s.z)
def belauben(wolken, pro, groesse, einheit="laub"):
    e = netz(einheit)
    for x, y, z, r in wolken:
        for _ in range(pro):
            a, c, d = random.uniform(0, 6.28), random.uniform(-1, 1), r * random.uniform(0.72, 1.02)
            q = math.sqrt(1 - c * c); p = bv(x + d * q * math.cos(a), y + d * c * 0.9, z + d * q * math.sin(a))
            R = Matrix.Rotation(random.uniform(0, 6.28), 4, "X") @ Matrix.Rotation(random.uniform(0, 6.28), 4, "Y")
            g = groesse * random.uniform(0.75, 1.35) / 2
            ecken = [p + (R @ Vector((u * g, 0, w * g))) for u, w in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            flaeche(e, ecken, [(0, 0), (1, 0), (1, 1), (0, 1)], M["blatt"])
            q3 = (x + d * q * math.cos(a), y + d * c * 0.9, z + d * q * math.sin(a))
            sicht = 1.0
            for wx, wy, wz, wr in wolken:
                vx, vy, vz = wx - q3[0], wy - q3[1], wz - q3[2]
                t_ = vx * SONNE3[0] + vy * SONNE3[1] + vz * SONNE3[2]
                if t_ <= 0.05: continue
                if vx * vx + vy * vy + vz * vz - t_ * t_ < wr * wr: sicht *= 0.58
            tiefe = max(0.0, min(1.0, (q3[1] - (y - r)) / (2 * r)))
            e.setdefault("licht", []).append((1.34 * sicht * random.uniform(0.55, 1.0) + 0.42 + 0.33 * tiefe) * random.uniform(0.88, 1.12))

def baum(x, z, s):
    zylinder(0.3 * s, 4.2 * s, M["rinde"], x, 2.1 * s, z, oben=0.18 * s, n=9)
    wolken = []
    for i in range(22):
        a, d, y = random.uniform(0, 6.28), random.uniform(0.3, 3.0) * s, random.uniform(3.6, 8.0) * s
        wolken.append((x + math.cos(a) * d, y, z + math.sin(a) * d, random.uniform(0.7, 1.3) * s))
        if i % 3 == 0:
            zylinder(0.06 * s, d + 0.8, M["rinde"], x + math.cos(a) * d / 2, (y + 4 * s) / 2, z + math.sin(a) * d / 2, oben=0.03 * s, n=5)
    belauben(wolken, 150, 0.3 * s)

# --- Aussenanlage ----------------------------------------------------------------------
def aussenanlage():
    E = "aussen"
    # Gelaende: Rasen, Vorplatz, Weg, Strasse (leicht versetzt, keine deckungsgleichen Flaechen)
    def boden(x1, x2, z1, z2, y, mat):
        ob = [bv(x1, y, z2), bv(x2, y, z2), bv(x2, y, z1), bv(x1, y, z1)]
        flaeche(netz(E), ob, welt_uv(ob, mat), mat)
    boden(-45, 105, -40, 70, 0.0, M["rasen"])
    boden(-1.5, B + 1.5, -1.5, T + 1.5, 0.004, M["kies"])  # Traufstreifen
    boden(8, 52, T + 1.5, 36, 0.01, M["pflaster"])         # Vorplatz
    boden(27, 33, 36, 52, 0.01, M["pflaster"])             # Weg zur Strasse
    boden(-45, 105, 52, 60, 0.012, M["asphalt"])           # Strasse
    for z in (51.85, 60.0): kasten(-45, 105, 0.0, 0.14, z, z + 0.15, M["beton"], E)
    # Eingangspodest mit Stufe und Vordach
    kasten(25.5, 34.5, 0.0, 0.3, T + 0.31, T + 3.2, M["terrazzo"], E, ohne=(5,))
    kasten(25.5, 34.5, 0.0, 0.15, T + 3.2, T + 3.6, M["terrazzo"], E, ohne=(5,))
    kasten(25.0, 35.0, 3.75, 4.05, T + 0.31, T + 4.2, M["beton"], E)
    for x in (25.4, 34.6): zylinder(0.09, 3.75, M["stahl"], x, 1.875, T + 3.9, n=12, einheit=E)
    # Campus-Schild als Stele und Schriftband ueber dem Vordach
    kasten(17.0, 23.0, 0.0, 1.9, 29.6, 30.0, M["rahmen"], E)
    tafel(M["schild"], 5.6, 1.47, 20.0, 1.05, 30.01, "+z", E)
    kasten(26.6, 33.4, 4.05, 4.95, T + 3.95, T + 4.2, M["lila"], E)
    tafel(M["schild"], 3.2, 0.84, 30.0, 4.5, T + 4.21, "+z", E)
    # Briefkasten am Vorplatz (Ort "Briefkasten")
    lack = material("kastenlack", farbe=rgb(0x5b21b6), metall=0.25, rauh=0.32)
    zylinder(0.05, 1.05, M["rahmen"], 36.5, 0.525, T + 3.0, n=12, einheit=E)
    kiste(0.6, 0.72, 0.42, lack, 36.5, 1.41, T + 3.0, E, welt=False)
    kiste(0.44, 0.08, 0.03, M["stahl"], 36.5, 1.6, T + 3.22, E, welt=False)
    # Fahrradstaender mit Raedern (einfach), Baenke, Laternen
    for i in range(8):
        x = 40.0 + i * 1.1
        for zz in (T + 6.0, T + 6.8):
            zylinder(0.025, 0.8, M["stahl"], x, 0.4, zz, n=8, einheit=E)
        kiste(0.05, 0.05, 0.85, M["stahl"], x, 0.8, T + 6.4, E, welt=False)
    for x in (12, 48):
        modell("painted_wooden_bench", "aussen", x, T + 10.0, ry=math.pi, max_dreiecke=600)
    for x in (10, 22, 38, 50):
        modell("street_lamp_01", "aussen", x, 37.5, ry=0, max_dreiecke=1200)
    for x, z, s in ((-10, -12, 1.4), (-4, 30, 1.2), (4, 42, 1.0), (60, 34, 1.3), (70, 8, 1.4), (68, -14, 1.1), (16, -14, 1.2), (42, -16, 1.35), (-14, 12, 1.2), (56, 44, 1.0)):
        baum(x, z, s)
    for x in (9, 15.5, 44.5, 51):  # Hecken am Vorplatz
        belauben([(x + dx, 0.6, T + 14.5, 0.75) for dx in (-1.6, -0.5, 0.6, 1.7)], 70, 0.32)

def dach():
    E = "dach"; yt = y0(4) - SOCKEL  # Oberkante Waende 3. OG
    kasten(-0.3, B + 0.3, yt, yt + 0.3, -0.3, T + 0.3, M["beton"], E, ohne=(4,))
    ob = [bv(0, yt + 0.3, T), bv(B, yt + 0.3, T), bv(B, yt + 0.3, 0), bv(0, yt + 0.3, 0)]
    flaeche(netz(E), ob, welt_uv(ob, M["kies"]), M["kies"])
    for z1, z2 in ((-0.3, 0.0), (T, T + 0.3)): kasten(-0.3, B + 0.3, yt + 0.3, yt + 1.1, z1, z2, M["fassade"], E)
    for x1, x2 in ((-0.3, 0.0), (B, B + 0.3)): kasten(x1, x2, yt + 0.3, yt + 1.1, 0.0, T, M["fassade"], E)
    kasten(25.5, 34.5, yt + 0.3, yt + 3.2, 0.5, 7.5, M["band"], E)  # Treppenhauskopf
    for x in (8, 14, 46): kasten(x, x + 3.2, yt + 0.3, yt + 1.6, 6, 9.5, M["stahl"], E)

for g in G["geschosse"]: geschoss(g)
aussenanlage(); dach()

# Sammelnetze in Blender-Objekte wandeln
for name, e in EINHEITEN.items():
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in e["v"]], [], e["f"]); me.update()
    for m in e["mats"]: me.materials.append(m)
    uvl = me.uv_layers.new(name="UVMap")
    for i, p in enumerate(me.polygons):
        p.material_index = e["m"][i]
        for j, li in enumerate(p.loop_indices): uvl.data[li].uv = e["uv"][i][j]
    ob = bpy.data.objects.new(name, me); szene.collection.objects.link(ob)

# --- Licht und Welt ------------------------------------------------------------------
welt = bpy.data.worlds.new("welt"); szene.world = welt; welt.use_nodes = True
n_ = welt.node_tree.nodes; bg = n_["Background"]; hdr = n_.new("ShaderNodeTexEnvironment"); hdr.image = bild("autumn_field_puresky.hdr", False)
bg.inputs["Strength"].default_value = 1.3
welt.node_tree.links.new(hdr.outputs["Color"], bg.inputs["Color"])
sonne = bpy.data.lights.new("sonne", "SUN"); sonne.energy = 3.2; sonne.angle = math.radians(1.6); sonne.color = (1, 0.94, 0.86)
s_ = bpy.data.objects.new("sonne", sonne); szene.collection.objects.link(s_)
s_.rotation_euler = Vector(bv(40, 70, 55)).to_track_quat("Z", "Y").to_euler()

# --- Kamera und Render ------------------------------------------------------------------
cam = bpy.data.cameras.new("kamera"); cam.sensor_fit = "VERTICAL"; cam.sensor_height = 24; cam.lens = 24 / (2 * math.tan(math.radians(30) / 2))
ko = bpy.data.objects.new("kamera", cam); szene.collection.objects.link(ko); szene.camera = ko
ANSICHTEN = {
    "haus": ((82, 46, 78), (28, 4, 8)),
    "eg": ((52, 34, 52), (30, 0, 10)), "og1": ((52, 38, 52), (30, 3.6, 10)), "og2": ((52, 42, 52), (30, 7.2, 10)), "og3": ((52, 46, 52), (30, 10.8, 10)),
    "eingang": ((40, 6, 40), (30, 2, 20)), "foyer": ((36, 14, 30), (30, 0.3, 15)), "hoersaal": ((22, 16, 18), (12, 0.3, 4)),
    "bibliothek": ((52, 14, 18), (46, 0.3, 4)),
}
ansicht = opt("--ansicht", "haus")
p_, z_ = ANSICHTEN[ansicht]
ko.location = bv(*p_); ko.rotation_euler = (bv(*z_) - bv(*p_)).to_track_quat("-Z", "Y").to_euler()

szene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences; prefs.compute_device_type = "METAL"; prefs.get_devices()
for d in prefs.devices: d.use = True
szene.cycles.device = "GPU"; szene.cycles.samples = int(opt("--samples", "96")); szene.cycles.use_denoising = True
szene.cycles.max_bounces = 6; szene.view_settings.view_transform = "AgX"; szene.view_settings.look = "AgX - Medium High Contrast"
szene.render.resolution_x, szene.render.resolution_y = 1440, 860

def nur(ob):
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob

def moebel_zusammenfassen():
    """Importierte Modelle je Geschoss in ein Objekt m<n> (bzw. aussen_moebel) einfuegen."""
    import re as _re
    grund = lambda s: _re.sub(r"\.\d{3}$", "", s)
    for n, liste in MOEBEL.items():
        netze = [o for o in liste if o.type == "MESH"]
        bpy.context.view_layer.update()
        for o in netze:
            w = o.matrix_world.copy(); o.parent = None; o.matrix_world = w
        bpy.ops.object.select_all(action="DESELECT")
        for o in netze: o.select_set(True)
        bpy.context.view_layer.objects.active = netze[0]
        bpy.ops.object.make_single_user(object=True, obdata=True)
        for o in netze:
            bpy.context.view_layer.objects.active = o
            for mod in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        ziel_name = f"m{n}" if n != "aussen" else "aussen"
        ziel = bpy.data.objects.get(ziel_name)
        if ziel: ziel.select_set(True); bpy.context.view_layer.objects.active = ziel
        bpy.ops.object.join()
        ob = bpy.context.active_object; ob.name = ziel_name; ob.data.name = ziel_name
        ersten = {}
        for i, m in enumerate(ob.data.materials):
            b_ = ersten.setdefault(grund(m.name), m)
            if b_ is not m: ob.data.materials[i] = b_
        slots = list(ob.data.materials); neu = {}
        for i, m in enumerate(slots): neu.setdefault(m.name, i)
        ind = [neu[m.name] for m in slots]
        for p in ob.data.polygons: p.material_index = ind[p.material_index]
        nur(ob); bpy.ops.object.material_slot_remove_unused()
    bilder = {}
    for b_ in list(bpy.data.images):
        q = bilder.setdefault(grund(b_.name), b_)
        if q is not b_: b_.user_remap(q)
    for o in list(bpy.data.objects):
        if o.type == "EMPTY": bpy.data.objects.remove(o)

def sichtbar(ob, ja):
    ob.hide_render = not ja
    for k in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_shadow", "visible_transmission", "visible_volume_scatter"): setattr(ob, k, ja)

def geschosse_ab(n):
    """Alles oberhalb von Geschoss n ausblenden (Puppenhaus-Blick in Geschoss n)."""
    for o in bpy.data.objects:
        if o.type != "MESH": continue
        import re as _re
        t_ = _re.fullmatch(r"(g|m|laub|fenster)(\d)", o.name)
        oben = (o.name == "dach" and n < 4) or (t_ is not None and int(t_.group(2)) > n)
        if o.name.startswith("fenster"): o.hide_render = oben; continue
        sichtbar(o, not oben)

LICHT_TEILER = 8.0
def in_jpeg(bild_, pfad):
    import numpy as np
    w, h = bild_.size; a = np.empty(w * h * 4, dtype=np.float32); bild_.pixels.foreach_get(a); a = a.reshape(h, w, 4)[:, :, :3] / LICHT_TEILER
    a = np.clip(a, 0, 1); a = np.where(a <= 0.0031308, a * 12.92, 1.055 * np.clip(a, 1e-6, None) ** (1 / 2.4) - 0.055)
    aus = bpy.data.images.new("aus", w, h, alpha=False); aus.colorspace_settings.name = "Non-Color"
    aus.pixels.foreach_set(np.dstack([a, np.ones((h, w))]).astype(np.float32).ravel())
    aus.filepath_raw = pfad; aus.file_format = "JPEG"; aus.save(quality=90); bpy.data.images.remove(aus)

def entrauschen(bild_):
    import tempfile
    w, h = bild_.size
    roh = os.path.join(tempfile.gettempdir(), "campus_licht_roh.exr"); fertig = os.path.join(tempfile.gettempdir(), "campus_licht_fertig.exr")
    bild_.filepath_raw = roh; bild_.file_format = "OPEN_EXR"; bild_.save()
    baum_ = bpy.data.node_groups.new("entrauschen", "CompositorNodeTree"); szene.compositing_node_group = baum_
    baum_.interface.new_socket("Bild", in_out="OUTPUT", socket_type="NodeSocketColor")
    ein = baum_.nodes.new("CompositorNodeImage"); q = bpy.data.images.load(roh); ein.image = q
    d = baum_.nodes.new("CompositorNodeDenoise"); aus = baum_.nodes.new("NodeGroupOutput")
    baum_.links.new(ein.outputs[0], d.inputs[0]); baum_.links.new(d.outputs[0], aus.inputs[0])
    r_ = szene.render; alt = (r_.resolution_x, r_.resolution_y, r_.filepath, r_.resolution_percentage, r_.image_settings.file_format, r_.image_settings.color_mode, r_.image_settings.color_depth)
    r_.resolution_x, r_.resolution_y, r_.resolution_percentage = w, h, 100
    r_.image_settings.file_format = "OPEN_EXR"; r_.image_settings.color_mode = "RGB"; r_.image_settings.color_depth = "32"; r_.filepath = fertig; r_.use_compositing = True
    bpy.ops.render.render(write_still=True)
    r_.resolution_x, r_.resolution_y, r_.filepath, r_.resolution_percentage, r_.image_settings.file_format, r_.image_settings.color_mode, r_.image_settings.color_depth = alt
    szene.compositing_node_group = None; bpy.data.node_groups.remove(baum_); bpy.data.images.remove(q)
    return bpy.data.images.load(fertig)

def licht_backen(ob, breite, ziel):
    nur(ob); me = ob.data
    uv0 = me.uv_layers[0]; uv0.active_render = True
    lm = me.uv_layers.new(name="Licht"); me.uv_layers.active = lm
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0002)
    bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.0015, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    bild_ = bpy.data.images.new("licht_" + ob.name, breite, breite, alpha=False, float_buffer=True)
    neue = []
    for m in me.materials:
        k = m.node_tree.nodes.new("ShaderNodeTexImage"); k.image = bild_; m.node_tree.nodes.active = k; neue.append((m, k))
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=10, use_clear=True)
    for m, k in neue: m.node_tree.nodes.remove(k)
    sauber = entrauschen(bild_)
    in_jpeg(sauber, os.path.join(ziel, f"licht_{ob.name}.jpg")); bpy.data.images.remove(sauber); bpy.data.images.remove(bild_)
    print("LICHT", ob.name, breite, flush=True)

def eckpunkt_licht(ob):
    """Licht der Moebel in die Eckpunkte backen: tausende Kleinteile (Buecher, Stuehle) bekaemen in einer
    Lichtkarte nur wenige Pixel und wuerden schwarz. Gespeichert wie beim Laub: Licht / LICHT_TEILER."""
    import numpy as np
    nur(ob); me = ob.data
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.remove_doubles(threshold=0.0002); bpy.ops.object.mode_set(mode="OBJECT")
    fa = me.color_attributes.new(name="Licht", type="FLOAT_COLOR", domain="CORNER")
    me.color_attributes.active_color = fa; me.color_attributes.render_color_index = me.color_attributes.active_color_index
    szene.render.bake.target = "VERTEX_COLORS"
    alt = szene.cycles.samples; szene.cycles.samples = max(alt, 192)
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True)
    szene.cycles.samples = alt; szene.render.bake.target = "IMAGE_TEXTURES"
    a = np.empty(len(me.loops) * 4, dtype=np.float32); fa.data.foreach_get("color", a); a = a.reshape(-1, 4)
    a[:, :3] = np.clip(a[:, :3] / LICHT_TEILER, 0, 1); a[:, 3] = 1
    fa.data.foreach_set("color", a.ravel()); me.update()
    print("ECKPUNKTE", ob.name, len(me.loops), flush=True)

def laub_licht(ob):
    import numpy as np
    me = ob.data; licht = EINHEITEN[ob.name]["licht"]
    fa = me.color_attributes.new(name="Licht", type="FLOAT_COLOR", domain="CORNER")
    a = np.ones(len(me.loops) * 4, dtype=np.float32)
    for p, l in zip(me.polygons, licht):
        for k, li in enumerate(p.loop_indices):
            w = l * (0.82 if k < 2 else 1.08) / LICHT_TEILER
            a[li * 4:li * 4 + 3] = w
    fa.data.foreach_set("color", a); me.color_attributes.active_color = fa; me.update()

def backen(ziel):
    os.makedirs(ziel, exist_ok=True)
    moebel_zusammenfassen()
    for ob in bpy.data.objects:
        if ob.name.startswith(("fenster", "laub")):
            ob.visible_shadow = ob.name.startswith("laub"); ob.visible_diffuse = False; ob.visible_glossy = False; ob.visible_transmission = False
    klein = "--klein" in ARG
    teile = lambda b: b // 2 if klein else b
    # Jedes Geschoss mit abgehobenen oberen Geschossen backen: so stimmt das Licht im Puppenhaus-Blick
    for n in range(4):
        geschosse_ab(n)
        licht_backen(bpy.data.objects[f"g{n}"], teile(2048), ziel)
        eckpunkt_licht(bpy.data.objects[f"m{n}"])
    geschosse_ab(9)
    for name, breite in (("aussen", 4096), ("dach", 1024), ("anzeige", 256)):
        licht_backen(bpy.data.objects[name], teile(breite), ziel)
    for o in bpy.data.objects:
        if o.name.startswith("laub"): laub_licht(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.data.objects:
        if o.type == "MESH": o.select_set(True)
    pfad = os.path.join(ziel, "campus.glb")
    bpy.ops.export_scene.gltf(filepath=pfad, export_format="GLB", use_selection=True, export_texcoords=True, export_normals=True,
        export_materials="EXPORT", export_cameras=False, export_lights=False, export_vertex_color="ACTIVE", export_apply=False, export_yup=True,
        export_image_format="WEBP", export_image_quality=80, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    print("EXPORT", round(os.path.getsize(pfad) / 1048576, 1), "MB", flush=True)

def zaehlen():
    gesamt = 0
    for o in bpy.data.objects:
        if o.type != "MESH": continue
        dg = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = dg.to_mesh()
        t_ = sum(len(p.vertices) - 2 for p in me.polygons); gesamt += t_; dg.to_mesh_clear()
    print("DREIECKE", gesamt, flush=True)

print("GERAETE", [d.name for d in prefs.devices if d.use], "OBJEKTE", len(bpy.data.objects), flush=True)
szene.cycles.use_denoising = "--backen" not in ARG
if "--backen" in ARG:
    backen(os.path.abspath(opt("--backen")))
    print("FERTIG", flush=True)
elif "--probe" in ARG:
    moebel_zusammenfassen(); zaehlen()
    if ansicht.startswith("eg") or ansicht in ("foyer", "hoersaal", "bibliothek"): geschosse_ab(0)
    elif ansicht.startswith("og"): geschosse_ab(int(ansicht[2]))
    for o in bpy.data.objects:
        if o.name.startswith("fenster"): o.visible_shadow = False
    szene.render.filepath = os.path.abspath(opt("--probe")); szene.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    print("FERTIG", szene.render.filepath, flush=True)
