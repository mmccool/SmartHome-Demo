package com.intel.otc.iot.smarthome;

import android.content.Context;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import org.iotivity.base.OcResource;
import org.iotivity.base.OcResourceIdentifier;

import java.util.HashMap;
import java.util.Map;

public class ResourceViewFragment extends BaseFragment implements
        OcClient.OnResourceFound
{
    private static final String TAG = ResourceViewFragment.class.getSimpleName();

    private ResourceAdapter mResourceAdapter;
    private Map<OcResourceIdentifier, OcResource> mResourceFound;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        Log.d(TAG, "onCreateView");
        // Enable populating the options menu
        setHasOptionsMenu(true);
        getActivity().invalidateOptionsMenu();

        View v = inflater.inflate(R.layout.fragment_resource_view, container, false);
        RecyclerView viewResources = (RecyclerView) v.findViewById(R.id.resourceList);
        viewResources.setHasFixedSize(true);
        viewResources.setLayoutManager(new LinearLayoutManager(mContext));
        mResourceAdapter = new ResourceAdapter(mContext);
        viewResources.setAdapter(mResourceAdapter);

        mResourceFound = new HashMap<>();
        setActionBarTitle(null);
        Toast.makeText(mContext, R.string.fragment_resource_view_greeting, Toast.LENGTH_SHORT).show();
        return v;
    }

    @Override
    public void onAttach(Context context) {
        Log.d(TAG, "onAttach");
        super.onAttach(context);
        mContext = context;
    }

    @Override
    public void onPause() {
        Log.d(TAG, "onPause");
        super.onPause();
        mResourceAdapter.clear();
    }

    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        Log.d(TAG, "onCreateOptionsMenu");
        inflater.inflate(R.menu.menu_resource_view, menu);
    }

    @Override
    public void onPrepareOptionsMenu(Menu menu) {
        Log.d(TAG, "onPrepareOptionsMenu");
        super.onPrepareOptionsMenu(menu);
        menu.findItem(R.id.option_http_put).setChecked(CardOcResource.__set_representation_with_put);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        Log.d(TAG, "onOptionsItemSelected");
        switch (item.getItemId()) {
            case R.id.option_http_put:
                CardOcResource.__set_representation_with_put = !CardOcResource.__set_representation_with_put;
                item.setChecked(CardOcResource.__set_representation_with_put);
                return true;
            case R.id.menuitem_clear:
                mResourceFound.clear();
                mResourceAdapter.clear();
                setActionBarTitle(null);
                return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onResourceFound(OcResource resource) {
        if (!mResourceFound.containsKey(resource.getUniqueIdentifier())) {
            mResourceFound.put(resource.getUniqueIdentifier(), resource);
            mResourceAdapter.add(resource);
            setActionBarTitle(mResourceFound.size() + " resources");
        }
    }
}
