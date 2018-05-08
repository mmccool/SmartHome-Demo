package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.List;

public class CardSwitchBinary extends CardOcResource {
    private static String TAG = CardSwitchBinary.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "oic.r.switch.binary";
    private static final String KEY_VALUE = "value";

    protected TextView mResourceId;
    protected Switch mSwitchOnOff;

    CardSwitchBinary(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        mSwitchOnOff = (Switch) parentView.findViewById(R.id.switch_onoff);
        mSwitchOnOff.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                setOcRepresentation(isChecked);
            }
        });
    }

    @Override
    public void bindResource(OcResource resource) {
        super.bindResource(resource);
        mResourceId.setText(mOcResource.getHost() + mOcResource.getUri());
        getOcRepresentation(null);
        if (resource.isObservable())
            observeOcRepresentation(null);
    }

    @Override
    public void onGetCompleted(List<OcHeaderOption> list, OcRepresentation rep) {
        setState(rep);
    }

    @Override
    public synchronized void onObserveCompleted(List<OcHeaderOption> list, OcRepresentation rep, int sequenceNumber) {
        super.onObserveCompleted(list, rep, sequenceNumber);
        setState(rep);
    }

    private void setState(OcRepresentation rep) {
        try {
            final boolean state = rep.getValue(KEY_VALUE);
            ((Activity)mContext).runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    mSwitchOnOff.setChecked(state);
                }
            });
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }

    private void setOcRepresentation(boolean state) {
        try {
            OcRepresentation rep = new OcRepresentation();
            rep.setValue(KEY_VALUE, state);
            setOcRepresentation(rep, null);
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }
}
