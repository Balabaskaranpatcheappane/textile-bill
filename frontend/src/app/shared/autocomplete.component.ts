import {
  Component, ElementRef, EventEmitter, HostListener,
  Input, OnChanges, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Generic typeahead. Parent supplies the item list + how to render/search
 * each row. The typed text is two-way bound via [(value)] so if the user
 * types something that doesn't match any item (walk-in customer, custom
 * line item), the text still lands on the parent.
 *
 *   <app-autocomplete
 *     [items]="customers()"
 *     [display]="c => c.name"
 *     [secondary]="c => c.phone || ''"
 *     [searchFields]="['name','phone']"
 *     [(value)]="customerName"
 *     (picked)="onPick($event)"
 *     placeholder="Type…" />
 */
@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ac" [class.open]="open">
      <input #inp
             [(ngModel)]="q"
             (ngModelChange)="onInput()"
             (focus)="onFocus()"
             (blur)="onBlur()"
             (keydown)="onKey($event)"
             [placeholder]="placeholder"
             autocomplete="off"
             spellcheck="false">

      <div class="menu" *ngIf="open && (matches.length > 0 || emptyHint)">
        <div *ngFor="let m of matches; let i = index"
             class="item" [class.hi]="i === active"
             (mousedown)="pick(m); $event.preventDefault()"
             (mouseenter)="active = i">
          <div class="primary">{{ display(m) }}</div>
          <div class="secondary" *ngIf="secondary && secondary(m)">
            {{ secondary(m) }}
          </div>
        </div>
        <div class="hint" *ngIf="matches.length === 0 && emptyHint">
          {{ emptyHint }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ac { position: relative; width: 100%; }
    .ac input { width: 100%; }
    .menu {
      position: absolute;
      top: calc(100% + 2px);
      left: 0; right: 0;
      background: #fff;
      border: 1px solid var(--panel-border);
      border-radius: 6px;
      box-shadow: 0 6px 16px rgba(15,23,42,.10);
      max-height: 240px;
      overflow-y: auto;
      z-index: 30;
    }
    .item {
      padding: 6px 10px;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
    }
    .item:last-child { border-bottom: none; }
    .item.hi { background: #eef2ff; }
    .primary   { font-weight: 500; }
    .secondary { color: var(--muted); font-size: 12px; margin-top: 2px; }
    .hint      { padding: 8px 10px; color: var(--muted); font-size: 12px; }
  `],
})
export class AutocompleteComponent implements OnChanges {
  @Input() items: any[] = [];
  @Input() display!: (x: any) => string;
  @Input() secondary?: (x: any) => string;
  @Input() searchFields: string[] = [];
  @Input() placeholder = '';
  @Input() value = '';
  @Input() emptyHint = '';
  @Input() maxResults = 10;

  @Output() valueChange = new EventEmitter<string>();
  @Output() picked      = new EventEmitter<any>();

  @ViewChild('inp') inp!: ElementRef<HTMLInputElement>;

  q = '';
  active = 0;
  open = false;
  matches: any[] = [];

  ngOnChanges(c: SimpleChanges) {
    if (c['value'] && this.value !== this.q) this.q = this.value || '';
    if (c['items']) this.filter();
  }

  onInput() {
    this.valueChange.emit(this.q);
    this.filter();
    this.open = true;
    this.active = 0;
  }

  onFocus() {
    this.filter();
    this.open = true;
  }

  onBlur() {
    // Delay so a click on an option registers before we hide the menu.
    setTimeout(() => (this.open = false), 120);
  }

  onKey(ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') {
      this.open = true;
      this.active = Math.min(this.active + 1, this.matches.length - 1);
      ev.preventDefault();
    } else if (ev.key === 'ArrowUp') {
      this.active = Math.max(this.active - 1, 0);
      ev.preventDefault();
    } else if (ev.key === 'Enter') {
      if (this.open && this.matches[this.active]) {
        this.pick(this.matches[this.active]);
        ev.preventDefault();
      }
    } else if (ev.key === 'Escape') {
      this.open = false;
    }
  }

  pick(item: any) {
    this.q = this.display(item);
    this.valueChange.emit(this.q);
    this.picked.emit(item);
    this.open = false;
    // Blur so the parent form can move focus if it wishes.
    this.inp?.nativeElement.blur();
  }

  private filter() {
    const q = (this.q || '').trim().toLowerCase();
    const src = this.items || [];
    if (!q) {
      this.matches = src.slice(0, this.maxResults);
      return;
    }
    const fields = this.searchFields.length ? this.searchFields : ['name'];
    this.matches = src
      .filter((it) => fields.some((f) => {
        const v = it?.[f];
        return v != null && String(v).toLowerCase().includes(q);
      }))
      .slice(0, this.maxResults);
    if (this.active >= this.matches.length) this.active = 0;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const host = (this.inp?.nativeElement as HTMLElement)?.closest('.ac');
    if (host && !host.contains(ev.target as Node)) this.open = false;
  }
}
