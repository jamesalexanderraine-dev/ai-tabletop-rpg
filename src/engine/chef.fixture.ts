// Test data only: a generated archetype within the budget.
// The example from docs/UPDATES.md: a chef, knife skills and foraging and all.
export const CHEF_DRAFT = {
  concept: "a royal chef who poisoned the wrong duke",
  name: "Chef",
  tagline: "Knows every herb in the forest and every cut of meat, and has opinions about both.",
  pool: "stamina",
  stats: { might: 0, agility: 2, wits: 1, presence: 1, spirit: 0, luck: 1 },
  skills: { blades: 1, survival: 1 },
  signatureWeapon: "A chef's knife",
  openingHook: "Somebody's stew is burning upstairs. You can smell exactly what they did wrong, and exactly where the kitchen is.",
  abilities: [
    { name: "Mise en Place", cost: 2, description: "Lay out whatever's to hand with a cook's precision: the right tool is always where you reach for it." },
    { name: "Throwing Knives", cost: 1, description: "Anything with an edge flies true from your hand: pin a sleeve to a door, cut a rope across a hall." },
    { name: "Forager", cost: 1, description: "Find food, herbs or poison in any patch of wild ground, and know which is which at a glance." },
    { name: "Comfort Food", cost: 2, description: "Cook a meal that restores 2 HP to everyone who eats it and makes them fond of the cook." },
    { name: "Poisoner's Palate", cost: 1, description: "Taste anything and know what's in it, who cooked it and whether it will kill you." },
    { name: "Kitchen Gossip", cost: 2, description: "Every household has a kitchen, and kitchens know everything. Learn a secret from the servants." },
    { name: "Flambé", cost: 9, description: "Turn a splash of spirits and a spark into a sudden sheet of flame that scatters a crowd." },
    { name: "Butcher's Eye", cost: 3, description: "See exactly where to cut: a weak joint in armour, a rotten beam, the one rope holding the load." },
    { name: "Feast", cost: 3, description: "Throw a feast that turns a hostile hall friendly for a night, given a kitchen and an hour." },
    { name: "Iron Stomach Cook", cost: 0, description: "Cook anything into something edible, including things that should never be eaten, and survive it." },
    { name: "Signature Dish", cost: 4, description: "Your masterpiece: a dish so good that kings forgive, rivals weep and doors open for a price." },
  ],
};
