"""Make FAKE rainfall with a Wolaita-like seasonal cycle, only to test the pipeline end to end.
Writes to tests/synthetic_data/ (never data/), so it cannot be mistaken for real data."""
import datetime as dt, math, os, random
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "synthetic_data")
os.makedirs(OUT, exist_ok=True)
# mean wet-day probability and wet-day mean (mm) by month, roughly bimodal (Belg, Kiremt)
PW = [0.10,0.15,0.35,0.55,0.50,0.55,0.75,0.75,0.65,0.35,0.15,0.08]
MU = [4,5,7,9,8,8,10,10,8,7,5,4]
for ds, seed in [("chirps",1),("era5",2),("era5_land",3)]:
    for loc in ["offa_point","offa_box","sodo_pixel","wolaita_box"]:
        rng = random.Random(f"{ds}{loc}{seed}")
        d = dt.date(1981,1,1); rows=[]
        yfac = {}
        while d <= dt.date(2026,6,30):
            yfac.setdefault((d.year, d.month in (3,4,5)), rng.lognormvariate(0,0.25))
            f = yfac[(d.year, d.month in (3,4,5))]
            m = d.month-1
            mm = round(rng.expovariate(1/(MU[m]*f)),1) if rng.random() < min(0.95, PW[m]*f) else 0.0
            if loc.endswith("box"): mm = round(mm*0.9,1)
            rows.append(f"{d.isoformat()},{mm}"); d += dt.timedelta(days=1)
        open(os.path.join(OUT,f"{ds}__{loc}.csv"),"w").write("date,mm\n"+"\n".join(rows)+"\n")
print("synthetic series written to", OUT)
