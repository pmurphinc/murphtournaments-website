const DISCORD_API_BASE = "https://discord.com/api/v10";

/** The JSON body Discord returns alongside a failed request. */
export type DiscordErrorBody = { code?: number; message?: string };

/**
 * "Cannot send messages to this user." Discord returns this for every
 * reason a DM is refused and does not say which: the recipient shares no
 * server with the bot, their privacy settings block DMs from server
 * members, or they have blocked the bot.
 *
 * A bot can only DM someone it shares a server with — that is a Discord
 * platform rule, not something this site can configure around — so
 * "they are not in the Discord" is both the most common cause and the only
 * one an organiser can do anything about. It leads.
 */
const CANNOT_SEND_TO_USER = 50007;
const UNKNOWN_USER = 10013;

/**
 * Turns a failed Discord response into something an organiser can act on.
 *
 * This used to be `Discord DM failed (403)`, which is true and useless:
 * the status alone cannot distinguish a captain who never joined the
 * server from a bad bot token, and the person reading it is mid-event with
 * a lobby waiting. Discord sends a reason; the bare status threw it away.
 *
 * Every message ends by pointing at Copy Message, because the organiser
 * still has to get the code to that team somehow.
 */
export function explainDiscordDmFailure(
  status: number,
  body: DiscordErrorBody
): string {
  if (body.code === CANNOT_SEND_TO_USER)
    return (
      "Discord would not deliver this DM. The captain has to be in the " +
      "tournament Discord server and allow direct messages from server " +
      "members. Use Copy Message to send the code yourself."
    );
  if (body.code === UNKNOWN_USER)
    return (
      "Discord does not recognise that account any more. Use Copy Message " +
      "to send the code yourself."
    );
  if (status === 429)
    return "Discord is rate limiting the bot. Wait a moment and try again.";
  if (status === 401)
    return "Discord rejected the bot token. The server needs a valid DISCORD_BOT_TOKEN.";
  const detail = body.message ? `: ${body.message}` : "";
  return `Discord DM failed (${status}${detail}). Use Copy Message to send the code yourself.`;
}

async function readErrorBody(response: Response): Promise<DiscordErrorBody> {
  try {
    return (await response.json()) as DiscordErrorBody;
  } catch {
    // A non-JSON body (a gateway error page, say) is not worth failing over
    // — the status still carries a usable message.
    return {};
  }
}

/**
 * Sends a Discord DM via the bot token. Shared by every server-side feature
 * that delivers a Discord notification (TCR lobby codes, team invites, ...)
 * so request construction, auth headers, and error parsing live in one
 * place. Throws on any failure; callers decide how to surface that.
 */
export async function sendDiscordDm(discordUserId: string, content: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token)
    throw new Error(
      "Discord sending not configured: DISCORD_BOT_TOKEN is missing."
    );

  const channelResponse = await fetch(
    `${DISCORD_API_BASE}/users/@me/channels`,
    {
      method: "POST",
      headers: {
        authorization: `Bot ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordUserId }),
    }
  );
  // Opening the channel and posting to it fail for the same reasons and get
  // the same explanation. Which call refused is an implementation detail to
  // the organiser reading the toast.
  if (!channelResponse.ok)
    throw new Error(
      explainDiscordDmFailure(
        channelResponse.status,
        await readErrorBody(channelResponse)
      )
    );
  const channel = (await channelResponse.json()) as { id?: string };
  if (!channel.id)
    throw new Error("Discord DM channel response was missing an id");

  const messageResponse = await fetch(
    `${DISCORD_API_BASE}/channels/${channel.id}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bot ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ content }),
    }
  );
  if (!messageResponse.ok)
    throw new Error(
      explainDiscordDmFailure(
        messageResponse.status,
        await readErrorBody(messageResponse)
      )
    );
}
