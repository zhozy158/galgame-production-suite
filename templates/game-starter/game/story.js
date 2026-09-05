(function () {
  const n = (text, extra = {}) => ({ type: "narrate", text, ...extra });
  const s = (speaker, text, extra = {}) => ({ type: "say", speaker, text, ...extra });
  const c = (prompt, options) => ({ type: "choice", prompt, options });
  const end = id => ({ type: "ending", id });
  window.GAME_STORY = {
    prologue: [
      n("序章", { chapter: "序章", bg: "default", cast: [] }),
      n("这是 __GAME_TITLE__ 的示例剧本。"),
      s("protagonist", "公共引擎已经正常工作。"),
      c("结束示例吗？", [{ text: "结束", target: "demo_end" }])
    ],
    demo_end: [end("demo")]
  };
})();
