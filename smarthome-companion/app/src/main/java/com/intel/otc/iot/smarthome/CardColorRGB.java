package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.TextView;

import com.larswerkman.holocolorpicker.ColorPicker;
import com.larswerkman.holocolorpicker.SaturationBar;

import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.List;

public class CardColorRGB extends CardOcResource implements
        ColorPicker.OnColorSelectedListener,
        SaturationBar.OnSaturationChangedListener
{
    private static final String TAG = CardColorRGB.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "oic.r.colour.rgb";
    private static final String KEY_RGBVALUE = "rgbValue";
    private static final String KEY_RANGE = "range";

    /*
     * Android Holo ColorPicker by Marie Schweiz http://marie-schweiz.de/
     * https://github.com/LarsWerkman/HoloColorPicker
     */
    private ColorPicker colorPicker;
    private TextView mResourceId;

    CardColorRGB(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        colorPicker = (ColorPicker) parentView.findViewById(R.id.colorPicker);
        SaturationBar saturationBar = (SaturationBar) parentView.findViewById(R.id.saturationBar);
        colorPicker.addSaturationBar(saturationBar);
        colorPicker.setOnColorSelectedListener(this);
        saturationBar.setOnSaturationChangedListener(this);
    }

    @Override
    public void bindResource(OcResource resource) {
        super.bindResource(resource);
        mResourceId.setText(mOcResource.getHost() + mOcResource.getUri());
        getOcRepresentation(null);
    }

    @Override
    public synchronized void onGetCompleted(List<OcHeaderOption> list, OcRepresentation rep) {
        setColor(rep);
    }

    private void setOcRepresentation(int selectedColor) {
        int red   = (selectedColor >> 16) & 0xff;
        int green = (selectedColor >> 8) & 0xff;
        int blue  = (selectedColor) & 0xff;
        try {
            OcRepresentation rep = new OcRepresentation();
            rep.setValue(KEY_RGBVALUE, new int[]{ red, green, blue });
            super.setOcRepresentation(rep, null);
            Log.d(TAG, "\tChange color to (" + red + "," + green + "," + blue + ")");
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }

    @Override
    public void onColorSelected(int selectedColor) {
        setOcRepresentation(selectedColor);
    }

    @Override
    public void onSaturationChanged(int saturation) {
        setOcRepresentation(saturation);
    }

    private void setColor(OcRepresentation rep) {
        try {
            int[] values = rep.getValue(KEY_RGBVALUE);
            int color = (values[0] << 16) + (values[1] << 8) + values[2];
            setColor(color);
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }

    private void setColor(final int color) {
        ((Activity)mContext).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                colorPicker.setColor(color);
            }
        });
    }
}
