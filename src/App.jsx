import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup, useMap, ZoomControl } from 'react-leaflet';
import GlobalFeed from './GlobalFeed';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';
import MessageModal from './MessageModal'; 



// --- 工具函数：生成唯一的格子ID ---
const GRID_SIZE = 0.0005; // 约50-60米精度
const getGridId = (lat, lng) => {
  const latGrid = Math.floor(lat / GRID_SIZE);
  const lngGrid = Math.floor(lng / GRID_SIZE);
  return `${latGrid}_${lngGrid}`;
};

// --- 工具函数：把格子ID转回地图坐标矩形 ---
const getGridBounds = (gridId) => {
  const [latGrid, lngGrid] = gridId.split('_').map(Number);
  return [
    [latGrid * GRID_SIZE, lngGrid * GRID_SIZE],
    [(latGrid + 1) * GRID_SIZE, (lngGrid + 1) * GRID_SIZE]
  ];
};

// --- 组件：自动定位并更新视图 ---
function LocationMarker({ setMyGrids }) {
  const map = useMap();

  useEffect(() => {
    // 生成一个临时的用户ID (存在浏览器里)
    let userId = localStorage.getItem('misty_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('misty_user_id', userId);
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const gridId = getGridId(latitude, longitude);

        // 地图飞到当前位置
        map.panTo([latitude, longitude]);

        // 如果是新格子，记录下来
        const visitedKey = `visited_${gridId}`;
        if (!localStorage.getItem(visitedKey)) {
          console.log("解锁新区域:", gridId);
          
          // 1. 本地标记
          localStorage.setItem(visitedKey, 'true');
          setMyGrids(prev => ({ ...prev, [gridId]: true })); // 立即变色

          // 2. 上传数据库
          await supabase.from('visits').insert({
            user_id: userId,
            grid_id: gridId
          });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, setMyGrids]);

  return null;
}

  // --- 组件：控制地图飞行 ---
function MapController({ targetGrid }) {
  const map = useMap();
  
  useEffect(() => {
    if (targetGrid) {
      const bounds = getGridBounds(targetGrid);
      // 计算中心点
      const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
      const centerLng = (bounds[0][1] + bounds[1][1]) / 2;
      
      // 飞过去！
      map.flyTo([centerLat, centerLng], 18, {
        duration: 2 // 飞行时间2秒，很有电影感
      });
    }
  }, [targetGrid, map]);

  return null;
}

// --- 组件：回到当前位置按钮 ---
function RecenterButton() {
  const map = useMap();

  const handleRecenter = () => {
    // 获取当前浏览器定位
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // 飞回去！
        map.flyTo([latitude, longitude], 16, {
          duration: 1.5 // 飞行时间 1.5秒
        });
      },
      (err) => alert("无法获取位置，请检查GPS权限"),
      { enableHighAccuracy: true }
    );
  };

  return (
    <button
      onClick={handleRecenter}
      className="leaflet-bar leaflet-control" // 利用Leaflet自带的类名保证层级正确
      style={{
        position: 'absolute',
        bottom: '80px', // 放在缩放按钮上面 (Leaflet默认缩放按钮在右下角)
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'white',
        width: '34px',
        height: '34px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 5px rgba(0,0,0,0.65)',
        border: 'none'
      }}
      title="回到我的位置"
    >
      {/* 靶心图标 SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    </button>
  );
}


// --- 主程序 ---
export default function App() {
  const [myGrids, setMyGrids] = useState({});
  const [activeGrid, setActiveGrid] = useState(null);
  
  // 新增状态：控制地图飞行的目标
  const [flyTarget, setFlyTarget] = useState(null); 

  // ... (useEffect 加载本地数据的代码保持不变) ...

  const handleGridClick = (gridId) => {
    setActiveGrid(gridId);
  };

  // 处理从"世界回声"点击飞行的事件
  const handleGlobalFly = (gridId) => {
    setFlyTarget(gridId); // 触发飞行
    setTimeout(() => {
      setActiveGrid(gridId); // 飞行开始后，自动打开留言板（只读模式）
    }, 2000); // 2秒后（等飞到了）再打开
  };

  return (
    <div className="relative w-full h-screen font-sans">
      {/* 顶部标题栏代码保持不变... */}
      
      {/* 👇 插入新组件：世界回声 */}
      <GlobalFeed onFlyTo={handleGlobalFly} />

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
        
        {/* 渲染绿色格子...保持不变... */}
        {Object.keys(myGrids).map(gridId => (
          <Rectangle
            key={gridId}
            bounds={getGridBounds(gridId)}
            pathOptions={{ color: '#10b981', weight: 0, fillOpacity: 0.5 }} 
            eventHandlers={{ click: () => handleGridClick(gridId) }}
          />
        ))}

        {/* 渲染 "我要飞去的那个格子" (如果是远程查看，用黄色显示一下，方便看到) */}
        {flyTarget && !myGrids[flyTarget] && (
           <Rectangle
             bounds={getGridBounds(flyTarget)}
             pathOptions={{ color: '#f59e0b', weight: 1, fillOpacity: 0.3 }} // 黄色
           />
        )}

        <LocationMarker setMyGrids={setMyGrids} />
        
        {/* 👇 插入飞行控制器 */}
        <MapController targetGrid={flyTarget} />
        
      </MapContainer>

      {/* 留言板弹窗 */}
      {activeGrid && (
        <MessageModal 
          gridId={activeGrid} 
          onClose={() => setActiveGrid(null)}
          // 👇 核心逻辑：只有在 myGrids 里的格子（我去过的），才能回复！
          canReply={!!myGrids[activeGrid]} 
        />
      )}
    </div>
  );
}