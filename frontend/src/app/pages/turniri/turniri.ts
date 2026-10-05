import { Component } from '@angular/core';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-turniri',
  imports: [PagePlaceholder],
  template: `<app-page-placeholder eyebrow="Takmičenja" heading="Turniri" />`,
})
export default class Turniri {}
