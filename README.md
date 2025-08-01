# MineZola - Ứng Dụng Chat Bảo Mật End-to-End với chủ đề Minecraft

Dự án cho môn học **NT106 - Lập trình mạng căn bản**.

## 👥 Thành viên Nhóm 7

- **23520543** – Trần Việt Hoàng
- **23520190** – Cao Lê Thành Công
- **23520247** – Hoàng Quốc Đạt

## 📋 Tổng quan dự án

MineZola là một ứng dụng chat cho máy tính (desktop) được xây dựng bằng Electron và React, tập trung vào bảo mật và quyền riêng tư thông qua mã hóa đầu cuối (E2EE) cho mọi hình thức giao tiếp: tin nhắn, chia sẻ file và gọi video. Lấy cảm hứng từ trò chơi Minecraft, MineZola mang đến một giao diện độc đáo, pixelated và thân thiện với người dùng.

## ✨ Tính năng chính

### 🔐 Bảo mật End-to-End

- **Mã hóa Tin nhắn & File**: Sử dụng kết hợp RSA-2048 bit (để trao đổi khóa an toàn) và AES-256-GCM (để mã hóa nội dung). Mỗi tin nhắn và file có một khóa AES riêng biệt.

- **Quản lý khóa phía Client**: Cặp khóa RSA (Public/Private Key) được tạo và lưu trữ hoàn toàn trên máy người dùng (LocalStorage), đảm bảo Private Key không bao giờ rời khỏi thiết bị.

- **Gọi Video P2P bảo mật**: Các cuộc gọi video sử dụng WebRTC, thiết lập kết nối ngang hàng (Peer-to-Peer) trực tiếp giữa hai người dùng. Luồng media được mã hóa mặc định bởi giao thức DTLS/SRTP.

- **Kết nối an toàn**: Toàn bộ giao tiếp với server đều được thực hiện qua HTTPS/WSS.

### 💬 Nhắn tin và Giao tiếp thời gian thực

- **Real-time với Socket.IO**: Trải nghiệm chat mượt mà, nhận tin nhắn và cập nhật trạng thái ngay lập tức.

- **Tính năng Chat đầy đủ**: Hiển thị trạng thái online, thông báo tin nhắn mới, reaction bằng emoji, và xóa tin nhắn.

- **Tìm kiếm tin nhắn**: Tìm kiếm nội dung tin nhắn ngay trên client sau khi đã giải mã.

### 📁 Chia sẻ File hiệu quả và an toàn

- **Xử lý file theo Chunk**: Các file lớn được tự động chia thành các phần nhỏ (chunk) trước khi mã hóa và tải lên, giúp việc upload/download hiệu quả, có khả năng chịu lỗi và tải song song.

- **Mã hóa Toàn diện**: Mỗi chunk của file được mã hóa riêng biệt, đảm bảo an toàn trong suốt quá trình truyền tải.

### 🎨 Giao diện độc đáo và tùy chỉnh

- **Chủ đề Minecraft**: Giao diện người dùng pixelated, mang lại cảm giác quen thuộc và thú vị.

- **Tùy chỉnh Giao diện**: Cho phép người dùng thay đổi texture nền của giao diện chat.

## 🏗️ Kiến trúc hệ thống

Dự án hoạt động dựa trên kiến trúc Client-Server cho các tác vụ quản lý và tín hiệu, kết hợp với Peer-to-Peer cho các cuộc gọi video để đảm bảo tính riêng tư và hiệu suất.

- **Backend Server (Node.js)**: Xử lý xác thực người dùng, quản lý bạn bè, lưu trữ metadata và các file đã được mã hóa, và điều phối tín hiệu (signaling) cho Socket.IO và WebRTC. Server không có khả năng đọc nội dung tin nhắn/file.

- **Client (Electron + React)**: Chịu trách nhiệm về giao diện người dùng, tạo và quản lý khóa, mã hóa và giải mã toàn bộ dữ liệu, và thiết lập kết nối trực tiếp với người dùng khác cho video call.

```
┌─────────────────┐    HTTPS/WSS    ┌──────────────────┐
│   Client (A)    │◄───────────────►│  Backend Server  │
│ (Electron/React)│ (API, Socket.IO) │(Node.js, Express)│
└─────────────────┘                 └───────┬──────────┘
        ▲                                   │
        │                                   │
        │ WebRTC (P2P)                      ▼
        ▼                               ┌───────────┐
┌─────────────────┐                     │  MongoDB  │
│   Client (B)    │                     └───────────┘
│ (Electron/React)│
└─────────────────┘
```

## 🔧 Công nghệ sử dụng

### Backend
- **Nền tảng**: Node.js, Express.js
- **Giao tiếp Real-time**: Socket.IO
- **Cơ sở dữ liệu**: MongoDB với Mongoose ODM
- **Xác thực**: JSON Web Token (JWT), bcryptjs
- **Xử lý file**: Multer

### Frontend (Client)
- **Framework**: React, Vite
- **Quản lý trạng thái**: Zustand
- **Giao tiếp mạng**: Axios, Socket.io-client
- **Mã hóa**:
  - **JSEncrypt**: Cho các thao tác mã hóa/giải mã RSA.
  - **Web Crypto API**: API trình duyệt tích hợp sẵn cho các hoạt động mã hóa AES-GCM hiệu suất cao.
- **Gọi Video**: Simple-Peer (một thư viện đơn giản hóa WebRTC)
- **Giao diện**: Tailwind CSS, DaisyUI, Lucide React
- **Thông báo**: React Hot Toast

### Desktop
- **Nền tảng**: Electron

## 🚀 Cài đặt và chạy

### Yêu cầu
- Node.js (v18+)
- MongoDB

### 1. Clone repository
```bash
git clone https://github.com/Quackusarle/NT106.Nhom7-MineZola.git
cd NT106
```

### 2. Cài đặt dependencies
```bash
# Cài đặt cho Backend
cd backend
npm install

# Cài đặt cho Frontend
cd ../frontend
npm install

# Cài đặt cho Electron
cd ../electron
npm install
```

### 3. Cấu hình môi trường

#### Backend (backend/.env)
Tạo file `.env` trong thư mục `backend` với nội dung:
```env
MONGODB_URI=
JWT_SECRET=
NODE_ENV=
PORT=5001
```

#### Frontend (frontend/.env)
Cần thay đổi các URL trong frontend thành IP thực tế của thiết bị sử dụng làm server.
```

### 4. Tạo chứng chỉ SSL (cho môi trường phát triển)

Để chạy backend với HTTPS trên mạng LAN, cần tạo một chứng chỉ tự ký.
```bash
# Trong thư mục backend
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Khi được hỏi thông tin, bạn có thể bỏ trống.

### 5. Chạy ứng dụng

```bash
# 1. Chạy Backend Server (từ thư mục backend)
npm start

# 2. Chạy ứng dụng Electron (từ thư mục electron)
cd ../electron
npm start
```

## 🔐 Chi tiết về luồng bảo mật

### Mã hóa Tin nhắn và File

1. **Tạo khóa phiên (Session Key)**: Khi gửi một tin nhắn hoặc file, client tạo ra một khóa AES-256-GCM ngẫu nhiên và duy nhất.

2. **Mã hóa Nội dung**: Nội dung tin nhắn/file được mã hóa bằng khóa AES này.

3. **Bọc khóa (Key Wrapping)**: Khóa AES sau đó được mã hóa 2 lần bằng thuật toán RSA:
   - Một lần với Public Key của người nhận.
   - Một lần nữa với Public Key của chính người gửi (để người gửi có thể xem lại lịch sử tin nhắn của mình).

4. **Gửi dữ liệu**: Gói tin được gửi đến server bao gồm: nội dung đã mã hóa, khóa AES đã mã hóa cho người nhận, và khóa AES đã mã hóa cho người gửi. Server chỉ lưu trữ và chuyển tiếp dữ liệu này mà không thể giải mã.

### Lưu ý về Bảo mật (Security Considerations)

Dự án này đã chứng minh được tính khả thi của mô hình E2EE. Tuy nhiên, trong một môi trường thực tế, cần có những cải tiến sâu hơn:

- **Lưu trữ Private Key**: Việc lưu Private Key trong LocalStorage tiện lợi cho việc phát triển nhưng có thể bị tấn công qua XSS nếu ứng dụng có lỗ hổng. Các ứng dụng chuyên nghiệp thường sử dụng các giải pháp an toàn hơn như macOS Keychain hoặc Windows Credential Manager.

- **Xác minh định danh**: Dự án chưa có cơ chế xác minh khóa công khai (ví dụ: quét mã QR, so sánh "safety numbers"), dẫn đến nguy cơ tấn công Man-in-the-Middle (MITM) trên lý thuyết.

## 💡 Hướng phát triển tương lai


- **Bảo vệ Private Key bằng mật khẩu**: Mã hóa Private Key bằng một mật khẩu do người dùng đặt trước khi lưu vào LocalStorage.

- **Cơ chế khôi phục khóa**: Cho phép người dùng sao lưu và khôi phục khóa an toàn.

- **Tìm kiếm trên Server**: Nghiên cứu các kỹ thuật Searchable Encryption để cho phép tìm kiếm tin nhắn trên server mà không cần giải mã.

---

**Lưu ý**: Đây là dự án học tập cho môn NT106. Không sử dụng trong môi trường production thực tế mà không có đánh giá bảo mật đầy đủ.
