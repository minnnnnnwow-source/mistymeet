import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function MessageModal({ gridId, onClose, canReply }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gridId) return;
    fetchMessages();
  }, [gridId]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('grid_id', gridId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error) setMessages(data || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    // 1. 获取昵称，没有则随机
    let currentName = localStorage.getItem('misty_nickname');
    if (!currentName) {
      currentName = '旅行者' + Math.floor(Math.random() * 1000);
      localStorage.setItem('misty_nickname', currentName);
    }

    // 2. 获取头像 (默认宇航员)
    const currentAvatar = localStorage.getItem('misty_avatar') || '👨‍🚀';
    
    // 3. 组合成显示名称： "👨‍🚀 你的名字"
    const displayName = `${currentAvatar} ${currentName}`;

    const userId = localStorage.getItem('misty_user_id');

    // 4. 发送数据
    const { error } = await supabase.from('messages').insert({
      grid_id: gridId,
      user_id: userId,
      nickname: displayName, // 发送组合好的名字
      content: inputText
    });

    if (error) {
      alert("发送失败: " + error.message);
    } else {
      setInputText('');
      fetchMessages(); // 刷新列表
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-t-2xl p-4 h-[65vh] flex flex-col shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部把手 */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
        
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-800">
            {canReply ? "📍 现场留言板" : "🔭 远程观测模式"}
          </h2>
          <span className="text-xs text-gray-400 font-mono">{gridId}</span>
        </div>

        {/* 留言列表 */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-2 bg-gray-50 rounded-lg">
          {loading ? (
            <p className="text-center text-gray-400 text-sm mt-4">信号接收中...</p>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <p>这里静悄悄的...</p>
              {canReply && <p className="text-sm">做第一个留下声音的人吧</p>}
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-baseline mb-1">
                  {/* 这里显示带头像的昵称 */}
                  <span className="font-bold text-sm text-green-700">{msg.nickname}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{msg.content}</p>
              </div>
            ))
          )}
        </div>

        {/* 输入框区域：只有 canReply 为 true 才显示 */}
        {canReply ? (
          <div className="flex gap-2 border-t pt-3">
            <input
              type="text"
              className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 text-gray-900"
              placeholder="留下你的痕迹..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform"
            >
              发送
            </button>
          </div>
        ) : (
          <div className="border-t pt-3 text-center">
            <p className="text-gray-500 text-sm bg-gray-100 py-2 rounded-full">
              🔒 必须抵达该区域才能回复留言
            </p>
          </div>
        )}
      </div>
    </div>
  );
}