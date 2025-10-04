import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeightSetting } from '../../../models/WeightSetting.interface';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-weight-setting',
  templateUrl: './weight-setting.component.html',
  styleUrls: ['./weight-setting.component.css'],
  imports: [FormsModule, CommonModule],
  standalone: true,
})
export class WeightSettingComponent implements OnInit {
  weightSetting: WeightSetting | null = null;
  selectedWeightSetting: Partial<WeightSetting> = this.emptyWeightSetting();
  showModal = false;
  role: string = "";
  userPermissions: string[] = [];

  constructor(
    private toastr: ToastrService,
    private unitOfWork: UnitOfWorkServices ,
    private auth: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions
    this.loadWeightSetting();
  }

  // Load the single weight setting
  loadWeightSetting(): void {
    this.unitOfWork.WeightSetting.getAll().subscribe({
      next: (response: any) => {

        this.weightSetting = response[0] || null;
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      },
    });
  }

  loadUserPermissions(): void {
    this.userPermissions = this.auth.getPermissions();
    if (this.userPermissions.length === 0) {
      this.roleService.getCurrentUserPermissions().subscribe({
        next: (permissions) => {
          this.userPermissions = permissions;
          this.auth.setPermissions(permissions);
        },
        error: (err) => console.error('Failed to load permissions', err)
      });
    }
  }

    hasPermission(permission: string): boolean {
      return this.userPermissions.includes(permission);
    }

  // Open modal for editing the weight setting
  openEditModal(): void {
    if (this.weightSetting) {
      this.selectedWeightSetting = { ...this.weightSetting };
      this.showModal = true;
    }
  }

  // Close the modal
  closeModal(): void {
    this.showModal = false;
  }

  // Save (update) the weight setting
  saveWeightSetting(): void {
    if (!this.selectedWeightSetting.id) return;
    this.unitOfWork.WeightSetting.update(
      this.selectedWeightSetting.id,
      { ...this.selectedWeightSetting } as WeightSetting
    ).subscribe({
      next: () => {
        this.toastr.success('تم تحديث إعداد الوزن بنجاح');
        this.loadWeightSetting();
        this.closeModal();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      },
    });
  }

  private getErrorMessage(error: any): string {
    return error.message || 'حدث خطأ غير معروف';
  }

  private emptyWeightSetting(): Partial<WeightSetting> {
    return {
      id: 0,
      minWeight: 0,
      maxWeight: 0,
      costPerKg: 0,
      createdAt: new Date().toISOString(),
    };
  }
}