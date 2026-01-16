const DEFAULTS = { blockedSites: [], allowWindows: [], theme: "system", enabled: true }

function parseTimeToMinutes(t) {
  if (!t) return NaN
  const parts = t.split(":")
  if (parts.length !== 2) return NaN
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isInteger(h) || !Number.isInteger(m)) return NaN
  return h * 60 + m
}

function normalizeDomainInput(domain) {
  let d = (domain || "").toLowerCase().trim()
  d = d.replace(/^https?:\/\/(www\.)?/, "")
  d = d.replace(/^[*\.]+/, "")
  d = d.split("/")[0]
  return d
}

function load() {
  chrome.storage.sync.get(DEFAULTS, data => {
    renderSites(data.blockedSites || [])
    renderWindows(data.allowWindows || [])
    applyTheme(data.theme || "system")
    const sel = document.getElementById("appearance")
    if (sel) sel.value = data.theme || "system"
    const en = document.getElementById("enabled")
    if (en) en.checked = !!data.enabled
  })
}

function saveSites(sites) {
  chrome.storage.sync.set({ blockedSites: sites })
}

function saveWindows(windows) {
  chrome.storage.sync.set({ allowWindows: windows })
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme)
}

function saveTheme(theme) {
  chrome.storage.sync.set({ theme })
}

function saveEnabled(enabled) {
  chrome.storage.sync.set({ enabled })
}

function renderSites(sites) {
  const ul = document.getElementById("sites-list")
  ul.innerHTML = ""
  for (const s of sites) {
    const li = document.createElement("li")
    const span = document.createElement("span")
    span.textContent = s
    li.appendChild(span)

    const removeBtn = document.createElement("button")
    removeBtn.className = "delete-btn"
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
    removeBtn.title = "Remove"
    removeBtn.onclick = () => {
      const next = sites.filter(x => x !== s)
      renderSites(next)
      saveSites(next)
    }
    li.appendChild(removeBtn)
    ul.appendChild(li)
  }
}

function formatMinutes(mm) {
  const h = Math.floor(mm / 60)
  const m = mm % 60
  const hh = String(h).padStart(2, "0")
  const mmStr = String(m).padStart(2, "0")
  return hh + ":" + mmStr
}

function renderWindows(windows) {
  const ul = document.getElementById("windows-list")
  ul.innerHTML = ""
  for (const w of windows) {
    const li = document.createElement("li")
    const label = document.createElement("span")
    label.textContent = formatMinutes(w.startMinutes) + " → " + formatMinutes(w.endMinutes)
    li.appendChild(label)

    const removeBtn = document.createElement("button")
    removeBtn.className = "delete-btn"
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
    removeBtn.title = "Remove"
    removeBtn.onclick = () => {
      const next = windows.filter(x => !(x.startMinutes === w.startMinutes && x.endMinutes === w.endMinutes))
      renderWindows(next)
      saveWindows(next)
    }
    li.appendChild(removeBtn)
    ul.appendChild(li)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load()
  const sel = document.getElementById("appearance")
  if (sel) {
    sel.addEventListener("change", () => {
      const t = sel.value
      applyTheme(t)
      saveTheme(t)
    })
  }
  const en = document.getElementById("enabled")
  if (en) {
    en.addEventListener("change", () => {
      const v = en.checked
      saveEnabled(v)
      try {
        chrome.runtime.sendMessage({ type: "setEnabled", value: v })
      } catch {}
    })
  }
  document.getElementById("add-site").addEventListener("click", () => {
    const input = document.getElementById("site-input")
    const v = normalizeDomainInput(input.value)
    if (!v) return
    chrome.storage.sync.get(DEFAULTS, s => {
      const list = new Set(s.blockedSites || [])
      list.add(v)
      const next = Array.from(list)
      renderSites(next)
      saveSites(next)
      input.value = ""
    })
  })
  document.getElementById("add-window").addEventListener("click", () => {
    const st = parseTimeToMinutes(document.getElementById("start-time").value)
    const et = parseTimeToMinutes(document.getElementById("end-time").value)
    if (Number.isNaN(st) || Number.isNaN(et)) return
    const w = { startMinutes: st, endMinutes: et }
    chrome.storage.sync.get(DEFAULTS, s => {
      const next = (s.allowWindows || []).concat([w])
      renderWindows(next)
      saveWindows(next)
    })
  })
})
