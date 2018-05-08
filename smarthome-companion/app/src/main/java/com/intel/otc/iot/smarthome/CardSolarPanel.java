package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.CompoundButton;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;

import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.List;

public class CardSolarPanel extends CardOcResource implements
        Switch.OnCheckedChangeListener,
        SeekBar.OnSeekBarChangeListener
{
    private static final String TAG = CardSolarPanel.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "oic.r.solar";
    private static final String KEY_LCD1 = "lcd1";
    private static final String KEY_LCD2 = "lcd2";
    private static final String KEY_TILT_PERCENTAGE = "tiltPercentage";
    private static final String KEY_SIMULATION_MODE = "simulationMode";

    private TextView mResourceId;
    private Switch mSwitchManualControl;
    private LinearLayout mLayoutSolarPanelControls;
    private TextView mLabelLine1, mLabelLine2;
    private SeekBar mSeekBarTiltPercentage;

    CardSolarPanel(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        mSwitchManualControl = (Switch) parentView.findViewById(R.id.sw_simulation);
        mSwitchManualControl.setOnCheckedChangeListener(this);
        mLayoutSolarPanelControls = (LinearLayout) parentView.findViewById(R.id.layoutSolarPanelControl);
        mLabelLine1 = (TextView) parentView.findViewById(R.id.lcdLine1);
        mLabelLine2 = (TextView) parentView.findViewById(R.id.lcdLine2);
        mSeekBarTiltPercentage = (SeekBar) parentView.findViewById(R.id.tiltPercentage);
        mSeekBarTiltPercentage.setOnSeekBarChangeListener(this);
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
        updateSolarPanelStatus(rep);
    }

    @Override
    public void onCheckedChanged(CompoundButton compoundButton, boolean isChecked) {
        mLayoutSolarPanelControls.setVisibility(isChecked? View.VISIBLE : View.GONE);
        setOcRepresentation();
    }

    @Override
    public void onStartTrackingTouch(SeekBar seekBar) {
    }

    @Override
    public void onStopTrackingTouch(SeekBar seekBar) {
    }

    @Override
    public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
        setOcRepresentation();
    }

    private void setOcRepresentation() {
        try {
            OcRepresentation rep = new OcRepresentation();
            boolean simulationOn = !mSwitchManualControl.isChecked();
            rep.setValue(KEY_SIMULATION_MODE, simulationOn);
            if (!simulationOn)
                rep.setValue(KEY_TILT_PERCENTAGE, mSeekBarTiltPercentage.getProgress());
            super.setOcRepresentation(rep, null);
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }

    private void updateSolarPanelStatus(OcRepresentation rep) {
        try {
            final boolean simulationOn = rep.hasAttribute(KEY_SIMULATION_MODE)? (boolean) rep.getValue(KEY_SIMULATION_MODE) : false;
            final String str1 = rep.hasAttribute(KEY_LCD1)? (String) rep.getValue(KEY_LCD1) : null,
                         str2 = rep.hasAttribute(KEY_LCD2)? (String) rep.getValue(KEY_LCD2) : null;
            final int tiltPercentage = rep.hasAttribute(KEY_TILT_PERCENTAGE)? (int) rep.getValue(KEY_TILT_PERCENTAGE) : 0;
            ((Activity) mContext).runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (mSwitchManualControl.isChecked() == simulationOn)
                        mSwitchManualControl.setChecked(!simulationOn);
                    if (simulationOn) {
                        mLayoutSolarPanelControls.setVisibility(View.GONE);
                    } else {
                        mLayoutSolarPanelControls.setVisibility(View.VISIBLE);
                        mLabelLine1.setText(str1);
                        mLabelLine2.setText(str2);
                        mSeekBarTiltPercentage.setProgress(tiltPercentage);
                    }
                }
            });
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }
}
