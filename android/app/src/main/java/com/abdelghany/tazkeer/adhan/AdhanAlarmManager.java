package com.abdelghany.tazkeer.adhan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import com.abdelghany.tazkeer.MainActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * ============================================================================
 * AdhanAlarmManager — exact-alarm scheduler + persistence for Tazkeer.
 * ============================================================================
 *
 * Design notes:
 *  - Uses {@link AlarmManager#setAlarmClock(AlarmManager.AlarmClockInfo, PendingIntent)}
 *    which is the strongest scheduling API on Android. Alarms created with it:
 *      * are exact to the second,
 *      * fire through Doze / App Standby,
 *      * are exempt from Android 12+ background foreground-service launch limits,
 *      * survive the app being swiped away by the user.
 *  - Every scheduled alarm is persisted in SharedPreferences so
 *    {@link AdhanBootReceiver} can rebuild the schedule after a reboot,
 *    app update, manual clock change or timezone change.
 *  - The JS layer computes a rolling 7-day window and re-syncs on every app
 *    start / resume. Native persistence is the safety net, not the source of
 *    truth.
 */
public final class AdhanAlarmManager {

    private static final String TAG = "TazkeerAdhan";

    /** SharedPreferences file holding the pending alarm ledger. */
    public static final String PREFS_NAME = "tazkeer_adhan_schedule";
    public static final String KEY_ALARMS = "scheduled_alarms";

    /** Real prayer alarm request codes live in [4000, 4998]. */
    private static final int BASE_REQUEST_CODE = 4000;
    private static final int MAX_PRAYER_ALARMS = 999;

    /** Reserved request code for the "test adhan" feature. */
    public static final int TEST_REQUEST_CODE = 4999;

    public static final String ACTION_FIRE = "com.abdelghany.tazkeer.adhan.ACTION_FIRE";

    public static final String EXTRA_ID = "adhan_id";
    public static final String EXTRA_PRAYER = "adhan_prayer";
    public static final String EXTRA_LABEL = "adhan_label";
    public static final String EXTRA_SOUND = "adhan_sound";
    public static final String EXTRA_FAJR = "adhan_is_fajr";
    public static final String EXTRA_VOLUME = "adhan_volume";

    private AdhanAlarmManager() {
        // Utility class
    }

    // ------------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------------

    /**
     * Replaces the whole native schedule with the supplied 7-day window.
     *
     * @param alarms JSON objects with: id, time (epoch ms), date (yyyy-MM-dd),
     *               timeOfDay (HH:mm), prayer, label, sound, fajr, volume.
     * @return number of alarms that were successfully handed to AlarmManager.
     */
    public static int scheduleAll(Context context, JSONArray alarms) {
        cancelStored(context);

        JSONArray persisted = new JSONArray();
        int scheduled = 0;
        long now = System.currentTimeMillis();

        for (int i = 0; i < alarms.length(); i++) {
            try {
                JSONObject alarm = alarms.getJSONObject(i);

                long triggerAt = alarm.optLong("time", 0L);
                String date = alarm.optString("date", "");
                String timeOfDay = alarm.optString("timeOfDay", "");

                // Prefer the wall-clock pair so a timezone change can be fixed
                // on the next boot/time-change broadcast.
                if (!date.isEmpty() && !timeOfDay.isEmpty()) {
                    triggerAt = toEpochMillis(date, timeOfDay);
                }

                // Alarms in the past (or within 5 seconds) are useless.
                if (triggerAt <= now + 5_000L) {
                    continue;
                }

                alarm.put("time", triggerAt);
                persisted.put(alarm);

                if (scheduleOne(context, alarm, triggerAt, requestCodeFor(alarm))) {
                    scheduled++;
                }
            } catch (JSONException e) {
                Log.w(TAG, "Skipping malformed alarm entry", e);
            }
        }

        writeStored(context, persisted);
        Log.i(TAG, "Scheduled " + scheduled + "/" + alarms.length() + " adhan alarms");
        return scheduled;
    }

    /**
     * Schedules a single alarm without touching the persisted prayer schedule.
     * Used by the in-app "test the adhan" button.
     */
    public static boolean scheduleTest(
            Context context,
            long triggerAt,
            String prayer,
            String label,
            String sound,
            boolean fajr,
            float volume
    ) {
        cancelTest(context);

        JSONObject alarm = new JSONObject();
        try {
            alarm.put("id", TEST_REQUEST_CODE);
            alarm.put("time", triggerAt);
            alarm.put("prayer", prayer == null ? "Test" : prayer);
            alarm.put("label", label == null ? "تجربة الأذان" : label);
            alarm.put("sound", sound == null ? "adhan" : sound);
            alarm.put("fajr", fajr);
            alarm.put("volume", volume);
        } catch (JSONException e) {
            return false;
        }
        return scheduleOne(context, alarm, triggerAt, TEST_REQUEST_CODE);
    }

    /** Cancels every prayer alarm currently stored natively. */
    public static void cancelAll(Context context) {
        cancelStored(context);
        cancelTest(context);
    }

    /** Rebuilds the schedule from SharedPreferences after reboot/time change. */
    public static int rescheduleStored(Context context) {
        JSONArray stored = readStored(context);
        JSONArray future = new JSONArray();
        int scheduled = 0;
        long now = System.currentTimeMillis();

        for (int i = 0; i < stored.length(); i++) {
            try {
                JSONObject alarm = stored.getJSONObject(i);

                long triggerAt = alarm.optLong("time", 0L);
                String date = alarm.optString("date", "");
                String timeOfDay = alarm.optString("timeOfDay", "");
                if (!date.isEmpty() && !timeOfDay.isEmpty()) {
                    triggerAt = toEpochMillis(date, timeOfDay);
                }

                if (triggerAt <= now + 5_000L) {
                    continue;
                }

                alarm.put("time", triggerAt);
                future.put(alarm);

                if (scheduleOne(context, alarm, triggerAt, requestCodeFor(alarm))) {
                    scheduled++;
                }
            } catch (JSONException e) {
                Log.w(TAG, "Could not rebuild stored alarm", e);
            }
        }

        writeStored(context, future);
        Log.i(TAG, "Rescheduled " + scheduled + " adhan alarms after system event");
        return scheduled;
    }

    /** Returns the persisted alarms that are still in the future. */
    public static JSONArray getFutureAlarms(Context context) {
        JSONArray stored = readStored(context);
        JSONArray future = new JSONArray();
        long now = System.currentTimeMillis();

        for (int i = 0; i < stored.length(); i++) {
            try {
                JSONObject alarm = stored.getJSONObject(i);
                long triggerAt = alarm.optLong("time", 0L);
                if (triggerAt > now) {
                    future.put(alarm);
                }
            } catch (JSONException ignored) {
            }
        }
        return future;
    }

    // ------------------------------------------------------------------------
    // Core scheduling
    // ------------------------------------------------------------------------

    private static boolean scheduleOne(Context context, JSONObject alarm, long triggerAt, int requestCode) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return false;
        }

        PendingIntent operation = buildBroadcastIntent(context, alarm, requestCode);
        PendingIntent showIntent = buildShowIntent(context, requestCode);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AlarmManager.AlarmClockInfo clockInfo =
                        new AlarmManager.AlarmClockInfo(triggerAt, showIntent);
                alarmManager.setAlarmClock(clockInfo, operation);
            } else {
                // Capacitor's minSdk is 22, but keep a defensive branch.
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, operation);
            }
            return true;
        } catch (SecurityException e) {
            // Android 12+ without SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM.
            Log.e(TAG, "Exact alarm permission missing, falling back to inexact idle alarm", e);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation);
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, operation);
                }
                return true;
            } catch (SecurityException fallbackError) {
                Log.e(TAG, "Fallback alarm also rejected", fallbackError);
                return false;
            }
        }
    }

    private static PendingIntent buildBroadcastIntent(Context context, JSONObject alarm, int requestCode) {
        Intent intent = new Intent(context, AdhanAlarmReceiver.class);
        intent.setAction(ACTION_FIRE);
        // A unique data URI prevents PendingIntent extras from being reused
        // across alarms that share a request code.
        intent.setData(Uri.parse("tazkeer://adhan/alarm/" + requestCode));
        intent.putExtra(EXTRA_ID, alarm.optInt("id", requestCode));
        intent.putExtra(EXTRA_PRAYER, alarm.optString("prayer", ""));
        intent.putExtra(EXTRA_LABEL, alarm.optString("label", ""));
        intent.putExtra(EXTRA_SOUND, alarm.optString("sound", "adhan"));
        intent.putExtra(EXTRA_FAJR, alarm.optBoolean("fajr", false));
        intent.putExtra(EXTRA_VOLUME, (float) alarm.optDouble("volume", 1.0d));

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }

    private static PendingIntent buildShowIntent(Context context, int requestCode) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) {
            launch = new Intent(context, MainActivity.class);
        }
        launch.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode, launch, flags);
    }

    private static int requestCodeFor(JSONObject alarm) {
        int id = alarm.optInt("id", 0);
        // Avoid Math.floorMod (API 24+) because minSdk is 22.
        int normalized = ((id % MAX_PRAYER_ALARMS) + MAX_PRAYER_ALARMS) % MAX_PRAYER_ALARMS;
        return BASE_REQUEST_CODE + normalized;
    }

    // ------------------------------------------------------------------------
    // Cancellation
    // ------------------------------------------------------------------------

    private static void cancelStored(Context context) {
        JSONArray stored = readStored(context);
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        for (int i = 0; i < stored.length(); i++) {
            try {
                JSONObject alarm = stored.getJSONObject(i);
                int requestCode = requestCodeFor(alarm);
                PendingIntent operation = buildBroadcastIntent(context, alarm, requestCode);
                if (alarmManager != null) {
                    alarmManager.cancel(operation);
                }
                operation.cancel();
            } catch (JSONException ignored) {
            }
        }

        // Also sweep the full reserved code range in case the ledger was lost
        // (e.g. the user cleared app data but the OS kept the PendingIntent).
        // The sweep is expensive (~1000 PendingIntent lookups), so only run it
        // when the ledger is empty: either a first run, or the ledger was lost
        // while the OS still holds orphaned PendingIntents.
        if (alarmManager != null && stored.length() == 0) {
            for (int code = BASE_REQUEST_CODE; code < BASE_REQUEST_CODE + MAX_PRAYER_ALARMS; code++) {
                Intent intent = new Intent(context, AdhanAlarmReceiver.class);
                intent.setAction(ACTION_FIRE);
                intent.setData(Uri.parse("tazkeer://adhan/alarm/" + code));
                int flags = PendingIntent.FLAG_NO_CREATE;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent existing = PendingIntent.getBroadcast(context, code, intent, flags);
                if (existing != null) {
                    alarmManager.cancel(existing);
                    existing.cancel();
                }
            }
        }

        writeStored(context, new JSONArray());
    }

    private static void cancelTest(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, AdhanAlarmReceiver.class);
        intent.setAction(ACTION_FIRE);
        intent.setData(Uri.parse("tazkeer://adhan/alarm/" + TEST_REQUEST_CODE));

        int flags = PendingIntent.FLAG_NO_CREATE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent existing = PendingIntent.getBroadcast(context, TEST_REQUEST_CODE, intent, flags);
        if (existing != null) {
            if (alarmManager != null) {
                alarmManager.cancel(existing);
            }
            existing.cancel();
        }
    }

    // ------------------------------------------------------------------------
    // Persistence
    // ------------------------------------------------------------------------

    public static JSONArray readStored(Context context) {
        SharedPreferences prefs =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_ALARMS, "[]");
        try {
            return new JSONArray(raw == null ? "[]" : raw);
        } catch (JSONException e) {
            Log.w(TAG, "Corrupt alarm ledger, starting fresh", e);
            return new JSONArray();
        }
    }

    private static void writeStored(Context context, JSONArray alarms) {
        SharedPreferences prefs =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ALARMS, alarms.toString()).apply();
    }

    // ------------------------------------------------------------------------
    // Time helpers (java.util only — java.time would require desugaring on API 22)
    // ------------------------------------------------------------------------

    /**
     * Converts a local date ("yyyy-MM-dd") + wall-clock time ("HH:mm") into
     * epoch millis in the device's current timezone.
     */
    public static long toEpochMillis(String isoDate, String timeOfDay) {
        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            dateFormat.setLenient(false);
            Date date = dateFormat.parse(isoDate);

            String[] parts = timeOfDay.split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;

            Calendar calendar = Calendar.getInstance();
            calendar.setTime(date);
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            return calendar.getTimeInMillis();
        } catch (ParseException | NumberFormatException | ArrayIndexOutOfBoundsException e) {
            Log.w(TAG, "Could not parse " + isoDate + " " + timeOfDay, e);
            return 0L;
        }
    }

    /** True when the OS will let us schedule exact alarms right now. */
    public static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }
}
