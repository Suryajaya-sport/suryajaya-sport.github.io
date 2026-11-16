(function () {
  const style = document.createElement("style");
  style.textContent = `
    #sjs-ai-btn {
      display: none;
      position: fixed; bottom: 22px; right: 22px; z-index: 9999;
      background: #0f172a; color: #fff; border: none; border-radius: 50px;
      padding: 13px 20px; font: 600 14px system-ui, -apple-system, sans-serif;
      cursor: pointer; box-shadow: 0 8px 24px rgba(15,23,42,.28);
      align-items: center; gap: 8px; transition: transform .2s ease;
    }
    body.sjs-admin #sjs-ai-btn { display: flex; }
    #sjs-ai-btn:hover { transform: translateY(-2px); }
    #sjs-ai-box {
      position: fixed; bottom: 82px; right: 22px; width: 360px; max-width: calc(100vw - 32px);
      height: 470px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      box-shadow: 0 16px 40px rgba(15,23,42,.2); z-index: 9999; display: none;
      flex-direction: column; overflow: hidden; font: 13px system-ui, -apple-system, sans-serif;
    }
    body:not(.sjs-admin) #sjs-ai-box { display: none !important; }
    #sjs-ai-header { background: #0f172a; color: #fff; padding: 14px 16px; display: flex;
      justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; }
    #sjs-ai-close { background: transparent; border: none; color: #cbd5e1; font-size: 20px; cursor: pointer; }
    #sjs-ai-messages { flex: 1; padding: 14px; overflow-y: auto; display: flex; flex-direction: column;
      gap: 10px; background: #f8fafc; }
    .sjs-msg { padding: 10px 12px; border-radius: 12px; max-width: 85%; line-height: 1.45; white-space: pre-wrap; }
    .sjs-msg-bot { background: #fff; color: #1e293b; border: 1px solid #e2e8f0; align-self: flex-start; }
    .sjs-msg-user { background: #2563eb; color: #fff; align-self: flex-end; }
    .sjs-msg-err { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; align-self: flex-start; }
    .sjs-confirm-btn { margin-top: 8px; background: #16a34a; color: #fff; border: none; padding: 7px 12px;
      border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: block; }
    .sjs-confirm-btn:disabled { background: #94a3b8; cursor: default; }
    #sjs-ai-form { display: flex; padding: 10px; border-top: 1px solid #e2e8f0; background: #fff; gap: 6px; }
    #sjs-ai-input { flex: 1; min-width: 0; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font-size: 13px; outline: none; }
    #sjs-ai-send { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 0 14px; font-weight: 600; font-size: 13px; cursor: pointer; }
    #sjs-ai-send:disabled { opacity: .6; cursor: default; }
  `;
  document.head.appendChild(style);

  const btn = document.createElement("button");
  btn.id = "sjs-ai-btn";
  btn.type = "button";
  btn.innerHTML = "<span>Asisten AI Kasir</span>";

  const box = document.createElement("div");
  box.id = "sjs-ai-box";
  box.innerHTML = `
    <div id="sjs-ai-header">
      <span>Asisten AI Surya Jaya Sport</span>
      <button id="sjs-ai-close" type="button" title="Tutup">&times;</button>
    </div>
    <div id="sjs-ai-messages">
      <div class="sjs-msg sjs-msg-bot">Halo! Saya bisa mencatat penjualan, menambah produk, mengubah stok, atau menjawab pertanyaan soal data toko.

Contoh:
• "Jual 2 Raket Yonex bayar QRIS"
• "Tambah produk Bola Futsal kategori Bola harga 150000 stok 10"
• "Stok Kok Yonex sekarang 20"
• "Penjualan hari ini berapa?"

Setiap perubahan data perlu Anda tekan tombol "Terapkan" dulu.</div>
    </div>
    <form id="sjs-ai-form">
      <input id="sjs-ai-input" type="text" placeholder="Ketik perintah..." autocomplete="off" required />
      <button id="sjs-ai-send" type="submit">Kirim</button>
    </form>`;

  document.body.appendChild(btn);
  document.body.appendChild(box);

  const messagesEl = document.getElementById("sjs-ai-messages");
  const inputEl = document.getElementById("sjs-ai-input");
  const sendEl = document.getElementById("sjs-ai-send");
  const formEl = document.getElementById("sjs-ai-form");

  btn.onclick = () => {
    const open = box.style.display === "flex";
    box.style.display = open ? "none" : "flex";
    if (!open) inputEl.focus();
  };
  document.getElementById("sjs-ai-close").onclick = () => { box.style.display = "none"; };

  function addMessage(text, kind, actionData) {
    const div = document.createElement("div");
    div.className = "sjs-msg " + (kind === "user" ? "sjs-msg-user" : kind === "err" ? "sjs-msg-err" : "sjs-msg-bot");
    div.textContent = text;

    if (actionData && actionData.aksi && actionData.aksi !== "tanya_jawab") {
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "sjs-confirm-btn";
      confirmBtn.textContent = "Terapkan";
      confirmBtn.onclick = () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Memproses...";
        window.dispatchEvent(new CustomEvent("sjs-ai-command", { detail: actionData }));
        confirmBtn.textContent = "Sudah diproses";
      };
      div.appendChild(confirmBtn);
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function ambilKonteks() {
    try {
      if (typeof window.sjsGetContext === "function") {
        return JSON.stringify(window.sjsGetContext()).slice(0, 6000);
      }
    } catch (e) { /* lanjut ke fallback */ }
    return (document.body.innerText || "").slice(0, 3500);
  }

  formEl.onsubmit = async (e) => {
    e.preventDefault();
    const prompt = inputEl.value.trim();
    if (!prompt) return;

    addMessage(prompt, "user");
    inputEl.value = "";
    sendEl.disabled = true;

    const loading = document.createElement("div");
    loading.className = "sjs-msg sjs-msg-bot";
    loading.textContent = "Memproses...";
    messagesEl.appendChild(loading);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const resp = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, konteks: ambilKonteks() }),
      });
      const data = await resp.json().catch(() => ({}));
      loading.remove();

      if (!resp.ok || data.error) {
        addMessage("Error: " + (data.error || "Gagal memproses permintaan."), "err");
        return;
      }
      addMessage(data.pesan_balasan || "Perintah diproses.", "bot", data);
    } catch (err) {
      loading.remove();
      addMessage("Gagal terhubung ke server. Pastikan situs sudah di-deploy dengan fungsi Netlify.", "err");
    } finally {
      sendEl.disabled = false;
      inputEl.focus();
    }
  };
})();
