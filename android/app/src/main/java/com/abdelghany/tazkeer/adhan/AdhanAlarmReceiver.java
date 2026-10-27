package com.abdelghany.tazkeer.adhan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.content.ContextCompat;

public class AdhanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AdhanAlarmReceiver";

    public static final String ACTION_PRAYER_ALARM = "com.abdelghany.tazkeer.action.PRAYER_ALARM";
    public static final String EXTRA_ALARM_ID = "extra_alarm_id";
    public static final String EXTRA_PRAYER_KEY = "extra_prayer_key";
    public static final String EXTRA_PRAYER_NAME = "extra_prayer_name";
    public static final String EXTRA_SOUND_RES = "extra_sound_res";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "Adhan alarm broadcast received at " + System.currentTimeMillis());

        if (intent == null) return;

        // Acquire a temporary wake lock to ensure CPU remains active until service starts
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tazkeer:AdhanAlarmReceiverWakeLock");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(15000); // 15 seconds max timeout
        }

        try {
            int alarmId = intent.getIntExtra(EXTRA_ALARM_ID, 0);
            String prayerKey = intent.getStringExtra(EXTRA_PRAYER_KEY);
            String prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME);
            String soundRes = intent.getStringExtra(EXTRA_SOUND_RES);

            Log.i(TAG, "Triggering Adhan service for prayer: " + prayerKey + " (" + prayerName + "), sound: " + soundRes);

            Intent serviceIntent = new Intent(context, AdhanPlaybackService.class);
            serviceIntent.setAction(AdhanPlaybackService.ACTION_START_ADHAN);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_ALARM_ID, alarmId);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_PRAYER_KEY, prayerKey);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_PRAYER_NAME, prayerName);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_SOUND_RES, soundRes);

            ContextCompat.startForegroundService(context, serviceIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error starting AdhanPlaybackService from receiver", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }
}
