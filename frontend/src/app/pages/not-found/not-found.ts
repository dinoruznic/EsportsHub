import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-not-found',
  imports: [PagePlaceholder, RouterLink],
  template: `
    <app-page-placeholder
      eyebrow="Greška 404"
      heading="Stranica ne postoji"
      text="Adresa koju tražiš ne postoji ili je premještena."
    >
      <a class="btn btn-ghost" routerLink="/turniri">Nazad na turnire</a>
    </app-page-placeholder>
  `,
})
export default class NotFound {}
