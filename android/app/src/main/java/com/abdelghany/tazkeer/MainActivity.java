package com.abdelghany.tazkeer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.abdelghany.tazkeer.adhan.AdhanSchedulerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdhanSchedulerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

