// Parceiro para teste manual: fica parado na rua perto da praça, aceita convites de party.
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep } from "./lib";

const pos = nearestWalkable(HOME, 20, 15);
const room = await play("Parceiro Bot", "renji", (id) => patchSave(id, { level: 14, exp: expForLevel(14), hp: 9999, ...pos }));
room.onMessage("partyInvite", (m) => { console.log("convite de", m.from); room.send("partyAnswer", { accept: true }); });
room.onMessage("log", (m) => console.log("log:", m.text));
console.log("parceiro em", pos);
await sleep(Number(process.argv[2] ?? 120000));
await room.leave();
process.exit(0);
