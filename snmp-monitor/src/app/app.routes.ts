import { Routes } from '@angular/router';
import { DashboardComponent } from './modules/dashboard/dashboard.component';
import { SnmpBrowserComponent } from './modules/snmp-browser/snmp-browser.component';
import { NetworksComponent } from './modules/networks/networks.component';
import { DiscoveryComponent } from './modules/discovery/discovery.component';
import { HostsComponent } from './modules/hosts/hosts.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'snmp-browser', component: SnmpBrowserComponent },
  { path: 'networks', component: NetworksComponent },
  { path: 'discovery', component: DiscoveryComponent }, // Placeholder
  { path: 'alerts', component: NetworksComponent }, // Placeholder
  { path: 'templates', component: NetworksComponent }, // Placeholder
  { path: 'hosts', component: HostsComponent }, // Placeholder
  { path: 'items', component: NetworksComponent }, // Placeholder
  { path: 'users', component: NetworksComponent }, // Placeholder
  { path: 'settings', component: NetworksComponent } // Placeholder

];