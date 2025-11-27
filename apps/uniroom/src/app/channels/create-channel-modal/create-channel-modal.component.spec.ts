import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateChannelModalComponent } from './create-channel-modal.component';
import { ChannelService } from '../../services/channel.service';
import NotificationService from '../../services/notification.service';
import { ModalController, PopoverController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormBuilder } from '@angular/forms';

describe('CreateChannelModalComponent', () => {
  let component: CreateChannelModalComponent;
  let fixture: ComponentFixture<CreateChannelModalComponent>;

  const channelServiceStub = {
    fetchChannels: jasmine.createSpy('fetchChannels').and.returnValue(Promise.resolve([])),
    createChannel: jasmine.createSpy('createChannel').and.returnValue(Promise.resolve()),
    updateChannel: jasmine.createSpy('updateChannel').and.returnValue(Promise.resolve())
  };

  const modalControllerStub = { dismiss: jasmine.createSpy('dismiss') };
  const popoverControllerStub = { create: jasmine.createSpy('create').and.returnValue(Promise.resolve({ present: () => Promise.resolve(), onWillDismiss: () => Promise.resolve({ data: '🔥' }) })) };
  const notificationServiceStub = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
  const translateServiceStub = { instant: (k: string) => k };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateChannelModalComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ChannelService, useValue: channelServiceStub },
        { provide: NotificationService, useValue: notificationServiceStub },
        { provide: ModalController, useValue: modalControllerStub },
        { provide: PopoverController, useValue: popoverControllerStub },
        { provide: TranslateService, useValue: translateServiceStub },
        FormBuilder
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateChannelModalComponent as any);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should initialize form in create mode', () => {
    expect(component.isEditMode).toBeFalse();
    expect(component.channelForm).toBeDefined();
  });

  it('openEmojiPicker sets selectedEmoji', async () => {
    await component.openEmojiPicker(new Event('click'));
    expect(component.selectedEmoji).toBe('🔥');
  });

  it('onSubmit creates channel when not edit mode', async () => {
    component.channelForm.setValue({ name: 'New', description: 'A description', category: 'General' });
    await component.onSubmit();
    expect(channelServiceStub.createChannel).toHaveBeenCalled();
    expect(modalControllerStub.dismiss).toHaveBeenCalledWith({ created: true });
  });

  it('onSubmit updates channel in edit mode', async () => {
    component.channel = { id: '1', name: 'Old', description: 'desc', category: 'General' } as any;
    component.ngOnInit();
    component.channelForm.setValue({ name: 'Updated', description: 'A description', category: 'General' });
    await component.onSubmit();
    expect(channelServiceStub.updateChannel).toHaveBeenCalled();
    expect(modalControllerStub.dismiss).toHaveBeenCalledWith({ updated: true });
  });
});
