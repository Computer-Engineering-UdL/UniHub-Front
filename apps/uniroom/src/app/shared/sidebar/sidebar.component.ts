import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  admin?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home-outline' },
    { label: 'Channels', route: '/channels', icon: 'chatbubbles-outline' },
    { label: 'UniRoom', route: '/uniroom', icon: 'business-outline' },
    { label: 'UniItems', route: '/uniitems', icon: 'cube-outline' },
    { label: 'UniServices', route: '/uniservices', icon: 'construct-outline' },
    { label: 'UniCar', route: '/unicar', icon: 'car-outline' },
    { label: 'UniBorsa', route: '/uniborsa', icon: 'briefcase-outline' },
    { label: 'Messages', route: '/messages', icon: 'mail-outline' },
    { label: 'Profile', route: '/profile', icon: 'person-outline' }
  ];

  adminItems: NavItem[] = [
    { label: 'Admin Dashboard', route: '/admin/dashboard', icon: 'speedometer-outline', admin: true },
    { label: 'Users', route: '/admin/users', icon: 'people-outline', admin: true },
    { label: 'Content', route: '/admin/content', icon: 'document-text-outline', admin: true },
    { label: 'Reports', route: '/admin/reports', icon: 'settings-outline', admin: true }
  ];

  constructor(public router: Router) {}

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}
