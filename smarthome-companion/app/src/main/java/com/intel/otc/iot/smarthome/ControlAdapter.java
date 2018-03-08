package com.intel.otc.iot.smarthome;

import android.content.Context;
import android.util.Log;
import android.widget.ArrayAdapter;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;

public class ControlAdapter extends ArrayAdapter {
    private static String TAG = ControlAdapter.class.getSimpleName();
    private static String File_JsonControlList = "controls.json";

    public class Control {
        String Name;
        String ResourceType;

        @Override
        public String toString() {
            return Name;
        }
    }
    private Context mContext;

    ControlAdapter(Context context) {
        super(context, R.layout.list_control, R.id.control_display);
        mContext = context;
        try {
            Log.d(TAG, "Getting control list from JSON file '" + File_JsonControlList + "'");
            InputStream is = context.getAssets().open(File_JsonControlList);
            int size = is.available();
            byte[] buf = new byte[size];
            is.read(buf);
            is.close();
            // Import controls from the JSON file
            JSONObject json = new JSONObject(new String(buf, "UTF-8"));
            JSONArray controls = json.getJSONArray("controls");
            for (int i = 0; i < controls.length(); i++) {
                JSONObject obj = controls.getJSONObject(i);
                Control li = new Control();
                li.Name = obj.getString("name");
                li.ResourceType = obj.has("rt")? obj.getString("rt") : null;
                add(li);
                Log.d(TAG, "\tname=" + li.Name +
                        ((li.ResourceType != null)? (", rt=" + li.ResourceType) : ""));
            }
        } catch (IOException | JSONException e) {
            e.printStackTrace();
        }
    }
}
