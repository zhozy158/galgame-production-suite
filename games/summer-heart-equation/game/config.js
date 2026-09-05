(function () {
  window.GAME_CONFIG = {
    id: "summer-heart-equation",
    title: "夏日心跳方程式",
    version: "1.2.2",
    startScene: "prologue",
    estimatedMinutes: 30,
    storagePrefix: "vn-summer-heart-v1",
    saveSlots: 8,
    characters: {
      linxia: {
        name: "林夏", color: "#f2d29a", position: "center", defaultExpression: "neutral",
        sprites: {
          neutral: "assets/characters-v2/linxia/base-neutral.png",
          smile: "assets/characters-v2/linxia/smile.png",
          sad: "assets/characters-v2/linxia/sad.png",
          angry: "assets/characters-v2/linxia/angry.png",
          surprised: "assets/characters-v2/linxia/surprised.png",
          shy: "assets/characters-v2/linxia/shy.png",
          "tuning-radio": "assets/characters-v2/linxia/action-tuning-radio.png"
        }
      },
      tangtao: {
        name: "唐桃", color: "#ffb0ba", position: "left", defaultExpression: "neutral",
        sprites: {
          neutral: "assets/characters-v2/tangtao/base-neutral.png",
          smile: "assets/characters-v2/tangtao/smile.png",
          sad: "assets/characters-v2/tangtao/sad.png",
          angry: "assets/characters-v2/tangtao/angry.png",
          surprised: "assets/characters-v2/tangtao/surprised.png",
          shy: "assets/characters-v2/tangtao/shy.png",
          "offering-soda": "assets/characters-v2/tangtao/action-offering-soda.png"
        }
      },
      shenyue: {
        name: "沈月", color: "#c8c6ff", position: "right", defaultExpression: "neutral",
        sprites: {
          neutral: "assets/characters-v2/shenyue/base-neutral.png",
          smile: "assets/characters-v2/shenyue/smile.png",
          sad: "assets/characters-v2/shenyue/sad.png",
          angry: "assets/characters-v2/shenyue/angry.png",
          surprised: "assets/characters-v2/shenyue/surprised.png",
          shy: "assets/characters-v2/shenyue/shy.png",
          "holding-archive": "assets/characters-v2/shenyue/action-holding-archive.png"
        }
      },
      protagonist: { name: "陆遥", color: "#a8c7ff" }
    },
    backgrounds: {
      seaside: "assets/backgrounds-v2/seaside.png",
      station: "assets/backgrounds-v2/station.png",
      workshop: "assets/backgrounds-v2/workshop.png",
      observatory: "assets/backgrounds-v2/observatory.png",
      festival: "assets/backgrounds-v2/festival.png",
      rain: "assets/backgrounds-v2/rain.png",
      dawn: "assets/backgrounds-v2/dawn.png"
    },
    cgs: {
      reunion: "assets/cg-v2/reunion.png",
      "hidden-tape": "assets/cg-v2/hidden-tape.png",
      "lighthouse-rescue": "assets/cg-v2/lighthouse-rescue.png",
      "storm-broadcast": "assets/cg-v2/storm-broadcast.png",
      "ending-linxia": "assets/cg-v2/ending-linxia.png",
      "ending-tangtao": "assets/cg-v2/ending-tangtao.png",
      "ending-shenyue": "assets/cg-v2/ending-shenyue.png"
    },
    gallery: [
      { id: "cover", title: "夏日心跳方程式", src: "assets/cg-v2/cover.png", defaultUnlocked: true },
      { id: "reunion", title: "迟到七年的欢迎", src: "assets/cg-v2/reunion.png" },
      { id: "hidden-tape", title: "被忘记的试播", src: "assets/cg-v2/hidden-tape.png" },
      { id: "lighthouse-rescue", title: "让未被听见的人被听见", src: "assets/cg-v2/lighthouse-rescue.png" },
      { id: "storm-broadcast", title: "雨夜的海岸电台", src: "assets/cg-v2/storm-broadcast.png" },
      { id: "ending-linxia", title: "星光抵达以前", src: "assets/cg-v2/ending-linxia.png" },
      { id: "ending-tangtao", title: "桃子汽水不会过期", src: "assets/cg-v2/ending-tangtao.png" },
      { id: "ending-shenyue", title: "写给明天的空白页", src: "assets/cg-v2/ending-shenyue.png" }
    ],
    endings: {
      linxia: { title: "星光抵达以前", copy: "你们没有等一个完美答案，而是在每一次杂音里确认彼此。海岸电台重新亮起时，林夏说，未来就是两个人愿意一起校准的频率。" },
      tangtao: { title: "桃子汽水不会过期", copy: "你终于明白，所谓重逢不是回到从前。唐桃拉着你奔向新一天的海风，把迟到多年的那句喜欢，变成了正在发生的现在。" },
      shenyue: { title: "写给明天的空白页", copy: "沈月将最后一页档案留给你们共同填写。记忆不再是一座密封的房间，而是一扇面向海面的窗。" }
    }
  };
})();
