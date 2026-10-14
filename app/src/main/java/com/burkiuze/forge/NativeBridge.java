package com.burkiuze.forge;

import android.app.ActivityManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * window.ForgeNative. Every network call from the editor goes through here so it is not
 * limited by browser CORS rules (DuckDuckGo, GitHub raw files, LAN model servers, …).
 * Results come back asynchronously through window.ForgeBridge._resolve/_reject/_chunk/_done.
 */
public class NativeBridge {
    private final MainActivity activity;
    private final WebView web;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final Map<String, HttpURLConnection> live = new ConcurrentHashMap<>();
    private final SharedPreferences secrets;

    NativeBridge(MainActivity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.secrets = activity.getSharedPreferences("forge_secrets", Context.MODE_PRIVATE);
    }

    // ------------------------------------------------------------------ info

    @JavascriptInterface
    public String info() {
        try {
            JSONObject o = new JSONObject();
            o.put("versionName", BuildConfig.VERSION_NAME);
            o.put("versionCode", BuildConfig.VERSION_CODE);
            o.put("sdk", Build.VERSION.SDK_INT);
            o.put("device", Build.MANUFACTURER + " " + Build.MODEL);
            ActivityManager am = (ActivityManager) activity.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            o.put("ramMb", mi.totalMem / (1024 * 1024));
            o.put("freeStorageMb", activity.getFilesDir().getUsableSpace() / (1024 * 1024));
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    // ------------------------------------------------------------------ http

    /**
     * req: {url, method, headers:{}, body?: string, bodyBase64?: string,
     *       responseType: "text"|"base64", stream?: bool, timeoutMs?: number}
     */
    @JavascriptInterface
    public void request(final String id, final String reqJson) {
        pool.execute(() -> {
            HttpURLConnection c = null;
            try {
                JSONObject req = new JSONObject(reqJson);
                URL url = new URL(req.getString("url"));
                c = (HttpURLConnection) url.openConnection();
                live.put(id, c);
                int timeout = req.optInt("timeoutMs", 60000);
                c.setConnectTimeout(Math.min(timeout, 20000));
                c.setReadTimeout(timeout);
                c.setInstanceFollowRedirects(true);
                String method = req.optString("method", "GET");
                c.setRequestMethod(method);
                c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) ForgeMobile/" + BuildConfig.VERSION_NAME);
                JSONObject headers = req.optJSONObject("headers");
                if (headers != null) {
                    Iterator<String> it = headers.keys();
                    while (it.hasNext()) {
                        String k = it.next();
                        c.setRequestProperty(k, headers.getString(k));
                    }
                }
                byte[] body = null;
                if (req.has("bodyBase64")) body = Base64.decode(req.getString("bodyBase64"), Base64.DEFAULT);
                else if (req.has("body") && !req.isNull("body")) body = req.getString("body").getBytes(StandardCharsets.UTF_8);
                if (body != null) {
                    c.setDoOutput(true);
                    c.setFixedLengthStreamingMode(body.length);
                    try (OutputStream os = c.getOutputStream()) {
                        os.write(body);
                    }
                }
                int status = c.getResponseCode();
                InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                JSONObject respHeaders = new JSONObject();
                for (Map.Entry<String, List<String>> h : c.getHeaderFields().entrySet()) {
                    if (h.getKey() != null && !h.getValue().isEmpty())
                        respHeaders.put(h.getKey().toLowerCase(), h.getValue().get(0));
                }
                if (req.optBoolean("stream", false) && in != null) {
                    byte[] buf = new byte[4096];
                    int n;
                    StringBuilder pending = new StringBuilder();
                    long last = System.currentTimeMillis();
                    java.io.InputStreamReader reader = new java.io.InputStreamReader(in, StandardCharsets.UTF_8);
                    char[] cbuf = new char[2048];
                    while ((n = reader.read(cbuf)) != -1) {
                        pending.append(cbuf, 0, n);
                        long now = System.currentTimeMillis();
                        if (now - last > 40 || pending.length() > 8192) {
                            emit("_chunk", id, JSONObject.quote(pending.toString()));
                            pending.setLength(0);
                            last = now;
                        }
                    }
                    if (pending.length() > 0) emit("_chunk", id, JSONObject.quote(pending.toString()));
                    JSONObject done = new JSONObject();
                    done.put("status", status);
                    done.put("headers", respHeaders);
                    emit("_done", id, done.toString());
                } else {
                    byte[] data = in == null ? new byte[0] : readAll(in);
                    JSONObject out = new JSONObject();
                    out.put("status", status);
                    out.put("headers", respHeaders);
                    out.put("url", c.getURL().toString());
                    if ("base64".equals(req.optString("responseType"))) {
                        out.put("body", Base64.encodeToString(data, Base64.NO_WRAP));
                    } else {
                        out.put("body", new String(data, StandardCharsets.UTF_8));
                    }
                    emit("_resolve", id, out.toString());
                }
            } catch (Exception e) {
                emit("_reject", id, JSONObject.quote(String.valueOf(e.getMessage() == null ? e : e.getMessage())));
            } finally {
                live.remove(id);
                if (c != null) c.disconnect();
            }
        });
    }

    @JavascriptInterface
    public void abort(String id) {
        HttpURLConnection c = live.remove(id);
        if (c != null) pool.execute(c::disconnect);
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) != -1) bo.write(buf, 0, n);
        return bo.toByteArray();
    }

    private void emit(final String fn, final String id, final String jsonArg) {
        final String js = "window.ForgeBridge&&window.ForgeBridge." + fn + "(" + JSONObject.quote(id) + "," + jsonArg + ")";
        main.post(() -> web.evaluateJavascript(js, null));
    }

    // ------------------------------------------------------------------ secrets

    @JavascriptInterface
    public String secretGet(String key) {
        return secrets.getString(key, "");
    }

    @JavascriptInterface
    public void secretSet(String key, String value) {
        secrets.edit().putString(key, value).apply();
    }

    @JavascriptInterface
    public void secretRemove(String key) {
        secrets.edit().remove(key).apply();
    }

    // ------------------------------------------------------------------ system

    @JavascriptInterface
    public void openUrl(String url) {
        activity.openExternal(url);
    }

    @JavascriptInterface
    public void setBars(String hex, boolean light) {
        activity.setBarColors(hex, light);
    }

    @JavascriptInterface
    public void share(String title, String text) {
        main.post(() -> {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_SUBJECT, title);
            i.putExtra(Intent.EXTRA_TEXT, text);
            activity.startActivity(Intent.createChooser(i, title));
        });
    }

    /** Saves a file into Downloads/Forge and returns the saved location (or "" on failure). */
    @JavascriptInterface
    public String saveFile(String name, String mime, String base64) {
        try {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                v.put(MediaStore.Downloads.MIME_TYPE, mime);
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Forge");
                Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) return "";
                try (OutputStream os = activity.getContentResolver().openOutputStream(uri)) {
                    if (os == null) return "";
                    os.write(data);
                }
                return "Download/Forge/" + name;
            }
            File dir = new File(activity.getExternalFilesDir(null), "exports");
            if (!dir.exists() && !dir.mkdirs()) return "";
            File f = new File(dir, name);
            try (FileOutputStream fo = new FileOutputStream(f)) {
                fo.write(data);
            }
            return f.getAbsolutePath();
        } catch (Exception e) {
            return "";
        }
    }

    @JavascriptInterface
    public void exitApp() {
        main.post(activity::finishAndRemoveTask);
    }
}
