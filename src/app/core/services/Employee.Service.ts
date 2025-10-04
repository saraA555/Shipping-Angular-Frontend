import { Injectable } from "@angular/core";
import { environment } from "../../environment";
import { HttpClient } from "@angular/common/http";
import { Employee, EmployeeDTO, EmployeeUpdateDTO } from "../../models/Employee .interface";
import { Observable } from "rxjs";
import { Role } from "../../models/Role.interface";



@Injectable({
    providedIn: 'root'
  })
    export class EmployeeService {
        private apiUrl = `${environment.apiUrl}/api`;
        constructor(private http: HttpClient) { }

        createEmployee(employee: Employee): Observable<Employee> {
          return this.http.post<Employee>(`${this.apiUrl}/Auth/addEmployee`, employee);
        }
        getRoles(): Observable<Role[]> {
            return this.http.get<Role[]>(`${this.apiUrl}/Groups`);
        }
        getAllEmployees(): Observable<EmployeeDTO[]> {
          return this.http.get<EmployeeDTO[]>(`${this.apiUrl}/Employee/GetAllEmployees`);
        }

        getEmployeeById(id: string): Observable<EmployeeDTO> {
          return this.http.get<EmployeeDTO>(`${this.apiUrl}/Employee/GetEmployeeById/${id}`);
        }

        updateEmployee(employee: EmployeeUpdateDTO): Observable<any> {
          return this.http.put(`${this.apiUrl}/Employee/UpdateEmployee`, employee);
        }

        deleteEmployee(id: string): Observable<any> {
          return this.http.delete(`${this.apiUrl}/Employee/DeleteEmployee/${id}`);
        }
}

