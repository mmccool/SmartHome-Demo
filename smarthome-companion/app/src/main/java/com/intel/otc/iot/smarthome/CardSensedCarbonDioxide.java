package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;

import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.List;

public class CardSensedCarbonDioxide extends CardOcResource {
    private static final String TAG = CardSensedCarbonDioxide.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "oic.r.sensor.carbondioxide";
    private static final String KEY_VALUE = "value";
    private static final int imageAlphaCO2Sensed = 255, imageAlphaCO2Safe = 30;

    private TextView mResourceId;
    private ImageView mIcon;

    CardSensedCarbonDioxide(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        mIcon = (ImageView) parentView.findViewById(R.id.iconAsset);
        mIcon.setImageResource(R.drawable.gas);
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
        updateState(rep);
    }

    @Override
    public synchronized void onObserveCompleted(List<OcHeaderOption> list, OcRepresentation rep, int sequenceNumber) {
        super.onObserveCompleted(list, rep, sequenceNumber);
        updateState(rep);
    }

    private void updateState(OcRepresentation rep) {
        try {
            final boolean state = rep.getValue(KEY_VALUE);
            ((Activity)mContext).runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    mIcon.setImageAlpha(state? imageAlphaCO2Sensed : imageAlphaCO2Safe);
                }
            });
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }
}
