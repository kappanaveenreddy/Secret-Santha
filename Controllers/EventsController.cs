using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecretSanta.Api.Data;
using SecretSanta.Api.Models;
using SecretSanta.Api.Services;

namespace SecretSanta.Api.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(AppDbContext db, EmailService email, IConfiguration config) : ControllerBase
{
    //private bool IsAdmin() => !string.IsNullOrWhiteSpace(config["Admin:ApiKey"]) &&
        //Request.Headers.TryGetValue("X-Admin-Key", out var key) &&
        //CryptographicOperations.FixedTimeEquals(System.Text.Encoding.UTF8.GetBytes(key.ToString()), System.Text.Encoding.UTF8.GetBytes(config["Admin:ApiKey"]!));

    [HttpPost]
    public async Task<IActionResult> Create(CreateEventRequest request)
    {
        //if (!IsAdmin()) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Event name is required.");
        if (request.Participants is null || request.Participants.Count < 3) return BadRequest("Add at least 3 participants.");
        if (request.Participants.Any(p => string.IsNullOrWhiteSpace(p.Name) || !IsValidEmail(p.Email))) return BadRequest("Every participant needs a name and valid email address.");
        if (request.Participants.Select(p => p.Email.Trim().ToLowerInvariant()).Distinct().Count() != request.Participants.Count) return BadRequest("Participant email addresses must be unique.");

        var item = new SecretSantaEvent
        {
            Name = request.Name.Trim(), GiftBudget = request.GiftBudget, ExchangeDate = request.ExchangeDate,
            Participants = request.Participants.Select(p => new Participant { Name = p.Name.Trim(), Email = p.Email.Trim() }).ToList()
        };
        db.Events.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = item.Id }, new { item.Id, item.Name, participantCount = item.Participants.Count });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        //if (!IsAdmin()) return Unauthorized();
        var item = await db.Events.Include(e => e.Participants).FirstOrDefaultAsync(e => e.Id == id);
        if (item is null) return NotFound();
        // Deliberately do not expose recipient assignments in the admin dashboard response.
        return Ok(new { item.Id, item.Name, item.GiftBudget, item.ExchangeDate, item.AssignmentsGenerated,
            participants = item.Participants.Select(p => new { p.Id, p.Name, p.Email, p.EmailSent, p.EmailError }) });
    }

    [HttpPost("{id:int}/draw-and-email")]
    public async Task<IActionResult> DrawAndEmail(int id)
    {
        //if (!IsAdmin()) return Unauthorized();
        var item = await db.Events.Include(e => e.Participants).FirstOrDefaultAsync(e => e.Id == id);
        if (item is null) return NotFound();
        if (item.AssignmentsGenerated) return Conflict("Assignments have already been generated. Create a new event to run another draw.");
        if (item.Participants.Count < 3) return BadRequest("At least 3 participants are required.");

        // A random cyclic permutation guarantees no self-assignment and exactly one recipient per Santa.
        var shuffled = item.Participants.OrderBy(_ => RandomNumberGenerator.GetInt32(int.MaxValue)).ToList();
        for (var i = 0; i < shuffled.Count; i++) shuffled[i].AssignedParticipantId = shuffled[(i + 1) % shuffled.Count].Id;
        item.AssignmentsGenerated = true;
        await db.SaveChangesAsync();

        var sent = 0;
        var failures = new List<object>();
        foreach (var santa in item.Participants)
        {
            var assigned = item.Participants.Single(p => p.Id == santa.AssignedParticipantId);
            try { await email.SendAssignmentAsync(item, santa, assigned); santa.EmailSent = true; santa.EmailError = null; sent++; }
            catch (Exception ex) { santa.EmailSent = false; santa.EmailError = ex.Message; failures.Add(new { santa.Name, santa.Email, error = ex.Message }); }
            await db.SaveChangesAsync();
        }
        return Ok(new { message = "Draw completed. Email delivery results are shown below.", total = item.Participants.Count, sent, failed = item.Participants.Count - sent, failures });
    }

    private static bool IsValidEmail(string email) => System.Net.Mail.MailAddress.TryCreate(email, out var address) && address.Address == email.Trim();
}

public record CreateEventRequest(string Name, decimal? GiftBudget, DateTime? ExchangeDate, List<ParticipantRequest> Participants);
public record ParticipantRequest(string Name, string Email);
