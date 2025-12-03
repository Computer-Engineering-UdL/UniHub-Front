import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { UniItem } from '../../models/uni-item.types';
import { UniItemsService } from '../../services/uni-items.service';

@Component({
  selector: 'app-item-edit',
  templateUrl: './item-edit.page.html',
  styleUrls: ['./item-edit.page.scss'],
  standalone: false
})
export class ItemEditPage implements OnInit {
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly uniItemsService: UniItemsService = inject(UniItemsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly authService: AuthService = inject(AuthService);

  form!: FormGroup;
  loading: boolean = false;
  isEditMode: boolean = false;
  itemId: string | null = null;

  readonly categories: string[] = ['Furniture', 'Books', 'Electronics', 'Clothing', 'Other'];
  readonly conditions: { value: UniItem['condition']; labelKey: string }[] = [
    { value: 'new', labelKey: 'UNI_ITEMS.CONDITION_LABELS.new' },
    { value: 'like_new', labelKey: 'UNI_ITEMS.CONDITION_LABELS.like_new' },
    { value: 'good', labelKey: 'UNI_ITEMS.CONDITION_LABELS.good' },
    { value: 'used', labelKey: 'UNI_ITEMS.CONDITION_LABELS.used' },
    { value: 'for_parts', labelKey: 'UNI_ITEMS.CONDITION_LABELS.for_parts' }
  ];

  get images(): FormArray {
    return this.form.get('images') as FormArray;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      condition: ['good', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      currency: ['EUR', Validators.required],
      location: ['', Validators.required],
      images: this.fb.array([this.fb.control('')]),
      isActive: [true]
    });

    this.itemId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.itemId;

    if (this.isEditMode && this.itemId) {
      void this.loadItem(this.itemId);
    }
  }

  async loadItem(id: string): Promise<void> {
    this.loading = true;
    try {
      const item = await firstValueFrom(this.uniItemsService.getItemById(id));
      if (item.ownerId && this.authService.currentUser?.id !== item.ownerId) {
        await this.router.navigate(['/items']);
        return;
      }

      this.form.patchValue({
        title: item.title,
        description: item.description,
        category: item.category,
        condition: item.condition,
        price: item.price,
        currency: item.currency,
        location: item.location,
        isActive: item.isActive
      });

      this.images.clear();
      if (item.images?.length) {
        item.images.forEach((img: string) => this.images.push(this.fb.control(img)));
      } else {
        this.images.push(this.fb.control(''));
      }
    } catch (error) {
      console.error('Error loading item', error);
      this.notificationService.error('UNI_ITEMS.FORM.ERROR_LOAD');
    } finally {
      this.loading = false;
    }
  }

  addImageField(): void {
    this.images.push(this.fb.control(''));
  }

  removeImageField(index: number): void {
    if (this.images.length > 1) {
      this.images.removeAt(index);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload: Partial<UniItem> = {
      ...this.form.value,
      images: (this.form.value.images || []).filter((img: string) => !!img)
    } as Partial<UniItem>;

    try {
      if (this.isEditMode && this.itemId) {
        const updated = await firstValueFrom(this.uniItemsService.updateItem(this.itemId, payload));
        this.notificationService.success('UNI_ITEMS.FORM.SUCCESS_EDIT');
        await this.router.navigate(['/items', updated.id]);
      } else {
        const created = await firstValueFrom(this.uniItemsService.createItem(payload));
        this.notificationService.success('UNI_ITEMS.FORM.SUCCESS_CREATE');
        await this.router.navigate(['/items', created.id]);
      }
    } catch (error) {
      console.error('Error saving item', error);
      this.notificationService.error('UNI_ITEMS.FORM.ERROR_SAVE');
    } finally {
      this.loading = false;
    }
  }

  cancel(): void {
    void this.router.navigate(['/items']);
  }
}
