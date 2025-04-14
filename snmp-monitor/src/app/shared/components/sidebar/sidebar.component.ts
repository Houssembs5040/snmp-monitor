// src/app/shared/components/sidebar/sidebar.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule], // Include CommonModule here
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  collapsed = false;

  constructor(private layoutService: LayoutService) {
    this.layoutService.sidebarCollapsed$.subscribe(
      collapsed => this.collapsed = collapsed
    );
  }

  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }
}