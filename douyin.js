// Douyin Gift Blocker - Enhanced Version v6
// Adds a shortcut (J) to toggle "屏蔽礼物特效"

// Global variable to track the element under the mouse
let lastHoveredElement = null;

document.addEventListener('mouseover', (e) => {
    lastHoveredElement = e.target;
}, { passive: true });

// Toast notification helper
function showToast(message, duration = 2500) {
  const id = "blocksites-toast";
  let toast = document.getElementById(id);
  if (toast) toast.remove();

  toast = document.createElement("div");
  toast.id = id;
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "15%",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 24px",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    color: "#fff",
    borderRadius: "8px",
    zIndex: "2147483647",
    fontSize: "16px",
    fontWeight: "500",
    fontFamily: "system-ui, sans-serif",
    pointerEvents: "none",
    transition: "all 0.3s ease",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.1)"
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast) {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(-20px)";
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// Enhanced click simulation
function simulateClick(element) {
  if (!element) return;
  
  // Visual feedback
  const originalTransition = element.style.transition;
  const originalTransform = element.style.transform;
  element.style.transition = "transform 0.1s";
  element.style.transform = "scale(0.95)";
  setTimeout(() => {
      element.style.transform = originalTransform;
      element.style.transition = originalTransition;
  }, 100);

  const rect = element.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;

  const eventOpts = { 
    bubbles: true, 
    cancelable: true, 
    view: window,
    clientX: clientX,
    clientY: clientY,
    buttons: 1
  };

  const events = [
    new MouseEvent('mouseover', eventOpts),
    new MouseEvent('mousedown', eventOpts),
    new PointerEvent('pointerdown', { ...eventOpts, pointerType: 'mouse' }),
    new MouseEvent('mouseup', eventOpts),
    new PointerEvent('pointerup', { ...eventOpts, pointerType: 'mouse' }),
    new MouseEvent('click', eventOpts)
  ];

  events.forEach(event => element.dispatchEvent(event));
}

// Special handler for Input checkboxes
function toggleCheckbox(input) {
    if (!input) return;
    console.log("[BlockSites] Toggling checkbox:", input);
    
    // 1. Try standard click
    input.click();
    
    // 2. Try forcing state change and dispatching events (React/Vue sometimes needs this)
    const previousValue = input.checked;
    input.checked = !previousValue;
    const eventOpts = { bubbles: true, cancelable: true, view: window };
    input.dispatchEvent(new Event('input', eventOpts));
    input.dispatchEvent(new Event('change', eventOpts));
    
    // 3. React 16+ hack to trigger onChange
    // React overrides the setter, so we need to call the native one
    try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked").set;
        nativeInputValueSetter.call(input, !previousValue);
        const ev2 = new Event('input', { bubbles: true });
        input.dispatchEvent(ev2);
    } catch (e) {
        // Ignore
    }
}

// Find the "Block Gift Effects" label text or switch
function findLabelElement() {
  // 1. Try precise text matches
  const xpaths = [
    "//*[text()='屏蔽礼物特效']",
    "//*[contains(text(), '屏蔽礼物特效')]",
    "//div[contains(@class, 'setting') and contains(., '屏蔽礼物')]"
  ];
  
  for (const xp of xpaths) {
    try {
      const result = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue && !result.singleNodeValue.closest('#blocksites-toast')) {
        return result.singleNodeValue;
      }
    } catch (e) {
      console.warn("XPath error:", e);
    }
  }

  // 2. Fallback: Find "Gift Settings" header/container and look for the FIRST switch inside it
  // The menu usually has a title "礼物设置"
  const headerXpath = "//*[text()='礼物设置']";
  try {
      const headerResult = document.evaluate(headerXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const header = headerResult.singleNodeValue;
      
      if (header) {
          console.log("[BlockSites] Found 'Gift Settings' header. Searching for switch in context...");
          // Traverse up to find the common container (Panel/Dialog)
          let container = header.parentElement;
          for(let i=0; i<6; i++) { // Go up a bit higher to catch the whole panel
              if(!container) break;
              
              // Search for ANY switch/checkbox in this container
              // We assume the "Block Effects" switch is the first one, or the one near "屏蔽" text
              
              // A. Look for text "屏蔽" (Block)
              const blockText = document.evaluate(".//*[contains(text(), '屏蔽')]", container, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (blockText && blockText !== header) {
                  console.log("[BlockSites] Found 'Block' text inside Settings panel:", blockText);
                  return blockText;
              }

              // B. Look for the first Switch/Checkbox
              const switchEl = container.querySelector('input[type="checkbox"], [role="switch"], [class*="switch"], [class*="Switch"], [class*="toggle"]');
              if (switchEl) {
                  console.log("[BlockSites] Found a switch inside Settings panel:", switchEl);
                  return switchEl;
              }

              container = container.parentElement;
          }
      }
  } catch(e) {
      console.warn("Header lookup error:", e);
  }

  return null;
}

// ... (performToggle remains the same) ...

// Enhanced "Left of Recharge" strategy - TARGETING PLAYER CONTROLS
function findGiftButtonByRecharge() {
    // This function tries to find the 'Recharge' button in the PLAYER CONTROL BAR, not the chat.
    // However, 'Recharge' might only exist in Chat. 
    // The user's screenshot shows the 'Gift Settings' button is in the player controls (bottom right of video).
    // It is to the LEFT of the Volume/Resolution/Fullscreen buttons.
    
    // Let's look for known player control buttons like "清晰度" (Resolution) or "全屏" (Fullscreen) or Volume
    const anchorTexts = ["全屏", "清晰度", "倍速", "画中画"]; 
    // Volume usually doesn't have text, but has a title/aria-label
    
    // 1. Try to find the container of player controls
    const anchors = document.querySelectorAll('[aria-label="全屏"], [title="全屏"], [aria-label="网页全屏"], [title="网页全屏"]');
    
    for (const anchor of anchors) {
        console.log("[BlockSites] Found Player Control Anchor:", anchor);
        let container = anchor.parentElement;
        for (let i = 0; i < 4; i++) {
            if (!container) break;
            
            // Look for the Gift Settings button in this container or siblings
            // The icon usually looks like a wand or box.
            
            // Check for buttons with "礼物" or "Gift" in title/aria-label
            const target = container.querySelector('[aria-label*="礼物"], [title*="礼物"], [aria-label*="Gift"], [title*="Gift"]');
            if (target) return target;
            
            container = container.parentElement;
        }
    }

    return null;
}

function openGiftMenu() {
  console.log("[BlockSites] Attempting to open Gift Menu...");

  // Priority 1: Explicit "Gift Settings" (礼物设置) button in Player Controls
  // This is the specific button user pointed out
  const settingsSelectors = [
      '[aria-label="礼物设置"]', 
      '[title="礼物设置"]',
      '[data-e2e="player-gift-setting"]', // Hypothetical
      '.xgplayer-gift-setting' // Hypothetical
  ];
  
  for (const sel of settingsSelectors) {
      const el = document.querySelector(sel);
      if (el) {
          console.log("[BlockSites] Found Gift Settings button via selector:", sel);
          simulateClick(el); 
          return true; 
      }
  }

  // Priority 2: Text "礼物设置" (Gift Settings)
  const textXpath = "//*[text()='礼物设置']";
  const textResult = document.evaluate(textXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  if (textResult.singleNodeValue) {
       console.log("[BlockSites] Found 'Gift Settings' text element");
       simulateClick(textResult.singleNodeValue);
       return true;
  }

  // Priority 3: Player Control Bar Anchor Strategy
  // Find the control bar via "Fullscreen" or "Volume" and look for the gift button nearby
  const playerControlBtn = findGiftButtonByRecharge(); // Renamed logic inside
  if (playerControlBtn) {
      console.log("[BlockSites] Found button via Player Control Anchor");
      simulateClick(playerControlBtn);
      return true;
  }

  // Priority 4: Fallback to generic "Gift" buttons (but avoid Chat if possible)
  // Only if we are desperate
  const genericSelectors = ['[data-e2e="live-gift-icon"]', '[data-e2e="gift-icon"]'];
  for (const sel of genericSelectors) {
    const el = document.querySelector(sel);
    if (el) { 
        // Heuristic: If it's in the chat room bottom bar, it might be the wrong one.
        // But if we haven't found anything else, we might as well try.
        if (!el.closest('.webcast-chatroom___bottom-message')) {
             console.log("[BlockSites] Found generic gift icon (likely player control):", sel);
             simulateClick(el); 
             return true; 
        }
    }
  }

  return false;
}

async function handleShortcut() {
  console.log("[BlockSites] 'J' pressed.");
  
  let label = findLabelElement();
  if (label) {
    // Found label, try to toggle
    performToggle(label);
    showToast("已执行切换操作 (v6 Aggressive)");
    return;
  }

  console.log("[BlockSites] Label not found. Opening menu...");
  const menuOpened = openGiftMenu();
  
  if (menuOpened) {
      showToast("正在打开菜单...", 1000);
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 100));
        label = findLabelElement();
        if (label) {
          await new Promise(r => setTimeout(r, 100));
          performToggle(label);
          showToast("✅ 已自动开启/关闭屏蔽");
          return;
        }
      }
      showToast("⚠️ 菜单已打开，但未找到 '屏蔽礼物特效' 选项");
      return;
  }

  if (lastHoveredElement) {
      console.log("[BlockSites] Hover Fallback on:", lastHoveredElement);
      simulateClick(lastHoveredElement);
      showToast("🖱️ 尝试点击鼠标悬停位置...", 1000);
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 100));
        label = findLabelElement();
        if (label) {
          await new Promise(r => setTimeout(r, 100));
          performToggle(label);
          showToast("✅ 成功！(通过鼠标辅助定位)");
          return;
        }
      }
  }

  showToast("❌ 自动定位失败。请将鼠标悬停在'礼物'按钮上，然后按 J");
}

document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
  if (e.key === "j" || e.key === "J") {
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      handleShortcut();
    }
  }
}, true);

console.log("[BlockSites] Douyin Script v6 Loaded. Aggressive toggle enabled.");
