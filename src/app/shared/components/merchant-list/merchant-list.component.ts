import { City } from './../../../models/City.interface';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { MerchantResponse } from '../../../models/Merchant .Interface';
import { MerchantService } from '../../../core/services/Merchant.service';
import { FormBuilder, FormGroup, Validators, FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Inject } from '@angular/core';
import { CityService } from '../../../core/services/city.service';
import { RegionService } from '../../../core/services/region.service';
import { BranchService } from '../../../core/services/branch.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';


@Component({
  selector: 'app-merchant-list',
  templateUrl: './merchant-list.component.html',
  styleUrls: ['./merchant-list.component.css'], 
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, NgSelectModule],
})
export class MerchantListComponent implements OnInit {
  merchants: MerchantResponse[] = [];
  loading = false;
  selectedMerchant: MerchantResponse | null = null;
  editForm!: FormGroup;
  showEditModal = false;
  showSpecialCitiesModal = false;
  specialCitiesForm!: FormGroup;
  newCityName = '';
  newCityPrice: number | null = null;
  cities:  any[] = [];
  regions: any[] = [];
  filteredCitiesEdit: any[] = [];
  filteredBranchesEdit: any[] = [];
  allCities: any[] = [];
  allBranches: any[] = [];

  
  role: string = "";
  userPermissions: string[] = [];

  isCityDisabled = true;
  isBranchDisabled = true;

  showDeleteConfirmation = false;
  merchantToDelete: MerchantResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private merchantService: MerchantService,
    private _unitOfWork: UnitOfWorkServices,
    @Inject(CityService) private cityService: CityService,
    @Inject(RegionService) private regionService: RegionService,
    @Inject(BranchService) private branchService: BranchService,
    private auth: AuthService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef

  ) {
    this.newCityForm = this.fb.group({
      citySettingId: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadMerchants();
    this.loadAllRegions();
    this.loadAllCities();
    this.loadAllBranches();
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

  loadAllRegions(): void {
  this.regionService.getAllWithoutPagination().subscribe({
    next: (data) => {
      this.regions = data.map((r: any) => ({
        id: r.id,
        governorate: r.governorate
      }));
    }
  });
}

  loadAllCities(): void {
    this._unitOfWork.City.getAll().subscribe({
      next: (data) => {
        this.allCities = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          regionId: c.regionId
        }));
      }
    });
  }


  loadAllBranches(): void {
    this._unitOfWork.Branch.getAll().subscribe({
      next: (data) => {
        this.allBranches = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          cityId: b.cityId
        }));
      }
    });
  }

  loadMerchants(): void {
    this.loading = true;
    this.merchantService.getAll().subscribe({
      next: (data) => {
        this.merchants = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }


  openEditModal(merchant: MerchantResponse): void {
    this.selectedMerchant = merchant;
    this.editForm = this.fb.group({
      fullName: [merchant.fullName, Validators.required],
      phoneNumber: [merchant.phoneNumber, Validators.required],
      address: [merchant.address, Validators.required],
      email: [{ value: merchant.email, disabled: true }, [Validators.required, Validators.email]],
      storeName: [merchant.storeName, Validators.required],
      regionId: [merchant.regionId || null, Validators.required],
      cityId: [merchant.cityId || null, Validators.required],
      branchId: [merchant.branchId || null, Validators.required]
    });

    this.cityService.getByRegionId(merchant.regionId).subscribe(cities => {
      this.filteredCitiesEdit = cities;
      this.branchService.getBranchesByCitySettingId(merchant.cityId).subscribe(branches => {
      const branchExists = branches.some(b => b.id === merchant.branchId);
      if (!branchExists && merchant.branchId && merchant.branchNmae) {
        branches.unshift({
          id: merchant.branchId,
          name: merchant.branchNmae,
          citySettingId: merchant.cityId,
          location: '',
          isDeleted: false,
          branchDate: '',
          regionName: '',
          regionId: 0
        });
      }
      this.filteredBranchesEdit = branches;
      this.isCityDisabled = true;
      this.isBranchDisabled = true;
      this.showEditModal = true;
    });
  });
}

  onRegionChangeEdit(): void {
    const regionId = this.editForm.value.regionId;
    this.editForm.patchValue({ cityId: null, branchId: null });
    this.filteredBranchesEdit = [];
    this.isCityDisabled = false;
    this.isBranchDisabled = true;
    this.cityService.getByRegionId(regionId).subscribe(cities => {
      this.filteredCitiesEdit = cities;
    });
  }

  onCityChangeEdit(): void {
    const cityId = this.editForm.value.cityId;
    this.editForm.patchValue({ branchId: null });
    this.isBranchDisabled = false;
    this.branchService.getBranchesByCitySettingId(cityId).subscribe(branches => {
      this.filteredBranchesEdit = branches;
    });
  }



  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedMerchant = null;
  }

  saveMerchant(): void {
    if (this.editForm.invalid || !this.selectedMerchant) return;
    this.loading = true;
    const updateBody = {
      id: this.selectedMerchant.id,
      fullName: this.editForm.value.fullName,
      phoneNumber: this.editForm.value.phoneNumber,
      address: this.editForm.value.address,
      branchId: this.editForm.value.branchId,
      regionId: this.editForm.value.regionId,
      cityId: this.editForm.value.cityId,
      storeName: this.editForm.value.storeName,
      specialCities: this.selectedMerchant.specialCities?.map(city => ({
        citySettingId: city.citySettingId,
        price: city.price,
        cityName: city.cityName ?? '' 
      })) ?? []
    };
    this.merchantService.update(this.selectedMerchant.id, updateBody).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadMerchants();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDeleteConfirmation(merchant: MerchantResponse): void {
    this.merchantToDelete = merchant;
    this.showDeleteConfirmation = true;
  }

  closeDeleteConfirmation(): void {
    this.showDeleteConfirmation = false;
    this.merchantToDelete = null;
  }

  deleteConfirmed(): void {
    if (!this.merchantToDelete) return;
    
    this.loading = true;
    this.merchantService.delete(this.merchantToDelete.id).subscribe({
      next: () => {
        this.loadMerchants();
        this.closeDeleteConfirmation();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }



    deleteMerchant(merchant: MerchantResponse): void {
      if (!confirm('هل أنت متأكد من حذف هذا التاجر؟')) return;
      this.loading = true;
      this.merchantService.delete(merchant.id).subscribe({
        next: () => {
          this.loadMerchants();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }

  openSpecialCitiesModal(merchant: MerchantResponse): void {
    if (this.cities.length === 0) {
      this.loadAllCities();
    }

    this.merchantService.getById(merchant.id).subscribe(fullMerchant => {
      this.selectedMerchant = fullMerchant;

      const specialCitiesArray = this.fb.array(
        (fullMerchant.specialCities ?? []).map(city =>
          this.fb.group({
            citySettingId: [city.citySettingId, Validators.required],
            cityName: [city.cityName],
            price: [city.price, Validators.required]
          })
        )
      );
      this.specialCitiesForm = this.fb.group({
        specialCities: specialCitiesArray
      });
      setTimeout(() => {
        this.cdr.detectChanges();
        this.showSpecialCitiesModal = true;
      });
    });
  }
      getCityNameById(id: number): string {
      const city = this.allCities.find(c => c.id == id);
      return city ? city.name : '';
     }
    get specialCitiesArray(): FormArray {
      return this.specialCitiesForm?.get('specialCities') as FormArray;
    }

  saveAllSpecialCities(): void {
    if (!this.selectedMerchant) return;
    const updateBody = {
      id: this.selectedMerchant.id,
      fullName: this.selectedMerchant.fullName,
      phoneNumber: this.selectedMerchant.phoneNumber,
      address: this.selectedMerchant.address,
      branchId: this.selectedMerchant.branchId,
      regionId: this.selectedMerchant.regionId,
      cityId: this.selectedMerchant.cityId,
      storeName: this.selectedMerchant.storeName,
      specialCities: this.specialCitiesArray.value.map((city: any) => ({
        citySettingId: city.citySettingId,
        price: city.price,
        cityName: city.cityName ?? ''
      }))
    };
    this.merchantService.update(this.selectedMerchant.id, updateBody).subscribe(() => {
      this.loadMerchants();
      this.closeSpecialCitiesModal();
    });
  }


  deleteSpecialCity(index: number): void {
    this.specialCitiesArray.removeAt(index);
  }
  closeSpecialCitiesModal(): void {
    this.showSpecialCitiesModal = false;
    this.selectedMerchant = null;
  }

    addSpecialCity(): void {
      if (this.newCityForm.invalid || !this.selectedMerchant) return;
      const selectedCity = this.allCities.find(c => c.id == this.newCityForm.value.citySettingId);

      this.specialCitiesArray.push(this.fb.group({
        citySettingId: [this.newCityForm.value.citySettingId],
        cityName: [selectedCity?.name || ''],
        price: [this.newCityForm.value.price, Validators.required]
      }));
      this.newCityForm.reset();
    }

    get specialCities(): FormArray {
      return this.editForm.get('specialCities') as FormArray;
    }

    newCityForm!: FormGroup; 

        get selectedRegionName(): string {
      if (!this.selectedMerchant) return '';
      const region = this.regions.find(r => r.id === this.selectedMerchant?.regionId);
      return region ? region.governorate : '';
    }

    get selectedCityName(): string {
      if (!this.selectedMerchant) return '';
      const city = this.allCities.find(c => c.id === this.selectedMerchant?.cityId);
      return city ? city.name : '';
    }

    get selectedBranchName(): string {
      if (!this.selectedMerchant) return '';
      const branch = this.allBranches.find(b => b.id === this.selectedMerchant?.branchId);
      return branch ? branch.name : '';
    }
 }
