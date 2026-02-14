# Database Migrations

This directory contains database migration scripts for the ERP system.

## Available Migrations

### add-mobile-fields-to-worker-task-assignment.js

Adds mobile-specific fields to existing WorkerTaskAssignment records:

- `dailyTarget`: Object containing task target information
  - `description`: String - Description of the daily target
  - `quantity`: Number - Target quantity to complete
  - `unit`: String - Unit of measurement
  - `targetCompletion`: Number - Target completion percentage (default: 100)
- `workArea`: String - Work area designation
- `floor`: String - Floor location
- `zone`: String - Zone designation

#### Running the Migration

```bash
# Navigate to backend directory
cd backend

# Run the migration
node migrations/add-mobile-fields-to-worker-task-assignment.js
```

#### Default Values Applied

For existing records that don't have these fields, the migration applies these defaults:

```javascript
{
  dailyTarget: {
    description: 'Task completion',
    quantity: 1,
    unit: 'task',
    targetCompletion: 100
  },
  workArea: 'General Area',
  floor: 'Ground Floor',
  zone: 'A'
}
```

### add-geofence-structure-to-project.js

Adds structured geofence support to existing Project records:

- `geofence`: Object containing geofence configuration
  - `center`: Object with latitude and longitude coordinates
    - `latitude`: Number - Center latitude (required)
    - `longitude`: Number - Center longitude (required)
  - `radius`: Number - Geofence radius in meters (default: 100)
  - `strictMode`: Boolean - Whether to enforce strict validation (default: true)
  - `allowedVariance`: Number - Additional allowed distance in meters (default: 10)

#### Running the Migration

```bash
# Navigate to backend directory
cd backend

# Run the migration
npm run migrate:project-geofence
# OR
node migrations/add-geofence-structure-to-project.js
```

#### Migration Behavior

1. **Projects with existing coordinates**: Migrates data from existing `latitude`, `longitude`, and `geofenceRadius` fields to the new structured format
2. **Projects without coordinates**: Adds default geofence structure with coordinates (0,0) and `strictMode: false` for flexibility

#### Default Values Applied

For projects with existing coordinates:
```javascript
{
  geofence: {
    center: {
      latitude: project.latitude,
      longitude: project.longitude
    },
    radius: project.geofenceRadius || 100,
    strictMode: true,
    allowedVariance: 10
  }
}
```

For projects without coordinates:
```javascript
{
  geofence: {
    center: {
      latitude: 0,
      longitude: 0
    },
    radius: 100,
    strictMode: false,
    allowedVariance: 50
  }
}
```

## Migration Guidelines

1. Always backup your database before running migrations
2. Test migrations on a development environment first
3. Migrations should be idempotent (safe to run multiple times)
4. Document any breaking changes or required manual steps