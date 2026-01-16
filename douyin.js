// Douyin Live Gift Blocker - Final Production Version v14
// 基于用户提供的精确 data-e2e 属性 ("gift-setting" & "effect-switch") 实现自动化

console.log("[BlockSites] Douyin Script Loaded. Press 'J' to toggle gift effects.");

// -----------------------------------------------------------------------------
// 基础工具
// -----------------------------------------------------------------------------

function showToast(message) {
  const id = "blocksites-douyin-toast";
  const old = document.getElementById(id);
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.id = id;
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "15%",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    backgroundColor: "rgba(22, 24, 35, 0.95)",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    pointerEvents: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    transition: "opacity 0.3s"
  });
  
  document.body.appendChild(toast);
  setTimeout(() => { 
    if(document.getElementById(id) === toast) {
      toast.style.opacity = "0"; 
      setTimeout(() => toast.remove(), 2500);
    }
  }, 2500);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// -----------------------------------------------------------------------------
// 交互模拟
// -----------------------------------------------------------------------------

/**
 * 唤醒播放器控制栏
 * 在尝试寻找按钮前，先在播放器区域模拟鼠标移动，防止控制栏自动隐藏
 */
function wakeUpControls() {
    const player = document.querySelector('.xgplayer-controls') || document.querySelector('#webcast_player') || document.body;
    const eventOpts = { bubbles: true, cancelable: true, view: window, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
    player.dispatchEvent(new MouseEvent('mousemove', eventOpts));
}

/**
 * 模拟鼠标悬停 (触发菜单)
 */
function simulateHover(element) {
  if (!element) return;
  const eventOpts = { bubbles: true, cancelable: true, view: window };
  
  // 1. 进入元素
  element.dispatchEvent(new MouseEvent('mouseenter', eventOpts));
  element.dispatchEvent(new MouseEvent('mouseover', eventOpts));
  // 2. 在元素上微微移动 (有些组件检测移动才触发)
  element.dispatchEvent(new MouseEvent('mousemove', eventOpts));
  
  // 视觉反馈
  try {
      const originalOutline = element.style.outline;
      element.style.outline = "2px solid #ffff00"; // 黄色表示悬停中
      setTimeout(() => element.style.outline = originalOutline, 400);
  } catch(e) {}
}

/**
 * 模拟点击 (触发开关)
 */
function simulateClick(element) {
  if (!element) return;
  const eventOpts = { bubbles: true, cancelable: true, view: window };
  
  element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
  element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
  element.click();

  // 视觉反馈
  try {
      // 深度查找内部可能的 SVG 或 DIV 进行高亮，避免高亮整个大容器
      const vis = element.getAttribute('data-e2e') ? element : element.querySelector('[data-e2e]') || element;
      vis.style.outline = "3px solid #ff0050"; 
      setTimeout(() => vis.style.outline = "", 300);
  } catch(e) {}
}

/**
 * 深度点击：确保点中开关的任意有效部位
 */
function deepClick(root) {
    if (!root) return;
    simulateClick(root);
    // 有时候开关是一个嵌套结构，点内部子元素才生效
    root.querySelectorAll('*').forEach(child => simulateClick(child));
    // 有时候开关在父级监听
    if (root.parentElement) simulateClick(root.parentElement);
}

// -----------------------------------------------------------------------------
// 查找逻辑
// -----------------------------------------------------------------------------

/**
 * 核心任务：寻找并切换开关
 */
function tryToggleSwitch(context = document) {
  // 1. 优先使用你提取的精确代码 data-e2e="effect-switch"
  const exactSwitch = context.querySelector('[data-e2e="effect-switch"]');
  if (exactSwitch && exactSwitch.offsetParent !== null) {
      console.log("[BlockSites] 🎯 Found exact switch. Clicking...");
      deepClick(exactSwitch);
      return true;
  }

  // 2. 备用：寻找文字
  const xpath = `.//*[contains(text(), '屏蔽礼物') or contains(text(), '礼物特效') or contains(text(), '显示礼物')]`;
  try {
      const result = document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const label = result.singleNodeValue;
      if (label && label.offsetParent !== null) {
          console.log("[BlockSites] Found switch via label text.");
          if (label.nextElementSibling) deepClick(label.nextElementSibling);
          else if (label.parentElement) deepClick(label.parentElement);
          return true;
      }
  } catch (e) {}

  return false;
}

// -----------------------------------------------------------------------------
// 主流程
// -----------------------------------------------------------------------------

async function handleShortcut() {
  console.log("[BlockSites] Handling 'J'...");

  // 1. 检查开关是否已经可见 (菜单可能开着)
  if (tryToggleSwitch()) {
      showToast("⚡️ 已直接切换");
      return;
  }

  // 2. 尝试寻找入口按钮
  showToast("🖱️ 正在打开菜单...");
  
  // 唤醒控制栏，防止按钮隐藏
  wakeUpControls();
  await sleep(100); 

  // 精确查找你提供的按钮
  let settingsBtn = document.querySelector('[data-e2e="gift-setting"]');
  
  // 备用：如果精确查找失败，尝试模糊查找
  if (!settingsBtn) {
      settingsBtn = document.querySelector('[aria-label="礼物设置"]') || 
                    document.querySelector('[title="礼物设置"]');
  }

  if (settingsBtn) {
      console.log("[BlockSites] Found Settings Button:", settingsBtn);
      
      // 3. 悬停打开菜单
      simulateHover(settingsBtn);
      
      // 4. 循环检测开关出现
      // 菜单动画可能需要时间，给它 2.5 秒的时间窗口
      for (let i = 1; i <= 12; i++) {
          await sleep(200); 
          // 保持悬停状态，防止菜单消失
          if (i % 3 === 0) simulateHover(settingsBtn);
          
          if (tryToggleSwitch()) {
              showToast("✅ 成功屏蔽/开启");
              // 成功后把鼠标移开，让菜单自然消失 (可选)
              const body = document.body;
              body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }));
              return;
          }
      }
      showToast("⚠️ 菜单未弹出或未找到开关");
  } else {
      showToast("❌ 未找到‘礼物设置’按钮 (请确保控制栏可见)");
      // 再次尝试唤醒
      wakeUpControls();
  }
}

document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
  
  if (e.key.toLowerCase() === "j" && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    handleShortcut();
  }
}, true);