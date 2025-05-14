# Electron Chat App

## Mô tả
Đây là ứng dụng chat realtime đa nền tảng, sử dụng Electron để đóng gói giao diện web (React + Vite) thành ứng dụng desktop. Backend sử dụng Node.js/Express và Socket.IO.

## Cấu trúc dự án
- `backend/`: Server Node.js/Express, quản lý API, xác thực, lưu trữ file, socket.
- `frontend/`: Ứng dụng React (Vite), giao diện người dùng.
- `electron/`: Đóng gói frontend thành app desktop với Electron.

## Hướng dẫn chạy demo ứng dụng

### 1. Cài đặt dependencies
Mở terminal tại thư mục gốc dự án và chạy:

```powershell
cd backend; npm install; cd ../frontend; npm install; cd ../electron; npm install
```

### 2. Chạy backend (API + Socket)
```powershell
cd ../backend; npm run dev
```
Backend mặc định chạy ở cổng 5001.

### 3. Chạy frontend (React)
Mở terminal mới:
```powershell
cd ../frontend; npm run dev
```
Frontend mặc định chạy ở cổng 5173.

### 4. Chạy ứng dụng Electron
Mở terminal mới:
```powershell
cd ../electron; npm start
```

Ứng dụng Electron sẽ mở cửa sổ desktop, hiển thị giao diện chat.

### 5. Chạy nhiều user (tùy chọn)
Có thể chạy nhiều phiên bản Electron với dữ liệu người dùng riêng:
```powershell
npm run start:user-a
npm run start:user-b
```

## Lưu ý
- Cần Node.js >= 18 và npm.
- Đảm bảo backend và frontend đều đang chạy trước khi mở Electron.
- Nếu đổi port frontend/backend, cần sửa lại trong file `electron/main.js` và backend cấu hình CORS.

## Đóng góp
Pull request và issue được chào đón!
