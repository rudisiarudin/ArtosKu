import { LocalNotifications } from '@capacitor/local-notifications';

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permStatus = await LocalNotifications.requestPermissions();
    return permStatus.display === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const permStatus = await LocalNotifications.checkPermissions();
    return permStatus.display === 'granted';
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}

export async function scheduleDailyReminders() {
  try {
    // Clear any existing notifications first to avoid duplicates
    await cancelDailyReminders();

    // Schedule Lunch Reminder at 13:00 (1 PM)
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title: 'Waktunya Makan Siang! 🍽️',
          body: 'Jangan lupa catat pengeluaran makan siangmu hari ini ya.',
          schedule: { 
            on: { hour: 13, minute: 0 }, 
            allowWhileIdle: true,
            repeats: true 
          },
        },
        // Schedule Dinner Reminder at 20:00 (8 PM)
        {
          id: 2,
          title: 'Makan Malam & Rekap 🌙',
          body: 'Sudah makan malam? Yuk catat pengeluaranmu hari ini biar gak lupa.',
          schedule: { 
            on: { hour: 20, minute: 0 }, 
            allowWhileIdle: true,
            repeats: true
          },
        }
      ]
    });
    console.log('Daily reminders scheduled for 13:00 and 20:00');
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
}

export async function cancelDailyReminders() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
    console.log('Daily reminders cancelled');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
}
