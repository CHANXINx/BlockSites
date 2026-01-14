const DEFAULTS = { blockedSites: [], allowWindows: [] }
const THEME_DEFAULT = "system"

function normalizeDomain(host) {
  let d = (host || "").toLowerCase().trim()
  d = d.replace(/^https?:\/\/(www\.)?/, "")
  d = d.replace(/^[*\.]+/, "")
  d = d.split("/")[0]
  return d
}

function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]))
  })
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme || THEME_DEFAULT)
}

function updateStatus() {
  chrome.runtime.sendMessage({ type: "getStatus" }, res => {
    const el = document.getElementById("status")
    if (!res) {
      el.textContent = "Unknown"
      return
    }
    if (res.enabled === false) {
      el.textContent = "Disabled"
    } else {
      el.textContent = res.allowed ? "Allowed now" : "Blocked now"
    }
  })
}

document.addEventListener("DOMContentLoaded", async () => {
  chrome.storage.sync.get({ theme: THEME_DEFAULT }, s => {
    applyTheme(s.theme || THEME_DEFAULT)
  })
  const tab = await getActiveTab()
  const url = tab && tab.url ? new URL(tab.url) : null
  const domain = url ? normalizeDomain(url.hostname) : ""
  document.getElementById("domain").textContent = domain || "(no domain)"
  updateStatus()
  document.getElementById("block-btn").addEventListener("click", () => {
    if (!domain) return
    chrome.storage.sync.get(DEFAULTS, s => {
      const set = new Set(s.blockedSites || [])
      set.add(domain)
      chrome.storage.sync.set({ blockedSites: Array.from(set) }, () => {
        updateStatus()
      })
    })
  })
  document.getElementById("open-settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage()
  })
})
