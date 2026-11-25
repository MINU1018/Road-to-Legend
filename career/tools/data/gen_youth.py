import hashlib, unicodedata, re, sys
src = open(sys.argv[1], encoding='utf8').read()
old_js = open(sys.argv[2], encoding='utf8').read()
old = old_js.split('`')[1].strip().split('\n')
fold = lambda s: re.sub(r'[^a-z ]', '', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower())
O = {fold(l.split('|')[0]): l.split('|') for l in old}
H = lambda s, n: int(hashlib.md5(s.encode()).hexdigest(), 16) % n
KEEP_OLD = ['Spike Brits', 'Elyh Harrison', 'Rory Finneran', 'Damola Ajayi', 'Keyrol Figueroa']
TOP = {'ENG_MUN', 'ENG_ARS', 'ENG_CHE', 'ENG_MCI', 'ENG_LIV', 'ESP_RMA', 'GER_FCB', 'ESP_BAR'}
POSG = {'GK': ['GK'], 'DF': ['CB', 'CB', 'LB', 'RB', 'CB'], 'MF': ['CM', 'CM', 'DM', 'AM', 'CM'], 'FW': ['ST', 'LW', 'RW', 'ST']}
BASE = {14: 44, 15: 47, 16: 51, 17: 55, 18: 58, 19: 61}
out, club = [], None
for l in src.strip().split('\n'):
    if l.startswith('#'): club = l[1:].split()[0]; continue
    n, g, nat, age = l.split('|'); age = int(age)
    o = O.get(fold(n))
    y = 2026 - age
    if o and abs(int(o[4][:4]) - y) <= 1:
        pos, ym, ovr, pot, foot = o[1], o[4], int(o[5]), int(o[6]), o[7]
        oy, om = int(ym[:4]), int(ym[5:7]); a0 = 2026 - oy - (1 if om > 11 else 0)
        if a0 != age: ym = '%d-%02d' % (2026 - age - (1 if om > 11 else 0), om); ovr -= (a0 - age) * 2; pot -= (a0 - age)
        if g == 'GK': pos = 'GK'
    else:
        pos = POSG[g][H(n, len(POSG[g]))]
        ym = '%d-%02d' % (y - (1 if H(n + 'm', 10) == 0 else 0), 1 + H(n + 'mm', 11))
        ovr = BASE.get(age, 58) + (1 if club in TOP else 0) + H(n + 'o', 5) - 2
        pot = min(88, ovr + 12 + H(n + 'p', 11) + max(0, 18 - age))
        foot = 'L' if pos in ('LB', 'LW') or H(n + 'f', 5) == 0 else 'R'
    out.append('|'.join([n, pos, club, nat, ym, str(ovr), str(pot), foot]))
for n in KEEP_OLD:
    o = O[fold(n)]; out.append('|'.join(o))
print('\n'.join(out))
