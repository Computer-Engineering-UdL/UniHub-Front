import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NotificationType } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.scss'],
  standalone: false,
  animations: [
    trigger('slideIn', [
      state(
        'void',
        style({
          transform: 'translateY(-100%)',
          opacity: 0
        })
      ),
      state(
        '*',
        style({
          transform: 'translateY(0)',
          opacity: 1
        })
      ),
      transition('void => *', animate('300ms ease-out')),
      transition('* => void', animate('200ms ease-in'))
    ])
  ]
})
export class NotificationToastComponent implements OnInit {
  @Input() message: string = '';
  @Input() type: NotificationType = 'info';
  @Input() duration: number = 3000;
  @Output() dismiss = new EventEmitter<void>();

  ngOnInit(): void {
    if (this.duration > 0) {
      setTimeout((): void => {
        this.onDismiss();
      }, this.duration);
    }
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  getIcon(): string {
    switch (this.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  }
}
