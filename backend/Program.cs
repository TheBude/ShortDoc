using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ShortDoc.Api.Data;
using ShortDoc.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Load local developer settings (ignored by git for security)
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Configure Kestrel to listen on port 5000
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5000);
});

// Database Context (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=127.0.0.1;Port=5432;Database=shortdoc_db;Username=postgres;Password=postgres;Pooling=true;Minimum Pool Size=5;Maximum Pool Size=50;Connection Idle Lifetime=60;";

builder.Services.AddDbContext<ShortDocDbContext>(options =>
    options.UseNpgsql(connectionString));

// Services
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<AuditService>();

// JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "shortdoc_super_secure_jwt_secret_university_2026_csharp_enterprise_key";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ShortDoc University Document Management API (ASP.NET Core 8 C#)",
        Version = "v1",
        Description = "Universitetda hujjatlar aylanishi va ijro nazorati tizimi — C# ASP.NET Core Web API"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Masalan: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Seed database on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ShortDocDbContext>();
    await DbInitializer.InitializeAsync(context);
}

// Middleware Pipeline
app.UseCors("AllowAll");

app.UseSwagger(c =>
{
    c.RouteTemplate = "api/docs/{documentName}/swagger.json";
});
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/api/docs/v1/swagger.json", "ShortDoc C# API v1");
    c.RoutePrefix = "api/docs";
});

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "ShortDoc ASP.NET Core 8 Web API (C#)",
    timestamp = DateTime.UtcNow
}));

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

Console.WriteLine("=================================================");
Console.WriteLine("🚀 ShortDoc C# (ASP.NET Core 8) API ishga tushdi!");
Console.WriteLine("📡 URL: http://localhost:5000");
Console.WriteLine("📚 Swagger Docs: http://localhost:5000/api/docs");
Console.WriteLine("=================================================");

app.Run();
