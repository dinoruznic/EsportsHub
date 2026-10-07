import { Component } from '@angular/core';

@Component({
  selector: 'app-landing',
  template: `
    <main>
      <h1 class="wordmark">ESPORTS<span>HUB</span></h1>
    </main>
  `,
  styles: `
    main {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 16px;
    }

    .wordmark {
      font: 900 clamp(48px, 9vw, 112px) / 0.9 var(--display);

      span {
        color: var(--gold);
      }
    }
  `,
})
export default class LandingPage {}
