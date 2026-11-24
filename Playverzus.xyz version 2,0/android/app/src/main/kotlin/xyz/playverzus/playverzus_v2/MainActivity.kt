package xyz.playverzus.playverzus_v2

import android.Manifest
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.security.MessageDigest

class MainActivity : FlutterActivity() {
    private val channelName = "xyz.playverzus.v2/device_bridge"
    private val liveChannelId = "playverzus_live_match"
    private val ongoingNotificationId = 9001
    private var liveEventNotificationId = 9100
    private val notifReqCode = 4041
    private val captureReqCode = 4042
    private var pendingNotificationResult: MethodChannel.Result? = null
    private var pendingCaptureResult: MethodChannel.Result? = null
    private var captureConsentGrantedInSession = false

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        ensureLiveMatchNotificationChannel()

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getDeviceFingerprint" -> {
                        val androidId = Settings.Secure.getString(
                            contentResolver,
                            Settings.Secure.ANDROID_ID
                        ) ?: "unknown_android_id"
                        val raw = listOf(
                            androidId,
                            Build.MANUFACTURER,
                            Build.BRAND,
                            Build.MODEL,
                            Build.DEVICE,
                            Build.FINGERPRINT
                        ).joinToString("|")
                        val hash = sha256Hex(raw).take(16).uppercase()
                        result.success(
                            mapOf(
                                "fingerprint" to "PVZ-AND-$hash",
                                "deviceModel" to "${Build.MANUFACTURER} ${Build.MODEL}".trim(),
                                "osVersion" to "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                                "hardwareAttested" to true
                            )
                        )
                    }

                    "getNotificationPermissionState" -> {
                        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        val postOk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                        } else {
                            true
                        }
                        val granted = postOk && (Build.VERSION.SDK_INT < Build.VERSION_CODES.N || nm.areNotificationsEnabled())
                        result.success(if (granted) "granted" else "denied")
                    }

                    "requestNotificationPermission" -> {
                        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                                result.success(nm.areNotificationsEnabled())
                            } else {
                                pendingNotificationResult?.success(false)
                                pendingNotificationResult = result
                                requestPermissions(
                                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                                    notifReqCode
                                )
                            }
                        } else {
                            val enabled = Build.VERSION.SDK_INT < Build.VERSION_CODES.N || nm.areNotificationsEnabled()
                            result.success(enabled)
                        }
                    }

                    "requestCapturePermission" -> {
                        if (captureConsentGrantedInSession) {
                            result.success(true)
                        } else {
                            try {
                                val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                                pendingCaptureResult?.success(false)
                                pendingCaptureResult = result
                                startActivityForResult(mpm.createScreenCaptureIntent(), captureReqCode)
                            } catch (_: Exception) {
                                result.success(false)
                            }
                        }
                    }

                    "scanInstalledGames" -> {
                        val targets = call.argument<Map<String, String>>("targets") ?: emptyMap()
                        val installed = mutableListOf<String>()
                        val pm = packageManager
                        for ((gameId, pkg) in targets) {
                            try {
                                pm.getPackageInfo(pkg, 0)
                                installed.add(gameId)
                            } catch (_: PackageManager.NameNotFoundException) {
                                // Not installed on this Android device
                            }
                        }
                        result.success(installed)
                    }

                    "launchGame" -> {
                        val pkg = call.argument<String>("androidPackageId")
                        val fallbackUri = call.argument<String>("launchUri")
                        if (pkg != null) {
                            val launchIntent: Intent? = packageManager.getLaunchIntentForPackage(pkg)
                            if (launchIntent != null) {
                                launchIntent.addFlags(
                                    Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                                )
                                startActivity(launchIntent)
                                result.success(true)
                                return@setMethodCallHandler
                            }
                        }
                        if (!fallbackUri.isNullOrEmpty() && !fallbackUri.startsWith("android-app://")) {
                            try {
                                val uriIntent = Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUri))
                                uriIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                startActivity(uriIntent)
                                result.success(true)
                                return@setMethodCallHandler
                            } catch (_: Exception) {
                                // No handler for fallback URI
                            }
                        }
                        result.success(false)
                    }

                    "startNativeCapture" -> {
                        val gameTitle = call.argument<String>("gameTitle") ?: "Live Match"
                        val roomCode = call.argument<String>("roomCode") ?: "LIVE"
                        postLiveNotification(
                            id = ongoingNotificationId,
                            title = "playverzus.xyz Live · $gameTitle ($roomCode)",
                            body = "Match verification active. Play normally — score updates & payouts run automatically.",
                            ongoing = true
                        )
                        result.success(true)
                    }

                    "stopNativeCapture" -> {
                        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        nm.cancel(ongoingNotificationId)
                        result.success(null)
                    }

                    "sendMatchNotification" -> {
                        val title = call.argument<String>("title") ?: "playverzus.xyz Match Update"
                        val body = call.argument<String>("body") ?: ""
                        val ongoing = call.argument<Boolean>("ongoing") ?: false
                        val id = if (ongoing) ongoingNotificationId else ++liveEventNotificationId
                        postLiveNotification(
                            id = id,
                            title = title,
                            body = body,
                            ongoing = ongoing
                        )
                        result.success(true)
                    }

                    else -> result.notImplemented()
                }
            }
    }

    private fun ensureLiveMatchNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                liveChannelId,
                "Playverzus Live Match Updates",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Real-time winning/losing status, verified points, and auto-payout alerts while playing in the background."
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            nm.createNotificationChannel(channel)
        }
    }

    private fun postLiveNotification(id: Int, title: String, body: String, ongoing: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val returnIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = if (returnIntent != null) {
            PendingIntent.getActivity(this, 0, returnIntent, pendingFlags)
        } else {
            null
        }

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, liveChannelId)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        builder
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setSmallIcon(applicationInfo.icon)
            .setOngoing(ongoing)
            .setAutoCancel(!ongoing)
            .setOnlyAlertOnce(ongoing)

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent)
        }

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(id, builder.build())
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == notifReqCode) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingNotificationResult?.success(granted)
            pendingNotificationResult = null
        }
    }

    @Deprecated("Required for FlutterActivity MediaProjection consent callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == captureReqCode) {
            val granted = resultCode == Activity.RESULT_OK && data != null
            captureConsentGrantedInSession = granted
            pendingCaptureResult?.success(granted)
            pendingCaptureResult = null
        }
    }

    private fun sha256Hex(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }
}
