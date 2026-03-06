import 'dart:html' as html;

class WebEnvPlatform {
  static String? get href => html.window.location.href;
  static String? get origin => html.window.location.origin;
  static bool? get isSecureContext => html.window.isSecureContext;
  static bool? get hasMediaDevices => html.window.navigator.mediaDevices != null;
  static String? get userAgent => html.window.navigator.userAgent;
}

