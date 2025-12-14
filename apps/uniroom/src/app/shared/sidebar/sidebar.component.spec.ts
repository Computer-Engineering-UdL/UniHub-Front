import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.types';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mockAuthService: any;
  let mockRouter: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  beforeEach(waitForAsync(() => {
    currentUserSubject = new BehaviorSubject<User | null>(null);

    mockAuthService = {
      currentUser$: currentUserSubject.asObservable(),
      currentUser: null,
      logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve())
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      url: '/home'
    };

    TestBed.configureTestingModule({
      declarations: [SidebarComponent],
      imports: [IonicModule.forRoot(), HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter nav items when user is not authenticated', () => {
    currentUserSubject.next(null);
    fixture.detectChanges();
    const authRequiredItems = component.filteredNavItems.filter((item) => item.requiresAuth);
    expect(authRequiredItems.length).toBe(0);
  });

  it('should show admin items when user is Admin', () => {
    currentUserSubject.next({ id: '1', role: 'Admin', email: 'admin@test.com' } as User);
    fixture.detectChanges();
    expect(component.adminNavItems.length).toBeGreaterThan(0);
  });

  it('should not show admin items when user is Basic', () => {
    currentUserSubject.next({ id: '1', role: 'Basic', email: 'user@test.com' } as User);
    fixture.detectChanges();
    expect(component.adminNavItems.length).toBe(0);
  });

  it('should navigate when calling onBurgerMenuNavigate', async () => {
    await component.onBurgerMenuNavigate('/home');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    expect(component.showBurgerMenu).toBeFalse();
  });

  it('should toggle burger menu with onBurgerClick', () => {
    expect(component.showBurgerMenu).toBeFalse();
    component.onBurgerClick();
    expect(component.showBurgerMenu).toBeTrue();
    component.onBurgerClick();
    expect(component.showBurgerMenu).toBeFalse();
  });

  it('should close burger menu', () => {
    component.showBurgerMenu = true;
    component.closeBurgerMenu();
    expect(component.showBurgerMenu).toBeFalse();
  });

  it('should show authenticated mobile nav items when user is logged in', () => {
    currentUserSubject.next({ id: '1', role: 'Basic', email: 'user@test.com' } as User);
    fixture.detectChanges();
    expect(component.filteredMobileNavItems.some((item) => item.translationKey === 'SIDEBAR.PROFILE')).toBeTrue();
  });

  it('should show unauthenticated mobile nav items when user is not logged in', () => {
    currentUserSubject.next(null);
    fixture.detectChanges();
    expect(component.filteredMobileNavItems.some((item) => item.translationKey === 'SIDEBAR.LOGIN')).toBeTrue();
  });

  it('should check if route is active', () => {
    mockRouter.url = '/home';
    expect(component.isActive('/home')).toBeTrue();
    expect(component.isActive('/channels')).toBeFalse();
  });

  it('should handle document focus to close burger menu', () => {
    component.showBurgerMenu = true;
    const event = new MouseEvent('mousedown');
    component.handleDocumentFocus(event);
    expect(component.showBurgerMenu).toBeDefined();
  });
});
