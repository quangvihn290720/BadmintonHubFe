import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <span
      class="material-symbols-outlined app-icon"
      [class.app-icon-filled]="filled()"
      [style.font-size.px]="size()"
      [attr.aria-hidden]="true">
      {{ name() }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
    }
    .app-icon {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .app-icon-filled {
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppIconComponent {
  name = input.required<string>();
  size = input<number>(20);
  filled = input<boolean>(false);
}
