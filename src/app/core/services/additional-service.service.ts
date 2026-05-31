import { Injectable, signal } from '@angular/core';

export interface ServiceItem {
  id: number;
  key: string;
  name: string;
  price: number;
  quantity?: number;
}

@Injectable({ providedIn: 'root' })
export class AdditionalServiceService {
  private readonly servicesSignal = signal<ServiceItem[]>([
    { id: 1, key: 'water', name: '🥤 Nước ngọt/suối', price: 15000 },
    { id: 2, key: 'ball', name: '🏸 Quả cầu lông', price: 25000 },
    { id: 3, key: 'racket', name: '🎾 Thuê vợt', price: 50000 }
  ]);

  readonly services = this.servicesSignal.asReadonly();
  private nextId = 4;

  getServices(): ServiceItem[] {
    return [...this.servicesSignal()];
  }

  addService(name: string, price: number): void {
    const key = 'service_' + Date.now();
    const newService: ServiceItem = {
      id: this.nextId++,
      key,
      name,
      price
    };
    this.servicesSignal.update(list => [...list, newService]);
  }

  updateService(id: number, name: string, price: number): void {
    this.servicesSignal.update(list => {
      const idx = list.findIndex(s => s.id === id);
      if (idx !== -1) {
        const copy = [...list];
        copy[idx] = { ...copy[idx], name, price };
        return copy;
      }
      return list;
    });
  }

  deleteService(id: number): void {
    this.servicesSignal.update(list => list.filter(s => s.id !== id));
  }
}
