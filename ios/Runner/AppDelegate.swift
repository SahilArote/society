import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var isMethodChannelConfigured = false

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self as? UNUserNotificationCenterDelegate
    }

    if let controller = window?.rootViewController as? FlutterViewController {
      setupMethodChannels(messenger: controller.binaryMessenger)
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "NexGatePhonePlugin") {
      setupMethodChannels(messenger: registrar.messenger())
    }
  }

  private func setupMethodChannels(messenger: FlutterBinaryMessenger) {
    guard !isMethodChannelConfigured else { return }
    isMethodChannelConfigured = true

    let phoneChannel = FlutterMethodChannel(
      name: "com.nexgate.resident/phone",
      binaryMessenger: messenger
    )

    phoneChannel.setMethodCallHandler { (call: FlutterMethodCall, result: @escaping FlutterResult) in
      if call.method == "openDialer" {
        guard let args = call.arguments as? [String: Any],
              let phoneNumber = args["phoneNumber"] as? String,
              !phoneNumber.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
          result(FlutterError(code: "INVALID_PHONE", message: "Phone number is null or empty", details: nil))
          return
        }

        let cleanPhone = phoneNumber.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        if let url = URL(string: "tel://\(cleanPhone)"), UIApplication.shared.canOpenURL(url) {
          UIApplication.shared.open(url, options: [:]) { success in
            result(success)
          }
        } else {
          result(FlutterError(code: "DIALER_ERROR", message: "Cannot open dialer on this device", details: nil))
        }
      } else if call.method == "getAppVersion" {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.1.0"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        let data: [String: Any] = [
          "version": version,
          "buildNumber": buildNumber
        ]
        result(data)
      } else {
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
