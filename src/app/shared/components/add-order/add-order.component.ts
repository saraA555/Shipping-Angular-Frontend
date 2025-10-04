import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { City } from '../../../models/City.interface';
import { Branch } from '../../../models/Branch.Interface';
import { PageHeaderComponent } from "../page-header/page-header.component";
import { PaymentType } from '../../enum/payment-type.enum';
import { ShippingType } from '../../../models/ShippingType.Interface';
import { OrderType } from '../../enum/order-types.enum';
import { MerchantResponse } from '../../../models/Merchant .Interface';
import { Region } from '../../../models/Region.Interface ';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-add-order',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule
  ],
  templateUrl: './add-order.component.html',
  styleUrl: './add-order.component.css'
})
export class AddOrderComponent implements OnInit {
  orderForm!: FormGroup;

  merchants: MerchantResponse[] = [];
  branches: Branch[] = [];
  regions: Region[] = [];
  cities: City[] = [];
  shippingTypes: ShippingType[] = [];
  regionBranches: Branch[] = [];
  paymentTypes = [
    { value: PaymentType.Collectible, label: 'تحصيل' },
    { value: PaymentType.Prepaid, label: 'مسبق الدفع' },
    { value: PaymentType.Change, label: 'شحن مقابل' }
  ];
  orderTypes = [
    { value: OrderType.Pickup, label: 'استلام من الفرع' },
    { value: OrderType.Delivery, label: 'توصيل إلى العنوان' }
  ];
  isEmployee = false;
  isLoadingCities = false;

  constructor(
    private fb: FormBuilder,
    private _unitOfWork: UnitOfWorkServices,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    const isMerchant = this.authService.isMerchant();
    this.isEmployee = !isMerchant;
    
    this.loadRegions();
    this.loadShippingTypes();
    
    if (this.isEmployee) {
        this.loadMerchants();
      } else {
      
        this.setCurrentMerchant();
      }


    this.orderForm.get('region')?.valueChanges.subscribe(regionId => {
      this.onRegionChange(regionId);
    });

    this.orderForm.get('city')?.valueChanges.subscribe(cityId => {
      this.onCityChange(cityId);
    });
  }

  get regionControl(): FormControl {
    return this.orderForm.get('region') as FormControl;
  }
  get cityControl(): FormControl {
    return this.orderForm.get('city') as FormControl;
  }
  get branchControl(): FormControl {
    return this.orderForm.get('branch') as FormControl;
  }

  private initializeForm(): void {
    this.orderForm = this.fb.group({
      orderTypes: [OrderType.Pickup, Validators.required],
      isOutOfCityShipping: [false],
      ShippingId: ['', Validators.required],
      paymentType: [PaymentType.Collectible, Validators.required],
      branch: ['', Validators.required],
      region: ['', Validators.required],
      city: ['', Validators.required],
      totalWeight: ['', [Validators.required, Validators.min(0.1)]],
      merchantName: [''],
      merchantId: [''],
      orderCost: ['', [Validators.required, Validators.min(0.01)]],
      customerName: ['', [Validators.required, Validators.minLength(3)]],
      customerPhone1: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
      customerPhone2: ['', [Validators.pattern(/^01[0125][0-9]{8}$/)]],
      customerAddress: ['', Validators.required],
      customerEmail: ['', [Validators.email]],
      products: this.fb.array([this.createProductFormGroup()])
    });
    this.setupProductListeners();
    this.orderForm.get('city')?.disable();
    this.orderForm.get('branch')?.disable();
  }

  get products(): FormArray {
    return this.orderForm.get('products') as FormArray;
  }

  private createProductFormGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      weight: ['', [Validators.required, Validators.min(0.1)]],
      quantity: ['', [Validators.required, Validators.min(1)]],
      unitPrice: ['', [Validators.required, Validators.min(0.01)]] 
    });
  }

  addProduct(): void {
    this.products.push(this.createProductFormGroup());
    this.setupProductListeners();
    this.calculateTotals();
  }

  removeProduct(index: number): void {
    this.products.removeAt(index);
    this.calculateTotals();
  }

  public calculateTotals(): void {
    const totalWeight = this.products.controls.reduce((acc, product) => {
      return acc + (+product.get('weight')?.value * +product.get('quantity')?.value || 0);
    }, 0);
    
    const totalOrderCost = this.products.controls.reduce((acc, product) => {
      const unitPrice = +product.get('unitPrice')?.value || 0;
      const quantity = +product.get('quantity')?.value || 0;
      return acc + (unitPrice * quantity);
    }, 0);

    this.orderForm.patchValue({
      totalWeight: totalWeight.toFixed(2),
      orderCost: totalOrderCost.toFixed(2)
    });
  }

  private setupProductListeners(): void {
    this.products.controls.forEach((productGroup) => {
      productGroup.valueChanges.subscribe(() => {
        this.calculateTotals();
      });
    });
  }

  onSubmit(): void {
    if (this.orderForm.invalid) {
      this.markFormGroupTouched(this.orderForm);
      this.toastr.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح', 'خطأ');
      return;
    }

    const formValue = this.orderForm.value;
    const selectedMerchant = this.merchants.find(m => m.id === formValue.merchantId);

    const orderData = {
      orderTypes: Number(formValue.orderTypes),
      isOutOfCityShipping: Boolean(formValue.isOutOfCityShipping),
      shippingId: Number(formValue.ShippingId),
      paymentType: Number(formValue.paymentType),
      branch: Number(formValue.branch),
      region: Number(formValue.region),
      city: Number(formValue.city),
      totalWeight: Number(formValue.totalWeight),
      merchantId: formValue.merchantId,
      orderCost: Number(formValue.orderCost),
      customerName: formValue.customerName,
      customerPhone1: formValue.customerPhone1,
      customerPhone2: formValue.customerPhone2 || '',
      customerAddress: formValue.customerAddress,
      customerEmail: formValue.customerEmail || '',
      products: formValue.products.map((product: any) => ({
        name: product.name,
        weight: Number(product.weight),
        quantity: Number(product.quantity),
        price: Number(product.unitPrice) 
      }))
    };

    this._unitOfWork.AddOrder.createOrder(orderData).subscribe({
      next: () => {
        this.toastr.success('تم إضافة الطلب بنجاح', 'نجاح');
        this.router.navigate(['/orders']);
      },
      error: (err) => {
        this.showError('فشل إضافة الطلب: ' + this.getErrorMessage(err), err);
      }
    });
  }
  

  private getErrorMessage(error: any): string {
    if (error.error?.errors) {
      return Object.values(error.error.errors)
        .flat()
        .join(', ');
    }
    return error.message || 'حدث خطأ غير معروف';
  }

  private loadRegions(): void {
    this._unitOfWork.Region.getAllWithoutPagination().subscribe({
      next: (regions) => this.regions = regions,
      error: (err) => this.showError('فشل تحميل المناطق', err)
    });
  }

  private loadCities(regionId: number): void {
    this.isLoadingCities = true;
    this._unitOfWork.City.getByRegionId(regionId).subscribe({
      next: (data) => {
        this.cities = data;
        setTimeout(() => {
          this.isLoadingCities = false;
          this.orderForm.get('city')?.enable();
        });
      },
      error: () => {
        this.toastr.error('Failed to load cities');
        setTimeout(() => {
          this.isLoadingCities = false;
        });
      }
    });
  }

  private loadBranches(): void {
    this._unitOfWork.Branch.getAll().subscribe({
      next: (branches) => {
        this.branches = branches;
      },
      error: (err) => this.showError('فشل تحميل الفروع', err)
    });
  }

  private loadShippingTypes(): void {
    this._unitOfWork.ShippingType.getAll().subscribe({
      next: (shippingTypes: ShippingType[]) => this.shippingTypes = shippingTypes,
      error: (err: any) => this.showError('فشل تحميل أنواع الشحن', err)
    });
  }

 private loadMerchants(): void {
  this._unitOfWork.Merchant.getAll().subscribe({
    next: (merchants) => {
      this.merchants = merchants;
      console.log('Merchants:', merchants); 
    },
    error: (err) => this.showError('فشل تحميل التجار', err)
  });
}

  private onRegionChange(regionId: number): void {
    this.orderForm.patchValue({ city: '', branch: '' });
    this.cities = [];
    this.branches = [];
    this.regionBranches = [];

    if (regionId) {
      this._unitOfWork.City.getByRegionId(regionId).subscribe({
        next: (data) => { this.cities = data; },
        error: () => { this.toastr.error('فشل تحميل المدن'); }
      });
      this._unitOfWork.Branch.getBranchesByRegionId(regionId).subscribe({
        next: (data) => { this.regionBranches = data; },
        error: () => { this.toastr.error('فشل تحميل الفروع للمحافظة'); }
      });
      this.orderForm.get('city')?.enable();
      this.orderForm.get('branch')?.disable();
    } else {
      this.cities = [];
      this.regionBranches = [];
      this.branches = [];
      this.orderForm.get('city')?.disable();
      this.orderForm.get('branch')?.disable();
    }
  }

  onCityChange(cityId: number): void {
    this.orderForm.patchValue({ branch: '' });
    this.branches = [];
    if (cityId) {
      this._unitOfWork.Branch.getBranchesByCitySettingId(cityId).subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.branches = data;
          } else {
            this.branches = this.regionBranches || [];
          }
          this.orderForm.get('branch')?.enable();
        },
        error: () => { this.toastr.error('فشل تحميل الفروع للمدينة'); }
      });
    } else {
      this.branches = this.regionBranches || [];
      this.orderForm.get('branch')?.disable();
    }
  }

      private checkUserRole(): void {
        this._unitOfWork.Employee.getRoles().subscribe((roles) => {
          this.isEmployee = roles.some(role => role.roleName === 'employee' || role.roleName === 'Admin');
          if (!this.isEmployee) {
        this.setCurrentMerchant();
      }
        });
      }
      private setCurrentMerchant(): void {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
          const merchantId = currentUser.id;
      
        this.orderForm.patchValue({
          merchantId: merchantId
        });
    } 
    else if (currentUser) {
          this._unitOfWork.Merchant.getById(currentUser.id).subscribe({
            next: (merchant) => {
              this.orderForm.patchValue({
                merchantId: merchant.id,
                merchantName: merchant.fullName
              });
            },
            error: (err) => {
              console.error('Error loading merchant:', err);
              this.toastr.error('فشل تحميل بيانات التاجر', 'خطأ');
            }
          });
        }
      }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  private showError(message: string, error: any): void {
    console.error(error);
    this.toastr.error(message, 'خطأ');
  }

    onMerchantSelect(event: any): void {
      const selectedMerchant = this.merchants.find(m => m.id === event.target.value);
      if (selectedMerchant) {
        this.orderForm.patchValue({
          merchantId: selectedMerchant.id,
          merchantName: selectedMerchant.fullName
        });
      }
    }

  calculateProductTotal(index: number): number {
    const product = this.products.at(index);
    const quantity = product.get('quantity')?.value || 0;
    const unitPrice = product.get('unitPrice')?.value || 0;
    return quantity * unitPrice;
  }
}