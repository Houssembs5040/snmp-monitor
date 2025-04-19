import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Host {
  ip: string;
  name?: string;
  network_id: number;
  snmp_available?: boolean;
  open_ports?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class SnmpService {
  private apiUrl = 'http://127.0.0.1:5000';

  constructor(private http: HttpClient) {}

  getDevices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/snmp/devices`);
  }

  addDevice(device: { ip_address: string; read_community: string; write_community: string; oid: string; object_name: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/snmp/add`, device);
  }

  deleteDevice(deviceId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/snmp/delete/${deviceId}`);
  }

  getRequest(deviceId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/snmp/get/${deviceId}`);
  }

  getNextRequest(deviceId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/snmp/getnext/${deviceId}`);
  }

  getBulkRequest(deviceId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/snmp/getbulk/${deviceId}`);
  }

  walkRequest(deviceId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/snmp/walk/${deviceId}`);
  }

  setRequest(deviceId: number, value: string, type: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/snmp/set/${deviceId}`, { value, type });
  }

  // Add this method if it doesn't exist
  scanDevice(ip: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/scan_device`, { ip });
  }
   // Network Methods
   getNetworks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/networks`);
  }

  addNetwork(network: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/networks/add`, network);
  }

  updateNetwork(network: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/networks/${network.id}`, network);
  }

  deleteNetwork(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/networks/${id}`);
  }

  pingNetwork(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/networks/ping/${id}`);
  }
  discoverDevices(networkId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/discover/${networkId}`);
  }

  pingDevice(ip: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ping_device`, { ip });
  }
  getHosts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/hosts`);
  }

  addHost(host: Host): Observable<any> {
    const payload = {
      ...host,
      snmp_available: host.snmp_available ?? false,
      open_ports: host.open_ports ?? [],
      name: host.name || `Host_${host.ip.replace(/\./g, '_')}`
    };
    return this.http.post(`${this.apiUrl}/hosts/add`, payload);
  }

  updateHost(id: number, host: { name: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/hosts/${id}`, host);
  }

  pingHost(ip: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/hosts/ping`, { ip });
  }

  getHostSnmp(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hosts/${id}/snmp`);
  }

  pingHosts(ips: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/hosts/ping`, { ips });
  }
}

