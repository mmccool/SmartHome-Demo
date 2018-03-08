package com.intel.otc.iot.smarthome;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentTransaction;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ListView;

public class MainActivity extends AppCompatActivity implements
        WebViewFragment.OnWebviewPageLoaded,
        ListView.OnItemClickListener
{
    private static final String TAG = MainActivity.class.getSimpleName();

    private ControlAdapter mAdapter;
    private FragmentManager fragmentManager;
    private WebViewFragment fragmentWebview;
    private ResourceViewFragment fragmentResourceView;
    private ProvisioningManagerFragment fragmentProvisioning;
    private OcClient ocClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "onCreate");
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        mAdapter = new ControlAdapter(this);
        ListView lv = (ListView) findViewById(R.id.listControl);
        lv.setAdapter(mAdapter);
        lv.setOnItemClickListener(this);

        // Add all supported fragments
        fragmentManager = getSupportFragmentManager();
        FragmentTransaction ft = fragmentManager.beginTransaction();
        if (null == fragmentWebview) {
            fragmentWebview = new WebViewFragment();
            ft.add(R.id.fragmentContainer, fragmentWebview).detach(fragmentWebview);
        }
        if (null == fragmentResourceView) {
            fragmentResourceView = new ResourceViewFragment();
            ft.add(R.id.fragmentContainer, fragmentResourceView).detach(fragmentResourceView);
        }
        if (null == fragmentProvisioning) {
            fragmentProvisioning = new ProvisioningManagerFragment();
            ft.add(R.id.fragmentContainer, fragmentProvisioning).detach(fragmentProvisioning);
        }
        ft.commit();
        // Configure platform as an OCF client
        ocClient = new OcClient(this, fragmentResourceView);
    }

    @Override
    protected void onPause() {
        Log.d(TAG, "onPause");
        super.onPause();
        attachFragment(null);
    }

    @Override
    public void onWebviewPageLoaded(String url, Object arg) {
        ControlAdapter.Control ctrl = (ControlAdapter.Control) mAdapter.getItem((int) arg);
        if (null != ctrl)
            ctrl.ResourceType = url;
    }

    @Override
    public void onItemClick(AdapterView<?> adapterView, View view, int i, long l) {
        ControlAdapter.Control ctrl = (ControlAdapter.Control) mAdapter.getItem(i);
        final String schemaSmarthomeTool = "smarthome://";

        if (ctrl == null || ctrl.ResourceType == null)
            return;
        if (ctrl.ResourceType.startsWith("http://") || ctrl.ResourceType.startsWith("https://")) {
            fragmentWebview.configure(ctrl.ResourceType, this, i);
            if (!fragmentWebview.isVisible())
                attachFragment(fragmentWebview);
            else fragmentWebview.loadUrl(ctrl.ResourceType);
        } else if (ctrl.ResourceType.startsWith(schemaSmarthomeTool)) {
            String feature = ctrl.ResourceType.substring(schemaSmarthomeTool.length());
            if (feature.equals("provisioning") && !fragmentProvisioning.isVisible())
                attachFragment(fragmentProvisioning);
        } else {
            if (!fragmentResourceView.isVisible())
                attachFragment(fragmentResourceView);
            ocClient.findResources(ctrl.ResourceType);
        }
    }

    private void attachFragment(Fragment fragment) {
        FragmentTransaction ft = fragmentManager.beginTransaction();
        ft.detach(fragmentProvisioning)
          .detach(fragmentWebview)
          .detach(fragmentResourceView);
        if (null != fragment)
            ft.attach(fragment);
        ft.commit();
    }
}
