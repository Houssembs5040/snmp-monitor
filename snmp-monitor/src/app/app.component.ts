// src/app/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { LayoutService } from './core/services/layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent], // Add CommonModule
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isSidebarCollapsed: boolean = false; // Explicitly declare the property

  constructor(private layoutService: LayoutService) {
    this.layoutService.sidebarCollapsed$.subscribe(
      collapsed => this.isSidebarCollapsed = collapsed
    );
  }
}