import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const roomSource = readFileSync(
  new URL("../pages/TournamentControlRoom.tsx", import.meta.url),
  "utf8"
);
const serverSource = readFileSync(
  new URL("../../../server/tournamentControl.ts", import.meta.url),
  "utf8"
);
const discordRolesTestSource = readFileSync(
  new URL("./discordTournamentRoles.test.ts", import.meta.url),
  "utf8"
);

function routeBlock(path: string) {
  const pathIndex = appSource.indexOf(`path={"${path}"}`);
  expect(pathIndex).toBeGreaterThan(-1);
  const routeEnd = appSource.indexOf("/>", pathIndex);
  return appSource.slice(
    pathIndex,
    routeEnd === -1 ? pathIndex + 220 : routeEnd
  );
}

describe("TCR route mode wiring", () => {
  it("renders personal TCR routes with explicit personal mode", () => {
    expect(appSource).toContain(
      "function PersonalTournamentControlRoomRoute()"
    );
    expect(appSource).toContain('<TournamentControlRoom mode="personal" />');
    expect(routeBlock("/TCR/:tournamentId")).toContain(
      "component={PersonalTournamentControlRoomRoute}"
    );
    expect(routeBlock("/tcr/:tournamentId")).toContain(
      "component={PersonalTournamentControlRoomRoute}"
    );
  });

  it("renders the Discord staff TCR route with explicit staff mode", () => {
    expect(appSource).toContain(
      "function DiscordStaffTournamentControlRoomRoute()"
    );
    expect(appSource).toContain(
      '<TournamentControlRoom mode="discord-staff" />'
    );
    expect(routeBlock("/admin/tournaments/:tournamentId/control")).toContain(
      "component={DiscordStaffTournamentControlRoomRoute}"
    );
  });

  it("selects the TCR tRPC router from the required mode prop, not the URL", () => {
    expect(roomSource).toContain(
      'export type TournamentControlRoomMode = "personal" | "discord-staff"'
    );
    expect(roomSource).toContain("mode: TournamentControlRoomMode");
    expect(roomSource).toContain('const isPersonalTcr = mode === "personal"');
    expect(roomSource).toContain(
      'mode === "personal" ? trpc.personalTcr : trpc.tournamentControl'
    );
    expect(roomSource).toContain("const query = controlApi.get.useQuery(");
    expect(roomSource).toContain(
      "const staffQuery = trpc.personalTcr.listStaff.useQuery("
    );
    expect(roomSource).not.toContain("isPersonalTcrPath");
    expect(roomSource).not.toContain("useLocation");
  });
});

describe("TCR authorization separation", () => {
  it("keeps personal TCR get behind owner, admin, or collaborator authorization", () => {
    expect(serverSource).toContain(
      "async function hasTournamentStaffMembership"
    );
    expect(serverSource).toContain(
      "async function getManageableTournamentOrThrow"
    );
    expect(serverSource).toContain("tournament.ownerUserId === user.id");
    expect(serverSource).toContain("await hasTournamentStaffMembership");
    expect(serverSource).toContain(
      "You can only manage tournaments you own or staff."
    );
    expect(serverSource).toContain("get: personalTcrProcedure");
    expect(serverSource).toContain(
      "await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);"
    );
  });

  it("uses staff get through the Discord Tournament Control role procedure", () => {
    expect(serverSource).toContain("await assertDiscordTournamentStaff(ctx);");
    expect(serverSource).toContain(
      "export const discordTournamentStaffProcedure"
    );
    expect(serverSource).toContain("get: discordTournamentStaffProcedure");
    expect(discordRolesTestSource).toContain(
      'message: "Tournament Control role required.",'
    );
  });
});
