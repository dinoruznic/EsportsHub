import { Component, input } from '@angular/core';
import { LandingImage } from './landing-images';

@Component({
  selector: 'app-landing-background',
  templateUrl: './landing-background.html',
  styleUrl: './landing-background.scss',
  host: { 'aria-hidden': 'true' },
})
export class LandingBackground {
  readonly images = input<readonly LandingImage[]>([]);

  protected readonly rows = ['League of Legends', 'Counter-Strike 2', 'Valorant', 'Dota 2'];
  protected readonly copies = [0, 1];
  protected readonly repeats = [0, 1, 2];
}
