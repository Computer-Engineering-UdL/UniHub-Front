import { Component, inject, OnInit } from '@angular/core';
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
export class EmojiPickerPopoverComponent implements OnInit {
  private popoverController: PopoverController = inject(PopoverController);
  private emojiService: EmojiService = inject(EmojiService);

  emojis: string[] = [];

  ngOnInit(): void {
    this.emojis = this.emojiService.getAvailableEmojis();
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
