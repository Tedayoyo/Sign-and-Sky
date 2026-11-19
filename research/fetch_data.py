"""Download the daily rainfall series used by rescore.py.

Every series is saved as data/<dataset>__<location>.csv (columns: date, mm) and logged in
data/manifest.json with the exact request, the download time and a SHA-256 of the file,
so the paper's data statement can cite exactly what was used.

Sources used in the paper (directly from the data providers' catalogues):
  --source gee           CHIRPS v2.0 (UCSB-CHG/CHIRPS/DAILY), CHIRPS v3.0 (UCSB-CHC/CHIRPS/V3/DAILY_SAT) and
                         ERA5-Land (ECMWF/ERA5_LAND/DAILY_AGGR) from the Google Earth Engine data catalog
                         (free for research; needs an Earth Engine-enabled Google Cloud project)
  --source cds           ERA5 hourly precipitation from the Copernicus Climate Data Store
                         (reanalysis-era5-single-levels; free CDS account and ~/.cdsapirc)
Mirrors (no account; for quick checks only, not used for the paper's numbers):
  --source climateserv   CHIRPS v2.0 through NASA/USAID SERVIR ClimateSERV
  --source openmeteo     ERA5 and ERA5-Land through the Open-Meteo Historical Weather API

Example:
  python fetch_data.py --source gee --gee-project my-ee-project --source cds
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sys
import time

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
START = "1981-01-01"
END = "2026-06-30"   # covers every target window in specs.yaml (latest ends 2026-05-31)


def load_locations():
    spec = yaml.safe_load(open(os.path.join(HERE, "specs.yaml"), encoding="utf-8"))
    return spec["locations"]


def write_series(dataset, location, rows, request_info):
    os.makedirs(DATA, exist_ok=True)
    rows = sorted(rows)
    path = os.path.join(DATA, f"{dataset}__{location}.csv")
    with open(path, "w", encoding="utf-8") as f:
        f.write("date,mm\n")
        for d, v in rows:
            f.write(f"{d},{'' if v is None else round(float(v), 3)}\n")
    sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
    man_path = os.path.join(DATA, "manifest.json")
    man = json.load(open(man_path)) if os.path.exists(man_path) else {}
    missing = sum(1 for _, v in rows if v is None)
    man[f"{dataset}__{location}"] = dict(
        file=os.path.basename(path), sha256=sha, rows=len(rows), missing=missing,
        first=rows[0][0] if rows else None, last=rows[-1][0] if rows else None,
        downloaded_utc=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), request=request_info)
    json.dump(man, open(man_path, "w"), indent=2)
    print(f"  saved {path}: {len(rows)} days, {missing} missing, {rows[0][0]} .. {rows[-1][0]}")


def box_points(b, step=0.25):
    """Grid points every 0.25 deg (the ERA5 grid) inside the box."""
    import math
    lats, lons = [], []
    la = math.ceil(b["lat_min"] / step) * step
    while la <= b["lat_max"] + 1e-9:
        lats.append(round(la, 4)); la += step
    lo = math.ceil(b["lon_min"] / step) * step
    while lo <= b["lon_max"] + 1e-9:
        lons.append(round(lo, 4)); lo += step
    return [(a, o) for a in lats for o in lons]


def _get(session, url, params, tries=5):
    for i in range(tries):
        try:
            r = session.get(url, params=params, timeout=120)
            if r.status_code == 429:
                time.sleep(30 * (i + 1)); continue
            r.raise_for_status()
            return r
        except Exception as e:  # network hiccup: back off and retry
            if i == tries - 1:
                raise
            print("   retrying after error:", e)
            time.sleep(5 * (i + 1))


# ---------------------------------------------------------------- Open-Meteo (ERA5, ERA5-Land)
def fetch_openmeteo(locs):
    import requests
    s = requests.Session()
    url = "https://archive-api.open-meteo.com/v1/archive"
    for model, dataset in [("era5", "era5"), ("era5_land", "era5_land")]:
        for name, loc in locs.items():
            pts = [(loc["lat"], loc["lon"])] if "lat" in loc else box_points(loc)
            print(f"Open-Meteo {model} {name}: {len(pts)} grid point(s)")
            sums, counts = {}, {}
            # one request per decade keeps responses small
            y0 = int(START[:4])
            while y0 <= int(END[:4]):
                a = f"{y0}-01-01"
                b = min(f"{y0 + 9}-12-31", END)
                params = dict(latitude=",".join(str(p[0]) for p in pts), longitude=",".join(str(p[1]) for p in pts),
                              start_date=a, end_date=b, daily="precipitation_sum", timezone="GMT", models=model)
                js = _get(s, url, params).json()
                if isinstance(js, dict):
                    js = [js]
                for item in js:
                    for d, v in zip(item["daily"]["time"], item["daily"]["precipitation_sum"]):
                        if v is not None:
                            sums[d] = sums.get(d, 0.0) + v
                            counts[d] = counts.get(d, 0) + 1
                        else:
                            sums.setdefault(d, 0.0); counts.setdefault(d, 0)
                y0 += 10
                time.sleep(1)
            rows = [(d, (sums[d] / counts[d]) if counts[d] == len(pts) else None) for d in sums]
            write_series(dataset, name, rows, dict(api=url, model=model, points=pts, daily="precipitation_sum",
                                                   timezone="GMT", aggregation="mean of points" if len(pts) > 1 else "point",
                                                   start=START, end=END))


# ---------------------------------------------------------------- ClimateSERV (CHIRPS v2.0)
CHIRPS_RES = 0.05


def chirps_pixel_center(lat, lon):
    import math
    clon = -180 + (math.floor((lon + 180) / CHIRPS_RES) + 0.5) * CHIRPS_RES
    clat = -50 + (math.floor((lat + 50) / CHIRPS_RES) + 0.5) * CHIRPS_RES
    return round(clat, 4), round(clon, 4)


def climateserv_polygon(loc):
    if "lat" in loc:  # a small square inside the single CHIRPS pixel that contains the point
        clat, clon = chirps_pixel_center(loc["lat"], loc["lon"])
        e = 0.02
        a, b, c, d = clon - e, clon + e, clat - e, clat + e
    else:
        a, b, c, d = loc["lon_min"], loc["lon_max"], loc["lat_min"], loc["lat_max"]
    return [[a, d], [b, d], [b, c], [a, c], [a, d]]


def fetch_climateserv(locs):
    import requests
    s = requests.Session()
    base = "https://climateserv.servirglobal.net/api/"
    for name, loc in locs.items():
        poly = climateserv_polygon(loc)
        geom = json.dumps({"type": "Polygon", "coordinates": [poly], "properties": {}}).replace(" ", "")
        print(f"ClimateSERV CHIRPS {name}: polygon {poly}")
        rows = {}
        for y in range(int(START[:4]), int(END[:4]) + 1):
            a = dt.date(y, 1, 1)
            b = min(dt.date(y, 12, 31), dt.date.fromisoformat(END))
            params = dict(datatype=0, begintime=a.strftime("%m/%d/%Y"), endtime=b.strftime("%m/%d/%Y"),
                          intervaltype=0, operationtype=5, dateType_Category="default",
                          isZip_CurrentDataType=False, geometry=geom)
            for attempt in range(4):
                try:
                    r = s.post(base + "submitDataRequest/", params=params, timeout=120)
                    r.raise_for_status()
                    job = json.loads(r.text)[0]
                    for _ in range(600):
                        prog = json.loads(_get(s, base + "getDataRequestProgress/", {"id": job}).text)[0]
                        if prog == 100 or prog == -1:
                            break
                        time.sleep(2)
                    if prog == -1:
                        raise RuntimeError("ClimateSERV reported a processing error")
                    js = json.loads(_get(s, base + "getDataFromRequest/", {"id": job}).text)
                    break
                except Exception as e:
                    if attempt == 3:
                        raise
                    print("   retrying", y, e); time.sleep(10)
            n = 0
            for g in js.get("data", []):
                d = g["date"]
                try:
                    iso = dt.datetime.strptime(d, "%m/%d/%Y").date().isoformat()
                except ValueError:
                    iso = d[:10]
                v = g["value"].get("avg") if isinstance(g["value"], dict) else g["value"]
                v = None if v is None or float(v) < -999 else float(v)
                rows[iso] = v; n += 1
            print(f"   {y}: {n} days")
        write_series("chirps", name, list(rows.items()), dict(api=base, datatype="0 (CHIRPS v2.0)", operation="Average",
                                                              polygon=poly, start=START, end=END))


# ---------------------------------------------------------------- Google Earth Engine (CHIRPS v2.0, v3.0)
GEE_COLLECTIONS = [
    # (dataset name, Earth Engine collection, band, factor to mm/day, scale in m)
    ("chirps", "UCSB-CHG/CHIRPS/DAILY", "precipitation", 1.0, 5566),            # CHIRPS v2.0 (Funk et al., 2015)
    ("chirps_v3", "UCSB-CHC/CHIRPS/V3/DAILY_SAT", "precipitation", 1.0, 5566),  # CHIRPS v3.0 (Funk et al., 2026)
    ("era5_land", "ECMWF/ERA5_LAND/DAILY_AGGR", "total_precipitation_sum", 1000.0, 11132),  # metres -> mm
]


def fetch_gee(locs, project, only=None):
    """CHIRPS v2.0, CHIRPS v3.0 and ERA5-Land daily totals, directly from the Google Earth Engine catalog."""
    import ee
    try:
        ee.Initialize(project=project)
    except Exception:
        ee.Authenticate()
        ee.Initialize(project=project)
    for dataset, cid, band, factor, scale in GEE_COLLECTIONS:
        if only and dataset not in only:
            continue
        for name, loc in locs.items():
            geom = (ee.Geometry.Point([loc["lon"], loc["lat"]]) if "lat" in loc else
                    ee.Geometry.Rectangle([loc["lon_min"], loc["lat_min"], loc["lon_max"], loc["lat_max"]]))
            print(f"Earth Engine {cid} {name}")
            rows = {}
            for y in range(int(START[:4]), int(END[:4]) + 1):
                end = min(dt.date(y + 1, 1, 1), dt.date.fromisoformat(END) + dt.timedelta(days=1)).isoformat()
                col = ee.ImageCollection(cid).filterDate(f"{y}-01-01", end).select(band)
                if "lat" in loc:
                    fc = col.map(lambda im: ee.Feature(None, {
                        "d": im.date().format("YYYY-MM-dd"),
                        "v": im.sample(geom, scale).first().get(band)}))
                else:
                    fc = col.map(lambda im: ee.Feature(None, {
                        "d": im.date().format("YYYY-MM-dd"),
                        "v": im.reduceRegion(ee.Reducer.mean(), geom, scale).get(band)}))
                info = fc.getInfo()["features"]
                for f in info:
                    v = f["properties"].get("v")
                    rows[f["properties"]["d"]] = None if v is None else float(v) * factor
                print(f"   {y}: {len(info)} days")
            write_series(dataset, name, list(rows.items()), dict(
                api="Google Earth Engine", catalog=f"https://developers.google.com/earth-engine/datasets/catalog/{cid.replace('/', '_')}",
                collection=cid, band=band, to_mm_factor=factor, scale_m=scale, geometry=loc, start=START, end=END))


# ---------------------------------------------------------------- Copernicus Climate Data Store (ERA5)
def era5_daily_from_hourly(times, values_m):
    """ERA5 total precipitation is accumulated over the hour ending at each valid time (metres).
    The total for UTC day D is the sum of the values valid at D 01:00 ... D+1 00:00 (mm). Days without all
    24 hours are returned as None."""
    acc, cnt = {}, {}
    for t, v in zip(times, values_m):
        day = (t - dt.timedelta(hours=1)).date().isoformat()   # hour ending at t belongs to the day of t - 1 h
        if v is None:
            continue
        acc[day] = acc.get(day, 0.0) + float(v) * 1000.0
        cnt[day] = cnt.get(day, 0) + 1
    return {d: (acc[d] if cnt[d] == 24 else None) for d in acc}


def fetch_cds(locs):
    """ERA5 hourly total precipitation directly from the Copernicus Climate Data Store
    (dataset reanalysis-era5-single-levels, doi:10.24381/cds.adbb2d47), summed to UTC days.
    Needs a free CDS account and ~/.cdsapirc (see https://cds.climate.copernicus.eu/how-to-api)."""
    import cdsapi
    import numpy as np
    import xarray as xr
    c = cdsapi.Client()
    tmp = os.path.join(DATA, "cds_tmp"); os.makedirs(tmp, exist_ok=True)
    for name, loc in locs.items():
        if "lat" in loc:
            area = [loc["lat"] + 0.25, loc["lon"] - 0.25, loc["lat"] - 0.25, loc["lon"] + 0.25]
        else:
            area = [loc["lat_max"], loc["lon_min"], loc["lat_min"], loc["lon_max"]]
        print(f"Copernicus CDS ERA5 {name}: area {area}")
        times, vals = [], []
        for y in range(int(START[:4]), int(END[:4]) + 2):
            months = [f"{m:02d}" for m in range(1, 13)] if y <= int(END[:4]) else ["01"]
            days = [f"{d:02d}" for d in range(1, 32)] if y <= int(END[:4]) else ["01"]
            hours = [f"{h:02d}:00" for h in range(24)] if y <= int(END[:4]) else ["00:00"]
            if y > int(END[:4]) and END[5:] != "12-31":
                break
            target = os.path.join(tmp, f"era5_{name}_{y}.nc")
            if not os.path.exists(target):
                c.retrieve("reanalysis-era5-single-levels", {
                    "product_type": ["reanalysis"], "variable": ["total_precipitation"],
                    "year": [str(y)], "month": months, "day": days, "time": hours,
                    "data_format": "netcdf", "download_format": "unarchived", "area": area}, target)
            ds = xr.open_dataset(target)
            tname = "valid_time" if "valid_time" in ds.coords else "time"
            da = ds["tp"]
            if "lat" in loc:
                da = da.sel(latitude=loc["lat"], longitude=loc["lon"], method="nearest")
            else:
                da = da.mean(dim=["latitude", "longitude"])
            for t, v in zip(ds[tname].values, da.values):
                times.append(dt.datetime.utcfromtimestamp((t - np.datetime64(0, "s")) / np.timedelta64(1, "s")))
                vals.append(None if np.isnan(v) else float(v))
            print(f"   {y}: {len(ds[tname])} hours")
        daily = era5_daily_from_hourly(times, vals)
        daily = {d: v for d, v in daily.items() if START <= d <= END}
        write_series("era5", name, list(daily.items()), dict(
            api="Copernicus Climate Data Store", dataset="reanalysis-era5-single-levels",
            doi="10.24381/cds.adbb2d47", variable="total_precipitation", area=area,
            aggregation="hourly accumulations summed to UTC days; " + ("nearest grid point" if "lat" in loc else "mean of grid points in box"),
            start=START, end=END))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", action="append", choices=["gee", "cds", "climateserv", "openmeteo"], required=True)
    ap.add_argument("--gee-project", help="Google Cloud project with Earth Engine enabled (for --source gee)")
    a = ap.parse_args()
    locs = load_locations()
    for src in a.source:
        if src == "openmeteo":
            fetch_openmeteo(locs)
        elif src == "climateserv":
            fetch_climateserv(locs)
        elif src == "cds":
            fetch_cds(locs)
        elif src == "gee":
            if not a.gee_project:
                sys.exit("--gee-project is required for --source gee")
            fetch_gee(locs, a.gee_project)
    print("Done. Next: python rescore.py")


if __name__ == "__main__":
    main()
