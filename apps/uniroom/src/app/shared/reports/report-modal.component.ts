import { Component, inject, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ReportReason, ReportCategory } from '../../models/report.types';

interface ReportReasonOption {
  value: ReportReason;
  labelKey: string;
  icon: string;
  color: string;
}

export interface ReportContext {
  contentType: ReportCategory;
  contentId: string;
  contentTitle?: string;
  reportedUserId?: string;
  allowedReasons?: ReportReason[];
}

@Component({
  selector: 'app-report-modal',
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.scss'],
  standalone: false
})
export class ReportModalComponent implements OnInit {
  private readonly modalController: ModalController = inject(ModalController);

  @Input() context!: ReportContext;

  selectedReason: ReportReason = ReportReason.SCAM_FRAUD;
  description: string = '';
  step: 'reason' | 'description' = 'reason';

  readonly allReasons: ReportReasonOption[] = [
    {
      value: ReportReason.SCAM_FRAUD,
      labelKey: 'REPORT.REASONS.SCAM_FRAUD',
      icon: 'cash-outline',
      color: 'danger'
    },
    {
      value: ReportReason.FAKE_LISTING,
      labelKey: 'REPORT.REASONS.FAKE_LISTING',
      icon: 'close-circle-outline',
      color: 'warning'
    },
    {
      value: ReportReason.INAPPROPRIATE_CONTENT,
      labelKey: 'REPORT.REASONS.INAPPROPRIATE_CONTENT',
      icon: 'eye-off-outline',
      color: 'tertiary'
    },
    {
      value: ReportReason.HARASSMENT,
      labelKey: 'REPORT.REASONS.HARASSMENT',
      icon: 'hand-left-outline',
      color: 'danger'
    },
    {
      value: ReportReason.SPAM,
      labelKey: 'REPORT.REASONS.SPAM',
      icon: 'mail-unread-outline',
      color: 'warning'
    },
    {
      value: ReportReason.HATE_SPEECH,
      labelKey: 'REPORT.REASONS.HATE_SPEECH',
      icon: 'megaphone-outline',
      color: 'danger'
    },
    {
      value: ReportReason.VIOLENCE,
      labelKey: 'REPORT.REASONS.VIOLENCE',
      icon: 'alert-circle-outline',
      color: 'danger'
    },
    {
      value: ReportReason.OTHER,
      labelKey: 'REPORT.REASONS.OTHER',
      icon: 'help-circle-outline',
      color: 'medium'
    }
  ];

  reasons: ReportReasonOption[] = [];

  ngOnInit(): void {
    if (!this.context) {
      console.error('ReportModalComponent: context is required');
      this.reasons = this.allReasons;
    } else if (this.context.allowedReasons && this.context.allowedReasons.length > 0) {
      this.reasons = this.allReasons.filter((r) => this.context.allowedReasons!.includes(r.value));
    } else {
      this.reasons = this.allReasons;
    }

    if (this.reasons.length > 0) {
      this.selectedReason = this.reasons[0].value;
    }
  }

  selectReason(reason: ReportReason): void {
    this.selectedReason = reason;
  }

  nextStep(): void {
    this.step = 'description';
  }

  previousStep(): void {
    this.step = 'reason';
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  submit(): void {
    void this.modalController.dismiss(
      {
        reason: this.selectedReason,
        description: this.description.trim() || undefined
      },
      'submit'
    );
  }
}
