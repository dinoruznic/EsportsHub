import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Listing, Offer } from './models';

@Injectable({ providedIn: 'root' })
export class MarketApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/market';

  createListing(gameAccountId: number): Observable<Listing> {
    return this.http.post<Listing>(`${this.base}/listings`, { gameAccountId });
  }

  cancelListing(listingId: number): Observable<Listing> {
    return this.http.post<Listing>(`${this.base}/listings/${listingId}/cancel`, null);
  }

  openListings(): Observable<Listing[]> {
    return this.http.get<Listing[]>(`${this.base}/listings`);
  }

  openListingFor(gameAccountId: number): Observable<Listing | null> {
    return this.openListings().pipe(
      map((listings) => listings.find((listing) => listing.gameAccountId === gameAccountId) ?? null),
    );
  }

  offers(listingId: number): Observable<Offer[]> {
    return this.http.get<Offer[]>(`${this.base}/listings/${listingId}/offers`);
  }
}
