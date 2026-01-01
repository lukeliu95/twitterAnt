import { useState, useEffect, useCallback } from 'react';
import { ConfigPage } from './config/ConfigPage';
import './App.css';

// Types
interface Signal {
  id: string;
  type: 'viral' | 'insightful' | 'data_driven' | 'industry_news' | 'controversial' | 'demand' | 'revenue' | 'skill' | 'trend';
  score: number;
  summary: string;
  description: string;
  timestamp: number;
  saved?: boolean;
  reason?: string;
  actionPlan?: string[];
  matchedSkills?: string[];
  competition?: string;
  userNotes?: string;
  originalTweet?: {
    url: string;
    text: string;
    author?: {
      username: string;
      displayName: string;
    };
  };
}

// 信号类型中文映射 - 热门议题版
const SIGNAL_TYPE_LABELS: Record<string, string> = {
  // 新版 - 热门议题
  viral: '🔥 爆发话题',
  insightful: '💡 深度讨论',
  data_driven: '📊 数据观点',
  industry_news: '🎯 行业动态',
  controversial: '⚡ 争议议题',

  // 旧版 - 向后兼容
  demand: '💰 需求',
  revenue: '📈 收入',
  skill: '🎯 技能',
  trend: '🔥 趋势',
};

// Mock Data for Dev/Fallback
const MOCK_SIGNALS: Signal[] = [
  {
    id: '1',
    type: 'demand',
    score: 5,
    summary: 'AI 视频编辑工具需求旺盛',
    description: '多位用户询问可与 Premiere Pro 兼容的自动化视频编辑工具。',
    timestamp: Date.now() - 1000 * 60 * 5,
    saved: false
  },
  {
    id: '2',
    type: 'revenue',
    score: 4,
    summary: 'SaaS 收入里程碑分享',
    description: '创始人分享了生产力领域微 SaaS 的月收入 5000 美元的指标。',
    timestamp: Date.now() - 1000 * 60 * 30,
    saved: true
  },
  {
    id: '3',
    type: 'trend',
    score: 3,
    summary: '本地 LLM 兴趣上升',
    description: '你的时间线上关于本地运行 Llama 3 的讨论量增加了 40%。',
    timestamp: Date.now() - 1000 * 60 * 60,
    saved: false
  }
];

function App() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'all' | 'saved'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const loadSignals = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_SIGNALS',
          data: { savedOnly: view === 'saved' }
        });

        if (response && response.signals) {
          setSignals(response.signals);
          setIsLive(true);
        } else {
          console.warn('No signals from background, using mock for demo');
          setSignals(MOCK_SIGNALS);
        }
      } else {
        // Dev environment
        setTimeout(() => {
          setSignals(MOCK_SIGNALS.filter(s => view === 'all' || s.saved));
          setIsLive(true);
        }, 800);
      }
    } catch (error) {
      console.error('Failed to load signals:', error);
      setSignals(MOCK_SIGNALS); // Fallback
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    loadSignals();

    // Auto refresh every 30s
    const interval = setInterval(loadSignals, 30000);
    return () => clearInterval(interval);
  }, [loadSignals]);

  const handleToggleSave = async (id: string) => {
    // Optimistic update
    setSignals(prev => prev.map(s =>
      s.id === id ? { ...s, saved: !s.saved } : s
    ));

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        await chrome.runtime.sendMessage({
          type: 'TOGGLE_BOOKMARK',
          data: { signalId: id }
        });
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个信号吗？')) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        await chrome.runtime.sendMessage({
          type: 'DELETE_SIGNAL',
          data: { signalId: id }
        });
        // Remove from local state
        setSignals(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete signal:', error);
      alert('删除失败，请重试');
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        await chrome.runtime.sendMessage({
          type: 'UPDATE_NOTES',
          data: { signalId: id, notes }
        });
        // Update local state
        setSignals(prev => prev.map(s =>
          s.id === id ? { ...s, userNotes: notes } : s
        ));
      }
    } catch (error) {
      console.error('Failed to update notes:', error);
      alert('保存备注失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个信号吗？`)) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const ids = Array.from(selectedIds);
        await chrome.runtime.sendMessage({
          type: 'BATCH_DELETE_SIGNALS',
          data: { ids }
        });
        // Remove from local state
        setSignals(prev => prev.filter(s => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
        setBatchMode(false);
      }
    } catch (error) {
      console.error('Failed to batch delete:', error);
      alert('批量删除失败，请重试');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === signals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(signals.map(s => s.id)));
    }
  };

  const displayedSignals = signals;

  return (
    <>
      {showConfig ? (
        <ConfigPage onClose={() => setShowConfig(false)} />
      ) : (
        <div className="app-container">
          <header className="header">
            <div className="header-title">
              <span>🔥 趋势信号 (TSF)</span>
              <span className="version">v0.2.0 免费版</span>
            </div>
            <div className="header-actions">
              <button
                className="settings-btn"
                onClick={() => setShowConfig(true)}
                title="设置"
              >
                ⚙️
              </button>
              <div className="status-indicator">
                <span>{isLive ? '在线' : '离线'}</span>
                <div className={`status-dot ${isLive ? 'active' : ''}`} />
              </div>
            </div>
          </header>

      <div className="filter-bar">
        <button
          className={`filter-btn ${view === 'all' ? 'active' : ''}`}
          onClick={() => setView('all')}
        >
          全部
        </button>
        <button
          className={`filter-btn ${view === 'saved' ? 'active' : ''}`}
          onClick={() => setView('saved')}
        >
          已收藏
        </button>
        <button
          className={`filter-btn ${batchMode ? 'active' : ''}`}
          onClick={() => {
            setBatchMode(!batchMode);
            setSelectedIds(new Set());
          }}
        >
          {batchMode ? '取消批量' : '批量操作'}
        </button>
        {batchMode && selectedIds.size > 0 && (
          <button className="filter-btn delete-btn" onClick={handleBatchDelete}>
            删除选中 ({selectedIds.size})
          </button>
        )}
      </div>

      <main className="content">
        {loading && signals.length === 0 ? (
          <div className="loading-state">加载信号中...</div>
        ) : displayedSignals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <p className="empty-text">
              {view === 'saved' ? '还没有收藏的信号' : '等待信号中...'}
            </p>
          </div>
        ) : (
          <>
            {batchMode && (
              <div className="batch-actions">
                <label className="select-all">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === signals.length}
                    onChange={toggleSelectAll}
                  />
                  <span>全选 ({selectedIds.size}/{signals.length})</span>
                </label>
              </div>
            )}
            {displayedSignals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onToggleSave={() => handleToggleSave(signal.id)}
                onDelete={() => handleDelete(signal.id)}
                onUpdateNotes={(notes) => handleUpdateNotes(signal.id, notes)}
                batchMode={batchMode}
                selected={selectedIds.has(signal.id)}
                onSelect={() => toggleSelect(signal.id)}
              />
            ))}
          </>
        )}
      </main>
    </div>
      )}
    </>
  );
}

function SignalCard({
  signal,
  onToggleSave,
  onDelete,
  onUpdateNotes,
  batchMode,
  selected,
  onSelect
}: {
  signal: Signal;
  onToggleSave: () => void;
  onDelete: () => void;
  onUpdateNotes: (notes: string) => void;
  batchMode: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(signal.userNotes || '');

  const handleSaveNotes = () => {
    onUpdateNotes(notes);
    setEditingNotes(false);
  };

  return (
    <div className={`signal-card ${selected ? 'selected' : ''}`}>
      <div className="card-header">
        <div className="card-header-left">
          {batchMode && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="batch-checkbox"
            />
          )}
          <span className="card-type">{SIGNAL_TYPE_LABELS[signal.type] || signal.type}</span>
          {signal.saved && <span className="saved-badge">🔥 已收藏</span>}
        </div>
        <div className="card-actions">
          <span className="card-score">{signal.score}/5</span>
          <button
            className={`icon-btn ${signal.saved ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
            title={signal.saved ? "取消收藏" : "收藏"}
          >
            {signal.saved ? '★' : '☆'}
          </button>
          <button
            className="icon-btn delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="card-body" onClick={() => !batchMode && setExpanded(!expanded)} style={{ cursor: batchMode ? 'default' : 'pointer' }}>
        <h3 className="card-summary">{signal.summary}</h3>
        <p className="card-description">{signal.description}</p>

        {expanded && (
          <div className="card-details">
            {signal.reason && <p><strong>推荐理由：</strong> {signal.reason}</p>}
            {signal.matchedSkills && signal.matchedSkills.length > 0 && (
              <p><strong>匹配技能：</strong> {signal.matchedSkills.join(', ')}</p>
            )}
            {signal.competition && <p><strong>竞争分析：</strong> {signal.competition}</p>}
            {signal.actionPlan && signal.actionPlan.length > 0 && (
              <div>
                <strong>行动计划：</strong>
                <ul>
                  {signal.actionPlan.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
            {signal.originalTweet?.url && (
              <a
                href={signal.originalTweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="tweet-link"
                onClick={e => e.stopPropagation()}
              >
                查看原推文 →
              </a>
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        <button className="btn btn-ghost" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : '展开'}
        </button>
        {editingNotes ? (
          <div className="notes-edit">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加备注..."
              onClick={e => e.stopPropagation()}
              className="notes-textarea"
            />
            <button className="btn btn-primary" onClick={handleSaveNotes}>
              保存
            </button>
            <button className="btn btn-ghost" onClick={() => {
              setEditingNotes(false);
              setNotes(signal.userNotes || '');
            }}>
              取消
            </button>
          </div>
        ) : (
          <>
            {signal.userNotes && (
              <span className="notes-preview" title={signal.userNotes}>
                📝 {signal.userNotes.length > 20 ? signal.userNotes.slice(0, 20) + '...' : signal.userNotes}
              </span>
            )}
            <button className="btn btn-ghost" onClick={(e) => {
              e.stopPropagation();
              setEditingNotes(true);
            }}>
              {signal.userNotes ? '编辑备注' : '添加备注'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
