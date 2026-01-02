# Google Calendar Integration Setup

This application integrates with Google Calendar to fetch and display calendar events.

## Features

- ✅ OAuth 2.0 authentication with Google Calendar
- ✅ Fetch calendar events from user's primary calendar
- ✅ Display events with date, time, location, and description
- ✅ Automatic periodic sync every 5 minutes
- ✅ Manual sync button for immediate updates
- ✅ Beautiful Frutiger Aero styled UI

## Prerequisites

1. Google Cloud Project with Calendar API enabled
2. OAuth 2.0 credentials (Client ID and Client Secret)
3. Next.js application with NextAuth configured

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)

5. Copy your Client ID and Client Secret

## Environment Variables

Add the following to your `.env.local` file:

```env
# Google OAuth Credentials
# Get these from Google Cloud Console: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth Configuration (if not already set)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

**Note:** The credentials above are already configured in the code, but it's recommended to use environment variables for security.

## How It Works

### 1. User Authentication
- Users click "Connect Google Calendar" button
- They are redirected to Google OAuth consent screen
- After authorization, tokens are stored in the database (Account table)
- User is redirected back to the application

### 2. Fetching Events
- The application uses stored OAuth tokens to access Google Calendar API
- Events are fetched from the user's primary calendar
- Default time range: Now to 30 days ahead
- Maximum 50 events per fetch

### 3. Displaying Events
- Events are displayed in a beautiful card layout
- Shows: Title, Date, Time, Location, Description
- Links to open events in Google Calendar
- Responsive design with Frutiger Aero styling

### 4. Periodic Sync
- Events automatically sync every 5 minutes
- Manual sync button available for immediate updates
- Token refresh handled automatically when tokens expire

## API Routes

### `GET /api/calendar/connect`
Check if Google Calendar is connected for the current user.

**Response:**
```json
{
  "connected": true
}
```

### `GET /api/calendar/events`
Fetch calendar events for the current user.

**Query Parameters:**
- `timeMin` (optional): ISO 8601 date string for minimum time
- `timeMax` (optional): ISO 8601 date string for maximum time
- `maxResults` (optional): Maximum number of events (default: 50)

**Response:**
```json
{
  "events": [
    {
      "id": "event_id",
      "summary": "Event Title",
      "description": "Event description",
      "start": {
        "dateTime": "2025-01-20T10:00:00Z",
        "timeZone": "America/New_York"
      },
      "end": {
        "dateTime": "2025-01-20T11:00:00Z",
        "timeZone": "America/New_York"
      },
      "location": "Event Location",
      "htmlLink": "https://calendar.google.com/...",
      "status": "confirmed"
    }
  ]
}
```

### `POST /api/calendar/sync`
Manually sync calendar events.

**Request Body:**
```json
{
  "timeMin": "2025-01-20T00:00:00Z",
  "timeMax": "2025-02-20T00:00:00Z",
  "maxResults": 50
}
```

**Response:**
```json
{
  "success": true,
  "events": [...],
  "syncedAt": "2025-01-20T12:00:00Z"
}
```

## Usage

1. **Connect Google Calendar:**
   - Log in to your account
   - Navigate to the main page
   - In the Calendar Events section, click "Connect Google Calendar"
   - Authorize the application to access your calendar

2. **View Events:**
   - Once connected, your calendar events will automatically load
   - Events are displayed with all relevant information

3. **Sync Events:**
   - Events sync automatically every 5 minutes
   - Click the "🔄 Sync" button for immediate updates

## Security Notes

- OAuth tokens are securely stored in the database
- Tokens are automatically refreshed when expired
- Only calendar read access is requested (readonly scope)
- All API routes require authentication

## Troubleshooting

### "Google Calendar not connected" error
- Make sure you've authorized the application
- Check that OAuth credentials are correct
- Verify redirect URI matches in Google Cloud Console

### Events not loading
- Check browser console for errors
- Verify Google Calendar API is enabled
- Ensure tokens are valid (they refresh automatically)

### Token refresh issues
- Check that refresh_token is stored in database
- Verify OAuth consent screen is configured correctly
- Ensure `access_type: "offline"` and `prompt: "consent"` are set

## Database Schema

The integration uses the existing `Account` model from NextAuth:
- `access_token`: Google OAuth access token
- `refresh_token`: Google OAuth refresh token
- `expires_at`: Token expiration timestamp
- `provider`: "google"
- `scope`: Includes `https://www.googleapis.com/auth/calendar.readonly`

No additional database migrations are required.

