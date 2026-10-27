package com.abdelghany.tazkeer.adhan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AdhanBootReceiver extends BroadcastReceiver {
    private static final String TAG = "AdhanBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        Log.i(TAG, "Received system broadcast: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            Intent.ACTION_TIME_SET.equals(action) ||
            Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            Intent.ACTION_DATE_CHANGED.equals(action)) {

            Log.i(TAG, "Triggering automatic alarm rescheduling after " + action);
            try {
                AdhanAlarmManager.getInstance(context).rescheduleSavedAlarms();
            } catch (Exception e) {
                Log.e(TAG, "Error rescheduling alarms after system broadcast", e);
            }
        }
    }
}
