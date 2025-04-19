import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { SnmpService } from '../../core/services/snmp.service';
import { DataCacheService } from '../../core/services/data-cache.service';
import { Subscription } from 'rxjs';

interface Network {
  id: number;
  name: string;
  ip_range: string;
  gateway: string;
}

interface Device {
  ip: string;
  state: string;
  basic_scan_done: boolean;
  detailed_scan?: {
    host: string;
    status: string;
    ports: {
      port: string;
      protocol: string;
      state: string;
      service: string;
    }[];
  };
  expanded?: boolean;
  saved?: boolean;
}

interface HostPayload {
  ip: string;
  name?: string;
  network_id: number;
  snmp_available: boolean;
  open_ports: number[];
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
  statusMessage: string = '';
  isScanning: boolean = false;
  private scanSubscription: Subscription | null = null;

  constructor(
    private snmpService: SnmpService,
    private dataCacheService: DataCacheService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadNetworks();
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
    this.statusMessage = 'Scanning for connected devices...';
    
    this.scanSubscription = this.snmpService.discoverDevices(this.selectedNetworkId).subscribe({
      next: (data: Device[]) => {
        this.devices = data.map(device => ({ 
          ...device, 
          expanded: false, 
          saved: false 
        }));
        this.isScanning = false;
        this.statusMessage = `Found ${this.devices.length} devices`;
        setTimeout(() => this.statusMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error discovering devices:', error);
        this.errorMessage = `Error: ${error.message}`;
        this.isScanning = false;
        this.statusMessage = '';
      }
    });
  }

  toggleDevice(device: Device) {
    device.expanded = !device.expanded;
  }

  performDetailedScan(device: Device) {
    if (!device.ip) return;
    
    this.statusMessage = `Scanning ${device.ip} with nmap...`;
    device.basic_scan_done = true;
    
    this.snmpService.scanDevice(device.ip).subscribe({
      next: (response: any) => {
        device.detailed_scan = response.scan_result;
        this.statusMessage = `Scan completed for ${device.ip}`;
        setTimeout(() => this.statusMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error scanning device:', error);
        this.statusMessage = `Scan failed for ${device.ip}: ${error.message}`;
        setTimeout(() => this.statusMessage = '', 5000);
      }
    });
  }

  saveDevice(device: Device) {
    if (!this.selectedNetworkId || !device.ip) {
      this.statusMessage = 'Cannot save: No network selected or invalid device';
      setTimeout(() => this.statusMessage = '', 3000);
      return;
    }
    
    const payload: HostPayload = {
      ip: device.ip,
      network_id: this.selectedNetworkId,
      snmp_available: device.detailed_scan?.ports?.some(p => 
        p.service.toLowerCase().includes('snmp')
      ) || false,
      open_ports: device.detailed_scan?.ports?.map(p => parseInt(p.port, 10)) || [],
      name: `Device_${device.ip.replace(/\./g, '_')}`
    };
    
    this.snmpService.addHost(payload).subscribe({
      next: () => {
        device.saved = true;
        this.statusMessage = `Saved ${device.ip} to Hosts`;
        setTimeout(() => this.statusMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error saving device:', error);
        const errorMsg = error.error?.error || error.message || 'Unknown error';
        this.statusMessage = `Save Error: ${errorMsg}`;
        setTimeout(() => this.statusMessage = '', 5000);
      }
    });
  }
}