import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmojiPickerPopoverComponent } from './emoji-picker-popover.component';
import { EmojiService } from '../../services/emoji.service';
import { PopoverController } from '@ionic/angular';

describe('EmojiPickerPopoverComponent', () => {
  let component: EmojiPickerPopoverComponent;
  let fixture: ComponentFixture<EmojiPickerPopoverComponent>;

  const emojiServiceStub = { getAvailableEmojis: jasmine.createSpy('getAvailableEmojis').and.returnValue(['💬', '🔥']) };
  const popoverControllerStub = { dismiss: jasmine.createSpy('dismiss') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmojiPickerPopoverComponent],
      providers: [
        { provide: EmojiService, useValue: emojiServiceStub },
        { provide: PopoverController, useValue: popoverControllerStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmojiPickerPopoverComponent as any);
    component = fixture.componentInstance;
  });

  it('should load emojis on init', () => {
    component.ngOnInit();
    expect(component.emojis.length).toBe(2);
  });

  it('selectEmoji dismisses with emoji', async () => {
    await component.selectEmoji('🔥');
    expect(popoverControllerStub.dismiss).toHaveBeenCalledWith('🔥');
  });

  it('removeEmoji dismisses empty string', async () => {
    await component.removeEmoji();
    expect(popoverControllerStub.dismiss).toHaveBeenCalledWith('');
  });
});

