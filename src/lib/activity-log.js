import ActivityLog from '@/models/ActivityLog';

export async function logActivity(adminId, action, targetType, targetId, details) {
  try {
    await ActivityLog.create({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
