import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Contract, Listing, MakeOfferRequest, MyOffer, Offer } from './models';

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

  openListings(gameId?: number | null): Observable<Listing[]> {
    const options = gameId ? { params: { gameId } } : {};
    return this.http.get<Listing[]>(`${this.base}/listings`, options);
  }

  openListingFor(gameAccountId: number): Observable<Listing | null> {
    return this.openListings().pipe(
      map((listings) => listings.find((listing) => listing.gameAccountId === gameAccountId) ?? null),
    );
  }

  myListings(username: string): Observable<Listing[]> {
    return this.openListings().pipe(
      map((listings) => listings.filter((listing) => listing.ownerUsername === username)),
    );
  }

  offers(listingId: number): Observable<Offer[]> {
    return this.http.get<Offer[]>(`${this.base}/listings/${listingId}/offers`);
  }

  makeOffer(listingId: number, request: MakeOfferRequest): Observable<Offer> {
    return this.http.post<Offer>(`${this.base}/listings/${listingId}/offers`, request);
  }

  acceptOffer(offerId: number): Observable<Contract> {
    return this.http.post<Contract>(`${this.base}/offers/${offerId}/accept`, null);
  }

  rejectOffer(offerId: number): Observable<Offer> {
    return this.http.post<Offer>(`${this.base}/offers/${offerId}/reject`, null);
  }

  withdrawOffer(offerId: number): Observable<Offer> {
    return this.http.post<Offer>(`${this.base}/offers/${offerId}/withdraw`, null);
  }

  myOffers(): Observable<MyOffer[]> {
    return this.http.get<MyOffer[]>('/api/me/offers');
  }
}
