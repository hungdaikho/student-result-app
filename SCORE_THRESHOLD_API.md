# Score Threshold API Documentation

API endpoint để quản lý điểm chuẩn (score thresholds) trong hệ thống admin. Điểm chuẩn được lưu theo năm và loại kỳ thi.

## Endpoint: `/api/admin/score-threshold`

### 1. GET - Lấy danh sách điểm chuẩn

```typescript
// Lấy tất cả điểm chuẩn
const response = await fetch('/api/admin/score-threshold')

// Lấy điểm chuẩn theo filter
const response = await fetch('/api/admin/score-threshold?year=2024&examType=BAC')

// Query parameters:
// - year: number (optional) - Năm học
// - examType: "BAC" | "BREVET" (optional) - Loại kỳ thi

// Response:
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "year": 2024,
      "examType": "BAC",
      "threshold": 14.5,
      "description": "Điểm chuẩn thi BAC năm 2024",
      "createdAt": "2024-07-31T...",
      "updatedAt": "2024-07-31T..."
    }
  ],
  "count": 1
}
```

### 2. POST - Tạo hoặc cập nhật điểm chuẩn

```typescript
const response = await fetch('/api/admin/score-threshold', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    year: 2024,
    examType: "BAC",
    threshold: 14.5,
    description: "Điểm chuẩn thi BAC năm 2024" // optional
  })
})

// Response:
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "year": 2024,
    "examType": "BAC",
    "threshold": 14.5,
    "description": "Điểm chuẩn thi BAC năm 2024",
    "createdAt": "2024-07-31T...",
    "updatedAt": "2024-07-31T..."
  },
  "message": "Score threshold saved successfully"
}
```

### 3. PUT - Cập nhật điểm chuẩn theo ID

```typescript
const response = await fetch('/api/admin/score-threshold?id=clxxx...', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    threshold: 15.0,
    description: "Cập nhật điểm chuẩn"
  })
})

// Response:
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "year": 2024,
    "examType": "BAC",
    "section": "Sciences",
    "threshold": 15.0,
    "description": "Cập nhật điểm chuẩn",
    "createdAt": "2024-07-31T...",
    "updatedAt": "2024-07-31T..."
  },
  "message": "Score threshold updated successfully"
}
```

### 4. DELETE - Xóa điểm chuẩn

```typescript
const response = await fetch('/api/admin/score-threshold?id=clxxx...', {
  method: 'DELETE'
})

// Response:
{
  "success": true,
  "message": "Score threshold deleted successfully"
}
```

## Example React Component

```tsx
import { useState, useEffect } from "react";
import { ScoreThreshold } from "@/types/student";

export default function ScoreThresholdManager() {
  const [thresholds, setThresholds] = useState<ScoreThreshold[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy danh sách điểm chuẩn
  const fetchThresholds = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/score-threshold");
      const data = await response.json();
      if (data.success) {
        setThresholds(data.data);
      }
    } catch (error) {
      console.error("Error fetching thresholds:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tạo/cập nhật điểm chuẩn
  const saveThreshold = async (
    threshold: Omit<ScoreThreshold, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const response = await fetch("/api/admin/score-threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(threshold),
      });

      const data = await response.json();
      if (data.success) {
        fetchThresholds(); // Refresh list
        alert("Điểm chuẩn đã được lưu thành công!");
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (error) {
      console.error("Error saving threshold:", error);
      alert("Có lỗi xảy ra khi lưu điểm chuẩn");
    }
  };

  // Xóa điểm chuẩn
  const deleteThreshold = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa điểm chuẩn này?")) return;

    try {
      const response = await fetch(`/api/admin/score-threshold?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        fetchThresholds(); // Refresh list
        alert("Điểm chuẩn đã được xóa thành công!");
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (error) {
      console.error("Error deleting threshold:", error);
      alert("Có lỗi xảy ra khi xóa điểm chuẩn");
    }
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  return (
    <div>
      <h2>Quản lý Điểm Chuẩn</h2>

      {/* Form để thêm điểm chuẩn mới */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          saveThreshold({
            year: parseInt(formData.get("year") as string),
            examType: formData.get("examType") as "BAC" | "BREVET",
            threshold: parseFloat(formData.get("threshold") as string),
            description: (formData.get("description") as string) || undefined,
          });
        }}
      >
        <input name="year" type="number" placeholder="Năm" required />
        <select name="examType" required>
          <option value="">Chọn loại kỳ thi</option>
          <option value="BAC">BAC</option>
          <option value="BREVET">BREVET</option>
        </select>
        <input
          name="threshold"
          type="number"
          step="0.1"
          placeholder="Điểm chuẩn"
          required
        />
        <input name="description" placeholder="Mô tả (tùy chọn)" />
        <button type="submit">Lưu Điểm Chuẩn</button>
      </form>

      {/* Danh sách điểm chuẩn */}
      <div>
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Năm</th>
                <th>Loại Kỳ Thi</th>
                <th>Điểm Chuẩn</th>
                <th>Mô Tả</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((threshold) => (
                <tr key={threshold.id}>
                  <td>{threshold.year}</td>
                  <td>{threshold.examType}</td>
                  <td>{threshold.threshold}</td>
                  <td>{threshold.description || "-"}</td>
                  <td>
                    <button onClick={() => deleteThreshold(threshold.id!)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

## Validation Rules

- **year**: Số nguyên, bắt buộc
- **examType**: Phải là "BAC" hoặc "BREVET", bắt buộc
- **threshold**: Số thực từ 0 đến 20, bắt buộc
- **description**: Chuỗi ký tự, tùy chọn

## Error Responses

```json
// Validation Error
{
  "success": false,
  "error": "Missing required fields: year, examType, threshold"
}

// Server Error
{
  "success": false,
  "error": "Failed to save score threshold",
  "details": "Detailed error message"
}
```

## Database Schema

```sql
CREATE TABLE "score_thresholds" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "examType" "ExamType" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_thresholds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "score_thresholds_year_examType_key" ON "score_thresholds"("year", "examType");
CREATE INDEX "score_thresholds_year_examType_idx" ON "score_thresholds"("year", "examType");
```
