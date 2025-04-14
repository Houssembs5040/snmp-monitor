import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataCacheService } from '../../core/services/data-cache.service';
import { SnmpService } from '../../core/services/snmp.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface Network {
  id: number;
  name: string;
  ip_range: string;
  gateway: string;
  status?: string;
}

@Component({
  selector: 'app-networks',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './networks.component.html',
  styleUrls: ['./networks.component.scss']
})
export class NetworksComponent implements OnInit, OnDestroy {
  networks: Network[] = [];
  newNetwork: Omit<Network, 'id' | 'status'> = { name: '', ip_range: '', gateway: '' };
  errorMessage: string = '';
  private pollSubscription!: Subscription;

  constructor(
    private dataCacheService: DataCacheService,
    private snmpService: SnmpService
  ) {}

  ngOnInit() {
    this.loadNetworks();
    // Poll network statuses every 5 minutes
    this.pollSubscription = interval(300000).subscribe(() => {
      this.pollNetworkStatuses();
    });
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  loadNetworks() {
    this.dataCacheService.getNetworks().subscribe({
      next: (data: Network[]) => {
        this.networks = data;
        this.errorMessage = '';
        this.pollNetworkStatuses();
      },
      error: (error: any) => {
        console.error('Error loading networks:', error);
        this.errorMessage = `Error: ${error.message}`;
      }
    });
  }

  pollNetworkStatuses() {
    this.networks.forEach(network => {
      if (!network.status) {
        this.pingNetwork(network.id, false); // Silent ping
      }
    });
  }

  addNetwork() {
    if (!this.newNetwork.name || !this.newNetwork.ip_range || !this.newNetwork.gateway) {
      this.errorMessage = 'Name, IP Range, and Gateway are required';
      return;
    }
    this.dataCacheService.addNetwork(this.newNetwork).subscribe({
      next: (data: Network) => {
        this.networks = [...this.networks, { ...data, status: undefined }];
        this.newNetwork = { name: '', ip_range: '', gateway: '' };
        this.errorMessage = '';
      },
      error: (error: any) => {
        console.error('Error adding network:', error);
        this.errorMessage = `Error: ${error.message}`;
      }
    });
  }

  updateNetwork(network: Network) {
    const { status, ...updateData } = network;
    this.dataCacheService.updateNetwork(updateData).subscribe({
      next: (data: Network) => {
        const index = this.networks.findIndex(n => n.id === data.id);
        if (index !== -1) {
          this.networks[index] = { ...data, status: this.networks[index].status };
        }
        this.errorMessage = '';
      },
      error: (error: any) => {
        console.error('Error updating network:', error);
        this.errorMessage = `Error: ${error.message}`;
      }
    });
  }

  deleteNetwork(id: number) {
    if (confirm('Are you sure you want to delete this network?')) {
      this.dataCacheService.deleteNetwork(id).subscribe({
        next: () => {
          this.networks = this.networks.filter(n => n.id !== id);
          this.errorMessage = '';
        },
        error: (error: any) => {
          console.error('Error deleting network:', error);
          this.errorMessage = `Error: ${error.message}`;
        }
      });
    }
  }

  pingNetwork(id: number, showAlert: boolean = true) {
    this.snmpService.pingNetwork(id).subscribe({
      next: (data: { id: number; status: string }) => {
        this.dataCacheService.updateNetworkStatus(data.id, data.status);
        const network = this.networks.find(n => n.id === data.id);
        if (network) {
          network.status = data.status;
        }
        if (showAlert) {
          if (data.status === 'active') {
            alert('Ping done successfully! :' + data.status);
          } else {
            alert('Network unreachable!');
          }
        }
        this.errorMessage = '';
      },
      error: (error: any) => {
        console.error('Error pinging network:', error);
        this.errorMessage = `Ping Error: ${error.message}`;
      }
    });
  }
}