# Notification System Migration - Remaining Files

## Files Fixed So Far:
✅ EditStudioModal.tsx - Custom modal → toast
✅ LocationPicker.tsx - 3 alerts → toasts  
✅ StudiosPage.tsx - 1 alert → toast

## High Priority - User Facing (Next to Fix):

### ImageGalleryManager.tsx
- Line 324: `confirm('Are you sure you want to delete this image?')` 
- Replace with: `showConfirm({ title: 'Delete Image?', message: 'Are you sure you want to delete this image? This action cannot be undone.', confirmText: 'Delete', isDangerous: true })`

## Medium Priority - Admin Facing:

### Admin Studios Page (src/app/admin/studios/page.tsx)
**Alerts (8 instances)**:
- Line 382: Success → `showSuccess('Studio and user account deleted successfully')`
- Line 388: Error → `showError('Failed to delete studio and user account')`
- Line 413: Error → `showError('Failed to update visibility')`
- Line 438: Error → `showError('Failed to update verified status')`
- Line 463: Error → `showError('Failed to update featured status')`
- Line 488: Error → `showError('Failed to update status')`
- Line 557: Result → `showSuccess(result.message)` or `showError(result.message)`
- Line 562: Error → `showError(...)`

**Confirms (2 instances)**:
- Line 369: Delete studio → `showConfirm({ title: 'Delete Studio?', message: '...', confirmText: 'Delete', isDangerous: true })`
- Line 528: Bulk delete → `showConfirm({ title: 'Delete Studios?', message: '...', confirmText: 'Delete', isDangerous: true })`

### Admin FAQ Page (src/app/admin/faq/page.tsx)
**Alerts (5 instances)**:
- Line 47: Validation → `showWarning('Please fill in both question and answer')`
- Line 64: Error → `showError(...)`
- Line 71: Validation → `showWarning('Please fill in both question and answer')`
- Line 88: Error → `showError(...)`
- Line 105: Error → `showError(...)`
- Line 168: Error → `showError(...)`

**Confirms (1 instance)**:
- Line 94: Delete FAQ → `showConfirm({ title: 'Delete FAQ?', message: 'Are you sure you want to delete this FAQ?', confirmText: 'Delete', isDangerous: true })`

### Admin Reservations Page (src/app/admin/reservations/page.tsx)
**Confirms (1 instance)**:
- Line 88: Delete reservation → `showConfirm({ title: 'Delete Reservation?', message: '...', confirmText: 'Delete', isDangerous: true })`

### WaitlistTable.tsx (src/components/admin/WaitlistTable.tsx)
**Alerts (1 instance)**:
- Line 59: Error → `showError(...)`

**Confirms (1 instance)**:
- Line 39: Delete entry → `showConfirm({ title: 'Delete Entry?', message: `Are you sure you want to delete ${name} from the waitlist?`, confirmText: 'Delete', isDangerous: true })`

## Low Priority:

### usePreventBackNavigation.ts
- Line 44: `window.confirm(warningMessage)` 
- **Decision**: Keep as-is (browser navigation warning is acceptable)
