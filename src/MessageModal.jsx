import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function MessageModal({ gridId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [nickname, setNickname] = useState(localStorage.getItem('misty_nickname') || '');
  const [loading, setLoading] = useState(true);

  // 加载留言
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
      .order('created_at', { ascending: false }) // 最新的在上面
      .limit(20);
    
    if (!error) setMessages(data || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    // 如果没有昵称，随机生成一个
    let currentName = nickname;
    if (!currentName) {
      currentName = '旅行者' + Math.floor(Math.random() * 1000);
      localStorage.setItem('misty_nickname', currentName);
      setNickname(currentName);
    }

    const userId = localStorage.getItem('misty_user_id');

    // 1. 发送给 Supabase
    const { error } = await supabase.from('messages').insert({
      grid_id: gridId,
      user_id: userId,
      nickname: currentName,
      content: inputText
    });

    if (!error) {
      setInputText('');
      fetchMessages(); // 刷新列表
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-t-2xl p-4 h-[60vh] flex flex-col shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()} // 防止点击内部关闭
      >
        {/* 顶部把手 */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
        
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-800">📍 时空留言板</h2>
          <span className="text-xs text-gray-400 font-mono">{gridId}</span>
        </div>

        {/* 留言列表区域 */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-2 bg-gray-50 rounded-lg">
          {loading ? (
            <p className="text-center text-gray-400 text-sm mt-4">加载电波中...</p>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <p>这里静悄悄的...</p>
              <p className="text-sm">做第一个留下声音的人吧</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-baseline mb-1">
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

        {/* 输入区域 */}
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
      </div>
    </div>
  );
}