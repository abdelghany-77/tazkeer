package com.abdelghany.tazkeer.adhan;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.abdelghany.tazkeer.MainActivity;
import com.abdelghany.tazkeer.R;

public class AdhanPlaybackService extends Service implements
        MediaPlayer.OnCompletionListener,
        MediaPlayer.OnErrorListener,
        AudioManager.OnAudioFocusChangeListener {

    private static final String TAG = "AdhanPlaybackService";

    public static final String ACTION_START_ADHAN = "com.abdelghany.tazkeer.action.START_ADHAN";
    public static final String ACTION_STOP_ADHAN = "com.abdelghany.tazkeer.action.STOP_ADHAN";

    public static final String EXTRA_ALARM_ID = "extra_alarm_id";
    public static final String EXTRA_PRAYER_KEY = "extra_prayer_key";
    public static final String EXTRA_PRAYER_NAME = "extra_prayer_name";
    public static final String EXTRA_SOUND_RES = "extra_sound_res";

    private static final String CHANNEL_ID = "tazkeer_adhan_playback_v3";
    private static final int NOTIFICATION_ID = 88881;

    private static volatile boolean sIsPlaying = false;

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private PowerManager.WakeLock wakeLock;
    private boolean isStopping = false;

    public static boolean isPlaying() {
        return sIsPlaying;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tazkeer:AdhanPlaybackWakeLock");
            wakeLock.setReferenceCounted(false);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP_ADHAN.equals(action)) {
            Log.i(TAG, "Stop Adhan requested by user.");
            stopPlaybackAndService();
            return START_NOT_STICKY;
        }

        if (ACTION_START_ADHAN.equals(action)) {
            isStopping = false;
            String prayerKey = intent.getStringExtra(EXTRA_PRAYER_KEY);
            String prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME);
            String soundRes = intent.getStringExtra(EXTRA_SOUND_RES);

            if (prayerName == null || prayerName.trim().isEmpty()) {
                prayerName = "الصلاة";
            }

            Log.i(TAG, "Starting Adhan foreground service for " + prayerName + " (sound: " + soundRes + ")");
            startAdhanPlayback(prayerKey, prayerName, soundRes);
            return START_NOT_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void startAdhanPlayback(String prayerKey, String prayerName, String soundRes) {
        // 1. Create Notification Channel
        createNotificationChannel();

        // 2. Build Foreground Notification with Stop Action
        Notification notification = buildNotification(prayerName);

        // 3. Start Foreground
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                int serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
                startForeground(NOTIFICATION_ID, notification, serviceType);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground service", e);
        }

        // 4. Acquire WakeLock
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(4 * 60 * 1000L); // 4 minutes max for Adhan
        }

        // 5. Request Audio Focus
        if (!requestAudioFocus()) {
            Log.w(TAG, "Audio focus denied, continuing with playback anyway");
        }

        // 6. Initialize MediaPlayer
        try {
            if (mediaPlayer != null) {
                mediaPlayer.release();
                mediaPlayer = null;
            }

            mediaPlayer = new MediaPlayer();
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.setLooping(false);
            mediaPlayer.setOnCompletionListener(this);
            mediaPlayer.setOnErrorListener(this);

            int rawResId = resolveAudioResourceId(prayerKey, soundRes);
            Log.i(TAG, "Playing audio resource ID: " + rawResId);

            AssetFileDescriptor afd = getResources().openRawResourceFd(rawResId);
            if (afd != null) {
                mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
            } else {
                Log.e(TAG, "Failed to open raw audio file descriptor");
                stopPlaybackAndService();
                return;
            }

            mediaPlayer.prepare();
            mediaPlayer.start();
            sIsPlaying = true;
            Log.i(TAG, "Adhan audio playback started successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Exception during MediaPlayer initialization/playback", e);
            stopPlaybackAndService();
        }
    }

    private int resolveAudioResourceId(String prayerKey, String soundRes) {
        boolean isFajr = "Fajr".equalsIgnoreCase(prayerKey);

        if (soundRes != null && !soundRes.trim().isEmpty()) {
            String cleanName = soundRes;
            if (cleanName.endsWith(".mp3")) {
                cleanName = cleanName.substring(0, cleanName.length() - 4);
            }
            int id = getResources().getIdentifier(cleanName, "raw", getPackageName());
            if (id != 0) {
                return id;
            }
        }

        if (isFajr) {
            int fajrId = getResources().getIdentifier("adhan_fajr", "raw", getPackageName());
            if (fajrId != 0) return fajrId;
        }

        int defaultId = getResources().getIdentifier("adhan", "raw", getPackageName());
        if (defaultId != 0) return defaultId;

        return R.raw.adhan;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "أذان الصلاة (تشغيل مباشر)",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("إشعار تشغيل صوت الأذان لمواقيت الصلاة مع إمكانية الإيقاف");
                channel.setSound(null, null); // Handled by MediaPlayer
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.enableVibration(true);
                channel.setShowBadge(true);
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String prayerName) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(this, 1001, launchIntent, piFlags);

        Intent stopIntent = new Intent(this, AdhanPlaybackService.class);
        stopIntent.setAction(ACTION_STOP_ADHAN);
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 1002, stopIntent, piFlags);

        int smallIcon = getResources().getIdentifier("ic_stat_name", "drawable", getPackageName());
        if (smallIcon == 0) {
            smallIcon = R.mipmap.ic_launcher;
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(smallIcon)
                .setContentTitle("حان الآن موعد أذان " + prayerName)
                .setContentText("يُرفع الآن صوت الأذان.. تقبل الله طاعتكم")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(contentIntent)
                .addAction(android.R.drawable.ic_media_pause, "إيقاف الأذان", stopPendingIntent)
                .build();
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();

            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(playbackAttributes)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(this)
                    .build();

            int res = audioManager.requestAudioFocus(audioFocusRequest);
            return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } else {
            @SuppressWarnings("deprecation")
            int res = audioManager.requestAudioFocus(
                    this,
                    AudioManager.STREAM_ALARM,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            );
            return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            } else {
                @SuppressWarnings("deprecation")
                int ignored = audioManager.abandonAudioFocus(this);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error abandoning audio focus", e);
        }
    }

    @Override
    public void onAudioFocusChange(int focusChange) {
        Log.i(TAG, "Audio focus changed: " + focusChange);
        if (focusChange == AudioManager.AUDIOFOCUS_LOSS ||
            focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            stopPlaybackAndService();
        }
    }

    @Override
    public void onCompletion(MediaPlayer mp) {
        Log.i(TAG, "Adhan playback completed naturally.");
        stopPlaybackAndService();
    }

    @Override
    public boolean onError(MediaPlayer mp, int what, int extra) {
        Log.e(TAG, "MediaPlayer error occurred: what=" + what + ", extra=" + extra);
        stopPlaybackAndService();
        return true;
    }

    private void stopPlaybackAndService() {
        if (isStopping) return;
        isStopping = true;
        sIsPlaying = false;
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception e) {
            Log.w(TAG, "Error releasing MediaPlayer", e);
        }

        abandonAudioFocus();

        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
        } catch (Exception ignored) {}

        stopSelf();
        Log.i(TAG, "Adhan playback service stopped and cleaned up.");
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Keep the adhan playing even if the user swipes the app away from recents.
        Log.i(TAG, "Task removed while Adhan is playing, keeping service alive.");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        stopPlaybackAndService();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
