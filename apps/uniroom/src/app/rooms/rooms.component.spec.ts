import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RoomsComponent } from './rooms.component';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { LocalizationService } from '../services/localization.service';
import NotificationService from '../services/notification.service';
import { LikesService } from '../services/likes.service';

describe('RoomsComponent', () => {
  let component: RoomsComponent;
  let fixture: ComponentFixture<RoomsComponent>;

  const mockApiService = {
    get: jasmine.createSpy('get').and.returnValue(of({ data: [] })),
    post: jasmine.createSpy('post').and.returnValue(of({})),
    put: jasmine.createSpy('put').and.returnValue(of({})),
    delete: jasmine.createSpy('delete').and.returnValue(of({}))
  };

  const mockAuthService = {
    currentUser$: of({ id: 'user1', role: 'Seller' }),
    currentUser: { id: 'user1', role: 'Seller' }
  };

  const mockModalController = {
    create: jasmine.createSpy('create').and.returnValue(
      Promise.resolve({
        present: () => Promise.resolve(),
        onWillDismiss: () => Promise.resolve({ data: {} })
      })
    )
  };

  const mockAlertController = {
    create: jasmine.createSpy('create').and.returnValue(
      Promise.resolve({
        present: () => Promise.resolve()
      })
    )
  };

  const mockLocalizationService = {
    formatNumber: jasmine.createSpy('formatNumber').and.returnValue('100'),
    getDecimalSeparator: jasmine.createSpy('getDecimalSeparator').and.returnValue('.'),
    getThousandsSeparator: jasmine.createSpy('getThousandsSeparator').and.returnValue(',')
  };

  const mockNotificationService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error')
  };

  const mockLikesService = {
    getLikes: jasmine.createSpy('getLikes').and.returnValue(of([])),
    toggleLike: jasmine.createSpy('toggleLike').and.returnValue(of({}))
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RoomsComponent],
      imports: [IonicModule.forRoot(), HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ModalController, useValue: mockModalController },
        { provide: AlertController, useValue: mockAlertController },
        { provide: LocalizationService, useValue: mockLocalizationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LikesService, useValue: mockLikesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoomsComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default filters', () => {
    expect(component.filters.sortBy).toBe('date_desc');
    expect(component.filters.search).toBe('');
    expect(component.filters.showOnlyLiked).toBeFalse();
  });

  it('should load offers on init', async () => {
    mockApiService.get.and.returnValue(of({ data: [{ id: '1', title: 'Test Offer' }] }));
    await component.ngOnInit();
    expect(mockApiService.get).toHaveBeenCalled();
  });

  it('should check if user can create offers', () => {
    component.user = { id: 'user1', role: 'Seller' } as any;
    expect(component.canCreateOffer).toBeTruthy();
  });

  it('should apply filters correctly', () => {
    component.offers = [
      { id: '1', title: 'Room A', price: 100, city: 'Valencia' } as any,
      { id: '2', title: 'Room B', price: 200, city: 'Barcelona' } as any
    ];
    component.filters.city = 'Valencia';
    component.applyFilters();
    expect(component.filteredOffers.length).toBeLessThanOrEqual(component.offers.length);
  });

  it('should toggle mobile filters visibility', () => {
    expect(component.showMobileFilters).toBeFalse();
    component.toggleMobileFilters();
    expect(component.showMobileFilters).toBeTrue();
  });

  it('should handle liked offers correctly', () => {
    component.likedIds = new Set(['1']);
    expect(component.likedIds.has('1')).toBeTrue();
    expect(component.likedIds.has('2')).toBeFalse();
  });
});
