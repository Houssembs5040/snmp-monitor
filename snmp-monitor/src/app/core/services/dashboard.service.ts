import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

export interface Device {
  id: number;
  ip_address: string;
  read_community: string;
  object_name: string;
}

export interface Widget {
  id: string;
  device_id: number;
  device_ip: string;
  device_name: string;
  read_community: string;
  oid: string;
  type: 'graph' | 'gauge';
  name?: string;
  position: { x: number; y: number };
  values: { timestamp: number; value: any }[];
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = 'http://127.0.0.1:5000';

  private widgetsSubject = new BehaviorSubject<Widget[]>([]);
  widgets$ = this.widgetsSubject.asObservable();
  private pollingSubscriptions: { [key: string]: any } = {};

  constructor(private http: HttpClient) {
    this.loadDashboards();
  }

  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.apiUrl}/snmp/devices`);
  }

  loadDashboards() {
    this.http.get<Widget[]>(`${this.apiUrl}/snmp/dashboards`).subscribe({
      next: (widgets) => {
        const mappedWidgets = widgets.map(w => ({
          ...w,
          createdAt: w.createdAt || Date.now(),
          type: w.type === 'graph' ? 'gauge' : w.type
        }));
        this.widgetsSubject.next(mappedWidgets);
        mappedWidgets.forEach(widget => this.startPolling(widget));
      },
      error: (error) => console.error('Error loading dashboards:', error)
    });
  }

  addWidget(widget: Omit<Widget, 'id' | 'createdAt' | 'values'>): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.apiUrl}/snmp/dashboards`, widget).pipe(
      tap(response => {
        const newWidget: Widget = {
          ...widget,
          id: response.id,
          createdAt: Date.now(),
          values: []
        };
        this.widgetsSubject.next([...this.widgetsSubject.value, newWidget]);
        this.startPolling(newWidget);
      })
    );
  }

  updateWidgetPosition(id: string, position: { x: number; y: number }) {
    const widgets = this.widgetsSubject.value;
    const index = widgets.findIndex(w => w.id === id);
    if (index !== -1) {
      widgets[index].position = position;
      this.widgetsSubject.next([...widgets]);
      this.http.put(`${this.apiUrl}/snmp/dashboards/${id}`, { position }).subscribe({
        error: (error) => console.error('Error updating position:', error)
      });
    }
  }

  removeWidget(id: string) {
    const widgets = this.widgetsSubject.value.filter(w => w.id !== id);
    this.widgetsSubject.next(widgets);
    if (this.pollingSubscriptions[id]) {
      this.pollingSubscriptions[id].unsubscribe();
      delete this.pollingSubscriptions[id];
    }
    this.http.delete(`${this.apiUrl}/snmp/dashboards/${id}`).subscribe({
      error: (error) => console.error('Error deleting dashboard:', error)
    });
  }

  private startPolling(widget: Widget) {
    if (this.pollingSubscriptions[widget.id]) {
      this.pollingSubscriptions[widget.id].unsubscribe();
    }

    const subscription = interval(60000).pipe(
      switchMap(() => this.fetchSnmpValue(widget.device_ip, widget.oid, widget.read_community))
    ).subscribe({
      next: (value: any) => {
        const timestamp = Date.now();
        const widgets = this.widgetsSubject.value;
        const index = widgets.findIndex(w => w.id === widget.id);
        if (index !== -1) {
          widgets[index].values = [
            ...(widgets[index].values || []),
            { timestamp, value }
          ].slice(-100);
          this.widgetsSubject.next([...widgets]);
          this.http.post(`${this.apiUrl}/snmp/dashboard-values`, {
            dashboard_id: widget.id,
            timestamp,
            value
          }).subscribe({
            error: (error) => console.error('Error saving value:', error)
          });
        }
      },
      error: (error: any) => console.error(`Error polling OID ${widget.oid} for ${widget.device_ip}:`, error)
    });

    this.pollingSubscriptions[widget.id] = subscription;
  }

  private fetchSnmpValue(ip: string, oid: string, read_community: string): Observable<any> {
    return this.http.get<{ value: any }>(
      `${this.apiUrl}/snmp/get-value?ip=${ip}&oid=${oid}&read_community=${read_community}`
    ).pipe(
      tap(response => response),
      switchMap(response => [response.value])
    );
  }
}
