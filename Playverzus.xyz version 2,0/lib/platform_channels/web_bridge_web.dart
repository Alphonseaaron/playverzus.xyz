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
