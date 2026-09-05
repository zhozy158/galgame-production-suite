(function () {
  "use strict";

  class VNEngine {
    constructor(config, story, voiceMap = {}) {
      this.config = config;
      this.story = story;
      this.voiceMap = voiceMap;
      this.prefix = config.storagePrefix;
      this.state = this.freshState();
      this.settings = this.loadJSON("settings", { textSpeed: 34, autoDelay: 1900, masterVolume: 70, skipUnread: false });
      this.profile = this.loadJSON("profile", { read: [], gallery: ["cover"], endings: [] });
      this.typing = null;
      this.timer = null;
      this.auto = false;
      this.skip = false;
      this.modalMode = null;
      this.voiceAudio = typeof Audio === "function" ? new Audio() : null;
      this.el = {};
    }

    freshState() {
      return { scene: this.config.startScene, index: 0, flags: {}, affinity: { linxia: 0, tangtao: 0, shenyue: 0 }, visual: { bg: null, cast: [], expressions: {}, cg: null }, history: [], startedAt: Date.now(), playMs: 0 };
    }

    key(name) { return `${this.prefix}:${name}`; }
    loadJSON(name, fallback) {
      try { return JSON.parse(localStorage.getItem(this.key(name))) || fallback; } catch (_) { return fallback; }
    }
    storeJSON(name, value) { localStorage.setItem(this.key(name), JSON.stringify(value)); }

    init() {
      const ids = ["title-screen", "game-screen", "ending-screen", "scene", "sprites", "textbox", "speaker", "dialogue", "choices", "modal", "modal-title", "modal-body", "toast", "chapter-label", "chapter-card", "mode-indicator", "ending-title", "ending-copy", "restore-ui"];
      ids.forEach(id => this.el[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = document.getElementById(id));
      this.el.eventCg = document.getElementById("event-cg");
      if (!this.el.eventCg) {
        this.el.eventCg = document.createElement("img");
        this.el.eventCg.id = "event-cg";
        this.el.eventCg.className = "event-cg hidden";
        this.el.eventCg.alt = "";
        this.el.scene.insertBefore(this.el.eventCg, this.el.sprites);
      }
      document.addEventListener("click", event => this.onClick(event));
      document.addEventListener("keydown", event => this.onKey(event));
      this.el.scene.addEventListener("click", event => {
        if (event.target.closest("button") || !this.el.modal.classList.contains("hidden")) return;
        this.advance();
      });
      this.preload();
      this.showScreen("title");
      return this;
    }

    preload() {
      Object.values(this.config.characters).forEach(char => {
        const sources = char.sprites ? Object.values(char.sprites) : [char.sprite];
        sources.filter(Boolean).forEach(src => { const img = new Image(); img.src = src; });
      });
      if (this.config.backgrounds && !Array.isArray(this.config.backgrounds)) {
        Object.values(this.config.backgrounds).filter(Boolean).forEach(src => { const img = new Image(); img.src = src; });
      }
      Object.values(this.config.cgs || {}).filter(Boolean).forEach(src => { const img = new Image(); img.src = src; });
      this.config.gallery.forEach(item => { const img = new Image(); img.src = item.src; });
    }

    onClick(event) {
      const choice = event.target.closest("[data-choice]");
      if (choice) return this.choose(Number(choice.dataset.choice));
      const slotAction = event.target.closest("[data-slot-action]");
      if (slotAction) return this.handleSlot(slotAction.dataset.slotAction, Number(slotAction.dataset.slot));
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      const actions = {
        "new-game": () => this.newGame(), "continue": () => this.continueGame(), "open-load": () => this.openSlots("load"),
        "open-gallery": () => this.openGallery(), "open-settings": () => this.openSettings(), title: () => this.returnTitle(),
        "quick-save": () => this.save("quick"), "quick-load": () => this.load("quick"), backlog: () => this.openBacklog(),
        save: () => this.openSlots("save"), load: () => this.openSlots("load"), auto: () => this.toggleAuto(), skip: () => this.toggleSkip(),
        "replay-voice": () => this.playVoiceForCurrentLine(true),
        "hide-ui": () => this.hideUI(true), "show-ui": () => this.hideUI(false), settings: () => this.openSettings(),
        "close-modal": () => this.closeModal(), "ending-title": () => this.showScreen("title"), "ending-gallery": () => this.openGallery()
      };
      actions[action]?.();
    }

    onKey(event) {
      if (!this.el.modal.classList.contains("hidden")) { if (event.key === "Escape") this.closeModal(); return; }
      if (!this.el.gameScreen.classList.contains("active")) return;
      if (event.key === " " || event.key === "Enter") { event.preventDefault(); this.advance(); }
      if (event.key.toLowerCase() === "a") this.toggleAuto();
      if (event.key === "Control") this.toggleSkip();
      if (event.key === "Escape") this.returnTitle();
    }

    showScreen(name) {
      [this.el.titleScreen, this.el.gameScreen, this.el.endingScreen].forEach(el => el.classList.remove("active"));
      this.el[`${name}Screen`]?.classList.add("active");
      this.clearPlayback();
    }

    newGame() {
      this.state = this.freshState();
      this.auto = false; this.skip = false;
      this.updateModes();
      this.showScreen("game");
      this.render();
    }

    continueGame() {
      if (!this.load("auto", true) && !this.load("quick", true)) this.newGame();
    }

    returnTitle() {
      if (this.el.gameScreen.classList.contains("active")) this.save("auto", true);
      this.closeModal();
      this.showScreen("title");
    }

    currentLine() { return this.story[this.state.scene]?.[this.state.index]; }

    render() {
      this.clearTimer();
      this.stopVoice();
      const scene = this.story[this.state.scene];
      if (!scene) return this.toast(`未找到场景：${this.state.scene}`);
      if (this.state.index >= scene.length) return this.toast("剧本到达未定义的末尾");
      const line = this.currentLine();
      if (line.type === "jump") { this.goto(line.target); return; }
      if (line.type === "jumpIf") { this.goto(this.testCondition(line.when) ? line.then : line.else); return; }
      if (line.type === "set") { this.applyEffects(line.effects); this.state.index += 1; this.render(); return; }
      if (line.type === "ending") { this.finish(line.id); return; }
      this.state.visual ||= { bg: null, cast: [], expressions: {}, cg: null };
      this.state.visual.expressions ||= {};
      if (line.bg) this.state.visual.bg = line.bg;
      if (line.cast) this.state.visual.cast = [...line.cast];
      if (Object.prototype.hasOwnProperty.call(line, "cg")) this.state.visual.cg = line.cg || null;
      if (line.expressions) Object.assign(this.state.visual.expressions, line.expressions);
      if (line.variants) Object.assign(this.state.visual.expressions, line.variants);
      if (line.expression && line.speaker) this.state.visual.expressions[line.speaker] = line.expression;
      if (line.variant && line.speaker) this.state.visual.expressions[line.speaker] = line.variant;
      if (this.state.visual.bg) this.setBackground(this.state.visual.bg);
      this.setCG(this.state.visual.cg);
      if (line.cast || line.expressions || line.expression || line.variants || line.variant || !this.el.sprites.children.length) {
        this.setCast(this.state.visual.cast, line.active);
      } else if (line.active) this.highlight(line.active);
      if (line.chapter) this.showChapter(line.chapter);
      if (line.type === "choice") return this.renderChoice(line);
      this.el.choices.classList.add("hidden");
      this.el.textbox.classList.remove("hidden");
      const char = this.config.characters[line.speaker];
      this.el.speaker.textContent = line.type === "narrate" ? "" : (char?.name || line.speaker || "");
      this.el.speaker.style.color = char?.color || "";
      this.playVoiceForCurrentLine();
      this.typeText(line.text || "");
      this.markRead();
      this.save("auto", true);
    }

    typeText(text) {
      if (this.typing) cancelAnimationFrame(this.typing.frame);
      const speed = Number(this.settings.textSpeed);
      if (speed <= 2 || this.skip) { this.el.dialogue.textContent = text; this.typing = null; return this.schedulePlayback(text); }
      const started = performance.now();
      this.el.dialogue.textContent = "";
      this.typing = { text, done: false, frame: null };
      const tick = now => {
        const count = Math.min(text.length, Math.floor((now - started) / speed));
        this.el.dialogue.textContent = text.slice(0, count);
        if (count < text.length) this.typing.frame = requestAnimationFrame(tick);
        else { this.typing = null; this.schedulePlayback(text); }
      };
      this.typing.frame = requestAnimationFrame(tick);
    }

    completeTyping() {
      if (!this.typing) return false;
      cancelAnimationFrame(this.typing.frame);
      this.el.dialogue.textContent = this.typing.text;
      const text = this.typing.text;
      this.typing = null;
      this.schedulePlayback(text);
      return true;
    }

    advance() {
      if (!this.el.gameScreen.classList.contains("active") || !this.el.choices.classList.contains("hidden")) return;
      if (this.completeTyping()) return;
      this.pushHistory(this.currentLine());
      this.state.index += 1;
      this.render();
    }

    goto(target) { this.state.scene = target; this.state.index = 0; this.render(); }

    renderChoice(line) {
      this.completeTyping();
      this.visibleOptions = line.options.filter(option => !option.when || this.testCondition(option.when));
      this.el.speaker.textContent = "选择";
      this.el.dialogue.textContent = line.prompt || "";
      this.el.choices.innerHTML = this.visibleOptions.map((option, index) => `<button data-choice="${index}">${this.escape(option.text)}</button>`).join("");
      this.el.choices.classList.remove("hidden");
      this.clearPlayback();
    }

    choose(index) {
      const line = this.currentLine();
      const option = this.visibleOptions?.[index];
      if (!option) return;
      this.pushHistory({ speaker: null, text: `▶ ${option.text}` });
      this.applyEffects(option.effects);
      if (option.unlock) this.unlockGallery(option.unlock);
      this.el.choices.classList.add("hidden");
      this.goto(option.target);
    }

    applyEffects(effects = {}) {
      Object.entries(effects).forEach(([key, value]) => {
        const bucket = key in this.state.affinity ? this.state.affinity : this.state.flags;
        if (value && typeof value === "object" && "set" in value) bucket[key] = value.set;
        else if (typeof value === "number") bucket[key] = (Number(bucket[key]) || 0) + value;
        else bucket[key] = value;
      });
    }

    testCondition(condition) {
      if (!condition) return true;
      if (condition.all) return condition.all.every(item => this.testCondition(item));
      if (condition.any) return condition.any.some(item => this.testCondition(item));
      if (condition.not) return !this.testCondition(condition.not);
      const key = condition.affinity || condition.flag;
      const source = condition.affinity ? this.state.affinity : this.state.flags;
      const actual = source[key];
      if ("eq" in condition) return actual === condition.eq;
      if ("neq" in condition) return actual !== condition.neq;
      if ("gte" in condition) return Number(actual || 0) >= condition.gte;
      if ("lte" in condition) return Number(actual || 0) <= condition.lte;
      return Boolean(actual);
    }

    pushHistory(line) {
      if (!line || !line.text) return;
      const speaker = this.config.characters[line.speaker]?.name || "";
      this.state.history.push({ speaker, text: line.text });
      this.state.history = this.state.history.slice(-180);
    }

    markRead() {
      const id = `${this.state.scene}:${this.state.index}`;
      if (!this.profile.read.includes(id)) { this.profile.read.push(id); this.storeJSON("profile", this.profile); }
    }

    setBackground(bg) {
      this.el.scene.className = this.el.scene.className.replace(/\bbg-[\w-]+\b/g, "").trim();
      this.el.scene.classList.add(`bg-${bg}`);
      const source = Array.isArray(this.config.backgrounds) ? null : this.config.backgrounds?.[bg];
      this.el.scene.style.backgroundImage = source ? `url("${source}")` : "";
    }

    setCG(id) {
      const source = id ? this.config.cgs?.[id] : null;
      this.el.eventCg.classList.toggle("hidden", !source);
      this.el.sprites.classList.toggle("hidden", Boolean(source));
      if (source) {
        if (this.el.eventCg.getAttribute("src") !== source) this.el.eventCg.src = source;
        this.el.eventCg.dataset.cg = id;
        this.unlockGallery(id);
      } else {
        this.el.eventCg.removeAttribute("src");
        delete this.el.eventCg.dataset.cg;
      }
    }

    setCast(ids, active) {
      this.el.sprites.innerHTML = ids.map((id, i) => {
        const char = this.config.characters[id];
        const expression = this.state.visual?.expressions?.[id] || char?.defaultExpression || "neutral";
        const sprite = char?.sprites?.[expression] || char?.sprites?.[char?.defaultExpression] || char?.sprite;
        if (!sprite) return "";
        const position = char.position || (["left", "center", "right"][i] || "center");
        return `<img class="sprite ${position} ${(active === id || (!active && ids.length === 1)) ? "active" : ""}" data-char="${id}" data-expression="${this.escape(expression)}" src="${sprite}" alt="">`;
      }).join("");
    }

    highlight(id) { this.el.sprites.querySelectorAll(".sprite").forEach(img => img.classList.toggle("active", img.dataset.char === id)); }

    showChapter(title) {
      this.el.chapterLabel.textContent = title;
      this.el.chapterCard.textContent = title;
      this.el.chapterCard.classList.remove("hidden");
      setTimeout(() => this.el.chapterCard.classList.add("hidden"), 2300);
    }

    schedulePlayback(text) {
      this.clearTimer();
      if (this.skip) {
        const id = `${this.state.scene}:${this.state.index}`;
        if (this.settings.skipUnread || this.profile.read.includes(id)) this.timer = setTimeout(() => this.advance(), 65);
        else this.toggleSkip(false);
      } else if (this.auto) {
        const textDelay = Number(this.settings.autoDelay) + Math.min(2200, text.length * 42);
        const voiceRemaining = this.voiceAudio && Number.isFinite(this.voiceAudio.duration)
          ? Math.max(0, this.voiceAudio.duration - this.voiceAudio.currentTime) * 1000 + Number(this.settings.autoDelay)
          : 0;
        const delay = Math.max(textDelay, voiceRemaining);
        this.timer = setTimeout(() => this.advance(), delay);
      }
    }

    voiceId() { return `${this.state.scene}__${String(this.state.index).padStart(3, "0")}`; }
    playVoiceForCurrentLine(replay = false) {
      const source = this.voiceMap?.[this.voiceId()];
      if (!this.voiceAudio || !source) { if (replay) this.toast("当前台词没有配音"); return; }
      this.voiceAudio.pause();
      this.voiceAudio.src = source;
      this.voiceAudio.currentTime = 0;
      this.voiceAudio.volume = Math.max(0, Math.min(1, Number(this.settings.masterVolume) / 100));
      this.voiceAudio.play().catch(() => { if (replay) this.toast("浏览器暂时阻止了音频播放，请再点一次"); });
    }
    stopVoice() {
      if (!this.voiceAudio) return;
      this.voiceAudio.pause();
      this.voiceAudio.removeAttribute("src");
      this.voiceAudio.load();
    }

    toggleAuto(force) {
      this.auto = typeof force === "boolean" ? force : !this.auto;
      if (this.auto) this.skip = false;
      this.updateModes();
      if (!this.typing) this.schedulePlayback(this.currentLine()?.text || "");
    }

    toggleSkip(force) {
      this.skip = typeof force === "boolean" ? force : !this.skip;
      if (this.skip) this.auto = false;
      this.updateModes();
      if (!this.typing) this.schedulePlayback(this.currentLine()?.text || "");
    }

    updateModes() {
      this.el.modeIndicator.textContent = this.auto ? "AUTO" : this.skip ? "SKIP" : "";
      document.querySelector('[data-action="auto"]')?.classList.toggle("on", this.auto);
      document.querySelector('[data-action="skip"]')?.classList.toggle("on", this.skip);
    }

    clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
    clearPlayback() { this.clearTimer(); if (this.typing) cancelAnimationFrame(this.typing.frame); this.typing = null; this.stopVoice(); }

    save(slot, quiet = false) {
      if (!this.el.gameScreen.classList.contains("active") && slot === "auto") return false;
      const snapshot = JSON.parse(JSON.stringify(this.state));
      snapshot.playMs += Date.now() - snapshot.startedAt;
      snapshot.startedAt = Date.now();
      snapshot.savedAt = Date.now();
      snapshot.preview = (this.currentLine()?.text || "").slice(0, 62);
      this.storeJSON(`save:${slot}`, snapshot);
      if (!quiet) this.toast(slot === "quick" ? "快速保存完成" : "保存完成");
      return true;
    }

    load(slot, quiet = false) {
      const data = this.loadJSON(`save:${slot}`, null);
      if (!data || !this.story[data.scene]) { if (!quiet) this.toast("该存档不存在"); return false; }
      this.state = data;
      this.state.startedAt = Date.now();
      this.auto = false; this.skip = false;
      this.updateModes();
      this.showScreen("game");
      this.closeModal();
      this.render();
      if (!quiet) this.toast("读取完成");
      return true;
    }

    openSlots(mode) {
      this.modalMode = mode;
      const slots = Array.from({ length: this.config.saveSlots }, (_, i) => i + 1);
      this.openModal(mode === "save" ? "保存游戏" : "读取游戏", `<div class="slot-grid">${slots.map(slot => this.slotHTML(slot, mode)).join("")}</div>
        <div class="ending-actions"><button data-action="export-saves">导出全部存档</button><button data-action="import-saves">导入存档</button><input id="import-file" type="file" accept="application/json" hidden></div>`);
      this.el.modalBody.querySelector('[data-action="export-saves"]')?.addEventListener("click", () => this.exportSaves());
      this.el.modalBody.querySelector('[data-action="import-saves"]')?.addEventListener("click", () => this.el.modalBody.querySelector("#import-file").click());
      this.el.modalBody.querySelector("#import-file")?.addEventListener("change", e => this.importSaves(e.target.files[0]));
    }

    slotHTML(slot, mode) {
      const data = this.loadJSON(`save:${slot}`, null);
      const stamp = data?.savedAt ? new Date(data.savedAt).toLocaleString("zh-CN") : "空存档位";
      const preview = data?.preview || "尚未保存";
      return `<article class="slot"><h3>存档 ${slot}</h3><small>${stamp}</small><p>${this.escape(preview)}</p><div class="slot-actions">
        <button data-slot-action="${mode}" data-slot="${slot}" ${mode === "load" && !data ? "disabled" : ""}>${mode === "save" ? "写入" : "读取"}</button>
        ${data ? `<button data-slot-action="delete" data-slot="${slot}">删除</button>` : ""}</div></article>`;
    }

    handleSlot(action, slot) {
      if (action === "save") { this.save(slot); this.openSlots("save"); }
      if (action === "load") this.load(slot);
      if (action === "delete") { localStorage.removeItem(this.key(`save:${slot}`)); this.openSlots(this.modalMode || "load"); }
    }

    exportSaves() {
      const data = { version: 1, configId: this.config.id, profile: this.profile, settings: this.settings, saves: {} };
      ["auto", "quick", ...Array.from({ length: this.config.saveSlots }, (_, i) => i + 1)].forEach(slot => { const v = this.loadJSON(`save:${slot}`, null); if (v) data.saves[slot] = v; });
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = Object.assign(document.createElement("a"), { href: url, download: `${this.config.id}-saves.json` });
      link.click(); URL.revokeObjectURL(url);
    }

    importSaves(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.configId !== this.config.id || !data.saves) throw new Error("invalid");
          Object.entries(data.saves).forEach(([slot, save]) => this.storeJSON(`save:${slot}`, save));
          if (data.profile) { this.profile = data.profile; this.storeJSON("profile", data.profile); }
          this.toast("存档导入成功"); this.openSlots(this.modalMode || "load");
        } catch (_) { this.toast("存档文件无效"); }
      };
      reader.readAsText(file);
    }

    openBacklog() {
      const content = this.state.history.length ? this.state.history.slice().reverse().map(x => `<div class="log-entry">${x.speaker ? `<b>${this.escape(x.speaker)}</b>` : ""}${this.escape(x.text)}</div>`).join("") : "<p>对话履历还是空的。</p>";
      this.openModal("对话履历", `<div class="backlog">${content}</div>`);
    }

    openSettings() {
      this.openModal("设置", `<div class="settings">
        <label class="setting"><span>文字速度</span><input id="text-speed" type="range" min="2" max="80" value="${this.settings.textSpeed}"><output>${this.settings.textSpeed}</output></label>
        <label class="setting"><span>自动播放间隔</span><input id="auto-delay" type="range" min="600" max="4000" step="100" value="${this.settings.autoDelay}"><output>${(this.settings.autoDelay/1000).toFixed(1)} 秒</output></label>
        <label class="setting"><span>语音音量</span><input id="volume" type="range" min="0" max="100" value="${this.settings.masterVolume}"><output>${this.settings.masterVolume}%</output></label>
        <label class="setting"><span>允许跳过未读文本</span><input id="skip-unread" type="checkbox" ${this.settings.skipUnread ? "checked" : ""}><output></output></label>
        <div class="ending-actions"><button data-reset-profile>重置已读与相册记录</button></div>
      </div>`);
      const bindRange = (id, key, format = v => v) => {
        const input = document.getElementById(id); input.addEventListener("input", () => { this.settings[key] = Number(input.value); input.nextElementSibling.textContent = format(input.value); this.storeJSON("settings", this.settings); });
      };
      bindRange("text-speed", "textSpeed"); bindRange("auto-delay", "autoDelay", v => `${(v/1000).toFixed(1)} 秒`); bindRange("volume", "masterVolume", v => `${v}%`);
      document.getElementById("volume").addEventListener("input", () => { if (this.voiceAudio) this.voiceAudio.volume = Number(this.settings.masterVolume) / 100; });
      document.getElementById("skip-unread").addEventListener("change", e => { this.settings.skipUnread = e.target.checked; this.storeJSON("settings", this.settings); });
      this.el.modalBody.querySelector("[data-reset-profile]").addEventListener("click", () => { this.profile = { read: [], gallery: ["cover"], endings: [] }; this.storeJSON("profile", this.profile); this.toast("解锁记录已重置"); });
    }

    openGallery() {
      const cards = this.config.gallery.map(item => {
        const unlocked = item.defaultUnlocked || this.profile.gallery.includes(item.id);
        return unlocked ? `<figure class="gallery-item"><img src="${item.src}" alt="${this.escape(item.title)}"><span>${this.escape(item.title)}</span></figure>` : `<figure class="gallery-item locked">未解锁<span>？？？</span></figure>`;
      }).join("");
      const endings = Object.entries(this.config.endings).map(([id, item]) => `<li>${this.profile.endings.includes(id) ? "✓" : "○"} ${this.escape(item.title)}</li>`).join("");
      this.openModal("回忆相册", `<div class="gallery">${cards}</div><div class="about"><h3>结局记录</h3><ul>${endings}</ul></div>`);
    }

    unlockGallery(id) {
      if (!this.profile.gallery.includes(id)) this.profile.gallery.push(id);
      this.storeJSON("profile", this.profile);
    }

    finish(id) {
      const ending = this.config.endings[id];
      if (!ending) return;
      if (!this.profile.endings.includes(id)) this.profile.endings.push(id);
      this.unlockGallery(id);
      this.storeJSON("profile", this.profile);
      this.el.endingTitle.textContent = ending.title;
      this.el.endingCopy.textContent = ending.copy;
      this.save("auto", true);
      this.showScreen("ending");
    }

    hideUI(hidden) {
      this.el.textbox.classList.toggle("hidden", hidden);
      this.el.restoreUi.classList.toggle("hidden", !hidden);
    }

    openModal(title, html) { this.clearTimer(); this.el.modalTitle.textContent = title; this.el.modalBody.innerHTML = html; this.el.modal.classList.remove("hidden"); }
    closeModal() { this.el.modal.classList.add("hidden"); if (this.auto || this.skip) this.schedulePlayback(this.currentLine()?.text || ""); }
    toast(message) { this.el.toast.textContent = message; this.el.toast.classList.remove("hidden"); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => this.el.toast.classList.add("hidden"), 1700); }
    escape(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  }

  window.VNEngine = VNEngine;
})();
