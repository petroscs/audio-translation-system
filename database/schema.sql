PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    Id TEXT PRIMARY KEY,
    Username TEXT NOT NULL,
    Email TEXT NOT NULL,
    Role TEXT NOT NULL,
    PasswordHash TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (Username),
    UNIQUE (Email)
);

CREATE TABLE IF NOT EXISTS events (
    Id TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Description TEXT,
    StartTime TEXT,
    EndTime TEXT,
    Status TEXT NOT NULL,
    CreatedByUserId TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CreatedByUserId) REFERENCES users(Id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS channels (
    Id TEXT PRIMARY KEY,
    EventId TEXT NOT NULL,
    Name TEXT NOT NULL,
    LanguageCode TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (EventId) REFERENCES events(Id) ON DELETE CASCADE,
    UNIQUE (EventId, Name, LanguageCode)
);

CREATE TABLE IF NOT EXISTS sessions (
    Id TEXT PRIMARY KEY,
    UserId TEXT NOT NULL,
    EventId TEXT NOT NULL,
    ChannelId TEXT NOT NULL,
    Role TEXT NOT NULL,
    StartedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EndedAt TEXT,
    Status TEXT NOT NULL,
    FOREIGN KEY (UserId) REFERENCES users(Id) ON DELETE RESTRICT,
    FOREIGN KEY (EventId) REFERENCES events(Id) ON DELETE CASCADE,
    FOREIGN KEY (ChannelId) REFERENCES channels(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS producers (
    Id TEXT PRIMARY KEY,
    SessionId TEXT NOT NULL,
    MediasoupProducerId TEXT NOT NULL,
    Kind TEXT NOT NULL,
    RtpParameters TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SessionId) REFERENCES sessions(Id) ON DELETE CASCADE,
    UNIQUE (MediasoupProducerId)
);

CREATE TABLE IF NOT EXISTS consumers (
    Id TEXT PRIMARY KEY,
    SessionId TEXT NOT NULL,
    ProducerId TEXT NOT NULL,
    MediasoupConsumerId TEXT NOT NULL,
    Kind TEXT NOT NULL,
    RtpParameters TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SessionId) REFERENCES sessions(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProducerId) REFERENCES producers(Id) ON DELETE CASCADE,
    UNIQUE (MediasoupConsumerId)
);

CREATE TABLE IF NOT EXISTS recordings (
    Id TEXT PRIMARY KEY,
    SessionId TEXT NOT NULL,
    FilePath TEXT NOT NULL,
    DurationSeconds INTEGER,
    StartedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EndedAt TEXT,
    Status TEXT NOT NULL,
    FOREIGN KEY (SessionId) REFERENCES sessions(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS captions (
    Id TEXT PRIMARY KEY,
    SessionId TEXT NOT NULL,
    Text TEXT NOT NULL,
    Timestamp INTEGER NOT NULL,
    Confidence REAL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SessionId) REFERENCES sessions(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transports (
    Id TEXT PRIMARY KEY,
    SessionId TEXT NOT NULL,
    MediasoupTransportId TEXT NOT NULL,
    Direction TEXT NOT NULL,
    IceParameters TEXT NOT NULL,
    DtlsParameters TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SessionId) REFERENCES sessions(Id) ON DELETE CASCADE,
    UNIQUE (MediasoupTransportId)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    Id TEXT PRIMARY KEY,
    UserId TEXT NOT NULL,
    TokenHash TEXT NOT NULL,
    ExpiresAt TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    RevokedAt TEXT,
    ReplacedByTokenHash TEXT,
    FOREIGN KEY (UserId) REFERENCES users(Id) ON DELETE CASCADE,
    UNIQUE (TokenHash)
);

CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(CreatedByUserId);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(Status);

CREATE INDEX IF NOT EXISTS idx_channels_event_id ON channels(EventId);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(UserId);
CREATE INDEX IF NOT EXISTS idx_sessions_event_id ON sessions(EventId);
CREATE INDEX IF NOT EXISTS idx_sessions_channel_id ON sessions(ChannelId);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(Status);

CREATE INDEX IF NOT EXISTS idx_producers_session_id ON producers(SessionId);

CREATE INDEX IF NOT EXISTS idx_consumers_session_id ON consumers(SessionId);
CREATE INDEX IF NOT EXISTS idx_consumers_producer_id ON consumers(ProducerId);

CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON recordings(SessionId);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(Status);

CREATE INDEX IF NOT EXISTS idx_captions_session_id ON captions(SessionId);

CREATE INDEX IF NOT EXISTS idx_transports_session_id ON transports(SessionId);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(UserId);
