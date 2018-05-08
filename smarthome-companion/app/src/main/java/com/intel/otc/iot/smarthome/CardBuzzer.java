package com.intel.otc.iot.smarthome;

import android.content.Context;
import android.view.View;

public final class CardBuzzer extends CardSwitchBinary {
    public static final String RESOURCE_TYPE = "oic.r.buzzer";

    CardBuzzer(View parentView, Context context) {
        super(parentView, context);
    }
}
