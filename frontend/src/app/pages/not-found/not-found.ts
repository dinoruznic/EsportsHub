import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-not-found',
  imports: [PagePlaceholder, RouterLink],
  template: `
    <main>
      <app-page-placeholder
        eyebrow="Greška 404"
        heading="Stranica ne postoji"
        text="Adresa koju tražiš ne postoji ili je premještena."
      >
        <a class="btn btn-ghost" routerLink="/turniri">Nazad na turnire</a>
      </app-page-placeholder>
    </main>
  `,
  styles: `
    main {
      display: grid;
      align-content: center;
      min-height: 100dvh;
      padding: 48px max(16px, 6vw);
    }
  `,
})
export default class NotFound {}
