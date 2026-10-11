package com.idiotphone.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.location.Location;
import android.location.LocationManager;
import android.app.ActivityManager;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.SystemClock;
import android.os.Vibrator;
import android.provider.CallLog;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;
import android.webkit.JavascriptInterface;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.net.URLEncoder;
import java.util.ArrayList;

public class AndroidBridge {
    private final MainActivity activity;
    private final SharedPreferences prefs;
    private static final String PREFS_NAME = "idiotphone_prefs";
    private static final String KEY_PIN = "master_pin";
    private static final String KEY_WALLPAPER = "wallpaper";
    private static final String KEY_LOCK_ACTIVE = "lock_active";

    public AndroidBridge(MainActivity activity) {
        this.activity = activity;
        this.prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    // ==========================================
    // PIN & SECURITY
    // ==========================================

    @JavascriptInterface
    public boolean isPinSet() {
        return prefs.contains(KEY_PIN) && !prefs.getString(KEY_PIN, "").isEmpty();
    }

    @JavascriptInterface
    public boolean setPin(String newPin) {
        if (newPin == null || newPin.trim().length() < 4) {
            return false;
        }
        prefs.edit().putString(KEY_PIN, newPin.trim()).apply();
        return true;
    }

    @JavascriptInterface
    public boolean verifyPin(String pin) {
        if (!isPinSet()) {
            return false;
        }
        String storedPin = prefs.getString(KEY_PIN, "");
        return storedPin.equals(pin != null ? pin.trim() : "");
    }

    @JavascriptInterface
    public boolean changePin(String oldPin, String newPin) {
        if (verifyPin(oldPin)) {
            return setPin(newPin);
        }
        return false;
    }

    @JavascriptInterface
    public boolean isLockActive() {
        return prefs.getBoolean(KEY_LOCK_ACTIVE, true);
    }

    @JavascriptInterface
    public void setLockActive(boolean active) {
        prefs.edit().putBoolean(KEY_LOCK_ACTIVE, active).apply();
    }

    @JavascriptInterface
    public void exitToAndroid(String pin) {
        if (verifyPin(pin)) {
            activity.runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_MAIN);
                    intent.addCategory(Intent.CATEGORY_HOME);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    Intent chooser = Intent.createChooser(intent, "Select Home Launcher");
                    activity.startActivity(chooser);
                } catch (Exception e) {
                    try {
                        Intent settings = new Intent(Settings.ACTION_HOME_SETTINGS);
                        settings.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(settings);
                    } catch (Exception ex) {
                        ex.printStackTrace();
                    }
                }
            });
        }
    }

    @JavascriptInterface
    public void openAndroidSettings(String pin) {
        if (verifyPin(pin)) {
            activity.runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_SETTINGS);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activity.startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }

    // ==========================================
    // SOUND & FEEDBACK
    // ==========================================

    @JavascriptInterface
    public void playNotificationSound() {
        playSound(R.raw.ding);
    }

    @JavascriptInterface
    public void playChordSound() {
        playSound(R.raw.chord);
    }

    @JavascriptInterface
    public void playTadaSound() {
        playSound(R.raw.tada);
    }

    @JavascriptInterface
    public void playClickSound() {
        playSound(R.raw.click);
    }

    private void playSound(int resId) {
        activity.runOnUiThread(() -> {
            try {
                MediaPlayer mp = MediaPlayer.create(activity, resId);
                if (mp != null) {
                    mp.setOnCompletionListener(MediaPlayer::release);
                    mp.start();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @JavascriptInterface
    public void vibrate(int ms) {
        try {
            Vibrator v = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                v.vibrate(Math.min(ms, 1000));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ==========================================
    // BATTERY & SYSTEM STATUS
    // ==========================================

    @JavascriptInterface
    public int getBatteryPercent() {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = activity.registerReceiver(null, ifilter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) {
                    return (int) ((level / (float) scale) * 100);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 100;
    }

    @JavascriptInterface
    public boolean isBatteryCharging() {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = activity.registerReceiver(null, ifilter);
            if (batteryStatus != null) {
                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                return status == BatteryManager.BATTERY_STATUS_CHARGING ||
                        status == BatteryManager.BATTERY_STATUS_FULL;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    // ==========================================
    // PERMISSIONS
    // ==========================================

    @JavascriptInterface
    public void requestAllPermissions() {
        activity.runOnUiThread(activity::checkAndRequestPermissions);
    }

    @JavascriptInterface
    public String checkPermissionsStatus() {
        JSONObject obj = new JSONObject();
        try {
            obj.put("phone", ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED);
            obj.put("contacts", ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED);
            obj.put("sms", ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED);
            obj.put("location", ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return obj.toString();
    }

    // ==========================================
    // PHONE & CALL LOGS (Redmi / Xiaomi Safe Query)
    // ==========================================

    @JavascriptInterface
    public void makeCall(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
        final String cleanNumber = phoneNumber.replaceAll("[^0-9+*#]", "");
        activity.runOnUiThread(() -> {
            try {
                Intent intent;
                Uri telUri = Uri.fromParts("tel", cleanNumber, null);
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                    intent = new Intent(Intent.ACTION_CALL, telUri);
                } else {
                    intent = new Intent(Intent.ACTION_DIAL, telUri);
                }
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @JavascriptInterface
    public String getCallLogJson() {
        JSONArray array = new JSONArray();
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            return array.toString();
        }
        try {
            ContentResolver cr = activity.getContentResolver();
            // Note: sortOrder without LIMIT keyword to prevent IllegalArgumentException on MIUI/Redmi ROMs
            Cursor cursor = cr.query(
                    CallLog.Calls.CONTENT_URI,
                    new String[]{CallLog.Calls.NUMBER, CallLog.Calls.CACHED_NAME, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION},
                    null, null,
                    CallLog.Calls.DATE + " DESC"
            );
            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < 50) {
                    JSONObject item = new JSONObject();
                    String number = cursor.getString(0);
                    String name = cursor.getString(1);
                    int type = cursor.getInt(2);
                    long date = cursor.getLong(3);
                    long duration = cursor.getLong(4);

                    String typeStr = "outgoing";
                    if (type == CallLog.Calls.INCOMING_TYPE) typeStr = "incoming";
                    else if (type == CallLog.Calls.MISSED_TYPE) typeStr = "missed";

                    item.put("number", number != null ? number : "");
                    item.put("name", name != null ? name : (number != null ? number : "Unknown"));
                    item.put("type", typeStr);
                    item.put("date", date);
                    item.put("duration", duration);
                    array.put(item);
                    count++;
                }
                cursor.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array.toString();
    }

    // ==========================================
    // CONTACTS
    // ==========================================

    @JavascriptInterface
    public String getContactsJson() {
        JSONArray array = new JSONArray();
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return array.toString();
        }
        try {
            ContentResolver cr = activity.getContentResolver();
            Cursor cursor = cr.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{
                            ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                            ContactsContract.CommonDataKinds.Phone.NUMBER
                    },
                    null, null,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
            );
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    JSONObject item = new JSONObject();
                    String id = cursor.getString(0);
                    String name = cursor.getString(1);
                    String number = cursor.getString(2);
                    item.put("id", id != null ? id : "");
                    item.put("name", name != null ? name : (number != null ? number : "Unknown"));
                    item.put("number", number != null ? number : "");
                    array.put(item);
                }
                cursor.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array.toString();
    }

    @JavascriptInterface
    public boolean addContact(String name, String phone) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        try {
            ArrayList<ContentProviderOperation> ops = new ArrayList<>();
            ops.add(ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                    .build());

            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, name)
                    .build());

            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, phone)
                    .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE)
                    .build());

            activity.getContentResolver().applyBatch(ContactsContract.AUTHORITY, ops);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    // ==========================================
    // SMS (Redmi / Xiaomi Safe Query & Sent Sync)
    // ==========================================

    @JavascriptInterface
    public String getSmsInboxJson() {
        JSONArray array = new JSONArray();
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            return array.toString();
        }
        try {
            Uri uriSms = Uri.parse("content://sms/");
            // sortOrder without LIMIT keyword to prevent exception on MIUI/Redmi ROMs
            Cursor cursor = activity.getContentResolver().query(
                    uriSms,
                    new String[]{"_id", "address", "body", "date", "type", "read"},
                    null, null,
                    "date DESC"
            );
            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < 60) {
                    JSONObject item = new JSONObject();
                    item.put("id", cursor.getString(0));
                    item.put("address", cursor.getString(1) != null ? cursor.getString(1) : "Unknown");
                    item.put("body", cursor.getString(2) != null ? cursor.getString(2) : "");
                    item.put("date", cursor.getLong(3));
                    item.put("type", cursor.getInt(4)); // 1 = inbox, 2 = sent
                    item.put("read", cursor.getInt(5));
                    array.put(item);
                    count++;
                }
                cursor.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array.toString();
    }

    @JavascriptInterface
    public boolean sendSms(String destination, String message) {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = activity.getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }
            if (smsManager == null) {
                smsManager = SmsManager.getDefault();
            }
            final String cleanDest = destination != null ? destination.replaceAll("[^0-9+]", "") : "";
            if (cleanDest.isEmpty()) return false;

            ArrayList<String> parts = smsManager.divideMessage(message);
            smsManager.sendMultipartTextMessage(cleanDest, null, parts, null, null);

            // Save sent SMS to device ContentProvider if possible
            try {
                ContentValues values = new ContentValues();
                values.put("address", cleanDest);
                values.put("body", message);
                values.put("date", System.currentTimeMillis());
                values.put("type", 2); // 2 = sent
                values.put("read", 1);
                activity.getContentResolver().insert(Uri.parse("content://sms/sent"), values);
            } catch (Exception ignored) {}

            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    // ==========================================
    // GPS & LOCATION (Bypasses WebView file:// restrictions)
    // ==========================================

    @JavascriptInterface
    public String getCurrentLocationJson() {
        JSONObject obj = new JSONObject();
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return obj.toString();
        }
        try {
            LocationManager lm = (LocationManager) activity.getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                Location bestLoc = null;
                if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    @SuppressLint("MissingPermission")
                    Location gps = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    if (gps != null) bestLoc = gps;
                }
                if (bestLoc == null && lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    @SuppressLint("MissingPermission")
                    Location net = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    if (net != null) bestLoc = net;
                }
                if (bestLoc != null) {
                    obj.put("lat", bestLoc.getLatitude());
                    obj.put("lon", bestLoc.getLongitude());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return obj.toString();
    }

    // ==========================================
    // IN-APP RETRO BROWSER (For WhatsApp Web & Gmail)
    // ==========================================

    @JavascriptInterface
    public void openRetroBrowser(String url, String title) {
        activity.runOnUiThread(() -> activity.openRetroBrowser(url, title));
    }

    // ==========================================
    // WHATSAPP INTEGRATION
    // ==========================================

    @JavascriptInterface
    public boolean openWhatsAppDirect(String phone, String text) {
        try {
            String cleanPhone = phone.replaceAll("[^0-9]", "");
            String url = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + URLEncoder.encode(text, "UTF-8");
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.setPackage("com.whatsapp");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            return true;
        } catch (Exception e) {
            try {
                String cleanPhone = phone.replaceAll("[^0-9]", "");
                String url = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + URLEncoder.encode(text, "UTF-8");
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(intent);
                return true;
            } catch (Exception ex) {
                ex.printStackTrace();
                return false;
            }
        }
    }

    @JavascriptInterface
    public boolean isAppInstalled(String packageName) {
        try {
            activity.getPackageManager().getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ==========================================
    // WALLPAPER / SETTINGS
    // ==========================================

    @JavascriptInterface
    public String getWallpaperSetting() {
        return prefs.getString(KEY_WALLPAPER, "teal");
    }

    @JavascriptInterface
    public void setWallpaperSetting(String wallpaper) {
        prefs.edit().putString(KEY_WALLPAPER, wallpaper).apply();
    }

    // ==========================================
    // HARDWARE FLASHLIGHT (Torch 98)
    // ==========================================
    private boolean isFlashlightActive = false;

    @JavascriptInterface
    public boolean toggleFlashlight() {
        return setFlashlight(!isFlashlightActive);
    }

    @JavascriptInterface
    public boolean setFlashlight(boolean on) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                CameraManager camManager = (CameraManager) activity.getSystemService(Context.CAMERA_SERVICE);
                if (camManager != null) {
                    String[] ids = camManager.getCameraIdList();
                    if (ids.length > 0) {
                        camManager.setTorchMode(ids[0], on);
                        isFlashlightActive = on;
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    @JavascriptInterface
    public boolean isFlashlightOn() {
        return isFlashlightActive;
    }

    // ==========================================
    // AUDIO & RINGER MODE (Volume / Sound 98)
    // ==========================================

    @JavascriptInterface
    public int getRingerMode() {
        try {
            AudioManager am = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                return am.getRingerMode(); // 0 = SILENT, 1 = VIBRATE, 2 = NORMAL
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 2;
    }

    @JavascriptInterface
    public boolean setRingerMode(int mode) {
        try {
            AudioManager am = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.setRingerMode(mode);
                return true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    // ==========================================
    // SYSTEM DIAGNOSTICS & STORAGE (dxdiag & cleanmgr)
    // ==========================================

    @JavascriptInterface
    public String getSystemDiagnosticsJson() {
        JSONObject obj = new JSONObject();
        try {
            obj.put("model", Build.MODEL);
            obj.put("manufacturer", Build.MANUFACTURER);
            obj.put("device", Build.DEVICE);
            obj.put("product", Build.PRODUCT);
            obj.put("androidVersion", Build.VERSION.RELEASE);
            obj.put("sdkInt", Build.VERSION.SDK_INT);
            obj.put("cpuAbi", Build.SUPPORTED_ABIS != null && Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "arm64-v8a");
            obj.put("uptimeHours", Math.round((SystemClock.elapsedRealtime() / (1000.0 * 60 * 60)) * 10.0) / 10.0);

            // Memory
            ActivityManager actManager = (ActivityManager) activity.getSystemService(Context.ACTIVITY_SERVICE);
            if (actManager != null) {
                ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
                actManager.getMemoryInfo(memInfo);
                obj.put("totalMemMb", memInfo.totalMem / (1024 * 1024));
                obj.put("availMemMb", memInfo.availMem / (1024 * 1024));
                obj.put("lowMemory", memInfo.lowMemory);
            }

            // Carrier
            TelephonyManager tm = (TelephonyManager) activity.getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                String carrier = tm.getNetworkOperatorName();
                obj.put("carrier", carrier != null && !carrier.isEmpty() ? carrier : "Cellular Ready");
            }

            // Storage
            File dataDir = Environment.getDataDirectory();
            long totalBytes = dataDir.getTotalSpace();
            long freeBytes = dataDir.getFreeSpace();
            obj.put("totalStorageMb", totalBytes / (1024 * 1024));
            obj.put("freeStorageMb", freeBytes / (1024 * 1024));

            // Battery
            obj.put("batteryLevel", getBatteryPercent());
            obj.put("isCharging", isBatteryCharging());
            obj.put("flashlightOn", isFlashlightActive);
            obj.put("ringerMode", getRingerMode());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return obj.toString();
    }

    // ==========================================
    // BACKUP & RESTORE DATA (Registry Wizard)
    // ==========================================
    private static final String KEY_BACKUP_BLOB = "system_backup_blob";

    @JavascriptInterface
    public boolean saveBackupData(String jsonString) {
        if (jsonString == null || jsonString.isEmpty()) return false;
        try {
            prefs.edit().putString(KEY_BACKUP_BLOB, jsonString).apply();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    @JavascriptInterface
    public String loadBackupData() {
        return prefs.getString(KEY_BACKUP_BLOB, "");
    }
}
