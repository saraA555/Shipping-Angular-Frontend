import { Component, OnInit } from '@angular/core';
import { OrderReportService } from '../../../core/services/order-report.service';
import { ToastrService } from 'ngx-toastr';
import { OrderReport } from '../../../models/OrderReport.Interface';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { OrderStatus } from '../../../models/OrderStatus.Interface';
import { ProductService } from '../../../core/services/Product.Service';
@Component({
  selector: 'app-order-report',
  templateUrl: './order-report.component.html',
  styleUrls: ['./order-report.component.css'],
  imports: [FormsModule,CommonModule],
  standalone: true,
})
export class OrderReportComponent implements OnInit {
  orderReports: OrderReport[] = []; 
  orderStatuses = [
  { value: OrderStatus.Pending, label: 'قيد الانتظار' },
  { value: OrderStatus.WaitingForConfirmation, label: 'في انتظار التأكيد' },
  { value: OrderStatus.InProgress, label: 'قيد التنفيذ' },
  { value: OrderStatus.Delivered, label: 'تم التسليم' },
  { value: OrderStatus.DeliveredToCourier, label: 'تم التسليم للمندوب' },
  { value: OrderStatus.Declined, label: 'مرفوض' },
  { value: OrderStatus.UnreachableCustomer, label: 'العميل غير متاح' },
  { value: OrderStatus.PartialDelivery, label: 'تم التسليم جزئيًا' },
  { value: OrderStatus.CanceledByRecipient, label: 'تم الإلغاء بواسطة المستلم' },
  { value: OrderStatus.DeclinedWithPartialPayment, label: 'مرفوض مع دفع جزئي' },
  { value: OrderStatus.DeclinedWithFullPayment, label: 'مرفوض مع دفع كامل' },
  ];
  filters = {
    orderStatus: '',
    startDate: '',
    endDate: '',
  };
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;
  loading: boolean | undefined;
  error: boolean | undefined;
  filteredReports: any[] = [];

  formatAmountReceived(amount: number): string {
    return amount === 0 ? 'مسبق الدفع' : amount.toString();
  }
  
  constructor(
    private orderReportService: OrderReportService,
    private toastr: ToastrService,
    private productService: ProductService,
  ) {}
  sortReportsByDate(order: 'asc' | 'desc'): void {
    this.filteredReports = [...this.filteredReports].sort((a, b) => {
      const dateA = new Date(a.reportDate).getTime();
      const dateB = new Date(b.reportDate).getTime();
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }
  ngOnInit(): void {
    this.loadReports();
  }
  loadReports(): void {
  this.loading = true;
  this.error = false;

  this.orderReportService
    .getOrderReports(this.pageNumber, this.pageSize, this.filters)
    .subscribe({
      next: (reports: OrderReport[]) => {
        this.orderReports = Array.isArray(reports) ? reports : [];
        this.filteredReports = this.orderReports;
        this.isLastPage = this.orderReports.length < this.pageSize;
        this.loading = false;
      },
      error: (error) => {
        this.error = true;
        this.loading = false;
        this.toastr.error('فشل تحميل التقارير');
      },
    });
}

isLastPage = false;
  calculateTotalPages(totalItems: number): number {
    return Math.ceil(totalItems / this.pageSize) || 1;
  }

  searchReports(): void {
    this.pageNumber = 1;
    this.loadReports();
  }

  
  filterAndSortReports(): void {
  const startDate = this.filters.startDate ? new Date(this.filters.startDate).setHours(0, 0, 0, 0) : null;
  const endDate = this.filters.endDate ? new Date(this.filters.endDate).setHours(23, 59, 59, 999) : null;
  let filtered = this.orderReports
    .filter((report) => {
      const reportDate = new Date(report.reportDate).getTime();
      if (startDate && reportDate < startDate) return false;
      if (endDate && reportDate > endDate) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.reportDate).getTime();
      const dateB = new Date(b.reportDate).getTime();
      return dateA - dateB;
    });
  this.totalItems = filtered.length;
  this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
  const start = (this.pageNumber - 1) * this.pageSize;
  const end = start + this.pageSize;
  this.filteredReports = filtered.slice(start, end);
}

prevPage(): void {
  if (this.pageNumber > 1) {
    this.pageNumber--;
    this.loadReports();
  }
}

nextPage(): void {
  if (!this.isLastPage) {
    this.pageNumber++;
    this.loadReports();
  }
}

onPageSizeChange(event: any): void {
  const newSize = parseInt(event.target.value, 10);
  if (newSize !== this.pageSize) {
    this.pageSize = newSize;
    this.pageNumber = 1;
    this.loadReports();
  }
}

  getStatusLabel(status: OrderStatus): string {
    const statusOption = this.orderStatuses.find(option => option.value === status);
    return statusOption ? statusOption.label : 'غير معروف';
  }
  
  getStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending: return 'pending';
      case OrderStatus.WaitingForConfirmation: return 'waiting';
      case OrderStatus.InProgress: return 'inprogress';
      case OrderStatus.Delivered: return 'delivered';
      case OrderStatus.Declined: return 'declined';
      case OrderStatus.DeliveredToCourier: return 'deliveredtocourier';
      case OrderStatus.UnreachableCustomer: return 'unreachable';
      case OrderStatus.PartialDelivery: return 'partial';
      case OrderStatus.CanceledByRecipient: return 'canceled';
      case OrderStatus.DeclinedWithPartialPayment: return 'declinedpartial';
      case OrderStatus.DeclinedWithFullPayment: return 'declinedfull';
      default: return 'pending';
    }
  }
 printSingleReport(reportid: number): void {
  const test = reportid-2;
  this.orderReportService.getOrderReportById(test).subscribe({
    next: (fullReport) => {
      const getValue = (val: any) => (val !== undefined && val !== null && val !== '' ? val : 'غير محدد');
      const statusLabel = this.getStatusLabel(fullReport.orderStatus ?? fullReport.orderStatus);
     const courierName = getValue(fullReport.courierName );
      const orderId = fullReport.OrderId ?? fullReport.OrderId ?? fullReport.id;

      this.productService.getProductsByOrderId(orderId).subscribe({
        next: (products) => {
          let productsTable = '';
          if (products && products.length) {
            productsTable = `
              <h4 style="margin-top:2rem;">المنتجات المرتبطة بالطلب:</h4>
              <table>
                <tr>
                  <th>اسم المنتج</th>
                  <th>الوزن</th>
                  <th>الكمية</th>
                </tr>
                ${
                  products.map((p: any) => `
                    <tr>
                      <td>${getValue(p.name)}</td>
                      <td>${getValue(p.weight)}</td>
                      <td>${getValue(p.quantity)}</td>
                    </tr>
                  `).join('')
                }
              </table>
            `;
          } else {
            productsTable = `<div class="mt-3 text-muted">لا توجد منتجات مرتبطة بهذا الطلب</div>`;
          }

          const printContent = `
            <html>
              <head>
                <title>تقرير الطلب رقم ${getValue(fullReport.id)}</title>
                <style>
                  body { direction: rtl; font-family: Arial, Tahoma; }
                  h2 { text-align: center; margin-bottom: 1rem; }
                  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                  td, th { border: 1px solid #ccc; padding: 8px; }
                </style>
              </head>
              <body>
                <h2>تقرير الطلب رقم ${getValue(fullReport.id)}</h2>
                <table>
                  <tr><th>الحالة</th><td>${statusLabel}</td></tr>
                  <tr><th>اسم المندوب</th><td>${courierName}</td></tr>
                  <tr><th>التاجر</th><td>${getValue(fullReport.merchantName ?? fullReport.merchantName)}</td></tr>
                  <tr><th>العميل</th><td>${getValue(fullReport.customerName ?? fullReport.customerName)}</td></tr>
                  <tr><th>رقم الهاتف</th><td>${getValue(fullReport.customerPhone1 ?? fullReport.customerPhone1)}</td></tr>
                  <tr><th>المحافظة</th><td>${getValue(fullReport.regionName ?? fullReport.regionName)}</td></tr>
                  <tr><th>المدينة</th><td>${getValue(fullReport.cityName ?? fullReport.cityName)}</td></tr>
                  <tr><th>تكلفة الطلب</th><td>${getValue(fullReport.orderCost ?? fullReport.orderCost)}</td></tr>
                  <tr><th>المبلغ المستلم</th><td>${getValue(fullReport.amountReceived ?? fullReport.amountReceived)}</td></tr>
                  <tr><th>تكلفة الشحن</th><td>${getValue(fullReport.shippingCost ?? fullReport.shippingCost)}</td></tr>
                  <tr><th>قيمة الشحن المدفوعة</th><td>${getValue(fullReport.shippingCostPaid ?? fullReport.shippingCostPaid)}</td></tr>
                  <tr><th>قيمة الشركة</th><td>${getValue(fullReport.companyValue ?? fullReport.companyValue)}</td></tr>
                  <tr><th>التاريخ</th><td>${fullReport.reportDate ? new Date(fullReport.reportDate).toLocaleDateString() : (fullReport.reportDate ? new Date(fullReport.reportDate).toLocaleDateString() : '-')}</td></tr>
                </table>
                ${productsTable}
                <script>
                  window.onload = function() { window.print(); }
                </script>
              </body>
            </html>
          `;
          const printWindow = window.open('', '_blank', 'width=800,height=600');
          if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();
          }
        },
        error: () => {
          this.toastr.error('فشل تحميل المنتجات المرتبطة بالطلب');
        }
      });
    },
    error: () => {
      this.toastr.error('فشل تحميل بيانات التقرير');
    }
  });
}
}
