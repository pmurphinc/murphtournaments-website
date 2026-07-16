const DISCORD_API_BASE = "https://discord.com/api/v10";

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
  if (!channelResponse.ok)
    throw new Error(`Discord DM channel failed (${channelResponse.status})`);
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
    throw new Error(`Discord DM failed (${messageResponse.status})`);
}
