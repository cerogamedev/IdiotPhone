package com.idiotphone.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private static MainActivity instance;
    private WebView webView;
    private AndroidBridge bridge;
    private static final int PERMISSION_REQ_CODE = 1001;

    // Retro Browser Overlay
    private LinearLayout retroBrowserContainer;
    private TextView retroBrowserTitle;
    private WebView retroBrowserWebView;

    // Screen Lock & Receivers
    private boolean isScreenLocked = false;
    private BroadcastReceiver screenReceiver;
    private BroadcastReceiver batteryReceiver;

    // Kiosk Mode & Inescapable Launcher
    private boolean isKioskLocked = true;
    private boolean temporaryExitAllowed = false;

    public void allowTemporaryExit() {
        this.temporaryExitAllowed = true;
    }

    public void setKioskLocked(boolean locked) {
        this.isKioskLocked = locked;
    }

    public boolean isKioskLocked() {
        return this.isKioskLocked;
    }

    public void applyImmersiveSticky() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    public void dismissKeyguardIfPossible() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveSticky();
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (isKioskLocked && !temporaryExitAllowed) {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Aggressive kiosk recapture: bring right back if user tries to swipe away
        if (isKioskLocked && !temporaryExitAllowed) {
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (isKioskLocked && !temporaryExitAllowed && instance != null) {
                    try {
                        Intent intent = new Intent(this, MainActivity.class);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            }, 60);
        }
    }

    public static MainActivity getInstance() {
        return instance;
    }

    @SuppressLint({"SetJavaScriptEnabled"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        // Configure Window to take over screen lock & keep display alive
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(0xFF008080); // Win98 Teal
            window.setNavigationBarColor(0xFFC0C0C0); // Win98 Gray
        }

        // Show when device is locked & turn screen on directly
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            window.addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }

        applyImmersiveSticky();

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webview);

        initDesktopWebView();
        initRetroBrowserOverlay();
        initSystemReceivers();
        checkAndRequestPermissions();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void initDesktopWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        bridge = new AndroidBridge(this);
        webView.addJavascriptInterface(bridge, "AndroidBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                return super.onConsoleMessage(cm);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        // Load the Windows 98 desktop
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void initRetroBrowserOverlay() {
        retroBrowserContainer = findViewById(R.id.retro_browser_container);
        retroBrowserTitle = findViewById(R.id.retro_browser_title);
        retroBrowserWebView = findViewById(R.id.retro_browser_webview);

        Button btnBack = findViewById(R.id.retro_browser_back);
        Button btnRefresh = findViewById(R.id.retro_browser_refresh);
        Button btnClose = findViewById(R.id.retro_browser_close);

        WebSettings s = retroBrowserWebView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);

        // Enable Cookies
        CookieManager.getInstance().setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(retroBrowserWebView, true);
        }

        retroBrowserWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }
        });

        retroBrowserWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        btnBack.setOnClickListener(v -> {
            if (retroBrowserWebView.canGoBack()) {
                retroBrowserWebView.goBack();
            }
        });

        btnRefresh.setOnClickListener(v -> retroBrowserWebView.reload());

        btnClose.setOnClickListener(v -> closeRetroBrowser());
    }

    private void initSystemReceivers() {
        // Screen & Keyguard receiver for unescapable lock takeover
        screenReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                    isScreenLocked = true;
                } else if (Intent.ACTION_SCREEN_ON.equals(action) || Intent.ACTION_USER_PRESENT.equals(action)) {
                    // Force bring to front immediately upon screen turn-on or keyguard dismiss
                    if (isKioskLocked && !temporaryExitAllowed) {
                        try {
                            Intent bringFront = new Intent(context, MainActivity.class);
                            bringFront.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                            context.startActivity(bringFront);
                        } catch (Exception ignored) {}
                        dismissKeyguardIfPossible();
                    }
                }
            }
        };
        IntentFilter screenFilter = new IntentFilter();
        screenFilter.addAction(Intent.ACTION_SCREEN_OFF);
        screenFilter.addAction(Intent.ACTION_SCREEN_ON);
        screenFilter.addAction(Intent.ACTION_USER_PRESENT);
        registerReceiver(screenReceiver, screenFilter);

        // Battery status receiver
        batteryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                boolean charging = (status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL);
                if (level >= 0 && scale > 0 && webView != null) {
                    int pct = (int) ((level / (float) scale) * 100);
                    webView.evaluateJavascript("window.onBatteryChanged && window.onBatteryChanged(" + pct + ", " + charging + ");", null);
                }
            }
        };
        registerReceiver(batteryReceiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
    }

    public void openRetroBrowser(String url, String title) {
        if (retroBrowserContainer == null || retroBrowserWebView == null) return;
        retroBrowserTitle.setText(title != null ? title : "Internet Explorer");

        // WhatsApp Web requires desktop user agent
        if (url != null && url.contains("whatsapp.com")) {
            retroBrowserWebView.getSettings().setUserAgentString(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            );
        } else {
            retroBrowserWebView.getSettings().setUserAgentString(null);
        }

        retroBrowserWebView.loadUrl(url);
        retroBrowserContainer.setVisibility(View.VISIBLE);
    }

    public void closeRetroBrowser() {
        if (retroBrowserContainer != null) {
            retroBrowserWebView.loadUrl("about:blank");
            retroBrowserContainer.setVisibility(View.GONE);
        }
    }

    public void checkAndRequestPermissions() {
        String[] permissions = new String[]{
                Manifest.permission.CALL_PHONE,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_CALL_LOG,
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.WRITE_CONTACTS,
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.SEND_SMS,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.CAMERA
        };

        List<String> listPermissionsNeeded = new ArrayList<>();
        for (String p : permissions) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                listPermissionsNeeded.add(p);
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                listPermissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        if (!listPermissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this,
                    listPermissionsNeeded.toArray(new String[0]),
                    PERMISSION_REQ_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQ_CODE) {
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.evaluateJavascript("window.onPermissionsUpdated && window.onPermissionsUpdated();", null);
                }
            });
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        temporaryExitAllowed = false;
        applyImmersiveSticky();
        dismissKeyguardIfPossible();
        if (webView != null) {
            webView.evaluateJavascript("window.onDeviceResume && window.onDeviceResume();", null);
            if (isScreenLocked) {
                webView.evaluateJavascript("window.onScreenLockedResume && window.onScreenLockedResume();", null);
                isScreenLocked = false;
            }
        }
    }

    @Override
    public void onBackPressed() {
        // If retro browser overlay is visible, close it or navigate back
        if (retroBrowserContainer != null && retroBrowserContainer.getVisibility() == View.VISIBLE) {
            if (retroBrowserWebView.canGoBack()) {
                retroBrowserWebView.goBack();
            } else {
                closeRetroBrowser();
            }
            return;
        }

        // Forward to desktop JS window manager
        if (webView != null) {
            webView.evaluateJavascript("window.onBackPressed && window.onBackPressed();", null);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            onBackPressed();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    // Callbacks from BroadcastReceivers & Services with safe JSON escaping
    public static void notifyIncomingCall(String number) {
        if (instance != null && instance.webView != null) {
            instance.runOnUiThread(() -> {
                String safeNumber = JSONObject.quote(number != null ? number : "Unknown");
                instance.webView.evaluateJavascript("window.onIncomingCall && window.onIncomingCall(" + safeNumber + ");", null);
            });
        }
    }

    public static void dismissIncomingCall() {
        if (instance != null && instance.webView != null) {
            instance.runOnUiThread(() -> {
                instance.webView.evaluateJavascript("window.onDismissIncomingCall && window.onDismissIncomingCall();", null);
            });
        }
    }

    public static void notifyIncomingSms(String sender, String body) {
        if (instance != null && instance.webView != null) {
            instance.runOnUiThread(() -> {
                String safeSender = JSONObject.quote(sender != null ? sender : "Unknown");
                String safeBody = JSONObject.quote(body != null ? body : "");
                instance.webView.evaluateJavascript("window.onIncomingSms && window.onIncomingSms(" + safeSender + ", " + safeBody + ");", null);
            });
        }
    }

    public static void notifyIncomingWhatsApp(String sender, String body) {
        if (instance != null && instance.webView != null) {
            instance.runOnUiThread(() -> {
                String safeSender = JSONObject.quote(sender != null ? sender : "WhatsApp Contact");
                String safeBody = JSONObject.quote(body != null ? body : "");
                instance.webView.evaluateJavascript("window.onIncomingWhatsApp && window.onIncomingWhatsApp(" + safeSender + ", " + safeBody + ");", null);
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (screenReceiver != null) {
            try { unregisterReceiver(screenReceiver); } catch (Exception ignored) {}
        }
        if (batteryReceiver != null) {
            try { unregisterReceiver(batteryReceiver); } catch (Exception ignored) {}
        }
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }
}
