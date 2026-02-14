# Workforce Count Endpoint Documentation

## Overview

The workforce count endpoint provides real-time workforce statistics for supervisors, enabling them to monitor attendance patterns, overtime, and leave status across their assigned projects.

## Endpoint

```
GET /api/supervisor/:id/workforce-count
```

## Authentication

- Requires valid JWT token
- Requires 'supervisor' role authorization

## Parameters

### Path Parameters
- `id` (required): Supervisor ID

### Query Parameters
- `date` (optional): Target date in YYYY-MM-DD format. Defaults to current date.

## Response Format

```json
{
  "total": 25,
  "present": 18,
  "absent": 3,
  "late": 2,
  "onLeave": 2,
  "overtime": 5,
  "lastUpdated": "2024-01-29T10:30:00.000Z"
}
```

## Response Fields

- `total`: Total number of workers assigned for the date
- `present`: Workers who checked in on time (before 8:30 AM)
- `absent`: Workers with no check-in record and not on approved leave
- `late`: Workers who checked in after 8:30 AM
- `onLeave`: Workers with approved leave requests for the date
- `overtime`: Workers who have worked more than 10 hours
- `lastUpdated`: Timestamp of when the data was calculated

## Business Logic

### Attendance Status Calculation

1. **On Leave**: Workers with approved leave requests covering the target date
2. **Present**: Workers who checked in before 8:30 AM
3. **Late**: Workers who checked in after 8:30 AM
4. **Absent**: Workers assigned but no check-in record and not on leave
5. **Overtime**: Workers who have worked more than 10 hours (standard work day)

### Data Sources

- **Projects**: Filters by supervisor's assigned projects
- **Worker Assignments**: Gets workers assigned to projects for the target date
- **Attendance Records**: Check-in/check-out times and geofence validation
- **Leave Requests**: Approved leave requests overlapping the target date

### Performance Considerations

- Queries are optimized with proper indexing on date and supervisor fields
- Results can be cached for 30 seconds to reduce database load
- Supports real-time updates through WebSocket integration

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid date format"
}
```

### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "message": "Supervisor access required"
}
```

### 500 Internal Server Error
```json
{
  "message": "Server error"
}
```

## Usage Examples

### Basic Request
```bash
curl -X GET "http://localhost:5001/api/supervisor/123/workforce-count" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### With Date Parameter
```bash
curl -X GET "http://localhost:5001/api/supervisor/123/workforce-count?date=2024-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/Frontend Usage
```javascript
import { supervisorService } from '../services';

const workforceCount = await supervisorService.getWorkforceCount(supervisorId, date);
console.log(`Total workers: ${workforceCount.total}`);
console.log(`Present: ${workforceCount.present}, Absent: ${workforceCount.absent}`);
```

## Real-time Updates

The workforce count data supports real-time updates through WebSocket connections. When attendance status changes occur, the dashboard will receive updates within 30 seconds as specified in the requirements.

### WebSocket Event Types
- `WORKFORCE_COUNT_CHANGED`: Triggered when attendance status changes
- `ATTENDANCE_UPDATED`: Triggered when workers check in/out
- `LEAVE_STATUS_CHANGED`: Triggered when leave requests are approved/rejected

## Testing

Unit tests are available in:
- `src/modules/supervisor/supervisorController.workforce.test.js`

Integration test script:
- `test-workforce-endpoint.js`

Run tests:
```bash
npm test -- supervisorController.workforce.test.js
```

## Requirements Fulfilled

This endpoint fulfills the following requirements from the supervisor mobile dashboard specification:

- **Requirement 2.3**: Real-time workforce count updates within 30 seconds
- **Requirement 2.4**: Attendance status change reflection in workforce counts

The implementation provides accurate workforce statistics with proper categorization of worker status, supporting the supervisor's need to monitor staffing levels and attendance patterns across their assigned projects.