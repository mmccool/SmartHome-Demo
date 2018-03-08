package com.intel.otc.iot.smarthome;

import android.content.Context;
import android.support.v4.app.Fragment;
import android.support.v7.app.AppCompatActivity;

abstract class BaseFragment extends Fragment {
    protected Context mContext;

    protected void setActionBarTitle(final CharSequence title) {
        final AppCompatActivity activity = (MainActivity) mContext;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                activity.getSupportActionBar().setTitle(
                        getResources().getText(R.string.app_name) + ((title != null)? (" - " + title) : ""));
            }
        });
    }
}
