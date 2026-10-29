package com.abdelghany.tazkeer.adhan;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.abdelghany.tazkeer.MainActivity;
import com.abdelghany.tazkeer.R;

public class AdhanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AdhanAlarmReceiver";

    public static final String ACTION_PRAYER_ALARM = "com.abdelghany.tazkeer.action.PRAYER_ALARM";
    public static final String EXTRA_ALARM_ID = "extra_alarm_id";
    public static final String EXTRA_PRAYER_KEY = "extra_prayer_key";
    public static final String EXTRA_PRAYER_NAME = "extra_prayer_name";
    public static final String EXTRA_SOUND_RES = "extra_sound_res";

    private static final String FALLBACK_CHANNEL_ID = "tazkeer_adhan_fallback_v1";
    private static final int FALLBACK_NOTIFICATION_ID = 88882;

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

            if (prayerName == null || prayerName.trim().isEmpty()) {
                prayerName = "الصلاة";
            }

            Log.i(TAG, "Triggering Adhan service for prayer: " + prayerKey + " (" + prayerName + "), sound: " + soundRes);

            Intent serviceIntent = new Intent(context, AdhanPlaybackService.class);
            serviceIntent.setAction(AdhanPlaybackService.ACTION_START_ADHAN);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_ALARM_ID, alarmId);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_PRAYER_KEY, prayerKey);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_PRAYER_NAME, prayerName);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_SOUND_RES, soundRes);

            try {
                ContextCompat.startForegroundService(context, serviceIntent);
            } catch (Exception e) {
                // Android 12+ may block starting a foreground service from the
                // background (or the OEM may be aggressive). Fall back to a
                // high-priority notification that still plays the adhan sound.
                Log.e(TAG, "Could not start AdhanPlaybackService, using notification fallback", e);
                postFallbackNotification(context, prayerName, soundRes);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling Adhan alarm broadcast", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }

    private void postFallbackNotification(Context context, String prayerName, String soundRes) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Uri soundUri = resolveSoundUri(context, soundRes);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        FALLBACK_CHANNEL_ID,
                        "أذان الصلاة",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("صوت الأذان عند دخول وقت الصلاة");
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.enableVibration(true);
                if (soundUri != null) {
                    AudioAttributes attrs = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                    channel.setSound(soundUri, attrs);
                }
                nm.createNotificationChannel(channel);
            }

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                piFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentIntent = PendingIntent.getActivity(context, 1003, launchIntent, piFlags);

            int smallIcon = context.getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", context.getPackageName());
            if (smallIcon == 0) {
                smallIcon = R.mipmap.ic_launcher;
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, FALLBACK_CHANNEL_ID)
                    .setSmallIcon(smallIcon)
                    .setContentTitle("حان الآن موعد أذان " + prayerName)
                    .setContentText("حي على الصلاة، حي على الفلاح")
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setContentIntent(contentIntent);

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && soundUri != null) {
                builder.setSound(soundUri);
            }

            NotificationManagerCompat.from(context).notify(FALLBACK_NOTIFICATION_ID, builder.build());
            Log.i(TAG, "Fallback adhan notification posted.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to post fallback adhan notification", e);
        }
    }

    private Uri resolveSoundUri(Context context, String soundRes) {
        String cleanName = soundRes != null ? soundRes.trim() : "";
        if (cleanName.endsWith(".mp3")) {
            cleanName = cleanName.substring(0, cleanName.length() - 4);
        }
        if (cleanName.isEmpty()) {
            cleanName = "adhan";
        }

        int resId = context.getResources().getIdentifier(cleanName, "raw", context.getPackageName());
        if (resId == 0) {
            resId = context.getResources().getIdentifier("adhan", "raw", context.getPackageName());
        }
        if (resId == 0) return null;

        return Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/" + resId);
    }
}
