# TwitterAnt 架构重构方案

## 重构目标

**核心理念转变**: 从"侧边栏为中心"转向"推文为中心"

### 用户需求
1. ✅ 所有数据分析结果直接显示在 tweet 上
2. ✅ 右侧边栏只提供配置功能（专注模式 + 兴趣设置）
3. ✅ 边栏主页 = 专注模式配置页（去掉信号列表）
4. ✅ 保留方案 1 的渐进式分析优化

---

## 一、架构对比

### 当前架构 (Before)

```
┌─────────────────────────────────────────────────────────────┐
│                     Twitter 页面                             │
│                                                               │
│  推文 1  [🔥92 ⭐]  ← 简单指示器                             │
│  推文 2  [📊75 ⭐]                                           │
│  推文 3  (无信号)                                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   侧边栏 (主要展示区)                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │ 🏠 主页 (信号列表)                               │       │
│  │ ┌─────────────────────────────────────────┐     │       │
│  │ │ SignalCard 1 (详细信息)                  │     │       │
│  │ │ - AI 总结                                │     │       │
│  │ │ - 匹配原因                               │     │       │
│  │ │ - 推文内容                               │     │       │
│  │ │ - 反馈按钮                               │     │       │
│  │ └─────────────────────────────────────────┘     │       │
│  │ SignalCard 2 ...                                │       │
│  │ SignalCard 3 ...                                │       │
│  └─────────────────────────────────────────────────┘       │
│  ⚙️ 设置页                                                   │
│  🎯 专注模式页                                               │
└─────────────────────────────────────────────────────────────┘
```

**问题**:
- 用户需要在推文和侧边栏之间切换查看
- 信息分散在两个地方
- 推文上的指示器信息太少

---

### 重构后架构 (After)

```
┌─────────────────────────────────────────────────────────────┐
│                     Twitter 页面                             │
│                                                               │
│  ┌───────────────────────────────────────────────────┐      │
│  │ 推文 1                                             │      │
│  │ ┌─────────────────────────────────────────────┐   │      │
│  │ │ 🔥 92分 趋势信号              [⭐][👍][👎] │   │      │
│  │ │ ──────────────────────────────────────────  │   │      │
│  │ │ 💡 AI 总结: Claude 4.5 发布，性能提升...   │   │      │
│  │ │ 🔑 AI技术  💫 高互动  ⏱️ 新鲜              │   │      │
│  │ │ ──────────────────────────────────────────  │   │      │
│  │ │ [▼ 展开详情] [🔗 反馈] [ℹ️ 更多]           │   │      │
│  │ └─────────────────────────────────────────────┘   │      │
│  └───────────────────────────────────────────────────┘      │
│                                                               │
│  推文 2 (透明度 0.3 - 低分弱化)                              │
│  推文 3 [📊75 趋势信号] ...                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                侧边栏 (仅配置功能)                            │
│  ┌─────────────────────────────────────────────────┐       │
│  │ 🎯 专注模式 (默认主页)                           │       │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │       │
│  │ 模式: [🔥聚焦] [📊平衡] [🌊全部]                │       │
│  │ 强度: ━━━━━━━●━━━━━ 70%                         │       │
│  │ 统计: 已弱化 15 条                               │       │
│  │                                                   │       │
│  │ 监控设置:                                         │       │
│  │ - 分析条数: [50] [100] [200]                    │       │
│  │ - ☑️ 自动监控                                    │       │
│  └─────────────────────────────────────────────────┘       │
│                                                               │
│  ⚙️ 兴趣设置                                                 │
│  ┌─────────────────────────────────────────────────┐       │
│  │ - AI/机器学习 (85%) ☑️                           │       │
│  │ - Web3 (70%) ☑️                                  │       │
│  │ - 自定义关键词: [GPT] [Agent] [+添加]           │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**优势**:
- ✅ 所有信息集中在推文上，无需切换
- ✅ 侧边栏专注于配置，结构清晰
- ✅ 推文卡片信息更丰富，交互更直接

---

## 二、详细重构计划

### 阶段 1: 侧边栏简化 (删除信号列表)

#### 1.1 删除的文件
```bash
src/sidebar/components/SignalCard.tsx     # 完全删除（或移到 content/）
```

#### 1.2 修改的文件

**A. `src/sidebar/App.tsx`**

变更内容:
```typescript
// 删除
- const [signals, setSignals] = useState<Signal[]>([]);
- const [view, setView] = useState<'list' | 'settings' | 'focus'>('list');

// 修改为
+ const [view, setView] = useState<'focus' | 'settings'>('focus'); // 默认专注模式

// 删除 'list' 视图的渲染逻辑
- {view === 'list' && (
-   <div className="signals-list">
-     {signals.map(signal => <SignalCard ... />)}
-   </div>
- )}

// 默认显示专注模式
{view === 'focus' && <FocusModeView />}
{view === 'settings' && <SettingsView />}
```

消息监听器变更:
```typescript
// 删除
- case 'SIGNALS_UPDATED':
-   setSignals(message.data);
-   break;

// 删除
- case 'SWITCH_SIDEBAR_VIEW':
-   if (message.data.view === 'list') setView('focus'); // 重定向到专注模式
-   break;
```

**B. `src/sidebar/components/Header.tsx`**

变更内容:
```typescript
// 删除 props
interface HeaderProps {
- onHomeClick?: () => void;  // 不再需要返回主页
  onFocusModeClick?: () => void;
  onSettingsClick?: () => void;
  onClose: () => void;
}

// 删除 Home 按钮
- {onHomeClick && (
-   <button onClick={onHomeClick}>
-     <Home size={16} />
-   </button>
- )}
```

**C. `src/sidebar/components/FocusModeView.tsx`**

增强内容:
```typescript
// 新增统计信息展示
+ const [totalSignals, setTotalSignals] = useState(0);      // 总信号数
+ const [highValueSignals, setHighValueSignals] = useState(0); // 高价值信号数

// 监听来自 content script 的统计更新
+ useEffect(() => {
+   const handleMessage = (message: any) => {
+     if (message.type === 'SIGNAL_STATS_UPDATED') {
+       setTotalSignals(message.data.total);
+       setHighValueSignals(message.data.highValue);
+     }
+   };
+   chrome.runtime.onMessage.addListener(handleMessage);
+   return () => chrome.runtime.onMessage.removeListener(handleMessage);
+ }, []);

// UI 中添加统计信息卡片
+ <div className="signal-stats">
+   <div className="stat-item">
+     <span className="stat-label">今日发现</span>
+     <span className="stat-value">{totalSignals} 个信号</span>
+   </div>
+   <div className="stat-item">
+     <span className="stat-label">高价值</span>
+     <span className="stat-value">{highValueSignals} 个</span>
+   </div>
+ </div>
```

---

### 阶段 2: 推文卡片增强 (信息丰富化)

#### 2.1 增强 SignalIndicatorManager

**文件**: `src/content/SignalIndicatorManager.ts`

**变更**: 创建更详细的推文卡片

```typescript
// 新增：详细卡片模板
private createDetailedSignalCard(signal: Signal): HTMLElement {
  const card = document.createElement('div');
  card.className = 'tsf-signal-card-detailed';
  card.dataset.tsfTweetId = signal.tweetId;

  // 判断分数等级
  const scoreClass = signal.score >= 85 ? 'tsf-score-high' :
                     signal.score >= 70 ? 'tsf-score-medium' :
                     'tsf-score-low';
  const scoreIcon = signal.score >= 85 ? '🔥' : '📊';

  card.innerHTML = `
    <div class="tsf-card-header">
      <!-- 左侧：分数徽章 -->
      <div class="tsf-score-badge ${scoreClass}">
        <span class="tsf-score-icon">${scoreIcon}</span>
        <span class="tsf-score-value">${signal.score}</span>
        <span class="tsf-score-label">趋势信号</span>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="tsf-card-actions">
        <button class="tsf-action-btn tsf-whitelist-btn" title="星标">⭐</button>
        <button class="tsf-action-btn tsf-feedback-btn tsf-feedback-up" title="有用">👍</button>
        <button class="tsf-action-btn tsf-feedback-btn tsf-feedback-down" title="无感">👎</button>
      </div>
    </div>

    <!-- AI 总结区域 -->
    <div class="tsf-card-summary">
      <span class="tsf-summary-icon">💡</span>
      <span class="tsf-summary-text">${this.escapeHtml(signal.aiSummary || '暂无总结')}</span>
    </div>

    <!-- 匹配原因标签 -->
    <div class="tsf-card-reasons">
      ${this.renderMatchReasons(signal.matchReasons || [])}
    </div>

    <!-- 可展开的详情区域 -->
    <div class="tsf-card-expandable">
      <button class="tsf-expand-btn">
        <span class="tsf-expand-icon">▼</span>
        <span class="tsf-expand-text">展开详情</span>
      </button>

      <div class="tsf-card-details" style="display: none;">
        <!-- 详细解读 (如果有) -->
        ${signal.detailedExplanation ? `
          <div class="tsf-detail-section">
            <h4>📄 详细解读</h4>
            <p>${this.escapeHtml(signal.detailedExplanation)}</p>
          </div>
        ` : ''}

        <!-- 为什么值得关注 (如果有) -->
        ${signal.whyItMatters ? `
          <div class="tsf-detail-section">
            <h4>💎 为什么值得关注</h4>
            <p>${this.escapeHtml(signal.whyItMatters)}</p>
          </div>
        ` : ''}

        <!-- 关键洞察 (如果有) -->
        ${signal.keyInsights && signal.keyInsights.length > 0 ? `
          <div class="tsf-detail-section">
            <h4>🔍 关键洞察</h4>
            <ul>
              ${signal.keyInsights.map(insight =>
                `<li>${this.escapeHtml(insight)}</li>`
              ).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- 反馈区域 -->
        <div class="tsf-detail-section">
          <h4>📊 帮助我们改进</h4>
          <div class="tsf-feedback-buttons">
            <button class="tsf-feedback-detailed" data-feedback="helpful">
              👍 有用
            </button>
            <button class="tsf-feedback-detailed" data-feedback="neutral">
              😐 一般
            </button>
            <button class="tsf-feedback-detailed" data-feedback="wrong">
              ⚠️ 误判
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 绑定事件监听器
  this.attachCardEventListeners(card, signal);

  return card;
}

// 新增：渲染匹配原因
private renderMatchReasons(reasons: MatchReason[]): string {
  if (!reasons || reasons.length === 0) {
    return '<span class="tsf-reason-tag tsf-reason-default">📌 推荐</span>';
  }

  const iconMap: Record<string, string> = {
    'keyword': '🔑',
    'engagement': '💫',
    'timing': '⏱️',
    'author': '👤',
    'topic': '📚'
  };

  return reasons
    .slice(0, 3) // 最多显示 3 个
    .map(reason => {
      const icon = iconMap[reason.type] || '📌';
      const weight = Math.round((reason.weight || 0) * 100);
      return `
        <span class="tsf-reason-tag tsf-reason-${reason.type}" title="权重: ${weight}%">
          ${icon} ${this.escapeHtml(reason.value)}
        </span>
      `;
    })
    .join('');
}

// 新增：绑定卡片事件
private attachCardEventListeners(card: HTMLElement, signal: Signal) {
  // 展开/收起按钮
  const expandBtn = card.querySelector('.tsf-expand-btn');
  const detailsSection = card.querySelector('.tsf-card-details');
  const expandIcon = card.querySelector('.tsf-expand-icon');
  const expandText = card.querySelector('.tsf-expand-text');

  expandBtn?.addEventListener('click', () => {
    const isExpanded = detailsSection?.style.display !== 'none';

    if (isExpanded) {
      detailsSection.style.display = 'none';
      expandIcon.textContent = '▼';
      expandText.textContent = '展开详情';
    } else {
      detailsSection.style.display = 'block';
      expandIcon.textContent = '▲';
      expandText.textContent = '收起详情';
    }
  });

  // 星标按钮 (双击添加白名单)
  const whitelistBtn = card.querySelector('.tsf-whitelist-btn');
  let clickCount = 0;
  let clickTimer: NodeJS.Timeout | null = null;

  whitelistBtn?.addEventListener('click', () => {
    clickCount++;

    if (clickCount === 1) {
      clickTimer = setTimeout(() => {
        // 单击: 显示提示
        this.showTooltip(whitelistBtn as HTMLElement, '双击添加到白名单');
        clickCount = 0;
      }, 300);
    } else if (clickCount === 2) {
      // 双击: 添加到白名单
      if (clickTimer) clearTimeout(clickTimer);
      this.addToWhitelist(signal.tweetId);
      whitelistBtn.innerHTML = '⭐';
      whitelistBtn.classList.add('tsf-whitelisted');
      clickCount = 0;
    }
  });

  // 快捷反馈按钮
  const feedbackUpBtn = card.querySelector('.tsf-feedback-up');
  const feedbackDownBtn = card.querySelector('.tsf-feedback-down');

  feedbackUpBtn?.addEventListener('click', () => {
    this.submitFeedback(signal.tweetId, 'helpful');
    feedbackUpBtn.classList.add('tsf-feedback-active');
    this.showTooltip(feedbackUpBtn as HTMLElement, '已反馈 👍');
  });

  feedbackDownBtn?.addEventListener('click', () => {
    this.submitFeedback(signal.tweetId, 'neutral');
    feedbackDownBtn.classList.add('tsf-feedback-active');
    this.showTooltip(feedbackDownBtn as HTMLElement, '已反馈 👎');
  });

  // 详细反馈按钮
  const detailedFeedbackBtns = card.querySelectorAll('.tsf-feedback-detailed');
  detailedFeedbackBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const feedback = btn.getAttribute('data-feedback');
      if (feedback) {
        this.submitFeedback(signal.tweetId, feedback);
        detailedFeedbackBtns.forEach(b => b.classList.remove('tsf-feedback-active'));
        btn.classList.add('tsf-feedback-active');
        this.showTooltip(btn as HTMLElement, '感谢反馈！');
      }
    });
  });
}

// 新增：提交反馈
private submitFeedback(tweetId: string, feedback: string) {
  chrome.runtime.sendMessage({
    type: 'SUBMIT_SIGNAL_FEEDBACK',
    data: { tweetId, feedback, timestamp: Date.now() }
  });
}

// 新增：显示提示
private showTooltip(element: HTMLElement, message: string) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tsf-tooltip';
  tooltip.textContent = message;

  document.body.appendChild(tooltip);

  const rect = element.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.top = `${rect.top - 30}px`;
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.transform = 'translateX(-50%)';

  setTimeout(() => {
    tooltip.remove();
  }, 2000);
}

// 新增：转义 HTML
private escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

#### 2.2 新增样式文件

**文件**: `src/content/signal-card-styles.css`

```css
/* ===========================
   TSF 详细信号卡片样式
   =========================== */

.tsf-signal-card-detailed {
  margin: 12px 0;
  padding: 16px;
  background: linear-gradient(135deg, rgba(247, 220, 111, 0.08) 0%, rgba(247, 220, 111, 0.12) 100%);
  border: 2px solid rgba(247, 220, 111, 0.4);
  border-radius: 12px;
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tsf-signal-card-detailed:hover {
  background: linear-gradient(135deg, rgba(247, 220, 111, 0.12) 0%, rgba(247, 220, 111, 0.16) 100%);
  border-color: rgba(247, 220, 111, 0.6);
  box-shadow: 0 4px 12px rgba(247, 220, 111, 0.2);
}

/* ===========================
   卡片头部区域
   =========================== */

.tsf-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* 分数徽章 */
.tsf-score-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.tsf-score-badge.tsf-score-high {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%);
  color: white;
}

.tsf-score-badge.tsf-score-medium {
  background: linear-gradient(135deg, #4dabf7 0%, #74c0fc 100%);
  color: white;
}

.tsf-score-icon {
  font-size: 18px;
}

.tsf-score-value {
  font-size: 20px;
  font-weight: 700;
}

.tsf-score-label {
  font-size: 11px;
  opacity: 0.9;
}

/* 操作按钮组 */
.tsf-card-actions {
  display: flex;
  gap: 6px;
}

.tsf-action-btn {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.tsf-action-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(247, 220, 111, 0.6);
  transform: scale(1.1);
}

.tsf-action-btn.tsf-feedback-active {
  background: rgba(247, 220, 111, 0.3);
  border-color: rgba(247, 220, 111, 0.8);
}

.tsf-whitelisted {
  background: rgba(255, 215, 0, 0.2) !important;
  border-color: rgba(255, 215, 0, 0.6) !important;
}

/* ===========================
   AI 总结区域
   =========================== */

.tsf-card-summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.7);
  border-left: 3px solid #f7dc6f;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.5;
}

.tsf-summary-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.tsf-summary-text {
  flex: 1;
  color: #333;
  font-weight: 500;
}

/* ===========================
   匹配原因标签
   =========================== */

.tsf-card-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tsf-reason-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #555;
  transition: all 0.2s;
}

.tsf-reason-tag:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(247, 220, 111, 0.6);
  transform: translateY(-1px);
}

.tsf-reason-tag.tsf-reason-keyword {
  border-color: rgba(52, 152, 219, 0.3);
  background: rgba(52, 152, 219, 0.05);
}

.tsf-reason-tag.tsf-reason-engagement {
  border-color: rgba(155, 89, 182, 0.3);
  background: rgba(155, 89, 182, 0.05);
}

.tsf-reason-tag.tsf-reason-timing {
  border-color: rgba(26, 188, 156, 0.3);
  background: rgba(26, 188, 156, 0.05);
}

/* ===========================
   可展开详情区域
   =========================== */

.tsf-card-expandable {
  margin-top: 8px;
}

.tsf-expand-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.tsf-expand-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(247, 220, 111, 0.5);
  color: #333;
}

.tsf-expand-icon {
  transition: transform 0.3s;
}

.tsf-card-details {
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 详情区域的各个 section */
.tsf-detail-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tsf-detail-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.tsf-detail-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.tsf-detail-section p {
  font-size: 13px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}

.tsf-detail-section ul {
  margin: 6px 0 0 0;
  padding-left: 20px;
}

.tsf-detail-section li {
  font-size: 13px;
  line-height: 1.5;
  color: #666;
  margin-bottom: 4px;
}

/* 详细反馈按钮 */
.tsf-feedback-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.tsf-feedback-detailed {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
}

.tsf-feedback-detailed:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(247, 220, 111, 0.6);
  transform: translateY(-2px);
}

.tsf-feedback-detailed.tsf-feedback-active {
  background: rgba(247, 220, 111, 0.3);
  border-color: rgba(247, 220, 111, 0.8);
}

/* ===========================
   提示框样式
   =========================== */

.tsf-tooltip {
  position: fixed;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  font-size: 12px;
  border-radius: 6px;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  animation: fadeInOut 2s ease;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(-5px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  90% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-5px); }
}
```

---

### 阶段 3: 后端适配 (恢复详细输出)

#### 3.1 修改 backend/agent.py

由于现在推文卡片需要显示详细信息，我们需要恢复 AI 的详细输出：

```python
# _construct_analysis_prompt() 方法

def _construct_analysis_prompt(self, tweets: List[Dict], user_profile: Dict) -> str:
    """构建推文分析的提示词 - 详细版（用于推文卡片展示）"""

    simplified_tweets = [...]  # 保持不变

    return f"""用户信息:
- 身份: {user_profile.get('persona', 'unknown')}
- 关注领域: {', '.join([i['label'] for i in user_profile.get('interests', []) if i.get('enabled')])}
- 自定义关键词: {', '.join(user_profile.get('customKeywords', []))}

任务:
分析以下推文，判断它们对用户的价值并评分。为高价值推文提供详细解读。

推文列表:
{json.dumps(simplified_tweets, ensure_ascii=False, indent=2)}

输出格式 (JSON) - 详细版:
{{
  "signals": [
    {{
      "tweetId": "...",
      "isValuable": true,
      "category": "技术/产品/趋势",
      "score": 85,
      "aiSummary": "一句话概括（20字以内）",
      "detailedExplanation": "详细解读这条推文的内容和价值（2-3句话）",
      "whyItMatters": "为什么值得关注（1-2句话）",
      "keyInsights": [
        "关键洞察点 1",
        "关键洞察点 2"
      ],
      "matchReasons": [
        {{
          "type": "keyword",
          "value": "具体关键词",
          "weight": 0.85
        }}
      ]
    }}
  ],
  "allScores": [
    {{"tweetId": "...", "score": 85}},
    {{"tweetId": "...", "score": 20}}
  ]
}}

评分标准:
1. 关键词匹配度 (40%)
2. 内容质量 (30%)
3. 互动热度 (20%)
4. 时间新鲜度 (10%)

注意事项:
- signals 列表中只返回 score >= 70 的高价值信号
- allScores 列表中返回**所有**推文的评分 (0-100)
- aiSummary 简短（20字以内），detailedExplanation 详细（2-3句）
- 必须输出合法的 JSON 格式
"""

# 同时调整 max_tokens
# analyze_tweets() 方法中:
message = self.client.messages.create(
    model=model_name,
    max_tokens=3072,  # 增加到 3072 以支持详细输出
    temperature=0,
    system="你是一个资深的社交媒体内容分析专家。",
    messages=[{"role": "user", "content": prompt}]
)
```

---

### 阶段 4: 消息流调整

#### 4.1 新增统计消息

**content/index.ts** 中新增统计跟踪：

```typescript
class TweetCapture {
  private signalStats = {
    total: 0,
    highValue: 0,  // score >= 85
    mediumValue: 0, // score 70-84
  };

  // 在接收到新信号时更新统计
  private updateSignalStats(signal: Signal) {
    this.signalStats.total++;

    if (signal.score >= 85) {
      this.signalStats.highValue++;
    } else if (signal.score >= 70) {
      this.signalStats.mediumValue++;
    }

    // 通知侧边栏更新统计
    chrome.runtime.sendMessage({
      type: 'SIGNAL_STATS_UPDATED',
      data: this.signalStats
    });
  }
}
```

#### 4.2 删除的消息类型

```typescript
// 不再需要的消息:
- 'SIGNALS_UPDATED'  // 侧边栏不再展示列表
- 'SWITCH_SIDEBAR_VIEW' with view='list'  // 没有 list 视图了
```

---

## 三、文件变更清单

### 删除的文件
```
src/sidebar/components/SignalCard.tsx
```

### 修改的文件

| 文件 | 变更类型 | 主要变更 |
|------|---------|---------|
| `src/sidebar/App.tsx` | 重大修改 | 删除 signals 状态，删除 'list' 视图，默认显示 'focus' |
| `src/sidebar/components/Header.tsx` | 小修改 | 删除 Home 按钮 |
| `src/sidebar/components/FocusModeView.tsx` | 增强 | 添加信号统计显示 |
| `src/sidebar/components/SettingsView.tsx` | 小修改 | 移除返回列表的逻辑 |
| `src/content/SignalIndicatorManager.ts` | 重大修改 | 创建详细卡片，添加交互功能 |
| `src/content/index.ts` | 中等修改 | 添加统计跟踪和消息发送 |
| `backend/agent.py` | 中等修改 | 恢复详细输出格式，增加 max_tokens |

### 新增的文件
```
src/content/signal-card-styles.css  # 详细卡片样式
```

---

## 四、迁移步骤

### 步骤 1: 备份当前代码
```bash
git checkout -b backup-before-refactor
git add -A
git commit -m "备份: 重构前的代码快照"
git checkout main
```

### 步骤 2: 创建重构分支
```bash
git checkout -b refactor-tweet-centered-architecture
```

### 步骤 3: 按阶段执行重构

**第 1 阶段**: 侧边栏简化
```bash
# 1. 删除 SignalCard.tsx
rm src/sidebar/components/SignalCard.tsx

# 2. 修改 App.tsx, Header.tsx, FocusModeView.tsx
# （使用 Edit 工具进行修改）

# 3. 测试侧边栏是否正常显示（专注模式为默认页）
pnpm build
```

**第 2 阶段**: 推文卡片增强
```bash
# 1. 修改 SignalIndicatorManager.ts
# 2. 创建 signal-card-styles.css
# 3. 在 content/index.ts 中导入新样式

# 4. 测试推文卡片是否正确显示
```

**第 3 阶段**: 后端适配
```bash
# 1. 修改 backend/agent.py
# 2. 重启后端服务
python backend/app.py

# 3. 测试完整流程
```

**第 4 阶段**: 消息流调整
```bash
# 1. 更新 content/index.ts 的统计逻辑
# 2. 清理不再使用的消息类型
# 3. 完整集成测试
```

### 步骤 4: 测试检查清单

- [ ] 侧边栏默认显示专注模式
- [ ] 无 Home 按钮，只有 Settings 和 FocusMode 按钮
- [ ] 推文上的信号卡片显示详细信息
- [ ] 点击"展开详情"可以查看完整解读
- [ ] 双击星标可以添加到白名单
- [ ] 反馈按钮正常工作
- [ ] 专注模式统计数据正确显示
- [ ] 渐进式分析仍然正常工作（20条/批次）

### 步骤 5: 合并到主分支
```bash
git add -A
git commit -m "重构: 推文为中心的架构 - 所有分析显示在推文上"
git checkout main
git merge refactor-tweet-centered-architecture
```

---

## 五、预期效果对比

### 用户体验改善

**Before (当前)**:
1. 看到推文上有小图标 🔥92
2. 点击侧边栏查看详情
3. 在侧边栏中阅读 AI 分析
4. 切换回推文查看原文
5. 重复以上步骤...

**After (重构后)**:
1. 看到推文，下方直接展示详细信号卡片
2. 一眼看到 AI 总结和匹配原因
3. 需要更多信息时点击"展开详情"
4. 直接在推文上完成反馈和白名单操作
5. 无需切换视图！

### 性能改善

| 指标 | Before | After |
|------|--------|-------|
| **侧边栏渲染** | 需要渲染 N 个 SignalCard | 只渲染配置页面（轻量） |
| **DOM 节点数** | 侧边栏 + 推文指示器 | 仅推文卡片 |
| **消息传递** | SIGNALS_UPDATED 携带完整列表 | 无需发送完整列表 |
| **内存占用** | 侧边栏维护 signals 状态 | 仅 content script 维护 |

---

## 六、风险评估与缓解

### 风险 1: 推文卡片占用过多空间

**缓解方案**:
- 默认折叠详情区域
- 用户可通过设置调整卡片显示密度
- 提供"紧凑模式"选项

### 风险 2: 用户习惯改变

**缓解方案**:
- 提供"迁移提示"引导用户
- 保留快捷键支持（如 Shift 临时显示全部）
- 在更新说明中清楚说明变更

### 风险 3: 后端 token 消耗增加

**缓解方案**:
- 仅对 score >= 70 的推文生成详细解读
- 低分推文只返回简单评分
- 可选：用户设置中允许关闭详细解读

---

## 七、后续优化方向

### 优化 1: 信号聚合视图

在专注模式页面添加"今日高光"区域：
```
┌─────────────────────────────────┐
│ 🌟 今日高光                      │
│ ┌─────────────────────────────┐ │
│ │ • [92分] Claude 4.5 发布     │ │
│ │ • [88分] AI Agent 突破       │ │
│ │ • [85分] Web3 新趋势         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
点击后滚动到对应推文

### 优化 2: 信号历史记录

在设置页面添加"历史记录"标签：
- 查看过去 7 天的高价值信号
- 导出为 Markdown/PDF
- 搜索和过滤功能

### 优化 3: 智能推荐

基于用户反馈调整推荐算法：
- 用户标记为"有用"的信号类型 → 权重提升
- 用户标记为"误判"的信号类型 → 权重降低
- 持续学习和优化

---

## 八、总结

本重构方案的核心思想是**"内容在哪，分析就在哪"**，通过将所有信息集中到推文上，大幅简化用户的操作流程，同时让侧边栏专注于配置功能，实现职责分离。

**关键优势**:
✅ 减少用户切换操作
✅ 信息密度更高，效率提升
✅ 架构更清晰，维护更简单
✅ 保留所有核心功能（专注模式、兴趣分析）

**下一步**:
请审核本方案，如果同意，我将按照迁移步骤逐步执行重构。
