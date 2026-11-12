// Stima al 1° rimbalzo: LED Lambertiani (120°) rivolti in basso sul perimetro di una campata,
// fondo bianco diffondente (Lambert) -> luminosità sul pannello diffusore.
// bw,bh = dimensioni interne campata (mm), H = profondità interna (mm), bar = lato listello (mm)
export function simulateBay(bw, bh, H, bar = 6, barW = 10, rho = 0.85) {
  const d = H - bar;                       // distanza LED -> fondo
  const leds = [];
  const pitch = 8;                         // COB = linea continua (campionata ogni 8 mm)
  const c = barW / 2;
  for (let y = 0; y <= bh; y += pitch) { leds.push([c, y]); leds.push([bw - c, y]); }
  for (let x = pitch; x < bw; x += pitch) { leds.push([x, c]); leds.push([x, bh - c]); }
  const fs = 8, fnx = Math.round(bw / fs), fny = Math.round(bh / fs);
  const floorL = new Float32Array(fnx * fny);
  for (let j = 0; j < fny; j++) for (let i = 0; i < fnx; i++) {
    const fx = (i + 0.5) * fs, fy = (j + 0.5) * fs;
    let E = 0;
    for (const [lx, ly] of leds) {
      const r2 = (fx - lx) ** 2 + (fy - ly) ** 2 + d * d;
      E += (d * d) / (r2 * r2);            // cos^2(theta)/r^2 = d^2/r^4
    }
    floorL[j * fnx + i] = rho * E;
  }
  const ds = 16, dnx = Math.round(bw / ds), dny = Math.round(bh / ds);
  const out = new Float32Array(dnx * dny);
  for (let j = 0; j < dny; j++) for (let i = 0; i < dnx; i++) {
    const px = (i + 0.5) * ds, py = (j + 0.5) * ds;
    let E = 0;
    for (let jj = 0; jj < fny; jj++) for (let ii = 0; ii < fnx; ii++) {
      const fx = (ii + 0.5) * fs, fy = (jj + 0.5) * fs;
      const r2 = (px - fx) ** 2 + (py - fy) ** 2 + H * H;
      E += floorL[jj * fnx + ii] * (H * H) / (r2 * r2);
    }
    out[j * dnx + i] = E;
  }
  let mn = 1e9, mx = 0, sum = 0;
  for (const v of out) { mn = Math.min(mn, v); mx = Math.max(mx, v); sum += v; }
  return { data: out, nx: dnx, ny: dny, min: mn, max: mx, avg: sum / out.length, ledCount: leds.length };
}
