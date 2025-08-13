WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

WebApplication app = builder.Build();
app.UseStaticFiles();
app.UseDefaultFiles();
app.MapGet("/", () => "js13k2025 is running!");
app.Run();
