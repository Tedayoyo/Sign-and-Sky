// Web Mercator at zoom 10 (256-px tiles) for the Sentinel-2 cloudless background (EOX, CC BY 4.0).
export const Z = 10;
const SCALE = 256 * 2 ** Z;
export const mx = (lon: number) => ((lon + 180) / 360) * SCALE;
export const my = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * SCALE;
};
export type Box = { w: number; e: number; s: number; n: number };
export const EXT: Box = { w: 37.28, e: 38.27, s: 6.3, n: 7.25 };
export const WOLAITA: Box = { w: 37.4, e: 38.2, s: 6.5, n: 7.2 };
export const OFFA: Box = { w: 37.4, e: 37.68, s: 6.61, n: 6.83 };
export const tileUrl = (x: number, y: number) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/${Z}/${y}/${x}.jpg`;
export const rectOf = (b: Box) => ({ x: mx(b.w), y: my(b.n), width: mx(b.e) - mx(b.w), height: my(b.s) - my(b.n) });
export function viewOf(b: Box) {
  const v = { x: mx(b.w), y: my(b.n), w: mx(b.e) - mx(b.w), h: my(b.s) - my(b.n) };
  const tiles: { x: number; y: number }[] = [];
  for (let x = Math.floor(v.x / 256); x <= Math.floor((v.x + v.w) / 256); x++)
    for (let y = Math.floor(v.y / 256); y <= Math.floor((v.y + v.h) / 256); y++) tiles.push({ x, y });
  return { ...v, tiles };
}
