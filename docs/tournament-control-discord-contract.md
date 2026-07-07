# Tournament Control Room → Discord Bot Contract (Phase 2)

The website stores private lobby codes in `tournament_games.privateLobbyCode`. Phase 2 should deliver those codes from a trusted website server process to the separate Discord bot service; credentials and bot tokens must never enter the browser.

## Authentication

- Transport: HTTPS only.
- Caller: Murph Tournaments website server.
- Recipient: Discord bot service.
- Auth header: `Authorization: Bearer <TOURNAMENT_CONTROL_BOT_API_TOKEN>`.
- Token storage: website server environment variable and bot server environment variable/secret manager.
- Optional replay protection: include `X-Murph-Request-Timestamp` and `X-Murph-Signature: hmac_sha256(timestamp + body, shared_secret)`.

## Endpoint

`POST /internal/tournament-lobbies/send-code`

## Payload

```json
{
  "requestId": "uuid-or-ulid",
  "tournamentId": 123,
  "gameId": 456,
  "gameType": "cashout",
  "displayLabel": "Cashout Lobby 1",
  "lobbyCode": "ABC-123",
  "recipientMode": "all_assigned_players",
  "teams": [
    {
      "teamId": 10,
      "teamName": "Example Team",
      "slotIndex": 1,
      "members": [
        {
          "userId": 77,
          "discordUserId": "123456789012345678",
          "role": "captain"
        }
      ]
    }
  ]
}
```

`recipientMode` must be one of:

- `all_assigned_players`
- `team_leaders_only`

## Response

```json
{
  "requestId": "uuid-or-ulid",
  "status": "partial_success",
  "delivered": [
    {
      "discordUserId": "123456789012345678",
      "teamId": 10,
      "messageId": "987654321"
    }
  ],
  "failed": [
    {
      "discordUserId": "222222222222222222",
      "teamId": 10,
      "reason": "dm_closed"
    }
  ]
}
```

`status` must be `success`, `partial_success`, or `failed`. The website should persist delivery attempts in a future audit table before exposing a "Send to Discord" action.
