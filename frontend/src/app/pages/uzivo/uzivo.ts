import { Component } from '@angular/core';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-uzivo',
  imports: [PagePlaceholder],
  template: `<app-page-placeholder eyebrow="Mečevi u toku" heading="Uživo" />`,
})
export default class Uzivo {}
