enum SessionRole { translator, listener }

enum SessionStatus { active, ended }

enum TransportDirection { send, receive }

enum MediaKind { audio, video }

extension SessionRoleApi on SessionRole {
  String get apiValue {
    switch (this) {
      case SessionRole.translator:
        return 'Translator';
      case SessionRole.listener:
        return 'Listener';
    }
  }

  static SessionRole fromApiValue(String value) {
    switch (value) {
      case 'Translator':
        return SessionRole.translator;
      case 'Listener':
        return SessionRole.listener;
      default:
        return SessionRole.listener;
    }
  }
}

extension SessionStatusApi on SessionStatus {
  static SessionStatus fromApiValue(String value) {
    switch (value) {
      case 'Active':
        return SessionStatus.active;
      case 'Ended':
        return SessionStatus.ended;
      default:
        return SessionStatus.active;
    }
  }
}

extension TransportDirectionApi on TransportDirection {
  String get apiValue {
    switch (this) {
      case TransportDirection.send:
        return 'Send';
      case TransportDirection.receive:
        return 'Receive';
    }
  }
}

extension MediaKindApi on MediaKind {
  String get apiValue {
    switch (this) {
      case MediaKind.audio:
        return 'Audio';
      case MediaKind.video:
        return 'Video';
    }
  }
}
