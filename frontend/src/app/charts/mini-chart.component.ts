import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartPoint {
  label: string;   // x-axis label (short)
  value: number;   // y value
}

/**
 * Lightweight SVG chart — bar or line — with auto-scaled y-axis,
 * gridlines, hover tooltips and value labels. No external dependency.
 * Sized responsively; parent controls width, `height` controls height.
 */
@Component({
  selector: 'app-mini-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap" [style.height.px]="height">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H"
           preserveAspectRatio="none" class="chart">

        <!-- Y grid lines + labels -->
        <g class="grid">
          <line *ngFor="let g of gridLines" [attr.x1]="padL" [attr.x2]="W - padR"
                [attr.y1]="g.y" [attr.y2]="g.y" />
          <text *ngFor="let g of gridLines" [attr.x]="padL - 6" [attr.y]="g.y + 3"
                text-anchor="end" class="tick">{{ formatTick(g.value) }}</text>
        </g>

        <!-- Bars -->
        <ng-container *ngIf="type === 'bar'">
          <g *ngFor="let d of data; let i = index" class="bar-group">
            <rect [attr.x]="xFor(i) - barWidth / 2"
                  [attr.y]="yFor(d.value)"
                  [attr.width]="barWidth"
                  [attr.height]="H - padB - yFor(d.value)"
                  [attr.fill]="color"
                  rx="3">
              <title>{{ d.label }}: {{ valuePrefix }}{{ d.value | number:'1.0-2' }}</title>
            </rect>
          </g>
        </ng-container>

        <!-- Line + area -->
        <ng-container *ngIf="type === 'line'">
          <polygon [attr.points]="areaPoints" [attr.fill]="color" opacity="0.12" />
          <polyline [attr.points]="linePoints" fill="none"
                    [attr.stroke]="color" stroke-width="2"
                    stroke-linejoin="round" stroke-linecap="round" />
          <g *ngFor="let d of data; let i = index">
            <circle [attr.cx]="xFor(i)" [attr.cy]="yFor(d.value)" r="3"
                    [attr.fill]="color">
              <title>{{ d.label }}: {{ valuePrefix }}{{ d.value | number:'1.0-2' }}</title>
            </circle>
          </g>
        </ng-container>

        <!-- X labels -->
        <text *ngFor="let d of data; let i = index"
              [attr.x]="xFor(i)" [attr.y]="H - 4"
              text-anchor="middle" class="tick">{{ d.label }}</text>
      </svg>
    </div>
  `,
  styles: [`
    .wrap { width: 100%; }
    .chart { width: 100%; height: 100%; overflow: visible; }
    .grid line { stroke: #e5e7eb; stroke-dasharray: 3 3; }
    .tick      { font: 10px system-ui, sans-serif; fill: #6b7280; }
    .bar-group rect { transition: opacity .15s; }
    .bar-group:hover rect { opacity: 0.8; }
  `],
})
export class MiniChartComponent {
  @Input() data: ChartPoint[] = [];
  @Input() type: 'bar' | 'line' = 'bar';
  @Input() color = '#4f46e5';
  @Input() height = 220;
  @Input() valuePrefix = '';

  // Fixed viewBox width; SVG scales to container.
  readonly W = 800;
  readonly H = 260;
  readonly padL = 44;
  readonly padR = 8;
  readonly padT = 12;
  readonly padB = 24;

  get maxValue(): number {
    const m = Math.max(1, ...this.data.map((d) => d.value));
    // Round up to a "nice" number so grid ticks look clean.
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const norm = m / pow;
    const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return nice * pow;
  }

  get gridLines() {
    const max = this.maxValue;
    const usable = this.H - this.padT - this.padB;
    return [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: this.padT + usable * (1 - t),
      value: max * t,
    }));
  }

  get barWidth() {
    const usable = this.W - this.padL - this.padR;
    const step = usable / Math.max(1, this.data.length);
    return Math.max(2, step * 0.7);
  }

  xFor(i: number) {
    const usable = this.W - this.padL - this.padR;
    const step = usable / Math.max(1, this.data.length);
    return this.padL + step * (i + 0.5);
  }

  yFor(v: number) {
    const usable = this.H - this.padT - this.padB;
    return this.padT + usable * (1 - v / this.maxValue);
  }

  get linePoints() {
    return this.data.map((d, i) => `${this.xFor(i)},${this.yFor(d.value)}`).join(' ');
  }

  get areaPoints() {
    if (this.data.length === 0) return '';
    const base = this.H - this.padB;
    const pts = this.data.map((d, i) => `${this.xFor(i)},${this.yFor(d.value)}`).join(' ');
    return `${this.xFor(0)},${base} ${pts} ${this.xFor(this.data.length - 1)},${base}`;
  }

  formatTick(v: number) {
    if (v >= 100000) return (v / 100000).toFixed(1) + 'L';
    if (v >= 1000)   return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
    return v.toFixed(0);
  }
}
