import React, { useState, useEffect } from 'react';

// 预设一些酷酷的 Emoji 头像
const AVATARS = ['👨‍🚀', '🦊', '👽', '🤖', '👻', '🦁', '🦉', '🦄', '🧢', '🕶️'];

export default function ProfileModal({ onClose, onUpdate }) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('👨‍🚀');

  useEffect(() => {
    // 初始化：从本地读取
    const savedName = localStorage.getItem('misty_nickname') || '';
    const savedAvatar = localStorage.getItem('misty_avatar') || '👨‍🚀';
    setNickname(savedName);
    setAvatar(savedAvatar);
  }, []);

  const handleSave = () => {
    if (!nickname.trim()) {
      alert("起个好听的名字吧！");
      return;
    }
    // 保存到本地
    localStorage.setItem('misty_nickname', nickname);
    localStorage.setItem('misty_avatar', avatar);
    
    // 通知父组件更新
    onUpdate({ nickname, avatar });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-80 bg-white rounded-2xl p-6 shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center text-gray-800 mb-6">我的身份卡</h2>

        {/* 头像选择区 */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">选择头像</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {AVATARS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                className={`text-2xl w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  avatar === emoji ? 'bg-green-100 border-2 border-green-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* 昵称输入区 */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">代号 / 昵称</p>
          <input
            type="text"
            maxLength={10}
            className="w-full border-b-2 border-gray-200 py-2 text-lg text-center focus:outline-none focus:border-green-500 bg-transparent"
            placeholder="例如：银河漫游者"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="w-full bg-black text-white py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          保存身份
        </button>
      </div>
    </div>
  );
}