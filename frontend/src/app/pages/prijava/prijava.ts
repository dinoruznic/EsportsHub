import { Component } from '@angular/core';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-prijava',
  imports: [PagePlaceholder],
  template: `<app-page-placeholder eyebrow="Nalog" heading="Prijava" />`,
})
export default class Prijava {}
