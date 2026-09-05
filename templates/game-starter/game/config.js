(function () {
  window.GAME_CONFIG = {
    id: "__GAME_SLUG__",
    title: "__GAME_TITLE__",
    version: "0.1.0",
    startScene: "prologue",
    estimatedMinutes: 5,
    storagePrefix: "vn-__GAME_SLUG__-v1",
    saveSlots: 8,
    characters: { protagonist: { name: "主人公", color: "#a8c7ff" } },
    backgrounds: ["default"],
    gallery: [],
    endings: { demo: { title: "示例结局", copy: "请在 config.js 中替换这段结局说明。" } }
  };
})();
