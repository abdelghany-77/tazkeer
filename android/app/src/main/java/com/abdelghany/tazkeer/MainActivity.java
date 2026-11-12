package com.abdelghany.tazkeer;

import android.os.Bundle;

import com.abdelghany.tazkeer.adhan.AdhanSchedulerPlugin;
import com.getcapacitor.BridgeActivity;

/**
 * Tazkeer host activity.
 *
 * Registers the custom native Adhan bridge before the Capacitor bridge is
 * created so `Capacitor.Plugins.AdhanScheduler` is available as soon as the
 * web layer boots.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdhanSchedulerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
