import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
 getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, query, Timestamp, getDocs, writeBatch, serverTimestamp, where, deleteField, getDoc,orderBy, limit //
} from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  BookOpen, Download, Upload, X, Check, RefreshCw, WifiOff, LogOut, FileText, AlertCircle, Eye, Shield, User, Key, Edit, Pencil, Star, Coins, Eraser, Moon, PlusCircle, TrendingUp, Activity, BarChart2, Megaphone, Lock, Unlock, RotateCw, Printer, BellRing, Type, Minus, Plus 
, Ship, DownloadCloud,ChevronLeft } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ReferenceLine 
} from 'recharts';

// --- 版本資訊 (V22) ---
const VERSION = 'v22 - 擴充115學年'; 
const appId = 'class-5a-app'; 

// 🚨 終極資安防禦：已透過 Google Cloud 設定 HTTP 網域白名單，此金鑰現已受實體隔離保護，可安全運行
const firebaseConfig = {
 apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
 authDomain: "class-5a-app.firebaseapp.com",
 projectId: "class-5a-app",
 storageBucket: "class-5a-app.firebasestorage.app",
 messagingSenderId: "828328241350",
 appId: "1:828328241350:web:5d39d529209f87a2540fc7",
 measurementId: "G-8VGE0WKD01"
};

const ASSETS = {
  BRONZE_SOUND: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3', 
  GOLD_SOUND: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3', 
  CONFETTI_BG: 'https://i.gifer.com/origin/e2/e29a997a3a304523b087050074697df0_w200.gif'
};

const CoinIcon = ({ type, size = "w-8 h-8", textSize = "text-sm", innerSize = "w-3/5 h-3/5" }) => {
   const baseClasses = `rounded-full border-[4px] flex items-center justify-center shadow-lg ${size} bg-white`;
   if (type === 'GOLD') return (<div className={`${baseClasses} border-yellow-400 text-yellow-500 bg-yellow-50`} title="金幣"><Moon className={`${innerSize} fill-current`} /></div>);
   if (type === 'SILVER') return (<div className={`${baseClasses} border-gray-400 text-gray-500 bg-gray-50`} title="銀幣"><Star className={`${innerSize} fill-current`} /></div>);
   return (<div className={`${baseClasses} border-orange-700 text-orange-800 bg-orange-50`} title="銅幣"><span className={`font-bold ${textSize}`}>$</span></div>);
};

const DEFAULT_STUDENTS = [
  { id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' },
  { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' },
];

const INITIAL_CATEGORIES = [{ name: '數課', order: 0 }, { name: '數習', order: 1 }, { name: '數八', order: 2 }, { name: '成語()+P.', order: 3 }, { name: '聯P.', order: 4 }, { name: '國', order: 5 }];
const ItemTypes = { ASSIGNMENT: 'assignment' };

const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;
const getDailySettlementPath = () => `/artifacts/${appId}/public/data/daily_settlements`;

// --- 圖表元件 ---
const safeNumber = (val) => { if (typeof val !== 'number') return 0; if (isNaN(val)) return 0; if (!isFinite(val)) return 0; return val; };

const SimpleStackedBarChart = ({ data, height = 300 }) => {
    if (!data || !Array.isArray(data) || data.length === 0) { return <div className="h-full flex items-center justify-center text-gray-400 text-2xl font-bold">尚無統計數據</div>; }
    const cleanData = data.map(item => ({ ...item, value: safeNumber(item.value), details: { onTime: safeNumber(item.details?.onTime), late: safeNumber(item.details?.late), missing: safeNumber(item.details?.missing) } }));
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={cleanData} margin={{ top: 80, right: 60, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 24, fill: '#6B7280', fontWeight: 'bold' }} axisLine={{ stroke: '#9CA3AF' }} tickLine={false} height={60} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '16px' }} itemStyle={{ fontSize: '24px', padding: '4px 0' }} labelStyle={{ fontSize: '24px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '24px' }} iconSize={24} />
                <Bar dataKey="details.onTime" name="準時" stackId="a" fill="#4ADE80" radius={[0, 0, 4, 4]}> <LabelList dataKey="details.onTime" position="center" style={{ fontSize: '28px', fontWeight: '900', fill: '#14532d', opacity: 0.9 }} formatter={(val) => val > 0 ? val : ''} /> </Bar>
                <Bar dataKey="details.late" name="補交" stackId="a" fill="#FACC15"> <LabelList dataKey="details.late" position="center" style={{ fontSize: '28px', fontWeight: '900', fill: '#713f12', opacity: 0.9 }} formatter={(val) => val > 0 ? val : ''} /> </Bar>
                <Bar dataKey="details.missing" name="缺交" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]}> <LabelList dataKey="details.missing" position="center" style={{ fontSize: '28px', fontWeight: '900', fill: '#ffffff' }} formatter={(val) => val > 0 ? val : ''} /> <LabelList dataKey="value" position="top" offset={15} style={{ fontSize: '36px', fontWeight: '900', fill: '#1f2937' }} formatter={(val) => val.toFixed(1)} /> </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

const CustomizedDot = (props) => { const { cx, cy, value } = props; if (!cx || !cy) return null; let fill = "#ef4444"; let stroke = "#fee2e2"; if (value >= 80) { fill = "#22c55e"; stroke = "#dcfce7"; } else if (value >= 60) { fill = "#eab308"; stroke = "#fef9c3"; } return ( <svg x={cx - 10} y={cy - 10} width={20} height={20}> <circle cx="10" cy="10" r="8" fill={fill} stroke="white" strokeWidth="3" /> <circle cx="10" cy="10" r="10" fill="none" stroke={stroke} strokeWidth="1" /> </svg> ); };
const CustomTooltip = ({ active, payload, label }) => { if (active && payload && payload.length && payload[0].payload) { const data = payload[0].payload; const details = data.details || { onTime: 0, late: 0, missing: 0 }; const safeValue = safeNumber(data.value); return ( <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 min-w-[180px]"> <p className="text-2xl font-bold text-gray-700 mb-2 border-b pb-2 border-gray-200">{label} <span className="text-blue-600 ml-2">({safeValue.toFixed(1)}分)</span></p> <div className="flex flex-col gap-1 text-xl"> <p className="text-green-700 font-bold">🟢 準時：{safeNumber(details.onTime)}</p> <p className="text-yellow-700 font-bold">🟡 補交：{safeNumber(details.late)}</p> <p className="text-red-600 font-bold">🔴 缺交：{safeNumber(details.missing)}</p> </div> </div> ); } return null; };
const SimpleLineChart = ({ data, height = 300 }) => { if (!data || !Array.isArray(data) || data.length === 0) { return <div className="h-full flex items-center justify-center text-gray-400 text-2xl font-bold">尚無統計數據</div>; } const cleanData = data.map(item => ({ ...item, value: safeNumber(item.value) })); return ( <ResponsiveContainer width="100%" height={height}> <LineChart data={cleanData} margin={{ top: 80, right: 60, left: 20, bottom: 10 }}> <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /> <XAxis dataKey="label" tick={{ fontSize: 24, fill: '#6B7280', fontWeight: 'bold' }} axisLine={{ stroke: '#9CA3AF' }} tickLine={false} height={60} /> <YAxis domain={[0, 100]} tick={{ fontSize: 20, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={60} /> <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9CA3AF', strokeWidth: 2, strokeDasharray: '5 5' }} /> <ReferenceLine y={100} stroke="#E5E7EB" strokeDasharray="3 3" label={{ position: 'top', value: '100', fill: '#D1D5DB', fontSize: 20 }} /> <ReferenceLine y={80} stroke="#4ADE80" strokeDasharray="5 5" label={{ position: 'insideTopRight', value: '80 (佳)', fill: '#4ADE80', fontSize: 20, fontWeight: 'bold' }} /> <ReferenceLine y={60} stroke="#F87171" strokeDasharray="5 5" label={{ position: 'insideTopRight', value: '60 (及格)', fill: '#F87171', fontSize: 20, fontWeight: 'bold' }} /> <Line type="linear" dataKey="value" stroke="#3B82F6" strokeWidth={6} dot={<CustomizedDot />} activeDot={{ r: 12, strokeWidth: 0 }} animationDuration={1500}> <LabelList dataKey="value" position="top" offset={20} style={{ fontSize: '28px', fontWeight: '900' }} formatter={(val) => safeNumber(val).toFixed(1)} fill="#3B82F6" /> </Line> </LineChart> </ResponsiveContainer> ); };

// --- 自定義評價與等級邏輯 ---
const getStatusFeedback = (score, emergency) => {
    if (emergency.isEmergency) return { text: "❌ 紅燈警報！缺交太多了，請檢查聯絡簿。", color: "text-red-600", bg: "bg-red-50", border: "border-red-500", isAlert: true };
    const s = parseFloat(score);
    if (isNaN(s)) return { text: "⚪ 資料不足", color: "text-gray-400", bg: "bg-white", border: "border-gray-300" };
    if (s >= 100) return { text: "🏆 完美無瑕！作業全勤且準時！", color: "text-blue-600", bg: "bg-white", border: "border-blue-600" };
    if (s >= 95) return { text: "✨ 超級優秀！你的自律讓人佩服。", color: "text-blue-500", bg: "bg-white", border: "border-blue-500" };
    if (s >= 90) return { text: "🌟 表現極佳！絕大多數都準時完成。", color: "text-green-600", bg: "bg-white", border: "border-green-600" };
    if (s >= 85) return { text: "👍 很不錯喔！作業狀況相當穩定。", color: "text-green-500", bg: "bg-white", border: "border-green-500" };
    if (s >= 80) return { text: "👌 保持水準！要減少遲交的情況。", color: "text-lime-600", bg: "bg-white", border: "border-lime-600" };
    if (s >= 70) return { text: "💪 再加油點！遲交缺交頻率變高了。", color: "text-yellow-600", bg: "bg-white", border: "border-yellow-600" };
    return { text: "⚠️ 勉強及格！作業狀況令人擔心。", color: "text-orange-500", bg: "bg-white", border: "border-orange-500" };
};

const getTrendFeedback = (score) => {
    const s = parseFloat(score);
    if (isNaN(s)) return { text: "資料不足", color: "text-gray-400", bg: "bg-gray-100", border: "border-gray-300" };
    if (s === 100) return { text: "👑 傳奇等級！完美的 100 分！", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-500" };
    if (s >= 98) return { text: "🎖️ 頂尖卓越！幾乎完美的表現！", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-500" };
    if (s >= 96) return { text: "🌟 出類拔萃！令人驚嘆的自律！", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-500" };
    if (s >= 94) return { text: "✨ 極度優秀！保持得非常好！", color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-500" };
    if (s >= 90) return { text: "👍 非常棒！是大家學習的榜樣。", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-500" };
    if (s >= 85) return { text: "🌿 表現優異，維持在高水準。", color: "text-green-600", bg: "bg-green-50", border: "border-green-500" };
    if (s >= 81) return { text: "😊 相當不錯，繼續保持節奏。", color: "text-lime-600", bg: "bg-lime-50", border: "border-lime-500" };
    if (s >= 75) return { text: "🆗 表現尚可，還有進步空間。", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-500" };
    if (s >= 70) return { text: "😐 普普通通，遲交稍微多了點。", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-500" };
    if (s >= 65) return { text: "😟 需要注意，分數開始下滑囉。", color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-500" };
    if (s >= 60) return { text: "⚠️ 低空飛過，請再多用點心。", color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-600" };
    if (s >= 50) return { text: "🛑 不及格邊緣！必須修正態度！", color: "text-red-500", bg: "bg-red-50", border: "border-red-400" };
    if (s >= 40) return { text: "🌧️ 狀況不佳，缺交遲交太頻繁。", color: "text-red-600", bg: "bg-red-50", border: "border-red-500" };
    if (s >= 30) return { text: "⛈️ 雷雨警報，信用分數嚴重透支。", color: "text-red-700", bg: "bg-red-100", border: "border-red-600" };
    if (s >= 20) return { text: "💔 令人擔憂，作業幾乎都沒完成。", color: "text-red-800", bg: "bg-red-100", border: "border-red-700" };
    if (s >= 10) return { text: "🆘 緊急狀態，幾乎一片空白。", color: "text-red-900", bg: "bg-red-200", border: "border-red-800" };
    if (s >= 5) return { text: "🌫️ 幾近空白，請不要放棄學習！", color: "text-gray-600", bg: "bg-gray-200", border: "border-gray-500" };
    return { text: "🌑 完全空白，請重新開始努力！", color: "text-gray-800", bg: "bg-gray-300", border: "border-gray-700" };
};

const getOverallBadge = (score) => {
    const s = parseFloat(score);
    if (isNaN(s)) return { animal: "🥚 蛋", comment: "尚未孵化" };
    if (s >= 100) return { animal: "🐲 神龍", comment: "作業全勤無缺，品質完美無瑕。" };
    if (s >= 97) return { animal: "🦁 獅王", comment: "態度極度自律，對自我要求高。" };
    if (s >= 94) return { animal: "🦅 雄鷹", comment: "繳交迅速確實，準確率非常高。" };
    if (s >= 91) return { animal: "🐆 獵豹", comment: "訂正效率驚人，很少拖泥帶水。" };
    if (s >= 88) return { animal: "🐴 駿馬", comment: "保持穩定節奏，作業習慣良好。" };
    if (s >= 85) return { animal: "🐺 戰狼", comment: "能夠自我鞭策，按時完成任務。" };
    if (s >= 82) return { animal: "🦊 靈狐", comment: "繳交穩定，若能多點細心會更棒。" };
    if (s >= 77) return { animal: "🦉 貓頭鷹", comment: "逐漸掌握要領，學習狀況回穩。" };
    if (s >= 72) return { animal: "🐻 大熊", comment: "累積實力中，細心度略顯不足。" };
    if (s >= 67) return { animal: "🐘 大象", comment: "腳踏實地，速度慢但願意補救。" };
    if (s >= 60) return { animal: "🦈 鯊魚", comment: "努力跟上進度，正視缺交問題。" };
    if (s >= 50) return { animal: "🦘 袋鼠", comment: "再跳一步就及格，請補齊缺交。" };
    if (s >= 40) return { animal: "🐿️ 松鼠", comment: "積少成多，請勿隨意放棄作業。" };
    if (s >= 30) return { animal: "🐇 白兔", comment: "別在中途停下休息，趕快追上進度！" };
    if (s >= 20) return { animal: "🦔 刺蝟", comment: "面對作業不逃避，勇敢承擔責任。" };
    if (s >= 10) return { animal: "🐢 烏龜", comment: "只要肯開始，總會完成，慢也沒關係。" };
    return { animal: "🌱 種子", comment: "埋入土裡太久了，請讓學習發芽。" };
};
// --- [新增元件] 任務同步勾選視窗 ---
// --- [優化元件] 任務同步勾選視窗 (加入排序功能) ---
const SyncTasksModal = ({ candidates, sourceDate, onConfirm, onClose }) => {
  const [items, setItems] = useState(candidates.map(c => ({ name: c, selected: true })));

  const toggleItem = (idx) => {
    const newItems = [...items];
    newItems[idx].selected = !newItems[idx].selected;
    setItems(newItems);
  };

  const handleNameChange = (idx, newName) => {
    const newItems = [...items];
    newItems[idx].name = newName;
    setItems(newItems);
  };

  // 新增：上移邏輯
  const moveUp = (idx) => {
    if (idx === 0) return;
    const newItems = [...items];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    setItems(newItems);
  };

  // 新增：下移邏輯
  const moveDown = (idx) => {
    if (idx === items.length - 1) return;
    const newItems = [...items];
    [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[110000] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-2xl border-8 border-amber-400 animate-in zoom-in duration-300">
        <h3 className="text-4xl font-black text-gray-800 mb-6 flex items-center gap-3">
          <Ship className="w-10 h-10 text-blue-600" /> 同步任務清單
        </h3>
        <p className="text-xl text-blue-600 mb-4 font-bold bg-blue-50 p-3 rounded-xl border border-blue-200">
          偵測到前一上課日 ({sourceDate}) 的任務紀錄。
        </p>
        
        <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar mb-8">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 hover:border-blue-200 transition-all group">
              <input type="checkbox" checked={item.selected} onChange={() => toggleItem(idx)} className="w-10 h-10 accent-blue-600 cursor-pointer shrink-0" />
              
              <input 
                type="text" 
                value={item.name} 
                onChange={(e) => handleNameChange(idx, e.target.value)} 
                className={`flex-1 text-2xl font-bold bg-transparent outline-none border-b-2 ${item.selected ? 'border-blue-300 text-gray-800' : 'border-transparent text-gray-400'}`} 
                disabled={!item.selected} 
              />

              {/* 排序按鈕組 */}
              <div className="flex flex-col gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveUp(idx)} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="上移"><ChevronLeft className="w-6 h-6 rotate-90" /></button>
                <button onClick={() => moveDown(idx)} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="下移"><ChevronLeft className="w-6 h-6 -rotate-90" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-200 text-gray-600 rounded-2xl text-2xl font-black hover:bg-gray-300 transition-all">取消並手動</button>
          <button onClick={() => onConfirm(items.filter(i => i.selected && i.name.trim()))} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all"> 確認匯入 ({items.filter(i => i.selected).length} 項) </button>
        </div>
      </div>
    </div>
  );
};
// --- Dashboard Modal ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('STATUS'); 
    if (!student) return null;
    const maskedName = student.name[0] + 'O' + student.name.slice(2);
    
    const getDaysDiff = (dateString, completedAt) => { try { const targetDate = new Date(dateString); if (isNaN(targetDate.getTime())) return 0; targetDate.setHours(0,0,0,0); let completedDate = new Date(); if (completedAt) { if (typeof completedAt.toDate === 'function') completedDate = completedAt.toDate(); else if (completedAt.seconds) completedDate = new Date(completedAt.seconds * 1000); else completedDate = new Date(completedAt); } if (isNaN(completedDate.getTime())) return 0; completedDate.setHours(0,0,0,0); return Math.max(0, Math.floor((completedDate - targetDate) / (1000 * 60 * 60 * 24))); } catch (e) { return 0; } };
    const getDelayFromToday = (dateString) => { try { const today = new Date(); today.setHours(0, 0, 0, 0); const target = new Date(dateString); if (isNaN(target.getTime())) return 0; target.setHours(0, 0, 0, 0); return Math.floor((today - target) / (1000 * 60 * 60 * 24)); } catch(e) { return 0; } };
    
    const { healthData, trendData, summaryStats, trendStats, emergencyData, overallData } = useMemo(() => {
        const healthByMonth = {}; const trendByMonth = {};
        let totalItems = 0; let totalDays = 0; let totalHealthPoints = 0; let totalTrendPoints = 0;
        let itemsCompleted = 0; let itemsLate = 0; let itemsMissing = 0; let daysCompleted = 0; let daysLate = 0; let daysMissing = 0;
        let currentMissingCount = 0; let maxDelayDays = 0;
        
        const assignmentsData = allAssignmentsByDate || {};
        const sortedDates = Object.keys(assignmentsData).sort();
        
        sortedDates.forEach(date => {
            const dateObj = new Date(date); 
            if (isNaN(dateObj.getTime())) return;
            const monthKey = `${dateObj.getMonth() + 1}月`;
            
            if (!healthByMonth[monthKey]) healthByMonth[monthKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            if (!trendByMonth[monthKey]) trendByMonth[monthKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            
            const assignments = assignmentsData[date] || []; 
            if (assignments.length === 0) return;
            
            totalDays++; let dayHasMissing = false; let dayHasLate = false;
            
            assignments.forEach(assign => {
                const status = assign.submissionStatus?.[student.id]; 
                const completedAt = assign.completedAt?.[student.id];
                let tScore = 0;
                
                if (status === false) { 
                    itemsMissing++; trendByMonth[monthKey].missing++; currentMissingCount++; dayHasMissing = true; 
                    const delay = getDelayFromToday(date); if (delay > maxDelayDays) maxDelayDays = delay; 
                    tScore = 0; 
                } else if (status === 'late') { 
                    itemsLate++; trendByMonth[monthKey].late++; dayHasLate = true; 
                    if (completedAt) { const daysLate = getDaysDiff(date, completedAt); tScore = Math.max(0, 100 - (daysLate * 5)); } 
                    else { tScore = 60; } 
                } else { 
                    itemsCompleted++; trendByMonth[monthKey].onTime++; tScore = 100; 
                }
                trendByMonth[monthKey].totalPoints += tScore; trendByMonth[monthKey].count++; totalTrendPoints += tScore; totalItems++;
            });
            
            let dayScore = 0; 
            if (dayHasMissing) { dayScore = 0; healthByMonth[monthKey].missing++; daysMissing++; } 
            else if (dayHasLate) { dayScore = 60; healthByMonth[monthKey].late++; daysLate++; } 
            else { dayScore = 100; healthByMonth[monthKey].onTime++; daysCompleted++; }
            
            healthByMonth[monthKey].totalPoints += dayScore; healthByMonth[monthKey].count++; totalHealthPoints += dayScore;
        });

        const safeDiv = (a, b) => (b === 0 ? 0 : a / b);
        const healthChart = Object.keys(healthByMonth).map(key => ({ label: key, value: safeDiv(healthByMonth[key].totalPoints, healthByMonth[key].count), details: healthByMonth[key] }));
        const trendChart = Object.keys(trendByMonth).map(key => ({ label: key, value: safeDiv(trendByMonth[key].totalPoints, trendByMonth[key].count), details: trendByMonth[key] }));
        
        const avgHealthScore = safeNumber(safeDiv(totalHealthPoints, totalDays)); 
        const avgTrendScore = safeNumber(safeDiv(totalTrendPoints, totalItems));
        const overallScore = safeNumber((avgHealthScore + avgTrendScore) / 2).toFixed(1);
        
        const isEmergency = currentMissingCount >= 3;
        return { 
            healthData: healthChart, 
            trendData: trendChart, 
            summaryStats: { days: { total: totalDays, completed: daysCompleted, late: daysLate, missing: daysMissing }, items: { total: totalItems, completed: itemsCompleted, late: itemsLate, missing: itemsMissing }, avgScore: avgHealthScore.toFixed(1) }, 
            trendStats: { avgScore: avgTrendScore.toFixed(1) }, 
            emergencyData: { isEmergency, maxDelayDays, currentMissingCount }, 
            overallData: { score: overallScore } 
        };
    }, [allAssignmentsByDate, student.id]);

    const currentFeedback = viewMode === 'STATUS' ? getStatusFeedback(summaryStats.avgScore, emergencyData) : getTrendFeedback(trendStats.avgScore);
    const overallBadge = getOverallBadge(overallData.score);
    const currentStats = viewMode === 'STATUS' ? summaryStats.days : summaryStats.items;
    const statsUnit = viewMode === 'STATUS' ? '天' : '項';
    const safeChartData = (viewMode === 'STATUS' ? healthData : trendData) || [];

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] h-[98vh] flex flex-col overflow-hidden border-[8px] ${currentFeedback.isAlert ? 'border-red-500' : 'border-white'}`}>
                <div className={`px-4 py-3 flex justify-between items-center text-white shrink-0 transition-colors duration-500 ${currentFeedback.isAlert ? 'bg-red-600' : (viewMode === 'TREND' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-gradient-to-r from-indigo-600 to-purple-500')}`}>
                    <div className="flex items-center gap-4 w-full">
                        <div className="flex items-center gap-4 shrink-0">
                            <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg border-4 ${currentFeedback.isAlert ? 'text-red-600 border-red-200' : (viewMode === 'TREND' ? 'text-blue-600 border-blue-200' : 'text-indigo-600 border-indigo-200')}`}>{student.id}</div>
                            <div className="flex flex-col justify-center">
                                <h2 className="text-5xl font-black tracking-wide leading-none mb-1">{maskedName} 的學習歷程</h2>
                                <p className="text-white/90 text-2xl font-medium flex items-center gap-2"><Activity className="w-5 h-5" /> {semesterId === 'S1' ? '上學期' : '下學期'}綜合分析報表</p>
                            </div>
                        </div>
                        <div className="h-12 w-[2px] bg-white/30 mx-2"></div>
                        <div className="flex flex-1 items-center bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/20 h-full">
                            <div className="flex flex-col shrink-0 mr-4">
                                <div className="text-xl font-bold text-white/80 mb-0">🏆 綜合總分</div>
                                <span className="text-6xl font-black text-yellow-300 drop-shadow-md leading-none">{overallData.score}</span>
                            </div>
                            <div className="h-10 w-[2px] bg-white/30 mr-4"></div>
                            <div className="flex items-center flex-1">
                                <span className="text-5xl font-bold text-white mr-3 shrink-0">{overallBadge.animal}</span>
                                <div className="text-4xl font-medium text-white/95 leading-tight overflow-hidden text-ellipsis whitespace-nowrap bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/30">{overallBadge.comment}</div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition backdrop-blur-md ml-3 shrink-0"><X className="w-6 h-6" /></button>
                </div>
                <div className="bg-gray-100 p-3 flex justify-between items-center shadow-inner shrink-0">
                    <div className="flex gap-3">
                        <button onClick={() => setViewMode('STATUS')} className={`px-6 py-3 rounded-xl text-3xl font-bold transition-all duration-300 flex items-center gap-2 ${viewMode === 'STATUS' ? 'bg-white text-indigo-600 shadow-md ring-2 ring-indigo-200' : 'text-gray-500 hover:bg-gray-200'}`}><BarChart2 className="w-8 h-8"/> 狀況統計</button>
                        <button onClick={() => setViewMode('TREND')} className={`px-6 py-3 rounded-xl text-3xl font-bold transition-all duration-300 flex items-center gap-2 ${viewMode === 'TREND' ? 'bg-white text-blue-600 shadow-md ring-2 ring-blue-200' : 'text-gray-500 hover:bg-gray-200'}`}><TrendingUp className="w-8 h-8"/> 績效分數</button>
                    </div>
                    <div className="bg-white px-6 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                        <span className="text-gray-500 text-2xl font-bold flex items-center gap-2"><Coins className="w-8 h-8 text-yellow-500"/> 目前資產:</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-gray-800">{bankBalance?.gold || 0}</span><span className="text-2xl text-yellow-500 font-bold">金</span>
                            <span className="text-4xl text-gray-300 font-light">/</span>
                            <span className="text-5xl font-black text-gray-800">{bankBalance?.silver || 0}</span><span className="text-2xl text-gray-400 font-bold">銀</span>
                        </div>
                    </div>
                </div>
                <div className={`flex-1 overflow-auto p-4 ${currentFeedback.bg} flex flex-col gap-4`}>
                    <div className="flex gap-4 mb-2 shrink-0">
                        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-center items-center relative overflow-hidden shrink">
                            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                            <p className="text-gray-500 text-3xl font-bold mb-3">本學期{viewMode === 'STATUS' ? '統計天數' : '作業總數'}</p>
                            <div className="flex items-end gap-3 justify-center">
                                <div className="flex items-baseline leading-none">
                                    <span className={`text-7xl font-black ${viewMode === 'STATUS' ? 'text-indigo-600' : 'text-blue-600'}`}>{currentStats.total}</span>
                                    <span className="text-4xl text-gray-400 font-bold ml-1">{statsUnit}</span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex flex-col items-center bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                                        <span className="text-3xl font-bold text-green-600 leading-none">{currentStats.completed}</span>
                                        <span className="text-base text-green-800 font-bold">準時</span>
                                    </div>
                                    <div className="flex flex-col items-center bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">
                                        <span className="text-3xl font-bold text-yellow-600 leading-none">{currentStats.late}</span>
                                        <span className="text-base text-yellow-800 font-bold">遲交</span>
                                    </div>
                                    <div className="flex flex-col items-center bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                                        <span className="text-3xl font-bold text-red-600 leading-none">{currentStats.missing}</span>
                                        <span className="text-base text-red-800 font-bold">缺交</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 rounded-[2rem] shadow-sm border-l-[10px] flex items-center justify-between grow ${currentFeedback.border} ${currentFeedback.bg}`}>
                            <div className="flex flex-col items-center gap-0 pl-4 shrink-0">
                                <span className="text-2xl font-bold text-gray-400 mb-0">健康指數</span>
                                <div className="flex items-baseline">
                                    <span className={`text-7xl font-black leading-none ${currentFeedback.color}`}>{viewMode === 'STATUS' ? summaryStats.avgScore : trendStats.avgScore}</span>
                                    <span className="text-3xl text-gray-400 font-bold ml-2">分</span>
                                </div>
                            </div>
                            <div className="flex-1 pl-6 border-l-2 border-gray-200/50 ml-6">
                                <p className={`${currentFeedback.color} font-bold text-4xl leading-tight text-left`}>{currentFeedback.text}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-200 h-[550px] shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-4xl font-bold text-gray-700 flex items-center">{viewMode === 'TREND' ? (<><TrendingUp className="w-10 h-10 mr-3 text-blue-500" /> 作業績效趨勢圖</>) : (<><BarChart2 className="w-10 h-10 mr-3 text-indigo-500" /> 每月作業狀況分佈</>)}</h3>
                            </div>
                            <div className="w-full h-[450px]">{viewMode === 'TREND' ? ( <SimpleLineChart data={safeChartData} height={450} /> ) : ( <SimpleStackedBarChart data={safeChartData} height={450} /> )}</div>
                        </div>
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                                <FileText className="w-10 h-10 text-gray-700" />
                                <span className="text-4xl font-extrabold text-gray-700">詳細數據列表</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white"><tr><th className="px-6 py-4 text-left text-3xl font-bold text-gray-600">月份</th><th className="px-6 py-4 text-center text-3xl font-bold text-green-600">準時</th><th className="px-6 py-4 text-center text-3xl font-bold text-yellow-600">補交</th><th className="px-6 py-4 text-center text-3xl font-bold text-red-600">缺交</th><th className="px-6 py-4 text-center text-3xl font-bold text-blue-600">{viewMode === 'STATUS' ? '健康平均' : '績效平均'}</th></tr></thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {safeChartData.map((row, idx) => {
                                            const tVal = row.value || 0;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50"><td className="px-6 py-4 text-3xl font-bold text-gray-800">{row.label}</td><td className="px-6 py-4 text-center text-3xl font-medium text-gray-600">{row.details.onTime}</td><td className="px-6 py-4 text-center text-3xl font-medium text-gray-600">{row.details.late}</td><td className="px-6 py-4 text-center text-3xl font-medium text-gray-600">{row.details.missing}</td><td className="px-6 py-4 text-center"><span className={`inline-block px-4 py-2 rounded-full text-3xl font-bold ${tVal >= 90 ? 'bg-green-100 text-green-700' : (tVal >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>{tVal.toFixed(1)}</span></td></tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 學生存簿系統 & 獎勵特效 ---
const RewardOverlay = ({ type, onClose }) => {
    const soundUrl = type === 'GOLD_CLEAR' ? ASSETS.GOLD_SOUND : ASSETS.BRONZE_SOUND;
    const duration = type === 'GOLD_CLEAR' ? 6000 : 1000;

    useEffect(() => { const timer = setTimeout(() => { onClose(); }, duration); return () => clearTimeout(timer); }, [duration, onClose]);

    if (type === 'GOLD_CLEAR') {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none overflow-hidden">
                <audio autoPlay src={soundUrl} />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pulse"></div>
                <div className="absolute inset-0 bg-contain bg-center opacity-80" style={{ backgroundImage: `url(${ASSETS.CONFETTI_BG})` }}></div>

                <div className="relative flex flex-col items-center justify-center animate-bounce-in bg-white/10 p-12 rounded-[3rem] backdrop-blur-md border-4 border-yellow-300 shadow-[0_0_100px_rgba(255,215,0,0.6)]">
                    <div className="text-[12rem] filter drop-shadow-[0_0_50px_rgba(255,215,0,0.8)] animate-pulse">🎉</div>
                    <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 drop-shadow-2xl mt-4 border-text-white text-center leading-tight">
                        完成全部作業！<br/>你真棒 👍
                    </div>
                    <div className="flex items-center gap-6 mt-8 animate-bounce bg-white/20 px-8 py-4 rounded-2xl border border-white/40">
                       <span className="text-7xl">💰</span>
                       <div className="flex flex-col items-start">
                          <span className="text-5xl text-yellow-300 font-black">+3 金幣</span>
                          <span className="text-3xl text-orange-200 font-bold">+10 銅幣</span>
                       </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
            <audio autoPlay src={soundUrl} />
            <div className="bg-white/90 backdrop-blur-md px-12 py-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform scale-150 animate-pop-in border-4 border-orange-400 flex items-center gap-6">
                <div className="text-8xl">🥉</div>
                <div className="flex flex-col">
                    <span className="text-5xl font-black text-orange-600">訂正完成！</span>
                    <span className="text-3xl text-gray-600 font-bold mt-2">+10 銅幣</span>
                </div>
            </div>
        </div>
    );
};
const useStudentBank = (db, isAuthReady, isOffline, students, selectedAcademicYear = '115') => {
  const [bankData, setBankData] = useState({});

  useEffect(() => {
    if (isOffline) {
      const initialData = {};
      students.forEach(s => initialData[s.id] = { gold: 0, silver: 0, bronze: 0 });
      setBankData(initialData);
      return;
    }
    if (!isAuthReady || !db) return;

    const q = query(collection(db, getBankCollectionPath()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => {
        const raw = doc.data();
        if (selectedAcademicYear === '114' && !raw.years) {
          data[doc.id] = {
            gold: raw.gold || 0,
            silver: raw.silver || 0,
            bronze: raw.bronze || 0
          };
        } else {
          const yearData = raw.years?.[selectedAcademicYear] || { gold: 0, silver: 0, bronze: 0 };
          data[doc.id] = yearData;
        }
      });
      setBankData(data);
    });

    return () => unsubscribe();
  }, [isAuthReady, db, isOffline, students, selectedAcademicYear]);

  const updateBankBalance = useCallback(async (studentId, goldChange, silverChange, bronzeChange) => {
    if (isOffline) {
      setBankData(prev => {
        const current = prev[studentId] || { gold: 0, silver: 0, bronze: 0 };
        return {
          ...prev,
          [studentId]: {
            gold: Math.max(0, (current.gold || 0) + goldChange),
            silver: Math.max(0, (current.silver || 0) + silverChange),
            bronze: Math.max(0, (current.bronze || 0) + bronzeChange)
          }
        };
      });
      return;
    }

    if (!db) return;
    const docRef = doc(db, getBankCollectionPath(), studentId);
    try {
      const docSnap = await getDoc(docRef);
      const raw = docSnap.exists() ? docSnap.data() : {};
      const current = raw.years?.[selectedAcademicYear] || (selectedAcademicYear === '114' ? raw : {}) || { gold: 0, silver: 0, bronze: 0 };

      const newYearData = {
        gold: Math.max(0, (current.gold || 0) + goldChange),
        silver: Math.max(0, (current.silver || 0) + silverChange),
        bronze: Math.max(0, (current.bronze || 0) + bronzeChange),
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, {
        years: {
          ...(raw.years || {}),
          [selectedAcademicYear]: newYearData
        }
      }, { merge: true });
    } catch (e) {
      console.error("Update bank balance failed:", e);
    }
  }, [db, isOffline, selectedAcademicYear]);

  const setBankBalancedDirectly = useCallback(async (studentId, type, value) => {
    if (isOffline) {
      setBankData(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], [type]: value }
      }));
      return;
    }

    if (!db) return;
    const docRef = doc(db, getBankCollectionPath(), studentId);
    const docSnap = await getDoc(docRef);
    const raw = docSnap.exists() ? docSnap.data() : {};
    const current = raw.years?.[selectedAcademicYear] || (selectedAcademicYear === '114' ? raw : {}) || { gold: 0, silver: 0, bronze: 0 };

    await setDoc(docRef, {
      years: {
        ...(raw.years || {}),
        [selectedAcademicYear]: {
          ...current,
          [type]: value
        }
      }
    }, { merge: true });
  }, [db, isOffline, selectedAcademicYear]);

  return { bankData, updateBankBalance, setBankBalancedDirectly, setBankData };
};
// --- [V20.0.43] 學生存簿介面 (修正：滾動時固定姓名欄) ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, setBankBalancedDirectly, authMode, students }) => {
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => { 
        const bankA = bankData[a.id] || { bronze: 0, silver: 0, gold: 0 }; 
        const bankB = bankData[b.id] || { bronze: 0, silver: 0, gold: 0 }; 
        if (bankA.gold !== bankB.gold) return bankB.gold - bankA.gold; 
        if (bankA.silver !== bankB.silver) return bankB.silver - bankA.silver; 
        if (bankA.bronze !== bankB.bronze) return bankB.bronze - bankA.bronze; 
        return parseInt(a.id) - parseInt(b.id); 
    });
  }, []); 

  const handleInputChange = (studentId, type, value) => {
    if (authMode !== 'ADMIN') return;
    if (value === '') { setBankBalancedDirectly(studentId, type, 0); return; }
    const numVal = parseInt(value, 10);
    if (!isNaN(numVal) && numVal >= 0) { setBankBalancedDirectly(studentId, type, numVal); }
  };

  const handleResetAll = async (studentId) => {
      if (authMode !== 'ADMIN') return;
      if (!window.confirm(`確定要將學生 ${studentId} 的【所有資產】歸零嗎？`)) return;
      setBankBalancedDirectly(studentId, 'gold', 0);
      setBankBalancedDirectly(studentId, 'silver', 0);
      setBankBalancedDirectly(studentId, 'bronze', 0);
  };

  const handleExchange = (studentId, type) => {
      const bal = bankData[studentId] || { gold: 0, silver: 0, bronze: 0 };
      if (type === 'B2S') {
          if ((bal.bronze || 0) >= 100) { onUpdateBalance(studentId, 0, 1, -100); } 
          else { alert("銅幣不足 100，無法兌換！"); }
      } else if (type === 'S2G') {
          if ((bal.silver || 0) >= 10) { onUpdateBalance(studentId, 1, -10, 0); } 
          else { alert("銀幣不足 10，無法兌換！"); }
      }
  };

  const handleResetClass = () => {
      if (authMode !== 'ADMIN') return;
      if(!window.confirm("⚠️ 危險操作：確定要將「全班所有人的錢」全部歸零嗎？\n此操作無法復原！")) return;
      if(!window.confirm("再次確認：您真的要歸零全班嗎？")) return;
      students.forEach(s => {
          setBankBalancedDirectly(s.id, 'gold', 0);
          setBankBalancedDirectly(s.id, 'silver', 0);
          setBankBalancedDirectly(s.id, 'bronze', 0);
      });
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-[10000] p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-4 border-orange-400 transition-colors duration-300`}>
        <div className="bg-gray-100 p-4 border-b flex justify-between items-center shrink-0">
          <div className="text-3xl font-bold text-gray-700 flex items-center gap-2">
            <span className="text-4xl">💰</span> 訂正存簿 <span className="text-xl font-normal text-gray-400 ml-4">(修改期間順序固定，重新開啟後更新排名)</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X className="w-8 h-8" /></button>
        </div>

        {/* 表格容器加入 overflow-auto */}
        <div className={`flex-1 overflow-auto p-4 bg-orange-50`}>
          <table className="w-full bg-white shadow-sm rounded-lg border border-gray-200 relative border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-[150] shadow-md">
                <tr className="border-b-2 border-gray-300">
                  {/* 凍結表頭 */}
                  <th className="p-3 text-2xl w-20 text-center bg-gray-100 sticky left-0 z-[120]">排名</th>
                  <th className="p-3 text-2xl w-24 text-center bg-gray-100 sticky left-[80px] z-[120]">座號</th>
                  <th className="p-3 text-2xl text-left bg-gray-100 sticky left-[176px] z-[120] border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">姓名</th>
                  
                  <th className="p-3 text-2xl w-32 bg-yellow-50 text-yellow-700 text-center">金幣</th>
                  <th className="p-3 text-2xl w-32 bg-gray-50 text-gray-700 text-center border-l border-gray-200">銀幣</th>
                  <th className="p-3 text-2xl w-32 bg-orange-50 text-orange-700 text-center border-l border-gray-200">銅幣</th>
                  <th className="p-3 text-center bg-gray-100 border-l border-gray-200 w-auto">
                    <span className="text-2xl text-gray-600 block">操作</span>
                  </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {sortedStudents.map((student, idx) => {
                  const bal = bankData[student.id] || { gold: 0, silver: 0, bronze: 0 };
                  let rankIcon = idx < 3 ? ["🥇","🥈","🥉"][idx] : idx + 1;
                  
                  return (
                    <tr key={student.id} className="hover:bg-blue-50 transition duration-150 group">
                      {/* 凍結表格內容欄位 */}
                      <td className="p-3 text-center text-3xl font-black text-gray-400 sticky left-0 bg-white group-hover:bg-blue-50 z-10">{rankIcon}</td>
                      <td className="p-3 text-center text-2xl font-bold text-gray-600 sticky left-[80px] bg-white group-hover:bg-blue-50 z-10">{student.id}</td>
                      <td className="p-3 text-2xl font-bold text-gray-800 sticky left-[176px] bg-white group-hover:bg-blue-50 z-10 border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{student.name[0] + 'O' + student.name.slice(2)}</td>
                      
                      <td className="p-2 text-center bg-yellow-50/30">
                        <input type="number" value={bal.gold || 0} onChange={(e)=>handleInputChange(student.id, 'gold', e.target.value)} disabled={authMode!=='ADMIN'} 
                          className="w-24 text-center text-3xl font-bold text-yellow-600 bg-transparent border-b-2 border-transparent focus:border-yellow-500 outline-none hover:bg-white/50 rounded" />
                      </td>
                      <td className="p-2 text-center bg-gray-50/30 border-l border-gray-100">
                        <input type="number" value={bal.silver || 0} onChange={(e)=>handleInputChange(student.id, 'silver', e.target.value)} disabled={authMode!=='ADMIN'} 
                          className="w-24 text-center text-3xl font-bold text-gray-600 bg-transparent border-b-2 border-transparent focus:border-gray-500 outline-none hover:bg-white/50 rounded" />
                      </td>
                      <td className="p-2 text-center bg-orange-50/30 border-l border-gray-100">
                        <input type="number" value={bal.bronze || 0} onChange={(e)=>handleInputChange(student.id, 'bronze', e.target.value)} disabled={authMode!=='ADMIN'} 
                          className="w-24 text-center text-3xl font-bold text-orange-700 bg-transparent border-b-2 border-transparent focus:border-orange-500 outline-none hover:bg-white/50 rounded" />
                      </td>
                      <td className="p-2 flex justify-center items-center gap-2 border-l border-gray-100">
                          <div className="flex gap-2">
                            <button onClick={() => handleExchange(student.id, 'B2S')} className="w-12 h-12 rounded-full shadow-md flex items-center justify-center bg-gray-200 hover:bg-gray-300 border-2 border-gray-400 text-gray-700 active:scale-95 transition" title="100銅 換 1銀"><RotateCw className="w-7 h-7"/></button>
                            <button onClick={() => handleExchange(student.id, 'S2G')} className="w-12 h-12 rounded-full shadow-md flex items-center justify-center bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-400 text-yellow-700 active:scale-95 transition" title="10銀 換 1金"><RotateCw className="w-7 h-7"/></button>
                          </div>
                          {authMode === 'ADMIN' && (
                              <>
                                <div className="w-[2px] h-10 bg-gray-300 mx-2"></div>
                                <button onClick={() => onUpdateBalance(student.id, 0, 0, 10)} className="w-12 h-12 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-black text-3xl flex items-center justify-center shadow-sm" title="增加銅幣">+</button>
                                <button onClick={() => onUpdateBalance(student.id, 0, 0, -10)} className="w-12 h-12 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-black text-3xl flex items-center justify-center shadow-sm" title="減少銅幣">-</button>
                                <button onClick={() => handleResetAll(student.id)} className="p-2 ml-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition shadow-sm" title="單人歸零"><Eraser className="w-7 h-7"/></button>
                              </>
                          )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {authMode === 'ADMIN' && (
            <div className="p-4 bg-gray-100 border-t flex justify-start">
                 <button onClick={handleResetClass} className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 flex items-center gap-2 text-xl shadow-md">⚠️ 期末全班歸零</button>
            </div>
        )}
      </div>
    </div>
  );
};
// --- 每日結算 Hook 與 輔助介面元件 ---
const useDailySettlements = (db, isAuthReady, isOffline) => {
    const [settlements, setSettlements] = useState({}); 
    useEffect(() => {
        if (isOffline) return;
        if (!isAuthReady || !db) return;
        const q = query(collection(db, getDailySettlementPath()));
        const unsubscribe = onSnapshot(q, (snapshot) => { 
            const data = {}; 
            snapshot.docs.forEach(doc => { data[doc.id] = doc.data(); }); 
            setSettlements(data); 
        }, (e) => console.error("Daily Settlements sync error:", e));
        return () => unsubscribe();
    }, [isAuthReady, db, isOffline]);
    return settlements;
};

const CustomAlert = ({ message, onClose }) => ( 
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"> 
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100"> 
            <h3 className="text-4xl font-semibold text-gray-800 mb-4">通知</h3> 
            <p className="text-3xl text-gray-600 mb-6 whitespace-pre-wrap">{message}</p> 
            <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out font-medium text-4xl">確定</button> 
        </div> 
    </div> 
);

const LoginScreen = ({ onAdminLogin, onGuestLogin, isLoading, errorMsg }) => { 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [mode, setMode] = useState('GUEST'); 
  const handleAdminSubmit = (e) => { e.preventDefault(); onAdminLogin(email, password); }; 
  return ( 
      <div className="fixed inset-0 bg-[#F0F8FF] flex items-center justify-center z-[10000]"> 
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-blue-100"> 
              <div className="text-center mb-8"> 
                  <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-wide">六年甲班作業表</h1> 
                  <p className="text-gray-400 text-xl font-medium">請選擇您的身分</p> 
              </div> 
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6"> 
                  <button onClick={() => setMode('GUEST')} className={`flex-1 py-2 rounded-lg text-xl font-bold transition-all ${mode === 'GUEST' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>學生/家長</button> 
                  <button onClick={() => setMode('ADMIN')} className={`flex-1 py-2 rounded-lg text-xl font-bold transition-all ${mode === 'ADMIN' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>老師 (管理員)</button> 
              </div> 
              {mode === 'ADMIN' ? ( 
                  <form onSubmit={handleAdminSubmit} className="space-y-4 animate-fade-in"> 
                      <div><label className="block text-gray-600 text-lg font-bold mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="w-full px-4 py-3 text-xl border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all" autoFocus /></div> 
                      <div><label className="block text-gray-600 text-lg font-bold mb-1">密碼</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="請輸入密碼" className="w-full px-4 py-3 text-xl border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all" /></div> 
                      {errorMsg && (<p className="text-red-500 text-lg font-bold">{errorMsg}</p>)} 
                      <button type="submit" disabled={isLoading} className={`w-full py-3 rounded-xl text-white text-2xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-wait' : 'bg-red-500 hover:bg-red-600'}`}>{isLoading ? '驗證中...' : <><Key className="w-6 h-6" /> 管理員登入</>}</button> 
                  </form> 
              ) : ( 
                  <div className="space-y-6 animate-fade-in"> 
                      <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-lg"><p className="font-bold flex items-center gap-2"><Shield className="w-5 h-5"/> 訪客模式說明：</p><p className="mt-1">您可以查看所有作業進度，但無法修改作業名稱或刪除紀錄。</p></div> 
                      <button onClick={onGuestLogin} disabled={isLoading} className={`w-full py-3 rounded-xl text-white text-2xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-wait' : 'bg-blue-500 hover:bg-blue-600'}`}>{isLoading ? '進入中...' : <><User className="w-6 h-6" /> 進入系統</>}</button> 
                  </div> 
              )} 
              <div className="mt-8 text-center text-gray-400 text-lg">系統版本：{VERSION}</div> 
          </div> 
      </div> 
  ); 
};

// --- [升級版] 全班未完成作業總表 (支援日期區間篩選) ---
const AllMissingAssignmentsModal = ({ students, allAssignmentsByDate, onClose, selectedAcademicYear }) => {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(getTodayDate());

    // --- [核心新增] 用於存放「要列印的作業鍵值」 ---
    const [selectedItemKeys, setSelectedItemKeys] = useState(new Set());

    // 1. 先計算出日期區間內所有缺交的資料
    const allMissingData = useMemo(() => {
        const stats = students.map(s => ({ id: s.id, name: s.name, missingCount: 0, missingDetails: [] }));
        Object.keys(allAssignmentsByDate)
            .filter(date => (!startDate || date >= startDate) && (!endDate || date <= endDate))
            .forEach(date => {
                (allAssignmentsByDate[date] || []).forEach(assignment => {
                    if (assignment.submissionStatus) {
                        students.forEach((student, index) => {
                            if (assignment.submissionStatus[student.id] === false) {
                                stats[index].missingCount += 1;
                                stats[index].missingDetails.push({ date: date, assignment: assignment.assignmentName });
                            }
                        });
                    }
                });
            });
        return stats.filter(s => s.missingCount > 0).sort((a, b) => b.missingCount - a.missingCount);
    }, [allAssignmentsByDate, students, startDate, endDate]);

    // 2. 當日期區間改變時，預設「全選」所有抓到的作業
    useEffect(() => {
        const newKeys = new Set();
        allMissingData.forEach(s => {
            s.missingDetails.forEach(d => {
                // 唯一鍵值：學生ID-日期-作業名稱
                newKeys.add(`${s.id}-${d.date}-${d.assignment}`);
            });
        });
        setSelectedItemKeys(newKeys);
    }, [allMissingData]);

    // 3. 切換勾選狀態的工具 (點一下就踢掉，再點一下就補回)
    const toggleItem = (key) => {
        const next = new Set(selectedItemKeys);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setSelectedItemKeys(next);
    };

    const handlePrint = () => { window.print(); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4 print:p-0 print:block print:bg-white print:absolute print:inset-0 print:z-[20000]">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-6xl h-[90vh] flex flex-col border border-gray-200 print:hidden">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-4xl font-bold text-gray-800 flex items-center">
                            <AlertCircle className="w-10 h-10 text-red-500 mr-3" />未完成作業總表
                        </h3>
                        <p className="text-gray-500 text-xl font-bold ml-13">目前顯示區間：{startDate || '不限'} 至 {endDate || '今天'}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xl font-bold transition shadow-sm">
                            <Printer className="w-6 h-6"/> 列印此區間
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* 日期篩選工具列 */}
                <div className="bg-blue-50 p-4 rounded-xl mb-6 flex items-center gap-6 border border-blue-100">
                    <div className="flex items-center gap-3">
                        <label className="text-2xl font-black text-blue-800">從：</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 text-2xl border-2 border-blue-200 rounded-lg font-bold focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-2xl font-black text-blue-800">到：</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 text-2xl border-2 border-blue-200 rounded-lg font-bold focus:ring-blue-500 outline-none" />
                    </div>
                    <button onClick={() => { setStartDate(''); setEndDate(getTodayDate()); }} className="text-xl font-bold text-blue-600 hover:underline">重設區間</button>
                </div>

                <div className="flex-1 overflow-auto">
                    {allMissingData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Check className="w-24 h-24 mb-4 text-green-400" />
                            <p className="text-4xl font-bold text-green-600">此區間內全班皆已完成所有作業！</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-4 text-2xl font-bold text-gray-700 w-24 text-center border-r border-gray-300">座號</th>
                                    <th className="px-4 py-4 text-2xl font-bold text-gray-700 w-32 text-center border-r border-gray-300">姓名</th>
                                    <th className="px-4 py-4 text-2xl font-bold text-gray-700 w-32 text-center border-r border-gray-300">缺交數</th>
                                    <th className="px-6 py-4 text-2xl font-bold text-gray-700 text-left">未完成項目明細</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {allMissingData.map((student) => (
                                    <tr key={student.id} className="hover:bg-red-50 transition duration-100">
                                        <td className="px-4 py-4 text-2xl text-gray-900 text-center border-r border-gray-200">{student.id}</td>
                                        <td className="px-4 py-4 text-2xl text-gray-900 font-bold text-center border-r border-gray-200">{student.name[0] + 'O' + student.name.slice(2)}</td>
                                        <td className="px-4 py-4 text-center border-r border-gray-200"><span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-2xl">{student.missingCount}</span></td>
                                        <td className="px-6 py-4 text-xl text-gray-700">
                                            <ul className="grid grid-cols-3 gap-x-4 list-disc list-inside">
    {[...student.missingDetails]
        .sort((a, b) => a.assignment.localeCompare(b.assignment, 'zh-TW') || a.date.localeCompare(b.date))
        .map((detail, idx) => {
            // 💡 建立每筆作業的唯一 Key： 學生ID-日期-作業名稱
            const itemKey = `${student.id}-${detail.date}-${detail.assignment}`;
            const isChecked = selectedItemKeys.has(itemKey);
            
            return (
                <li 
                    key={idx} 
                    className={`flex items-center mb-1 cursor-pointer p-1 rounded transition-all ${isChecked ? 'bg-white' : 'opacity-30 bg-gray-100'}`} 
                    onClick={() => toggleItem(itemKey)}
                >
                    <input 
                        type="checkbox" 
                        checked={isChecked} 
                        readOnly 
                        className="w-6 h-6 mr-2 cursor-pointer accent-blue-600"
                    />
                    <span className={`text-red-600 font-bold mr-2 ${!isChecked ? 'line-through' : ''}`}>
                        {detail.assignment}
                    </span>
                    <span className="text-gray-400 text-lg">
                        ({new Date(detail.date).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})})
                    </span>
                </li>
            );
        })}
</ul>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* --- 列印專用區：會根據篩選結果顯示 --- */}
            {/* --- [新版] 列印專用區：僅顯示勾選的作業並標註日期區間 --- */}
            <div className="hidden print:block w-full h-full bg-white text-black p-4">
                <h1 className="text-4xl font-extrabold text-center mb-6 border-b-4 border-black pb-4">
                    {selectedAcademicYear.includes('114') ? '五年甲班' : '六年甲班'} 訂正作業待補單 ({startDate?.replace(/-/g, '/')} ~ {endDate?.replace(/-/g, '/')})
                </h1>
                
                <div className="flex flex-col gap-8">
                    {allMissingData.map((student) => {
                        // 💡 核心過濾：只篩選出「畫面上還有勾選」的項目
                        const itemsToPrint = student.missingDetails.filter(d => 
                            selectedItemKeys.has(`${student.id}-${d.date}-${d.assignment}`)
                        ).sort((a, b) => a.assignment.localeCompare(b.assignment, 'zh-TW') || a.date.localeCompare(b.date));

                        // 如果該學生所有作業都沒被勾選，則直接跳過，不印他的單子
                        if (itemsToPrint.length === 0) return null;

                        return (
                            <div key={student.id} className="border-2 border-black rounded-2xl p-5 break-inside-avoid shadow-none">
                                <div className="flex flex-col border-b-2 border-gray-400 pb-3 mb-4">
                                    {/* 第一行：左邊姓名，右邊項數 */}
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-4xl font-black">
                                            {student.name[0] + 'O' + student.name.slice(2)} 待補作業清單
                                        </span>
                                        <span className="text-3xl font-bold text-black">
                                            共 {itemsToPrint.length} 項
                                        </span>
                                    </div>

                                    {/* 第二行：統計日期 (獨立一行且靠左) */}
                                    <div className="mt-2 text-left">
                                        <span className="text-xl font-bold text-gray-500">
                                            (統計日期：{startDate?.replace(/-/g, '/')} - {endDate?.replace(/-/g, '/')})
                                        </span>
                                    </div>
                                </div>                                
                                <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                                    {itemsToPrint.map((detail, idx) => (
                                        <div key={idx} className="flex items-start text-xl leading-tight">
                                            {/* 列印出的方框 */}
                                            <div className="w-6 h-6 border-2 border-black mr-2 bg-white mt-1 shrink-0"></div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-black">{detail.assignment}</span>
                                                <span className="text-lg text-gray-600 font-medium">
                                                    ({new Date(detail.date).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})})
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmTitle, confirmColor }) => { 
    const [isAltPressed, setIsAltPressed] = useState(false); 
    useEffect(() => { 
        const handleKeyDown = (e) => { if (e.key === 'Alt') setIsAltPressed(true); }; 
        const handleKeyUp = (e) => { if (e.key === 'Alt') setIsAltPressed(false); }; 
        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); 
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); }; 
    }, []); 
    return ( 
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4"> 
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100"> 
                <h3 className="text-4xl font-bold text-gray-800 mb-4">{title}</h3><p className="text-3xl text-gray-600 mb-6">{message}</p> 
                <div className="flex justify-between gap-4 mt-6"><button onClick={onCancel} className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition duration-150 ease-in-out font-medium text-4xl">取消 (保留資料)</button><button onClick={() => { if (isAltPressed) { onConfirm(); } else { alert(`請按住 Alt 鍵，才能確認執行 ${confirmTitle} 操作！`); } }} disabled={!isAltPressed} className={`flex-1 text-white py-3 rounded-lg transition duration-150 ease-in-out font-medium text-4xl ${confirmColor} ${isAltPressed ? 'hover:brightness-110' : 'bg-red-400 cursor-not-allowed'}`}>{confirmTitle}</button></div><p className="mt-3 text-center text-red-500 text-3xl font-semibold opacity-0">請按住 **Alt 鍵** 才能啟用刪除按鈕！</p> 
            </div> 
        </div> 
    ); 
};

const getTodayDate = () => { const d = new Date(); const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };

const MISSING_COLOR_TIERS = [ { min: 1, max: 3, colors: { bg: 'bg-blue-300', border: 'border-blue-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '1-3項' }, { min: 4, max: 6, colors: { bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-white', countText: 'text-white' }, label: '4-6項' }, { min: 7, max: 9, colors: { bg: 'bg-green-600', border: 'border-green-800', text: 'text-white', countText: 'text-white' }, label: '7-9項' }, { min: 10, max: 12, colors: { bg: 'bg-lime-500', border: 'border-lime-700', text: 'text-gray-900', countText: 'text-gray-900' }, label: '10-12項' }, { min: 13, max: 15, colors: { bg: 'bg-emerald-300', border: 'border-emerald-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '13-15項' }, { min: 16, max: 18, colors: { bg: 'bg-yellow-300', border: 'border-yellow-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '16-18項' }, { min: 19, max: 21, colors: { bg: 'bg-yellow-500', border: 'border-yellow-700', text: 'text-gray-900', countText: 'text-gray-900' }, label: '19-21項' }, { min: 22, max: 24, colors: { bg: 'bg-red-600', border: 'border-red-700', text: 'text-white', countText: 'text-white' }, label: '22-24項' }, { min: 25, max: 27, colors: { bg: 'bg-amber-800', border: 'border-amber-900', text: 'text-white', countText: 'text-white' }, label: '25-27項' }, { min: 28, max: 30, colors: { bg: 'bg-orange-600', border: 'border-orange-800', text: 'text-white', countText: 'text-white' }, label: '28-30項' }, { min: 31, max: 33, colors: { bg: 'bg-pink-300', border: 'border-pink-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '31-33項' }, { min: 34, max: 36, colors: { bg: 'bg-rose-400', border: 'border-rose-600', text: 'text-gray-900', countText: 'text-gray-900' }, label: '34-36項' }, { min: 37, max: 39, colors: { bg: 'bg-fuchsia-500', border: 'border-fuchsia-700', text: 'text-white', countText: 'text-white' }, label: '37-39項' }, { min: 40, max: 42, colors: { bg: 'bg-purple-600', border: 'border-purple-800', text: 'text-white', countText: 'text-white' }, label: '40-42項' }, { min: 43, max: 45, colors: { bg: 'bg-violet-600', border: 'border-violet-800', text: 'text-white', countText: 'text-white' }, label: '43-45項' }, { min: 46, max: 48, colors: { bg: 'bg-violet-300', border: 'border-violet-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '46-48項' }, { min: 49, max: 51, colors: { bg: 'bg-indigo-600', border: 'border-indigo-800', text: 'text-white', countText: 'text-white' }, label: '49-51項' }, { min: 52, max: 54, colors: { bg: 'bg-blue-600', border: 'border-blue-800', text: 'text-white', countText: 'text-white' }, label: '52-54項' }, { min: 55, max: 57, colors: { bg: 'bg-sky-600', border: 'border-sky-800', text: 'text-white', countText: 'text-white' }, label: '55-57項' }, { min: 58, max: 60, colors: { bg: 'bg-teal-800', border: 'border-teal-950', text: 'text-white', countText: 'text-white' }, label: '58-60項' }, { min: 61, max: 63, colors: { bg: 'bg-gray-400', border: 'border-gray-600', text: 'text-gray-900', countText: 'text-gray-900' }, label: '61-63項' }, { min: 64, max: 66, colors: { bg: 'bg-gray-500', border: 'border-gray-700', text: 'text-white', countText: 'text-white' }, label: '64-66項' }, { min: 67, max: 69, colors: { bg: 'bg-gray-700', border: 'border-gray-900', text: 'text-white', countText: 'text-white' }, label: '67-69項' }, { min: 70, max: 72, colors: { bg: 'bg-blue-900', border: 'border-blue-950', text: 'text-white', countText: 'text-white' }, label: '70-72項' }, { min: 73, max: Infinity, colors: { bg: 'bg-black', border: 'border-red-500', text: 'text-white', countText: 'text-white' }, label: '73項+' }, ];

const getMissingColorClasses = (count) => { if (count === 0) return { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-400', countText: 'text-gray-800' }; const tier = MISSING_COLOR_TIERS.find(t => count <= t.max); return tier ? tier.colors : MISSING_COLOR_TIERS[MISSING_COLOR_TIERS.length - 1].colors; };

const MissingColorExplanation = () => { const legendTiers = MISSING_COLOR_TIERS.map(tier => ({ count: tier.label, classes: tier.colors })); return (<div className="mt-8 p-4 sm:p-6 bg-white rounded-xl shadow-xl border border-gray-200"><h3 className="text-4xl font-bold text-gray-800 mb-6 flex items-center"><span className="text-pink-500 text-5xl mr-3">🎨</span>顏色分級說明</h3><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{legendTiers.map((item, index) => (<div key={index} className={`py-3 px-2 rounded-xl text-center cursor-default ${item.classes.bg} ${item.classes.border} border-2 border-b-[6px] flex items-center justify-center`}><p className={`text-2xl font-black ${item.classes.text} leading-tight`}>{item.count}</p></div>))}</div></div>); };

const MonthlyStudentStats = ({ monthlyStats, months }) => { 
    const studentIds = useMemo(() => Object.keys(monthlyStats).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)), [monthlyStats]); 
    if (studentIds.length === 0) return null; 
    
    // 計算月份欄位的寬度百分比，讓表格均分
    const colWidth = 100 / (months.length + 1); 

    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-xl shadow-xl border border-gray-200 max-w-full">
            <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center"><span className="text-5xl mr-3">📊</span><span className="text-4xl">每月繳交狀況統計</span></h2>
            
            {/* 🌟 關鍵修正：父容器設定 max-h 讓其產生內部卷軸 */}
            <div className="w-full relative border border-gray-300 rounded-lg shadow-lg overflow-auto max-h-[80vh]">
                <table className="w-full divide-y divide-gray-300 table-fixed border-collapse">
                    {/* 設定各欄寬度 */}
                    <colgroup>
                        <col style={{ width: `${colWidth}%` }} />
                        {months.map(m => <col key={m.id} style={{ width: `${colWidth}%` }} />)}
                    </colgroup>

                    <thead className="bg-gray-100 sticky top-0 z-[60]">
                        <tr>
                            {/* 🌟 關鍵修正：th 加入 sticky top-0, z-60, 和不透明背景 */}
                            <th className="sticky top-0 left-0 z-[70] px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-700 w-24 border-r border-gray-300 bg-gray-100 shadow-sm">姓名</th>
                            {months.map(month => (
                                <th key={month.id} className={`sticky top-0 z-[60] px-1 py-4 text-3xl font-semibold uppercase tracking-wider text-white ${month.color} break-words shadow-sm`}>{month.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {studentIds.map(studentId => { 
                            const studentData = monthlyStats[studentId]; 
                            if (!studentData) return null; 
                            return (
                                <tr key={studentId} className="hover:bg-gray-50 transition duration-100 group">
                                    {/* 🌟 關鍵修正：姓名 TD 加入 sticky left-0 和不透明背景 */}
                                    <td className="sticky left-0 z-30 px-2 py-4 text-3xl font-semibold text-gray-900 border-r border-gray-300 text-center whitespace-nowrap bg-white group-hover:bg-gray-50 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{studentData.studentName[0] + 'O' + studentData.studentName.slice(2)}</td>
                                    {months.map(month => { 
                                        const stats = studentData.monthStats[month.id]; 
                                        const hasMissing = stats.daysMissing > 0; 
                                        const hasLate = stats.daysLate > 0; 
                                        const hasTotal = stats.totalDays > 0; 
                                        const hasCompletedOnly = !hasMissing && !hasLate && hasTotal; 
                                        return (
                                            <td key={month.id} className={`px-1 py-4 text-center text-2xl sm:text-3xl ${hasMissing ? 'bg-red-100' : (hasLate ? 'bg-yellow-100' : (hasCompletedOnly ? 'bg-green-100' : 'bg-white'))}`}>
                                                {hasTotal ? (
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                        <span className="text-green-700 whitespace-nowrap">完成:<span className="inline-block w-8 text-right">{stats.daysCompleted}</span></span>
                                                        <span className={`${hasLate ? 'font-bold text-yellow-600' : 'text-gray-400'} whitespace-nowrap`}>遲交:<span className="inline-block w-8 text-right">{stats.daysLate}</span></span>
                                                        <span className={`${hasMissing ? 'font-bold text-red-600' : 'text-gray-400'} whitespace-nowrap`}>缺交:<span className="inline-block w-8 text-right">{stats.daysMissing}</span></span>
                                                    </div>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                        ); 
                                    })}
                                </tr>
                            ); 
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    ); 
};

const MissingDetailsModal = ({ student, missingStats, onClose, handleDeleteStudentGlobalData, db, userId, allAssignmentsByDate, setAlertMessage, isOffline, authMode, updateBankBalance, setRewardState }) => { 
    const [selectedItemIds, setSelectedItemIds] = useState([]); 
    const stat = missingStats.find(s => s.id === student.id); 
    const hasMissingItems = stat && stat.missingCount > 0; 
    const { missingCount, name } = stat || { missingCount: 0, missingDetails: [], name: student.name }; 
    const colorClasses = getMissingColorClasses(missingCount); 
    const detailedMissingItems = useMemo(() => { 
        const items = []; 
        Object.keys(allAssignmentsByDate).forEach(date => { 
            (allAssignmentsByDate[date] || []).forEach(assignment => { 
                if (assignment.submissionStatus[student.id] === false) { 
                    items.push({ date: date, assignmentName: assignment.assignmentName, assignmentId: assignment.id }); 
                } 
            }); 
        }); return items.sort((a, b) => a.assignmentName.localeCompare(b.assignmentName, 'zh-TW') || a.date.localeCompare(b.date));
    }, [allAssignmentsByDate, student.id]); 
    const numColumns = 4; 
    const columns = useMemo(() => { 
        if (detailedMissingItems.length === 0) return []; 
        const itemsPerColumn = Math.ceil(detailedMissingItems.length / numColumns); 
        return Array.from({ length: numColumns }, (_, colIndex) => { const start = colIndex * itemsPerColumn; return detailedMissingItems.slice(start, start + itemsPerColumn); }); 
    }, [detailedMissingItems]); 
    const handleToggleSelect = useCallback((assignmentId) => { setSelectedItemIds(prev => prev.includes(assignmentId) ? prev.filter(id => id !== assignmentId) : [...prev, assignmentId]); }, []); 
    const handleToggleSelectAll = useCallback(() => { if (selectedItemIds.length === detailedMissingItems.length) { setSelectedItemIds([]); } else { setSelectedItemIds(detailedMissingItems.map(item => item.assignmentId)); } }, [selectedItemIds.length, detailedMissingItems]); 
    const handleBatchDeleteSelectedItems = useCallback(async (e) => { 
        if (selectedItemIds.length === 0) { alert("請先勾選至少一項要標記為『已補交』的作業紀錄。"); return; } 
        if (!e.ctrlKey && !e.metaKey) { return; } 
        setAlertMessage(null); 
        const bronzeReward = selectedItemIds.length * 10;
        updateBankBalance(student.id, 0, 0, bronzeReward);
        setRewardState({ type: 'BRONZE' });
        if (isOffline) { 
            setAlertMessage(`[離線模式] 成功將 ${selectedItemIds.length} 項作業標記為「已補交」（記憶體暫存）。`); 
            setSelectedItemIds([]); 
            onClose(); return; 
        } 
        try { 
            const path = getAssignmentCollectionPath(userId); 
            const batch = writeBatch(db); 
            selectedItemIds.forEach(assignmentId => { 
                const docRef = doc(db, path, assignmentId); 
                batch.set(docRef, { submissionStatus: { [student.id]: 'late' }, makeupClaimed: { [student.id]: true } }, { merge: true }); 
            }); 
            await batch.commit(); 
            setAlertMessage(`成功將 ${selectedItemIds.length} 項作業標記為「已補交」，獲得 ${bronzeReward} 銅幣。`); 
            setSelectedItemIds([]); 
            onClose(); 
        } catch (error) { console.error("Batch delete failed:", error); setAlertMessage("批次標記已訂正失敗。"); } 
    }, [selectedItemIds, db, userId, student.id, onClose, setAlertMessage, isOffline, authMode, updateBankBalance, setRewardState]); 
    if (!hasMissingItems) return null; 
    const batchButtonTitle = authMode === 'ADMIN' ? "按住 Control (Ctrl/Cmd) 鍵並點擊以將選定的項目標記為已補交 (遲繳)" : undefined; 
    
    return ( 
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-2"> 
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full transform transition-all duration-300 scale-100 max-h-[95vh] flex flex-col"> 
                <div className="relative border-b pb-2 mb-3"> 
                    <h3 className="text-5xl font-bold text-gray-800 text-center">{name} 的未訂正作業</h3> 
                    <button onClick={onClose} className="absolute -top-2 -right-2 text-gray-500 hover:text-gray-800 text-4xl p-2 rounded-full"> <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> </button> 
                </div> 
                <div className={`p-4 rounded-xl mb-4 shadow-md border-l-8 ${colorClasses.bg} ${colorClasses.border} text-center`}> <div className={`text-4xl font-semibold ${colorClasses.text}`}>累積總計：<span className={`ml-2 font-black ${colorClasses.countText} text-5xl`}>{missingCount}</span> 次</div> </div> 
                <div className="flex justify-between items-center mb-2 border-b pb-2"> <h4 className="text-3xl font-bold text-gray-800">詳細未訂正項目 ({detailedMissingItems.length} 筆紀錄):</h4> <button onClick={handleToggleSelectAll} className="text-2xl font-medium text-blue-600 hover:text-blue-800 transition">{selectedItemIds.length === detailedMissingItems.length ? '取消全選' : '全選'}</button> </div> 
                <div className="flex-1 overflow-y-auto"> 
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4"> 
                        {columns.map((columnItems, colIndex) => ( <ul key={colIndex} className={`divide-y divide-gray-200 rounded-lg ${colIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}> {columnItems.map((item) => { const isSelected = selectedItemIds.includes(item.assignmentId); return ( <li key={item.assignmentId} className={`p-3 flex items-center gap-3 text-3xl text-gray-700 cursor-pointer transition duration-100 ${isSelected ? 'bg-blue-200' : 'hover:bg-blue-50'}`} onClick={() => handleToggleSelect(item.assignmentId)}> <input className="h-7 w-7 text-blue-600 rounded cursor-pointer" onClick={(e) => e.stopPropagation()} /> <span className="font-medium text-gray-900 w-32">{item.date}</span> <span className="flex-1">{item.assignmentName}</span> </li> ); })} </ul> ))} 
                    </div> 
                </div> 
                <div className="mt-4 pt-4 border-t border-green-300"> 
                    <button onClick={handleBatchDeleteSelectedItems} disabled={selectedItemIds.length === 0} className={`w-full py-3 rounded-lg transition duration-150 ease-in-out font-medium text-3xl flex items-center justify-center shadow-lg ${selectedItemIds.length === 0 ? 'bg-gray-400 cursor-not-allowed text-gray-200' : 'bg-green-600 hover:bg-green-700 text-white'}`} title={batchButtonTitle}> <span className="text-5xl mr-2">⚠️</span> 批次標記 {selectedItemIds.length} 項為「已補交 (遲繳)」 </button> 
                </div> 
                <button onClick={onClose} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out font-medium text-3xl">關閉</button> 
            </div> 
        </div> 
    ); 
};

const AssignmentHeader = ({ assignment, isGlobalLoading, handleDeleteAssignment, handleEditSave, handleMoveAssignment, setEditingAssignmentId, setEditingAssignmentName, editingAssignmentId, editingAssignmentName, authMode }) => { const isEditing = editingAssignmentId === assignment.id; const [{ isDragging }, drag] = useDrag({ type: ItemTypes.ASSIGNMENT, item: { id: assignment.id, type: ItemTypes.ASSIGNMENT }, collect: (monitor) => ({ isDragging: monitor.isDragging() }) }); const [, drop] = useDrop({ accept: ItemTypes.ASSIGNMENT, hover: (draggedItem) => { if (draggedItem.id !== assignment.id) { handleMoveAssignment(draggedItem.id, assignment.id); draggedItem.id = assignment.id; } } }); const handleEditStart = useCallback(() => { if (isGlobalLoading) return; if (authMode !== 'ADMIN') { alert("只有老師可以修改作業名稱。"); return; } setEditingAssignmentId(assignment.id); setEditingAssignmentName(assignment.assignmentName); }, [assignment.id, assignment.assignmentName, setEditingAssignmentId, setEditingAssignmentName, isGlobalLoading, authMode]); const handleLocalEditSave = useCallback(() => { if (!isEditing || !editingAssignmentName.trim() || isGlobalLoading) return; handleEditSave(assignment.id, editingAssignmentName).finally(() => { setEditingAssignmentId(null); setEditingAssignmentName(''); }); }, [assignment.id, editingAssignmentName, handleEditSave, isEditing, setEditingAssignmentId, setEditingAssignmentName, isGlobalLoading]); const handleDeleteClick = useCallback((e) => { handleDeleteAssignment(assignment.id, assignment.assignmentName, e.ctrlKey || e.metaKey); }, [assignment.id, assignment.assignmentName, handleDeleteAssignment]); return ( <th ref={(node) => drag(drop(node))} style={{ opacity: isDragging ? 0.4 : 1, cursor: isGlobalLoading ? 'default' : 'grab' }} className={`px-2 py-4 text-3xl text-center font-semibold uppercase tracking-wider text-gray-800 transition duration-100 ease-in-out sticky top-0 z-50 bg-gray-100 break-words`}> <div className="flex flex-col items-center justify-center group relative min-w-[150px]"> <div className={`relative p-2 rounded-xl shadow-md transition duration-100 border-2 border-transparent ${isEditing ? 'ring-4 ring-blue-400 bg-white' : 'hover:bg-gray-50 bg-white'}`} onDoubleClick={handleEditStart}> {isEditing ? ( <input type="text" value={editingAssignmentName} onChange={(e) => setEditingAssignmentName(e.target.value)} onBlur={handleLocalEditSave} onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } else if (e.key === 'Escape') { setEditingAssignmentId(null); setEditingAssignmentName(''); } }} className="font-bold text-center text-3xl w-full focus:outline-none bg-transparent" autoFocus disabled={isGlobalLoading} /> ) : <span className={`font-bold ${isGlobalLoading ? 'cursor-default' : 'cursor-pointer'} break-words`}>{assignment.assignmentName}</span>} {!isEditing && authMode === 'ADMIN' && ( <button onClick={handleDeleteClick} disabled={isGlobalLoading} className="absolute -top-3 -right-3 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition duration-150 p-1 rounded-full bg-white shadow-lg"> <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> </button> )} </div> </div> </th> ); };

const DateTab = ({ date, isSelected, onClick, onEdit, authMode }) => { const formattedDate = new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }); const handleDoubleClick = (e) => { if (authMode === 'ADMIN' && isSelected && onEdit) { e.stopPropagation(); onEdit(); } }; return ( <div className="relative group"> <button onClick={() => onClick(date)} onDoubleClick={handleDoubleClick} className={`px-5 py-3 text-4xl font-semibold rounded-lg transition duration-150 ease-in-out shadow-md whitespace-nowrap flex items-center gap-2 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} title={authMode === 'ADMIN' && isSelected ? "雙擊以修改日期" : ""}> {formattedDate} {isSelected && authMode === 'ADMIN' && ( <span onClick={(e) => { e.stopPropagation(); onEdit(); }} className="inline-flex items-center justify-center p-1 bg-white/20 rounded-full hover:bg-white/40 cursor-pointer transition-colors" title="點擊修改日期"> <Pencil className="w-4 h-4 text-white" /> </span> )} </button> </div> ); };

const ProtectedButton = ({ onClick, disabled, className, title, children }) => { return ( <button onClick={onClick} disabled={disabled} className={`${className} transition duration-150`} title={title}>{children}</button> ); };

// --- 資料 Hooks 與 App 主邏輯 ---
const useStudents = (db, isOffline) => {
   const [students, setStudents] = useState(DEFAULT_STUDENTS);
   const [loadingStudents, setLoadingStudents] = useState(true);
   const getStudentCollectionPath = () => `/artifacts/${appId}/public/data/students`;
   useEffect(() => {
       if (isOffline) { setStudents(DEFAULT_STUDENTS); setLoadingStudents(false); return; }
       if (!db) return;
       setLoadingStudents(true);
       const q = query(collection(db, getStudentCollectionPath()));
       const unsubscribe = onSnapshot(q, (snapshot) => {
           const loadedStudents = [];
           snapshot.forEach((doc) => { loadedStudents.push({ ...doc.data(), id: doc.id }); });
           if (loadedStudents.length > 0) {
               loadedStudents.sort((a, b) => parseInt(a.id) - parseInt(b.id));
               setStudents(loadedStudents);
           } else { setStudents(DEFAULT_STUDENTS); }
           setLoadingStudents(false);
       }, (error) => { console.error("讀取學生名單失敗:", error); setStudents(DEFAULT_STUDENTS); setLoadingStudents(false); });
       return () => unsubscribe();
   }, [db, isOffline]);
   return { students, loadingStudents };
};

const useCategories = (db, userId, isAuthReady, setAlertMessage, isOffline, students) => { 
   const [categories, setCategories] = useState([]); 
   const [loadingCategories, setLoadingCategories] = useState(true); 
   const getInitialSubmissionStatus = useMemo(() => students.reduce((status, student) => { status[student.id] = true; return status; }, {}), [students]); 
   const initializeCategories = useCallback(async (db, userId) => { if (!db || !userId) return; setLoadingCategories(true); const path = getCategoryCollectionPath(); const categoriesCollection = collection(db, path); try { const snapshot = await getDocs(categoriesCollection); if (snapshot.empty) { const batchPromises = INITIAL_CATEGORIES.map(cat => { const newDocRef = doc(categoriesCollection); return setDoc(newDocRef, { ...cat, createdAt: Timestamp.now() }); }); await Promise.all(batchPromises); } } catch (e) { console.error("Error initializing categories:", e); } setLoadingCategories(false); }, []); 
   useEffect(() => { if (isOffline) { setCategories(INITIAL_CATEGORIES.map((cat, i) => ({ ...cat, id: `offline-cat-${i}` }))); setLoadingCategories(false); return; } if (isAuthReady && db && userId) { initializeCategories(db, userId); const path = getCategoryCollectionPath(); const unsubscribe = onSnapshot(collection(db, path), (snapshot) => { const loadedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); loadedCategories.sort((a, b) => (a.order || 0) - (b.order || 0)); setCategories(loadedCategories); setLoadingCategories(false); }, (e) => { console.error("Error fetching categories:", e); if (e.code !== 'permission-denied') { setAlertMessage("讀取作業項目清單時發生錯誤。"); } setLoadingCategories(false); }); return () => unsubscribe(); } }, [isAuthReady, db, userId, setAlertMessage, initializeCategories, isOffline]);
   const addCategory = useCallback(async (name) => { const trimmedName = name.trim(); if (!trimmedName) return false; if (categories.some(c => c.name === trimmedName)) { setAlertMessage(`科目模板「${trimmedName}」已經存在。`); return false; } if (isOffline) { const newOrder = categories.length > 0 ? categories[categories.length - 1].order + 1 : 0; setCategories(prev => [...prev, { id: `offline-cat-${Date.now()}`, name: trimmedName, order: newOrder }]); return true; } if (!db || !userId) return false; const newDocRef = doc(collection(db, getCategoryCollectionPath())); const newOrder = categories.length > 0 ? categories[categories.length - 1].order + 1 : 0; try { await setDoc(newDocRef, { name: trimmedName, order: newOrder, createdAt: Timestamp.now() }); return true; } catch (e) { console.error("Error adding category:", e); setAlertMessage("新增科目模板失敗。"); return false; } }, [db, userId, categories, setAlertMessage, isOffline]); const deleteCategory = useCallback(async (categoryId, categoryName) => { if (!window.confirm(`確定要刪除科目模板「${categoryName}」嗎？此操作只會將該科目從「自動新增」清單中移除。`)) return; if (isOffline) { setCategories(prev => prev.filter(c => c.id !== categoryId)); setAlertMessage(`科目模板「${categoryName}」已刪除 (離線)。`); return; } if (!db || !userId) return; try { await deleteDoc(doc(db, getCategoryCollectionPath(), categoryId)); setAlertMessage(`科目模板「${categoryName}」已刪除。`); } catch (e) { console.error("Error deleting category:", e); setAlertMessage("刪除科目模板失敗。"); } }, [db, userId, setAlertMessage, isOffline]); const editCategory = useCallback(async (categoryId, currentName, newName) => { const trimmedName = newName.trim(); if (!trimmedName || trimmedName === currentName) return; if (categories.some(c => c.name === trimmedName && c.id !== categoryId)) { setAlertMessage(`科目模板「${trimmedName}」已經存在。`); return; } if (isOffline) { setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name: trimmedName } : c)); return; } if (!db || !userId) return; try { await setDoc(doc(db, getCategoryCollectionPath(), categoryId), { name: trimmedName }, { merge: true }); setAlertMessage(`科目模板名稱已從「${currentName}」更新為「${trimmedName}」。`); } catch (e) { console.error("Error editing category:", e); setAlertMessage("編輯科目模板失敗。"); } }, [db, userId, categories, setAlertMessage, isOffline]); const moveCategory = useCallback(async (dragId, hoverId) => { const dragIndex = categories.findIndex(c => c.id === dragId); const hoverIndex = categories.findIndex(c => c.id === hoverId); if (dragIndex === -1 || hoverIndex === -1) return; const dragCategory = categories[dragIndex]; const hoverCategory = categories[hoverIndex]; if (isOffline) { const newCategories = [...categories]; newCategories[dragIndex] = { ...dragCategory, order: hoverCategory.order }; newCategories[hoverIndex] = { ...hoverCategory, order: dragCategory.order }; newCategories.sort((a, b) => a.order - b.order); setCategories(newCategories); return; } if (!db || !userId) return; const batch = writeBatch(db); const path = getCategoryCollectionPath(); batch.set(doc(db, path, dragCategory.id), { order: hoverCategory.order }, { merge: true }); batch.set(doc(db, path, hoverCategory.id), { order: dragCategory.order }, { merge: true }); try { await batch.commit(); } catch (e) { console.error("Error moving category:", e); setAlertMessage("調整項目順序失敗。"); } }, [db, userId, categories, setAlertMessage, isOffline]); return { categories, loadingCategories, addCategory, deleteCategory, editCategory, moveCategory, getInitialSubmissionStatus }; };

// --- [主程式] App ---
const App = () => {
  // 💡 設定分段日期 (例如第一次段考結束日)
  // 在此日期「之後」的算新進度，在此日期「之前(含)」的算舊累計
  const [cutOffDate, setCutOffDate] = useState('2026-04-14');
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [allAssignmentsByDate, setAllAssignmentsByDate] = useState({});
  const [selectedDisplayDate, setSelectedDisplayDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editingAssignmentName, setEditingAssignmentName] = useState('');
  const [missingStudent, setMissingStudent] = useState(null);
  const [newAssignmentDate, setNewAssignmentDate] = useState(getTodayDate());
  const [authTimeout, setAuthTimeout] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('GUEST');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [showAllMissingModal, setShowAllMissingModal] = useState(false);
  const [focusedStudentId, setFocusedStudentId] = useState(null);
const [showBankModal, setShowBankModal] = useState(false);
  const [rewardState, setRewardState] = useState(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('115');
  const [dashboardStudent, setDashboardStudent] = useState(null);
  const [syncData, setSyncData] = useState(null); // [新增] 用於存放待同步的日誌任務數據
  // 新增：全域廣播相關狀態
  const [broadcastData, setBroadcastData] = useState(null);
  const [dismissedBroadcastTime, setDismissedBroadcastTime] = useState(null);
  const [showBroadcastEditor, setShowBroadcastEditor] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState("");
  const [bcBgColor, setBcBgColor] = useState("bg-white");
  const [bcTextColor, setBcTextColor] = useState("text-slate-800");
  const [bcFontSize, setBcFontSize] = useState(80);
  const [bcAlign, setBcAlign] = useState("text-center"); // 預設置中
  const [bcBiauKai, setBcBiauKai] = useState(false);
  
  const { students, loadingStudents } = useStudents(db, isOffline);
  const { bankData, updateBankBalance, setBankBalancedDirectly, setBankData } = useStudentBank(db, isAuthReady, isOffline, students, selectedAcademicYear);
  const dailySettlements = useDailySettlements(db, isAuthReady, isOffline);
  const { categories, loadingCategories, addCategory, deleteCategory, editCategory, moveCategory, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students);
  // --- [新增] 任務同步核心邏輯：抓取前一個上課日的航海日誌 ---
  const syncFromVoyageLog = useCallback(async (targetDate) => {
    if (!db || isOffline) return null;
    try {
      const q = query(
        collection(db, "announcements"),
        where("date", "<", targetDate),
        orderBy("date", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;

      const logData = snap.docs[0].data();
      const rawItems = logData.items || [];

      const candidates = rawItems
        .map(item => typeof item === 'string' ? item : (item.text || ""))
        .filter(text => {
          const t = text.trim();
          return t !== "" && !t.startsWith('※') && !t.startsWith(' ');
        });

      return candidates.length > 0 ? { date: snap.docs[0].id, candidates } : null;
    } catch (e) {
      console.error("同步失敗:", e);
      return null;
    }
  }, [db, isOffline]);

  // --- [新增] 執行寫入作業的通用邏輯 ---
  const executeCreateAssignments = useCallback(async (date, assignmentNames) => {
    setLoading(true);
    const dObj = new Date(date);
    const mStr = String(dObj.getMonth() + 1).padStart(2, '0');
    setSelectedSemester(mStr >= '02' && mStr <= '07' ? 'S2' : 'S1');
    setSelectedMonth(mStr);

    const assignmentsToCreate = assignmentNames.map((name, idx) => ({
      assignmentName: name,
      order: idx,
      assignmentDate: date,
      submissionStatus: getInitialSubmissionStatus, 
      makeupClaimed: {},
      createdAt: serverTimestamp()
    }));

    if (isOffline) {
      const newItems = assignmentsToCreate.map((a, i) => ({ ...a, id: `offline-${Date.now()}-${i}`, createdAt: new Date().toISOString() }));
      setAllAssignmentsByDate(prev => ({ ...prev, [date]: newItems }));
    } else {
      const batch = writeBatch(db);
      const path = getAssignmentCollectionPath();
      assignmentsToCreate.forEach(data => {
        batch.set(doc(collection(db, path)), data);
      });
      await batch.commit();
    }
    setSelectedDisplayDate(date);
    setLoading(false);
  }, [db, isOffline, getInitialSubmissionStatus]);
// --- 學年度與學期設定 (支援五年級與六年級切換) ---
  const ACADEMIC_YEARS = {
    '115': { label: '115 學年度 (六年級)', startYear: 2026, endYear: 2027 },
    '114': { label: '114 學年度 (五年級)', startYear: 2025, endYear: 2026 }
  };

  const academicYear = selectedAcademicYear;
  const currentYearConfig = ACADEMIC_YEARS[selectedAcademicYear] || ACADEMIC_YEARS['115'];
  const startYear = currentYearConfig.startYear;
  const endYear = currentYearConfig.endYear;

  const semesters = [
    { id: 'S1', name: `上學期 (${startYear}/8 - ${endYear}/1)`, startMonth: '08', endMonth: '01', startYear: startYear, endYear: endYear },
    { id: 'S2', name: `下學期 (${endYear}/2 - ${endYear}/7)`, startMonth: '02', endMonth: '07', startYear: endYear, endYear: endYear }
  ];
  const [selectedSemester, setSelectedSemester] = useState('S1');
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [unlockClicks, setUnlockClicks] = useState({});
  // 當切換學年度或學期時，自動更新預設選中的月份
  useEffect(() => {
    if (selectedSemester === 'S1') {
      setSelectedMonth('08');
    } else {
      setSelectedMonth('02');
    }
  }, [selectedAcademicYear, selectedSemester]);
  const months = useMemo(() => [ { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' }, { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' }, { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' }, { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' }, { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' }, { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' }, { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' }, { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' }, ], []);

  useEffect(() => { const timer = setTimeout(() => { if (loading) setAuthTimeout(true); }, 3000); if (!firebaseConfig) { console.error("Firebase configuration is missing."); setError("無法載入 Firebase 設定。請檢查環境配置。"); setLoading(false); return; } try { const app = initializeApp(firebaseConfig); const firestore = getFirestore(app); const firebaseAuth = getAuth(app); setDb(firestore); setAuth(firebaseAuth); const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => { if (user) { setUserId(user.uid); setIsAuthReady(true); setIsAuthenticated(true); if (user.isAnonymous) { setAuthMode('GUEST'); } else { setAuthMode('ADMIN'); } } else { setIsAuthenticated(false); setAuthMode('GUEST'); } setLoadingLogin(false); }); return () => { unsubscribe(); clearTimeout(timer); }; } catch (e) { console.error("Firebase initialization failed:", e); setError("初始化失敗：" + e.message); setLoading(false); } }, []);

  const handleGoOffline = () => { setIsOffline(true); setUserId('guest_user'); setIsAuthReady(true); setLoading(false); setIsAuthenticated(true); setAuthMode('GUEST'); };
  const handleAdminLogin = async (email, password) => { setLoadingLogin(true); setLoginError(''); try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { console.error("Login failed", error); if (error.code === 'auth/invalid-email') { setLoginError('Email 格式不正確'); } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { setLoginError('帳號或密碼錯誤'); } else if (error.code === 'auth/too-many-requests') { setLoginError('嘗試次數過多，請稍後再試'); } else { setLoginError('登入失敗：' + error.message); } setLoadingLogin(false); } };
  const handleGuestLogin = async () => { setLoadingLogin(true); setLoginError(''); try { await signInAnonymously(auth); } catch (error) { console.error("Anonymous login failed", error); setLoginError('訪客登入失敗，請稍後再試。'); setLoadingLogin(false); } };
  const handleLogout = async () => { try { await signOut(auth); setIsAuthenticated(false); setAuthMode('GUEST'); } catch (e) { console.error("Logout failed", e); } };

  // 新增：獨立的全域廣播雷達監聽器
  useEffect(() => {
    if (!db) return;
    const unsubscribeBroadcast = onSnapshot(doc(db, "broadcasts", "current"), (snap) => {
      if (snap.exists()) {
        setBroadcastData(snap.data());
      } else {
        setBroadcastData(null);
      }
    });
    return () => unsubscribeBroadcast();
  }, [db]);

  useEffect(() => { if (isOffline) { setLoading(false); return; } if (!isAuthReady || !db || !userId) return; const path = getAssignmentCollectionPath(); const assignmentsCollection = collection(db, path); const currentSemData = semesters.find(s => s.id === selectedSemester); let q; if (currentSemData) { const startDate = `${currentSemData.startYear}-${currentSemData.startMonth}-01`; const endDate = `${currentSemData.endYear}-${currentSemData.endMonth}-31`; q = query( assignmentsCollection, where("assignmentDate", ">=", startDate), where("assignmentDate", "<=", endDate) ); } else { q = query(assignmentsCollection); } const unsubscribe = onSnapshot(q, (snapshot) => { const groupedData = {}; snapshot.docs.forEach(doc => { const data = doc.data(); const date = data.assignmentDate; if (date) { if (!groupedData[date]) { groupedData[date] = []; } groupedData[date].push({ id: doc.id, assignmentName: data.assignmentName, order: data.order ?? 999, submissionStatus: data.submissionStatus || {}, completedAt: data.completedAt || {}, makeupClaimed: data.makeupClaimed || {}, createdAt: data.createdAt?.toDate().toISOString() }); } }); setAllAssignmentsByDate(groupedData); if (!loadingCategories) { setLoading(false); } }, (e) => { console.error("Error fetching assignments:", e); if (e.code === 'permission-denied') { console.warn("Permission denied (transient)"); } else { setAlertMessage("讀取資料時發生錯誤，請稍後再試。"); setAuthTimeout(true); } setLoading(false); }); return () => unsubscribe(); }, [isAuthReady, db, userId, loadingCategories, isOffline, selectedSemester]);
  const assignmentsForSelectedDate = useMemo(() => { const assignments = allAssignmentsByDate[selectedDisplayDate] || []; return assignments.sort((a, b) => a.order - b.order); }, [allAssignmentsByDate, selectedDisplayDate]);
  const assignmentMap = useMemo(() => { return assignmentsForSelectedDate.reduce((acc, assignment) => { acc[assignment.assignmentName] = { id: assignment.id, submissionStatus: assignment.submissionStatus, makeupClaimed: assignment.makeupClaimed }; return acc; }, {}); }, [assignmentsForSelectedDate]);
  const filteredMonths = useMemo(() => { const currentSemesterData = semesters.find(s => s.id === selectedSemester); if (!currentSemesterData) return months; return months.filter(m => m.semester === selectedSemester); }, [months, selectedSemester, semesters]);
  useEffect(() => { if (filteredMonths.length > 0) { const currentMonthExists = filteredMonths.some(m => m.id === selectedMonth); if (!currentMonthExists) { setSelectedMonth(filteredMonths[0].id); } } }, [selectedSemester, filteredMonths, selectedMonth]);
  
  const availableDates = useMemo(() => { return Object.keys(allAssignmentsByDate).sort(); }, [allAssignmentsByDate]);
  const displayedDates = useMemo(() => { const dates = Object.keys(allAssignmentsByDate).sort(); const filteredByMonth = dates.filter(date => { const dateMonth = date.substring(5, 7); return dateMonth === selectedMonth; }).sort(); return filteredByMonth; }, [allAssignmentsByDate, selectedMonth]);
  
  useEffect(() => { 
      const currentSelectedMonth = selectedDisplayDate.substring(5, 7);
      if (currentSelectedMonth !== selectedMonth) {
          if (displayedDates.length > 0) { 
              setSelectedDisplayDate(displayedDates[displayedDates.length - 1]); 
          } else { 
              const currentSem = semesters.find(s => s.id === selectedSemester);
              const year = (selectedMonth >= '08') ? currentSem?.startYear : currentSem?.endYear;
              if (year) setSelectedDisplayDate(`${year}-${selectedMonth.padStart(2, '0')}-01`);
          } 
      }
  }, [displayedDates, selectedMonth, semesters, selectedSemester]); 

  const studentMissingStats = useMemo(() => {
    const stats = students.map(student => ({ 
      id: student.id, 
      name: student.name, 
      currentMissingCount: 0, // 段考後的
      legacyMissingCount: 0,  // 段考前的
      missingCount: 0,        // 總數 (保留此欄位以相容舊有的點擊功能)
      missingDetails: [] 
    }));

    Object.keys(allAssignmentsByDate).forEach(date => {
      const assignmentsOnDate = allAssignmentsByDate[date] || [];
      assignmentsOnDate.forEach(assignment => {
        const submissionStatus = assignment.submissionStatus || {};
        students.forEach((student, index) => {
          if (submissionStatus[student.id] === false) {
            // 💡 根據日期判斷是「目前的」還是「前次累計」
            if (date > cutOffDate) {
              stats[index].currentMissingCount += 1;
            } else {
              stats[index].legacyMissingCount += 1;
            }
            // 同時記錄總數與明細
            stats[index].missingCount += 1;
            stats[index].missingDetails.push({ date: date, assignment: assignment.assignmentName });
          }
        });
      });
    });
    // 優先以「新進度 (current)」欠最多的排前面
    return stats.sort((a, b) => b.currentMissingCount - a.currentMissingCount);
  }, [allAssignmentsByDate, students, cutOffDate]);
  const monthlyStudentStats = useMemo(() => { const stats = {}; students.forEach(student => { stats[student.id] = { studentName: student.name, monthStats: {} }; months.forEach(month => { stats[student.id].monthStats[month.id] = { daysCompleted: 0, daysLate: 0, daysMissing: 0, totalDays: 0 }; }); }); Object.keys(allAssignmentsByDate).forEach(date => { const monthId = date.substring(5, 7); const assignmentsOnDate = allAssignmentsByDate[date] || []; if (assignmentsOnDate.length === 0) return; students.forEach(student => { if (stats[student.id].monthStats[monthId]) { let worstStatusOfDay = 'true'; for (const assignment of assignmentsOnDate) { const status = assignment.submissionStatus[student.id]; if (status === false) { worstStatusOfDay = 'false'; break; } if (status === 'late') { worstStatusOfDay = 'late'; } } stats[student.id].monthStats[monthId].totalDays++; if (worstStatusOfDay === 'false') { stats[student.id].monthStats[monthId].daysMissing++; } else if (worstStatusOfDay === 'late') { stats[student.id].monthStats[monthId].daysLate++; } else { stats[student.id].monthStats[monthId].daysCompleted++; } } }); }); return stats; }, [allAssignmentsByDate, months, students]);
  
  const handleNewAssignmentDateChange = (e) => { setNewAssignmentDate(e.target.value); };
  
// --- [已優化] 修改後的新增日期邏輯：優先偵測航海日誌 ---
  const handleAddNewDate = useCallback(async () => {
    if (!newAssignmentDate) return;
    if (allAssignmentsByDate[newAssignmentDate]) { 
      alert("該日期已存在，請直接在標籤中選擇。"); 
      return; 
    }
    
    setLoading(true);
    // 嘗試抓取日誌
    const syncResult = await syncFromVoyageLog(newAssignmentDate);
    setLoading(false);

    if (syncResult) {
      // 偵測到日誌，開啟勾選視窗
      setSyncData({ targetDate: newAssignmentDate, ...syncResult });
    } else {
      // 找不到日誌，直接套用原本的「科目模板」名稱
      await executeCreateAssignments(newAssignmentDate, categories.map(c => c.name));
      setAlertMessage(`找不到前日日誌，已自動套用預設科目模板。`);
    }
  }, [newAssignmentDate, allAssignmentsByDate, syncFromVoyageLog, categories, executeCreateAssignments]);

  const handleAddNewAssignment = useCallback(async () => {
      if (!selectedDisplayDate) { alert("請先選擇或新增一個日期。"); return; }
      
      const name = "新增作業";
      const currentAssignments = assignmentsForSelectedDate || [];
      const maxOrder = currentAssignments.reduce((max, item) => Math.max(max, item.order || 0), -1);
      const newOrder = maxOrder + 1;

      if (isOffline) { 
          const newId = `offline-assign-${Date.now()}`; 
          const newAssign = { id: newId, assignmentName: name, assignmentDate: selectedDisplayDate, order: newOrder, submissionStatus: getInitialSubmissionStatus, makeupClaimed: {}, createdAt: new Date().toISOString() }; 
          setAllAssignmentsByDate(prev => { 
              const current = prev[selectedDisplayDate] || []; 
              return { ...prev, [selectedDisplayDate]: [...current, newAssign] }; 
          }); 
          return; 
      }
      
      if (!db || !userId) return; 
      setLoading(true);
      try { 
          const collectionRef = collection(db, getAssignmentCollectionPath()); 
          await setDoc(doc(collectionRef), { 
              assignmentName: name, 
              assignmentDate: selectedDisplayDate, 
              order: newOrder, 
              submissionStatus: getInitialSubmissionStatus, 
              makeupClaimed: {}, 
              createdAt: serverTimestamp() 
          }); 
      } catch (e) { 
          console.error("Error adding assignment:", e); 
          setAlertMessage("新增作業失敗。"); 
      } finally { 
          setLoading(false); 
      }
  }, [selectedDisplayDate, isOffline, assignmentsForSelectedDate, getInitialSubmissionStatus, db, userId]);

  const handleDeleteAssignment = useCallback(async (id, name, force) => {
      if (authMode !== 'ADMIN' && !isOffline) return; if (!force && !window.confirm(`確定要刪除作業「${name}」嗎？`)) return;
      if (isOffline) { setAllAssignmentsByDate(prev => ({ ...prev, [selectedDisplayDate]: prev[selectedDisplayDate].filter(a => a.id !== id) })); return; }
      try { await deleteDoc(doc(db, getAssignmentCollectionPath(), id)); } catch (e) { console.error("Delete failed:", e); }
  }, [authMode, isOffline, db, selectedDisplayDate]);

  const handleEditAssignmentName = useCallback(async (id, newName) => {
      if (isOffline) { setAllAssignmentsByDate(prev => ({ ...prev, [selectedDisplayDate]: prev[selectedDisplayDate].map(a => a.id === id ? { ...a, assignmentName: newName } : a) })); return; }
      const docRef = doc(db, getAssignmentCollectionPath(), id); await setDoc(docRef, { assignmentName: newName }, { merge: true });
  }, [isOffline, db, selectedDisplayDate]);

  const handleMoveAssignment = useCallback(async (dragId, hoverId) => {
      const items = [...assignmentsForSelectedDate]; 
      const dragIndex = items.findIndex(i => i.id === dragId); 
      const hoverIndex = items.findIndex(i => i.id === hoverId); 
      if (dragIndex === -1 || hoverIndex === -1) return;
      
      const dragItem = items[dragIndex]; 
      
      const newItems = [...items]; 
      newItems.splice(dragIndex, 1); 
      newItems.splice(hoverIndex, 0, dragItem); 
      
      const updatedItems = newItems.filter(i => i).map((item, index) => ({ ...item, order: index })); 
      
      setAllAssignmentsByDate(prev => ({ 
          ...prev, 
          [selectedDisplayDate]: updatedItems 
      })); 
      
      if (isOffline) return;
      
      const batch = writeBatch(db); 
      const path = getAssignmentCollectionPath(); 
      updatedItems.forEach(item => {
           const docRef = doc(db, path, item.id);
           batch.update(docRef, { order: item.order });
      });
      batch.commit().catch(e => console.error("Reorder failed:", e));
      
  }, [assignmentsForSelectedDate, isOffline, db, selectedDisplayDate]);

  const isDaySettled = useMemo(() => dailySettlements[selectedDisplayDate]?.isSettled || false, [dailySettlements, selectedDisplayDate]);
  
  const handleBatchSettlement = useCallback(async () => {
    if (!selectedDisplayDate) return;
    const settledData = dailySettlements[selectedDisplayDate];
    const assignments = assignmentsForSelectedDate;
    if (assignments.length === 0) return;

    const todayStr = getTodayDate();
    const isPastDate = selectedDisplayDate < todayStr;
    let shouldIssueReward = true; 

    if (isPastDate) {
        if (!window.confirm(`⚠️ 偵測到這是過去的日期 (${selectedDisplayDate})！\n\n請問您要【補發銀幣】給全對的學生嗎？\n\n● 按【確定】= 補發銀幣 + 鎖定日期\n● 按【取消】= 不發銀幣 + 僅鎖定日期 (用於封存舊資料)`)) {
            shouldIssueReward = false;
        }
    }

    const greenStudentIds = [];
    students.forEach(s => {
        const isAllGreen = assignments.every(a => {
            const status = a.submissionStatus[s.id];
            return status === true; 
        });
        if (isAllGreen) greenStudentIds.push(s.id);
    });

    const claimedMap = settledData?.silverRewardClaimed || {};
    const newWinners = greenStudentIds.filter(id => !claimedMap[id]);

    if (newWinners.length === 0) {
        alert("所有符合資格的學生都已經處理過了！(無新增獲獎者)");
        if (!isDaySettled) {
             const settlementRef = doc(db, getDailySettlementPath(), selectedDisplayDate);
             setDoc(settlementRef, { isSettled: true, settledAt: serverTimestamp() }, { merge: true });
        }
        return;
    }

    const newWinnerNames = newWinners.map(id => {
        const s = students.find(stud => stud.id === id);
        return s ? `${s.id}.${s.name[0]}O${s.name.slice(2)}` : id; 
    });
    
    if (shouldIssueReward) {
        if (!window.confirm(`【確認發放】\n\n將發放銀幣給以下 ${newWinners.length} 位學生：\n${newWinnerNames.join('、')}`)) return;
    } else {
        alert(`【封存模式】\n\n將標記此日期為「已結算」，但 **不會** 發放銀幣給這 ${newWinners.length} 位學生。`);
    }

    setLoading(true);

    try {
        const batch = writeBatch(db);
        const settlementRef = doc(db, getDailySettlementPath(), selectedDisplayDate);
        const newClaims = {};
        newWinners.forEach(id => newClaims[id] = true);

        batch.set(settlementRef, { 
            isSettled: true, 
            silverRewardClaimed: newClaims, 
            settledAt: serverTimestamp() 
        }, { merge: true });

        await batch.commit();
        
        if (shouldIssueReward) {
            newWinners.forEach(sid => { updateBankBalance(sid, 0, 2, 0); });
            setAlertMessage(`✅ 結算完成！\n\n恭喜以下 ${newWinners.length} 位同學獲得 +2 銀幣：\n${newWinnerNames.join('、')}`);
        } else {
            setAlertMessage(`🔒 封存完成！\n日期已鎖定，未發放任何獎勵。`);
        }
        
    } catch (e) {
        console.error("Settlement failed:", e);
        setAlertMessage("結算操作失敗。");
    } finally {
        setLoading(false);
    }
  }, [selectedDisplayDate, dailySettlements, assignmentsForSelectedDate, students, isOffline, db, updateBankBalance, isDaySettled]);

  const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatus) => { 
      const assignmentData = assignmentMap[assignmentName]; 
      if (!assignmentData) return; 
      
      const settledData = dailySettlements[selectedDisplayDate];
      const isSettled = settledData?.isSettled || false;
      const isStrictMode = isSettled === true;

      if (!isStrictMode) {
          const cellKey = `${studentId}-${assignmentData.id}`; 
          let newStatus; 
          
          if (currentStatus === true || currentStatus === undefined) { 
              newStatus = false; 
              setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
          } else if (currentStatus === false) { 
              newStatus = 'late'; 
              setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
          } else { 
              const currentCount = unlockClicks[cellKey] || 0; 
              if (currentCount < 2) { 
                  setUnlockClicks(prev => ({ ...prev, [cellKey]: currentCount + 1 })); 
                  return; 
              } else { 
                  newStatus = true; 
                  setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
              } 
          }
          
          if (isOffline) {
              setAllAssignmentsByDate(prev => { 
                  const newMap = { ...prev }; 
                  newMap[selectedDisplayDate] = newMap[selectedDisplayDate].map(a => 
                      a.id === assignmentData.id ? { ...a, submissionStatus: { ...a.submissionStatus, [studentId]: newStatus } } : a
                  ); return newMap; 
              });
          } else {
              const docRef = doc(db, getAssignmentCollectionPath(), assignmentData.id);
              await setDoc(docRef, { submissionStatus: { [studentId]: newStatus } }, { merge: true });
          }
          return;
      }

      let newStatus;
      let bronzeChange = 0;
      let silverChange = 0;
      let goldChange = 0; 
      let makeupUpdate = {}; 
      let settlementUpdate = null; 
      let triggerAnimation = null;

      if (currentStatus === true || currentStatus === undefined) {
          newStatus = false;
          if (settledData?.silverRewardClaimed?.[studentId]) {
              silverChange = -2;
              settlementUpdate = { [`silverRewardClaimed.${studentId}`]: deleteField() }; 
          }
      } else if (currentStatus === false) {
          newStatus = 'late';
          bronzeChange = 10; 
          makeupUpdate = { [`makeupClaimed.${studentId}`]: true };
          triggerAnimation = 'BRONZE'; 
          
          const allStudentAssignments = Object.values(allAssignmentsByDate).flat();
          const redAssignments = allStudentAssignments.filter(a => 
              a.submissionStatus[studentId] === false && a.id !== assignmentData.id 
          );
          
          if (redAssignments.length === 0) {
              triggerAnimation = 'GOLD_CLEAR';
              goldChange = 3; 
          }

      } else {
          newStatus = false;
          bronzeChange = -10; 
          makeupUpdate = { [`makeupClaimed.${studentId}`]: deleteField() };
          const cellKey = `${studentId}-${assignmentData.id}`; 
          setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
      }

      if (bronzeChange !== 0 || silverChange !== 0 || goldChange !== 0) {
          updateBankBalance(studentId, goldChange, silverChange, bronzeChange);
      }
      
      if (triggerAnimation) { setRewardState({ type: triggerAnimation }); }

      if (isOffline) {
          setAllAssignmentsByDate(prev => { 
              const newMap = { ...prev }; 
              newMap[selectedDisplayDate] = newMap[selectedDisplayDate].map(a => 
                  a.id === assignmentData.id ? { ...a, submissionStatus: { ...a.submissionStatus, [studentId]: newStatus } } : a
              ); return newMap; 
          });
      } else {
          const batch = writeBatch(db);
          const assignRef = doc(db, getAssignmentCollectionPath(), assignmentData.id);
          if (newStatus !== undefined) {
              batch.update(assignRef, { [`submissionStatus.${studentId}`]: newStatus, ...makeupUpdate });
              if (settlementUpdate) {
                  const settleRef = doc(db, getDailySettlementPath(), selectedDisplayDate);
                  batch.update(settleRef, settlementUpdate);
              }
              await batch.commit();
          }
      }
  }, [db, userId, assignmentMap, unlockClicks, isOffline, allAssignmentsByDate, updateBankBalance, selectedDisplayDate, dailySettlements]);
  const handleEditCurrentDate = useCallback(async (targetOldDate) => { const oldDate = typeof targetOldDate === 'string' ? targetOldDate : selectedDisplayDate; if (authMode !== 'ADMIN' || !oldDate) return; const newDate = prompt(`請輸入新的日期以取代 ${oldDate} (格式: YYYY-MM-DD)`, oldDate); if (!newDate || newDate === oldDate) return; const datePattern = /^\d{4}-\d{2}-\d{2}$/; if (!datePattern.test(newDate)) { alert("日期格式不正確，請使用 YYYY-MM-DD格式。"); return; } if (allAssignmentsByDate[newDate]) { alert(`日期 ${newDate} 已經存在作業資料，無法直接修改日期至此日。請手動遷移或刪除目標日期資料。`); return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; newMap[newDate] = newMap[oldDate].map(a => ({...a, assignmentDate: newDate})); delete newMap[oldDate]; return newMap; }); setSelectedDisplayDate(newDate); setAlertMessage(`[離線] 日期已修改為 ${newDate}`); return; } if (!db || !userId) return; setLoading(true); try { const batch = writeBatch(db); const assignments = allAssignmentsByDate[oldDate] || []; const path = getAssignmentCollectionPath(); if (assignments.length === 0) { setAlertMessage("該日期沒有作業資料可供移動。"); setLoading(false); return; } assignments.forEach(assignment => { const docRef = doc(db, path, assignment.id); batch.update(docRef, { assignmentDate: newDate }); }); await batch.commit(); setSelectedDisplayDate(newDate); setAlertMessage(`日期已成功從 ${oldDate} 修改為 ${newDate}`); } catch(e) { console.error("Error modifying date:", e); setAlertMessage("修改日期失敗，請檢查網路或權限。"); } finally { setLoading(false); } }, [authMode, selectedDisplayDate, allAssignmentsByDate, isOffline, db, userId]);
  const handleBatchDelete = useCallback(async (assignmentIds, successMessage, failureMessage) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以執行批次刪除。"); return false; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].filter(a => !assignmentIds.includes(a.id)); }); return newMap; }); setAlertMessage(successMessage + " (離線)"); return true; } if (!db || !userId || assignmentIds.length === 0) return false; setLoading(true); try { const batch = writeBatch(db); const path = getAssignmentCollectionPath(); assignmentIds.forEach(id => { if (id) { const docRef = doc(db, path, id); batch.delete(docRef); } }); await batch.commit(); setAlertMessage(successMessage); return true; } catch (e) { console.error("Error during batch delete: ", e); setAlertMessage(failureMessage); return false; } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, authMode]);
  const handleDeleteStudentGlobalData = useCallback(async (studentId, studentName) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足。"); return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].map(a => { const newStatus = { ...a.submissionStatus }; delete newStatus[studentId]; return { ...a, submissionStatus: newStatus }; }); }); return newMap; }); setAlertMessage(`[離線] 成功刪除 ${studentName} 的所有訂正紀錄。`); return; } if (!db || !userId) return; if (!window.confirm(`【極度危險】確定要永久刪除學生 ${studentName} (${studentId}) 在所有日期上的所有訂正紀錄嗎？此操作不可逆轉！`)) { return; } setLoading(true); try { const path = getAssignmentCollectionPath(); const assignmentCollection = collection(db, path); const snapshot = await getDocs(assignmentCollection); const batch = writeBatch(db); let updateCount = 0; snapshot.docs.forEach(doc => { const docRef = doc.ref; const data = doc.data(); const submissionStatus = data.submissionStatus || {}; if (submissionStatus.hasOwnProperty(studentId)) { const newSubmissionStatus = { ...submissionStatus }; delete newSubmissionStatus[studentId]; batch.set(docRef, { submissionStatus: newSubmissionStatus }, { merge: true }); updateCount++; } }); await batch.commit(); setAlertMessage(`成功刪除 ${studentName} 的所有訂正紀錄 (${updateCount} 筆作業文件受到影響)。`); } catch (e) { console.error("Error deleting student data:", e); setAlertMessage("刪除學生數據失敗，請檢查權限或連線。"); } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, authMode]);
  const showConfirmation = useCallback((type, data) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足。"); return; } let title, message, confirmTitle, confirmColor; switch(type) { case 'DAILY': title = `🧨 確定刪除 ${selectedDisplayDate} 的所有紀錄嗎？`; message = `此操作將永久移除 ${selectedDisplayDate} 的所有 ${assignmentsForSelectedDate.length} 筆作業紀錄。刪除後不可恢復。`; confirmTitle = '日期'; confirmColor = 'bg-gray-900'; break; case 'MONTHLY': title = `💣 確認刪除 ${data.monthName} 的所有作業紀錄？`; message = `此操作將永久移除 ${data.monthName} 期間所有 ${data.count} 筆作業紀錄。請務必謹慎！`; confirmTitle = '月份'; confirmColor = 'bg-amber-800'; break; case 'SEMESTER': title = `☢️ 極度危險：確認刪除 ${data.semName} 的所有資料？`; message = `此操作將永久移除 ${data.semName} 期間所有 ${data.count} 筆紀錄。這是最高級別的刪除，數據將無法找回！`; confirmTitle = '學期'; confirmColor = 'bg-rose-500'; break; default: return; } setConfirmationModal({ title, message, confirmTitle, confirmColor, action: type, data }); }, [selectedDisplayDate, assignmentsForSelectedDate, authMode, isOffline]);
  const handleDeleteDateAssignments = useCallback(() => { if (assignmentsForSelectedDate.length === 0) { alert(`日期 ${selectedDisplayDate} 沒有任何作業紀錄可以刪除。`); return; } showConfirmation('DAILY', {}); }, [assignmentsForSelectedDate, selectedDisplayDate, showConfirmation]);
  const handleDeleteMonthAssignments = useCallback(() => { const monthName = months.find(m => m.id === selectedMonth)?.name || '該月'; const assignmentIdsToDelete = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = date.substring(5, 7); if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); } }); if (assignmentIdsToDelete.length === 0) { alert(`${monthName} 期間沒有找到作業紀錄可以刪除。`); return; } showConfirmation('MONTHLY', { monthName, count: assignmentIdsToDelete.length }); }, [allAssignmentsByDate, selectedMonth, months, showConfirmation]);
  const handleDeleteSemesterAssignments = useCallback(() => { const semesterData = semesters.find(s => s.id === selectedSemester); const semName = semesterData ? semesterData.name : '全部'; const assignmentIdsToDelete = []; const allDates = Object.keys(allAssignmentsByDate); allDates.forEach(date => { const dateMonth = parseInt(date.substring(5, 7), 10); const dateYear = parseInt(date.substring(0, 4), 10); let shouldDelete = false; if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { shouldDelete = true; } } else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { shouldDelete = true; } } if (shouldDelete) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); } }); if (assignmentIdsToDelete.length === 0) { alert(`${semName} 期間沒有找到作業紀錄可以刪除。`); return; } showConfirmation('SEMESTER', { semName, count: assignmentIdsToDelete.length }); }, [allAssignmentsByDate, selectedSemester, semesters, showConfirmation]);
  const executeDelete = useCallback(async () => { if (!confirmationModal) return; const { action, data } = confirmationModal; setConfirmationModal(null); let success = false; switch(action) { case 'DAILY': const assignmentIds = assignmentsForSelectedDate.map(a => a.id).filter(id => id); const name_daily = selectedDisplayDate; const count_daily = assignmentIds.length; success = await handleBatchDelete(assignmentIds, `成功刪除 ${name_daily} 的所有作業紀錄 (${count_daily} 筆)。`, "刪除該日作業失敗，請稍後再試。"); if (success) { const currentDates = availableDates.filter(d => d !== selectedDisplayDate); if (currentDates.length > 0) { setSelectedDisplayDate(currentDates[currentDates.length - 1]); } else { setSelectedDisplayDate(getTodayDate()); } } break; case 'MONTHLY': const monthName = months.find(m => m.id === selectedMonth)?.name || '該月'; const monthAssignmentIds = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = date.substring(5, 7); if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) monthAssignmentIds.push(assignment.id); }); } }); const monthCount = monthAssignmentIds.length; success = await handleBatchDelete(monthAssignmentIds, `成功刪除 ${monthName} 期間的 ${monthCount} 筆作業紀錄。`, "刪除月份作業失敗，請稍後再試。"); if (success) setSelectedDisplayDate(getTodayDate()); break; case 'SEMESTER': const semesterData = semesters.find(s => s.id === selectedSemester); const semName = semesterData ? semesterData.name : '全部'; const semAssignmentIds = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = parseInt(date.substring(5, 7), 10); const dateYear = parseInt(date.substring(0, 4), 10); if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } } else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } } }); const semCount = semAssignmentIds.length; success = await handleBatchDelete(semAssignmentIds, `成功刪除 ${semName} 期間的 ${semCount} 筆作業紀錄。`, "刪除學期作業失敗，請稍後再試。"); if (success) setSelectedDisplayDate(getTodayDate()); break; default: break; } }, [confirmationModal, handleBatchDelete, assignmentsForSelectedDate, selectedDisplayDate, availableDates, allAssignmentsByDate, months, selectedMonth, semesters]);
  
  // --- 匯出資料 ---
  const handleExportData = useCallback(async () => { 
      if (!isOffline && (!db || !userId)) { setAlertMessage("請等待應用程式載入並登入後再匯出。"); return; } 
      setLoading(true); 
      try { 
          const exportObj = {
              version: 'v20.0.42',
              timestamp: new Date().toISOString(),
              students: students,
              assignments: [],
              bankData: bankData,
              allAssignmentsByDate: isOffline ? allAssignmentsByDate : undefined
          };
          if (isOffline) {
              Object.values(allAssignmentsByDate).forEach(assignments => { exportObj.assignments.push(...assignments); });
          } else {
              const path = getAssignmentCollectionPath(); const assignmentsCollection = collection(db, path); const snapshot = await getDocs(assignmentsCollection); 
              snapshot.forEach(doc => { const data = doc.data(); const createdAt = data.createdAt?.toDate().toISOString() || null; exportObj.assignments.push({ id: doc.id, ...data, createdAt: createdAt }); });
          }
          const dataStr = JSON.stringify(exportObj, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `assignment_data_${getTodayDate()}${isOffline ? '_offline' : ''}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); setAlertMessage(`成功匯出完整備份 (含存簿資料)。`); 
      } catch (e) { console.error("Export failed:", e); setAlertMessage("匯出資料失敗。"); } finally { setLoading(false); } 
  }, [db, userId, setAlertMessage, isOffline, allAssignmentsByDate, bankData, students]);
 
  // --- 匯入資料 ---
  const handleImportData = useCallback(async (e) => { 
      if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以匯入資料。"); return; } 
      if (!isOffline && (!db || !userId)) { setAlertMessage("請等待應用程式載入並登入後再匯入。"); return; } 
      const file = e.target.files[0]; if (!file) return; setLoading(true); const reader = new FileReader(); 
      reader.onload = async (event) => { 
          try { 
              const json = JSON.parse(event.target.result); 
              if (Array.isArray(json)) { 
                  setAlertMessage("⚠️ 偵測到舊版備份檔。僅能還原作業，無法還原存簿。");
                  if (isOffline) { 
                      let importedCount = 0; const newMap = { ...allAssignmentsByDate }; 
                      json.forEach(item => { 
                          const date = item.assignmentDate || getTodayDate(); const name = (item.assignmentName || "未命名作業").trim(); 
                          if (!newMap[date]) newMap[date] = []; 
                          if (!newMap[date].some(a => a.assignmentName === name)) { 
                              newMap[date].push({ ...item, id: `offline-import-${Date.now()}-${Math.random()}`, assignmentName: name, assignmentDate: date }); 
                              importedCount++; 
                          } 
                      }); 
                      setAllAssignmentsByDate(newMap); 
                  } 
              } else {
                  if (json.bankData) setBankData(json.bankData);
                  if (isOffline && json.allAssignmentsByDate) setAllAssignmentsByDate(json.allAssignmentsByDate);
                  if(isOffline && json.assignments) {
                      const newMap = {};
                      json.assignments.forEach(a => {
                          if(!newMap[a.assignmentDate]) newMap[a.assignmentDate] = [];
                          newMap[a.assignmentDate].push(a);
                      });
                      setAllAssignmentsByDate(newMap);
                  }
                  setAlertMessage("✅ 完整資料還原成功 (含存簿)！");
              }
          } catch (error) { console.error("Import failed:", error); setAlertMessage("匯入失敗：檔案解析錯誤或數據格式不正確。"); } finally { setLoading(false); e.target.value = null; } 
      }; reader.readAsText(file); 
  }, [db, userId, setAlertMessage, getInitialSubmissionStatus, allAssignmentsByDate, isOffline, authMode]);

  const isGlobalLoading = loading || loadingCategories || loadingStudents;
  
  if (isGlobalLoading && !isAuthReady && !isOffline) {
    return ( 
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-3xl text-gray-600 mb-6">正在連線至雲端資料庫...</p>
        {authTimeout && ( <div className="text-center animate-fade-in"> <p className="text-2xl text-amber-600 mb-4">連線似乎有點慢，或是無法連接到伺服器。</p> <button onClick={handleGoOffline} className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-4 rounded-xl text-3xl font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-3 mx-auto"> <WifiOff className="w-8 h-8" /> 強制進入 (離線/演示模式) </button> </div> )}
      </div> 
    );
  }
 
  if (!isAuthenticated && !loading && !loadingCategories) {
      return <LoginScreen onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} isLoading={loadingLogin} errorMsg={loginError} />;
  }
 
  if (error) {
    return ( <div className="p-8 text-center bg-red-100 border-l-8 border-red-500 text-red-700"> <h2 className="text-3xl font-bold mb-2">發生錯誤 (Error Occurred)</h2> <p className="text-xl whitespace-pre-line">{error}</p> <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg text-xl hover:bg-red-700 transition flex items-center justify-center mx-auto"> <RefreshCw className="w-6 h-6 mr-2" /> 重新整理 </button> </div> );
  }

  return (
   <DndProvider backend={HTML5Backend}>
   <div className="min-h-screen flex flex-col bg-gray-100 overflow-x-hidden">
     {/* --- [特效層] 慶祝動畫與銅幣特效 --- */}
     {rewardState && ( <RewardOverlay type={rewardState.type} onClose={() => setRewardState(null)} /> )}
     
     {/* --- [彈窗層] 各式功能視窗 --- */}
     {showBankModal && ( <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} setBankBalancedDirectly={setBankBalancedDirectly} authMode={authMode} students={students} /> )}
     {dashboardStudent && ( <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={() => setDashboardStudent(null)} /> )}
     {confirmationModal && ( <ConfirmationModal title={confirmationModal.title} message={confirmationModal.message} onConfirm={executeDelete} onCancel={() => setConfirmationModal(null)} confirmTitle={confirmationModal.confirmTitle} confirmColor={confirmationModal.confirmColor} /> )}
     
     {/* 未訂正視窗 */}
     {missingStudent && missingStudent.missingCount > 0 && ( <MissingDetailsModal student={students.find(s => s.id === missingStudent.id)} missingStats={studentMissingStats} onClose={() => setMissingStudent(null)} handleDeleteStudentGlobalData={handleDeleteStudentGlobalData} db={db} userId={userId} allAssignmentsByDate={allAssignmentsByDate} setAlertMessage={setAlertMessage} isOffline={isOffline} authMode={authMode} updateBankBalance={updateBankBalance} setRewardState={setRewardState} /> )}
{/* [新增] 同步任務彈窗 */}
    {syncData && (
      <SyncTasksModal 
        candidates={syncData.candidates} 
        sourceDate={syncData.date}
        onConfirm={(items) => { executeCreateAssignments(syncData.targetDate, items.map(i => i.name)); setSyncData(null); }}
        onClose={() => { executeCreateAssignments(syncData.targetDate, categories.map(c => c.name)); setSyncData(null); }}
      />
    )}     
   {/* 修改後的第 1626 行：傳入原始資料讓視窗可以根據日期重新計算 */}
      {showAllMissingModal && ( 
        <AllMissingAssignmentsModal 
          students={students}
          allAssignmentsByDate={allAssignmentsByDate} 
          onClose={() => setShowAllMissingModal(false)} 
          selectedAcademicYear={selectedAcademicYear}
        /> 
      )}
 
     <div className="bg-white shadow-xl w-full flex flex-col h-full print:hidden">
       <header className="p-4 sm:p-6 text-center border-b border-gray-200 bg-white relative overflow-hidden shrink-0">
         {isOffline && ( <div className="absolute top-0 left-0 w-full bg-gray-800 text-white text-center py-2 text-xl font-bold tracking-wider z-10"> ⚠️ 目前為離線演示模式 (Guest Mode) </div> )}
          <button onClick={handleLogout} className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold transition z-20" title="登出系統"> <LogOut className="w-5 h-5" /> 登出 {authMode === 'ADMIN' ? '(老師)' : '(訪客)'} </button>
 
         {/* 🐻‍❄️ 熊貓標題 */}
         <div className={`flex items-center justify-center text-5xl font-extrabold text-gray-900 mb-2 ${isOffline ? 'mt-8' : ''}`}><span className="text-6xl mr-3">🐼</span><span className="text-5xl">{selectedAcademicYear.includes('114') ? '五年甲班' : '六年甲班'}</span><span className="text-6xl ml-3">🐻‍❄️</span></div>
         <p className="text-3xl text-gray-600 mb-4"> {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long' })}</p>
         <p className={`absolute right-4 text-xl text-gray-500 font-bold z-30 transition-all ${authMode === 'ADMIN' ? 'top-20' : 'top-4'}`}> 版本: {VERSION}</p>
       </header>
       {alertMessage && ( <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} /> )}
       
       <div className="flex-1 overflow-x-hidden bg-gray-50 p-4 relative flex flex-col">
           <div className="flex items-center gap-4 mb-4 w-full flex-nowrap overflow-x-auto py-1">
          <div className="flex items-center gap-3 flex-nowrap shrink-0">
            <label className="font-extrabold text-gray-800 whitespace-nowrap text-3xl">學年：</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="p-3 text-3xl font-bold border-2 border-gray-300 rounded-xl bg-white shadow-sm"
              disabled={isGlobalLoading}
            >
              {Object.keys(ACADEMIC_YEARS).map((yearKey) => (
                <option key={yearKey} value={yearKey}>
                  {ACADEMIC_YEARS[yearKey].label}
                </option>
              ))}
            </select>

            <label className="font-extrabold text-gray-800 whitespace-nowrap text-3xl ml-2">學期：</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="p-3 text-3xl font-bold border-2 border-gray-300 rounded-xl bg-white shadow-sm"
              disabled={isGlobalLoading}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <label className="font-extrabold text-gray-800 whitespace-nowrap text-3xl ml-2">月份：</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="p-3 text-3xl font-bold border-2 border-gray-300 rounded-xl shadow-sm" 
              disabled={isGlobalLoading} 
              style={{ backgroundColor: months.find((m) => m.id === selectedMonth)?.color || 'white' }}
            >
              {filteredMonths.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 flex-nowrap shrink-0 ml-4">
            <button onClick={() => setShowBankModal(true)} className="px-5 py-3 text-3xl font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 transition duration-150 shadow-md flex items-center justify-center whitespace-nowrap" disabled={isGlobalLoading}>
              <BookOpen className="h-8 w-8 mr-2" />訂正存簿
            </button>
            {authMode === 'ADMIN' && (
              <>
                <button
                  onClick={handleBatchSettlement}
                  className={`px-5 py-3 text-3xl font-bold rounded-xl text-white transition duration-150 shadow-md flex items-center justify-center whitespace-nowrap ${dailySettlements[selectedDisplayDate]?.isSettled ? 'bg-gray-500 hover:bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  disabled={isGlobalLoading}
                  title={dailySettlements[selectedDisplayDate]?.isSettled ? "點擊以補發給新完成的學生" : "結算並發放銀幣給全對學生"}
                >
                  {dailySettlements[selectedDisplayDate]?.isSettled ? <><Lock className="h-8 w-8 mr-2" />已發布(可補發)</> : <><Megaphone className="h-8 w-8 mr-2" />結算發布</>}
                </button>
                <button
                  onClick={() => setShowBroadcastEditor(true)}
                  className="px-5 py-3 text-3xl font-bold rounded-xl text-white bg-purple-700 hover:bg-purple-800 transition duration-150 shadow-md flex items-center justify-center whitespace-nowrap"
                  disabled={isGlobalLoading}
                >
                  <Megaphone className="h-8 w-8 mr-2" />全域廣播
                </button>
              </>
            )}
          </div>
        </div>           
           <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 shrink-0">
               {displayedDates.map(date => ( <DateTab key={date} date={date} isSelected={date === selectedDisplayDate} onClick={setSelectedDisplayDate} onEdit={() => handleEditCurrentDate(date)} authMode={authMode} /> ))}
           </div>
           {/* --- 第二區：按鈕工具列（翡翠綠同步 + 滿版寬度撐開） --- */}
          <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 shrink-0 bg-white/80 p-5 rounded-[2.5rem] border border-gray-200 shadow-md">
                
                {/* 1. 日期選擇區 (靠左) */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-inner border border-gray-200 shrink-0">
                  <input 
                    id="newAssignmentDate" 
                    type="date" 
                    value={newAssignmentDate} 
                    onChange={handleNewAssignmentDateChange} 
                    className="p-2 text-3xl border-none font-bold w-[230px] focus:ring-0 outline-none text-gray-700" 
                  />
                  <button 
                    onClick={handleAddNewDate} 
                    className="px-6 py-3 bg-yellow-500 text-white rounded-xl text-2xl font-black hover:bg-yellow-600 transition-all active:scale-95 shadow-md whitespace-nowrap"
                    disabled={isGlobalLoading || !newAssignmentDate}
                  > 
                    + 新增日期 
                  </button>
                </div>

                {/* 2. 主要功能區 (優化版：翡翠綠同步 + 寬度上限 + 訪客權限防護) */}
                <div className="flex flex-1 items-center gap-3 justify-center min-w-[600px]">
                  {/* 同步任務：僅限老師，翡翠綠色 */}
                  {authMode === 'ADMIN' && (
                    <button 
                      onClick={async () => {
                        const res = await syncFromVoyageLog(selectedDisplayDate);
                        if(res) setSyncData({ targetDate: selectedDisplayDate, ...res });
                        else alert("找不到前一天的日誌紀錄。");
                      }} 
                      className="flex-1 max-w-[250px] px-4 py-4 bg-emerald-600 text-white rounded-xl text-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                    >
                      <DownloadCloud className="w-8 h-8"/> 同步任務
                    </button>
                  )}
                  
                  {/* 匯出與總表：所有人可看，寬度限制為 250px */}
                  <button 
                    onClick={handleExportData} 
                    className="flex-1 max-w-[250px] px-4 py-4 bg-fuchsia-600 text-white rounded-xl text-2xl font-black flex items-center justify-center gap-2 hover:bg-fuchsia-700 transition-all shadow-md active:scale-95"
                  >
                    <Download className="w-6 h-6" />匯出
                  </button>

                  <button 
                    onClick={() => setShowAllMissingModal(true)} 
                    className="flex-1 max-w-[250px] px-4 py-4 bg-orange-500 text-white rounded-xl text-2xl font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-md active:scale-95"
                  >
                    <FileText className="w-6 h-6" />未完成總表
                  </button>

                  {/* 匯入功能：僅限老師出現 */}
                  {authMode === 'ADMIN' && (
                    <div className="flex-1 max-w-[250px] relative">
                        <input type="file" id="importFile" accept="application/json" onChange={handleImportData} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isGlobalLoading} />
                        <button onClick={() => document.getElementById('importFile').click()} className="w-full px-4 py-4 bg-cyan-600 text-white rounded-xl text-2xl font-black flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all shadow-md active:scale-95">
                          <Upload className="w-6 h-6" />匯入
                        </button>
                    </div>
                  )}
                </div>

                {/* 3. 刪除管理區 (靠右固定) */}
                {authMode === 'ADMIN' && (
                    <div className="flex items-center gap-2 shrink-0">
                        <ProtectedButton onClick={() => handleDeleteDateAssignments()} className="px-5 py-3 text-2xl font-bold bg-gray-900 text-white rounded-xl flex items-center gap-1 shadow-lg hover:bg-black transition-all active:scale-95 border-b-4 border-gray-700">🧨 刪除日期</ProtectedButton>
                        <ProtectedButton onClick={() => handleDeleteMonthAssignments()} className="px-5 py-3 text-2xl font-bold bg-amber-800 text-white rounded-xl flex items-center gap-1 shadow-lg hover:bg-amber-900 transition-all active:scale-95 border-b-4 border-amber-950">💣 刪除月份</ProtectedButton>
                        <ProtectedButton onClick={() => handleDeleteSemesterAssignments()} className="px-5 py-3 text-2xl font-bold bg-rose-600 text-white rounded-xl flex items-center gap-1 shadow-lg hover:bg-rose-700 transition-all active:scale-95 border-b-4 border-rose-800">☢️ 刪除學期</ProtectedButton>
                    </div>
                )}
          </div>
            <div className="flex justify-between items-center mb-6 shrink-0">
               <h2 className="text-5xl font-bold text-gray-800 flex items-center">
                   <span className="text-gray-500 mr-3 text-5xl">📋</span>
                   {selectedDisplayDate ? (
                       <div className="flex items-center gap-3">
                           <span className="text-4xl">{new Date(selectedDisplayDate).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} 作業確認表</span>
                           {dailySettlements[selectedDisplayDate]?.isSettled && <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-lg rounded-full font-bold border border-indigo-200 flex items-center"><Lock className="w-4 h-4 mr-1"/>已發布</span>}
                           {authMode === 'ADMIN' && (
                                <button onClick={() => handleEditCurrentDate(selectedDisplayDate)} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 hover:text-gray-800 transition shadow-sm" title="修改此日期" disabled={isGlobalLoading}> <Edit className="w-6 h-6" /> </button>
                           )}
                       </div>
                   ) : '請選擇日期'}
               </h2>
               <div className="flex items-center gap-4">
                   {focusedStudentId && ( <button onClick={() => setFocusedStudentId(null)} className="px-5 py-3 text-3xl font-medium rounded-lg text-white bg-gray-600 hover:bg-gray-700 transition duration-150 shadow-md flex items-center"> <Eye className="h-8 w-8 mr-2" /> 顯示全部學生 </button> )}
                   <button onClick={handleAddNewAssignment} className={`px-5 py-3 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center ${isGlobalLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-400 hover:bg-blue-500'}`} disabled={isGlobalLoading || !selectedDisplayDate}><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>新增作業</button>
               </div>
           </div>
 
           {assignmentsForSelectedDate.length === 0 && selectedDisplayDate !== '' && ( <div className="text-center p-12 bg-gray-50 rounded-xl shadow-inner"><svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><h3 className="mt-4 text-3xl font-medium text-gray-900">該日無作業紀錄。</h3><p className='text-3xl text-gray-600 mt-2'>請選擇左側的日期標籤，或在上方輸入日期並點擊「新增日期」。</p></div> )}
           
           <div className={`w-full max-w-[100vw] relative border border-gray-300 rounded-lg shadow-xl overflow-auto h-[90vh] min-h-[500px] mb-8 bg-white`}> 
               <div className="min-w-full">
                   {assignmentsForSelectedDate.length > 0 && selectedDisplayDate !== '' && (
                        <table className="divide-y divide-gray-300 min-w-full w-max">
                           <thead className="bg-gray-100 sticky top-0 z-40">
                               <tr>
                                   <th className="px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 border-r border-gray-300 sticky left-0 top-0 z-50 bg-gray-100 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '100px', width: '100px', maxWidth: '100px' }}>座號</th>
                                   <th className="px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 sticky top-0 left-[100px] z-50 bg-gray-100 text-center shadow-[4px_0_10px_-2px_rgba(0,0,0,0.3)] border-r-4 border-gray-300" style={{ minWidth: '128px', width: '128px', maxWidth: '128px' }}>姓名</th>
                                   {assignmentsForSelectedDate.map((assignment) => (
                                       <AssignmentHeader key={assignment.id} assignment={assignment} isGlobalLoading={isGlobalLoading} handleDeleteAssignment={handleDeleteAssignment} handleEditSave={handleEditAssignmentName} handleMoveAssignment={handleMoveAssignment} setEditingAssignmentId={setEditingAssignmentId} setEditingAssignmentName={setEditingAssignmentName} editingAssignmentId={editingAssignmentId} editingAssignmentName={editingAssignmentName} authMode={authMode} />
                                   ))}
                               </tr>
                           </thead>
                           <tbody className={`divide-y divide-gray-200 ${focusedStudentId ? 'bg-blue-50' : 'bg-white'}`}>
                               {(focusedStudentId ? students.filter(s => s.id === focusedStudentId) : students).map((student) => (
                                   <tr key={student.id} className={`group ${focusedStudentId ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                                           <td onClick={() => setDashboardStudent(student)} className="px-2 py-4 text-3xl whitespace-normal font-medium text-gray-900 border-r border-gray-300 sticky left-0 z-30 bg-white text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer group-hover:text-blue-600 group-hover:bg-blue-100 break-words align-middle transition-colors" title="點擊查看學習歷程" style={{ minWidth: '100px', width: '100px', maxWidth: '100px' }}>
                                               {student.id}
                                           </td>
                                           <td onClick={() => setFocusedStudentId(focusedStudentId === student.id ? null : student.id)} className="px-2 py-4 text-3xl whitespace-nowrap text-gray-900 font-semibold sticky left-[100px] z-30 bg-white text-center shadow-[4px_0_10px_-2px_rgba(0,0,0,0.3)] border-r-4 border-gray-300 cursor-pointer group-hover:text-blue-600 group-hover:bg-blue-100 align-middle transition-colors" title={focusedStudentId === student.id ? "點擊以顯示全部學生" : "點擊以只顯示此學生"} style={{ minWidth: '128px', width: '128px', maxWidth: '128px' }}>
                                               {student.name[0] + 'O' + student.name.slice(2)}
                                           </td>
                                           {assignmentsForSelectedDate.map((assignment) => {
                                               const assignmentName = assignment.assignmentName;
                                               const assignmentData = assignmentMap[assignmentName];
                                               const status = assignmentData ? assignmentData.submissionStatus[student.id] ?? true : true;
                                               return (
                                                   <td key={`${student.id}-${assignment.id}`} className="px-1 py-4 whitespace-nowrap text-center" style={{ minWidth: '150px' }}>
                                                       <div className="relative inline-block">
                                                           <button onClick={() => handleToggleSubmission(assignmentName, student.id, status)} disabled={isGlobalLoading} className={`p-2 rounded-lg transition duration-150 shadow-md disabled:cursor-not-allowed relative ${status === true ? 'bg-green-200 text-green-700 hover:bg-green-300' : (status === 'late' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-white border-4 border-red-300 text-red-500 hover:bg-red-50')}`} aria-label={status === true ? '已完成' : (status === 'late' ? '遲繳' : '待完成')}> {status === false ? ( <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> )} </button>
                                                       </div>
                                                   </td>
                                               );
                                           })}
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   )}
               </div>
           </div>
           
           <MissingColorExplanation />
           <div className="mt-12 p-6 bg-gray-50 rounded-xl shadow-inner border border-gray-200 shrink-0">
               <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center"><span className="text-5xl mr-3">⚠️</span><span className="text-4xl">全班未訂正統計</span></h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                   {studentMissingStats.map((stat) => {
                        // 💡 關鍵變動：卡片顏色由「新進度 (段考後)」決定
                        // 如果段考後表現好，卡片就會變回白色，給予信心
                        const colorClasses = getMissingColorClasses(stat.currentMissingCount);
                        
                        return (
                            <div 
                                key={stat.id} 
                                onClick={() => { if (stat.missingCount > 0) setMissingStudent(stat); }} 
                                className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-150 ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} text-center border-2 border-b-[8px] active:border-b-[2px] active:translate-y-[6px] hover:-translate-y-[2px] hover:shadow-md`}
                            >
                                {/* 學生姓名 */}
                                <p className="text-4xl font-black mb-1">
                                    {stat.name[0] + 'O' + stat.name.slice(2)}
                                </p>
                                
                                <div className="flex flex-col items-center">
                                    {/* 主顯示：大大的「新進度」數字 */}
                                    <p className={`text-7xl font-black mt-1 ${colorClasses.countText}`}>
                                        {stat.currentMissingCount}
                                    </p>
                                    
                                    {/* 次顯示：小字標註「前次累計」 */}
                                    {stat.legacyMissingCount > 0 && (
                                        <div className="mt-2 px-3 py-1 bg-black/10 rounded-full border border-black/5 shadow-inner">
                                            <p className="text-xl font-bold opacity-90">
                                                前次累計: {stat.legacyMissingCount}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
               </div>
           </div>
           <MonthlyStudentStats monthlyStats={monthlyStudentStats} months={filteredMonths} />
       </div>
       
      {/* 新增：全域廣播接收視窗 (學生與大螢幕用) */}
      {(() => {
          const currentBroadcastId = broadcastData?.timestamp?.toMillis?.() || broadcastData?.message;
          const isBroadcastVisible = broadcastData?.active && currentBroadcastId && currentBroadcastId !== dismissedBroadcastTime;
          
          if (!isBroadcastVisible) return null;
          
          const settings = broadcastData.settings || { bgColor: 'bg-amber-400', textColor: 'text-slate-900', fontSize: 80, biauKai: false, textAlign: 'text-center' };
          
          return (
            <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300 print:hidden">
              <div className={`${settings.bgColor} rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 md:p-16 w-full max-w-[95vw] min-h-[80vh] border-[16px] border-white/20 flex flex-col justify-center relative ${settings.textAlign === 'text-left' ? 'items-start' : (settings.textAlign === 'text-right' ? 'items-end' : 'items-center')}`}>
                
                <div className="absolute -top-20 bg-white/20 backdrop-blur-md p-6 rounded-full border-8 border-white/30 shadow-xl animate-bounce left-1/2 -translate-x-1/2">
                  <BellRing size={80} className={settings.textColor}/>
                </div>

                <div className="flex-1 flex items-center justify-center w-full py-12">
                  <p 
                     style={{ 
                         fontSize: `${settings.fontSize}px`, 
                         fontFamily: settings.biauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit' 
                     }} 
                     className={`font-black ${settings.textColor} ${settings.textAlign || 'text-center'} leading-snug whitespace-pre-wrap break-words w-full max-h-[60vh] overflow-y-auto custom-scrollbar`}
                  >
                     {broadcastData.message}
                  </p>
                </div>

                <button 
                  onClick={() => setDismissedBroadcastTime(currentBroadcastId)} 
                  className={`w-full max-w-2xl bg-black/20 hover:bg-black/40 ${settings.textColor} border-4 border-black/10 text-5xl font-black py-6 rounded-[2.5rem] shadow-xl transition-all active:scale-95 shrink-0 self-center`}
                >
                  我知道了！
                </button>
              </div>
            </div>
          );
      })()}

       {/* 廣播發布編輯器 (教師用 - 標題整合色彩主題版) */}
       {showBroadcastEditor && authMode === 'ADMIN' && (
         <div className="fixed inset-0 bg-sky-900/90 backdrop-blur-md z-[100000] flex items-center justify-center p-4 animate-in fade-in print:hidden">
           <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-10 w-full max-w-5xl border-8 border-sky-200 flex flex-col max-h-[95vh] relative">
             
             {/* 頂部：標題 + 色彩主題 + 關閉按鈕 */}
             <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b-4 border-sky-100 pb-4 shrink-0">
               <h2 className="text-4xl font-black text-sky-800 flex items-center gap-3">
                 <Megaphone size={42} /> 全域廣播控制台
               </h2>

               <div className="flex items-center gap-3">
                 {/* 圓形色彩主題按鈕群 */}
                 <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 shadow-inner">
                   {[
                     { bg: 'bg-white', text: 'text-slate-800' },
                     { bg: 'bg-amber-400', text: 'text-slate-900' },
                     { bg: 'bg-rose-600', text: 'text-white' },
                     { bg: 'bg-emerald-500', text: 'text-white' },
                     { bg: 'bg-blue-600', text: 'text-white' },
                     { bg: 'bg-slate-900', text: 'text-yellow-400' }
                   ].map((theme, i) => (
                     <button 
                       key={i}
                       type="button"
                       onClick={() => { setBcBgColor(theme.bg); setBcTextColor(theme.text); }}
                       className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 shadow-sm ${theme.bg} ${bcBgColor === theme.bg ? 'border-sky-500 scale-110 ring-4 ring-sky-200' : 'border-slate-300 hover:scale-105'}`}
                       title="套用主題"
                     >
                       <span className={`text-xl font-black ${theme.text}`}>A</span>
                     </button>
                   ))}
                 </div>

                 {/* 關閉按鈕 */}
                 <button 
                   type="button"
                   onClick={() => setShowBroadcastEditor(false)} 
                   className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-full transition-colors"
                 >
                   <X size={28} />
                 </button>
               </div>
             </div>
             
             {/* 中間：文字編輯與預覽區 */}
             <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar shrink">
               <div className="flex flex-col gap-2">
                 <label className="text-2xl font-bold text-slate-600 flex items-center gap-2">
                   <Type size={28} /> 廣播內容與即時預覽
                 </label>
                 <textarea 
                   value={broadcastInput} 
                   onChange={e => setBroadcastInput(e.target.value)} 
                   style={{ 
                     fontSize: `${bcFontSize}px`,
                     fontFamily: bcBiauKai ? '"DFKai-SB", "BiauKai", "標楷體", "Kaiti TC", "KaiTi", serif' : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                   }}
                   className={`w-full min-h-[260px] p-6 md:p-8 border-4 border-slate-200 rounded-[2rem] font-black focus:outline-none focus:border-sky-400 transition-all shadow-inner ${bcBgColor} ${bcTextColor} ${bcAlign}`} 
                   placeholder="請輸入要廣播給全班的任務或提醒..."
                 />
               </div>

               {/* 下方雙欄設定區：字體設定 + 對齊設定 */}
               <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* 左：字體設定 */}
                 <div className="space-y-3">
                   <label className="text-2xl font-bold text-slate-600 block">字體設定</label>
                   <div className="flex items-center gap-3">
                     <button 
                       type="button"
                       onClick={() => setBcBiauKai(!bcBiauKai)} 
                       className={`flex-1 py-3.5 rounded-2xl text-2xl font-bold transition-all border-2 ${bcBiauKai ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                     >
                       切換標楷體
                     </button>
                     <div className="flex items-center bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                       <button type="button" onClick={() => setBcFontSize(f => Math.max(30, f - 10))} className="p-3.5 hover:bg-slate-100 text-slate-600 transition-colors"><Minus size={24} /></button>
                       <span className="w-16 text-center text-2xl font-black text-slate-800">{bcFontSize}</span>
                       <button type="button" onClick={() => setBcFontSize(f => Math.min(150, f + 10))} className="p-3.5 hover:bg-slate-100 text-slate-600 transition-colors"><Plus size={24} /></button>
                     </div>
                   </div>
                 </div>

                 {/* 右：對齊設定 */}
                 <div className="space-y-3">
                   <label className="text-2xl font-bold text-slate-600 block">對齊設定</label>
                   <div className="flex items-center gap-2">
                     <button 
                       type="button"
                       onClick={() => setBcAlign("text-left")} 
                       className={`flex-1 py-3.5 rounded-2xl text-2xl font-bold transition-all border-2 ${bcAlign === 'text-left' ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                     >
                       靠左
                     </button>
                     <button 
                       type="button"
                       onClick={() => setBcAlign("text-center")} 
                       className={`flex-1 py-3.5 rounded-2xl text-2xl font-bold transition-all border-2 ${bcAlign === 'text-center' ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                     >
                       置中
                     </button>
                     <button 
                       type="button"
                       onClick={() => setBcAlign("text-right")} 
                       className={`flex-1 py-3.5 rounded-2xl text-2xl font-bold transition-all border-2 ${bcAlign === 'text-right' ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                     >
                       靠右
                     </button>
                   </div>
                 </div>

               </div>
             </div>
             
             {/* 底部按鈕列 */}
             <div className="flex gap-4 mt-6 pt-4 border-t-4 border-sky-100 shrink-0">
               <button 
                 type="button"
                 onClick={async () => {
                   if (!broadcastInput.trim()) return;
                   await setDoc(doc(db, "broadcasts", "current"), { 
                     message: broadcastInput.trim(), 
                     timestamp: serverTimestamp(), 
                     active: true, 
                     settings: { bgColor: bcBgColor, textColor: bcTextColor, fontSize: bcFontSize, biauKai: bcBiauKai, textAlign: bcAlign }
                   });
                   setShowBroadcastEditor(false);
                 }} 
                 className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-3xl font-black py-4 rounded-2xl shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-3"
               >
                 <Megaphone size={34} /> 立即發布全班廣播
               </button>
               <button 
                 type="button"
                 onClick={async () => {
                   await setDoc(doc(db, "broadcasts", "current"), { active: false }, { merge: true });
                   setShowBroadcastEditor(false);
                   setBroadcastInput("");
                 }} 
                 className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 text-2xl font-bold py-4 rounded-2xl transition-all border-2 border-slate-300 active:scale-95"
               >
                 收回並清除
               </button>
             </div>

           </div>
         </div>
       )}

     </div>
   </div>
   </DndProvider>
  );
};
 
export default App;
