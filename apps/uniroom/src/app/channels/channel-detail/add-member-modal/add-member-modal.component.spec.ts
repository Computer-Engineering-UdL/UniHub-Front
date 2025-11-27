import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMemberModalComponent } from './add-member-modal.component';
import { UserService } from '../../../services/user.service';
import { ChannelService } from '../../../services/channel.service';
import NotificationService from '../../../services/notification.service';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { of, Subject } from 'rxjs';

describe('AddMemberModalComponent', () => {
  let component: AddMemberModalComponent;
  let fixture: ComponentFixture<AddMemberModalComponent>;

  const users = [
    { id: 'u1', isActive: true, name: 'Alice' },
    { id: 'u2', isActive: true, name: 'Bob' },
    { id: 'u3', isActive: false, name: 'Charlie' }
  ];

  const userServiceStub = {
    getUsers: jasmine.createSpy('getUsers').and.returnValue(of(users)),
    searchUsers: jasmine.createSpy('searchUsers').and.returnValue(of([users[1]]))
  };
  const channelServiceStub = { addMember: jasmine.createSpy('addMember').and.returnValue(Promise.resolve()) };
  const notificationServiceStub = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
  const modalControllerStub = { dismiss: jasmine.createSpy('dismiss') };
  const currentUserSubject = new Subject<any>();
  const authServiceStub = { currentUser$: currentUserSubject.asObservable() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddMemberModalComponent],
      providers: [
        { provide: UserService, useValue: userServiceStub },
        { provide: ChannelService, useValue: channelServiceStub },
        { provide: NotificationService, useValue: notificationServiceStub },
        { provide: ModalController, useValue: modalControllerStub },
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddMemberModalComponent as any);
    component = fixture.componentInstance;
    // trigger ngOnInit subscription
    currentUserSubject.next({ id: 'u1' });
  });

  it('loadInitialUsers filters out inactive and current user', () => {
    component.existingMembers = [];
    component.bannedMemberIds = [];
    component.loadInitialUsers();
    expect(component.users.some((u) => u.id === 'u3')).toBeFalse();
    expect(component.users.some((u) => u.id === 'u1')).toBeFalse();
  });

  it('filterUsers excludes existing and banned', () => {
    component.existingMembers = [{ id: 'u2' } as any];
    component.bannedMemberIds = ['u3'];
    const filtered = (component as any).filterUsers(users as any);
    expect(filtered.some((u: any) => u.id === 'u2')).toBeFalse();
    expect(filtered.some((u: any) => u.id === 'u3')).toBeFalse();
  });

  it('addMember calls channelService and dismiss', async () => {
    component.channelId = 'c1';
    await component.addMember(users[0] as any);
    expect(channelServiceStub.addMember).toHaveBeenCalledWith('c1', 'u1');
    expect(notificationServiceStub.success).toHaveBeenCalled();
    expect(modalControllerStub.dismiss).toHaveBeenCalledWith(true);
  });
});
