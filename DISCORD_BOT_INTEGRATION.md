# Discord Bot Tournament State Integration

## Overview

The pmurphinc website now supports real-time tournament state synchronization from the Discord bot. Both bracket pages (`/bracket` and `/bracket2`) automatically display live tournament data without manual website updates.

## Architecture

```
Discord Bot
    ↓ (POST /api/webhooks/tournament)
Website Backend (Express)
    ↓ (stores in-memory state)
Tournament State Cache
    ↓ (GET /api/tournament/:tournamentId/state)
Website Frontend (React)
    ↓ (polls every 15 seconds)
Bracket Pages Display Live Data
```

## Webhook Endpoint

### URL
```
POST /api/webhooks/tournament
```

### Authentication
The Discord bot must include the webhook secret in the request header:
```
X-Webhook-Secret: <TOURNAMENT_WEBHOOK_SECRET>
```

The secret is stored in the environment variable `TOURNAMENT_WEBHOOK_SECRET` on the server.

### Request Payload

```json
{
  "tournamentId": "dev-division" | "7th-circle",
  "status": "Registration Open | Check-In Open | Live - Cycle 1 | Live - Cycle 2 | Live - Cycle 3 | Sudden Death | Complete",
  "eventWinner": "Team Name" | null,
  "currentLeader": "Team Name" | null,
  "cycle": 1,
  "isComplete": false
}
```

### Example Request

```bash
curl -X POST https://pmurphinc-gzitzusk.manus.space/api/webhooks/tournament \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret-here" \
  -d '{
    "tournamentId": "dev-division",
    "status": "Live - Cycle 1",
    "eventWinner": null,
    "currentLeader": "Goo Disciples",
    "cycle": 1,
    "isComplete": false
  }'
```

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "message": "Tournament state updated",
  "state": {
    "eventWinner": null,
    "status": "Live - Cycle 1",
    "currentLeader": "Goo Disciples",
    "updatedAt": "2026-03-31T03:20:00.000Z",
    "tournamentId": "dev-division",
    "cycle": 1,
    "isComplete": false
  }
}
```

**Unauthorized (401)**
```json
{
  "error": "Unauthorized: Invalid webhook secret"
}
```

**Invalid Payload (400)**
```json
{
  "error": "Invalid payload",
  "details": [
    {
      "code": "invalid_enum_value",
      "expected": "dev-division | 7th-circle",
      "received": "invalid-tournament",
      "path": ["tournamentId"]
    }
  ]
}
```

## Public State Endpoint

### URL
```
GET /api/tournament/:tournamentId/state
```

### Parameters
- `tournamentId`: `"dev-division"` or `"7th-circle"`

### Response

```json
{
  "eventWinner": "Team Name" | null,
  "status": "Live - Cycle 1",
  "currentLeader": "Team Name" | null,
  "updatedAt": "2026-03-31T03:20:00.000Z",
  "tournamentId": "dev-division",
  "cycle": 1,
  "isComplete": false
}
```

### Example

```bash
curl https://pmurphinc-gzitzusk.manus.space/api/tournament/dev-division/state
```

## Frontend Implementation

### useTournamentState Hook

The frontend uses a custom React hook to fetch and poll tournament state:

```typescript
import { useTournamentState } from '@/hooks/useTournamentState';

export default function LiveBracket() {
  const { state: liveState, loading, error, refetch } = useTournamentState('dev-division');

  return (
    <div>
      <p>Status: {liveState.status}</p>
      <p>Current Leader: {liveState.currentLeader}</p>
      <p>Event Winner: {liveState.eventWinner}</p>
      <p>Last updated: {new Date(liveState.updatedAt).toLocaleTimeString()}</p>
    </div>
  );
}
```

### Polling Behavior

- **Interval**: 15 seconds
- **Fallback Values**: If data is unavailable, displays "TBD" or "Awaiting Update"
- **Error Handling**: Logs errors to console but continues polling

## Bracket Pages

### Dev Division (`/bracket`)
- Tournament ID: `"dev-division"`
- Displays: Event Winner, Status, Current Leader
- Polls live state every 15 seconds

### 7th Circle (`/bracket2`)
- Tournament ID: `"7th-circle"`
- Displays: Event Winner, Status, Current Leader
- Polls live state every 15 seconds

## Environment Variables

### Required
- `TOURNAMENT_WEBHOOK_SECRET`: Secret token for webhook authentication (set via Manus secrets management)

### Generated
- `VITE_ANALYTICS_ENDPOINT`: Analytics endpoint (auto-injected)
- `VITE_ANALYTICS_WEBSITE_ID`: Analytics ID (auto-injected)

## Security Considerations

1. **Webhook Secret**: The Discord bot must include the correct secret in the `X-Webhook-Secret` header
2. **Payload Validation**: All webhook payloads are validated against a strict Zod schema
3. **Public Read Endpoint**: The state endpoint is public (no authentication required) - only displays tournament state, not admin data
4. **In-Memory State**: Tournament state is stored in-memory on the server (not persisted to database)

## Testing the Integration

### 1. Test Webhook Endpoint

```bash
# With correct secret
curl -X POST http://localhost:3000/api/webhooks/tournament \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "tournamentId": "dev-division",
    "status": "Live - Cycle 1",
    "eventWinner": null,
    "currentLeader": "Test Team",
    "cycle": 1,
    "isComplete": false
  }'

# Expected: 200 OK with updated state
```

### 2. Test Public State Endpoint

```bash
curl http://localhost:3000/api/tournament/dev-division/state
# Expected: 200 OK with current tournament state
```

### 3. Test Bracket Pages

1. Navigate to `http://localhost:3000/bracket`
2. Observe "Event Winner", "Status", "Current Leader" fields
3. Send webhook update with new data
4. Wait up to 15 seconds for page to update
5. Verify new data appears on page

### 4. Run Tests

```bash
pnpm test server/webhooks.test.ts
```

All tests should pass, including webhook security validation.

## Bot Integration Checklist

- [ ] Discord bot has the webhook secret configured
- [ ] Bot sends POST request to `/api/webhooks/tournament` when tournament state changes
- [ ] Bot includes `X-Webhook-Secret` header with correct secret
- [ ] Bot payload matches the schema defined above
- [ ] Website bracket pages display updated data within 15 seconds
- [ ] Error handling works (invalid secret returns 401, invalid payload returns 400)

## Fallback Behavior

If the webhook endpoint is unavailable or the bot fails to update:

- **Event Winner**: Shows "TBD"
- **Status**: Shows "Awaiting Update"
- **Current Leader**: Shows "TBD"
- **Cycle**: Shows "1" (default)
- **Last Updated**: Shows current time (from client)

## Troubleshooting

### Bracket pages not updating

1. Check browser console for errors
2. Verify webhook secret is correct
3. Test webhook endpoint directly with curl
4. Check server logs for webhook errors
5. Verify tournament ID is correct ("dev-division" or "7th-circle")

### Webhook returns 401 Unauthorized

1. Verify `X-Webhook-Secret` header is included
2. Verify secret matches `TOURNAMENT_WEBHOOK_SECRET` environment variable
3. Check for typos in secret

### Webhook returns 400 Bad Request

1. Verify payload matches schema
2. Check `tournamentId` is "dev-division" or "7th-circle"
3. Check `status` is one of the allowed values
4. Verify `cycle` is a positive integer
5. Verify `isComplete` is a boolean

## Future Enhancements

1. **Database Persistence**: Store tournament state in database for historical tracking
2. **WebSocket Updates**: Replace polling with WebSocket for real-time updates
3. **Admin Dashboard**: Add admin panel to manually update tournament state
4. **Event History**: Track all state changes with timestamps
5. **Notifications**: Send browser notifications when tournament state changes

## Files Modified

- `server/webhooks.ts` - Webhook endpoint and state management
- `server/_core/index.ts` - Route registration
- `client/src/hooks/useTournamentState.ts` - React hook for state polling
- `client/src/pages/LiveBracket.tsx` - Dev Division bracket page
- `client/src/pages/LiveBracket2.tsx` - 7th Circle bracket page
- `server/webhooks.test.ts` - Webhook tests

## Support

For issues or questions about the integration, contact the development team or check the test files for additional examples.
