import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, StaffMember } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-staff',
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);

  readonly staffList = this.authService.staffList;
  readonly isAdmin = computed(() => this.authService.currentUser()?.role === 'admin');
  
  constructor() {
    this.authService.fetchStaff();
  }

  // Confirmation Dialog Signals
  readonly showConfirmDialog = signal<boolean>(false);
  readonly confirmDialogTitle = signal<string>('');
  readonly confirmDialogMessage = signal<string>('');
  readonly confirmDialogActions = signal<Array<{ label: string; type: 'primary' | 'danger' | 'secondary'; handler: () => void }>>([]);

  // Search & Pagination Signals
  readonly searchQuery = signal<string>('');
  readonly roleFilter = signal<'all' | 'admin' | 'staff'>('all');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);

  readonly showModal = signal<boolean>(false);
  readonly isEdit = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);
  readonly selectedStaffId = signal<string | null>(null);

  // Profile Details Modal
  readonly selectedStaff = signal<StaffMember | null>(null);
  readonly showDetailsModal = signal<boolean>(false);

  readonly staffForm = this.fb.group({
    name: ['', [Validators.required]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    role: ['staff', [Validators.required]]
  });

  readonly filteredStaff = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    const baseList = this.staffList();

    let list = baseList;
    if (role !== 'all') {
      list = baseList.filter(s => s.role === role);
    }

    if (!query) return list;

    return list.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.username.toLowerCase().includes(query)
    );
  });

  readonly totalPages = computed(() => {
    const count = this.filteredStaff().length;
    return Math.max(1, Math.ceil(count / this.pageSize()));
  });

  readonly paginatedStaff = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredStaff().slice(start, start + this.pageSize());
  });

  showError(field: 'name' | 'username' | 'password' | 'role'): boolean {
    let c;
    switch (field) {
      case 'name':
        c = this.staffForm.controls.name;
        break;
      case 'username':
        c = this.staffForm.controls.username;
        break;
      case 'password':
        c = this.staffForm.controls.password;
        break;
      case 'role':
        c = this.staffForm.controls.role;
        break;
    }
    return !!(this.submitted() && c && c.invalid);
  }

  openAddModal(): void {
    this.isEdit.set(false);
    this.selectedStaffId.set(null);
    this.submitted.set(false);
    this.staffForm.reset();
    this.staffForm.controls.username.enable();
    this.showModal.set(true);
  }

  openEditModal(staff: StaffMember): void {
    this.isEdit.set(true);
    this.selectedStaffId.set(staff.id);
    this.submitted.set(false);
    this.staffForm.setValue({
      name: staff.name,
      username: staff.username,
      password: staff.password ?? '',
      role: staff.role
    });
    this.staffForm.controls.username.disable();
    this.showModal.set(true);
  }

  openViewModal(staff: StaffMember): void {
    this.selectedStaff.set(staff);
    this.showDetailsModal.set(true);
  }

  deleteStaff(id: string): void {
    const member = this.staffList().find(s => s.id === id);
    const name = member ? member.name : '';

    this.confirmDialogTitle.set('Xác nhận xóa');
    this.confirmDialogMessage.set(`Bạn có chắc chắn muốn xóa tài khoản nhân viên "${name}"? Hành động này không thể hoàn tác.`);
    this.confirmDialogActions.set([
      {
        label: 'Xác nhận xóa',
        type: 'danger',
        handler: () => {
          this.showConfirmDialog.set(false);
          this.authService.deleteStaff(id);
          this.currentPage.set(1);
        }
      }
    ]);
    this.showConfirmDialog.set(true);
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (this.staffForm.invalid) return;

    const data = this.staffForm.getRawValue();
    if (this.isEdit()) {
      this.authService.updateStaff({
        id: this.selectedStaffId()!,
        name: data.name,
        password: data.password,
        role: data.role as 'staff' | 'admin'
      });
    } else {
      this.authService.addStaff({
        name: data.name,
        username: data.username,
        password: data.password,
        role: data.role as 'staff' | 'admin'
      });
    }
    
    this.showModal.set(false);
    this.currentPage.set(1);
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onRoleFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as any;
    this.roleFilter.set(val);
    this.currentPage.set(1);
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(val);
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }
}
