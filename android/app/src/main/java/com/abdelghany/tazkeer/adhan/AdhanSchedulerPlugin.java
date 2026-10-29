package com.abdelghany.tazkeer.adhan;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "AdhanScheduler")
public class AdhanSchedulerPlugin extends Plugin {
    private static final String TAG = "AdhanSchedulerPlugin";

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        JSArray alarmsArray = call.getArray("alarms");
        if (alarmsArray == null) {
            call.reject("Missing 'alarms' array parameter");
            return;
        }

        List<AdhanAlarmManager.AlarmItem> items = new ArrayList<>();
        try {
            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject obj = alarmsArray.getJSONObject(i);
                AdhanAlarmManager.AlarmItem item = new AdhanAlarmManager.AlarmItem();
                item.id = obj.optInt("id", (int) (System.currentTimeMillis() % 100000) + i);
                item.timeMillis = obj.optLong("timeMillis", 0L);
                item.prayerKey = obj.optString("prayerKey", "");
                item.prayerName = obj.optString("prayerName", "");
                item.soundRes = obj.optString("soundRes", "adhan");
                if (item.timeMillis > 0) {
                    items.add(item);
                }
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing alarms array", e);
            call.reject("Error parsing alarms JSON: " + e.getMessage());
            return;
        }

        int scheduled = AdhanAlarmManager.getInstance(getContext()).scheduleAlarms(items);
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("scheduledCount", scheduled);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        AdhanAlarmManager.getInstance(getContext()).cancelAllAlarms();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        Intent stopIntent = new Intent(getContext(), AdhanPlaybackService.class);
        stopIntent.setAction(AdhanPlaybackService.ACTION_STOP_ADHAN);
        try {
            getContext().startService(stopIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping Adhan service", e);
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isPlaying(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isPlaying", AdhanPlaybackService.isPlaying());
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context ctx = getContext();
        boolean notifs = NotificationManagerCompat.from(ctx).areNotificationsEnabled();
        boolean exactAlarm = AdhanAlarmManager.getInstance(ctx).canScheduleExactAlarms();

        boolean batteryOptIgnored = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                batteryOptIgnored = pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
            }
        }

        JSObject ret = new JSObject();
        ret.put("notifications", notifs ? "granted" : "denied");
        ret.put("exactAlarm", exactAlarm ? "granted" : "denied");
        ret.put("batteryOptimizationIgnored", batteryOptIgnored);
        ret.put("canScheduleExact", exactAlarm);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                Log.e(TAG, "Failed to open exact alarm settings", e);
            }
        }

        JSObject ret = new JSObject();
        ret.put("opened", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                Log.e(TAG, "Failed to open battery optimization exemption request", e);
            }
        }

        JSObject ret = new JSObject();
        ret.put("opened", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void getScheduledAlarms(PluginCall call) {
        List<AdhanAlarmManager.AlarmItem> items = AdhanAlarmManager.getInstance(getContext()).getSavedAlarms();
        JSArray arr = new JSArray();
        for (AdhanAlarmManager.AlarmItem item : items) {
            JSObject obj = new JSObject();
            obj.put("id", item.id);
            obj.put("timeMillis", item.timeMillis);
            obj.put("prayerKey", item.prayerKey);
            obj.put("prayerName", item.prayerName);
            obj.put("soundRes", item.soundRes);
            arr.put(obj);
        }

        AdhanAlarmManager.AlarmItem next = AdhanAlarmManager.getInstance(getContext()).getNextAlarm();
        JSObject nextObj = null;
        if (next != null) {
            nextObj = new JSObject();
            nextObj.put("id", next.id);
            nextObj.put("timeMillis", next.timeMillis);
            nextObj.put("prayerKey", next.prayerKey);
            nextObj.put("prayerName", next.prayerName);
            nextObj.put("soundRes", next.soundRes);
        }

        JSObject ret = new JSObject();
        ret.put("alarms", arr);
        ret.put("nextAlarm", nextObj);
        call.resolve(ret);
    }

    @PluginMethod
    public void testAdhan(PluginCall call) {
        int delaySeconds = call.getInt("delaySeconds", 5);
        String prayerKey = call.getString("prayerKey", "Dhuhr");
        String prayerName = call.getString("prayerName", "صلاة الظهر");
        String soundRes = call.getString("soundRes", "adhan");

        if (delaySeconds <= 0) {
            // Immediate trigger
            Intent serviceIntent = new Intent(getContext(), AdhanPlaybackService.class);
            serviceIntent.setAction(AdhanPlaybackService.ACTION_START_ADHAN);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_ALARM_ID, 99999);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_PRAYER_KEY, prayerKey);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_PRAYER_NAME, prayerName);
            serviceIntent.putExtra(AdhanPlaybackService.EXTRA_SOUND_RES, soundRes);
            ContextCompat.startForegroundService(getContext(), serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("scheduledAt", System.currentTimeMillis());
            call.resolve(ret);
        } else {
            // Schedule via AlarmManager
            long targetTime = System.currentTimeMillis() + (delaySeconds * 1000L);
            AdhanAlarmManager.AlarmItem item = new AdhanAlarmManager.AlarmItem();
            item.id = 99999;
            item.timeMillis = targetTime;
            item.prayerKey = prayerKey;
            item.prayerName = prayerName;
            item.soundRes = soundRes;

            // Schedule only the test alarm so the real prayer alarms are not wiped.
            AdhanAlarmManager.getInstance(getContext()).scheduleSingleAlarm(item);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("scheduledAt", targetTime);
            call.resolve(ret);
        }
    }
}
