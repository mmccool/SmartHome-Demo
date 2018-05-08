package com.intel.otc.iot.smarthome;

import android.app.Dialog;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.Toast;

import java.net.MalformedURLException;
import java.net.URL;

public class WebViewFragment extends BaseFragment {
    private static final String TAG = WebViewFragment.class.getSimpleName();

    public interface OnWebviewPageLoaded {
        void onWebviewPageLoaded(String url, Object arg);
    }
    private WebView webView;
    private String mUrlLast;
    private OnWebviewPageLoaded mPageLoadedListener;
    private Object mPageLoadedListenerArg;

    public void configure(String urlInit, OnWebviewPageLoaded listener, Object arg) {
        mUrlLast = urlInit;
        mPageLoadedListener = listener;
        mPageLoadedListenerArg = arg;
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        Log.d(TAG, "onCreateView");
        // Enable populating the options menu
        setHasOptionsMenu(true);
        getActivity().invalidateOptionsMenu();

        View v = inflater.inflate(R.layout.fragment_webview, container, false);
        webView = (WebView) v.findViewById(R.id.webview);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                try {
                    setActionBarTitle(new URL(url).getHost());
                    if (null != mPageLoadedListener)
                        mPageLoadedListener.onWebviewPageLoaded(mUrlLast = url, mPageLoadedListenerArg);
                } catch (MalformedURLException e) {
                }
            }
        });

        // Enable Javascript
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);

        if (null != mUrlLast) {
            loadUrl(mUrlLast);
        } else {
            setActionBarTitle(null);
            Toast.makeText(mContext, R.string.fragment_webview_greeting, Toast.LENGTH_SHORT).show();
        }
        return v;
    }

    @Override
    public void onAttach(Context context) {
        Log.d(TAG, "onAttach");
        super.onAttach(context);
        mContext = context;
    }

    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        Log.d(TAG, "onCreateOptionsMenu");
        inflater.inflate(R.menu.menu_webview, menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        Log.d(TAG, "onOptionsItemSelected");
        switch (item.getItemId()) {
            case R.id.menuitem_conenct:
                final Dialog dialog = new Dialog(mContext);
                dialog.setContentView(R.layout.dialog_connect);
                dialog.setTitle(R.string.fragment_webview_greeting);
                try {
                    URL url = new URL(mUrlLast);
                    ((EditText) dialog.findViewById(R.id.editDestinationAddress)).setText(url.getHost());
                    int port = url.getPort();
                    ((EditText) dialog.findViewById(R.id.editDestinationPort)).setText(
                            (port >= 0)? Integer.toString(port) : "");
                } catch (MalformedURLException e) {
                }
                ImageButton btn = (ImageButton) dialog.findViewById(R.id.btnConnectToDestination);
                btn.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        String url = ((EditText) dialog.findViewById(R.id.editDestinationAddress)).getText().toString();
                        if (!url.isEmpty()) {
                            String port = ((EditText) dialog.findViewById(R.id.editDestinationPort)).getText().toString();
                            if (!port.isEmpty())
                                url += ":" + port;
                            loadUrl(url);
                        }
                        dialog.dismiss();
                    }
                });
                dialog.show();
                return true;
        }
        return super.onOptionsItemSelected(item);
    }

    public void loadUrl(String url) {
        url = url.toLowerCase();
        if (!(url.startsWith("http://") || url.startsWith("https://")))
            url = "http://" + url;
        webView.loadUrl(url);
        setActionBarTitle(getResources().getText(R.string.msg_loading));
    }
}
