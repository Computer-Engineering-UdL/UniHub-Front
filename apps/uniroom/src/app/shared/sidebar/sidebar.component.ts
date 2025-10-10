import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Role, User } from '../../models/auth.types';
import { Observable } from 'rxjs';

interface NavItem {
  route: string;
  icon: string;
  translationKey: string;
  label?: string;
  requiresAuth?: boolean;
  roles?: Role[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent implements OnInit, OnDestroy {
  navItems: NavItem[] = [
    { translationKey: 'SIDEBAR.HOME', route: '/home', icon: 'home-outline' },
    { translationKey: 'SIDEBAR.CHANNELS', route: '/channels', icon: 'chatbubbles-outline' },
    { translationKey: 'SIDEBAR.UNIROOM', route: '/rooms', icon: 'business-outline' },
    { translationKey: 'SIDEBAR.UNIITEMS', route: '/uniitems', icon: 'cube-outline' },
    { translationKey: 'SIDEBAR.UNISERVICES', route: '/uniservices', icon: 'construct-outline' },
    { translationKey: 'SIDEBAR.UNICAR', route: '/unicar', icon: 'car-outline' },
    { translationKey: 'SIDEBAR.UNIBORSA', route: '/uniborsa', icon: 'briefcase-outline' },
    { translationKey: 'SIDEBAR.MESSAGES', route: '/messages', icon: 'mail-outline', requiresAuth: true },
    { translationKey: 'SIDEBAR.PROFILE', route: '/profile', icon: 'person-outline', requiresAuth: true },
    {
      translationKey: 'SIDEBAR.ADMIN_DASHBOARD',
      route: '/admin/dashboard',
      icon: 'speedometer-outline',
      roles: ['Admin']
    },
    {
      translationKey: 'SIDEBAR.ADMIN_USERS',
      route: '/admin/users',
      icon: 'people-outline',
      roles: ['Admin'],
      requiresAuth: true
    },
    {
      translationKey: 'SIDEBAR.ADMIN_CONTENT',
      route: '/admin/content',
      icon: 'document-text-outline',
      roles: ['Admin'],
      requiresAuth: true
    },
    {
      translationKey: 'SIDEBAR.ADMIN_REPORTS',
      route: '/admin/reports',
      icon: 'settings-outline',
      roles: ['Admin'],
      requiresAuth: true
    }
  ];

  // WARNING: If you change the icon of 'menu-outline', also change it in sidebar.component.html
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
    { translationKey: 'SIDEBAR.UNIROOM', route: '/rooms', icon: 'business-outline' },
    { translationKey: 'SIDEBAR.UNIITEMS', route: '/uniitems', icon: 'cube-outline' },
    { translationKey: 'SIDEBAR.UNISERVICES', route: '/uniservices', icon: 'construct-outline' },
    { translationKey: 'SIDEBAR.UNICAR', route: '/unicar', icon: 'car-outline' },
    { translationKey: 'SIDEBAR.UNIBORSA', route: '/uniborsa', icon: 'briefcase-outline' }
  ];

  currentUser$: Observable<User | null> = this.authService.currentUser$;

  filteredNavItems: NavItem[] = [];
  adminNavItems: NavItem[] = [];
  filteredMobileNavItems: NavItem[] = [];
  showBurgerMenu: boolean = false;

  constructor(
    public router: Router,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe((user: User | null): void => {
      this.filteredNavItems = this.navItems.filter((item: NavItem): boolean => {
        // If the item requires authentication, only show if user is authenticated
        if (item.requiresAuth && !user) {
          return false;
        }

        // Admin roles are not shown here since it are displayed in a separate section
        if (item.roles?.find((role) => role === 'Admin')) {
          return false;
        }

        // If the item has specific roles, only show if user has one of those roles
        return !(item.roles && (!user || !item.roles.includes(user.role)));
      });
      this.filteredMobileNavItems = user ? this.mobileNavItemsAuth : this.mobileNavItemsNotAuth;

      if (user?.role === 'Admin') {
        this.adminNavItems = this.navItems.filter((item: NavItem): boolean => !!item.roles?.includes('Admin'));
      } else {
        this.adminNavItems = [];
      }
      this.burgerMenuItems.push(...this.adminNavItems);
    });
  }

  ngOnInit(): void {
    document.addEventListener('mousedown', this.handleDocumentFocus.bind(this));
    document.addEventListener('touchstart', this.handleDocumentFocus.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.handleDocumentFocus.bind(this));
    document.removeEventListener('touchstart', this.handleDocumentFocus.bind(this));
  }

  handleDocumentFocus(event: MouseEvent | TouchEvent): void {
    if (this.showBurgerMenu) {
      const burgerMenu: Element | null = document.querySelector('.burger-menu');
      const burgerButton: Element | null = document.querySelector('.nav-item.burger');
      const target = event.target as Node;
      if (burgerMenu && !burgerMenu.contains(target) && burgerButton && !burgerButton.contains(target)) {
        this.showBurgerMenu = false;
      }
    }
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
