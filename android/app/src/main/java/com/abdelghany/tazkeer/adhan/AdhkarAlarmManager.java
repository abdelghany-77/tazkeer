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

public final class AdhkarAlarmManager {
    private static final String TAG = "TazkeerAdhkar";
    private static final String PREFS = "tazkeer_adhkar_schedule";
    private static final String KEY = "scheduled_reminders";
    private static final int BASE_REQUEST_CODE = 6000;
    private static final int REQUEST_CODE_RANGE = 1000000000;
    public static final String ACTION_FIRE = "com.abdelghany.tazkeer.adhan.ACTION_ADHKAR";

    private AdhkarAlarmManager() {}

    public static int scheduleAll(Context context, JSONArray reminders) {
        for (int index = 0; index < reminders.length(); index++) {
            JSONObject reminder = reminders.optJSONObject(index);
            if (reminder == null
                    || !reminder.has("id")
                    || !reminder.has("time")
                    || reminder.optLong("time", 0L) <= 0L
                    || reminder.optString("date", "").isEmpty()
                    || reminder.optString("timeOfDay", "").isEmpty()
                    || reminder.optString("title", "").isEmpty()) {
                Log.e(TAG, "Refusing invalid replacement schedule");
                return -1;
            }
        }
        cancelStored(context);
        JSONArray future = new JSONArray();
        int scheduled = 0;
        long now = System.currentTimeMillis();

        for (int index = 0; index < reminders.length(); index++) {
            try {
                JSONObject reminder = new JSONObject(reminders.getJSONObject(index).toString());
                long triggerAt = reminder.optLong("time", 0L);
                String date = reminder.optString("date", "");
                String timeOfDay = reminder.optString("timeOfDay", "");
                if (!date.isEmpty() && !timeOfDay.isEmpty()) {
                    triggerAt = toEpochMillis(date, timeOfDay);
                }
                if (triggerAt <= now + 5000L) continue;

                reminder.put("time", triggerAt);
                future.put(reminder);
                if (scheduleOne(context, reminder, triggerAt)) scheduled++;
            } catch (JSONException error) {
                Log.w(TAG, "Skipping malformed adhkar reminder", error);
            }
        }

        writeStored(context, future);
        return scheduled;
    }

    public static int rescheduleStored(Context context) {
        return scheduleAllWithoutCancel(context, readStored(context));
    }

    public static void cancelAll(Context context) {
        cancelStored(context);
    }

    private static int scheduleAllWithoutCancel(Context context, JSONArray stored) {
        JSONArray future = new JSONArray();
        int scheduled = 0;
        long now = System.currentTimeMillis();
        for (int index = 0; index < stored.length(); index++) {
            try {
                JSONObject reminder = stored.getJSONObject(index);
                long triggerAt = reminder.optLong("time", 0L);
                String date = reminder.optString("date", "");
                String timeOfDay = reminder.optString("timeOfDay", "");
                if (!date.isEmpty() && !timeOfDay.isEmpty()) {
                    triggerAt = toEpochMillis(date, timeOfDay);
                }
                if (triggerAt <= now + 5000L) continue;
                reminder.put("time", triggerAt);
                future.put(reminder);
                if (scheduleOne(context, reminder, triggerAt)) scheduled++;
            } catch (JSONException error) {
                Log.w(TAG, "Could not rebuild adhkar reminder", error);
            }
        }
        writeStored(context, future);
        return scheduled;
    }

    private static boolean scheduleOne(Context context, JSONObject reminder, long triggerAt) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return false;
        int requestCode = requestCodeFor(reminder);
        PendingIntent operation = buildIntent(context, reminder, requestCode);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                manager.setAlarmClock(
                        new AlarmManager.AlarmClockInfo(triggerAt, buildShowIntent(context, requestCode)),
                        operation
                );
            } else {
                manager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, operation);
            }
            return true;
        } catch (SecurityException exactError) {
            Log.w(TAG, "Exact adhkar alarm unavailable; using idle-tolerant fallback", exactError);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation);
                } else {
                    manager.set(AlarmManager.RTC_WAKEUP, triggerAt, operation);
                }
                return true;
            } catch (SecurityException fallbackError) {
                Log.e(TAG, "Unable to schedule adhkar reminder", fallbackError);
                return false;
            }
        }
    }

    private static PendingIntent buildIntent(Context context, JSONObject reminder, int requestCode) {
        Intent intent = new Intent(context, AdhkarAlarmReceiver.class);
        intent.setAction(ACTION_FIRE);
        intent.setData(Uri.parse("tazkeer://adhkar/reminder/" + requestCode));
        intent.putExtra("adhkar_id", reminder.optInt("id", requestCode));
        intent.putExtra("adhkar_title", reminder.optString("title", "تذكير الأذكار"));
        intent.putExtra("adhkar_body", reminder.optString("body", ""));
        intent.putExtra("adhkar_section", reminder.optString("section", "tab-azkar"));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }

    private static PendingIntent buildShowIntent(Context context, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    private static int requestCodeFor(JSONObject reminder) {
        int id = reminder.optInt("id", 0);
        int normalized = (int) (((long) id % REQUEST_CODE_RANGE + REQUEST_CODE_RANGE) % REQUEST_CODE_RANGE);
        return BASE_REQUEST_CODE + normalized;
    }

    private static void cancelStored(Context context) {
        JSONArray stored = readStored(context);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (int index = 0; index < stored.length(); index++) {
            try {
                JSONObject reminder = stored.getJSONObject(index);
                int requestCode = requestCodeFor(reminder);
                PendingIntent intent = buildIntent(context, reminder, requestCode);
                if (manager != null) manager.cancel(intent);
                intent.cancel();
            } catch (JSONException error) {
                Log.w(TAG, "Could not cancel stored adhkar reminder", error);
            }
        }
        writeStored(context, new JSONArray());
    }

    private static JSONArray readStored(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
        try {
            return new JSONArray(raw == null ? "[]" : raw);
        } catch (JSONException error) {
            Log.w(TAG, "Corrupt adhkar ledger; resetting", error);
            return new JSONArray();
        }
    }

    private static void writeStored(Context context, JSONArray reminders) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY, reminders.toString()).apply();
    }

    public static long toEpochMillis(String isoDate, String timeOfDay) {
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            format.setLenient(false);
            Date date = format.parse(isoDate);
            String[] parts = timeOfDay.split(":");
            Calendar calendar = Calendar.getInstance();
            calendar.setTime(date);
            calendar.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
            calendar.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            return calendar.getTimeInMillis();
        } catch (ParseException | NumberFormatException | ArrayIndexOutOfBoundsException error) {
            return 0L;
        }
    }
}
