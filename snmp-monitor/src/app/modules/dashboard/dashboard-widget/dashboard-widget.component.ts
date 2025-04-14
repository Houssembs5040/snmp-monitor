import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, TooltipItem } from 'chart.js';
import { Widget } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-widget',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard-widget.component.html',
  styleUrls: ['./dashboard-widget.component.scss']
})
export class DashboardWidgetComponent {
  @Input() widget!: Widget;
  @Output() remove = new EventEmitter<string>();

  getLatestValue(): any {
    return this.widget.values?.length ? this.widget.values[this.widget.values.length - 1].value : 'N/A';
  }

  getChartConfiguration(): ChartConfiguration<ChartType> {
    const chartType = this.getChartType();
    const chartData = this.getChartData(chartType);
    const chartOptions = this.getChartOptions(chartType);

    return {
      type: chartType,
      data: chartData,
      options: chartOptions
    };
  }

  getChartType(): ChartType {
    if (this.widget.name === 'CPU Usage') return 'pie';
    if (this.widget.name === 'Network In' || this.widget.name === 'Network Out') return 'line';
    return 'bubble';
  }

  getChartData(chartType: ChartType): ChartConfiguration<ChartType>['data'] {
    if (chartType === 'pie') {
      const latestValue = parseFloat(this.getLatestValue()) || 0;
      return {
        labels: ['Used', 'Free'],
        datasets: [{
          data: [latestValue, 100 - latestValue],
          backgroundColor: ['#f39c12', '#ecf0f1'],
          borderColor: ['#f39c12', '#ecf0f1'],
          borderWidth: 1
        }]
      };
    } else if (chartType === 'line') {
      return {
        labels: this.widget.values.map(v => new Date(v.timestamp).toLocaleTimeString()),
        datasets: [{
          data: this.widget.values.map(v => parseFloat(v.value) || 0),
          label: this.widget.name || this.widget.oid,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
          fill: true,
          tension: 0.4
        }]
      };
    } else {
      return {
        datasets: [{
          label: this.widget.name || this.widget.oid,
          data: this.widget.values.map(v => ({
            x: (v.timestamp % 1000) / 10,
            y: parseFloat(v.value) || 0,
            r: Math.min(15, Math.max(5, parseFloat(v.value) / 10))
          })),
          backgroundColor: 'rgba(243, 156, 18, 0.6)',
          borderColor: '#f39c12'
        }]
      };
    }
  }

  getChartOptions(chartType: ChartType): ChartConfiguration<ChartType>['options'] {
    if (chartType === 'pie') {
      return {
        responsive: true,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'pie'>) => `${context.label}: ${context.raw}%`
            }
          }
        }
      };
    } else if (chartType === 'line') {
      return {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'line'>) => `${context.dataset.label}: ${context.raw}`
            }
          }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 5 } },
          y: { beginAtZero: true }
        }
      };
    } else {
      return {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'bubble'>) => {
                const dataPoint = context.raw as { x: number; y: number; r: number };
                return `Value: ${dataPoint.y}`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Time (relative)' } },
          y: { title: { display: true, text: 'Value' } }
        }
      };
    }
  }
}