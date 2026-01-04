import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup, useMap, ZoomControl } from 'react-leaflet';
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

// --- 主程序 ---
export default function App() {
  const [myGrids, setMyGrids] = useState({}); // 我去过的格子
  const [otherVisits, setOtherVisits] = useState({}); // 别人的数据缓存
  const [activeGrid, setActiveGrid] = useState(null); // 当前打开留言板的格子ID

  // 初始化：加载本地已存储的格子
  useEffect(() => {
    const loadedGrids = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('visited_')) {
        loadedGrids[key.replace('visited_', '')] = true;
      }
    }
    setMyGrids(loadedGrids);
  }, []);

  // 点击格子时，查询Supabase数据
  const handleGridClick = async (gridId) => {
     setActiveGrid(gridId); // 只需要记录点了哪个，然后弹窗
  };

return (
    <div className="relative w-full h-screen font-sans">
      {/* 顶部标题栏 - 居中 + 阴影增强 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1000,
        width: '100%',
        paddingTop: '40px', // 避开手机顶部状态栏
        paddingBottom: '20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)', // 更深的渐变
        color: 'white',
        textAlign: 'center', // 👈 居中对齐
        pointerEvents: 'none'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '28px', 
          fontWeight: '800', 
          letterSpacing: '1px',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)' // 文字加点阴影更立体
        }}>
          MistyMeet 🗺️
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8, fontWeight: '500' }}>
          已探索: <span style={{color: '#34d399', fontWeight: 'bold'}}>{Object.keys(myGrids).length}</span> 个街区
        </p>
      </div>

      <MapContainer 
        center={[39.9, 116.4]} 
        zoom={15} 
        scrollWheelZoom={true} 
        zoomControl={false} // 👈 关掉默认左上角的按钮
        style={{ height: '100vh', width: '100%', background: '#0a0a0a' }}
      >
        {/* 把缩放按钮放到右下角 */}
        <ZoomControl position="bottomright" />

        {/* 深色地图底图 */}
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* 渲染我去过的格子 */}
        {Object.keys(myGrids).map(gridId => (
          <Rectangle
            key={gridId}
            bounds={getGridBounds(gridId)}
            pathOptions={{ color: '#10b981', weight: 0, fillOpacity: 0.5 }} 
            eventHandlers={{
              click: () => handleGridClick(gridId), // 点击打开弹窗
            }}
          />
          // 注意：这里删掉了原来的 <Popup>，因为我们要用新的弹窗了
        ))}

        <LocationMarker setMyGrids={setMyGrids} />
      </MapContainer>

      {/* 👇 新增：如果有选中的格子，就显示留言板 */}
      {activeGrid && (
        <MessageModal 
          gridId={activeGrid} 
          onClose={() => setActiveGrid(null)} 
        />
      )}
             
    </div>
  );
}