export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationPermission(): NotificationPermissionState {
  try {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Call only from a user gesture. Asks at most once: after 'granted' or 'denied' this does nothing.
 * Returns the resulting state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (notificationPermission() !== 'default') return notificationPermission();
  try {
    await Notification.requestPermission();
  } catch {
    // Older browsers, blocked prompts: keep working without notifications.
  }
  return notificationPermission();
}

/** Never throws (Chrome on Android throws without a service worker). Returns whether it was shown. */
export function showNotification(title: string, body: string): boolean {
  try {
    if (notificationPermission() !== 'granted') return false;
    new Notification(title, { body });
    return true;
  } catch {
    return false;
  }
}
