import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';

// 引入所有子组件
import GlobalFeed from './GlobalFeed';
import MessageModal from './MessageModal';
import ProfileModal from './ProfileModal'; // 👈 确保你建了这个文件

// --- 1. 工具函数 ---
const GRID_SIZE = 0.0005; 
const getGridId = (lat, lng) => {
  const latGrid = Math.floor(lat / GRID_SIZE);
  const lngGrid = Math.floor(lng / GRID_SIZE);
  return `${latGrid}_${lngGrid}`;
};

const getGridBounds = (gridId) => {
  const [latGrid, lngGrid] = gridId.split('_').map(Number);
  return [
    [latGrid * GRID_SIZE, lngGrid * GRID_SIZE],
    [(latGrid + 1) * GRID_SIZE, (lngGrid + 1) * GRID_SIZE]
  ];
};

// --- 2. 地图控制组件 ---
function LocationMarker({ setMyGrids }) {
  const map = useMap();
  useEffect(() => {
    let userId = localStorage.getItem('misty_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('misty_user_id', userId);
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const gridId = getGridId(latitude, longitude);

        // 初次加载时不强制飞，只有位置变化大时才飞，或者让 RecenterButton 来负责居中
        // 这里我们为了体验，只在第一次定位时飞
        // map.panTo([latitude, longitude]); 

        const visitedKey = `visited_${gridId}`;
        if (!localStorage.getItem(visitedKey)) {
          localStorage.setItem(visitedKey, 'true');
          setMyGrids(prev => ({ ...prev, [gridId]: true }));
          await supabase.from('visits').insert({ user_id: userId, grid_id: gridId });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, setMyGrids]);
  return null;
}

function MapController({ targetGrid }) {
  const map = useMap();
  useEffect(() => {
    if (targetGrid) {
      const bounds = getGridBounds(targetGrid);
      const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
      const centerLng = (bounds[0][1] + bounds[1][1]) / 2;
      map.flyTo([centerLat, centerLng], 18, { duration: 2 });
    }
  }, [targetGrid, map]);
  return null;
}

function RecenterButton() {
  const map = useMap();
  const handleRecenter = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 16, { duration: 1.5 });
      },
      (err) => alert("无法获取位置"),
      { enableHighAccuracy: true }
    );
  };
  return (
    <button
      onClick={handleRecenter}
      className="absolute bottom-28 right-4 z-[900] bg-white text-gray-700 w-12 h-12 rounded-full shadow-xl flex items-center justify-center border border-gray-100 active:scale-90 transition-transform hover:text-green-600"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5 mt-0.5">
        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
      </svg>
    </button>
  );
}

// --- 3. 主程序 ---
export default function App() {
  const [myGrids, setMyGrids] = useState({});
  const [activeGrid, setActiveGrid] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  
  // 用户状态
  const [currentUser, setCurrentUser] = useState({
    nickname: localStorage.getItem('misty_nickname') || '',
    avatar: localStorage.getItem('misty_avatar') || '👨‍🚀'
  });

  // 初始化加载本地足迹
  useEffect(() => {
    const loadedGrids = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('visited_')) {
        loadedGrids[key.replace('visited_', '')] = true;
      }
    }
    setMyGrids(loadedGrids);
  }, []);

  const handleGlobalFly = (gridId) => {
    setFlyTarget(gridId);
    setTimeout(() => {
      setActiveGrid(gridId);
    }, 2000);
  };

  return (
    <div className="relative w-full h-screen font-sans bg-gray-900">
      
      {/* 1. 顶部标题栏 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, zIndex: 1000, width: '100%',
        paddingTop: '40px', paddingBottom: '20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)',
        color: 'white', textAlign: 'center', pointerEvents: 'none'
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', letterSpacing: '1px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          MistyMeet 🗺️
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8, fontWeight: '500' }}>
          已探索: <span style={{color: '#34d399', fontWeight: 'bold'}}>{Object.keys(myGrids).length}</span> 个街区
        </p>
      </div>

      {/* 2. 左上角头像按钮 */}
      <button 
        onClick={() => setShowProfile(true)}
        className="absolute top-4 left-4 z-[1000] w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-white/20 transition-all active:scale-90"
      >
        {currentUser.avatar}
      </button>

      {/* 3. 右上角世界回声组件 */}
      <GlobalFeed onFlyTo={handleGlobalFly} />

      {/* 4. 地图容器 */}
      <MapContainer 
        center={[39.9, 116.4]} 
        zoom={15} 
        scrollWheelZoom={true} 
        zoomControl={false} 
        style={{ height: '100vh', width: '100%', background: '#0a0a0a' }}
      >
        <ZoomControl position="bottomright" />
        <RecenterButton />
        
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        
        {/* 渲染我去过的格子 */}
        {Object.keys(myGrids).map(gridId => (
          <Rectangle
            key={gridId}
            bounds={getGridBounds(gridId)}
            pathOptions={{ color: '#10b981', weight: 0, fillOpacity: 0.5 }} 
            eventHandlers={{ click: () => setActiveGrid(gridId) }}
          />
        ))}

        {/* 渲染飞行的目标格子(黄色) */}
        {flyTarget && !myGrids[flyTarget] && (
           <Rectangle
             bounds={getGridBounds(flyTarget)}
             pathOptions={{ color: '#f59e0b', weight: 1, fillOpacity: 0.3 }}
           />
        )}

        <LocationMarker setMyGrids={setMyGrids} />
        <MapController targetGrid={flyTarget} />
      </MapContainer>

      {/* 5. 弹窗们 */}
      {activeGrid && (
        <MessageModal 
          gridId={activeGrid} 
          onClose={() => setActiveGrid(null)}
          canReply={!!myGrids[activeGrid]} 
        />
      )}

      {showProfile && (
        <ProfileModal 
          onClose={() => setShowProfile(false)} 
          onUpdate={(newData) => setCurrentUser(newData)} 
        />
      )}
    </div>
  );
}