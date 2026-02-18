using System.Text;
using System.Text.Json.Serialization;
using Backend.Api.Configuration;
using Backend.Api.Seeding;
using Backend.Infrastructure.Data;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Backend.Services.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "Backend API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer {token}'."
    });
    options.AddSecurityRequirement(new()
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<AdminUserSettings>(builder.Configuration.GetSection("AdminUser"));
builder.Services.Configure<MediasoupSettings>(builder.Configuration.GetSection("Mediasoup"));
builder.Services.Configure<SttWorkerSettings>(builder.Configuration.GetSection("SttWorker"));
builder.Services.Configure<RecordingWorkerSettings>(builder.Configuration.GetSection("RecordingWorker"));
builder.Services.Configure<RecordingsSettings>(builder.Configuration.GetSection("Recordings"));
builder.Services.Configure<ListenSettings>(builder.Configuration.GetSection("Listen"));

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
if (string.IsNullOrWhiteSpace(jwtSettings.Secret))
{
    throw new InvalidOperationException("Jwt:Secret is required.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken)
                    && path.StartsWithSegments("/ws/signaling", StringComparison.OrdinalIgnoreCase))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IListenService, ListenService>();
builder.Services.AddScoped<ISignalingService, SignalingService>();
builder.Services.AddScoped<ICaptionService, CaptionService>();
builder.Services.AddScoped<IRecordingService, RecordingService>();
builder.Services.AddSingleton<ICaptionBroadcaster, CaptionBroadcaster>();
builder.Services.AddSingleton<IActiveProducerNotifier, ActiveProducerNotifier>();
builder.Services.AddHttpClient<IMediasoupService, MediasoupService>();
builder.Services.AddHttpClient<ISttWorkerService, SttWorkerService>();
builder.Services.AddHttpClient<IRecordingWorkerService, RecordingWorkerService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001" };
        if (builder.Environment.IsDevelopment())
        {
            // In development, allow any origin so the dashboard works when accessed via IP (e.g. http://192.168.x.x:3000)
            policy.SetIsOriginAllowed(_ => true)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
// Only redirect to HTTPS when HTTPS is configured (skip in Docker when using HTTP only)
if ((app.Configuration["ASPNETCORE_URLS"] ?? "").Contains("https", StringComparison.OrdinalIgnoreCase))
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<Backend.Api.Hubs.SignalingHub>("/ws/signaling");

// Ensure database exists and migrations are applied before seeding (skip for in-memory DB in tests)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsRelational())
    {
        await db.Database.MigrateAsync();
    }
    else
    {
        await db.Database.EnsureCreatedAsync();
    }
}

await DatabaseSeeder.SeedAdminUserAsync(app);

app.Run();

// Expose Program for WebApplicationFactory<Program> in integration tests.
public partial class Program
{
}
