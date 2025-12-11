import { Directive, ElementRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { AvatarCacheService } from '../../services/avatar-cache.service';

@Directive({
  selector: 'img[appCachedAvatar]',
  standalone: false
})
export class CachedAvatarDirective implements OnChanges {
  @Input() appCachedAvatar: string | undefined | null = '';
  @Input() fallback = 'assets/img/default-profile.png';

  private readonly avatarCache = inject(AvatarCacheService);
  private readonly el = inject(ElementRef);

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['appCachedAvatar']) {
      await this.loadAvatar();
    }
  }

  private async loadAvatar(): Promise<void> {
    const img = this.el.nativeElement as HTMLImageElement;
    const avatarUrl = this.appCachedAvatar;

    if (!avatarUrl) {
      img.src = this.fallback;
      return;
    }

    img.src = this.fallback;

    const cachedUrl = await this.avatarCache.getAvatar(avatarUrl);
    if (cachedUrl) {
      img.src = cachedUrl;
    } else {
      img.src = this.fallback;
    }
  }
}
