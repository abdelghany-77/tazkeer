package com.abdelghany.tazkeer.adhan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * ============================================================================
 * AdhanBootReceiver — self-healing schedule across reboots & clock changes.
 * ============================================================================
 *
 * AlarmManager forgets all alarms when the device reboots. Android also does
 * not adjust RTC alarms when the user changes the timezone or the wall clock.
 *
 * This receiver reloads the persisted 7-day ledger and re-registers every
 * future alarm with setAlarmClock(), recomputing epoch millis from the stored
 * local date + HH:mm when available (so timezone travel stays correct).
 *
 * Notes:
 *  - BOOT_COMPLETED is not delivered if the user force-stopped the app from
 *    Settings. Opening the app once restores the schedule.
 *  - MY_PACKAGE_REPLACED covers APK updates.
 */
public class AdhanBootReceiver extends BroadcastReceiver {

    private static final String TAG = "TazkeerAdhan";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        Log.i(TAG, "Rescheduling adhan alarms after: " + action);

        try {
            int restored = AdhanAlarmManager.rescheduleStored(context);
            Log.i(TAG, "Restored " + restored + " adhan alarms");
            int adhkarRestored = AdhkarAlarmManager.rescheduleStored(context);
            Log.i(TAG, "Restored " + adhkarRestored + " adhkar reminders");
        } catch (Exception e) {
            Log.e(TAG, "Failed to restore adhan alarms", e);
        }
    }
}
