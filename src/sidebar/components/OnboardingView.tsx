import React, { useState, useEffect } from 'react';
import { Chrome } from 'lucide-react';

interface OnboardingViewProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface CollectionProgress {
  phase: 'idle' | 'opening' | 'collecting' | 'analyzing' | 'completed' | 'error';
  collected: number;
  target: number;
  message: string;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<CollectionProgress>({
    phase: 'idle',
    collected: 0,
    target: 100,
    message: ''
  });

  useEffect(() => {
    // 监听收集进度
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const listener = (message: any) => {
        if (message.type === 'LIKES_COLLECTION_PROGRESS') {
          setProgress(message.data);
          setStep(2); // 进入收集步骤
        } else if (message.type === 'INTERESTS_UPDATED') {
          // 分析完成，进入完成步骤
          setStep(4);
          setIsProcessing(false);
          setProgress({
            phase: 'completed',
            collected: progress.collected,
            target: progress.target,
            message: '配置完成！'
          });
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  const handleStart = async () => {
    setIsProcessing(true);

    // Step 2: 开始收集 likes
    setStep(2);
    setProgress({
      phase: 'opening',
      collected: 0,
      target: 100,
      message: '正在打开 Likes 页面...'
    });

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
        setProgress({
          phase: 'error',
          collected: 0,
          target: 100,
          message: '无法打开新窗口，请检查浏览器弹窗设置'
        });
        setIsProcessing(false);
        return;
      }

      // 更新状态为正在收集
      setProgress({
        phase: 'collecting',
        collected: 0,
        target: 100,
        message: '正在收集你的点赞记录...'
      });

      // 设置超时检查
      setTimeout(() => {
        chrome.storage.local.get(['likesCollected'], (result) => {
          if (!result.likesCollected && progress.phase === 'collecting') {
            setProgress({
              phase: 'error',
              collected: progress.collected,
              target: 100,
              message: '收集超时，请重试或检查网络连接'
            });
            setIsProcessing(false);
          }
        });
      }, 120000); // 120秒超时

      // 监听窗口关闭
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed);
          chrome.storage.local.get(['likesCollected'], (result) => {
            if (!result.likesCollected && step < 4) {
              setProgress({
                phase: 'error',
                collected: progress.collected,
                target: 100,
                message: '窗口已关闭，请重新开始'
              });
              setIsProcessing(false);
            }
          });
        }
      }, 1000);

    } catch (error) {
      setProgress({
        phase: 'error',
        collected: 0,
        target: 100,
        message: '启动收集失败：' + (error as Error).message
      });
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    // 标记已完成引导
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ tsfOnboarded: true });
    }
    onComplete();
  };

  return (
    <div className="onboarding-view">
      {step === 1 && (
        <div className="onboarding-step">
          <div className="onboarding-icon">
            <Chrome size={64} />
          </div>
          <h2 className="onboarding-title">欢迎使用 Twitter Ant</h2>
          <p className="onboarding-description">
            让 AI 帮你从海量信息中筛选真正有价值的内容
          </p>

          <div className="onboarding-features">
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <div className="feature-content">
                <strong>智能筛选</strong>
                <p>基于你的兴趣自动识别高价值内容</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔥</span>
              <div className="feature-content">
                <strong>专注模式</strong>
                <p>视觉弱化低价值内容，提升浏览效率</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div className="feature-content">
                <strong>一键配置</strong>
                <p>分析你的点赞记录，自动学习兴趣偏好</p>
              </div>
            </div>
          </div>

          <div className="onboarding-actions">
            <button
              className="btn-primary"
              onClick={handleStart}
              disabled={isProcessing}
            >
              {isProcessing ? '准备中...' : '开始配置'}
            </button>
            <button className="btn-secondary" onClick={onSkip}>
              稍后再说
            </button>
          </div>

          <p className="onboarding-footer">
            只需 1-2 分钟，即可完成所有配置
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-step">
          <div className="progress-icon">
            {progress.phase === 'opening' ? (
              <div className="spinner"></div>
            ) : progress.phase === 'collecting' ? (
              <div className="spinner"></div>
            ) : progress.phase === 'analyzing' ? (
              <div className="spinner"></div>
            ) : progress.phase === 'error' ? (
              <span className="error-icon">⚠️</span>
            ) : (
              <div className="spinner"></div>
            )}
          </div>
          <h2 className="onboarding-title">
            {progress.phase === 'opening' && '正在打开 Likes 页面'}
            {progress.phase === 'collecting' && '正在收集点赞记录'}
            {progress.phase === 'analyzing' && '正在分析兴趣'}
            {progress.phase === 'error' && '出错了'}
          </h2>
          <p className="onboarding-description">{progress.message}</p>

          {progress.phase === 'collecting' && (
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min((progress.collected / progress.target) * 100, 100)}%`
                  }}
                ></div>
              </div>
              <span className="progress-text">
                {progress.collected}/{progress.target}
              </span>
            </div>
          )}

          {progress.phase === 'analyzing' && (
            <div className="analyzing-animation">
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
            </div>
          )}

          {progress.phase === 'error' && (
            <button className="btn-primary" onClick={handleStart}>
              重试
            </button>
          )}

          {progress.phase === 'collecting' && (
            <p className="onboarding-tip">
              💡 新窗口正在自动滚动并收集你的点赞记录
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="onboarding-step">
          <div className="progress-icon">
            <div className="spinner"></div>
          </div>
          <h2 className="onboarding-title">正在分析兴趣</h2>
          <p className="onboarding-description">
            AI 正在学习你的兴趣偏好...
          </p>
          <div className="analyzing-animation">
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="onboarding-step">
          <div className="success-icon">✓</div>
          <h2 className="onboarding-title">配置完成！</h2>
          <p className="onboarding-description">
            已为你识别兴趣方向并配置推荐系统
          </p>

          <div className="completion-stats">
            <div className="stat-item">
              <strong>{progress.collected}</strong>
              <span>条点赞已分析</span>
            </div>
            <div className="stat-item">
              <strong>3-5</strong>
              <span>个兴趣方向</span>
            </div>
          </div>

          <div className="onboarding-actions">
            <button className="btn-primary" onClick={handleComplete}>
              开始浏览
            </button>
          </div>

          <p className="onboarding-footer">
            之后可以在设置中调整所有配置
          </p>
        </div>
      )}
    </div>
  );
};
