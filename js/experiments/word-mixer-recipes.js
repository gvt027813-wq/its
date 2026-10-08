/* FunLab experiment — Word Mixer curated recipe book (original content).
   Loaded lazily by word-mixer.js once the browser is idle.
   Format: [ingredientA, ingredientB, result]; pair order does not matter.
   Everything here is original to FunLab. */
window.FunLab = window.FunLab || {};
(function (FL) {
  "use strict";

  const R = [
    // base combinations
    ["Bloom", "Bloom", "Bouquet"],
    ["Mist", "Mist", "Cloud"],
    ["Spark", "Spark", "Ember"],
    ["Stone", "Stone", "Mountain"],
    ["Mist", "Spark", "Lightning"],
    ["Spark", "Stone", "Metal"],
    ["Bloom", "Spark", "Candle"],
    ["Bloom", "Mist", "Garden"],
    ["Mist", "Stone", "Moss"],
    ["Bloom", "Stone", "Bonsai"],

    // energy & weather chains
    ["Ember", "Spark", "Bonfire"],
    ["Lightning", "Spark", "Plasma"],
    ["Metal", "Spark", "Engine"],
    ["Candle", "Spark", "Wish"],
    ["Bonfire", "Spark", "Festival"],
    ["Plasma", "Spark", "Star"],
    ["Cloud", "Mist", "Rain"],
    ["Lightning", "Mist", "Storm"],
    ["Garden", "Mist", "Fairy"],
    ["Mist", "Rain", "Rainbow"],
    ["Mist", "Star", "Galaxy"],
    ["Mist", "Plasma", "Aurora"],
    ["Metal", "Mist", "Mirror"],
    ["Engine", "Mist", "Train"],
    ["Mist", "Wish", "Dream"],
    ["Lightning", "Lightning", "Thunder"],
    ["Lightning", "Plasma", "Fusion"],
    ["Rain", "Rain", "Flood"],
    ["Storm", "Storm", "Hurricane"],
    ["Hail", "Mist", "Snow"],
    ["Snow", "Stone", "Snowman"],

    // flora & fauna
    ["Bloom", "Bouquet", "Petal"],
    ["Bloom", "Garden", "Bee"],
    ["Bee", "Bloom", "Honey"],
    ["Bloom", "Rain", "Fruit"],
    ["Bloom", "Candle", "Perfume"],
    ["Bloom", "Moss", "Fern"],
    ["Bloom", "Puddle", "Frog"],
    ["Fern", "Stone", "Fossil"],
    ["Fossil", "Magic", "Dinosaur"],
    ["Dinosaur", "Rainbow", "Nessie"],
    ["Frog", "Magic", "Prince"],

    // earth & water
    ["Cloud", "Stone", "Hail"],
    ["Cloud", "Cloud", "Sky"],
    ["Mountain", "Stone", "Volcano"],
    ["Rain", "Stone", "River"],
    ["Rain", "River", "Waterfall"],
    ["River", "Stone", "Canyon"],
    ["Flood", "Stone", "Delta"],
    ["Bloom", "Delta", "Oasis"],
    ["Oasis", "Rain", "Jungle"],
    ["Volcano", "Rain", "Island"],
    ["Island", "Island", "Archipelago"],

    // craft & industry
    ["Metal", "Stone", "Tool"],
    ["Metal", "Tool", "Sword"],
    ["Metal", "Metal", "Steel"],
    ["Metal", "River", "Mill"],
    ["Engine", "Engine", "Factory"],
    ["Engine", "Steel", "Robot"],
    ["Mill", "Train", "City"],
    ["City", "City", "Metropolis"],
    ["City", "Garden", "Park"],
    ["City", "Storm", "Umbrella"],
    ["Rain", "Umbrella", "Puddle"],
    ["Factory", "Bee", "Farm"],
    ["Farm", "River", "Harvest"],
    ["Harvest", "Festival", "Feast"],
    ["Factory", "Train", "Subway"],

    // myth & magic
    ["Spark", "Wish", "Magic"],
    ["Prince", "Wish", "Kingdom"],
    ["Kingdom", "Stone", "Castle"],
    ["Castle", "Dream", "Dragon"],
    ["Kingdom", "Sword", "Knight"],
    ["Dragon", "Knight", "Legend"],
    ["Legend", "Magic", "Myth"],
    ["Myth", "Star", "Zodiac"],
    ["Dream", "Dream", "Nightmare"],
    ["Mist", "Nightmare", "Ghost"],
    ["Ghost", "Train", "Ghost Train"],
    ["Nightmare", "Stone", "Tomb"],
    ["Kingdom", "Tomb", "Pharaoh"],
    ["Mountain", "Tomb", "Pyramid"],
    ["Pyramid", "Star", "Sphinx"],
    ["Stone", "Wish", "Idol"],
    ["Fairy", "Spark", "Pixie"],
    ["Dream", "Pixie", "Pixie Dust"],
    ["Mirror", "Magic", "Portal"],
    ["Perfume", "Wish", "Charm"],
    ["Magic", "Mirror", "Spell"],
    ["Magic", "Unicorn", "Pegasus"],
    ["Aurora", "Rainbow", "Unicorn"],

    // cosmos
    ["Sky", "Star", "Space"],
    ["Galaxy", "Galaxy", "Universe"],
    ["Dream", "Universe", "Big Bang"],
    ["Star", "Star", "Nova"],
    ["Nova", "Star", "Supernova"],
    ["Stone", "Supernova", "Crystal"],
    ["Crystal", "Mist", "Prism"],
    ["Lightning", "Prism", "Laser"],
    ["Laser", "Mist", "Hologram"],
    ["Star", "Wish", "Comet"],
    ["Comet", "Stone", "Meteor"],
    ["Mirror", "Mirror", "Window"],
    ["Portal", "Star", "Wormhole"],
    ["Universe", "Wormhole", "Multiverse"],

    // heart & celebration
    ["Dream", "Wish", "Hope"],
    ["Hope", "Wish", "Miracle"],
    ["Robot", "Wish", "Genie"],
    ["Genie", "Wish", "Infinity"],
    ["Crystal", "Wish", "Diamond"],
    ["Diamond", "Metal", "Ring"],
    ["Kingdom", "Ring", "Crown"],
    ["Crown", "Wish", "Throne"],
    ["Candle", "Wish", "Birthday"],
    ["Fairy", "Festival", "Carnival"],
    ["Festival", "Petal", "Confetti"],
    ["Honey", "Stone", "Amber"],
  ];

  const map = Object.create(null);
  for (const [a, b, result] of R) {
    map[[a, b].slice().sort().join("+")] = result;
  }

  FL.wordRecipes = map;
})(window.FunLab);
