import { AfterViewInit, Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { EmojiService } from '../../services/emoji.service';

@Component({
  selector: 'app-emoji-picker-popover',
  templateUrl: './emoji-picker-popover.component.html',
  styleUrls: ['./emoji-picker-popover.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule]
})
export class EmojiPickerPopoverComponent implements OnInit, AfterViewInit {
  private popoverController: PopoverController = inject(PopoverController);
  private emojiService: EmojiService = inject(EmojiService);

  @Input() currentEmoji?: string;

  emojis: string[] = [];

  ngOnInit(): void {
    this.emojis = this.emojiService.getAvailableEmojis();
  }

  ngAfterViewInit(): void {
    if (this.currentEmoji) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const emojiGrid = document.querySelector('.emoji-grid');
          const selectedElement = emojiGrid?.querySelector('.emoji-item.selected');
          if (selectedElement && emojiGrid) {
            const gridRect = emojiGrid.getBoundingClientRect();
            const elementRect = selectedElement.getBoundingClientRect();
            const scrollOffset = elementRect.top - gridRect.top - gridRect.height / 2 + elementRect.height / 2;
            emojiGrid.scrollTo({
              top: emojiGrid.scrollTop + scrollOffset,
              behavior: 'smooth'
            });
          }
        }, 150);
      });
    }
  }

  async selectEmoji(emoji: string): Promise<void> {
    await this.popoverController.dismiss(emoji);
  }

  async removeEmoji(): Promise<void> {
    await this.popoverController.dismiss('');
  }

  async close(): Promise<void> {
    await this.popoverController.dismiss();
  }
}
