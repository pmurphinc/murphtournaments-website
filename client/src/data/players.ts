export interface PlayerStats {
  name: string;
  level: number;
  hours: number;
  matches: number;
  wins: number;
  losses: number;
  elims: number;
  deaths: number;
  revives: number;
  cashout: number;
  damage: number;
  kd: number;
  winRate: number;
}

export const PLAYERS: PlayerStats[] = [
  { name: 'PLUTO', level: 123, hours: 732, matches: 4478, wins: 2649, losses: 1829, elims: 41492, deaths: 19753, revives: 6401, cashout: 135573420, damage: 13076273, kd: 2.10, winRate: 59.2 },
  { name: '44TURNIPS', level: 133, hours: 560, matches: 4069, wins: 2391, losses: 1678, elims: 38215, deaths: 24619, revives: 3142, cashout: 89884712, damage: 10766666, kd: 1.55, winRate: 58.8 },
  { name: 'TWOCEEZ', level: 156, hours: 1955, matches: 12126, wins: 5933, losses: 6193, elims: 72493, deaths: 62003, revives: 24956, cashout: 332624067, damage: 24399976, kd: 1.17, winRate: 48.9 },
  { name: 'STRMWRLD', level: 151, hours: 2165, matches: 13154, wins: 6384, losses: 6770, elims: 75645, deaths: 74378, revives: 17491, cashout: 334784725, damage: 25599392, kd: 1.02, winRate: 48.5 },
  { name: 'STEELSABBATH', level: 138, hours: 860, matches: 5206, wins: 2451, losses: 2755, elims: 27728, deaths: 31061, revives: 9079, cashout: 129729437, damage: 9871503, kd: 0.89, winRate: 47.1 },
  { name: '2SIKK', level: 136, hours: 953, matches: 5864, wins: 2921, losses: 2943, elims: 38677, deaths: 27291, revives: 7003, cashout: 154284780, damage: 11790709, kd: 1.42, winRate: 49.8 },
  { name: 'CAPTAIN', level: 167, hours: 1483, matches: 10603, wins: 6297, losses: 4306, elims: 72356, deaths: 58114, revives: 11610, cashout: 244999711, damage: 22180938, kd: 1.24, winRate: 59.4 },
  { name: 'DOOOKYBOOTYAHBOI', level: 123, hours: 1498, matches: 9269, wins: 5050, losses: 4219, elims: 57178, deaths: 49973, revives: 14675, cashout: 272391715, damage: 20620182, kd: 1.14, winRate: 54.5 },
  { name: 'DROOWINGS', level: 124, hours: 1031, matches: 6438, wins: 3809, losses: 2629, elims: 42707, deaths: 28973, revives: 12508, cashout: 178457097, damage: 14053673, kd: 1.47, winRate: 59.2 },
  { name: 'MISTERBIRDY', level: 130, hours: 943, matches: 5740, wins: 2680, losses: 3060, elims: 32664, deaths: 34619, revives: 6625, cashout: 143098675, damage: 11811352, kd: 0.94, winRate: 46.7 },
  { name: 'LIONXEC', level: 129, hours: 706, matches: 4300, wins: 2166, losses: 2134, elims: 29530, deaths: 23782, revives: 7514, cashout: 117550815, damage: 11145440, kd: 1.24, winRate: 50.4 },
  { name: 'MRTHIRDPARTY', level: 116, hours: 574, matches: 3429, wins: 1709, losses: 1720, elims: 25976, deaths: 17531, revives: 5381, cashout: 89864716, damage: 9961347, kd: 1.48, winRate: 49.8 },
  { name: 'MOCOCO', level: 120, hours: 1036, matches: 6396, wins: 3452, losses: 2944, elims: 38291, deaths: 35253, revives: 10768, cashout: 188122233, damage: 11394928, kd: 1.09, winRate: 54.0 },
  { name: 'PROTO', level: 122, hours: 600, matches: 3554, wins: 1796, losses: 1758, elims: 31562, deaths: 18219, revives: 5428, cashout: 92183333, damage: 10100060, kd: 1.73, winRate: 50.5 },
  { name: 'ANTHO', level: 113, hours: 571, matches: 3545, wins: 1838, losses: 1707, elims: 20085, deaths: 19290, revives: 6521, cashout: 98101128, damage: 6744045, kd: 1.04, winRate: 51.8 },
  { name: 'BIZU', level: 109, hours: 477, matches: 2992, wins: 1490, losses: 1502, elims: 22195, deaths: 15475, revives: 5421, cashout: 61234928, damage: 6858047, kd: 1.43, winRate: 49.8 },
  { name: 'DREXOR', level: 133, hours: 670, matches: 4036, wins: 1883, losses: 2153, elims: 25094, deaths: 25751, revives: 4245, cashout: 81354288, damage: 7947477, kd: 0.97, winRate: 46.6 },
  { name: 'OPT1SS', level: 127, hours: 628, matches: 3900, wins: 2164, losses: 1736, elims: 25906, deaths: 19291, revives: 6589, cashout: 111793920, damage: 9015252, kd: 1.34, winRate: 55.5 },
  { name: '877-CASHNOW', level: 86, hours: 260, matches: 1614, wins: 796, losses: 818, elims: 8095, deaths: 8092, revives: 1883, cashout: 39719076, damage: 3084509, kd: 1.00, winRate: 49.3 },
  { name: 'GETBONKEDNERD', level: 130, hours: 1340, matches: 7780, wins: 3292, losses: 4488, elims: 73716, deaths: 52286, revives: 10635, cashout: 127578636, damage: 20156502, kd: 1.41, winRate: 42.3 },
  { name: 'TENYAN', level: 75, hours: 246, matches: 1475, wins: 790, losses: 685, elims: 12616, deaths: 9315, revives: 2599, cashout: 36004078, damage: 4339936, kd: 1.35, winRate: 53.6 },
  { name: 'LLAMA', level: 99, hours: 391, matches: 2380, wins: 1121, losses: 1259, elims: 13809, deaths: 12793, revives: 2346, cashout: 55133493, damage: 5175169, kd: 1.08, winRate: 47.1 },
  { name: 'WEI_FAOSTEST', level: 141, hours: 932, matches: 5883, wins: 4044, losses: 1839, elims: 41853, deaths: 23053, revives: 7879, cashout: 204357182, damage: 11787183, kd: 1.82, winRate: 68.7 },
  { name: 'WEI_FAOSTER', level: 128, hours: 803, matches: 5060, wins: 3388, losses: 1672, elims: 31211, deaths: 17673, revives: 8392, cashout: 173369354, damage: 9743655, kd: 1.77, winRate: 67.0 },
  { name: 'WEI_FAO', level: 117, hours: 750, matches: 4735, wins: 3065, losses: 1670, elims: 29441, deaths: 18685, revives: 3982, cashout: 159429120, damage: 8098666, kd: 1.58, winRate: 64.7 },
  { name: 'WEI_FAOSTIFY', level: 108, hours: 286, matches: 1765, wins: 1160, losses: 605, elims: 6562, deaths: 8545, revives: 3473, cashout: 56135051, damage: 2330980, kd: 0.77, winRate: 65.7 },
  { name: 'OSPUZE.GOONER', level: 143, hours: 1301, matches: 8027, wins: 4245, losses: 3782, elims: 64017, deaths: 43357, revives: 13843, cashout: 196850301, damage: 17764140, kd: 1.48, winRate: 52.9 },
  { name: 'MOJO', level: 146, hours: 1785, matches: 11161, wins: 6284, losses: 4877, elims: 65942, deaths: 59960, revives: 17059, cashout: 341465434, damage: 24534940, kd: 1.10, winRate: 56.3 },
  { name: 'DIARRHEA04', level: 115, hours: 434, matches: 2664, wins: 1442, losses: 1222, elims: 15441, deaths: 14109, revives: 4839, cashout: 74927665, damage: 5921316, kd: 1.09, winRate: 54.1 },
  { name: 'NOCTIS', level: 121, hours: 426, matches: 2676, wins: 1373, losses: 1303, elims: 16581, deaths: 14359, revives: 3546, cashout: 74206924, damage: 5539095, kd: 1.15, winRate: 51.3 },
  { name: 'IANT182', level: 128, hours: 888, matches: 5523, wins: 2873, losses: 2650, elims: 25460, deaths: 29596, revives: 11898, cashout: 140776165, damage: 9876503, kd: 0.86, winRate: 52.0 },
];

export const PLAYER_DATA = PLAYERS.reduce<Record<string, PlayerStats>>((acc, player) => {
  acc[player.name.toLowerCase()] = player;
  return acc;
}, {});
