import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Heart,
  Search,
  RefreshCw,
  Plus,
  X,
  Tag,
  Check,
  Edit3,
  Save,
  Loader2
} from 'lucide-react';
import { useStore } from '../store';

interface SettingsViewProps {
  onBack: () => void;
}

// 收集阶段类型
type CollectionPhase = 'idle' | 'opening' | 'collecting' | 'analyzing' | 'completed' | 'error';

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const {
    interests,
    recommendedKeywords,
    customKeywords,
    setInterests,
    setRecommendedKeywords,
    setCustomKeywords,
    addCustomKeyword,
    removeCustomKeyword,
    updateInterest,
    setAnalyzingInterests
  } = useStore();

  const [newKeyword, setNewKeyword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [collectionPhase, setCollectionPhase] = useState<CollectionPhase>('idle');
  const [collectionProgress, setCollectionProgress] = useState(0);
  const [collectionTotal, setCollectionTotal] = useState(100);
  const [errorMessage, setErrorMessage] = useState('');

  // 加载已保存的兴趣数据
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(
        ['interests', 'recommendedKeywords', 'customKeywords'],
        (result) => {
          if (result.interests) setInterests(result.interests);
          if (result.recommendedKeywords) setRecommendedKeywords(result.recommendedKeywords);
          if (result.customKeywords) setCustomKeywords(result.customKeywords);
        }
      );
    }
  }, []);

  // 监听收集进度
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const listener = (message: any) => {
        if (message.type === 'LIKES_COLLECTION_PROGRESS') {
          setCollectionProgress(message.data.collected);
          setCollectionTotal(message.data.total);
          setCollectionPhase('collecting');
        } else if (message.type === 'LIKES_COLLECTION_COMPLETE') {
          setCollectionPhase('analyzing');
        } else if (message.type === 'INTERESTS_UPDATED') {
          setCollectionPhase('completed');
          setInterests(message.data.interests);
          setRecommendedKeywords(message.data.recommendedKeywords);
          setAnalyzingInterests(false);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  // 开始收集 Likes 数据
  const handleStartCollection = async () => {
    setCollectionPhase('opening');
    setErrorMessage('');
    setAnalyzingInterests(true);

    try {
      // 获取用户 handle
      const handle = await new Promise<string>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['currentUserHandle'], (result) => {
            resolve(result.currentUserHandle || '');
          });
        } else {
          resolve('');
        }
      });

      // 构建 likes 页面 URL
      const url = handle ? `https://x.com/${handle}/likes` : 'https://x.com/i/likes';

      // 发送消息给 background script，通知开始收集
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'START_LIKES_COLLECTION',
          data: { url }
        }).catch(() => {
          console.error('Failed to send start collection message');
        });
      }

      // 打开新窗口
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        setErrorMessage('无法打开新窗口，请检查浏览器弹窗设置');
        setCollectionPhase('error');
        setAnalyzingInterests(false);
        return;
      }

      // 设置一个超时，如果30秒后还没开始收集，认为失败
      setTimeout(() => {
        if (collectionPhase === 'opening') {
          setCollectionPhase('idle');
          setErrorMessage('收集超时，请重试或检查网络连接');
          setAnalyzingInterests(false);
        }
      }, 30000);

      // 监听窗口关闭
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed);
          if (collectionPhase !== 'completed') {
            setCollectionPhase('idle');
            setErrorMessage('窗口已关闭，请重新开始');
            setAnalyzingInterests(false);
          }
        }
      }, 1000);

    } catch (error) {
      setErrorMessage('启动收集失败：' + (error as Error).message);
      setCollectionPhase('error');
      setAnalyzingInterests(false);
    }
  };

  // 添加自定义关键词
  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !customKeywords.includes(trimmed)) {
      addCustomKeyword(trimmed);
      setNewKeyword('');
      saveToStorage();
    }
  };

  // 切换兴趣启用状态
  const handleToggleInterest = (categoryId: string) => {
    const interest = interests.find(i => i.categoryId === categoryId);
    if (interest) {
      updateInterest(categoryId, { enabled: !interest.enabled });
      saveToStorage();
    }
  };

  // 保存到 Chrome Storage
  const saveToStorage = () => {
    setIsSaving(true);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(
        {
          interests,
          recommendedKeywords,
          customKeywords
        },
        () => {
          setTimeout(() => setIsSaving(false), 500);
        }
      );
    } else {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // 渲染收集进度界面
  const renderCollectionProgress = () => (
    <div className="bg-card-bg border border-border-color rounded-lg p-6 space-y-4">
      {collectionPhase === 'opening' && (
        <>
          <div className="flex items-center justify-center">
            <Loader2 size={32} className="text-accent-color animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-text-primary">正在打开 Likes 页面...</p>
            <p className="text-sm text-text-secondary">请稍候，我们正在准备收集数据</p>
          </div>
        </>
      )}

      {collectionPhase === 'collecting' && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">正在收集 Likes 数据...</span>
              <span className="text-sm text-accent-color">
                {collectionProgress}/{collectionTotal}
              </span>
            </div>
            <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-accent-color transition-all duration-300 ease-out"
                style={{ width: `${(collectionProgress / collectionTotal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-text-tertiary text-center">
              正在读取你的 likes 页面，收集 {collectionTotal} 条推文进行兴趣分析
            </p>
          </div>
        </>
      )}

      {collectionPhase === 'analyzing' && (
        <>
          <div className="flex items-center justify-center">
            <Loader2 size={32} className="text-accent-color animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-text-primary">正在分析你的兴趣...</p>
            <p className="text-sm text-text-secondary">AI 正在分析你的喜好，这可能需要几秒钟</p>
          </div>
        </>
      )}

      {collectionPhase === 'completed' && (
        <>
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check size={32} className="text-green-600" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-text-primary">分析完成！</p>
            <p className="text-sm text-text-secondary">
              已成功识别 {interests.length} 个兴趣领域，向下滚动查看详情
            </p>
          </div>
        </>
      )}

      {collectionPhase === 'error' && (
        <>
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <X size={32} className="text-red-600" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-base font-medium text-text-primary">收集失败</p>
            <p className="text-sm text-text-secondary">{errorMessage}</p>
            <button
              onClick={() => {
                setCollectionPhase('idle');
                setErrorMessage('');
              }}
              className="mt-4 px-4 py-2 bg-accent-color text-white rounded-md text-sm hover:bg-accent-hover transition-colors"
            >
              重新开始
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-color">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 -ml-1 rounded hover:bg-hover-bg text-text-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-semibold text-text-primary">设置</h2>
        </div>
        <button
          onClick={saveToStorage}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent-color hover:bg-accent-color/10 rounded transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* 兴趣分析部分 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent-color">
              <Heart size={18} />
              <h3 className="font-medium">兴趣分析</h3>
            </div>
            {interests.length > 0 && collectionPhase === 'idle' && (
              <button
                onClick={handleStartCollection}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-color transition-colors"
              >
                <RefreshCw size={14} />
                重新分析
              </button>
            )}
          </div>

          {/* 收集进度界面 */}
          {(collectionPhase !== 'idle' && collectionPhase !== 'error') && (
            renderCollectionProgress()
          )}

          {/* 错误界面 */}
          {collectionPhase === 'error' && renderCollectionProgress()}

          {collectionPhase === 'idle' && interests.length === 0 ? (
            // 未分析状态
            <div className="bg-card-bg border border-border-color rounded-lg p-4 space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                TSF 可以通过分析你最近喜欢的推文，自动提取你的兴趣关键词，从而更精准地发现高价值信号。
              </p>

              <div className="text-xs text-text-tertiary bg-bg-secondary p-3 rounded space-y-2">
                <p className="font-medium">分析流程：</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>打开你的 Likes 页面（新窗口）</li>
                  <li>自动收集最多 100 条推文</li>
                  <li>使用 AI 分析你的兴趣偏好</li>
                  <li>展示分析结果</li>
                </ol>
              </div>

              <button
                onClick={handleStartCollection}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent-color text-white rounded-md font-medium hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Search size={16} />
                开始分析我的兴趣
              </button>

              <p className="text-xs text-center text-text-tertiary">
                点击按钮将在新窗口打开 Likes 页面，整个过程自动进行
              </p>
            </div>
          ) : collectionPhase === 'idle' || collectionPhase === 'completed' ? (
            // 已分析状态 - 显示兴趣列表
            <div className="space-y-3">
              {collectionPhase === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      <p className="text-sm font-medium text-green-700">
                        分析完成！发现 {interests.length} 个兴趣领域
                      </p>
                    </div>
                    <button
                      onClick={onBack}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      查看信号
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-card-bg border border-border-color rounded-lg p-4">
                <div className="space-y-3">
                  {interests.map((interest) => (
                    <div
                      key={interest.categoryId}
                      className="flex items-start justify-between p-3 bg-bg-secondary rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-text-primary">{interest.label}</h4>
                          <span className="text-xs px-2 py-0.5 bg-accent-color/10 text-accent-color rounded">
                            {Math.round(interest.weight * 100)}%
                          </span>
                        </div>
                        {interest.keywords && interest.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {interest.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-border-color text-text-secondary rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleInterest(interest.categoryId)}
                        className={`ml-3 p-1.5 rounded transition-colors ${
                          interest.enabled
                            ? 'bg-accent-color/20 text-accent-color'
                            : 'bg-bg-tertiary text-text-tertiary'
                        }`}
                      >
                        {interest.enabled ? <Check size={16} /> : <Edit3 size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* 关键词管理部分 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-accent-color">
            <Tag size={18} />
            <h3 className="font-medium">关键词管理</h3>
          </div>

          <div className="bg-card-bg border border-border-color rounded-lg p-4 space-y-4">
            {/* 推荐关键词 */}
            {recommendedKeywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-secondary">AI 推荐关键词</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendedKeywords.map((keyword, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!customKeywords.includes(keyword)) {
                          addCustomKeyword(keyword);
                          saveToStorage();
                        }
                      }}
                      className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                        customKeywords.includes(keyword)
                          ? 'bg-accent-color text-white'
                          : 'bg-bg-secondary text-text-secondary hover:bg-accent-color/10'
                      }`}
                    >
                      {keyword}
                      {customKeywords.includes(keyword) && <Check size={14} className="inline ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 自定义关键词 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-secondary">我的关键词</h4>

              {/* 添加关键词输入框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="输入关键词..."
                  className="flex-1 px-3 py-2 text-sm bg-bg-secondary border border-border-color rounded focus:outline-none focus:ring-2 focus:ring-accent-color/50"
                />
                <button
                  onClick={handleAddKeyword}
                  className="p-2 bg-accent-color text-white rounded hover:bg-accent-hover transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* 已添加的关键词 */}
              {customKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customKeywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-sm px-3 py-1.5 bg-accent-color/10 text-accent-color rounded-full"
                    >
                      {keyword}
                      <button
                        onClick={() => {
                          removeCustomKeyword(keyword);
                          saveToStorage();
                        }}
                        className="hover:bg-accent-color/20 rounded p-0.5 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary text-center py-4">
                  暂无自定义关键词，从上方推荐关键词中添加或自行输入
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
