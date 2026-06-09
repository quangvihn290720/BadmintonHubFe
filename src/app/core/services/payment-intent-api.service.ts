import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';

export interface PaymentIntent {
  id: string;
  lichdatId: string;
  amount: number;
  status: string;
  qrPayload: string;
  webhookSecret: string;
  createdAt: string;
  confirmedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentIntentApiService {
  private readonly http = inject(HttpClient);

  createIntent(lichdatId: string, amount: number): Observable<PaymentIntent> {
    return (this.http.post(API_ENDPOINTS.PAYMENTS.INTENTS, { lichdatId, amount }) as Observable<ApiResponse<PaymentIntent>>).pipe(
      map(response => response.data)
    );
  }

  getIntent(intentId: string): Observable<PaymentIntent> {
    return (this.http.get(API_ENDPOINTS.PAYMENTS.INTENT(intentId)) as Observable<ApiResponse<PaymentIntent>>).pipe(
      map(response => response.data)
    );
  }

  confirmMockWebhook(intentId: string, webhookSecret: string): Observable<unknown> {
    const headers = new HttpHeaders({ 'X-Webhook-Secret': webhookSecret });
    return (this.http.post(API_ENDPOINTS.PAYMENTS.MOCK_WEBHOOK, { intentId }, { headers }) as Observable<ApiResponse<unknown>>).pipe(
      map(response => response.data)
    );
  }
}
