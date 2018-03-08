package com.intel.otc.iot.smarthome;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ImageButton;
import android.widget.Spinner;
import android.widget.TextView;

import org.iotivity.base.OcException;
import org.iotivity.base.OcHeaderOption;
import org.iotivity.base.OcRepresentation;
import org.iotivity.base.OcResource;

import java.util.Arrays;
import java.util.List;

public class CardMp3Player extends CardOcResource implements AdapterView.OnItemSelectedListener {
    private static final String TAG = CardMp3Player.class.getSimpleName();
    public  static final String RESOURCE_TYPE = "x.com.intel.demo.mp3player";
    private static final String KEY_MEDIASTATES = "mediaStates";
    private static final String KEY_STATE = "state";
    private static final String KEY_TITLE = "title";
    private static final String KEY_PLAYLIST = "playList";
    private static final String KEY_SELECT = "select";
    private enum PlayerState {
        Idle, Playing, Paused
    }

    private List<String> mValidStates = null;
    private int mCurrentStateIndex = 0;
    private TextView mResourceId;
    private Spinner mSpinnerDisplay;
    private String[] mPlayList = null;
    private int mLastTitlePos = 0;
    private ImageButton mImageButtonPlayPause;
    private ImageButton mImageButtonStop;

    CardMp3Player(View parentView, Context context) {
        super(parentView, context);
        mResourceId = (TextView) parentView.findViewById(R.id.label_title);
        mSpinnerDisplay = (Spinner) parentView.findViewById(R.id.spinner_display);
        mSpinnerDisplay.setOnItemSelectedListener(this);
        mImageButtonPlayPause = (ImageButton) parentView.findViewById(R.id.btn_play_pause);
        mImageButtonPlayPause.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                setOcRepresentation((mCurrentStateIndex == PlayerState.Playing.ordinal())?
                        PlayerState.Paused : PlayerState.Playing);
            }
        });
        mImageButtonStop = (ImageButton) parentView.findViewById(R.id.btn_stop);
        mImageButtonStop.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                setOcRepresentation(PlayerState.Idle);
            }
        });
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
        updatePlayerState(rep);
    }

    private void updatePlayerState(OcRepresentation rep) {
        try {
            if (null == mValidStates && rep.hasAttribute(KEY_MEDIASTATES))
                mValidStates = Arrays.asList((String[]) rep.getValue(KEY_MEDIASTATES));
            if (rep.hasAttribute(KEY_PLAYLIST))
                mPlayList = rep.getValue(KEY_PLAYLIST);
            int state = mValidStates.indexOf(rep.getValue(KEY_STATE));
            if (PlayerState.Idle.ordinal() <= state && state <= PlayerState.Paused.ordinal()) {
                mCurrentStateIndex = state;
                String title = rep.hasAttribute(KEY_TITLE) ? (String) rep.getValue(KEY_TITLE) : null;
                display(state, title);
            }
        } catch (OcException e) {
            Log.e(TAG, e.toString());
        }
    }

    private void display(final int state, final String title) {
        ((Activity) mContext).runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (mPlayList != null) {
                    ArrayAdapter<String> adapter = new ArrayAdapter<>(mContext, android.R.layout.simple_spinner_dropdown_item, mPlayList);
                    mSpinnerDisplay.setAdapter(adapter);
                    int pos;
                    if (title != null && (pos = adapter.getPosition(title)) >= 0)
                        mLastTitlePos = pos;
                    mSpinnerDisplay.setSelection(mLastTitlePos);
                }
                mImageButtonStop.setEnabled(state != PlayerState.Idle.ordinal());
                mImageButtonPlayPause.setImageResource((state == PlayerState.Playing.ordinal())?
                        android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play);
            }
        });
    }

    private void setOcRepresentation(final PlayerState state) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    OcRepresentation rep = new OcRepresentation();
                    rep.setValue(KEY_STATE, mValidStates.get(state.ordinal()));
                    setOcRepresentation(rep, null);
                    Log.d(TAG, "\tChange to '" + state.toString() + "' state");
                } catch (OcException e) {
                    Log.e(TAG, e.toString());
                }
            }
        }).start();
    }

    private void setOcRepresentation(final int pos) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    OcRepresentation rep = new OcRepresentation();
                    rep.setValue(KEY_SELECT, pos);
                    setOcRepresentation(rep, null);
                    Log.d(TAG, "Select '" + mPlayList[pos] + "'");
                } catch (OcException e) {
                    Log.e(TAG, e.toString());
                }
            }
        }).start();
    }

    @Override
    protected void setOcRepresentationAcknowledge(List<OcHeaderOption> list, OcRepresentation rep) {
       getOcRepresentation(null);
    }

    @Override
    public synchronized void onPutFailed(Throwable throwable) {
        super.onPutFailed(throwable);
        getOcRepresentation(null);
    }

    @Override
    public synchronized void onPostFailed(Throwable throwable) {
        super.onPostFailed(throwable);
        getOcRepresentation(null);
    }

    @Override
    public void onItemSelected(AdapterView<?> adapterView, View view, int pos, long id) {
        if (mLastTitlePos != pos) {
            setOcRepresentation(pos);
            mLastTitlePos = pos;
        }
    }

    @Override
    public void onNothingSelected(AdapterView<?> adapterView) {
    }
}
