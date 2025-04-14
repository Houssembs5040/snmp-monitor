import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { SnmpService } from '../../core/services/snmp.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface Host {
  id: number;
  ip: string;
  name?: string;
  network_id: number;
  network_ip_range: string;
  snmp_available: boolean;
  open_ports: number[];
  expanded?: boolean;
  state?: string;
  sysDescr?: string;
  sysName?: string;
  editingName?: boolean;
  tempName?: string;
}

@Component({
  selector: 'app-hosts',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './hosts.component.html',
  styleUrls: ['./hosts.component.scss']
})
export class HostsComponent implements OnInit, OnDestroy {
  hosts: Host[] = [];
  errorMessage: string = '';
  actionMessage: string = '';
  private routerSubscription: Subscription | null = null;

  constructor(private snmpService: SnmpService, private router: Router) {}

  ngOnInit() {
    this.loadHosts();
    // Subscribe to router events to refresh states when returning to /hosts
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects === '/hosts') {
          this.loadHostStates();
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadHosts() {
    this.snmpService.getHosts().subscribe({
      next: (data: Host[]) => {
        console.log(data);
        this.hosts = data.map(host => ({ ...host, 
          expanded: false,
          state: 'unknown', 
          open_ports: Array.isArray(host.open_ports)
          ? host.open_ports
          : JSON.parse(host.open_ports || '[]') }));
        this.errorMessage = '';
        this.loadHostStates();
        this.hosts.forEach(host => {
          if (host.snmp_available) {
            this.loadSnmpDetails(host);
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading hosts:', error);
        this.errorMessage = `Error: ${error.message}`;
      }
    });
  }

  loadHostStates() {
    if (this.hosts.length === 0) return;
    const ips = this.hosts.map(host => host.ip);
    this.snmpService.pingHosts(ips).subscribe({
      next: (data: { ip: string; state: string }[]) => {
        this.hosts.forEach(host => {
          const result = data.find(item => item.ip === host.ip);
          host.state = result ? result.state : 'unknown';
        });
        this.actionMessage = 'Host states updated';
        setTimeout(() => this.actionMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error fetching host states:', error);
        this.actionMessage = `Error updating states: ${error.message}`;
        setTimeout(() => this.actionMessage = '', 3000);
      }
    });
  }

  loadSnmpDetails(host: Host) {
    this.snmpService.getHostSnmp(host.id).subscribe({
      next: (data: { sysDescr: string; sysName: string }) => {
        host.sysDescr = data.sysDescr;
        host.sysName = data.sysName;
        console.log(data);
        host.name = host.sysName !== 'Error' ? host.sysName : host.name;
      },
      error: (error: any) => {
        console.error(`Error fetching SNMP for ${host.ip}:`, error);
        host.sysDescr = 'Error';
        host.sysName = 'Error';
      }
    });
  }

  toggleHost(host: Host) {
    host.expanded = !host.expanded;
  }

  pingHost(host: Host) {
    this.actionMessage = `Pinging ${host.ip}...`;
    this.snmpService.pingHost(host.ip).subscribe({
      next: (data: { ip: string; state: string }) => {
        host.state = data.state;
        this.actionMessage = `Pinged ${host.ip}: ${data.state}`;
        setTimeout(() => this.actionMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error pinging host:', error);
        this.actionMessage = `Ping Error: ${error.message}`;
        setTimeout(() => this.actionMessage = '', 3000);
      }
    });
  }

  editName(host: Host) {
    host.editingName = true;
    host.tempName = host.name || '';
  }

  saveName(host: Host) {
    if (!host.tempName?.trim()) {
      this.actionMessage = 'Name cannot be empty';
      setTimeout(() => this.actionMessage = '', 3000);
      return;
    }
    this.snmpService.updateHost(host.id, { name: host.tempName }).subscribe({
      next: (data: Host) => {
        host.name = data.name;
        host.editingName = false;
        this.actionMessage = `Updated name for ${host.ip}`;
        setTimeout(() => this.actionMessage = '', 3000);
      },
      error: (error: any) => {
        console.error('Error updating name:', error);
        this.actionMessage = `Update Error: ${error.message}`;
        setTimeout(() => this.actionMessage = '', 3000);
      }
    });
  }

  cancelEdit(host: Host) {
    host.editingName = false;
    host.tempName = '';
  }

  queryHost(ip: string) {
    this.router.navigate(['/snmp-browser'], { queryParams: { ip } });
  }
}