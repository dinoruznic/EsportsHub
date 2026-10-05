import { Component } from '@angular/core';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-profil',
  imports: [PagePlaceholder],
  template: `<app-page-placeholder eyebrow="Tvoj nalog" heading="Profil" />`,
})
export default class Profil {}
