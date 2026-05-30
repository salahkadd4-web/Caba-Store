package com.cabastore.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

  private static final String SERVER_URL    = "https://caba-store.vercel.app";
  private static final String PREFS_NAME    = "app_prefs";

  @Override
  public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}

  // ── Bridge JS ↔ SharedPreferences pour offline.html ──────────────────────
  // localStorage est bloqué sur file:// dans Android WebView.
  // Ce bridge expose get/set via window.AndroidBridge dans la page offline.
  public class AndroidBridge {
    private final SharedPreferences prefs;

    AndroidBridge(SharedPreferences prefs) { this.prefs = prefs; }

    @JavascriptInterface
    public String getString(String key) {
      return prefs.getString("offline_" + key, null);
    }

    @JavascriptInterface
    public void setString(String key, String value) {
      prefs.edit().putString("offline_" + key, value).apply();
    }
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(SocialLoginPlugin.class);

    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

    // ── Effacer les cookies sur nouvelle install / mise à jour ─────────────
    try {
      PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
      int currentVersionCode = info.versionCode;
      int storedVersionCode  = prefs.getInt("last_version_code", -1);

      if (storedVersionCode != currentVersionCode) {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.removeAllCookies(null);
        cookieManager.flush();
        prefs.edit().putInt("last_version_code", currentVersionCode).apply();
      }
    } catch (PackageManager.NameNotFoundException e) {
      e.printStackTrace();
    }

    super.onCreate(savedInstanceState);

    WebView webView = getBridge().getWebView();

    // ── Activer JavaScript (requis pour addJavascriptInterface) ───────────
    webView.getSettings().setJavaScriptEnabled(true);

    // ── Injecter le bridge SharedPreferences ──────────────────────────────
    webView.addJavascriptInterface(new AndroidBridge(prefs), "AndroidBridge");

    // ── Injecter le WebViewClient offline ─────────────────────────────────
    webView.setWebViewClient(new OfflineWebViewClient());

    // ── Point d'entrée ────────────────────────────────────────────────────
    if (!isNetworkAvailable()) {
      loadOfflinePage(webView);
    } else {
      webView.loadUrl(SERVER_URL + "/app-entry");
    }
  }

  // ── Disponibilité réseau ───────────────────────────────────────────────────
  private boolean isNetworkAvailable() {
    ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
    if (cm == null) return false;
    NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
    if (nc == null) return false;
    return nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        && nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
  }

  private void loadOfflinePage(WebView webView) {
    webView.loadUrl("file:///android_asset/offline.html");
  }

  // ── Code d'erreur = vrai problème réseau ? ────────────────────────────────
  private boolean isNetworkError(int code) {
    return code == WebViewClient.ERROR_HOST_LOOKUP
        || code == WebViewClient.ERROR_CONNECT
        || code == WebViewClient.ERROR_TIMEOUT
        || code == WebViewClient.ERROR_IO
        || code == WebViewClient.ERROR_FAILED_SSL_HANDSHAKE
        || code == WebViewClient.ERROR_UNKNOWN;
  }

  // ── WebViewClient personnalisé ─────────────────────────────────────────────
  private class OfflineWebViewClient extends WebViewClient {

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request,
                                WebResourceError error) {
      if (!request.isForMainFrame()) return;
      if (isNetworkError(error.getErrorCode())) {
        loadOfflinePage(view);
      }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                    WebResourceResponse errorResponse) {
      // Next.js gère ses propres erreurs 4xx/5xx
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
      String url = request.getUrl().toString();

      if (url.startsWith("file://"))              return false; // offline.html
      if (url.startsWith("com.cabastore.app://")) return false; // deep links OAuth

      if (url.startsWith("https://caba-store.vercel.app")) {
        if (!isNetworkAvailable()) {
          loadOfflinePage(view);
          return true; // on a géré, ne pas charger l'URL
        }
      }
      return false;
    }
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);

    if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN &&
        requestCode <  GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
      PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
      if (pluginHandle == null) return;
      SocialLoginPlugin plugin = (SocialLoginPlugin) pluginHandle.getInstance();
      if (plugin == null) return;
      plugin.handleGoogleLoginIntent(requestCode, data);
    }
  }
}