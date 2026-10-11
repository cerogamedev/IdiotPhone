package com.idiotphone.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;

public class PhoneCallReceiver extends BroadcastReceiver {
    private static String lastState = TelephonyManager.EXTRA_STATE_IDLE;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        if (intent.getAction().equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
                if (!TelephonyManager.EXTRA_STATE_RINGING.equals(lastState)) {
                    MainActivity.notifyIncomingCall(incomingNumber != null ? incomingNumber : "Unknown Number");
                }
            } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state) || TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
                if (TelephonyManager.EXTRA_STATE_RINGING.equals(lastState)) {
                    MainActivity.dismissIncomingCall();
                }
            }
            lastState = state != null ? state : TelephonyManager.EXTRA_STATE_IDLE;
        }
    }
}
