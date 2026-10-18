export const QUESTS = Object.freeze([
  Object.freeze({ id: "trailblazer", title: "Trailblazer", detail: "Collect 35 pellets", goal: 35, rewardXp: 100, rewardCoins: 30 }),
  Object.freeze({ id: "power-runner", title: "Power Runner", detail: "Collect 2 power orbs", goal: 2, rewardXp: 140, rewardCoins: 40 }),
  Object.freeze({ id: "ghost-whisperer", title: "Ghost Whisperer", detail: "Tame an enemy", goal: 1, rewardXp: 180, rewardCoins: 55 }),
]);

export const SHOP_ITEMS = Object.freeze([
  Object.freeze({ id: "ration", title: "Energy Ration", detail: "+35 hunger", cost: 18, repeatable: true }),
  Object.freeze({ id: "pulse", title: "Pulse Capacitor", detail: "Wider pulse · max 3", cost: 55, repeatable: false }),
  Object.freeze({ id: "heart", title: "Heart Shard", detail: "+1 max heart · max 6", cost: 90, repeatable: false }),
  Object.freeze({ id: "charm", title: "Echo Charm", detail: "Unlock enemy taming · level 3", cost: 160, repeatable: false, level: 3 }),
]);

export const ABILITIES = Object.freeze({
  pacmen: Object.freeze([
    Object.freeze({ id: "sunshot", name: "Sunshot", icon: "☼", detail: "A bright ranged burst that singes nearby foes.", minLevel: 1, cost: 0, damage: 2, range: 5 }),
    Object.freeze({ id: "pulse-burst", name: "Pulse Burst", icon: "◎", detail: "A short-range sonic pulse with a wide stagger.", minLevel: 1, cost: 0, damage: 1, range: 4, area: true }),
    Object.freeze({ id: "frost-ring", name: "Frost Ring", icon: "❄", detail: "A cold pulse that damages and slows a small group.", minLevel: 3, cost: 35, damage: 2, range: 4 }),
    Object.freeze({ id: "star-lance", name: "Star Lance", icon: "✦", detail: "A piercing long-range strike.", minLevel: 6, cost: 90, damage: 4, range: 7 }),
    Object.freeze({ id: "time-field", name: "Pocket Time-Out", icon: "◷", detail: "Pause rivals inside a small temporal field.", minLevel: 4, cost: 55, damage: 1, range: 5, area: true, radius: 3, stunDuration: 2600, effect: "ability-frost-pop" }),
    Object.freeze({ id: "prism-barrage", name: "Prism Barrage", icon: "➶", detail: "A fan of bright ranged hits around the nearest rival.", minLevel: 7, cost: 110, damage: 2, range: 7, area: true, radius: 3, effect: "ability-spark-pop" }),
  ]),
  ghosts: Object.freeze([
    Object.freeze({ id: "echo-bolt", name: "Echo Bolt", icon: "◈", detail: "A ranged echo that rattles a nearby rival.", minLevel: 1, cost: 0, damage: 2, range: 5 }),
    Object.freeze({ id: "phase-snap", name: "Phase Snap", icon: "✧", detail: "A quick spectral close-range strike.", minLevel: 1, cost: 0, damage: 1, range: 3 }),
    Object.freeze({ id: "dread-wave", name: "Dread Wave", icon: "☠", detail: "A close spectral burst that catches a small group.", minLevel: 3, cost: 35, damage: 2, range: 4 }),
    Object.freeze({ id: "phase-crush", name: "Phase Crush", icon: "✧", detail: "A long-range strike that hits with extra force.", minLevel: 6, cost: 90, damage: 4, range: 7 }),
    Object.freeze({ id: "blink-step", name: "Blink Step", icon: "⟡", detail: "Teleport to a nearby open tile and slip past danger.", minLevel: 4, cost: 55, damage: 0, range: 7, type: "teleport", effect: "ability-ghost-echo" }),
    Object.freeze({ id: "hunger-siphon", name: "Hunger Haunt", icon: "☾", detail: "Drain nearby Pac-Men hunger and rattle their nerves.", minLevel: 5, cost: 75, damage: 1, range: 4, area: true, radius: 3, drainHunger: 28, effect: "ability-ghost-echo" }),
    Object.freeze({ id: "veil-of-nothing", name: "Veil of Nothing", icon: "◌", detail: "Become briefly invulnerable inside a spectral shroud.", minLevel: 7, cost: 110, damage: 0, range: 0, type: "invulnerable", duration: 3200, effect: "ability-ghost-stealth" }),
  ]),
});

export const WEAPONS = Object.freeze([
  Object.freeze({ id: "chomper-blade", name: "Neon Chomper", icon: "◒", detail: "A trusty close-range bite-and-slash.", damage: 1, range: 2, ranged: false }),
  Object.freeze({ id: "spark-sling", name: "Spark Sling", icon: "⚡", detail: "A cheeky ranged spark shot.", damage: 1, range: 5, ranged: true }),
  Object.freeze({ id: "echo-pike", name: "Echo Pike", icon: "➶", detail: "A longer spectral thrust with extra damage.", damage: 2, range: 3, ranged: false }),
  Object.freeze({ id: "prism-bow", name: "Prism Bow", icon: "➶", detail: "A long-range arc shot that pierces the maze.", damage: 2, range: 7, ranged: true }),
]);

export function createProgression(faction = "pacmen", startingAbility = null) {
  const abilities = ABILITIES[faction] || ABILITIES.pacmen;
  const starter = abilities.find(({ id }) => id === startingAbility)?.id || abilities[0].id;
  return {
    xp: 0,
    level: 1,
    coins: 0,
    pacCoins: 0,
    ghostCoins: 0,
    faction,
    unlockedAbilities: [starter],
    selectedAbility: starter,
    equippedWeapon: "chomper-blade",
    rebirths: 0,
    permanentPower: 0,
    maxHearts: 3,
    pulseTier: 0,
    charmUnlocked: false,
    quests: Object.fromEntries(QUESTS.map(({ id }) => [id, { progress: 0, completed: false }])),
  };
}

export function normalizeProgression(value, faction = "pacmen") {
  const defaults = createProgression(faction);
  if (!value || typeof value !== "object") return defaults;
  const normalizedFaction = value.faction === "ghosts" || value.faction === "pacmen" ? value.faction : faction;
  const hasWallets = Number.isFinite(Number(value.pacCoins)) || Number.isFinite(Number(value.ghostCoins));
  const legacyCoins = Math.max(0, Math.floor(Number(value.coins) || 0));
  const unlockedAbilities = Array.isArray(value.unlockedAbilities)
    ? [...new Set(value.unlockedAbilities.filter((id) => [...ABILITIES.pacmen, ...ABILITIES.ghosts].some((ability) => ability.id === id)))]
    : defaults.unlockedAbilities;
  const factionAbilities = ABILITIES[normalizedFaction];
  if (!unlockedAbilities.some((id) => factionAbilities.some((ability) => ability.id === id))) {
    unlockedAbilities.push(factionAbilities[0].id);
  }
  const selectedAbility = factionAbilities.some(({ id }) => id === value.selectedAbility && unlockedAbilities.includes(id))
    ? value.selectedAbility
    : factionAbilities.find(({ id }) => unlockedAbilities.includes(id)).id;
  const normalized = {
    xp: Math.max(0, Math.floor(Number(value.xp) || 0)),
    level: Math.max(1, Math.floor(Number(value.level) || 1)),
    coins: legacyCoins,
    pacCoins: hasWallets ? Math.max(0, Math.floor(Number(value.pacCoins) || 0)) : normalizedFaction === "pacmen" ? legacyCoins : 0,
    ghostCoins: hasWallets ? Math.max(0, Math.floor(Number(value.ghostCoins) || 0)) : normalizedFaction === "ghosts" ? legacyCoins : 0,
    faction: normalizedFaction,
    unlockedAbilities,
    selectedAbility,
    equippedWeapon: WEAPONS.some(({ id }) => id === value.equippedWeapon) ? value.equippedWeapon : "chomper-blade",
    rebirths: Math.max(0, Math.floor(Number(value.rebirths) || 0)),
    permanentPower: Math.max(0, Math.min(5, Math.floor(Number(value.permanentPower) || 0))),
    maxHearts: Math.max(3, Math.min(6, Math.floor(Number(value.maxHearts) || 3))),
    pulseTier: Math.max(0, Math.min(3, Math.floor(Number(value.pulseTier) || 0))),
    charmUnlocked: value.charmUnlocked === true,
    quests: defaults.quests,
  };
  for (const quest of QUESTS) {
    const stored = value.quests?.[quest.id];
    if (!stored || typeof stored !== "object") continue;
    normalized.quests[quest.id] = {
      progress: Math.max(0, Math.min(quest.goal, Math.floor(Number(stored.progress) || 0))),
      completed: stored.completed === true,
    };
    if (normalized.quests[quest.id].completed) normalized.quests[quest.id].progress = quest.goal;
  }
  return normalized;
}

export function xpToNextLevel(level) {
  return 100 + Math.max(0, level - 1) * 60;
}

export function awardXp(progress, amount) {
  const next = normalizeProgression(progress);
  next.xp += Math.max(0, Math.floor(amount));
  let levelsGained = 0;
  while (next.xp >= xpToNextLevel(next.level)) {
    next.xp -= xpToNextLevel(next.level);
    next.level += 1;
    levelsGained += 1;
  }
  return { progress: next, levelsGained };
}

export function awardCoins(progress, amount, faction = progress?.faction || "pacmen") {
  const next = normalizeProgression(progress);
  const reward = Math.max(0, Math.floor(amount));
  const wallet = faction === "ghosts" ? "ghostCoins" : "pacCoins";
  next[wallet] += reward;
  next.coins += reward;
  return next;
}

export function advanceQuest(progress, questId, amount = 1, faction = progress?.faction || "pacmen") {
  const next = normalizeProgression(progress);
  const quest = QUESTS.find((entry) => entry.id === questId);
  if (!quest) throw new Error(`Unknown quest: ${questId}`);
  const state = next.quests[questId];
  if (state.completed) return { progress: next, completed: false };
  state.progress = Math.min(quest.goal, state.progress + Math.max(0, Math.floor(amount)));
  if (state.progress < quest.goal) return { progress: next, completed: false };
  state.completed = true;
  const reward = awardXp(next, quest.rewardXp);
  reward.progress = awardCoins(reward.progress, quest.rewardCoins, faction);
  return { progress: reward.progress, completed: true, quest, levelsGained: reward.levelsGained };
}

export function purchaseItem(progress, itemId, { hunger = 0, currency = "coins" } = {}) {
  const next = normalizeProgression(progress);
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, error: "That item is not in the shop." };
  if (item.level && next.level < item.level) {
    return { ok: false, error: `Reach level ${item.level} to unlock this skill.` };
  }
  if (itemId === "heart" && next.maxHearts >= 6) return { ok: false, error: "Heart Shards are already fully upgraded." };
  if (itemId === "pulse" && next.pulseTier >= 3) return { ok: false, error: "Your pulse is already fully upgraded." };
  if (itemId === "charm" && next.charmUnlocked) return { ok: false, error: "The Echo Charm is already unlocked." };
  const wallet = currency === "ghostCoins" || currency === "pacCoins" ? currency : "coins";
  if (next[wallet] < item.cost) return { ok: false, error: `You need ${item.cost - next[wallet]} more coins.` };
  next[wallet] -= item.cost;
  if (wallet !== "coins") next.coins = Math.max(0, next.coins - item.cost);
  if (itemId === "ration") return { ok: true, item, progress: next, hunger: Math.min(100, hunger + 35) };
  if (itemId === "heart") next.maxHearts += 1;
  if (itemId === "pulse") next.pulseTier += 1;
  if (itemId === "charm") next.charmUnlocked = true;
  return { ok: true, item, progress: next, hunger };
}

export function unlockAbility(progress, abilityId, faction = progress?.faction || "pacmen") {
  const next = normalizeProgression({ ...progress, faction }, faction);
  const ability = ABILITIES[faction]?.find(({ id }) => id === abilityId);
  if (!ability) return { ok: false, error: "That ability does not belong to this faction." };
  if (next.unlockedAbilities.includes(ability.id)) {
    next.selectedAbility = ability.id;
    return { ok: true, alreadyUnlocked: true, ability, progress: next };
  }
  if (next.level < ability.minLevel) return { ok: false, error: `Reach level ${ability.minLevel} to unlock ${ability.name}.` };
  const wallet = faction === "ghosts" ? "ghostCoins" : "pacCoins";
  if (next[wallet] < ability.cost) return { ok: false, error: `You need ${ability.cost - next[wallet]} more ${faction === "ghosts" ? "Ghost Coins" : "PacCoins"}.` };
  next[wallet] -= ability.cost;
  next.coins = Math.max(0, next.coins - ability.cost);
  next.unlockedAbilities.push(ability.id);
  next.selectedAbility = ability.id;
  return { ok: true, ability, progress: next };
}

export function rebirthProgression(progress, faction = progress?.faction || "pacmen") {
  const next = normalizeProgression({ ...progress, faction }, faction);
  if (next.level < 10) return { ok: false, error: "Reach level 10 to rebirth." };
  if (next.rebirths >= 5) return { ok: false, error: "Your rebirth power is fully awakened." };
  next.rebirths += 1;
  next.permanentPower = Math.min(5, next.permanentPower + 1);
  next.xp = 0;
  next.level = 1;
  next.unlockedAbilities = [ABILITIES[faction][0].id];
  next.selectedAbility = ABILITIES[faction][0].id;
  next.maxHearts = Math.min(6, next.maxHearts + 1);
  return { ok: true, progress: next };
}
