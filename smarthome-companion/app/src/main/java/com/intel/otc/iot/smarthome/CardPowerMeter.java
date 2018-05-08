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

public class CardPowerMeter extends CardOcResource {
    private static String TAG = CardPowerMeter.class.getSimpleName();
    /* This is NOT the standard Energy Consumption resource type defined by OCF,
       reference http://oneiota.org/revisions/1761 for the standard OICEnergyConsumption */
    public  static final String RESOURCE_TYPE = "oic.r.energy.consumption";
    private static final String KEY_CH1 = "power1";
    private static final String KEY_CH2 = "power2";

    private TextView mResourceId;
    private TextView mPowerConsumed;
    private TextView mEnergyGenerated;

    CardPowerMeter(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        // Remove unused UI assets
        View unused_views[] = {
                parentView.findViewById(R.id.row2),
                parentView.findViewById(R.id.row3),
        };
        for (View v : unused_views)
            v.setVisibility(View.GONE);

        TextView tv = (TextView) parentView.findViewById(R.id.desc1_1);
        tv.setText(KEY_CH1);
        mPowerConsumed = (TextView) parentView.findViewById(R.id.value1_1);
        tv = (TextView) parentView.findViewById(R.id.unit1_1);
        tv.setText(R.string.unit_power);

        tv = (TextView) parentView.findViewById(R.id.desc1_2);
        tv.setText(KEY_CH2);
        mEnergyGenerated = (TextView) parentView.findViewById(R.id.value1_2);
        tv = (TextView) parentView.findViewById(R.id.unit1_2);
        tv.setText(R.string.unit_power);
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
        try {
            final int v1 = rep.getValue(KEY_CH1), v2 = rep.getValue(KEY_CH2);
            ((Activity) mContext).runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    mPowerConsumed.setText(String.format(Locale.getDefault(), "%d", v1));
                    mEnergyGenerated.setText(String.format(Locale.getDefault(), "%d", v2));
                }
            });
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }
}
