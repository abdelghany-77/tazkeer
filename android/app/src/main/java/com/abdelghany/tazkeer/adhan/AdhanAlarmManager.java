package com.abdelghany.tazkeer.adhan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class AdhanAlarmManager {
    private static final String TAG = "AdhanAlarmManager";
    private static final String PREFS_NAME = "tazkeer_adhan_native_prefs";
    private static final String KEY_SCHEDULED_ALARMS = "scheduled_alarms_json";

    private static AdhanAlarmManager instance;
    private final Context context;
    private final AlarmManager alarmManager;
    private final SharedPreferences prefs;

    public static synchronized AdhanAlarmManager getInstance(Context context) {
        if (instance == null) {
            instance = new AdhanAlarmManager(context.getApplicationContext());
        }
        return instance;
    }

    private AdhanAlarmManager(Context context) {
        this.context = context;
        this.alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return alarmManager != null && alarmManager.canScheduleExactAlarms();
        }
        return true;
    }

    public static class AlarmItem {
        public int id;
        public long timeMillis;
        public String prayerKey;
        public String prayerName;
        public String soundRes;

        public JSONObject toJson() {
            JSONObject obj = new JSONObject();
            try {
                obj.put("id", id);
                obj.put("timeMillis", timeMillis);
                obj.put("prayerKey", prayerKey);
                obj.put("prayerName", prayerName);
                obj.put("soundRes", soundRes);
            } catch (JSONException e) {
                Log.e(TAG, "Error serializing AlarmItem to JSON", e);
            }
            return obj;
        }

        public static AlarmItem fromJson(JSONObject obj) {
            AlarmItem item = new AlarmItem();
            item.id = obj.optInt("id", 0);
            item.timeMillis = obj.optLong("timeMillis", 0);
            item.prayerKey = obj.optString("prayerKey", "");
            item.prayerName = obj.optString("prayerName", "");
            item.soundRes = obj.optString("soundRes", "adhan");
            return item;
        }
    }

    public synchronized int scheduleAlarms(List<AlarmItem> alarms) {
        cancelAllAlarms();

        if (alarms == null || alarms.isEmpty() || alarmManager == null) {
            return 0;
        }

        long now = System.currentTimeMillis();
        List<AlarmItem> validAlarms = new ArrayList<>();

        for (AlarmItem item : alarms) {
            if (item.timeMillis <= now) {
                continue;
            }

            Intent intent = new Intent(context, AdhanAlarmReceiver.class);
            intent.setAction(AdhanAlarmReceiver.ACTION_PRAYER_ALARM);
            intent.putExtra(AdhanAlarmReceiver.EXTRA_ALARM_ID, item.id);
            intent.putExtra(AdhanAlarmReceiver.EXTRA_PRAYER_KEY, item.prayerKey);
            intent.putExtra(AdhanAlarmReceiver.EXTRA_PRAYER_NAME, item.prayerName);
            intent.putExtra(AdhanAlarmReceiver.EXTRA_SOUND_RES, item.soundRes);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    item.id,
                    intent,
                    flags
            );

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        if (alarmManager.canScheduleExactAlarms()) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.timeMillis, pendingIntent);
                        } else {
                            Log.w(TAG, "Exact alarm permission not granted, falling back to setAndAllowWhileIdle");
                            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.timeMillis, pendingIntent);
                        }
                    } else {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.timeMillis, pendingIntent);
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, item.timeMillis, pendingIntent);
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, item.timeMillis, pendingIntent);
                }

                validAlarms.add(item);
            } catch (SecurityException se) {
                Log.e(TAG, "SecurityException while scheduling exact alarm for ID " + item.id, se);
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.timeMillis, pendingIntent);
                        validAlarms.add(item);
                    }
                } catch (Exception ignored) {}
            } catch (Exception e) {
                Log.e(TAG, "Error scheduling alarm ID " + item.id, e);
            }
        }

        saveAlarmsToPrefs(validAlarms);
        Log.i(TAG, "Successfully scheduled " + validAlarms.size() + " native Adhan alarms.");
        return validAlarms.size();
    }

    public synchronized void cancelAllAlarms() {
        List<AlarmItem> existing = getSavedAlarms();
        if (alarmManager != null && existing != null) {
            for (AlarmItem item : existing) {
                Intent intent = new Intent(context, AdhanAlarmReceiver.class);
                intent.setAction(AdhanAlarmReceiver.ACTION_PRAYER_ALARM);

                int flags = PendingIntent.FLAG_NO_CREATE;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }

                PendingIntent pi = PendingIntent.getBroadcast(context, item.id, intent, flags);
                if (pi != null) {
                    alarmManager.cancel(pi);
                    pi.cancel();
                }
            }
        }
        clearSavedAlarms();
        Log.i(TAG, "All scheduled alarms cancelled and cleared from prefs.");
    }

    public synchronized void rescheduleSavedAlarms() {
        List<AlarmItem> saved = getSavedAlarms();
        if (saved == null || saved.isEmpty()) {
            Log.i(TAG, "No saved alarms to reschedule.");
            return;
        }

        long now = System.currentTimeMillis();
        List<AlarmItem> futureAlarms = new ArrayList<>();
        for (AlarmItem item : saved) {
            if (item.timeMillis > now) {
                futureAlarms.add(item);
            }
        }

        scheduleAlarms(futureAlarms);
        Log.i(TAG, "Rescheduled " + futureAlarms.size() + " future alarms after system event.");
    }

    public synchronized List<AlarmItem> getSavedAlarms() {
        String jsonStr = prefs.getString(KEY_SCHEDULED_ALARMS, null);
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return new ArrayList<>();
        }

        List<AlarmItem> list = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(jsonStr);
            for (int i = 0; i < arr.length(); i++) {
                list.add(AlarmItem.fromJson(arr.getJSONObject(i)));
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing saved alarms JSON", e);
        }
        return list;
    }

    public synchronized AlarmItem getNextAlarm() {
        List<AlarmItem> list = getSavedAlarms();
        if (list.isEmpty()) return null;

        long now = System.currentTimeMillis();
        List<AlarmItem> future = new ArrayList<>();
        for (AlarmItem item : list) {
            if (item.timeMillis > now) {
                future.add(item);
            }
        }

        if (future.isEmpty()) return null;

        Collections.sort(future, new Comparator<AlarmItem>() {
            @Override
            public int compare(AlarmItem o1, AlarmItem o2) {
                return Long.compare(o1.timeMillis, o2.timeMillis);
            }
        });

        return future.get(0);
    }

    private void saveAlarmsToPrefs(List<AlarmItem> alarms) {
        JSONArray arr = new JSONArray();
        for (AlarmItem item : alarms) {
            arr.put(item.toJson());
        }
        prefs.edit().putString(KEY_SCHEDULED_ALARMS, arr.toString()).apply();
    }

    private void clearSavedAlarms() {
        prefs.edit().remove(KEY_SCHEDULED_ALARMS).apply();
    }
}
