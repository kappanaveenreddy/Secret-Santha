using Microsoft.EntityFrameworkCore;
using SecretSanta.Api.Models;

namespace SecretSanta.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SecretSantaEvent> Events => Set<SecretSantaEvent>();
    public DbSet<Participant> Participants => Set<Participant>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SecretSantaEvent>().HasMany(e => e.Participants).WithOne().HasForeignKey(p => p.SecretSantaEventId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Participant>().HasIndex(p => new { p.SecretSantaEventId, p.Email }).IsUnique();
    }
}
