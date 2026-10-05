import { Component } from '@angular/core';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-market',
  imports: [PagePlaceholder],
  template: `<app-page-placeholder eyebrow="Transfer market" heading="Market" />`,
})
export default class Market {}
