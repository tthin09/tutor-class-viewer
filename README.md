# Lịch học Notebook

Lịch xem riêng cho học sinh, hiển thị tháng/tuần và lấy dữ liệu Google Calendar qua API server-side. Favicon đang dùng phương án số 5 (bút chì và lá).

## Chạy local

```sh
npm install
npm run dev
```

Mở URL local mà server in ra (mặc định `http://localhost:3000`). Local server dùng Vite middleware; không cần đăng nhập Vercel. `credentials.json` và `data/students.json` chỉ dùng local, đều bị Git ignore. Không commit hoặc đưa chúng vào thư mục `public`.

## Cấu hình học sinh

Danh sách local nằm trong `data/students.json`, chỉ API phía server đọc; file này không được đưa vào Git hoặc build tĩnh. Mẫu cấu trúc nằm ở `data/students.example.json`. Mỗi mục có dạng:

```json
{
  "studentID": "16 ký tự hex ngẫu nhiên",
  "name": "Tên hiển thị",
  "calendarName": "Tên lịch",
  "calendarId": "calendar-id@group.calendar.google.com"
}
```

Để thêm học sinh, tạo ID bằng `node -e "console.log(require('node:crypto').randomBytes(8).toString('hex'))"`, rồi thêm tên và Calendar ID. Cấp quyền xem lịch cho service account nếu lịch không public. Link chia sẻ có dạng `/?studentID=<ID>`; người có link có thể xem lịch tương ứng, vì đây là link riêng tư chứ không phải đăng nhập.

Hiện đã cấu hình Khoa từ calendar link đã cung cấp. Cần bổ sung ba học sinh còn lại khi có tên và calendar link/ID của các em.

## Deploy Vercel

1. Import repository lên Vercel.
2. Thêm environment variable `GOOGLE_SERVICE_ACCOUNT_JSON` với toàn bộ nội dung service-account JSON (giữ khóa riêng tư).
3. Thêm `STUDENTS_JSON` với nội dung JSON array từ `data/students.json`. Danh sách học sinh không được commit lên Git hoặc deploy như static file.
4. Deploy. Build dùng `npm run build`; API serverless nằm tại `/api/events`.
5. Gửi mỗi học sinh đường dẫn với `studentID` tương ứng.

API chỉ chấp nhận GET, kiểm tra ID đã đăng ký, chỉ dùng quyền Calendar read-only và chỉ trả về sự kiện của lịch tương ứng. Không có ID hoặc ID sai thì API không trả nội dung lịch.
