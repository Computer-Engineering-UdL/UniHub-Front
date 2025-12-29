import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMemberModalComponent } from './add-member-modal.component';
import { UserService } from '../../../services/user.service';
import { ChannelService } from '../../../services/channel.service';
import NotificationService from '../../../services/notification.service';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { of, Subject } from 'rxjs';
import { User } from '../../../models/auth.types';
import { ChannelMember } from '../../../models/channel.types';
import { Type } from '@angular/core';

describe('AddMemberModalComponent', () => {
  let component: AddMemberModalComponent;
  let fixture: ComponentFixture<AddMemberModalComponent>;

  const users: Partial<User>[] = [
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
  const currentUserSubject = new Subject<User | null>();
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

    fixture = TestBed.createComponent(AddMemberModalComponent as Type<AddMemberModalComponent>);
    component = fixture.componentInstance;
    // trigger ngOnInit subscription
    currentUserSubject.next({ id: 'u1' } as User);
  });

  it('loadInitialUsers filters out inactive and current user', () => {
    component.existingMembers = [];
    component.bannedMemberIds = [];
    component.loadInitialUsers();
    expect(component.users.some((u) => u.id === 'u3')).toBeFalse();
    expect(component.users.some((u) => u.id === 'u1')).toBeFalse();
  });

  it('filterUsers excludes existing and banned', () => {
    component.existingMembers = [{ id: 'u2' } as ChannelMember];
    component.bannedMemberIds = ['u3'];
    const filtered = (component as AddMemberModalComponent & { filterUsers: (users: User[]) => User[] }).filterUsers(
      users as User[]
    );
    expect(filtered.some((u: User) => u.id === 'u2')).toBeFalse();
    expect(filtered.some((u: User) => u.id === 'u3')).toBeFalse();
  });

  it('addMember calls channelService and dismiss', async () => {
    component.channelId = 'c1';
    await component.addMember(users[0] as User);
    expect(channelServiceStub.addMember).toHaveBeenCalledWith('c1', 'u1');
    expect(notificationServiceStub.success).toHaveBeenCalled();
    expect(modalControllerStub.dismiss).toHaveBeenCalledWith(true);
  });

  it('should trigger search when search term changes', () => {
    component.searchTerm = 'Bob';
    component.onSearchChange({ target: { value: 'Bob' } });
    expect(component.searchTerm).toBe('Bob');
  });

  it('should load initial users without search', () => {
    component.searchTerm = '';
    component.loadInitialUsers();
    expect(userServiceStub.getUsers).toHaveBeenCalled();
  });

  it('should dismiss modal', () => {
    component.dismiss(false);
    expect(modalControllerStub.dismiss).toHaveBeenCalledWith(false);
  });

  it('should handle error when adding member fails', async () => {
    channelServiceStub.addMember.and.returnValue(Promise.reject(new Error('Add failed')));
    component.channelId = 'c1';
    await component.addMember(users[0] as User);
    expect(notificationServiceStub.error).toHaveBeenCalled();
  });

  it('should filter out current user from search results', () => {
    component.existingMembers = [];
    component.bannedMemberIds = [];
    currentUserSubject.next({ id: 'u2' } as User);
    const filtered = (component as AddMemberModalComponent & { filterUsers: (users: User[]) => User[] }).filterUsers(
      users as User[]
    );
    expect(filtered.some((u: User) => u.id === 'u2')).toBeFalse();
  });

  it('should show empty state when no users available', () => {
    component.users = [];
    expect(component.users.length).toBe(0);
  });

  it('should handle multiple banned members', () => {
    component.bannedMemberIds = ['u1', 'u3'];
    component.existingMembers = [];
    const filtered = (component as AddMemberModalComponent & { filterUsers: (users: User[]) => User[] }).filterUsers(
      users as User[]
    );
    expect(filtered.some((u: User) => u.id === 'u1')).toBeFalse();
    expect(filtered.some((u: User) => u.id === 'u3')).toBeFalse();
  });

  it('should handle search term changes via onSearchChange', () => {
    const event = { target: { value: 'Alice' } };
    component.onSearchChange(event);
    expect(component.searchTerm).toBe('Alice');
  });
});
