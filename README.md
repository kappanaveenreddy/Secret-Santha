# SantaCircle Secret Santa

SantaCircle is a full-stack Secret Santa exchange application built with an ASP.NET Core Web API and a React/Vite frontend. It creates an event, validates and imports participants, generates private one-cycle assignments, and sends each participant their recipient by email.

## Features

- Create a Secret Santa event with an optional gift budget and exchange date
- Add at least three participants with names and unique email addresses
- Import participants from CSV or Excel (`.csv`, `.xls`, `.xlsx`) files
- Validate event and participant details in the browser
- Generate assignments with a cryptographically seeded random shuffle
- Guarantee no participant is assigned to themselves
- Send private assignment emails through SMTP
- View email success and failure counts after the draw
- SQL Server persistence with automatic database initialization
- Swagger API documentation in Development mode

## Technology Stack

### Backend

- ASP.NET Core Web API
- .NET 10
- Entity Framework Core 10
- SQL Server / SQL Server LocalDB
- SMTP email delivery
- Swagger / OpenAPI

### Frontend

- React 18
- Vite
- JavaScript (JSX)
- TypeScript packages
- Lucide React icons
- SheetJS (`xlsx`) for spreadsheet imports

## Project Structure

```text
Secret-Santha/
├── Controllers/
│   └── EventsController.cs
├── Data/
│   └── AppDbContext.cs
├── Models/
│   └── SecretSantaEvent.cs
├── Services/
│   └── EmailService.cs
├── Client/
│   ├── src/
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   └── package.json
├── Properties/
│   └── launchSettings.json
├── appsettings.json
├── Program.cs
└── SecretSanta.Api.csproj
```

## Prerequisites

- .NET 10 SDK
- Node.js and npm
- SQL Server LocalDB (Windows), or another reachable SQL Server instance
- An SMTP account, such as Gmail or a transactional email provider

## Backend Setup

1. Update `ConnectionStrings:DefaultConnection` in `appsettings.json` if you are not using SQL Server LocalDB.

2. Configure the SMTP settings under `Email`:

```json
"Email": {
  "Host": "smtp.gmail.com",
  "Port": 587,
  "EnableSsl": true,
  "Username": "your-email@example.com",
  "Password": "your-app-password",
  "FromEmail": "your-email@example.com",
  "FromName": "SantaCircle"
}
```

For Gmail, use an app password rather than the account password. Keep real credentials in user secrets or environment variables instead of committing them to source control.

3. Restore and run the API:

```powershell
dotnet restore
dotnet run
```

The API is configured in `Properties/launchSettings.json` to listen at:

- `https://localhost:7001`
- `http://localhost:5001`

The database is created automatically when the application starts. Swagger is available in Development mode at:

```text
https://localhost:7001/swagger
```

## Frontend Setup

```powershell
cd Client
npm install
npm run dev
```

Vite is configured to expose the frontend on port `5173` by default. Open:

```text
http://localhost:5173
```

To use a different API address, create `Client/.env`:

```dotenv
VITE_API_URL=https://localhost:7001
```

The default API address is `https://localhost:7001`.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Check API health |
| `POST` | `/api/events` | Create an event and participants |
| `GET` | `/api/events/{id}` | Get event and delivery details |
| `POST` | `/api/events/{id}/draw-and-email` | Generate assignments and email participants |

### Create Event Example

```json
{
  "name": "Office Secret Santa 2026",
  "giftBudget": 1000,
  "exchangeDate": "2026-12-20",
  "participants": [
    { "name": "Alex", "email": "alex@example.com" },
    { "name": "Sam", "email": "sam@example.com" },
    { "name": "Taylor", "email": "taylor@example.com" }
  ]
}
```

## Participant Import

The spreadsheet uploader accepts CSV, XLS, and XLSX files. It recognizes the `Name` and `Email` columns using common variants such as `Full Name`, `Participant Name`, `Email Address`, and `E-mail`. A maximum of 20 imported rows is currently loaded into the form.

## Assignment Behavior

The API shuffles participants and creates a cyclic recipient assignment so every participant receives exactly one Secret Santa and nobody is assigned themselves. A draw can only be generated once per event. Recipient assignments are intentionally excluded from the normal event response.

## CORS

Frontend origins are configured with `AllowedOrigins` in `appsettings.json`:

```json
"AllowedOrigins": ["http://localhost:5173"]
```

Add any deployed frontend origins to this array.

## Security Notes

- The `Admin:ApiKey` setting is present, but admin-key enforcement is currently not active in the event controller.
- The database stores assignment IDs, but the event GET response does not expose recipients.
- Email passwords and API keys should be supplied through environment variables or .NET user secrets.
- Assignment generation should be considered a sensitive operation when deploying to production and should remain restricted by authentication/authorization.

## Build and Preview

Build the React application:

```powershell
cd Client
npm run build
npm run preview
```

Build the backend:

```powershell
dotnet build
```

## Author

Kappa Naveen Reddy
