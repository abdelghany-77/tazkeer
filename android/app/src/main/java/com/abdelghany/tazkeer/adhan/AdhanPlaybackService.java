package com.abdelghany.tazkeer.adhan;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import com.abdelghany.tazkeer.MainActivity;
import com.abdelghany.tazkeer.R;

/**
 * ============================================================================
 * AdhanPlaybackService — foreground audio service for the call to prayer.
 * ============================================================================
 *
 * Why a foreground service?
 *  - MediaPlayer must keep running while the app UI is dead, the screen is off
 *    and the device is in Doze. A foreground service + partial wake lock is the
 *    only supported way to guarantee that on modern Android.
 *
 * Audio routing:
 *  - AudioAttributes.USAGE_ALARM routes through the ALARM stream, so the adhan
 *    is audible even when the phone is on Silent or Vibrate. The user's alarm
 *    volume slider still applies (we intentionally never force device volume).
 *
 * Resilience:
 *  - PARTIAL_WAKE_LOCK keeps the CPU alive while the MP3 decodes.
 *  - A 6-minute watchdog stops the service if MediaPlayer never reports
 *    completion (corrupt asset, OEM audio bug, etc.).
 *  - The notification exposes a single "إيقاف الأذان" action.
 */
public class AdhanPlaybackService extends Service {

    private static final String TAG = "TazkeerAdhan";

    public static final String ACTION_PLAY = "com.abdelghany.tazkeer.adhan.ACTION_PLAY";
    public static final String ACTION_STOP = "com.abdelghany.tazkeer.adhan.ACTION_STOP";
    public static final String ACTION_SET_VOLUME = "com.abdelghany.tazkeer.adhan.ACTION_SET_VOLUME";

    public static final String EXTRA_SOUND = "adhan_sound";
    public static final String EXTRA_PRAYER = "adhan_prayer";
    public static final String EXTRA_LABEL = "adhan_label";
    public static final String EXTRA_FAJR = "adhan_is_fajr";
    public static final String EXTRA_VOLUME = "adhan_volume";

    private static final String CHANNEL_ID = "adhan_playback_v1";
    private static final int NOTIFICATION_ID = 7301;
    private static final long WAKE_LOCK_TIMEOUT_MS = 10 * 60 * 1000L; // safety ceiling
    private static final long WATCHDOG_TIMEOUT_MS = 6 * 60 * 1000L;

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private final Handler watchdog = new Handler(Looper.getMainLooper());
    private final Runnable watchdogStop = new Runnable() {
        @Override
        public void run() {
            Log.w(TAG, "Adhan playback watchdog fired, stopping service");
            stopPlayback();
        }
    };

    private final AudioManager.OnAudioFocusChangeListener focusListener =
            new AudioManager.OnAudioFocusChangeListener() {
                @Override
                public void onAudioFocusChange(int focusChange) {
                    // Alarms are a high-priority stream. We acknowledge focus
                    // changes but never stop the adhan because another app
                    // grabbed focus — the user must hear the call to prayer.
                    Log.d(TAG, "Audio focus changed: " + focusChange);
                }
            };

    // ------------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------------

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopPlayback();
            return START_NOT_STICKY;
        }

        if (intent != null && ACTION_SET_VOLUME.equals(intent.getAction())) {
            float newVol = clamp(intent.getFloatExtra(EXTRA_VOLUME, 1.0f));
            if (mediaPlayer != null) {
                float logVol = calculateLogVolume(newVol);
                try {
                    mediaPlayer.setVolume(logVol, logVol);
                    Log.i(TAG, "Adhan active volume updated to: " + newVol + " (scalar=" + logVol + ")");
                } catch (Exception e) {
                    Log.w(TAG, "setVolume failed on active player", e);
                }
            }
            return START_NOT_STICKY;
        }

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String sound = sanitizeSound(intent.getStringExtra(EXTRA_SOUND));
        String prayer = safe(intent.getStringExtra(EXTRA_PRAYER));
        String label = safe(intent.getStringExtra(EXTRA_LABEL));
        boolean isFajr = intent.getBooleanExtra(EXTRA_FAJR, false);
        float volume = clamp(intent.getFloatExtra(EXTRA_VOLUME, 1.0f));

        // Must call startForeground within ~5 seconds of being started.
        Notification notification = buildNotification(prayer, label, isFajr);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            // Android 14+ can reject the mediaPlayback FGS type if the
            // corresponding permission/manifest entry is missing. Fail loudly
            // instead of crashing the user's device at prayer time.
            Log.e(TAG, "Unable to promote service to foreground", e);
            stopSelf();
            return START_NOT_STICKY;
        }

        acquireWakeLock();
        play(sound, volume);

        // START_REDELIVER_INTENT means a service killed mid-adhan is restarted
        // with the same sound metadata instead of silently dying.
        return START_REDELIVER_INTENT;
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        releaseWakeLock();
        abandonAudioFocus();
        watchdog.removeCallbacks(watchdogStop);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /** Stops playback from anywhere in the app (JS bridge, notification action). */
    public static void stop(Context context) {
        try {
            context.stopService(new Intent(context, AdhanPlaybackService.class));
        } catch (Exception e) {
            Log.e(TAG, "stopService failed", e);
        }
    }

    /** Dynamically updates playback volume while the Adhan is actively playing. */
    public static void updateVolume(Context context, float volume) {
        Intent intent = new Intent(context, AdhanPlaybackService.class);
        intent.setAction(ACTION_SET_VOLUME);
        intent.putExtra(EXTRA_VOLUME, volume);
        try {
            context.startService(intent);
        } catch (Exception e) {
            Log.e(TAG, "updateVolume failed", e);
        }
    }

    // ------------------------------------------------------------------------
    // Playback
    // ------------------------------------------------------------------------

    private void play(String soundName, float volume) {
        releasePlayer();

        int resId = getResources().getIdentifier(soundName, "raw", getPackageName());
        if (resId == 0) {
            resId = getResources().getIdentifier("adhan", "raw", getPackageName());
        }
        if (resId == 0) {
            Log.e(TAG, "No adhan audio asset found in res/raw");
            stopPlayback();
            return;
        }

        try {
            mediaPlayer = new MediaPlayer();

            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            mediaPlayer.setAudioAttributes(attributes);
            mediaPlayer.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);

            android.content.res.AssetFileDescriptor descriptor = null;
            try {
                descriptor = getResources().openRawResourceFd(resId);
            } catch (Exception e) {
                Log.w(TAG, "openRawResourceFd failed, will fallback to URI", e);
            }

            if (descriptor != null) {
                mediaPlayer.setDataSource(
                        descriptor.getFileDescriptor(),
                        descriptor.getStartOffset(),
                        descriptor.getLength()
                );
                descriptor.close();
            } else {
                mediaPlayer.setDataSource(
                        this,
                        android.net.Uri.parse(
                                "android.resource://" + getPackageName() + "/" + resId
                        )
                );
            }

            mediaPlayer.setLooping(false);
            mediaPlayer.setOnCompletionListener(mp -> {
                Log.i(TAG, "Adhan playback completed");
                stopPlayback();
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error what=" + what + " extra=" + extra);
                stopPlayback();
                return true;
            });

            requestAudioFocus();
            mediaPlayer.prepare();
            mediaPlayer.start();

            // Apply logarithmic volume AFTER start() so native AudioTrack applies gain
            float logVol = calculateLogVolume(volume);
            try {
                mediaPlayer.setVolume(logVol, logVol);
                Log.i(TAG, "Adhan playing with volume: " + volume + " (scalar=" + logVol + ")");
            } catch (Exception e) {
                Log.w(TAG, "Failed to apply volume to MediaPlayer", e);
            }

            watchdog.removeCallbacks(watchdogStop);
            watchdog.postDelayed(watchdogStop, WATCHDOG_TIMEOUT_MS);
        } catch (Exception e) {
            Log.e(TAG, "Unable to start adhan playback", e);
            stopPlayback();
        }
    }

    private void stopPlayback() {
        releasePlayer();
        releaseWakeLock();
        abandonAudioFocus();
        watchdog.removeCallbacks(watchdogStop);
        stopForeground(true);
        stopSelf();
    }

    private void releasePlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (IllegalStateException ignored) {
            }
            try {
                mediaPlayer.reset();
                mediaPlayer.release();
            } catch (Exception ignored) {
            }
            mediaPlayer = null;
        }
    }

    // ------------------------------------------------------------------------
    // Wake lock & audio focus
    // ------------------------------------------------------------------------

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            return;
        }
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) {
            return;
        }
        wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "Tazkeer:AdhanPlayback"
        );
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS);
        Log.d(TAG, "Partial wake lock acquired");
    }

    private void releaseWakeLock() {
        if (wakeLock != null) {
            try {
                if (wakeLock.isHeld()) {
                    wakeLock.release();
                }
            } catch (Exception ignored) {
            }
            wakeLock = null;
            Log.d(TAG, "Partial wake lock released");
        }
    }

    private void requestAudioFocus() {
        if (audioManager == null) {
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(attributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(focusListener)
                        .build();
                audioManager.requestAudioFocus(focusRequest);
            } else {
                audioManager.requestAudioFocus(
                        focusListener,
                        AudioManager.STREAM_ALARM,
                        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
                );
            }
        } catch (Exception e) {
            // Playback continues even if focus is denied — alarms take priority.
            Log.w(TAG, "Audio focus request failed", e);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) {
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focusRequest != null) {
                    audioManager.abandonAudioFocusRequest(focusRequest);
                    focusRequest = null;
                }
            } else {
                audioManager.abandonAudioFocus(focusListener);
            }
        } catch (Exception ignored) {
        }
    }

    // ------------------------------------------------------------------------
    // Notification
    // ------------------------------------------------------------------------

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
        if (existing != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "الأذان",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("تشغيل الأذان في وقته المحدد حتى لو كان التطبيق مغلقاً");
        // The MediaPlayer plays the audio; the channel must stay silent to
        // avoid a double notification sound on top of the adhan.
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private Notification buildNotification(String prayer, String label, boolean isFajr) {
        String title;
        if (!label.isEmpty()) {
            title = label;
        } else if (!prayer.isEmpty()) {
            title = "حان الآن وقت صلاة " + prayer;
        } else {
            title = "حان الآن وقت الصلاة";
        }

        String body = isFajr
                ? "الصلاة خير من النوم — أذان الفجر"
                : "أذان — ذَكِّرْ";

        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(
                this,
                NOTIFICATION_ID,
                launchIntent,
                pendingFlags
        );

        Intent stopIntent = new Intent(this, AdhanPlaybackService.class);
        stopIntent.setAction(ACTION_STOP);
        stopIntent.setData(android.net.Uri.parse("tazkeer://adhan/stop"));
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this,
                NOTIFICATION_ID + 1,
                stopIntent,
                pendingFlags
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_adhan)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(contentIntent)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setColor(0xFFD4A847)
                .addAction(
                        android.R.drawable.ic_media_pause,
                        "إيقاف الأذان",
                        stopPendingIntent
                );

        try {
            android.graphics.Bitmap largeIcon = android.graphics.BitmapFactory.decodeResource(
                    getResources(),
                    R.mipmap.ic_launcher
            );
            if (largeIcon != null) {
                builder.setLargeIcon(largeIcon);
            }
        } catch (Exception ignored) {
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }

        // Ask the system to light up the lock screen for the prayer call.
        // On Android 14+ this is only honoured if USE_FULL_SCREEN_INTENT is
        // granted; otherwise the heads-up notification is still shown.
        try {
            builder.setFullScreenIntent(contentIntent, true);
        } catch (Exception ignored) {
        }

        return builder.build();
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static float clamp(float value) {
        if (Float.isNaN(value)) {
            return 1.0f;
        }
        return Math.max(0.05f, Math.min(1.0f, value));
    }

    private static float calculateLogVolume(float volume) {
        float clamped = clamp(volume);
        if (clamped >= 0.98f) {
            return 1.0f;
        }
        if (clamped <= 0.05f) {
            return 0.02f;
        }
        // Quadratic logarithmic perceptual curve: human ears perceive loudness exponentially.
        // A linear slider at 50% gives 0.25 (-12dB), sounding perceptually like half volume.
        return (float) Math.pow(clamped, 2.0);
    }

    private static String sanitizeSound(String sound) {
        if (sound == null || sound.isEmpty()) {
            return "adhan";
        }
        // res/raw identifiers are lowercase letters, digits and underscores.
        if (!sound.matches("[a-z0-9_]+")) {
            return "adhan";
        }
        return sound;
    }
}
