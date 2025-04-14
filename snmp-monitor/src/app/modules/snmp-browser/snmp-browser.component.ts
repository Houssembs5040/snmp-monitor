import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SnmpService } from '../../core/services/snmp.service';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { ActivatedRoute } from '@angular/router';

interface MibNode {
  name: string;
  oid?: string;
  children?: MibNode[];
}

interface FlatNode {
  expandable: boolean;
  name: string;
  oid?: string;
  level: number;
}

@Component({
  selector: 'app-snmp-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTreeModule, MatIconModule],
  templateUrl: './snmp-browser.component.html',
  styleUrls: ['./snmp-browser.component.scss']
})
export class SnmpBrowserComponent implements OnInit {
  devices: any[] = [];
  newDevice = { ip_address: '', read_community: '', write_community: '', oid: '', object_name: '' };
  errorMessage: string = '';
  setValues: { [key: number]: string } = {}; // Store setValue per device ID
  setTypes: { [key: number]: string } = {}; // Store setType per device ID

  private _transformer = (node: MibNode, level: number): FlatNode => ({
    expandable: !!node.children && node.children.length > 0,
    name: node.name,
    oid: node.oid,
    level: level
  });

  treeControl = new FlatTreeControl<FlatNode>(
    (node: FlatNode) => node.level,
    (node: FlatNode) => node.expandable
  );

  treeFlattener = new MatTreeFlattener(
    this._transformer,
    (node: FlatNode) => node.level,
    (node: FlatNode) => node.expandable,
    (node: MibNode) => node.children
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  MIB_DATA: MibNode[] = [
    {
      name: 'iso (1)',
      oid: '.1',
      children: [
        {
          name: 'org (3)',
          oid: '.1.3',
          children: [
            {
              name: 'dod (6)',
              oid: '.1.3.6',
              children: [
                {
                  name: 'internet (1)',
                  oid: '.1.3.6.1',
                  children: [
                    {
                      name: 'directory (1)',
                      oid: '.1.3.6.1.1'
                    },
                    {
                      name: 'mgmt (2)',
                      oid: '.1.3.6.1.2',
                      children: [
                        {
                          name: 'mib-2 (1)',
                          oid: '.1.3.6.1.2.1',
                          children: [
                            {
                              name: 'system (1)',
                              oid: '.1.3.6.1.2.1.1',
                              children: [
                                { name: 'sysDescr (1)', oid: '.1.3.6.1.2.1.1.1.0' },
                                { name: 'sysObjectID (2)', oid: '.1.3.6.1.2.1.1.2.0' },
                                { name: 'sysUpTime (3)', oid: '.1.3.6.1.2.1.1.3.0' },
                                { name: 'sysContact (4)', oid: '.1.3.6.1.2.1.1.4.0' },
                                { name: 'sysName (5)', oid: '.1.3.6.1.2.1.1.5.0' },
                                { name: 'sysLocation (6)', oid: '.1.3.6.1.2.1.1.6.0' },
                                { name: 'sysServices (7)', oid: '.1.3.6.1.2.1.1.7.0' }
                              ]
                            },
                            {
                              name: 'interfaces (2)',
                              oid: '.1.3.6.1.2.1.2',
                              children: [
                                { name: 'ifNumber (1)', oid: '.1.3.6.1.2.1.2.1.0' },
                                {
                                  name: 'ifTable (2)',
                                  oid: '.1.3.6.1.2.1.2.2',
                                  children: [
                                    {
                                      name: 'ifEntry (1)',
                                      oid: '.1.3.6.1.2.1.2.2.1',
                                      children: [
                                        { name: 'ifIndex (1)', oid: '.1.3.6.1.2.1.2.2.1.1' },
                                        { name: 'ifDescr (2)', oid: '.1.3.6.1.2.1.2.2.1.2' },
                                        { name: 'ifType (3)', oid: '.1.3.6.1.2.1.2.2.1.3' },
                                        { name: 'ifMtu (4)', oid: '.1.3.6.1.2.1.2.2.1.4' },
                                        { name: 'ifSpeed (5)', oid: '.1.3.6.1.2.1.2.2.1.5' },
                                        { name: 'ifPhysAddress (6)', oid: '.1.3.6.1.2.1.2.2.1.6' },
                                        { name: 'ifAdminStatus (7)', oid: '.1.3.6.1.2.1.2.2.1.7' },
                                        { name: 'ifOperStatus (8)', oid: '.1.3.6.1.2.1.2.2.1.8' }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              name: 'ip (4)',
                              oid: '.1.3.6.1.2.1.4',
                              children: [
                                { name: 'ipForwarding (1)', oid: '.1.3.6.1.2.1.4.1.0' },
                                { name: 'ipDefaultTTL (2)', oid: '.1.3.6.1.2.1.4.2.0' },
                                {
                                  name: 'ipAddrTable (20)',
                                  oid: '.1.3.6.1.2.1.4.20',
                                  children: [
                                    {
                                      name: 'ipAddrEntry (1)',
                                      oid: '.1.3.6.1.2.1.4.20.1',
                                      children: [
                                        { name: 'ipAdEntAddr (1)', oid: '.1.3.6.1.2.1.4.20.1.1' },
                                        { name: 'ipAdEntIfIndex (2)', oid: '.1.3.6.1.2.1.4.20.1.2' },
                                        { name: 'ipAdEntNetMask (3)', oid: '.1.3.6.1.2.1.4.20.1.3' }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              name: 'icmp (5)',
                              oid: '.1.3.6.1.2.1.5',
                              children: [
                                { name: 'icmpInMsgs (1)', oid: '.1.3.6.1.2.1.5.1.0' },
                                { name: 'icmpInErrors (2)', oid: '.1.3.6.1.2.1.5.2.0' }
                              ]
                            },
                            {
                              name: 'tcp (6)',
                              oid: '.1.3.6.1.2.1.6',
                              children: [
                                { name: 'tcpRtoAlgorithm (1)', oid: '.1.3.6.1.2.1.6.1.0' },
                                {
                                  name: 'tcpConnTable (13)',
                                  oid: '.1.3.6.1.2.1.6.13',
                                  children: [
                                    {
                                      name: 'tcpConnEntry (1)',
                                      oid: '.1.3.6.1.2.1.6.13.1',
                                      children: [
                                        { name: 'tcpConnState (1)', oid: '.1.3.6.1.2.1.6.13.1.1' },
                                        { name: 'tcpConnLocalAddress (2)', oid: '.1.3.6.1.2.1.6.13.1.2' }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              name: 'udp (7)',
                              oid: '.1.3.6.1.2.1.7',
                              children: [
                                { name: 'udpInDatagrams (1)', oid: '.1.3.6.1.2.1.7.1.0' },
                                { name: 'udpNoPorts (2)', oid: '.1.3.6.1.2.1.7.2.0' }
                              ]
                            },
                            {
                              name: 'snmp (11)',
                              oid: '.1.3.6.1.2.1.11',
                              children: [
                                { name: 'snmpInPkts (1)', oid: '.1.3.6.1.2.1.11.1.0' },
                                { name: 'snmpOutPkts (2)', oid: '.1.3.6.1.2.1.11.2.0' }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    {
                      name: 'private (4)',
                      oid: '.1.3.6.1.4',
                      children: [
                        {
                          name: 'enterprises (1)',
                          oid: '.1.3.6.1.4.1',
                          children: [
                            { name: 'cisco (9)', oid: '.1.3.6.1.4.1.9' },
                            { name: 'microsoft (311)', oid: '.1.3.6.1.4.1.311' }
                          ]
                        }
                      ]
                    },
                    {
                      name: 'security (5)',
                      oid: '.1.3.6.1.5'
                    },
                    {
                      name: 'snmpV2 (6)',
                      oid: '.1.3.6.1.6',
                      children: [
                        {
                          name: 'snmpModules (3)',
                          oid: '.1.3.6.1.6.3',
                          children: [
                            { name: 'snmpMIB (1)', oid: '.1.3.6.1.6.3.1' }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  constructor(private snmpService: SnmpService,private route: ActivatedRoute) {
    this.dataSource.data = this.MIB_DATA;
  }

  hasChild = (_: number, node: FlatNode) => node.expandable;

  ngOnInit() {
    this.loadDevices();
    this.route.queryParams.subscribe(params => {
        if (params['ip']) {
          this.newDevice.ip_address = params['ip'];
        }
      });
    
  }

  loadDevices() {
    this.snmpService.getDevices().subscribe({
      next: (data) => {
        this.devices = data;
        // Initialize setValues and setTypes for existing devices
        data.forEach(device => {
          if (!(device.id in this.setValues)) {
            this.setValues[device.id] = '';
            this.setTypes[device.id] = 'string';
          }
        });
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error loading devices:', error);
        this.errorMessage = error.status === 404 ? 'Devices endpoint not found' : `Error: ${error.message}`;
      }
    });
  }

  addDevice() {
    this.snmpService.addDevice(this.newDevice).subscribe({
      next: (data) => {
        this.devices.push(data);
        // Initialize setValue and setType for the new device
        this.setValues[data.id] = '';
        this.setTypes[data.id] = 'string';
        this.newDevice = { ip_address: '', read_community: '', write_community: '', oid: '', object_name: '' };
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error adding device:', error);
        this.errorMessage = error.status === 400 ? error.error.error : 'Error adding device';
      }
    });
  }

  getRequest(deviceId: number) {
    this.snmpService.getRequest(deviceId).subscribe({
      next: (data) => {
        const index = this.devices.findIndex(d => d.id === deviceId);
        if (index !== -1) {
          this.devices[index] = data;
        }
        this.errorMessage = '';
        console.log(data);
      },
      error: (error) => {
        console.error('Error in GET request:', error);
        this.errorMessage = `GET Error: ${error.message}`;
      }
    });
  }

  getNextRequest(deviceId: number) {
    this.snmpService.getNextRequest(deviceId).subscribe({
      next: (data) => {
        console.log('GET NEXT result:', data.next);
        this.errorMessage = `GET NEXT: ${JSON.stringify(data.next)}`;
      },
      error: (error) => {
        console.error('Error in GET NEXT request:', error);
        this.errorMessage = `GET NEXT Error: ${error.message}`;
      }
    });
  }

  getBulkRequest(deviceId: number) {
    this.snmpService.getBulkRequest(deviceId).subscribe({
      next: (data) => {
        console.log('GET BULK result:', data.bulk);
        this.errorMessage = `GET BULK: ${JSON.stringify(data.bulk)}`;
      },
      error: (error) => {
        console.error('Error in GET BULK request:', error);
        this.errorMessage = `GET BULK Error: ${error.message}`;
      }
    });
  }

  walkRequest(deviceId: number) {
    this.snmpService.walkRequest(deviceId).subscribe({
      next: (data) => {
        console.log('WALK result:', data.walk);
        this.errorMessage = `WALK: ${JSON.stringify(data.walk)}`;
      },
      error: (error) => {
        console.error('Error in WALK request:', error);
        this.errorMessage = `WALK Error: ${error.message}`;
      }
    });
  }

  setRequest(deviceId: number) {
    const setValue = this.setValues[deviceId];
    const setType = this.setTypes[deviceId];
    if (!setValue) {
      this.errorMessage = 'Please enter a value for SET';
      return;
    }
    this.snmpService.setRequest(deviceId, setValue, setType).subscribe({
      next: (data) => {
        const index = this.devices.findIndex(d => d.id === deviceId);
        if (index !== -1) {
          this.devices[index] = data;
        }
        this.errorMessage = 'SET successful';
        this.setValues[deviceId] = ''; // Clear the specific device's input
        this.setTypes[deviceId] = 'string'; // Reset to default
      },
      error: (error) => {
        console.error('Error in SET request:', error);
        this.errorMessage = `SET Error: ${error.message}`;
      }
    });
  }

  deleteDevice(deviceId: number) {
    if (confirm('Are you sure you want to delete this device?')) {
      this.snmpService.deleteDevice(deviceId).subscribe({
        next: () => {
          this.devices = this.devices.filter(device => device.id !== deviceId);
          delete this.setValues[deviceId]; // Clean up
          delete this.setTypes[deviceId];
          this.errorMessage = '';
        },
        error: (error) => {
          console.error('Error deleting device:', error);
          this.errorMessage = error.status === 404 ? 'Delete endpoint not found' : `Error: ${error.message}`;
        }
      });
    }
  }

  selectOid(node: FlatNode) {
    if (node.oid) {
      this.newDevice.oid = node.oid;
      this.newDevice.object_name = node.name.split(' (')[0];
    }
  }
}