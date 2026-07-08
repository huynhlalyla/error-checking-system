# Error Checking System

Hướng dẫn cài đặt và khởi động dự án Error Checking System. Dự án bao gồm các thành phần: Database (Docker), Backend (NestJS), Frontend (Vue/Vite) và AI Service (Python/FastAPI).

## Yêu cầu hệ thống
- Node.js (khuyến nghị dùng kèm pnpm, xem lưu ý bên dưới)
- Python 3.x
- Docker và Docker Desktop (để chạy Database)

### Lưu ý về Package Manager (pnpm vs npm)
Dự án này được thiết lập mặc định sử dụng `pnpm`. 
- **Cách 1 (Khuyến nghị):** Cài đặt `pnpm` trên máy của bạn thông qua npm bằng lệnh:
  ```bash
  npm install -g pnpm
  ```
- **Cách 2:** Bạn hoàn toàn có thể sử dụng `npm` thay cho `pnpm`. Ở tất cả các hướng dẫn cài đặt và khởi chạy bên dưới, bạn chỉ cần thay thế chữ `pnpm` thành `npm`. Ví dụ: thay `pnpm install` thành `npm install`, thay `pnpm run dev` thành `npm run dev`. (Lưu ý: dùng npm có thể sẽ tạo ra file `package-lock.json` mới).

## Hướng dẫn cài đặt

### 1. Cài đặt thư viện cho Backend
Tại thư mục gốc của dự án, chạy lệnh:
```bash
pnpm install
```

### 2. Cài đặt thư viện cho Frontend
Di chuyển vào thư mục `client` và cài đặt:
```bash
cd client
pnpm install
```

### 3. Cài đặt thư viện cho AI Service
Di chuyển vào thư mục `apps/ai-service` và cài đặt các thư viện Python:
```bash
cd apps/ai-service
pip install -r requirements.txt
```

## Hướng dẫn khởi động

Để dự án hoạt động đầy đủ, bạn cần khởi động tất cả các dịch vụ dưới đây.

### Bước 1: Khởi động Database (MongoDB và Redis)
Đảm bảo Docker Desktop đang mở, sau đó chạy lệnh sau tại thư mục gốc của dự án:
```bash
docker-compose up -d
```

### Bước 2: Khởi động Backend (NestJS)
Mở một terminal mới tại thư mục gốc của dự án và chạy:
```bash
pnpm run start:dev
```
Backend API sẽ chạy tại: http://localhost:3000/api

### Bước 3: Khởi động Frontend (Vue/Vite)
Mở một terminal mới tại thư mục `client` và chạy:
```bash
cd client
pnpm run dev
```
Frontend sẽ chạy tại: http://localhost:5173

### Bước 4: Khởi động AI Service (Python/FastAPI)
Mở một terminal mới tại thư mục `apps/ai-service` và chạy:
```bash
cd apps/ai-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
AI Service sẽ chạy tại: http://localhost:8000
