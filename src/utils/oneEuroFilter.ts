/**
 * 1-Euro Adaptive Low-Pass Filter (Casiez et al., CHI 2012)
 * Eliminates micro-jitter on 3D anatomical labels and bone rigs when stationary
 * while maintaining near-zero latency during fast head or finger motion.
 */
export class LowPassFilter {
  private y = 0;
  private s = 0;
  private initialized = false;

  filter(value: number, alpha: number): number {
    if (!this.initialized) {
      this.initialized = true;
      this.y = value;
      this.s = value;
      return value;
    }
    this.s = alpha * value + (1 - alpha) * this.s;
    this.y = value;
    return this.s;
  }

  lastValue(): number {
    return this.y;
  }

  hasLastRawValue(): boolean {
    return this.initialized;
  }

  reset(): void {
    this.initialized = false;
  }
}

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private readonly xFilter = new LowPassFilter();
  private readonly dxFilter = new LowPassFilter();
  private lastTime = -1;

  constructor(minCutoff = 1.35, beta = 0.045, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / Math.max(dt, 1e-4));
  }

  filter(value: number, timestampSec: number): number {
    if (this.lastTime < 0 || timestampSec <= this.lastTime) {
      this.lastTime = timestampSec;
      return this.xFilter.filter(value, 1.0);
    }
    const dt = Math.min(timestampSec - this.lastTime, 0.25);
    this.lastTime = timestampSec;

    const dValue = this.xFilter.hasLastRawValue()
      ? (value - this.xFilter.lastValue()) / dt
      : 0;
    const edValue = this.dxFilter.filter(dValue, this.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edValue);
    return this.xFilter.filter(value, this.alpha(cutoff, dt));
  }

  reset(): void {
    this.lastTime = -1;
    this.xFilter.reset();
    this.dxFilter.reset();
  }
}

export class OneEuroVec3Filter {
  private readonly fx: OneEuroFilter;
  private readonly fy: OneEuroFilter;
  private readonly fz: OneEuroFilter;

  constructor(minCutoff = 1.35, beta = 0.045, dCutoff = 1.0) {
    this.fx = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.fy = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.fz = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  filter(
    x: number,
    y: number,
    z: number,
    tSec: number,
    out: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } {
    out.x = this.fx.filter(x, tSec);
    out.y = this.fy.filter(y, tSec);
    out.z = this.fz.filter(z, tSec);
    return out;
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}
