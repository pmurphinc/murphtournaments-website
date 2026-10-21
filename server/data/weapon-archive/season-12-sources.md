# Season 12 data snapshot

Checked October 21, 2026 against:
- Embark launch: https://www.reachthefinals.com/patchnotes/12-00
- October 21 hotfix: https://www.reachthefinals.com/patchnotes/12-01
- Krome: https://docs.google.com/spreadsheets/d/1CAlLb9ebPWtXdsRKocSeIddDGa4xy5Hn3pzz4poGpD0/edit

Krome's Ranged_Weapons and Melee_Weapons tabs both identify version 12.0.0. Ranged columns E/F/H/I/J/L/M/N/O/P provide body/head damage, RPM, magazine, damage per magazine, reloads and falloff. Columns S/Y/AE provide body TTK. Melee column C provides damage; precise and glancing profiles are distinct. Dual Blades primary values represent two connected hits; Cross Slash and Shield Bash have their own profiles.

The current baseline JSON replaces the previous snapshot. The 11.6 override file remains as a historical reference and is no longer applied over the current data. Earlier patch and Respec test histories are retained. Body STK is recalculated using 175/250/325 HP for every numeric attack profile. Missing spreadsheet TTK cells stay unavailable rather than estimating burst timing from cyclic RPM. Timings exclude projectile travel and initial charge/spin-up; shotgun damage assumes all pellets hit. Unknown cells remain null.

Pike damage is 50, M60 RPM is 600, and full Dagger backstab remains 340; do not reuse the earlier Cashout test's 56/590/315 values. The XP-54 itemized launch change specifies magazine 36→34; its developer note loosely references damage but supplies no damage value, and Krome retains 16. The October 21 hotfix changes no weapon damage.

New Light equipment uses the official Infiltrator group artwork as an illustrative thumbnail, rather than invented item icons. Sonar Grenade's Medium entry shares the existing Light image. All previous public archive URLs remain available.

Downloaded XLSX SHA-256: aaee329e247acfc818adf14a0454cee2f45b33cfdf2ca4a4e00c178770bfa9be
