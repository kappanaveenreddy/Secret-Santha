using System.Net;
using System.Net.Mail;
using SecretSanta.Api.Models;

namespace SecretSanta.Api.Services;

public class EmailService(IConfiguration config)
{
    public async Task SendAssignmentAsync(SecretSantaEvent santaEvent, Participant recipient, Participant assigned)
    {
        var section = config.GetSection("Email");
        var host = (section["Host"] ?? config["Smtp_Host"])?.Trim();
        var username = (section["Username"] ?? config["Smtp_Username"])?.Trim();
        var password = (section["Password"] ?? config["Smtp_Password"])?.Replace(" ", "");
        var from = (section["FromEmail"] ?? config["Email__FromEmail"] ?? config["Smtp_FromEmail"] ?? username)?.Trim();
        var portText = section["Port"] ?? config["Smtp_Port"] ?? "587";
        var sslText = section["EnableSsl"] ?? config["Smtp_EnableSsl"] ?? "true";
        var fromName = section["FromName"] ?? config["Email__FromName"] ?? config["Smtp_FromName"] ?? "Secret Santa";
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("Email SMTP settings are incomplete. Configure Email:Host, Username, Password and FromEmail.");

        using var message = new MailMessage
        {
            From = new MailAddress(from, fromName),
            Subject = $"Your Secret Santa assignment – {santaEvent.Name}",
            IsBodyHtml = true,
            Body = $"<div style='font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#243047;background:#fff8f0;border-radius:16px'><h1 style='color:#b42335'>Ho Ho Ho! 🎅</h1><p>Hello {WebUtility.HtmlEncode(recipient.Name)},</p><p>Your Secret Santa assignment is ready!</p><div style='background:#fff;padding:22px;border-radius:12px;text-align:center'><p>You are the Secret Santa for</p><h2 style='color:#16845b'>{WebUtility.HtmlEncode(assigned.Name)}</h2></div>{(santaEvent.GiftBudget is null ? "" : $"<p>Gift budget: {santaEvent.GiftBudget:C}</p>")}{(santaEvent.ExchangeDate is null ? "" : $"<p>Gift exchange date: {santaEvent.ExchangeDate:dd MMM yyyy}</p>")}<p>Keep it secret until the big reveal. Happy gifting! 🎁</p></div>"
        };
        message.To.Add(recipient.Email);
        using var client = new SmtpClient(host, int.TryParse(portText, out var port) ? port : 587)
        {
            EnableSsl = bool.TryParse(sslText, out var ssl) && ssl,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(username, password),
            Timeout = 30000
        };
        await client.SendMailAsync(message);
    }
}
