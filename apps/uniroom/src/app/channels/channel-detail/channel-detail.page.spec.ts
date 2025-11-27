import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChannelDetailPage } from './channel-detail.page';
import { ChannelService } from '../../services/channel.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import { LocalizationService } from '../../services/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ChannelDetailPage (unit methods)', () => {
  let component: ChannelDetailPage;
  let fixture: ComponentFixture<ChannelDetailPage>;

  const channelServiceStub = {};
  const authServiceStub = { currentUser$: of({ id: 'u1', role: 'Basic' }) };
  const apiServiceStub = { get: jasmine.createSpy('get').and.returnValue(of({} as any)) };
  const notificationServiceStub = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
  const localizationServiceStub = { formatDateTime: (d: Date, o: any) => '12:00', formatDate: (d: Date, o: any) => 'Monday' };
  const translateServiceStub = { instant: (k: string) => k };
  const routerStub = { navigate: jasmine.createSpy('navigate') };
  const routeStub = { snapshot: { paramMap: new Map([['id', 'c1']]) } } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChannelDetailPage],
      providers: [
        { provide: ChannelService, useValue: channelServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ApiService, useValue: apiServiceStub },
        { provide: NotificationService, useValue: notificationServiceStub },
        { provide: LocalizationService, useValue: localizationServiceStub },
        { provide: TranslateService, useValue: translateServiceStub },
        { provide: Router, useValue: routerStub },
        { provide: ActivatedRoute, useValue: routeStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelDetailPage as any);
    component = fixture.componentInstance;
  });

  it('groupMessagesByDate groups messages by day and sorts', () => {
    component.messages = [
      { id: 'm1', created_at: new Date('2025-11-26T10:00:00Z').toISOString(), content: 'a' } as any,
      { id: 'm2', created_at: new Date('2025-11-26T12:00:00Z').toISOString(), content: 'b' } as any,
      { id: 'm3', created_at: new Date('2025-11-25T09:00:00Z').toISOString(), content: 'c' } as any
    ];
    (component as any).groupMessagesByDate();
    expect(component.messageGroups.length).toBe(2);
    // ensure the most recent group's messages are sorted by time
    expect(component.messageGroups[0].messages.map(m => m.id)).toEqual(['m1','m2']);
  });

  it('formatDateSeparator returns proper keys for today/yesterday', () => {
    const today = new Date().toISOString();
    expect(component.formatDateSeparator(today)).toBe('TIME.TODAY');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(component.formatDateSeparator(yesterday.toISOString())).toBe('TIME.YESTERDAY');
  });

  it('isMyMessage and canDeleteMessage behavior', () => {
    component.currentUser = { id: 'u1', role: 'Basic' } as any;
    const message = { user_id: 'u1', sender_id: 'u2' } as any;
    expect(component.isMyMessage(message)).toBeTrue();
    expect(component.canDeleteMessage(message)).toBeTrue();

    const other = { user_id: 'u3', sender_id: 'u4' } as any;
    component.currentUser = { id: 'x', role: 'Admin' } as any;
    expect(component.canDeleteMessage(other)).toBeTrue();
  });

  it('getUserName prefers current user when applicable', () => {
    component.currentUser = { id: 'u1', fullName: 'Me' } as any;
    const message = { user_id: 'u1', sender: null, sender_id: null } as any;
    expect(component.getUserName(message)).toBe('Me');
  });
});
