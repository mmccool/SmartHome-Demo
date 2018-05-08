package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.View;
import android.widget.Toast;

import org.iotivity.base.ObserveType;
import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

abstract class CardOcResource extends RecyclerView.ViewHolder implements
        OcResource.OnGetListener,
        OcResource.OnPutListener,
        OcResource.OnPostListener,
        OcResource.OnObserveListener
{
    private static final String TAG = CardOcResource.class.getSimpleName();
    public static boolean __set_representation_with_put = false;

    protected Context mContext;
    protected OcResource mOcResource = null;

    CardOcResource(View parentView, Context context) {
        super(parentView);
        mContext = context;
    }

    public void bindResource(OcResource resource) {
        mOcResource = resource;
    }

    protected void getOcRepresentation(final Map<String, String> queryParams) {
        Log.d(TAG, "Getting representation of " + mOcResource.getHost() + mOcResource.getUri());
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    mOcResource.get((null == queryParams)? new HashMap<String, String>() : queryParams, CardOcResource.this);
                } catch (OcException e) {
                    Log.e(TAG, e.toString());
                }
            }
        }).start();
    }

    protected void setOcRepresentation(final OcRepresentation rep,
                                       final Map<String, String> queryParams) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (__set_representation_with_put)
                        mOcResource.put(rep, (null == queryParams)? new HashMap<String, String>() : queryParams, CardOcResource.this);
                    else
                        mOcResource.post(rep, (null == queryParams)? new HashMap<String, String>() : queryParams, CardOcResource.this);
                } catch (OcException e) {
                    Log.e(TAG, e.toString());
                }
            }
        }).start();
    }

    protected void setOcRepresentationAcknowledge(List<OcHeaderOption> list, OcRepresentation rep) {
        Log.d(TAG, "Discard response from "  + mOcResource.getHost() + mOcResource.getUri());
    }

    protected void observeOcRepresentation(final Map<String, String> queryParams) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    mOcResource.observe(ObserveType.OBSERVE,
                            (null == queryParams)? new HashMap<String, String>() : queryParams, CardOcResource.this);
                } catch (OcException e) {
                    Log.e(TAG, e.toString());
                }
            }
        }).start();
    }

    @Override
    public synchronized void onGetFailed(Throwable throwable) {
        raiseException("GET", throwable);
    }

    @Override
    public void onPutCompleted(List<OcHeaderOption> list, OcRepresentation rep) {
        setOcRepresentationAcknowledge(list, rep);
    }

    @Override
    public synchronized void onPutFailed(Throwable throwable) {
        raiseException("GET", throwable);
    }

    @Override
    public void onPostCompleted(List<OcHeaderOption> list, OcRepresentation rep) {
        setOcRepresentationAcknowledge(list, rep);
    }

    @Override
    public synchronized void onPostFailed(Throwable throwable) {
        raiseException("POST", throwable);
    }

    @Override
    public synchronized void onObserveCompleted(List<OcHeaderOption> list, OcRepresentation rep, int sequenceNumber) {
        if (OcResource.OnObserveListener.REGISTER == sequenceNumber) {
            Log.d(TAG, "Observe registration on " + mOcResource.getUri() + " successful with SequenceNumber:" + sequenceNumber);
        } else if (OcResource.OnObserveListener.DEREGISTER == sequenceNumber) {
            Log.d(TAG, "Observe De-registration on " + mOcResource.getUri() + " successful");
        } else if (OcResource.OnObserveListener.NO_OPTION == sequenceNumber) {
            Log.e(TAG, "Failed to observe registration or de-registration");
        }
    }

    @Override
    public synchronized void onObserveFailed(Throwable throwable) {
        raiseException("Observe", throwable);
    }

    protected synchronized void raiseException(String op, Throwable throwable) {
        if (throwable instanceof OcException) {
            final OcException ocException = (OcException) throwable;
            Log.e(TAG, "Failed to " + op + " representation [" + ocException.getErrorCode() + "]\n" + ocException.toString());
            ((Activity) mContext).runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(mContext, mOcResource.getHost() + ':' + mOcResource.getUri() + '\n' +
                            ocException.getErrorCode().toString(), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
