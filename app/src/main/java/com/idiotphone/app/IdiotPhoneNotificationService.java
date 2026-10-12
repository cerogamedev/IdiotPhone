package com.idiotphone.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class IdiotPhoneNotificationService extends NotificationListenerService {

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        String packageName = sbn.getPackageName();

        // Listen for WhatsApp and WhatsApp Business notifications
        if ("com.whatsapp".equals(packageName) || "com.whatsapp.w4b".equals(packageName)) {
            Notification notification = sbn.getNotification();
            if (notification == null) return;

            Bundle extras = notification.extras;
            if (extras != null) {
                String title = extras.getString(Notification.EXTRA_TITLE, "");
                CharSequence textChars = extras.getCharSequence(Notification.EXTRA_TEXT);
                String body = textChars != null ? textChars.toString() : "";

                if (!title.isEmpty() && !body.isEmpty()) {
                    MainActivity.notifyIncomingWhatsApp(title, body);
                }
            }
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Ignored
    }
}
