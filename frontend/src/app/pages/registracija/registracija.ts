import { Component } from '@angular/core';
import { PagePlaceholder } from '../../shared/page-placeholder/page-placeholder';

@Component({
  selector: 'app-registracija',
  imports: [PagePlaceholder],
  template: `<app-page-placeholder eyebrow="Novi nalog" heading="Registracija" />`,
})
export default class Registracija {}
