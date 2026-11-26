namespace SecretSanta.Api.Models;

public class SecretSantaEvent
{
    public int Id { get; set; }
    public string Name { get; set; } = "Secret Santa";
    public decimal? GiftBudget { get; set; }
    public DateTime? ExchangeDate { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public bool AssignmentsGenerated { get; set; }
    public List<Participant> Participants { get; set; } = [];
}

public class Participant
{
    public int Id { get; set; }
    public int SecretSantaEventId { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public int? AssignedParticipantId { get; set; }
    public bool EmailSent { get; set; }
    public string? EmailError { get; set; }
}
