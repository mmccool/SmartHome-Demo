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
import java.util.Locale;

public class CardEnvironmental extends CardOcResource {
    private static String TAG = CardEnvironmental.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "oic.r.sensor.environment";
    private static final String KEY_TEMPERATURE = "temperature";
    private static final String KEY_HUMIDITY    = "humidity";
    private static final String KEY_PRESSURE    = "pressure";
    private static final String KEY_UVINDEX     = "uvIndex";

    private TextView mResourceId;
    private TextView mTemperature;
    private TextView mHumidity;
    private TextView mPressure;
    private TextView mUvIndex;

    CardEnvironmental(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        // Remove unused UI assets
        View unused_views[] = {
                parentView.findViewById(R.id.row3),
        };
        for (View v : unused_views)
            v.setVisibility(View.GONE);

        TextView tv = (TextView) parentView.findViewById(R.id.desc1_1);
        tv.setText(KEY_TEMPERATURE);
        mTemperature = (TextView) parentView.findViewById(R.id.value1_1);
        tv = (TextView) parentView.findViewById(R.id.unit1_1);
        tv.setText(R.string.unit_temperature);

        tv = (TextView) parentView.findViewById(R.id.desc1_2);
        tv.setText(KEY_HUMIDITY);
        mHumidity = (TextView) parentView.findViewById(R.id.value1_2);
        tv = (TextView) parentView.findViewById(R.id.unit1_2);
        tv.setText(R.string.unit_humidity);

        tv = (TextView) parentView.findViewById(R.id.desc2_1);
        tv.setText(KEY_PRESSURE);
        mPressure = (TextView) parentView.findViewById(R.id.value2_1);
        tv = (TextView) parentView.findViewById(R.id.unit2_1);
        tv.setText(R.string.unit_pressure);

        tv = (TextView) parentView.findViewById(R.id.desc2_2);
        tv.setText(KEY_UVINDEX);
        mUvIndex = (TextView) parentView.findViewById(R.id.value2_2);
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

    private void display(final OcRepresentation rep) {
        ((Activity) mContext).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mTemperature.setText(getTextOfPropertyNumber(rep, KEY_TEMPERATURE));
                mHumidity.setText(getTextOfPropertyNumber(rep, KEY_HUMIDITY));
                mPressure.setText(getTextOfPropertyNumber(rep, KEY_PRESSURE));
                mUvIndex.setText(getTextOfPropertyNumber(rep, KEY_UVINDEX));
            }
        });
    }

    private String getTextOfPropertyNumber(OcRepresentation rep, String key) {
        String s = null;
        try {
            Object object = rep.getValue(key);
            s = String.format(Locale.getDefault(),
                    (object instanceof java.lang.Double)? "%.1f" : "%d", object);
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
        return s;
    }
}
