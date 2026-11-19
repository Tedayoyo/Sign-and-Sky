"""Paper figures for the re-scoring (called by rescore.py). Static PNG + SVG, 300 dpi."""
import os
import statistics as st

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402

from sns_score import add_days, shift_years, stats_for  # noqa: E402

INK, INK2, GRID, SURF = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb"
BLUE, ORANGE = "#2a78d6", "#eb6834"
SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]
BAND_COL = {"weak": "#f3f2ee", "fair": "#ecebe6", "strong": "#e2e1db", "very strong": "#d6d5ce"}

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "axes.edgecolor": INK2, "axes.labelcolor": INK,
                     "xtick.color": INK2, "ytick.color": INK2, "axes.spines.top": False, "axes.spines.right": False,
                     "figure.facecolor": SURF, "axes.facecolor": SURF, "savefig.facecolor": SURF})


def _save(fig, out, name):
    fig.savefig(os.path.join(out, name + ".png"), dpi=300, bbox_inches="tight")
    fig.savefig(os.path.join(out, name + ".svg"), bbox_inches="tight")
    plt.close(fig)


def fig_scores(out, sign_rows, label):
    rows = sorted(sign_rows, key=lambda r: r["rescored"])
    n = len(rows)
    fig, ax = plt.subplots(figsize=(7.2, 0.32 * n + 1.4))
    for lo, hi, name in [(0, 7, "weak"), (7, 8, "fair"), (8, 9, "strong"), (9, 10, "very strong")]:
        ax.axvspan(lo, hi, color=BAND_COL[name], zorder=0, lw=0)
        ax.text((lo + hi) / 2 if lo else 3.5, n - 0.35, name, ha="center", va="bottom", color=INK2, fontsize=7.5)
    y = range(n)
    h = 0.36
    ax.barh([i + h / 2 + 0.02 for i in y], [r["field_score"] for r in rows], height=h, color=ORANGE, label="Field score (2025, AI-calculated)", zorder=2)
    ax.barh([i - h / 2 - 0.02 for i in y], [r["rescored"] for r in rows], height=h, color=BLUE, label="Re-scored (sns-score-v1.1, CHIRPS)", zorder=2)
    ax.scatter([r["null_mean"] for r in rows], [i - h / 2 - 0.02 for i in y], marker="|", s=140, color=INK, lw=2,
               label="Zero-skill score (climatology)", zorder=3)
    ax.set_yticks(list(y))
    ax.set_yticklabels([f"{r['sign_id']}. {r['sign']}" + (" *" if r["status"] != "confirmed" else "") for r in rows])
    ax.set_xlim(0, 10); ax.set_ylim(-0.7, n + 0.2)
    ax.set_xlabel("Score out of 10")
    ax.grid(axis="x", color=GRID, lw=0.6, zorder=1)
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, 1.02), ncol=3, frameon=False, fontsize=7.5)
    ttl = "Field scores vs re-scored, with the score a no-skill sign would get"
    ax.set_title(ttl + (f"  [{label}]" if label else ""), loc="left", fontsize=10, color=INK, pad=24)
    fig.text(0.01, -0.02, "* timing provisional (see PREREGISTRATION.md)", color=INK2, fontsize=7)
    _save(fig, out, "fig_scores")


def fig_windows(out, primary_rows, days, label, first_year=1981):
    rows = [r for r in primary_rows if not r.get("error")]
    if not rows:
        return
    cols = 3
    nr = (len(rows) + cols - 1) // cols
    fig, axes = plt.subplots(nr, cols, figsize=(7.2, 2.1 * nr), squeeze=False)
    for ax, r in zip(axes.flat, rows):
        ty = int(r["start"][:4])
        stat, xl = {"heavy_rain": (lambda w: w.maxDayMm, "wettest day (mm)"),
                    "rain_onset": (lambda w: w.max3DayMm, "wettest 3 days (mm)")}.get(
                        r["outcome"], (lambda w: w.totalMm, "window total (mm)"))
        vals = []
        for y in range(first_year, ty):
            s = stats_for(days, shift_years(r["start"], y - ty), shift_years(r["end"], y - ty), y)
            if s.complete:
                vals.append(stat(s))
        t = stats_for(days, r["start"], r["end"], ty)
        ax.hist(vals, bins=12, color=SEQ[1], edgecolor=SURF, lw=1)
        ax.axvline(stat(t), color=BLUE if r["happened"] else ORANGE, lw=2)
        ax.set_title(f"{r['sign_id']}. {r['sign'][:30]}\n{r['outcome']}, {r['start']} to {r['end'][5:]}", fontsize=7.5, loc="left")
        ax.tick_params(labelsize=7)
        ax.set_xlabel(xl, fontsize=7)
    for ax in list(axes.flat)[len(rows):]:
        ax.axis("off")
    fig.suptitle("Target window (line) against the same window in every earlier year since 1981 (bars)" + (f"  [{label}]" if label else ""),
                 x=0.01, ha="left", fontsize=10)
    from matplotlib.lines import Line2D
    fig.legend([Line2D([], [], color=BLUE, lw=2), Line2D([], [], color=ORANGE, lw=2)],
               ["prediction came true", "prediction did not come true"], loc="lower center", ncol=2, frameon=False,
               fontsize=7.5, bbox_to_anchor=(0.5, -0.02))
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    _save(fig, out, "fig_windows")


def fig_sensitivity(out, sens_rows, sign_rows, label):
    ok = [r for r in sens_rows if r.get("error") == "" and r["variant"] == "pre-registered test"]
    if not ok:
        return
    configs = sorted({r["config"] for r in ok})
    signs = [r["sign_id"] for r in sorted(sign_rows, key=lambda r: r["sign_id"])]
    names = {r["sign_id"]: r["sign"] for r in sign_rows}
    M = []
    for s in signs:
        row = []
        for c in configs:
            v = [r["score"] for r in ok if r["sign_id"] == s and r["config"] == c]
            row.append(st.mean(v) if v else float("nan"))
        M.append(row)
    cmap = LinearSegmentedColormap.from_list("seq", SEQ)
    fig, ax = plt.subplots(figsize=(1.0 + 0.62 * len(configs), 0.3 * len(signs) + 1.6))
    im = ax.imshow(M, cmap=cmap, vmin=0, vmax=10, aspect="auto")
    for i, row in enumerate(M):
        for j, v in enumerate(row):
            if v == v:
                ax.text(j, i, f"{v:.1f}", ha="center", va="center", fontsize=6.5, color=INK if v < 6 else "#ffffff")
    ax.set_xticks(range(len(configs)))
    ax.set_xticklabels([c.replace("/", "\n") for c in configs], fontsize=6.5)
    ax.set_yticks(range(len(signs)))
    ax.set_yticklabels([f"{s}. {names[s][:28]}" for s in signs], fontsize=7)
    for sp in ax.spines.values():
        sp.set_visible(False)
    cb = fig.colorbar(im, ax=ax, fraction=0.04, pad=0.02)
    cb.set_label("score", fontsize=7); cb.ax.tick_params(labelsize=6.5)
    ax.set_title("Score by dataset, location and reference period" + (f"  [{label}]" if label else ""), loc="left", fontsize=10)
    _save(fig, out, "fig_sensitivity")


def make_all(out, sign_rows, primary_rows, null_rows, sens_rows, days, spec, label=""):
    if sign_rows:
        fig_scores(out, sign_rows, label)
    fig_windows(out, primary_rows, days, label, spec["null_model"]["first_year"])
    if sign_rows:
        fig_sensitivity(out, sens_rows, sign_rows, label)
