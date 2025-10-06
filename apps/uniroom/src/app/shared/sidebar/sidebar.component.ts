import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.types';
import { Observable } from 'rxjs';

interface NavItem {
  route: string;
  icon: string;
  translationKey: string;
  admin?: boolean;
  label?: string;
  requiresAuth?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { translationKey: 'SIDEBAR.HOME', route: '/home', icon: 'home-outline' },
    { translationKey: 'SIDEBAR.CHANNELS', route: '/channels', icon: 'chatbubbles-outline' },
    { translationKey: 'SIDEBAR.UNIROOM', route: '/uniroom', icon: 'business-outline' },
    { translationKey: 'SIDEBAR.UNIITEMS', route: '/uniitems', icon: 'cube-outline' },
    { translationKey: 'SIDEBAR.UNISERVICES', route: '/uniservices', icon: 'construct-outline' },
    { translationKey: 'SIDEBAR.UNICAR', route: '/unicar', icon: 'car-outline' },
    { translationKey: 'SIDEBAR.UNIBORSA', route: '/uniborsa', icon: 'briefcase-outline' },
    { translationKey: 'SIDEBAR.MESSAGES', route: '/messages', icon: 'mail-outline', requiresAuth: true },
    { translationKey: 'SIDEBAR.PROFILE', route: '/profile', icon: 'person-outline', requiresAuth: true }
  ];

  adminItems: NavItem[] = [
    { translationKey: 'SIDEBAR.ADMIN_DASHBOARD', route: '/admin/dashboard', icon: 'speedometer-outline', admin: true },
    { translationKey: 'SIDEBAR.ADMIN_USERS', route: '/admin/users', icon: 'people-outline', admin: true },
    { translationKey: 'SIDEBAR.ADMIN_CONTENT', route: '/admin/content', icon: 'document-text-outline', admin: true },
    { translationKey: 'SIDEBAR.ADMIN_REPORTS', route: '/admin/reports', icon: 'settings-outline', admin: true }
  ];

  mobileNavItemsAuth: NavItem[] = [
    { translationKey: 'SIDEBAR.HOME', route: '/home', icon: 'home-outline' },
    { translationKey: 'SIDEBAR.OTHERS', route: '', icon: 'menu-outline' },
    { translationKey: 'SIDEBAR.MESSAGES', route: '/channels', icon: 'chatbubbles-outline' },
    { translationKey: 'SIDEBAR.PROFILE', route: '/profile', icon: 'person-outline' }
  ];

  mobileNavItemsNotAuth: NavItem[] = [
    { translationKey: 'SIDEBAR.HOME', route: '/home', icon: 'home-outline' },
    { translationKey: 'SIDEBAR.OTHERS', route: '', icon: 'menu-outline' },
    { translationKey: 'SIDEBAR.LOGIN', route: '/login', icon: 'log-in-outline' },
    { translationKey: 'SIDEBAR.SIGNUP', route: '/signup', icon: 'person-add-outline' }
  ];

  burgerMenuItems: NavItem[] = [
    { translationKey: 'SIDEBAR.UNIROOM', route: '/uniroom', icon: 'business-outline' },
    { translationKey: 'SIDEBAR.UNIITEMS', route: '/uniitems', icon: 'cube-outline' },
    { translationKey: 'SIDEBAR.UNISERVICES', route: '/uniservices', icon: 'construct-outline' },
    { translationKey: 'SIDEBAR.UNICAR', route: '/unicar', icon: 'car-outline' },
    { translationKey: 'SIDEBAR.UNIBORSA', route: '/uniborsa', icon: 'briefcase-outline' }
  ];

  currentUser$: Observable<User | null> = this.authService.currentUser$;

  filteredNavItems: NavItem[] = [];
  filteredMobileNavItems: NavItem[] = [];
  showBurgerMenu: boolean = false;

  constructor(
    public router: Router,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe((user: User | null): void => {
      this.filteredNavItems = this.navItems.filter((item: NavItem): boolean => {
        if (item.requiresAuth) {
          return !!user;
        }
        return true;
      });
      this.filteredMobileNavItems = user ? this.mobileNavItemsAuth : this.mobileNavItemsNotAuth;
    });
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  onBurgerClick(): void {
    this.showBurgerMenu = !this.showBurgerMenu;
  }

  async onBurgerMenuNavigate(route: string): Promise<void> {
    await this.router.navigate([route]);
    this.showBurgerMenu = false;
  }

  closeBurgerMenu(): void {
    this.showBurgerMenu = false;
  }
}
