import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { SnmpService } from '../../core/services/snmp.service';
import { DataCacheService } from '../../core/services/data-cache.service'; // Import DataCacheService
import { Subscription } from 'rxjs';

interface Network {
  id: number;
  name: string;
  ip_range: string;
  gateway: string;
  status?: string; // Include status for consistency with NetworksComponent
}

interface Device {
  ip: string;
  state: string;
  open_ports: number[];
  snmp_available: boolean;
  expanded?: boolean;
  saved?: boolean;
}

@Component({
  selector: 'app-discovery',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './discovery.component.html',
  styleUrls: ['./discovery.component.scss']
})
export class DiscoveryComponent implements OnInit, OnDestroy {
  networks: Network[] = [];
  selectedNetworkId: number | null = null;
  devices: Device[] = [];
  errorMessage: string = '';
  pingMessage: string = '';
  isScanning: boolean = false;
  private scanSubscription: Subscription | null = null;

  constructor(
    private snmpService: SnmpService,
    private dataCacheService: DataCacheService, // Add DataCacheService
    private router: Router
  ) {}

  ngOnInit() {
    this.loadNetworks();
    if (localStorage.getItem('scanningNetworkId')) {
      this.selectedNetworkId = parseInt(localStorage.getItem('scanningNetworkId')!, 10);
      this.startScan();
    }
  }

  ngOnDestroy() {
    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe();
    }
  }

  loadNetworks() {
    this.dataCacheService.getNetworks().subscribe({
      next: (data: Network[]) => {
        this.networks = data;
        this.errorMessage = '';
      },
      error: (error: any) => {
        console.error('Error loading networks:', error);
        this.errorMessage = `Error: ${error.message}`;
      }
    });
  }

  startScan() {
    if (!this.selectedNetworkId) {
      this.errorMessage = 'Please select a network';
      return;
    }
    this.isScanning = true;
    this.errorMessage = '';
    this.devices = [];
    localStorage.setItem('scanningNetworkId', this.selectedNetworkId.toString());
    this.scanSubscription = this.snmpService.discoverDevices(this.selectedNetworkId).subscribe({
      next: (data: Device[]) => {
        this.devices = data.map(device => ({ ...device, expanded: false, saved: false }));
        this.checkSavedDevices();
        this.isScanning = false;
        localStorage.removeItem('scanningNetworkId');
      },
      error: (error: any) => {
        console.error('Error discovering devices:', error);
        this.errorMessage = `Error: ${error.message}`;
        this.isScanning = false;
        localStorage.removeItem('scanningNetworkId');
      }
    });
  }

  checkSavedDevices() {
    this.snmpService.getHosts().subscribe({
      next: (hosts: { id: number; ip: string; network_id: number; network_ip_range: string; snmp_available: boolean; open_ports: number[] }[]) => {
        this.devices.forEach(device => {
          device.saved = hosts.some(host => host.ip === device.ip);
        });
      }
    });
  }

  toggleDevice(device: Device) {
    device.expanded = !device.expanded;
  }

  pingDevice(ip: string) {
    this.pingMessage = `Pinging ${ip}...`;
    this.snmpService.pingDevice(ip).subscribe({
      next: (data: { ip: string; state: string }) => {
        const device = this.devices.find(d => d.ip === data.ip);
        if (device) {
          device.state = data.state;
        }
        this.pingMessage = `Pinged ${ip}: ${data.state}`;
        setTimeout(() => this.pingMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error pinging device:', error);
        this.pingMessage = `Ping Error: ${error.message}`;
        setTimeout(() => this.pingMessage = '', 3000);
      }
    });
  }

  saveDevice(device: Device) {
    if (!this.selectedNetworkId) {
      this.pingMessage = 'Cannot save: No network selected';
      setTimeout(() => this.pingMessage = '', 3000);
      return;
    }
    const payload = {
      ip: device.ip,
      network_id: this.selectedNetworkId,
      snmp_available: device.snmp_available,
      open_ports: device.open_ports
    };
    alert('DEVICE SAVED SUCCESSFULLY !');
    console.log('Saving device with payload:', payload); // Debug log
    this.snmpService.addHost(payload).subscribe({
      next: () => {
        device.saved = true;
        this.pingMessage = `Saved ${device.ip} to Hosts`;
        setTimeout(() => this.pingMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error saving device:', error);
        const errorMsg = error.error?.error || error.message || 'Unknown error';
        this.pingMessage = `Save Error: ${errorMsg}`;
        setTimeout(() => this.pingMessage = '', 5000);
      }
    });
  }

  queryDevice(ip: string) {
    this.router.navigate(['/snmp-browser'], { queryParams: { ip } });
  }
}