import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { ToastrService } from 'ngx-toastr';
import { OrderStatus } from '../../../models/OrderStatus.Interface';
import { OrderWithProductsDto, OrderProduct, UpdateOrderDto } from '../../../models/order.interface';
import { tap, catchError, finalize } from 'rxjs/operators';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { Branch } from '../../../models/Branch.Interface';
import { City } from '../../../models/City.interface';
import { Region } from '../../../models/Region.Interface ';
import { ShippingType } from '../../../models/ShippingType.Interface';
import { PaymentType } from '../../enum/payment-type.enum';
import { OrderType } from '../../enum/order-types.enum';


@Component({
  selector: 'app-edit-order',
  templateUrl: './edit-order.component.html',
  styleUrls: ['./edit-order.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ]
})
export class EditOrderComponent implements OnInit {
  orderId: number;
  orderForm!: FormGroup;
  loading = false;
  branches: Branch[] = [];
  regions: Region[] = [];
  cities: City[] = [];
  shippingTypes: ShippingType[] = [];
  currentOrder: UpdateOrderDto | null = null;
  merchantName = '';

  paymentTypes = [
    { value: PaymentType.Collectible, label: 'تحصيل' },
    { value: PaymentType.Prepaid, label: 'مسبق الدفع' },
    { value: PaymentType.Change, label: 'شحن مقابل' }
  ];
  
  orderTypes = [
    { value: OrderType.Pickup, label: 'استلام من الفرع' },
    { value: OrderType.Delivery, label: 'توصيل إلى العنوان' }
  ];


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private _unitOfWork: UnitOfWorkServices,
    private toastr: ToastrService
  ) {
    this.orderId = parseInt(this.route.snapshot.paramMap.get('id') || '0', 10);
    this.initForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.loadOrder();
  }

  private initForm(): void {
    this.orderForm = this.fb.group({
      orderTypes: [0, Validators.required],
      isOutOfCityShipping: [false, Validators.required],
      shippingId: [0, Validators.required],
      paymentType: [0, Validators.required],
      branch: [0, Validators.required],
      region: [0, Validators.required],
      city: [0, Validators.required],
      totalWeight: [0, [Validators.required, Validators.min(0.1)]],
      merchantId: ['', Validators.required],
      orderCost: [0, [Validators.required, Validators.min(0.01)]],
      customerName: ['', Validators.required],
      customerPhone1: ['', Validators.required],
      customerPhone2: [''],
      customerAddress: ['', Validators.required],
      customerEmail: [''],
      products: this.fb.array([])
    });
  }

  private loadInitialData(): void {
    this.loading = true;
    
    Promise.all([
      this._unitOfWork.Branch.getAll().toPromise(),
      this._unitOfWork.Region.getAll().toPromise(),
      this._unitOfWork.City.getAll().toPromise(),
      this._unitOfWork.ShippingType.getAll().toPromise()
    ])
    .then(([branches, regions, cities, shippingTypes]) => {
      this.branches = branches || [];
      this.regions = regions || [];
      this.cities = cities || [];
      this.shippingTypes = shippingTypes || [];
    })
    .catch(error => {
      this.handleError('فشل في تحميل البيانات الأساسية', error);
    })
    .finally(() => (this.loading = false));
  }

  private loadOrder(): void {
    this.loading = true;
    this._unitOfWork.Order.getOrderForEdit(this.orderId)
    
      .pipe(
        tap((order: UpdateOrderDto) => {
          this.currentOrder = order;
          this.merchantName = order.merchantId || 'غير معروف';
          this.patchOrderForm(order);
        }),
        catchError(error => {
          this.handleError('فشل في تحميل الطلب', error);
          throw error;
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe();
  }

  private patchOrderForm(order: UpdateOrderDto): void {
  this.orderForm.patchValue({
    orderTypes: order.orderTypes,
    isOutOfCityShipping: order.isOutOfCityShipping,
    shippingId: order.shippingId,
    paymentType: order.paymentType,
    branch: order.branch,  
    region: order.region,   
    city: order.city,      
    totalWeight: order.totalWeight,
    merchantId: order.merchantId,
    orderCost: order.orderCost,
    customerName: order.customerName,
    customerPhone1: order.customerPhone1,
    customerPhone2: order.customerPhone2,
    customerAddress: order.customerAddress,
    customerEmail: order.customerEmail
  });

  this.products.clear();
    if (order.products && Array.isArray(order.products)) {
      order.products.forEach((product: OrderProduct) => {
        this.addProduct({
          name: product.name,
          weight: product.weight,
          quantity: product.quantity,


          price: product.price 
        });
      });
    }
  }

  addProduct(product?: OrderProduct): void {
    const productForm = this.fb.group({
      name: [product?.name || '', Validators.required],
      weight: [product?.weight || 0, [Validators.required, Validators.min(0.1)]],
      quantity: [product?.quantity || 1, [Validators.required, Validators.min(1)]],
      unitPrice: [product?.price || 0, [Validators.required, Validators.min(0.01)]] 
    });

    this.products.push(productForm);
    this.calculateTotals();
  }

  removeProduct(index: number): void {
    this.products.removeAt(index);
    this.calculateTotals();
  }

  private calculateTotals(): void {
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

  onSubmit(): void {
    if (this.orderForm.invalid) {
      this.toastr.error('يرجى التحقق من صحة البيانات المدخلة');
      return;
    }

    const orderData: UpdateOrderDto  = {
      ...this.orderForm.value,
      id: this.orderId,
      products: this.products.value.map((product: any) => ({
        name: product.name,
        weight: product.weight,
        quantity: product.quantity,
        price: product.unitPrice 
      }))
    };

    this._unitOfWork.Order.updateOrder(this.orderId, orderData)
      .pipe(
        tap(() => {
          this.toastr.success('تم تحديث الطلب بنجاح');
          this.router.navigate(['/orders']);
        }),
        catchError(error => {
          this.handleError('فشل في تحديث الطلب', error);
          throw error;
        })
      )
      .subscribe();
  }
  

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.toastr.error(message);
  }

  get products(): FormArray {
    return this.orderForm.get('products') as FormArray;
  }
  getLabelFromValue(options: any[], value: any): string {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : 'غير معروف';
  }


  getCityName(cityId: number): string {
    const city = this.cities.find(c => c.id === cityId);
    return city ? city.name : 'غير معروف';
  }


  getRegionName(regionId: number): string {
    const region = this.regions.find(r => r.id === regionId);
    return region ? region.governorate : 'غير معروف';
  }


  getBranchName(branchId: number): string {
    const branch = this.branches.find(b => b.id === branchId);
    return branch ? branch.name : 'غير معروف';
  }

  getShippingTypeName(shippingId: number): string {
    const shippingType = this.shippingTypes.find(s => s.id === shippingId);
    return shippingType ? shippingType.name : 'غير معروف';
  }


  calculateProductTotal(index: number): number {
    const product = this.products.at(index);
    const quantity = product.get('quantity')?.value || 0;
    const unitPrice = product.get('unitPrice')?.value || 0;
    return quantity * unitPrice;
  }
}