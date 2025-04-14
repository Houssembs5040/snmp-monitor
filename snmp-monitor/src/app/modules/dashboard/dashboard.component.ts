import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DashboardService, Widget } from '../../core/services/dashboard.service';

import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Subscription } from 'rxjs';
import { DashboardDialogComponent } from './dashboard-dialog/dashboard-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    DragDropModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  widgets: Widget[] = [];
  private subscription: Subscription = new Subscription();

  chartType: ChartType = 'line';
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { type: 'time', time: { unit: 'minute' } },
      y: { beginAtZero: true }
    }
  };

  constructor(
    private dashboardService: DashboardService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.dashboardService.widgets$.subscribe(widgets => {
        this.widgets = widgets;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(DashboardDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dashboardService.addWidget(result).subscribe();
      }
    });
  }

  getChartData(widget: Widget): ChartData<'line'> {
    return {
      labels: widget.values.map(v => new Date(v.timestamp)),
      datasets: [
        {
          label: widget.name || widget.device_name,
          data: widget.values.map(v => parseFloat(v.value) || 0), // Ensure numeric values
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  getLatestValue(widget: Widget): string {
    return widget.values.length > 0 ? widget.values[widget.values.length - 1].value : 'N/A';
  }

  dragEnded(event: CdkDragEnd, widget: Widget) {
    const newPosition = {
      x: widget.position.x + event.distance.x,
      y: widget.position.y + event.distance.y
    };
    this.dashboardService.updateWidgetPosition(widget.id, newPosition);
    event.source._dragRef.reset(); // Reset drag position to prevent offset
  }

  removeWidget(id: string) {
    if (confirm('Are you sure you want to delete this dashboard?')) {
      this.dashboardService.removeWidget(id);
    }
  }
}