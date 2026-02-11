using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Producer> Producers => Set<Producer>();
    public DbSet<Consumer> Consumers => Set<Consumer>();
    public DbSet<Recording> Recordings => Set<Recording>();
    public DbSet<Caption> Captions => Set<Caption>();
    public DbSet<Transport> Transports => Set<Transport>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Username).IsRequired().HasMaxLength(100);
            entity.Property(user => user.Email).IsRequired().HasMaxLength(256);
            entity.Property(user => user.PasswordHash).IsRequired();
            entity.Property(user => user.Role).HasConversion<string>().HasMaxLength(50);
            entity.Property(user => user.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(user => user.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(user => user.Username).IsUnique();
            entity.HasIndex(user => user.Email).IsUnique();
        });

        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("events");
            entity.HasKey(evt => evt.Id);
            entity.Property(evt => evt.Name).IsRequired().HasMaxLength(200);
            entity.Property(evt => evt.Description).HasMaxLength(2000);
            entity.Property(evt => evt.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(evt => evt.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(evt => evt.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(evt => evt.CreatedByUser)
                .WithMany(user => user.CreatedEvents)
                .HasForeignKey(evt => evt.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(evt => evt.CreatedByUserId);
            entity.HasIndex(evt => evt.Status);
        });

        modelBuilder.Entity<Channel>(entity =>
        {
            entity.ToTable("channels");
            entity.HasKey(channel => channel.Id);
            entity.Property(channel => channel.Name).IsRequired().HasMaxLength(200);
            entity.Property(channel => channel.LanguageCode).IsRequired().HasMaxLength(20);
            entity.Property(channel => channel.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(channel => channel.Event)
                .WithMany(evt => evt.Channels)
                .HasForeignKey(channel => channel.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(channel => channel.EventId);
            entity.HasIndex(channel => new { channel.EventId, channel.Name, channel.LanguageCode }).IsUnique();
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("sessions");
            entity.HasKey(session => session.Id);
            entity.Property(session => session.Role).HasConversion<string>().HasMaxLength(50);
            entity.Property(session => session.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(session => session.StartedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(session => session.User)
                .WithMany(user => user.Sessions)
                .HasForeignKey(session => session.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(session => session.Event)
                .WithMany(evt => evt.Sessions)
                .HasForeignKey(session => session.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(session => session.Channel)
                .WithMany(channel => channel.Sessions)
                .HasForeignKey(session => session.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(session => session.UserId);
            entity.HasIndex(session => session.EventId);
            entity.HasIndex(session => session.ChannelId);
            entity.HasIndex(session => session.Status);
        });

        modelBuilder.Entity<Producer>(entity =>
        {
            entity.ToTable("producers");
            entity.HasKey(producer => producer.Id);
            entity.Property(producer => producer.MediasoupProducerId).IsRequired().HasMaxLength(200);
            entity.Property(producer => producer.Kind).HasConversion<string>().HasMaxLength(20);
            entity.Property(producer => producer.RtpParameters).IsRequired();
            entity.Property(producer => producer.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(producer => producer.Session)
                .WithMany(session => session.Producers)
                .HasForeignKey(producer => producer.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(producer => producer.SessionId);
            entity.HasIndex(producer => producer.MediasoupProducerId).IsUnique();
        });

        modelBuilder.Entity<Consumer>(entity =>
        {
            entity.ToTable("consumers");
            entity.HasKey(consumer => consumer.Id);
            entity.Property(consumer => consumer.MediasoupConsumerId).IsRequired().HasMaxLength(200);
            entity.Property(consumer => consumer.Kind).HasConversion<string>().HasMaxLength(20);
            entity.Property(consumer => consumer.RtpParameters).IsRequired();
            entity.Property(consumer => consumer.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(consumer => consumer.Session)
                .WithMany(session => session.Consumers)
                .HasForeignKey(consumer => consumer.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(consumer => consumer.Producer)
                .WithMany(producer => producer.Consumers)
                .HasForeignKey(consumer => consumer.ProducerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(consumer => consumer.SessionId);
            entity.HasIndex(consumer => consumer.ProducerId);
            entity.HasIndex(consumer => consumer.MediasoupConsumerId).IsUnique();
        });

        modelBuilder.Entity<Recording>(entity =>
        {
            entity.ToTable("recordings");
            entity.HasKey(recording => recording.Id);
            entity.Property(recording => recording.FilePath).IsRequired();
            entity.Property(recording => recording.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(recording => recording.StartedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(recording => recording.Session)
                .WithMany(session => session.Recordings)
                .HasForeignKey(recording => recording.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(recording => recording.SessionId).IsUnique();
            entity.HasIndex(recording => recording.Status);
        });

        modelBuilder.Entity<Caption>(entity =>
        {
            entity.ToTable("captions");
            entity.HasKey(caption => caption.Id);
            entity.Property(caption => caption.Text).IsRequired();
            entity.Property(caption => caption.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(caption => caption.Session)
                .WithMany(session => session.Captions)
                .HasForeignKey(caption => caption.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(caption => caption.SessionId);
        });

        modelBuilder.Entity<Transport>(entity =>
        {
            entity.ToTable("transports");
            entity.HasKey(transport => transport.Id);
            entity.Property(transport => transport.MediasoupTransportId).IsRequired().HasMaxLength(200);
            entity.Property(transport => transport.Direction).HasConversion<string>().HasMaxLength(20);
            entity.Property(transport => transport.IceParameters).IsRequired();
            entity.Property(transport => transport.DtlsParameters).IsRequired();
            entity.Property(transport => transport.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(transport => transport.Session)
                .WithMany(session => session.Transports)
                .HasForeignKey(transport => transport.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(transport => transport.SessionId);
            entity.HasIndex(transport => transport.MediasoupTransportId).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(token => token.Id);
            entity.Property(token => token.TokenHash).IsRequired();
            entity.Property(token => token.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(token => token.User)
                .WithMany(user => user.RefreshTokens)
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(token => token.UserId);
            entity.HasIndex(token => token.TokenHash).IsUnique();
        });

    }
}
