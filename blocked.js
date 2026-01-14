const QUOTES = [
  "Focus now, freedom later.",
  "Small steps, big results.",
  "Distraction is a choice; choose progress.",
  "Your future self is watching.",
  "Minutes of focus beat hours of drift.",
  "Consistency compounds.",
  "Be where your goals need you.",
  "Win this minute.",
  "Do the work only you can do.",
  "Saying no creates room for yes.",
  "One deep hour changes your week.",
  "Start; momentum will follow.",
  "The hard thing is the right thing.",
  "You’re closer than you think.",
  "Build the habit, not the excuse."
]
let quoteIndex = Math.floor(Math.random() * QUOTES.length)
function renderQuote() {
  const el = document.getElementById("quote")
  if (el) el.textContent = QUOTES[quoteIndex]
}

function fitQuote() {
  const el = document.getElementById("quote")
  if (!el) return
  let size = parseFloat(getComputedStyle(el).fontSize) || 40
  const min = 18
  el.style.fontSize = size + "px"
  let i = 0
  while (el.scrollWidth > el.clientWidth && size > min && i < 100) {
    size -= 1
    el.style.fontSize = size + "px"
    i++
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get({ theme: "system" }, s => {
    document.body.setAttribute("data-theme", s.theme || "system")
  })
  renderQuote()
  fitQuote()
  window.addEventListener("resize", fitQuote)
  if (document.fonts && document.fonts.check) {
    const ok = document.fonts.check('600 24px "AppSegoeUIVariable"')
    if (!ok) {
      console.log("AppSegoeUIVariable not available; falling back")
    }
  }
})
