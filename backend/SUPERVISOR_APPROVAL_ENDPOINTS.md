# Supervisor Approval Endpoints

This document describes the new approval processing endpoints implemented for the supervisor mobile dashboard.

## Endpoints

### 1. Get Pending Approvals

**GET** `/api/supervisor/:id/approvals`

Retrieves all pending approval items for a supervisor.

#### Parameters
- `id` (path): Supervisor ID
- `type` (query, optional): Filter by approval type (`leave`, `advance_payment`, `material_request`, `attendance_correction`)
- `priority` (query, optional): Filter by priority (`high`, `medium`, `low`)

#### Response
```json
{
  "approvals": [
    {
      "approvalId": "leave_1",
      "type": "leave",
      "requesterId": 101,
      "requesterName": "John Doe",
      "submittedDate": "2024-01-25T10:00:00Z",
      "priority": "medium",
      "details": {
        "leaveType": "ANNUAL",
        "fromDate": "2024-02-01T00:00:00Z",
        "toDate": "2024-02-03T00:00:00Z",
        "totalDays": 3,
        "reason": "Family vacation"
      },
      "originalId": 1
    }
  ],
  "summary": {
    "total": 5,
    "leave": 3,
    "advance_payment": 1,
    "material_request": 1,
    "attendance_correction": 0
  },
  "lastUpdated": "2024-01-29T15:30:00Z"
}
```

#### Authentication
- Requires valid JWT token
- Requires `supervisor` role

### 2. Process Approval Decision

**POST** `/api/supervisor/approval/:id/process`

Processes an approval decision (approve or reject).

#### Parameters
- `id` (path): Approval ID in format `{type}_{originalId}` (e.g., `leave_1`)

#### Request Body
```json
{
  "decision": "approve", // or "reject"
  "remarks": "Approved for family vacation"
}
```

#### Response
```json
{
  "success": true,
  "message": "leave approved successfully",
  "approvalId": "leave_1",
  "decision": "approve",
  "processedAt": "2024-01-29T15:35:00Z",
  "details": {
    "leaveRequestId": 1,
    "employeeId": 101,
    "leaveType": "ANNUAL",
    "fromDate": "2024-02-01T00:00:00Z",
    "toDate": "2024-02-03T00:00:00Z",
    "newStatus": "APPROVED"
  }
}
```

#### Authentication
- Requires valid JWT token
- Requires `supervisor` role

#### Validation
- `decision` must be either "approve" or "reject"
- `remarks` are mandatory and cannot be empty
- Approval ID must be in valid format

## Approval Types

### 1. Leave Requests (`leave`)
- **Source**: `LeaveRequest` collection
- **Priority Calculation**:
  - `EMERGENCY` or `MEDICAL` leave types → `high`
  - Leave starting within 3 days → `high`
  - Leave starting within 7 days → `medium`
  - All other leave requests → `low`

### 2. Advance Payments (`advance_payment`)
- **Status**: Mock implementation (placeholder for future development)
- **Priority**: Based on amount and urgency

### 3. Material Requests (`material_request`)
- **Status**: Mock implementation (placeholder for future development)
- **Priority**: Based on project criticality and cost

### 4. Attendance Corrections (`attendance_correction`)
- **Status**: Mock implementation (placeholder for future development)
- **Priority**: Based on correction type and impact

## Audit Logging

All approval decisions are logged with the following information:
- Timestamp
- Supervisor ID
- Approval ID and type
- Decision (APPROVE/REJECT)
- Remarks
- IP address and user agent
- Processing timestamp

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "message": "Invalid decision. Must be 'approve' or 'reject'"
}
```

#### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "message": "Supervisor access required"
}
```

#### 404 Not Found
```json
{
  "message": "Leave request not found"
}
```

#### 500 Internal Server Error
```json
{
  "message": "Server error processing approval"
}
```

## Integration with ERP Modules

The approval system integrates with existing ERP modules:

1. **Leave Management**: Updates `LeaveRequest` and `LeaveApproval` collections
2. **Project Management**: Considers supervisor's assigned projects for filtering
3. **Employee Management**: Retrieves employee names for display
4. **Worker Task Assignment**: Identifies supervised employees

## Security Features

1. **Authentication**: JWT token validation
2. **Authorization**: Role-based access control (supervisor only)
3. **Audit Logging**: Complete audit trail for all decisions
4. **Input Validation**: Comprehensive validation of all inputs
5. **Data Masking**: Sensitive information protection (future enhancement)

## Performance Considerations

1. **Efficient Queries**: Optimized database queries with proper indexing
2. **Caching**: Dashboard data caching with 30-second TTL
3. **Pagination**: Support for large approval lists (future enhancement)
4. **Real-time Updates**: WebSocket integration for live updates (future enhancement)

## Testing

The implementation includes comprehensive tests covering:
- Input validation logic
- Priority calculation algorithms
- Response structure validation
- Error handling scenarios
- Audit logging functionality

Run tests with:
```bash
npm test -- --testPathPattern=approvals
```