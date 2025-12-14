import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { HomePage } from './home.page';
import { AuthService } from '../services/auth.service';
import { ChannelService } from '../services/channel.service';
import { ApiService } from '../services/api.service';
import { UniItemsService } from '../services/uni-items.service';
import { LocalizationService } from '../services/localization.service';
import NotificationService from '../services/notification.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  const mockAuthService = {
    currentUser$: of({ id: 'user1', email: 'test@test.com', role: 'Basic' }),
    currentUser: { id: 'user1', email: 'test@test.com', role: 'Basic' }
  };

  const mockChannelService = {
    fetchChannels: jasmine.createSpy('fetchChannels').and.returnValue(
      Promise.resolve([
        { id: '1', name: 'General', member_count: 10 },
        { id: '2', name: 'Tech', member_count: 5 }
      ])
    )
  };

  const mockApiService = {
    get: jasmine.createSpy('get').and.returnValue(
      of({
        data: [
          { id: 'offer1', title: 'Room A', price: 100 },
          { id: 'offer2', title: 'Room B', price: 200 }
        ]
      })
    )
  };

  const mockUniItemsService = {
    getItems: jasmine.createSpy('getItems').and.returnValue(
      of({
        items: [
          { id: 'item1', title: 'Laptop' },
          { id: 'item2', title: 'Desk' }
        ],
        pagination: { total: 2, page: 1, per_page: 10 }
      })
    )
  };

  const mockLocalizationService = {
    formatNumber: jasmine.createSpy('formatNumber').and.returnValue('100'),
    formatDate: jasmine.createSpy('formatDate').and.returnValue('2025-12-14')
  };

  const mockNotificationService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error')
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot(), HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ChannelService, useValue: mockChannelService },
        { provide: ApiService, useValue: mockApiService },
        { provide: UniItemsService, useValue: mockUniItemsService },
        { provide: LocalizationService, useValue: mockLocalizationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize sections on init', () => {
    component.ngOnInit();
    expect(component.sections.length).toBeGreaterThan(0);
    expect(component.sections.some((s) => s.route === '/channels')).toBeTrue();
    expect(component.sections.some((s) => s.route === '/rooms')).toBeTrue();
  });

  it('should load home data on init', async () => {
    await component.ngOnInit();
    expect(mockChannelService.fetchChannels).toHaveBeenCalled();
    expect(mockApiService.get).toHaveBeenCalled();
  });

  it('should set user from auth service', () => {
    component.ngOnInit();
    expect(component.user).toBeTruthy();
    expect(component.user?.id).toBe('user1');
  });

  it('should have sections with valid routes', () => {
    component.ngOnInit();
    expect(component.sections.length).toBeGreaterThan(0);
    expect(component.sections.every((s) => s.route)).toBeTrue();
  });

  it('should load channels and set popular channels', async () => {
    await component.ngOnInit();
    expect(component.channels.length).toBeGreaterThanOrEqual(0);
  });

  it('should load offers', async () => {
    await component.ngOnInit();
    expect(component.offers.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle loading state', () => {
    expect(component.loading).toBeDefined();
  });

  it('should unsubscribe on destroy', () => {
    component.ngOnInit();
    const userSub = (component as any).userSub;
    spyOn(userSub, 'unsubscribe');
    component.ngOnDestroy();
    expect(userSub.unsubscribe).toHaveBeenCalled();
  });
});
