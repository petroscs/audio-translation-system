import 'package:flutter/foundation.dart' show kIsWeb;

import 'web_env_stub.dart'
    if (dart.library.html) 'web_env_web.dart';

class WebEnv {
  static String? get href => kIsWeb ? WebEnvPlatform.href : null;
  static String? get origin => kIsWeb ? WebEnvPlatform.origin : null;
  static bool? get isSecureContext => kIsWeb ? WebEnvPlatform.isSecureContext : null;
  static bool? get hasMediaDevices => kIsWeb ? WebEnvPlatform.hasMediaDevices : null;
  static String? get userAgent => kIsWeb ? WebEnvPlatform.userAgent : null;
}

