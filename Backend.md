## 3. Đặc tả Danh sách các Endpoint API Backend (Dành cho Lập trình viên Backend)

Dưới đây là tài liệu đặc tả 14 API Endpoints cần thiết mà lập trình viên Backend cần xây dựng để khớp với mã nguồn Frontend:

### 3.1 Xác thực & Nhân viên (Authentication & Staff)
1.  **POST `/api/auth/login`**: Đăng nhập hệ thống lấy token xác thực JWT.
    *   *Payload*: `{ username: "...", password: "..." }`
    *   *Response*: `{ token: "jwt_token_string", user: { id: 1, name: "...", username: "...", role: "admin" } }`
2.  **GET `/api/staff`**: Lấy danh sách toàn bộ nhân viên (yêu cầu Authorization Header Bearer Token).
3.  **POST `/api/staff`**: Thêm mới tài khoản nhân viên.
4.  **PUT `/api/staff/:id`**: Cập nhật thông tin nhân viên theo ID.
5.  **DELETE `/api/staff/:id`**: Xóa tài khoản nhân viên.

### 3.2 Quản lý Đặt sân (Bookings)
6.  **GET `/api/bookings`**: Tải danh sách tất cả các lịch đặt sân hiện có.
7.  **POST `/api/bookings`**: Lưu thông tin một giao dịch đặt sân mới.
8.  **POST `/api/bookings/:id/checkin`**: Cập nhật trạng thái lịch đặt sân thành `Playing` (Đang chơi).
9.  **POST `/api/bookings/:id/checkout`**: Lưu thông tin thanh toán cuối cùng và hoàn tất phiên chơi.
    *   *Payload*: `{ additionalServices: [...], overtimeMinutes: 15, overtimeAmount: 45000, checkoutAmount: 225000, checkoutPaymentMethod: "cash", checkoutTime: "08:15", status: "completed" }`

### 3.3 Quản lý Khách hàng (Customers)
10. **GET `/api/customers`**: Tải danh sách toàn bộ khách hàng.
11. **POST `/api/customers`**: Tạo mới thông tin khách hàng.
12. **POST `/api/customers/:id/booking`**: Đồng bộ số lần chơi và tích lũy điểm thưởng sau khi chơi xong.
    *   *Payload*: `{ totalPaid: 180000, pointsToAdd: 18 }`

### 3.4 Cấu hình Bảng giá (Pricing Rules)
13. **GET `/api/pricing`**: Tải danh sách cấu hình giá giờ đặc biệt, phụ trội.
14. **POST `/api/pricing`** | **PUT `/api/pricing/:id`** | **DELETE `/api/pricing/:id`**: Các thao tác CRUD bảng giá.
