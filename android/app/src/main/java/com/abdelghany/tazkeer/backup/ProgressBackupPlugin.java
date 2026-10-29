package com.abdelghany.tazkeer.backup;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "ProgressBackup")
public class ProgressBackupPlugin extends Plugin {
    private static final String TAG = "ProgressBackupPlugin";

    @PluginMethod
    public void saveFile(PluginCall call) {
        String content = call.getString("content");
        if (content == null) {
            call.reject("Missing 'content' parameter");
            return;
        }

        String requestedName = call.getString("fileName", "tazkeer-backup.json");
        String fileName = requestedName.replaceAll("[^A-Za-z0-9._-]", "_");
        if (fileName.isEmpty()) {
            fileName = "tazkeer-backup.json";
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri uri = getContext()
                    .getContentResolver()
                    .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                if (uri == null) {
                    call.reject("Unable to create the backup file in Downloads");
                    return;
                }

                try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
                    if (output == null) {
                        call.reject("Unable to open the backup file for writing");
                        return;
                    }
                    output.write(content.getBytes(StandardCharsets.UTF_8));
                }

                ContentValues publish = new ContentValues();
                publish.put(MediaStore.Downloads.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, publish, null, null);

                JSObject result = new JSObject();
                result.put("uri", uri.toString());
                result.put("fileName", fileName);
                call.resolve(result);
                return;
            }

            File downloadsDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (downloadsDir == null) {
                downloadsDir = getContext().getFilesDir();
            }
            if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
                call.reject("Unable to create the backup directory");
                return;
            }

            File outputFile = new File(downloadsDir, fileName);
            try (FileOutputStream output = new FileOutputStream(outputFile)) {
                output.write(content.getBytes(StandardCharsets.UTF_8));
            }

            JSObject result = new JSObject();
            result.put("path", outputFile.getAbsolutePath());
            result.put("fileName", fileName);
            call.resolve(result);
        } catch (Exception error) {
            Log.e(TAG, "Unable to save progress backup", error);
            call.reject("Unable to save progress backup: " + error.getMessage(), error);
        }
    }
}
