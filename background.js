const DEFAULTS = { blockedSites: [], allowWindows: [], enabled: true }

function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function normalizeDomainFilter(domain) {
  let d = (domain || "").toLowerCase().trim()
  d = d.replace(/^https?:\/\/(www\.)?/, "")
  d = d.replace(/^[*\.]+/, "")
  d = d.split("/")[0]
  return d
}

function isAllowedNow(allowWindows) {
  const m = nowMinutes()
  for (const w of allowWindows || []) {
    const s = Number(w.startMinutes)
    const e = Number(w.endMinutes)
    if (Number.isNaN(s) || Number.isNaN(e)) continue
    if (s <= e) {
      if (m >= s && m < e) return true
    } else {
      if (m >= s || m < e) return true
    }
  }
  return false
}

function minutesToFutureMs(baseDate, minutes) {
  const d = new Date(baseDate)
  d.setHours(0, 0, 0, 0)
  let when = d.getTime() + minutes * 60000
  if (when <= baseDate.getTime()) when += 24 * 60 * 60000
  return when
}

function nextBoundaryMs(allowWindows) {
  const d = new Date()
  const m = nowMinutes()
  const candidates = []
  for (const w of allowWindows || []) {
    const s = Number(w.startMinutes)
    const e = Number(w.endMinutes)
    if (Number.isNaN(s) || Number.isNaN(e)) continue
    if (s <= e) {
      if (m < s) candidates.push(minutesToFutureMs(d, s))
      if (m < e) candidates.push(minutesToFutureMs(d, e))
    } else {
      if (m < e) candidates.push(minutesToFutureMs(d, e))
      candidates.push(minutesToFutureMs(d, s))
    }
  }
  if (candidates.length === 0) return d.getTime() + 60 * 60 * 1000
  candidates.sort((a, b) => a - b)
  return candidates[0]
}

function buildRules(blockedSites) {
  const rules = []
  let id = 1000
  for (const domain of blockedSites || []) {
    const filt = normalizeDomainFilter(domain)
    if (!filt) continue
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
      condition: { urlFilter: "||" + filt + "^", resourceTypes: ["main_frame"] }
    })
  }
  return rules
}

function getStorage() {
  return new Promise(resolve => chrome.storage.sync.get(DEFAULTS, resolve))
}

async function applyBlocking(shouldBlock, blockedSites) {
  const current = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = current.map(r => r.id)
  const addRules = shouldBlock ? buildRules(blockedSites) : []
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules, removeRuleIds })
}

function isEnabledValue(v) {
  return v === true || v === 'true' || v === 1
}

async function refresh() {
  const { blockedSites, allowWindows, enabled } = await getStorage()
  const on = isEnabledValue(enabled)
  if (!on) {
    await applyBlocking(false, blockedSites)
    chrome.alarms.clear("boundary")
    return
  }
  const allowed = isAllowedNow(allowWindows)
  await applyBlocking(!allowed, blockedSites)
  const when = nextBoundaryMs(allowWindows)
  chrome.alarms.clear("boundary", () => {
    chrome.alarms.create("boundary", { when })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, s => {
    const enabled = typeof s.enabled === "boolean" ? s.enabled : true
    chrome.storage.sync.set({ blockedSites: s.blockedSites || [], allowWindows: s.allowWindows || [], enabled }, refresh)
  })
})

chrome.runtime.onStartup.addListener(() => {
  refresh()
})

chrome.alarms.onAlarm.addListener(a => {
  if (a.name === "boundary") refresh()
})

chrome.storage.onChanged.addListener(() => {
  refresh()
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "getStatus") {
    getStorage().then(({ allowWindows, enabled }) => {
      sendResponse({ enabled: isEnabledValue(enabled), allowed: isAllowedNow(allowWindows) })
    })
    return true
  }
  if (msg && msg.type === "setEnabled") {
    const val = msg.value
    chrome.storage.sync.set({ enabled: !!val }, () => {
      refresh()
      sendResponse({ ok: true })
    })
    return true
  }
  if (msg && msg.type === "getRuleCount") {
    chrome.declarativeNetRequest.getDynamicRules().then(rules => {
      sendResponse({ count: rules.length })
    })
    return true
  }
  if (msg && msg.type === "nukeRules") {
    chrome.declarativeNetRequest.getDynamicRules().then(rules => {
      const ids = rules.map(r => r.id)
      chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids }, () => {
        sendResponse({ removed: ids.length })
      })
    })
    return true
  }
})
