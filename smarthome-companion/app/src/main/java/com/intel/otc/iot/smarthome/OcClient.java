package com.intel.otc.iot.smarthome;

import android.content.Context;
import android.util.Log;

import org.iotivity.base.ModeType;
import org.iotivity.base.OcConnectivityType;
import org.iotivity.base.OcException;
import org.iotivity.base.OcPlatform;
import org.iotivity.base.OcProvisioning;
import org.iotivity.base.OcResource;
import org.iotivity.base.OcResourceIdentifier;
import org.iotivity.base.PlatformConfig;
import org.iotivity.base.QualityOfService;
import org.iotivity.base.ServiceType;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class OcClient implements OcPlatform.OnResourceFoundListener {
    private static final String TAG = OcClient.class.getSimpleName();
    private static final String SVR_DB_NAME = "oic_svr_db.dat";
    private static final String SQL_DB_NAME = "Pdm.db";
    private static final int BUF_SIZE = 1024;

    public interface OnResourceFound {
        void onResourceFound(OcResource resource);
    }
    private String dbPath;
    private OnResourceFound onResourceFoundListener;
    private Map<OcResourceIdentifier, OcResource> mResourceFound = new HashMap<>();

    public OcClient(Context context, OnResourceFound listener) {
        dbPath = context.getFilesDir().getPath() + File.separator;
        File dbDir = new File(dbPath);
        if (!(dbDir.isDirectory())) {
            // Create the folder if not exist
            dbDir.mkdirs();
            Log.d(TAG, "Create DB directory at " + dbPath);
        }
        prepareDB(context);

        onResourceFoundListener = listener;
        PlatformConfig platformConfig = new PlatformConfig(
                context,
                ServiceType.IN_PROC,
                ModeType.CLIENT_SERVER,
                "0.0.0.0", // By setting to "0.0.0.0", it binds to all available interfaces
                0,         // Uses randomly available port
                QualityOfService.LOW,
                dbPath + SVR_DB_NAME
        );
        OcPlatform.Configure(platformConfig);

        String sqlDbFilename = dbPath + SQL_DB_NAME;
        Log.d(TAG, "Initialize database " + sqlDbFilename + "...");
        try {
            OcProvisioning.provisionInit(sqlDbFilename);
        } catch (OcException e) {
            e.printStackTrace();
        }
    }

    private void prepareDB(Context context) {
        String svrDbFilename = dbPath + SVR_DB_NAME;
        File svrDbFile = new File(svrDbFilename);
        if (!svrDbFile.exists()) {
            // Copy from the built-in SVR DB file asset
            InputStream inStream = null;
            OutputStream outStream = null;
            try {
                inStream = context.getAssets().open(SVR_DB_NAME);
                outStream = new FileOutputStream(svrDbFilename);
                byte[] buf = new byte[BUF_SIZE];
                int count;
                while ((count = inStream.read(buf)) != -1)
                    outStream.write(buf, 0, count);
                Log.d(TAG, "Copy " + SVR_DB_NAME + " from the package asset");
            } catch (IOException e) {
                Log.e(TAG, e.getMessage());
            } finally {
                try {
                    if (inStream != null)  inStream.close();
                    if (outStream != null) outStream.close();
                } catch (IOException e) {
                    Log.e(TAG, e.getMessage());
                }
            }
        } else {
            Log.d(TAG, "Found SVR DB file: " + svrDbFilename);
        }
    }

    public synchronized void findResources(final String ocResourceType) {
        mResourceFound.clear();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    OcPlatform.OnResourceFoundListener listener = OcClient.this;
                    String requestUri = OcPlatform.WELL_KNOWN_QUERY + "?rt=" + ocResourceType;
                    OcPlatform.findResource("", requestUri, EnumSet.of(OcConnectivityType.CT_DEFAULT), listener);
                    TimeUnit.SECONDS.sleep(1);
                    /* Find resource is done twice so that we discover the original resources a second time.
                     * These resources will have the same uniqueidentifier (yet be different objects),
                     * so that we can verify/show the duplicate-checking code in foundResource();
                     */
                    OcPlatform.findResource("", requestUri, EnumSet.of(OcConnectivityType.CT_DEFAULT), listener);
                } catch (OcException | InterruptedException e) {
                    Log.e(TAG, e.toString());
                }
            }
        }).start();
    }

    @Override
    public void onResourceFound(OcResource ocResource) {
        if (null == ocResource) {
            Log.e(TAG, "Invalid resource found");
            return;
        }
        if (!mResourceFound.containsKey(ocResource.getUniqueIdentifier())) {
            Log.d(TAG, "Found resource " + ocResource.getHost() + ocResource.getUri() +
                        " for the first time on server with ID " + ocResource.getServerId());
            mResourceFound.put(ocResource.getUniqueIdentifier(), ocResource);
        } else {
            Log.d(TAG, "Found resource " + ocResource.getHost() + ocResource.getUri());
            String host = ocResource.getHost();
            if (host.startsWith("coap://")     || host.startsWith("coaps://") ||
                host.startsWith("coap+tcp://") || host.startsWith("coaps+tcp://")) {
                // get the endpoints information of this resource
                List<String> ep = ocResource.getAllHosts();
                for (String s : ep) {
                    Log.d(TAG, "Changing the host of this resource to " + s);
                    ocResource.setHost(s);
                    break;
                }
            }
            if (null != onResourceFoundListener)
                onResourceFoundListener.onResourceFound(ocResource);
        }
    }

    @Override
    public void onFindResourceFailed(Throwable throwable, String s) {
        Log.e(TAG, "Resource discovery failure: " + throwable.toString());
    }
}
