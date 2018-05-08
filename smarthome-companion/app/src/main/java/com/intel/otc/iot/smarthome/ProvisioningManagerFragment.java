package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v4.util.SimpleArrayMap;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import org.iotivity.base.CredType;
import org.iotivity.base.DeviceStatus;
import org.iotivity.base.KeySize;
import org.iotivity.base.OcException;
import org.iotivity.base.OcProvisioning;
import org.iotivity.base.OcSecureResource;
import org.iotivity.base.OwnedStatus;
import org.iotivity.base.ProvisionResult;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

public class ProvisioningManagerFragment extends BaseFragment {
    private static final String TAG = ProvisioningManagerFragment.class.getSimpleName();
    private static final int discoverDevicesPeriodInSecond = 10;
    private static final int provisioningError = 1;

    class DeviceAdapter extends RecyclerView.Adapter<DeviceAdapter.DeviceView> {
        private final String TAG = DeviceAdapter.class.getSimpleName();
        private SimpleArrayMap<String, OcSecureResource> mDevices = new SimpleArrayMap<>();
        private SimpleArrayMap<String, DeviceView> mDeviceViews = new SimpleArrayMap<>();
        private List<OcSecureResource> mSelection = new ArrayList<>();

        class DeviceView extends RecyclerView.ViewHolder {
            OcSecureResource device;
            CheckBox chkSelect;
            TextView tvDeviceUUID;
            TextView tvDeviceStatus;
            ImageButton btnOxM;

            DeviceView(View parentView) {
                super(parentView);
                chkSelect = (CheckBox) parentView.findViewById(R.id.chk_select);
                chkSelect.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
                    @Override
                    public void onCheckedChanged(CompoundButton b, boolean isChecked) {
                        if (b.isEnabled()) {
                            if (isChecked && !mSelection.contains(device))
                                mSelection.add(device);
                            if (!isChecked && mSelection.contains(device))
                                mSelection.remove(device);
                            markLinkedDevices(device, isChecked);
                            getActivity().invalidateOptionsMenu();
                        }
                    }
                });
                tvDeviceUUID = (TextView) parentView.findViewById(R.id.label_deviceId);
                tvDeviceStatus = (TextView) parentView.findViewById(R.id.label_deviceStatus);
                btnOxM = (ImageButton) parentView.findViewById(R.id.btn_ownDevice);
                btnOxM.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        ownDevice(device);
                    }
                });
            }

            void updateView() {
                ((Activity) mContext).runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            boolean owned = (device.getOwnedStatus() == OwnedStatus.OWNED);
                            chkSelect.setEnabled(owned);
                            tvDeviceUUID.setText(device.getDeviceID());
                            tvDeviceUUID.setTextColor(owned ? Color.BLACK : Color.CYAN);
                            tvDeviceStatus.setText(owned ? ((device.getDeviceStatus() == DeviceStatus.ON) ? "ON" : "OFF") : "");
                            btnOxM.setVisibility(owned ? View.GONE : View.VISIBLE);
                        } catch (OcException e) {
                            Log.e(TAG, e.toString());
                        }
                    }
                });
            }
        }

        @Override
        public DeviceView onCreateViewHolder(ViewGroup parent, int viewType) {
            Log.d(TAG, "onCreateViewHolder(" + viewType + ")");
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.card_device, parent, false);
            return new DeviceView(v);
        }

        @Override
        public void onBindViewHolder(DeviceView holder, int position) {
            Log.d(TAG, "onBindViewHolder(" + position + ")");
            holder.device = mDevices.valueAt(position);
            mDeviceViews.put(holder.device.getDeviceID(), holder);
            holder.updateView();
            holder.chkSelect.setChecked(false);
        }

        @Override
        public int getItemCount() {
            return mDevices.size();
        }

        public void add(OcSecureResource dev) {
            String uuid = dev.getDeviceID();
            if (!mDevices.containsKey(uuid)) {
                mDevices.put(uuid, dev);
                Log.d(TAG, "Device " + uuid + " added at index " + mDevices.indexOfKey(uuid));
                notifyDataSetChanged();
            }
        }

        public void clear() {
            mDevices.clear();
            mDeviceViews.clear();
            mSelection.clear();
            notifyDataSetChanged();
        }

        private void markLinkedDevices(OcSecureResource dev, boolean linked) {
            try {
                List<String> linkedUUIDs = dev.getLinkedDevices();
                for (String uuid : linkedUUIDs) {
                    DeviceView v = mDeviceViews.get(uuid);
                    if (v != null) {
                        v.chkSelect.setEnabled(!linked);
                        v.chkSelect.setChecked(linked);
                    }
                }
            } catch (OcException e) {
                Log.e(TAG, e.toString());
            }
        }
    }

    private DeviceAdapter mDeviceAdapter;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        Log.d(TAG, "onCreateView");
        // Enable populating the options menu
        setHasOptionsMenu(true);
        getActivity().invalidateOptionsMenu();

        View v = inflater.inflate(R.layout.fragment_resource_view, container, false);
        RecyclerView viewSVRs = (RecyclerView) v.findViewById(R.id.resourceList);
        viewSVRs.setHasFixedSize(true);
        viewSVRs.setLayoutManager(new LinearLayoutManager(mContext));
        mDeviceAdapter = new DeviceAdapter();
        viewSVRs.setAdapter(mDeviceAdapter);

        setActionBarTitle("Provisioning Tool");
        discoverDevices();
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
    }

    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        Log.d(TAG, "onCreateOptionsMenu");
        inflater.inflate(R.menu.menu_provision, menu);
        MenuItem item;
        int n = mDeviceAdapter.mSelection.size();
        if ((item = menu.findItem(R.id.menuitem_pairing)) != null)
            item.setVisible(n == 2);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        Log.d(TAG, "onOptionsItemSelected");
        switch (item.getItemId()) {
            case R.id.menuitem_refresh:
                discoverDevices();
                return true;
            case R.id.menuitem_pairing:
                linkDevices();
                return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private synchronized void discoverDevices() {
        // Discover owned and unowned devices
        new AsyncTask<Void, String, List<OcSecureResource>>() {
            @Override
            protected void onPreExecute() {
                super.onPreExecute();
                Toast.makeText(mContext, R.string.msg_discovering_ownership, Toast.LENGTH_SHORT).show();
                mDeviceAdapter.clear();
                getActivity().invalidateOptionsMenu();
            }

            @Override
            protected List<OcSecureResource> doInBackground(Void... voids) {
                List<OcSecureResource> devices = null;
                try {
                    devices = OcProvisioning.getDeviceStatusList(discoverDevicesPeriodInSecond);
                    int count = 0;
                    for (OcSecureResource d : devices)
                        if (d.getOwnedStatus() == OwnedStatus.OWNED)
                            count++;
                    publishProgress("Found " + count + "/" + devices.size() + " owned device(s)");
                } catch (OcException e) {
                    Log.e(TAG, "Discovering device error: " + e.toString());
                }
                return devices;
            }

            @Override
            protected void onProgressUpdate(String... msgs) {
                Toast.makeText(mContext, msgs[0], Toast.LENGTH_SHORT).show();
            }

            @Override
            protected void onPostExecute(List<OcSecureResource> devices) {
                for (OcSecureResource d : devices)
                    mDeviceAdapter.add(d);
            }
        }.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    private synchronized void ownDevice(final OcSecureResource dev) {
        // Acquire device ownership
        new AsyncTask<Void, String, Void>() {
            @Override
            protected void onPreExecute() {
                super.onPreExecute();
                Toast.makeText(mContext, R.string.msg_establishing_ownership, Toast.LENGTH_SHORT).show();
            }

            @Override
            protected Void doInBackground(Void... voids) {
                try {
                    dev.doOwnershipTransfer(new OcSecureResource.DoOwnershipTransferListener() {
                        @Override
                        public void doOwnershipTransferListener(List<ProvisionResult> results, int error) {
                            publishProgress(getString(
                                    (error != provisioningError) ? R.string.msg_oxm_succeed : R.string.msg_oxm_failure));
                            if (error != provisioningError)
                                mDeviceAdapter.mDeviceViews.get(dev.getDeviceID()).updateView();
                        }
                    });
                } catch (OcException e) {
                    Log.e(TAG, "Failed to transfer ownership: " + e.toString());
                }
                return null;
            }

            @Override
            protected void onProgressUpdate(String... msgs) {
                Toast.makeText(mContext, msgs[0], Toast.LENGTH_SHORT).show();
            }
        }.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    private synchronized void linkDevices() {
        // Linking devices by provisioning the credential
        final OcSecureResource src  = mDeviceAdapter.mSelection.get(0);
        final OcSecureResource dest = mDeviceAdapter.mSelection.get(1);
        new AsyncTask<Void, String, Void>() {
            @Override
            protected void onPreExecute() {
                super.onPreExecute();
                Toast.makeText(mContext, getString(R.string.msg_linking_devices) + src.getDeviceID() +
                                         " with " + dest.getDeviceID(), Toast.LENGTH_SHORT).show();
            }

            @Override
            protected Void doInBackground(Void... voids) {
                try {
                    src.provisionCredentials(
                            EnumSet.of(CredType.SYMMETRIC_PAIR_WISE_KEY),
                            KeySize.OWNER_PSK_LENGTH_128,
                            dest,
                            new OcSecureResource.ProvisionCredentialsListener() {
                                @Override
                                public void provisionCredentialsListener(List<ProvisionResult> results, int error) {
                                    publishProgress(getString(
                                            (error != provisioningError) ? R.string.msg_provision_cred_succeed : R.string.msg_provision_cred_failure));
                                }
                            });
                } catch (OcException e) {
                    Log.e(TAG, "Failed to provision credential: " + e.toString());
                }
                return null;
            }

            @Override
            protected void onProgressUpdate(String... msgs) {
                Toast.makeText(mContext, msgs[0], Toast.LENGTH_SHORT).show();
            }
        }.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }
}
