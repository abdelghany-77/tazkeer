package com.abdelghany.tazkeer;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.abdelghany.tazkeer.adhan.AdhanSchedulerPlugin;
import com.abdelghany.tazkeer.backup.ProgressBackupPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdhanSchedulerPlugin.class);
        registerPlugin(ProgressBackupPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            webView.setSaveEnabled(true);
        }
    }
}
