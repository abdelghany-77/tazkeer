package com.abdelghany.tazkeer.adhan;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.abdelghany.tazkeer.MainActivity;
import com.abdelghany.tazkeer.R;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;

/**
 * ============================================================================
 * AdhanSchedulerPlugin — Capacitor bridge for the native Adhan engine.
 * ============================================================================
 *
 * JavaScript API (registered as `AdhanScheduler`):
 *
 *   scheduleAlarms({ alarms: [...] })       -> replace the 7-day native schedule
 *   cancelAllAlarms()                       -> cancel all prayer alarms
 *   stopPlayback()                          -> instantly stop a playing adhan
 *   checkPermissions()                      -> notification / exact / battery status
 *   requestNotificationPermission()         -> Android 13 runtime prompt
 *   requestExactAlarmPermission()           -> "Alarms & reminders" settings page
 *   requestBatteryOptimizationExemption()   -> battery optimization dialog
 *   testAdhan({ delaySeconds, soundRes })   -> one-off test without wiping schedule
 *   getScheduledAlarms()                    -> persisted future alarms
 *   openAppSettings()                       -> app details page
 */
@CapacitorPlugin(
        name = "AdhanScheduler",
        permissions = {
                @Permission(
                        alias = "notifications",
                        strings = {Manifest.permission.POST_NOTIFICATIONS}
                )
        }
)
public class AdhanSchedulerPlugin extends Plugin {

    private static final String TAG = "TazkeerAdhan";

    // ------------------------------------------------------------------------
    // Scheduling
    // ------------------------------------------------------------------------

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        JSArray alarms = call.getArray("alarms");
        if (alarms == null) {
            call.reject("alarms array is required");
            return;
        }

        try {
            JSONArray nativeAlarms = new JSONArray(alarms.toString());
            int scheduled = AdhanAlarmManager.scheduleAll(getContext(), nativeAlarms);

            JSObject result = buildStatus();
            result.put("scheduled", scheduled);
            result.put("requested", nativeAlarms.length());
            call.resolve(result);
        } catch (JSONException e) {
            Log.e(TAG, "Invalid alarms payload", e);
            call.reject("Invalid alarms payload: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        AdhanAlarmManager.cancelAll(getContext());
        JSObject result = buildStatus();
        result.put("cancelled", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        AdhanPlaybackService.stop(getContext());
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double volumeValue = call.getDouble("volume");
        if (volumeValue != null) {
            AdhanPlaybackService.updateVolume(getContext(), volumeValue.floatValue());
        }
        JSObject result = new JSObject();
        result.put("updated", true);
        call.resolve(result);
    }

    @PluginMethod
    public void testAdhan(PluginCall call) {
        Integer delay = call.getInt("delaySeconds", 10);
        int delaySeconds = delay == null ? 10 : delay;
        if (delaySeconds < 1) {
            delaySeconds = 1;
        }

        String sound = call.getString("soundRes", "adhan");
        String prayer = call.getString("prayer", "تجربة");
        Double volumeValue = call.getDouble("volume");
        float volume = volumeValue == null ? 1.0f : volumeValue.floatValue();
        boolean isFajr = "adhan_fajr".equals(sound);

        long triggerAt = System.currentTimeMillis() + (delaySeconds * 1000L);
        boolean scheduled = AdhanAlarmManager.scheduleTest(
                getContext(),
                triggerAt,
                prayer,
                "تجربة الأذان",
                sound,
                isFajr,
                volume
        );

        JSObject result = buildStatus();
        result.put("scheduled", scheduled);
        result.put("triggerAt", triggerAt);
        result.put("delaySeconds", delaySeconds);
        result.put("exactAlarms", AdhanAlarmManager.canScheduleExactAlarms(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void getScheduledAlarms(PluginCall call) {
        JSONArray alarms = AdhanAlarmManager.getFutureAlarms(getContext());
        JSObject result = new JSObject();
        result.put("alarms", alarms);
        result.put("count", alarms.length());
        result.put("exactAlarms", AdhanAlarmManager.canScheduleExactAlarms(getContext()));
        call.resolve(result);
    }

    // ------------------------------------------------------------------------
    // Permissions & diagnostics
    // ------------------------------------------------------------------------

    /**
     * Returns the three permission badges shown in the in-app diagnostics UI.
     * This intentionally overrides Capacitor's default permission map so the
     * JS layer gets a single, stable, app-specific payload.
     */
    @Override
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Notification channels are always enabled before Android 13.
            call.resolve(buildStatus());
            return;
        }
        if (ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED) {
            call.resolve(buildStatus());
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S
                || AdhanAlarmManager.canScheduleExactAlarms(getContext())) {
            call.resolve(buildStatus());
            return;
        }

        try {
            Intent intent = new Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Log.w(TAG, "Exact alarm settings screen missing, opening app details", e);
            openAppDetails();
        } catch (Exception e) {
            Log.e(TAG, "Could not open exact alarm settings", e);
        }

        JSObject result = buildStatus();
        result.put("settingsOpened", true);
        call.resolve(result);
    }

    @SuppressLint("BatteryLife")
    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        Context context = getContext();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.resolve(buildStatus());
            return;
        }

        PowerManager powerManager =
                (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null
                && powerManager.isIgnoringBatteryOptimizations(context.getPackageName())) {
            call.resolve(buildStatus());
            return;
        }

        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (ActivityNotFoundException e) {
            // Some OEMs (MIUI/EMUI) hide the direct dialog.
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
            } catch (ActivityNotFoundException ignored) {
                openAppDetails();
            }
        } catch (Exception e) {
            Log.e(TAG, "Could not request battery exemption", e);
        }

        JSObject result = buildStatus();
        result.put("settingsOpened", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        openAppDetails();
        JSObject result = new JSObject();
        result.put("opened", true);
        call.resolve(result);
    }

    // ------------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------------

    private JSObject buildStatus() {
        Context context = getContext();

        boolean notificationsEnabled =
                NotificationManagerCompat.from(context).areNotificationsEnabled();

        boolean notificationRuntimeGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationRuntimeGranted = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        }

        boolean exactAlarms = AdhanAlarmManager.canScheduleExactAlarms(context);

        boolean batteryExempt = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager powerManager =
                    (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            batteryExempt = powerManager != null
                    && powerManager.isIgnoringBatteryOptimizations(context.getPackageName());
        } else {
            batteryExempt = true;
        }

        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        boolean hasUseExactAlarm = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // canScheduleExactAlarms() is the authoritative check; the flag
            // below is informational for the diagnostics UI.
            hasUseExactAlarm = exactAlarms;
        } else if (alarmManager != null) {
            hasUseExactAlarm = true;
        }

        JSObject status = new JSObject();
        status.put("native", true);
        status.put("sdkInt", Build.VERSION.SDK_INT);

        // Three primary badges consumed by the UI
        status.put("notifications", notificationsEnabled);
        status.put("exactAlarms", exactAlarms);
        status.put("batteryOptimizations", batteryExempt);

        // Extra detail for troubleshooting
        status.put("notificationRuntimePermission", notificationRuntimeGranted);
        status.put("useExactAlarmGranted", hasUseExactAlarm);
        status.put("canScheduleExactAlarms", exactAlarms);
        status.put("ignoringBatteryOptimizations", batteryExempt);
        status.put(
                "batteryOptimizationMode",
                batteryExempt ? "unrestricted" : "optimized"
        );
        return status;
    }

    private void openAppDetails() {
        try {
            Intent intent = new Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Could not open app settings", e);
        }
    }

    // ========================================================================
    // Azkar Notification & Sound System
    // ========================================================================

    public static final String AZKAR_CHANNEL_ID = "azkar_reminders";

    private void ensureAzkarChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager =
                    (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            NotificationChannel existing = manager.getNotificationChannel(AZKAR_CHANNEL_ID);
            if (existing == null) {
                NotificationChannel channel = new NotificationChannel(
                        AZKAR_CHANNEL_ID,
                        "تذكير الأذكار اليومية",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("إشعارات تذكير أذكار الصباح والمساء والنوم والجمعة");
                channel.enableVibration(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build();
                channel.setSound(soundUri, audioAttributes);
                manager.createNotificationChannel(channel);
            }
        }
    }

    @PluginMethod
    public void sendAzkarNotification(PluginCall call) {
        String title = call.getString("title", "تذكير الأذكار");
        String body = call.getString("body", "");
        ensureAzkarChannel();

        Context context = getContext();
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            call.reject("NotificationManager unavailable");
            return;
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 1001, intent, flags);

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, AZKAR_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_adhan)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent);

        int notifId = call.getInt("id", 99001);
        manager.notify(notifId, builder.build());

        // Play the device notification ringtone
        playNotificationTone();

        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void scheduleAzkarReminders(PluginCall call) {
        JSArray reminders = call.getArray("reminders");
        if (reminders == null) {
            call.reject("reminders array is required");
            return;
        }
        try {
            ensureAzkarChannel();
            int scheduled = AdhkarAlarmManager.scheduleAll(
                    getContext(), new JSONArray(reminders.toString())
            );
            if (scheduled < 0) {
                call.reject("Invalid adhkar replacement schedule");
                return;
            }
            JSObject result = new JSObject();
            result.put("scheduled", scheduled);
            result.put("requested", reminders.length());
            result.put("exactAlarms", AdhanAlarmManager.canScheduleExactAlarms(getContext()));
            call.resolve(result);
        } catch (JSONException error) {
            Log.e(TAG, "Invalid adhkar reminders payload", error);
            call.reject("Invalid adhkar reminders payload: " + error.getMessage());
        }
    }

    @PluginMethod
    public void cancelAzkarReminders(PluginCall call) {
        AdhkarAlarmManager.cancelAll(getContext());
        JSObject result = new JSObject();
        result.put("cancelled", true);
        call.resolve(result);
    }

    @PluginMethod
    public void playNotificationSound(PluginCall call) {
        playNotificationTone();
        JSObject res = new JSObject();
        res.put("played", true);
        call.resolve(res);
    }

    private void playNotificationTone() {
        try {
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            Ringtone r = RingtoneManager.getRingtone(getContext(), soundUri);
            if (r != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AudioAttributes aa = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build();
                    r.setAudioAttributes(aa);
                }
                r.play();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed playing notification tone", e);
        }
    }

    // ========================================================================
    // Native Hardware Qibla Compass
    // ========================================================================

    private SensorManager sensorManager;
    private Sensor rotationSensor;
    private Sensor orientationSensor;
    private Sensor accelerometer;
    private Sensor magnetometer;
    private final float[] lastAccelerometer = new float[3];
    private final float[] lastMagnetometer = new float[3];
    private boolean lastAccelerometerSet = false;
    private boolean lastMagnetometerSet = false;
    private final float[] rMatrix = new float[9];
    private final float[] orientationValues = new float[3];
    private long lastCompassUpdate = 0;
    private boolean isCompassListening = false;

    private final SensorEventListener compassListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            long now = System.currentTimeMillis();
            if (now - lastCompassUpdate < 40) { // ~25 fps throttle
                return;
            }

            float azimuth = -1;

            if (event.sensor.getType() == Sensor.TYPE_ROTATION_VECTOR) {
                SensorManager.getRotationMatrixFromVector(rMatrix, event.values);
                SensorManager.getOrientation(rMatrix, orientationValues);
                azimuth = (float) Math.toDegrees(orientationValues[0]);
                azimuth = (azimuth + 360) % 360;
            } else if (event.sensor.getType() == Sensor.TYPE_ORIENTATION) {
                azimuth = event.values[0];
            } else {
                if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
                    System.arraycopy(event.values, 0, lastAccelerometer, 0, event.values.length);
                    lastAccelerometerSet = true;
                } else if (event.sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) {
                    System.arraycopy(event.values, 0, lastMagnetometer, 0, event.values.length);
                    lastMagnetometerSet = true;
                }

                if (lastAccelerometerSet && lastMagnetometerSet) {
                    boolean success = SensorManager.getRotationMatrix(rMatrix, null, lastAccelerometer, lastMagnetometer);
                    if (success) {
                        SensorManager.getOrientation(rMatrix, orientationValues);
                        azimuth = (float) Math.toDegrees(orientationValues[0]);
                        azimuth = (azimuth + 360) % 360;
                    }
                }
            }

            if (azimuth >= 0) {
                lastCompassUpdate = now;
                JSObject ret = new JSObject();
                ret.put("heading", azimuth);
                notifyListeners("compassHeading", ret);
            }
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    };

    @PluginMethod
    public void startCompass(PluginCall call) {
        if (sensorManager == null) {
            sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        }

        if (sensorManager == null) {
            call.reject("SensorManager unavailable");
            return;
        }

        if (!isCompassListening) {
            rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
            if (rotationSensor != null) {
                sensorManager.registerListener(compassListener, rotationSensor, SensorManager.SENSOR_DELAY_UI);
            } else {
                orientationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ORIENTATION);
                if (orientationSensor != null) {
                    sensorManager.registerListener(compassListener, orientationSensor, SensorManager.SENSOR_DELAY_UI);
                } else {
                    accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
                    magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
                    if (accelerometer != null && magnetometer != null) {
                        sensorManager.registerListener(compassListener, accelerometer, SensorManager.SENSOR_DELAY_UI);
                        sensorManager.registerListener(compassListener, magnetometer, SensorManager.SENSOR_DELAY_UI);
                    }
                }
            }
            isCompassListening = true;
        }

        JSObject res = new JSObject();
        res.put("started", true);
        call.resolve(res);
    }

    @PluginMethod
    public void stopCompass(PluginCall call) {
        if (sensorManager != null && isCompassListening) {
            sensorManager.unregisterListener(compassListener);
            isCompassListening = false;
        }
        JSObject res = new JSObject();
        res.put("stopped", true);
        call.resolve(res);
    }

    @Override
    protected void handleOnDestroy() {
        if (sensorManager != null && isCompassListening) {
            sensorManager.unregisterListener(compassListener);
            isCompassListening = false;
        }
        super.handleOnDestroy();
    }
}
