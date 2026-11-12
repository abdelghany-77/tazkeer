package com.abdelghany.tazkeer.adhan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

/**
 * ============================================================================
 * AdhanAlarmReceiver — entry point fired by AlarmManager.setAlarmClock().
 * ============================================================================
 *
 * Runs in a BroadcastReceiver context, so it must do almost nothing:
 *  1. Acquire a short bridge wake lock (the service acquires its own).
 *  2. Start {@link AdhanPlaybackService} as a foreground service.
 *
 * Exact alarms created with setAlarmClock() are exempt from the Android 12+
 * restriction on starting foreground services from the background, which is
 * precisely why this architecture works while the app is killed.
 */
public class AdhanAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "TazkeerAdhan";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }

        Log.i(TAG, "Adhan alarm received: " + intent.getStringExtra(AdhanAlarmManager.EXTRA_PRAYER));

        // Bridge wake lock: gives the service time to launch and acquire its own wake lock.
        // On aggressive Doze mode, releasing this immediately in finally causes the CPU
        // to sleep before AdhanPlaybackService onCreate/onStartCommand runs.
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock bridgeLock = null;
        if (powerManager != null) {
            bridgeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "Tazkeer:AdhanBridge"
            );
            bridgeLock.setReferenceCounted(false);
            bridgeLock.acquire(15_000L); // Automatically expires in 15 seconds
        }

        String sound = intent.getStringExtra(AdhanAlarmManager.EXTRA_SOUND);
        String prayer = intent.getStringExtra(AdhanAlarmManager.EXTRA_PRAYER);
        String label = intent.getStringExtra(AdhanAlarmManager.EXTRA_LABEL);
        boolean isFajr = intent.getBooleanExtra(AdhanAlarmManager.EXTRA_FAJR, false);
        float volume = intent.getFloatExtra(AdhanAlarmManager.EXTRA_VOLUME, 1.0f);

        Intent serviceIntent = new Intent(context, AdhanPlaybackService.class);
        serviceIntent.setAction(AdhanPlaybackService.ACTION_PLAY);
        serviceIntent.putExtra(AdhanPlaybackService.EXTRA_SOUND, sound);
        serviceIntent.putExtra(AdhanPlaybackService.EXTRA_PRAYER, prayer);
        serviceIntent.putExtra(AdhanPlaybackService.EXTRA_LABEL, label);
        serviceIntent.putExtra(AdhanPlaybackService.EXTRA_FAJR, isFajr);
        serviceIntent.putExtra(AdhanPlaybackService.EXTRA_VOLUME, volume);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            // Some OEMs (MIUI/EMUI) throw even for exact alarms. Log loudly so
            // the failure is visible in `adb logcat -s TazkeerAdhan`.
            Log.e(TAG, "Unable to start AdhanPlaybackService", e);
            if (bridgeLock != null && bridgeLock.isHeld()) {
                try {
                    bridgeLock.release();
                } catch (Exception ignored) {
                }
            }
        }
    }
}
