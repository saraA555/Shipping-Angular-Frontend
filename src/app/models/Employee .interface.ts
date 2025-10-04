// employee.interface.ts
export interface Employee {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    address: string;
    branchId: number;
    regionID: number;
    roleName: string;
  }

  export interface EmployeeDTO {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  branchId: number;
  branchName: string;
  roleId: string;
  roleName: string;
  isDeleted: boolean;
}
export interface EmployeeUpdateDTO {
  id: string;
  fullName: string;
  phoneNumber: string;
  branchId: number;
  roleId: string;
  isDeleted: boolean;
}
