import { Component } from '@angular/core';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-timovi',
  imports: [PagePlaceholder],
  template: `<app-page-placeholder eyebrow="Ekipe i rosteri" heading="Timovi" />`,
})
export default class Timovi {}
