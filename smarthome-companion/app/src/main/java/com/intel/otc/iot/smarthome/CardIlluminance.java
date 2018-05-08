package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.TextView;

import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.List;

public class CardIlluminance extends CardOcResource {
    private static String TAG = CardIlluminance.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "oic.r.sensor.illuminance";
    private static final String KEY_VALUE = "illuminance";

    private TextView mResourceId;
    private TextView mIlluminance;

    CardIlluminance(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        // Remove unused UI assets
        View unused_views[] = {
                parentView.findViewById(R.id.desc1_2),
                parentView.findViewById(R.id.value1_2),
                parentView.findViewById(R.id.unit1_2),
                parentView.findViewById(R.id.row2),
                parentView.findViewById(R.id.row3),
        };
        for (View v : unused_views)
            v.setVisibility(View.GONE);

        TextView tv = (TextView) parentView.findViewById(R.id.desc1_1);
        tv.setText(KEY_VALUE);
        mIlluminance = (TextView) parentView.findViewById(R.id.value1_1);
        tv = (TextView) parentView.findViewById(R.id.unit1_1);
        tv.setText(R.string.unit_illuminance);
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
        display(rep);
    }

    @Override
    public synchronized void onObserveCompleted(List<OcHeaderOption> list, OcRepresentation rep, int sequenceNumber) {
        super.onObserveCompleted(list, rep, sequenceNumber);
        display(rep);
    }

    private void display(OcRepresentation rep) {
        final double illuminance = getRepresentationValue(rep, KEY_VALUE);
        ((Activity) mContext).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mIlluminance.setText(String.format("%.1f", illuminance));
            }
        });
    }

    private double getRepresentationValue(OcRepresentation rep, String key) {
        double v = 0.0;
        try {
            Object object = rep.getValue(key);
            // In case the number is passed as an integer
            if (object instanceof java.lang.Integer)
                v = 1.0 * (int) object;
            if (object instanceof java.lang.Double)
                v = (double) object;
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
        return v;
    }
}
