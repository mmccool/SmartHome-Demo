package com.intel.otc.iot.smarthome;

import android.content.Context;
import android.view.View;

public final class CardButton extends CardSwitchBinary {
    public static final String RESOURCE_TYPE = "oic.r.button";

    CardButton(View parentView, Context context) {
        super(parentView, context);
        mSwitchOnOff.setClickable(false);
    }
}
