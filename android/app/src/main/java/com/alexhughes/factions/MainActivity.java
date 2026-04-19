package com.alexhughes.factions;

import com.getcapacitor.BridgeActivity;
import com.osmanraifgunes.capacitorgameconnect.CapacitorGameConnectPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(CapacitorGameConnectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
