import 'dart:js_interop';
import 'dart:js_interop_unsafe';

String collectWebFingerprintSignals() {
  try {
    final nav = globalContext.getProperty<JSObject?>('navigator'.toJS);
    final scr = globalContext.getProperty<JSObject?>('screen'.toJS);
    final ua = (nav?.getProperty<JSAny?>('userAgent'.toJS)?.dartify() ?? '')
        .toString();
    final lang = (nav?.getProperty<JSAny?>('language'.toJS)?.dartify() ?? '')
        .toString();
    final cores =
        (nav?.getProperty<JSAny?>('hardwareConcurrency'.toJS)?.dartify() ?? '')
            .toString();
    final plat = (nav?.getProperty<JSAny?>('platform'.toJS)?.dartify() ?? '')
        .toString();
    final sw = (scr?.getProperty<JSAny?>('width'.toJS)?.dartify() ?? '')
        .toString();
    final sh = (scr?.getProperty<JSAny?>('height'.toJS)?.dartify() ?? '')
        .toString();
    final tz = DateTime.now().timeZoneOffset.inMinutes.toString();
    return '$ua|$lang|$cores|$plat|${sw}x$sh|$tz';
  } catch (_) {
    return 'web-fallback-${DateTime.now().timeZoneOffset.inMinutes}';
  }
}

/// Inspects browser navigator.userAgent & platform to identify the true visitor OS.
String detectWebOsKey() {
  try {
    final nav = globalContext.getProperty<JSObject?>('navigator'.toJS);
    final ua = (nav?.getProperty<JSAny?>('userAgent'.toJS)?.dartify() ?? '')
        .toString()
        .toLowerCase();
    final plat = (nav?.getProperty<JSAny?>('platform'.toJS)?.dartify() ?? '')
        .toString()
        .toLowerCase();

    if (ua.contains('iphone') ||
        ua.contains('ipad') ||
        ua.contains('ipod') ||
        (plat.contains('mac') && ua.contains('mobile'))) {
      return 'ios';
    }
    if (ua.contains('android')) {
      return 'android';
    }
    if (ua.contains('mac os x') || ua.contains('macintosh') || plat.contains('mac')) {
      return 'macos';
    }
    if (ua.contains('windows') || plat.contains('win')) {
      return 'windows';
    }
    if (ua.contains('linux') || plat.contains('linux')) {
      return 'linux';
    }
  } catch (_) {}
  return 'windows';
}

String getWebNotificationPermissionState() {
  try {
    final notifCtor = globalContext.getProperty<JSObject?>('Notification'.toJS);
    if (notifCtor == null) return 'unsupported';
    return (notifCtor.getProperty<JSAny?>('permission'.toJS)?.dartify() ??
            'default')
        .toString();
  } catch (_) {
    return 'default';
  }
}

Future<bool> requestWebNotificationPermission() async {
  try {
    final notifCtor = globalContext.getProperty<JSObject?>('Notification'.toJS);
    if (notifCtor == null) return false;
    final current =
        (notifCtor.getProperty<JSAny?>('permission'.toJS)?.dartify() ?? '')
            .toString();
    if (current == 'granted') return true;
    if (current == 'denied') return false;
    final promise = notifCtor.callMethod<JSPromise<JSAny?>?>(
      'requestPermission'.toJS,
    );
    if (promise == null) return false;
    final res = await promise.toDart;
    return res?.dartify()?.toString() == 'granted';
  } catch (_) {
    return false;
  }
}

/// Triggers the real browser Screen/Window Share picker (`getDisplayMedia`) so
/// the user explicitly grants game-window feed verification permission.
Future<bool> requestWebDisplayCapturePermission() async {
  try {
    final nav = globalContext.getProperty<JSObject?>('navigator'.toJS);
    final mediaDevices = nav?.getProperty<JSObject?>('mediaDevices'.toJS);
    if (mediaDevices == null) return false;

    final constraints = JSObject();
    constraints.setProperty('video'.toJS, true.toJS);
    constraints.setProperty('audio'.toJS, false.toJS);

    final promise = mediaDevices.callMethod<JSPromise<JSAny?>?>(
      'getDisplayMedia'.toJS,
      constraints,
    );
    if (promise == null) return false;

    final streamAny = await promise.toDart;
    final stream = streamAny as JSObject?;
    if (stream == null) return false;

    // Release preview tracks cleanly while recording authorization;
    // active capture pipeline re-acquires when match enters LIVE state.
    final tracksObj = stream.callMethod<JSObject?>('getTracks'.toJS);
    if (tracksObj != null) {
      final length =
          (tracksObj.getProperty<JSAny?>('length'.toJS)?.dartify() as num?)
                  ?.toInt() ??
              0;
      for (int i = 0; i < length; i++) {
        final track = tracksObj.getProperty<JSObject?>(i.toString().toJS);
        track?.callMethod<JSAny?>('stop'.toJS);
      }
    }
    return true;
  } catch (_) {
    return false;
  }
}

Future<bool> sendWebOsNotification({
  required String title,
  required String body,
}) async {
  try {
    final notifCtor =
        globalContext.getProperty<JSFunction?>('Notification'.toJS);
    if (notifCtor == null) return false;
    final perm =
        (notifCtor.getProperty<JSAny?>('permission'.toJS)?.dartify() ?? '')
            .toString();
    if (perm != 'granted') return false;
    final opts = JSObject();
    opts.setProperty('body'.toJS, body.toJS);
    opts.setProperty('icon'.toJS, 'favicon.png'.toJS);
    opts.setProperty('tag'.toJS, 'playverzus_live_match'.toJS);
    notifCtor.callAsConstructor<JSObject>(title.toJS, opts);
    return true;
  } catch (_) {
    return false;
  }
}

Future<bool> checkWebAssetAvailable(String url) async {
  try {
    final init = JSObject();
    init.setProperty('method'.toJS, 'HEAD'.toJS);
    final promise = globalContext.callMethod<JSPromise<JSAny?>?>(
      'fetch'.toJS,
      url.toJS,
      init,
    );
    if (promise == null) return false;
    final res = (await promise.toDart) as JSObject?;
    if (res == null) return false;
    final ok = res.getProperty<JSAny?>('ok'.toJS)?.dartify() == true;
    if (!ok) return false;
    final headers = res.getProperty<JSObject?>('headers'.toJS);
    final ct = (headers
                ?.callMethod<JSAny?>('get'.toJS, 'content-type'.toJS)
                ?.dartify() ??
            '')
        .toString()
        .toLowerCase();
    // Avoid mistaking Next.js SPA HTML fallback / 404 pages for a binary installer
    if (ct.contains('text/html')) return false;
    return true;
  } catch (_) {
    return false;
  }
}

bool isWebAppInstallReady() {
  try {
    return globalContext.getProperty<JSObject?>('__pvzDeferredInstallPrompt'.toJS) !=
        null;
  } catch (_) {
    return false;
  }
}

Future<bool> promptWebAppInstall() async {
  try {
    final promptObj =
        globalContext.getProperty<JSObject?>('__pvzDeferredInstallPrompt'.toJS);
    if (promptObj == null) return false;
    final p = promptObj.callMethod<JSPromise<JSAny?>?>('prompt'.toJS);
    if (p != null) {
      await p.toDart;
    }
    final choicePromise =
        promptObj.getProperty<JSPromise<JSAny?>?>('userChoice'.toJS);
    if (choicePromise != null) {
      final choice = (await choicePromise.toDart) as JSObject?;
      final outcome =
          (choice?.getProperty<JSAny?>('outcome'.toJS)?.dartify() ?? '')
              .toString();
      globalContext.setProperty('__pvzDeferredInstallPrompt'.toJS, null);
      return outcome == 'accepted';
    }
    return true;
  } catch (_) {
    return false;
  }
}
