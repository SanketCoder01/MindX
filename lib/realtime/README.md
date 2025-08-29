# Real-time Subscription System for EduVision

A comprehensive real-time subscription system built on Supabase postgres_changes for instant updates across the EduVision platform.

## Features

- **Generic subscription manager** - Subscribe to any table with custom filters
- **React hooks** - Easy integration with React components
- **Automatic cleanup** - Prevents memory leaks with proper unsubscribe handling
- **Type-safe** - Full TypeScript support
- **Role-based filtering** - Automatic filtering based on user department/class
- **Browser notifications** - Optional push notifications for important updates

## Quick Start

### 1. Basic Usage

```typescript
import { realtimeManager } from '@/lib/realtime/subscription-manager'

// Subscribe to a table
const subscription = realtimeManager.subscribe({
  table: 'announcements',
  event: '*', // INSERT, UPDATE, DELETE, or *
  callback: (payload) => {
    console.log('Update received:', payload)
    // Handle the update in your UI
  }
})

// Cleanup when done
subscription.unsubscribe()
```

### 2. React Hook Usage

```typescript
import { useAnnouncementSubscription } from '@/hooks/useRealtimeSubscription'

function MyComponent() {
  useAnnouncementSubscription(
    (payload) => {
      // Handle announcement updates
      console.log('Announcement update:', payload)
    },
    { departmentId: 'CS', classId: 'CS-2024' }
  )

  return <div>Component content</div>
}
```

### 3. Provider Setup

Wrap your app with the RealtimeProvider:

```typescript
import { RealtimeProvider } from '@/components/realtime/RealtimeProvider'

function App() {
  return (
    <RealtimeProvider>
      <YourAppContent />
    </RealtimeProvider>
  )
}
```

## Available Hooks

### Core Hook
- `useRealtimeSubscription` - Generic subscription hook

### Specialized Hooks
- `useAnnouncementSubscription` - For announcements
- `useAssignmentSubscription` - For assignments
- `useAssignmentResponseSubscription` - For assignment responses (faculty)
- `useEventSubscription` - For events
- `useStudentQuerySubscription` - For student queries (faculty)
- `useStudyGroupSubscription` - For study groups

## Subscription Manager Methods

### Basic Methods
```typescript
// Subscribe to a table
const sub = realtimeManager.subscribe(config)

// Subscribe to multiple tables
const subs = realtimeManager.subscribeMultiple([config1, config2])

// Unsubscribe from specific subscription
realtimeManager.unsubscribe(subscriptionId)

// Unsubscribe from all
realtimeManager.unsubscribeAll()

// Get active subscription count
const count = realtimeManager.getSubscriptionCount()
```

### Specialized Methods
```typescript
// For students - subscribe to announcements
const announcementSub = realtimeManager.subscribeToAnnouncements(
  callback,
  departmentId,
  classId
)

// For faculty - subscribe to assignment responses
const responseSub = realtimeManager.subscribeToAssignmentResponses(
  callback,
  facultyId
)
```

## Payload Structure

Each callback receives a `RealtimePostgresChangesPayload` with:

```typescript
{
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  new: any, // New row data (INSERT/UPDATE)
  old: any, // Old row data (UPDATE/DELETE)
  errors: any[]
}
```

## Example: Student Dashboard

```typescript
import { setupStudentSubscriptions } from '@/lib/realtime/examples'

function StudentDashboard() {
  useEffect(() => {
    const cleanup = setupStudentSubscriptions(
      'student-123',
      'CS',
      'CS-2024'
    )

    return cleanup // Cleanup on unmount
  }, [])

  return <div>Dashboard content</div>
}
```

## Example: Faculty Dashboard

```typescript
import { setupFacultySubscriptions } from '@/lib/realtime/examples'

function FacultyDashboard() {
  useEffect(() => {
    const cleanup = setupFacultySubscriptions(
      'faculty-456',
      'CS'
    )

    return cleanup
  }, [])

  return <div>Faculty dashboard</div>
}
```

## Real-time Status Component

Show connection status to users:

```typescript
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus'

function Header() {
  return (
    <div>
      <h1>EduVision</h1>
      <RealtimeStatus />
    </div>
  )
}
```

## Database Setup Requirements

Ensure your Supabase database has:

1. **Row Level Security (RLS)** enabled on all tables
2. **Realtime enabled** for tables you want to subscribe to:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
   ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
   ALTER PUBLICATION supabase_realtime ADD TABLE events;
   -- Add other tables as needed
   ```

3. **Proper RLS policies** for filtering data by department/class:
   ```sql
   -- Example policy for announcements
   CREATE POLICY "Students can view department announcements" ON announcements
   FOR SELECT USING (
     department_id IN (
       SELECT department_id FROM students 
       WHERE user_id = auth.uid()
     )
   );
   ```

## Performance Considerations

- **Limit subscriptions** - Only subscribe to what you need
- **Use filters** - Filter at the database level when possible
- **Cleanup properly** - Always unsubscribe when components unmount
- **Batch updates** - Consider debouncing rapid updates in your UI

## Troubleshooting

### Common Issues

1. **Subscriptions not working**
   - Check if realtime is enabled for the table
   - Verify RLS policies allow the user to see the data
   - Check browser console for connection errors

2. **Too many subscriptions**
   - Use `realtimeManager.getSubscriptionCount()` to monitor
   - Implement proper cleanup in useEffect

3. **Performance issues**
   - Add database-level filters to reduce payload size
   - Consider pagination for large datasets

### Debug Mode

Enable debug logging:
```typescript
// In your app initialization
console.log('Active subscriptions:', realtimeManager.getActiveSubscriptions())
```

## Security Notes

- All subscriptions respect Row Level Security (RLS) policies
- Users only receive updates for data they have permission to see
- Filters are applied at the database level for security
- Always validate data on the client side before displaying

## Migration from Static Loading

To migrate from static data loading to real-time:

1. Replace `useEffect` data fetching with real-time subscriptions
2. Update state management to handle incremental updates
3. Add proper loading states for initial data
4. Implement optimistic updates where appropriate

Example migration:
```typescript
// Before (static)
useEffect(() => {
  loadAnnouncements().then(setAnnouncements)
}, [])

// After (real-time)
useAnnouncementSubscription((payload) => {
  setAnnouncements(prev => {
    // Handle INSERT/UPDATE/DELETE
    return updateAnnouncementsList(prev, payload)
  })
})
```
