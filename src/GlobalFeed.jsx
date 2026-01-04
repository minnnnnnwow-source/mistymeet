import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function GlobalFeed({ onFlyTo }) {
  const [feeds, setFeeds] = useState([]);
  const [isOpen, setIsOpen] = useState(false); // 默认收起

  // 获取全网最新留言
  useEffect(() => {
    if (isOpen) {
      fetchGlobalFeeds();
    }
  }, [isOpen]);

  const fetchGlobalFeeds = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10); // 只看最新的10条
    if (data) setFeeds(data);
  };

  return (
    <>
      {/* 🌍 悬浮按钮 (放在右上角) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-[1000] bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full shadow-lg hover:bg-white/20 transition-all"
      >
        🌍
      </button>

      {/* 列表弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-64 h-full bg-gray-900 border-l border-gray-800 p-4 shadow-2xl animate-slide-left flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-bold text-lg">世界回声</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {feeds.map(msg => (
                <div 
                  key={msg.id} 
                  onClick={() => {
                    onFlyTo(msg.grid_id); // 点击飞去那里
                    setIsOpen(false);     // 关闭列表
                  }}
                  className="bg-gray-800 p-3 rounded-lg border border-gray-700 cursor-pointer hover:border-green-500 hover:bg-gray-750 transition-all"
                >
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{msg.nickname}</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-gray-200 text-sm line-clamp-2">"{msg.content}"</p>
                  <div className="mt-2 text-right">
                    <span className="text-xs text-green-500 font-bold">🚀 飞去看看</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}