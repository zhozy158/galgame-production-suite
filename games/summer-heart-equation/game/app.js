window.addEventListener("DOMContentLoaded", () => {
  window.game = new window.VNEngine(window.GAME_CONFIG, window.GAME_STORY, window.GAME_VOICE_MAP).init();
});
