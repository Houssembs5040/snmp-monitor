import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SnmpService } from './snmp.service';

interface Network {
  id: number;
  name: string;
  ip_range: string;
  gateway: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataCacheService {
  private networksSubject = new BehaviorSubject<Network[] | null>(null);
  private networksLoaded = false;

  constructor(private snmpService: SnmpService) {
    // Clear cache on browser refresh
    window.addEventListener('beforeunload', () => {
      this.clearCache();
    });
  }

  getNetworks(): Observable<Network[]> {
    if (this.networksLoaded && this.networksSubject.value) {
      return of(this.networksSubject.value);
    }
    return this.snmpService.getNetworks().pipe(
      tap((networks: Network[]) => {
        this.networksSubject.next(networks.map(n => ({ ...n, status: n.status || undefined })));
        this.networksLoaded = true;
      })
    );
  }

  addNetwork(network: Omit<Network, 'id' | 'status'>): Observable<Network> {
    return this.snmpService.addNetwork(network).pipe(
      tap((newNetwork: Network) => {
        const current = this.networksSubject.value || [];
        this.networksSubject.next([...current, { ...newNetwork, status: undefined }]);
      })
    );
  }

  updateNetwork(network: Omit<Network, 'status'>): Observable<Network> {
    return this.snmpService.updateNetwork(network).pipe(
      tap((updatedNetwork: Network) => {
        const current = this.networksSubject.value || [];
        const index = current.findIndex(n => n.id === updatedNetwork.id);
        if (index !== -1) {
          const existingStatus = current[index].status;
          this.networksSubject.next([
            ...current.slice(0, index),
            { ...updatedNetwork, status: existingStatus },
            ...current.slice(index + 1)
          ]);
        }
      })
    );
  }

  deleteNetwork(id: number): Observable<void> {
    return this.snmpService.deleteNetwork(id).pipe(
      tap(() => {
        const current = this.networksSubject.value || [];
        this.networksSubject.next(current.filter(n => n.id !== id));
      })
    );
  }

  updateNetworkStatus(id: number, status: string) {
    const current = this.networksSubject.value || [];
    const index = current.findIndex(n => n.id === id);
    if (index !== -1) {
      this.networksSubject.next([
        ...current.slice(0, index),
        { ...current[index], status },
        ...current.slice(index + 1)
      ]);
    }
  }

  clearCache() {
    this.networksSubject.next(null);
    this.networksLoaded = false;
  }
}