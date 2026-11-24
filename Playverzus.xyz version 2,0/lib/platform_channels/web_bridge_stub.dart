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

Future<bool> checkWebAssetAvailable(String url) async => false;

bool isWebAppInstallReady() => false;

Future<bool> promptWebAppInstall() async => false;

bool isRunningStandaloneApp() => true;

bool hasPendingWebUpdate() => false;

void checkWebServiceWorkerUpdate() {}

void applyWebAppUpdate() {}
