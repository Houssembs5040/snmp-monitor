import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService, Device } from '../../../core/services/dashboard.service';


@Component({
  selector: 'app-dashboard-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './dashboard-dialog.component.html',
  styleUrls: ['./dashboard-dialog.component.scss']
})
export class DashboardDialogComponent implements OnInit {
  devices: Device[] = [];
  form: any = {
    device_id: null,
    oid: '',
    type: '',
    name: '',
    position: { x: 0, y: 0 }
  };

  constructor(
    private dialogRef: MatDialogRef<DashboardDialogComponent>,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.dashboardService.getDevices().subscribe({
      next: (devices) => (this.devices = devices),
      error: (error) => console.error('Error loading devices:', error)
    });
  }

  onSubmit() {
    const selectedDevice = this.devices.find(d => d.id === this.form.device_id);
    if (selectedDevice) {
      this.dialogRef.close({
        device_id: this.form.device_id,
        device_ip: selectedDevice.ip_address,
        device_name: selectedDevice.object_name,
        read_community: selectedDevice.read_community,
        oid: this.form.oid,
        type: this.form.type,
        name: this.form.name || undefined,
        position: this.form.position
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}