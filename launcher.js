fetch("games/catalog.json")
  .then(response => {
    if (!response.ok) throw new Error("catalog unavailable");
    return response.json();
  })
  .then(catalog => {
    document.getElementById("count").textContent = `${catalog.games.length} 部作品`;
    document.getElementById("games").innerHTML = catalog.games.map(game => `
      <a class="game" href="${game.path}">
        <span class="badge">${game.status === "playable" ? "可游玩" : "制作中"}</span>
        <h3>${escapeHTML(game.title)}</h3><p>${escapeHTML(game.description)}</p>
        <small>${escapeHTML(game.id)} →</small>
      </a>`).join("");
  })
  .catch(() => { document.getElementById("games").innerHTML = '<article class="loading">请通过 npm start 启动作品库，或直接打开 games 下具体游戏。</article>'; });

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}
