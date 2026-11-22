String collectWebFingerprintSignals() => 'native-runtime';

String detectWebOsKey() => 'native';

String getWebNotificationPermissionState() => 'granted';

Future<bool> requestWebNotificationPermission() async => true;

Future<bool> requestWebDisplayCapturePermission() async => true;

Future<bool> sendWebOsNotification({
  required String title,
  required String body,
}) async =>
    false;
