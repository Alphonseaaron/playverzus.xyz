String collectWebFingerprintSignals() => 'native-runtime';

Future<bool> requestWebNotificationPermission() async => true;

Future<bool> sendWebOsNotification({
  required String title,
  required String body,
}) async =>
    false;
