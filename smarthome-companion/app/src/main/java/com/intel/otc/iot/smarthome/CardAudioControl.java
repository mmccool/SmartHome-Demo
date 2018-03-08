package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.CompoundButton;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;

import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.List;

public class CardAudioControl extends CardOcResource implements
        Switch.OnCheckedChangeListener,
        SeekBar.OnSeekBarChangeListener
{
    private static final String TAG = CardAudioControl.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "oic.r.audio";
    private static final String KEY_VOLUME = "volume";
    private static final String KEY_MUTE = "mute";

    private TextView mResourceId;
    private Switch  mSwitchVolume;
    private SeekBar mSeekBarVolume;

    CardAudioControl(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        mSwitchVolume = (Switch) parentView.findViewById(R.id.sw_volume);
        mSwitchVolume.setOnCheckedChangeListener(this);
        mSeekBarVolume = (SeekBar) parentView.findViewById(R.id.volumeLevel);
        mSeekBarVolume.setOnSeekBarChangeListener(this);
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
        updateAudioState(rep);
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

    @Override
    public void onCheckedChanged(CompoundButton compoundButton, boolean isChecked) {
        mSeekBarVolume.setEnabled(isChecked);
        setOcRepresentation();
    }

    private void setOcRepresentation() {
        try {
            OcRepresentation rep = new OcRepresentation();
            rep.setValue(KEY_MUTE, !mSwitchVolume.isChecked());
            int volume = mSeekBarVolume.getProgress();
            rep.setValue(KEY_VOLUME, volume);
            super.setOcRepresentation(rep, null);
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }

    private void updateAudioState(OcRepresentation rep) {
        try {
            final boolean isMuted = rep.getValue(KEY_MUTE);
            final int volume = rep.getValue(KEY_VOLUME);
            ((Activity) mContext).runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (mSwitchVolume.isChecked() == isMuted)
                        mSwitchVolume.setChecked(!isMuted);
                    mSeekBarVolume.setEnabled(!isMuted);
                    mSeekBarVolume.setProgress(volume);
                }
            });
            if (isMuted)
                Log.d(TAG, "\tAudio is muted");
            else
                Log.d(TAG, "\tAudio Volume: " + volume);
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }
}
