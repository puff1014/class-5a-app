import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
   getAuth, 
   signInAnonymously, 
   signInWithEmailAndPassword, 
   signOut, 
   onAuthStateChanged 
} from 'firebase/auth';
import { 
 getFirestore, 
 collection, 
 onSnapshot, 
 doc, 
 setDoc, 
 deleteDoc, 
 query, 
 Timestamp, 
 getDocs, 
 writeBatch, 
 serverTimestamp, 
 getDoc,
 orderBy,
 where
} from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
   BookOpen, Trash2, Calendar, Download, Upload, Plus, X, Check, 
   RefreshCw, WifiOff, Lock, Settings, LogOut, FileText, AlertCircle, 
   Eye, EyeOff, Shield, User, Key, Edit, Pencil, Star, PartyPopper,
   Coins, Eraser, Moon, PlusCircle, TrendingUp, TrendingDown, Activity,
   BarChart2, CalendarCheck, AlertTriangle
} from 'lucide-react';
 
// --- 版本資訊 ---
const VERSION = 'v16.6.0 - 雙軌制：天數長條圖 & 項目折線圖(含時效扣分)'; 
 
// --- 全域變數與 Firebase 設定 ---
const appId = 'class-5a-app'; 
 
const firebaseConfig = {
 apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
 authDomain: "class-5a-app.firebaseapp.com",
 projectId: "class-5a-app",
 storageBucket: "class-5a-app.firebasestorage.app",
 messagingSenderId: "828328241350",
 appId: "1:828328241350:web:5d39d529209f87a2540fc7",
 measurementId: "G-8VGE0WKD01"
};
 
// --- 音效與圖片資源設定 ---
const ASSETS = {
   BRONZE_SOUND: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3', 
   GOLD_SOUND: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3', 
   CONFETTI_BG: 'https://i.gifer.com/origin/e2/e29a997a3a304523b087050074697df0_w200.gif'
};
 
// --- 客製化硬幣元件 ---
const CoinIcon = ({ type, size = "w-8 h-8", textSize = "text-sm", innerSize = "w-3/5 h-3/5" }) => {
   const baseClasses = `rounded-full border-[4px] flex items-center justify-center shadow-lg ${size} bg-white`;
   if (type === 'GOLD') {
       return (
           <div className={`${baseClasses} border-yellow-400 text-yellow-500 bg-yellow-50`} title="金幣">
               <Moon className={`${innerSize} fill-current`} />
           </div>
       );
    }
   if (type === 'SILVER') {
       return (
           <div className={`${baseClasses} border-gray-400 text-gray-500 bg-gray-50`} title="銀幣">
               <Star className={`${innerSize} fill-current`} />
           </div>
       );
    }
   return (
       <div className={`${baseClasses} border-orange-700 text-orange-800 bg-orange-50`} title="銅幣">
           <span className={`font-bold ${textSize}`}>$</span>
       </div>
   );
};
 
// --- 預設學生名單 ---
const DEFAULT_STUDENTS = [
  { id: '1', name: '陳昕佑' },
  { id: '2', name: '徐偉綸' },
  { id: '3', name: '蕭淵群' }, 
  { id: '4', name: '吳秉晏' },
  { id: '5', name: '呂秉蔚' },
  { id: '6', name: '吳家昇' },
  { id: '7', name: '翁芷儀' },
  { id: '8', name: '鄭筱妍' },
  { id: '9', name: '周筱涵' },
  { id: '10', name: '李婕妤' },
];
 
// 預設作業項目
const INITIAL_CATEGORIES = [
    { name: '數課', order: 0 },
    { name: '數習', order: 1 },
    { name: '數八', order: 2 },
    { name: '成語()+P.', order: 3 },
    { name: '聯P.', order: 4 }, 
    { name: '國', order: 5 },
];
 
const ItemTypes = {
 ASSIGNMENT: 'assignment',
};
 
// 公開路徑
const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;
const getTodayDate = () => { const d = new Date(); const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
 
// --- [新] SVG 折線圖元件 (用於顯示項目平均分數) ---
const SimpleLineChart = ({ data, width = 600, height = 300 }) => {
   if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據繪製圖表</div>;
 
   const padding = 40;
   const chartWidth = width - padding * 2;
   const chartHeight = height - padding * 2;
   const maxY = 100; // 分數最高100
 
   const points = data.map((d, i) => {
       const x = (i / (data.length - 1)) * chartWidth + padding;
       const safeValue = isNaN(d.value) ? 0 : d.value;
       const y = chartHeight - (safeValue / maxY) * chartHeight + padding;
       return `${x},${y}`;
   }).join(' ');
 
   const gridLines = [0, 60, 80, 100].map(val => {
       const y = chartHeight - (val / maxY) * chartHeight + padding;
       let color = "#e5e7eb"; 
       if(val === 60) color = "#fca5a5"; 
       if(val === 80) color = "#86efac"; 
       return (
           <g key={val}>
               <line x1={padding} y1={y} x2={width - padding} y2={y} stroke={color} strokeWidth="2" strokeDasharray={val === 0 ? "" : "5,5"} />
               <text x={padding - 10} y={y + 5} textAnchor="end" fontSize="12" fill="gray">{val}</text>
           </g>
       );
   });
 
   return (
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
           {gridLines}
           <polyline fill="none" stroke="#3b82f6" strokeWidth="4" points={points} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />
           {data.map((d, i) => {
               const x = (i / (data.length - 1)) * chartWidth + padding;
               const safeValue = isNaN(d.value) ? 0 : d.value;
               const y = chartHeight - (safeValue / maxY) * chartHeight + padding;
               let dotColor = "#ef4444"; 
               if (safeValue >= 60) dotColor = "#eab308"; 
               if (safeValue >= 80) dotColor = "#22c55e"; 
               return (
                   <g key={i} className="group">
                        <circle cx={x} cy={y} r="6" fill={dotColor} stroke="white" strokeWidth="2" className="transition-all duration-300 group-hover:r-8 cursor-pointer"/>
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <rect x={x - 20} y={y - 35} width="40" height="25" rx="4" fill="black" fillOpacity="0.8" />
                            <text x={x} y={y - 18} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{safeValue.toFixed(1)}</text>
                        </g>
                        <text x={x} y={height - 10} textAnchor="middle" fontSize="14" fill="#374151" fontWeight="500">{d.label}</text>
                   </g>
               );
           })}
        </svg>
   );
};
 
// --- [新] SVG 堆疊長條圖元件 (用於顯示天數完成率) ---
const SimpleStackedBarChart = ({ data, width = 600, height = 300 }) => {
   if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據繪製圖表</div>;
 
   const padding = 40;
   const chartWidth = width - padding * 2;
   const chartHeight = height - padding * 2;
 
   // Y軸固定為總天數 (找出最大總天數)
   const maxTotal = Math.max(...data.map(d => d.details.totalDays), 10); 
   const barWidth = Math.min(60, chartWidth / data.length * 0.6); 
 
   return (
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
           <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
           <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
           
           {data.map((d, i) => {
               const x = padding + (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2;
               
               const totalHeight = chartHeight;
               const totalDays = d.details.totalDays || 1;
               const passedDays = d.details.passedDays; // 完成 (全綠)
               const lateDays = d.details.lateDays;     // 遲交 (無紅)
               const failedDays = d.details.failedDays; // 缺交 (有紅)
 
               const passedHeight = (passedDays / maxTotal) * totalHeight;
               const lateHeight = (lateDays / maxTotal) * totalHeight;
               const failedHeight = (failedDays / maxTotal) * totalHeight;
 
               // 綠色 (最下)
               const yGreen = (height - padding) - passedHeight;
               // 黃色 (中)
               const yYellow = yGreen - lateHeight;
               // 紅色 (上)
               const yRed = yYellow - failedHeight;
 
               return (
                   <g key={i} className="group">
                       {/* 綠色：完成日 */}
                       {passedDays > 0 && (
                           <rect x={x} y={yGreen} width={barWidth} height={passedHeight} fill="#4ade80" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>
                       )}
                       {/* 黃色：遲交日 */}
                       {lateDays > 0 && (
                           <rect x={x} y={yYellow} width={barWidth} height={lateHeight} fill="#facc15" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>
                       )}
                       {/* 紅色：缺交日 */}
                       {failedDays > 0 && (
                           <rect x={x} y={yRed} width={barWidth} height={failedHeight} fill="#f87171" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>
                       )}
 
                       {/* 總數標籤 */}
                       <text x={x + barWidth/2} y={yRed - 5} textAnchor="middle" fontSize="14" fill="#6b7280" fontWeight="bold">
                           {totalDays}
                       </text>
 
                       <text x={x + barWidth/2} y={height - 10} textAnchor="middle" fontSize="14" fill="#374151" fontWeight="500">{d.label}</text>
                       
                       <title>{`${d.label}：\n🟢 完成日：${passedDays}\n🟡 遲交日：${lateDays}\n🔴 缺交日：${failedDays}`}</title>
                   </g>
               );
           })}
       </svg>
   );
};
// --- [修改版] 學生學習歷程 Dashboard Modal ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
   // VIEW_MODE: 'DAYS' (每日完成率), 'ITEMS' (項目分數)
    const [viewMode, setViewMode] = useState('DAYS');
 
   // 計算數據
   const { chartData, semesterStats } = useMemo(() => {
       const statsByMonth = {};
       const sortedDates = Object.keys(allAssignmentsByDate).sort();
       
       // 學期總計變數
       let semesterTotalDays = 0;
       let semesterPassedDays = 0;
       let semesterTotalScore = 0;
       let semesterTotalItems = 0;
       let monthCount = 0;
 
       if(sortedDates.length > 0) {
           sortedDates.forEach(date => {
               const dateObj = new Date(date);
               const monthKey = `${dateObj.getMonth() + 1}月`;
               
               if (!statsByMonth[monthKey]) {
                    statsByMonth[monthKey] = { 
                        // 天數統計 (Tab 1)
                        totalDays: 0,
                        passedDays: 0, // 全綠
                        lateDays: 0,   // 無紅有黃
                        failedDays: 0, // 有紅
                        // 項目分數統計 (Tab 2)
                        totalScore: 0,
                        itemCount: 0
                    };
                    monthCount++;
               }
 
               const assignments = allAssignmentsByDate[date];
               
               // --- 天數邏輯 ---
               let hasRed = false;
               let hasYellow = false;
               
               // --- 項目邏輯 ---
               assignments.forEach(assign => {
                    const status = assign.submissionStatus[student.id];
                    const lateDate = assign.lateDates ? assign.lateDates[student.id] : null;
                    const assignDateStr = assign.assignmentDate;
 
                    // 1. 判斷燈號 (天數用)
                    if (status === false) hasRed = true;
                    if (status === 'late') hasYellow = true;
                    
                    // 2. 計算分數 (項目用)
                    let score = 0;
                    if (status === true || status === undefined) {
                        score = 100;
                    } else if (status === false) {
                        score = 0;
                    } else if (status === 'late') {
                        // 遲交計算邏輯
                        if (lateDate) {
                            // 新資料：有補交日期
                            const d1 = new Date(assignDateStr);
                            const d2 = new Date(lateDate);
                            const diffTime = Math.abs(d2 - d1);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                            // 修正：如果 diffDays = 0 (同天)，視為 0 天
                            // 公式：100 - (天數 * 5)，底限 0
                            const penalty = diffDays * 5;
                            score = Math.max(0, 100 - penalty);
                        } else {
                            // 舊資料：無補交日期 -> 60分
                            score = 60;
                        }
                    }
                    
                    statsByMonth[monthKey].totalScore += score;
                    statsByMonth[monthKey].itemCount++;
                    semesterTotalScore += score;
                    semesterTotalItems++;
               });
 
               // 結算當日狀態
               statsByMonth[monthKey].totalDays++;
               semesterTotalDays++;
 
               if (hasRed) {
                   statsByMonth[monthKey].failedDays++; // 缺交日
               } else if (hasYellow) {
                   statsByMonth[monthKey].lateDays++;   // 遲交日 (雖遲但到)
               } else {
                   statsByMonth[monthKey].passedDays++; // 完成日 (完美)
                   semesterPassedDays++;
               }
           });
       }
 
       const data = Object.keys(statsByMonth).map(key => {
           const d = statsByMonth[key];
           // 如果是 DAYS 模式，value 用「天數完成率」；如果是 ITEMS 模式，value 用「平均分數」
           const dayRate = d.totalDays === 0 ? 0 : (d.passedDays / d.totalDays) * 100;
           const avgScore = d.itemCount === 0 ? 0 : (d.totalScore / d.itemCount);
 
           return {
               label: key,
               value: viewMode === 'DAYS' ? dayRate : avgScore,
               details: d
           };
       });
 
       return { 
           chartData: data, 
           semesterStats: {
               // 天數完成率
               completionRate: semesterTotalDays === 0 ? 0 : ((semesterPassedDays / semesterTotalDays) * 100).toFixed(1),
               // 項目平均分
               avgScore: semesterTotalItems === 0 ? 0 : (semesterTotalScore / semesterTotalItems).toFixed(1)
           }
       };
   }, [allAssignmentsByDate, student.id, viewMode]);
 
   // 取得評語
   const getFeedback = () => {
       if (viewMode === 'DAYS') {
           const rate = parseFloat(semesterStats.completionRate);
           if (rate >= 90) return { text: "🏆 每日完成率極高！你的堅持與自律值得嘉獎。", color: "text-green-600" };
           if (rate >= 80) return { text: "👍 表現不錯！大部分的日子都能準時完成任務。", color: "text-blue-600" };
           if (rate >= 60) return { text: "💪 還有進步空間，試著減少那些「未完成」的日子。", color: "text-yellow-600" };
           return { text: "⚠️ 即使作業不多，也要練習「當日事當日畢」喔！", color: "text-red-500" };
        } else {
           const score = parseFloat(semesterStats.avgScore);
           if (score >= 90) return { text: "✨ 作業平均分很高！代表你不僅準時，品質也維持得很好。", color: "text-green-600" };
           if (score >= 80) return { text: "🛡️ 成績穩健！就算偶爾遲交，你也都有負責補上。", color: "text-blue-600" };
           if (score >= 60) return { text: "🔨 有些分數被「遲交」扣掉了，下次動作快一點會更高分！", color: "text-orange-500" };
           return { text: "🧨 紅燈(0分)太傷了！缺交對分數影響最大，請務必補救。", color: "text-red-500" };
       }
   };
 
   const feedback = getFeedback();
 
   return (
       <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border-4 border-white">
               
               {/* Header */}
               <div className={`p-6 flex justify-between items-center text-white shrink-0 transition-colors duration-500 ${viewMode === 'DAYS' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
                   <div className="flex items-center gap-4">
                       <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg border-4 ${viewMode === 'DAYS' ? 'text-emerald-600 border-emerald-200' : 'text-indigo-600 border-indigo-200'}`}>
                           {student.id}
                       </div>
                       <div>
                           <h2 className="text-4xl font-bold tracking-wide">{student.name} 的學習歷程</h2>
                           <p className="text-white/90 text-xl font-medium mt-1 flex items-center gap-2">
                                <Activity className="w-5 h-5" /> 
                               {semesterId === 'S1' ? '上學期' : '下學期'}雙軌分析報表
                           </p>
                       </div>
                   </div>
                   <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-md">
                       <X className="w-8 h-8" />
                   </button>
               </div>
 
               {/* Content */}
               <div className="flex-1 overflow-auto p-8 bg-gray-50">
                  
                   {/* 切換按鈕 (Toggle) */}
                   <div className="flex justify-center mb-8">
                       <div className="bg-gray-200 p-1 rounded-xl flex gap-1 shadow-inner">
                           <button 
                               onClick={() => setViewMode('DAYS')}
                               className={`px-6 py-2 rounded-lg text-xl font-bold transition-all duration-300 ${viewMode === 'DAYS' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                           >
                                📅 每日完成率 (習慣)
                           </button>
                           <button 
                                onClick={() => setViewMode('ITEMS')}
                               className={`px-6 py-2 rounded-lg text-xl font-bold transition-all duration-300 ${viewMode === 'ITEMS' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                           >
                                📊 作業項目分數 (成績)
                           </button>
                       </div>
                   </div>
 
                   {/* Top Stats Cards */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                       {/* Card 1: 資產 (維持不變) */}
                       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                           <div className="p-4 bg-yellow-100 text-yellow-600 rounded-2xl">
                                <Coins className="w-10 h-10" />
                           </div>
                           <div>
                                <p className="text-gray-500 text-lg font-bold">目前資產</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-gray-800">{bankBalance?.gold || 0}</span>
                                    <span className="text-sm text-yellow-500 font-bold">金</span>
                                    <span className="text-2xl font-bold text-gray-400">/</span>
                                    <span className="text-4xl font-black text-gray-800">{bankBalance?.silver || 0}</span>
                                    <span className="text-sm text-gray-400 font-bold">銀</span>
                                </div>
                           </div>
                       </div>
 
                       {/* Card 2: 根據模式變換數據 */}
                       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                           <div className={`p-4 rounded-2xl ${viewMode === 'DAYS' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {viewMode === 'DAYS' ? <CalendarCheck className="w-10 h-10" /> : <TrendingUp className="w-10 h-10" />}
                           </div>
                           <div>
                                <p className="text-gray-500 text-lg font-bold">
                                    {viewMode === 'DAYS' ? '本學期全勤率' : '本學期作業平均'}
                                </p>
                                <p className={`text-5xl font-black ${viewMode === 'DAYS' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                    {viewMode === 'DAYS' ? semesterStats.completionRate : semesterStats.avgScore}
                                    <span className="text-xl ml-1 text-gray-400 font-medium">
                                        {viewMode === 'DAYS' ? '%' : '分'}
                                   </span>
                                </p>
                           </div>
                       </div>
 
                       {/* Card 3: 評語 */}
                       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                           <p className="text-gray-500 font-bold mb-2">綜合短評</p>
                           <p className={`${feedback.color} font-bold text-xl`}>{feedback.text}</p>
                       </div>
                   </div>
 
                   {/* Chart Section */}
                   <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 mb-8">
                       <h3 className="text-2xl font-bold text-gray-700 mb-6 flex items-center">
                           {viewMode === 'DAYS' ? (
                               <><CalendarCheck className="w-6 h-6 mr-2 text-emerald-500" /> 每月作業完成天數 (長條圖)</>
                           ) : (
                               <><TrendingUp className="w-6 h-6 mr-2 text-indigo-500" /> 每月平均分數走勢 (折線圖)</>
                           )}
                       </h3>
                       <div className="h-[350px] w-full">
                           {viewMode === 'DAYS' ? (
                               <SimpleStackedBarChart data={chartData} />
                           ) : (
                               <SimpleLineChart data={chartData} />
                           )}
                       </div>
                       
                       {/* Legend */}
                       {viewMode === 'DAYS' && (
                           <div className="flex justify-center gap-6 mt-4 text-sm font-bold text-gray-500">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-400"></div>完成日 (全綠)</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-400"></div>遲交日 (有黃無紅)</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-400"></div>缺交日 (有紅)</div>
                           </div>
                       )}
                   </div>
 
                   {/* Monthly Detail Table */}
                   <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                       <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-100">
                               <tr>
                                   <th className="px-6 py-4 text-left text-xl font-bold text-gray-600">月份</th>
                                   {viewMode === 'DAYS' ? (
                                       <>
                                           <th className="px-6 py-4 text-center text-xl font-bold text-emerald-600">完成日</th>
                                           <th className="px-6 py-4 text-center text-xl font-bold text-yellow-600">遲交日</th>
                                           <th className="px-6 py-4 text-center text-xl font-bold text-red-600">缺交日</th>
                                           <th className="px-6 py-4 text-center text-xl font-bold text-gray-700">完成率</th>
                                       </>
                                   ) : (
                                       <>
                                           <th className="px-6 py-4 text-center text-xl font-bold text-gray-600">總項目</th>
                                           <th className="px-6 py-4 text-center text-xl font-bold text-indigo-600">平均分數</th>
                                       </>
                                   )}
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-200">
                               {chartData.map((row, idx) => (
                                   <tr key={idx} className="hover:bg-gray-50">
                                       <td className="px-6 py-4 text-xl font-bold text-gray-800">{row.label}</td>
                                       {viewMode === 'DAYS' ? (
                                           <>
                                               <td className="px-6 py-4 text-center text-xl font-medium text-emerald-600">{row.details.passedDays} 天</td>
                                               <td className="px-6 py-4 text-center text-xl font-medium text-yellow-600">{row.details.lateDays} 天</td>
                                               <td className="px-6 py-4 text-center text-xl font-medium text-red-600">{row.details.failedDays} 天</td>
                                               <td className="px-6 py-4 text-center">
                                                   <span className="inline-block px-3 py-1 rounded-full text-lg font-bold bg-emerald-100 text-emerald-700">
                                                       {row.value.toFixed(0)}%
                                                   </span>
                                               </td>
                                           </>
                                       ) : (
                                           <>
                                               <td className="px-6 py-4 text-center text-xl font-medium text-gray-600">{row.details.itemCount} 項</td>
                                               <td className="px-6 py-4 text-center">
                                                   <span className="inline-block px-3 py-1 rounded-full text-lg font-bold bg-indigo-100 text-indigo-700">
                                                       {row.value.toFixed(1)} 分
                                                   </span>
                                               </td>
                                           </>
                                       )}
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       </div>
   );
};
// --- 獎勵回饋元件 ---
const RewardOverlay = ({ type, onClose }) => {
   const soundUrl = type === 'GOLD_CLEAR' ? ASSETS.GOLD_SOUND : ASSETS.BRONZE_SOUND;
   const duration = type === 'GOLD_CLEAR' ? 6000 : 1000;
 
   useEffect(() => {
       const timer = setTimeout(() => {
           onClose();
       }, duration);
       return () => clearTimeout(timer);
   }, [duration, onClose]);
 
   if (type === 'GOLD_CLEAR') {
       return (
           <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 animate-fade-in overflow-hidden">
               <audio src={soundUrl} autoPlay />
               <div className="absolute inset-0 opacity-70 pointer-events-none">
                   <img src={ASSETS.CONFETTI_BG} alt="Confetti" className="w-full h-full object-cover" />
               </div>
               <div className="relative z-10 flex flex-col items-center justify-center animate-bounce-in text-center p-8">
                   <div className="mb-12 drop-shadow-[0_0_60px_rgba(255,223,0,0.8)] animate-pulse transform scale-[2.5]">
                       <CoinIcon type="GOLD" size="w-32 h-32" innerSize="w-20 h-20" />
                   </div>
                   <h2 className="text-6xl md:text-8xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,1)] tracking-widest leading-snug">
                       恭喜你🎉<br/>完成所有作業😁<br/>你真棒👍
                   </h2>
               </div>
           </div>
       );
    }
 
   return (
       <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-30 animate-fade-in pointer-events-none">
           <audio src={soundUrl} autoPlay />
           <div className="flex flex-col gap-6 items-center justify-center animate-bounce-in transform scale-110 bg-white/95 p-12 rounded-[3rem] shadow-2xl border-8 border-orange-400 min-w-[320px]">
               <CoinIcon type="BRONZE" size="w-40 h-40" textSize="text-8xl" />
               <h2 className="text-7xl font-black text-orange-700 drop-shadow-sm tracking-wider whitespace-nowrap">
                   + 10 銅幣
               </h2>
           </div>
       </div>
   );
};
 
// --- 學生存簿 Hook ---
const useStudentBank = (db, isAuthReady, isOffline, students) => {
   const initialData = useMemo(() => {
       const data = {};
       students.forEach(s => data[s.id] = { bronze: 0, silver: 0, gold: 0 });
       return data;
   }, [students]);
 
   const [bankData, setBankData] = useState(initialData);
   
   useEffect(() => {
       if (isOffline) return;
       if (!isAuthReady || !db) return;
       const q = query(collection(db, getBankCollectionPath()));
       const unsubscribe = onSnapshot(q, (snapshot) => {
           const remoteData = {};
           snapshot.docs.forEach(doc => { remoteData[doc.id] = doc.data(); });
           setBankData(prev => {
               const newData = { ...prev };
               Object.keys(remoteData).forEach(key => {
                   newData[key] = {
                       bronze: Number(remoteData[key].bronze) || 0,
                       silver: Number(remoteData[key].silver) || 0,
                       gold: Number(remoteData[key].gold) || 0,
                   };
               });
               return newData;
           });
       }, (error) => { console.error("Bank sync error:", error); });
       return () => unsubscribe();
   }, [isAuthReady, db, isOffline, initialData]);
 
   const updateBankBalance = useCallback(async (studentId, addBronze, addSilver, addGold) => {
       const calculateNewBalance = (current, adds) => {
           let newBronze = (current.bronze || 0) + adds.bronze;
           let newSilver = (current.silver || 0) + adds.silver;
           let newGold = (current.gold || 0) + adds.gold;
 
           if (adds.bronze === 'RESET') newBronze = 0;
           if (adds.silver === 'RESET') newSilver = 0;
           if (adds.gold === 'RESET') newGold = 0;
 
           if (adds.bronze !== 'RESET' && adds.silver !== 'RESET' && adds.gold !== 'RESET') {
                if (newBronze >= 100) {
                   const silverGain = Math.floor(newBronze / 100);
                   newBronze = newBronze % 100;
                   newSilver += silverGain;
               }
               if (newSilver >= 10) {
                   const goldGain = Math.floor(newSilver / 10);
                   newSilver = newSilver % 10;
                   newGold += goldGain;
               }
           }
           return { bronze: Math.max(0, newBronze), silver: Math.max(0, newSilver), gold: Math.max(0, newGold) };
       };
 
       const adds = { bronze: addBronze, silver: addSilver, gold: addGold };
 
       setBankData(prev => {
           const current = prev[studentId] || { bronze: 0, silver: 0, gold: 0 };
           const newState = calculateNewBalance(current, adds);
           return { ...prev, [studentId]: newState };
       });
 
       if (isOffline || !db) return;
       try {
            const docRef = doc(db, getBankCollectionPath(), studentId);
            const docSnap = await getDoc(docRef);
            let current = { bronze: 0, silver: 0, gold: 0 };
            if (docSnap.exists()) {
                 const data = docSnap.data();
                 current = { bronze: Number(data.bronze) || 0, silver: Number(data.silver) || 0, gold: Number(data.gold) || 0 };
            }
            const newState = calculateNewBalance(current, adds);
            await setDoc(docRef, { ...newState, lastUpdated: serverTimestamp() }, { merge: true });
       } catch (e) { console.error("Error updating bank:", e); }
   }, [db, isOffline]);
 
   return { bankData, updateBankBalance };
};
 
// --- 學生存簿 Modal ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, authMode, students }) => {
   const sortedStudents = [...students].sort((a, b) => {
       const bankA = bankData[a.id] || { bronze: 0, silver: 0, gold: 0 };
       const bankB = bankData[b.id] || { bronze: 0, silver: 0, gold: 0 };
       if (bankA.gold !== bankB.gold) return bankB.gold - bankA.gold;
       if (bankA.silver !== bankB.silver) return bankB.silver - bankA.silver;
       if (bankA.bronze !== bankB.bronze) return bankB.bronze - bankA.bronze;
       return parseInt(a.id) - parseInt(b.id);
   });
 
   const handleReset = (studentId, type) => {
       const labels = { 'BRONZE': '銅幣', 'SILVER': '銀幣', 'GOLD': '金幣' };
       if (!window.confirm(`確定要將此學生的【${labels[type]}】全部歸零嗎？`)) return;
       if (type === 'BRONZE') onUpdateBalance(studentId, 'RESET', 0, 0);
       if (type === 'SILVER') onUpdateBalance(studentId, 0, 'RESET', 0);
       if (type === 'GOLD') onUpdateBalance(studentId, 0, 0, 'RESET');
   };
 
   const handleManualAdd = (studentId, type) => {
       const labels = { 'BRONZE': '銅幣', 'SILVER': '銀幣', 'GOLD': '金幣' };
       const input = prompt(`【補發模式】\n請輸入要補發給學生的【${labels[type]}】數量：\n(輸入負數可進行扣除)`, "1");
       if (input === null) return;
       const amount = parseInt(input, 10);
       if (isNaN(amount)) { alert("請輸入有效的數字。"); return; }
       if (type === 'BRONZE') onUpdateBalance(studentId, amount, 0, 0);
       if (type === 'SILVER') onUpdateBalance(studentId, 0, amount, 0);
       if (type === 'GOLD') onUpdateBalance(studentId, 0, 0, amount);
   };
 
   return (
       <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4">
           <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-7xl h-[90vh] flex flex-col border border-green-200">
               <div className="flex justify-between items-center mb-6 border-b border-green-200 pb-4">
                   <h3 className="text-4xl font-bold text-gray-800 flex items-center">
                       <div className="mr-3 transform scale-125"><CoinIcon type="GOLD" /></div>訂正存簿
                   </h3>
                   <div className="flex items-center gap-4">
                       <div className="text-xl text-gray-600 font-bold bg-gray-100 px-4 py-2 rounded-lg border border-gray-300 flex items-center gap-3">
                           <span>匯率：</span>
                           <span className="flex items-center text-orange-700"><div className="mr-1 transform scale-75"><CoinIcon type="BRONZE"/></div>100</span>
                           ➔
                           <span className="flex items-center text-gray-500"><div className="mr-1 transform scale-75"><CoinIcon type="SILVER"/></div>1</span>
                           ，
                           <span className="flex items-center text-gray-500"><div className="mr-1 transform scale-75"><CoinIcon type="SILVER"/></div>10</span>
                           ➔
                           <span className="flex items-center text-yellow-600"><div className="mr-1 transform scale-75"><CoinIcon type="GOLD"/></div>1</span>
                       </div>
                       <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"><X className="w-8 h-8" /></button>
                   </div>
               </div>
 
               <div className="flex-1 overflow-auto bg-green-50 rounded-xl p-4 border border-green-100">
                   <table className="min-w-full divide-y divide-green-200">
                       <thead className="bg-green-100 sticky top-0 z-10 shadow-sm">
                           <tr>
                               <th className="px-4 py-4 text-2xl font-bold text-green-900 w-20 text-center">名次</th>
                               <th className="px-4 py-4 text-2xl font-bold text-green-900 w-24 text-center">座號</th>
                               <th className="px-4 py-4 text-2xl font-bold text-green-900 w-32 text-center">姓名</th>
                               <th className="px-4 py-4 text-2xl font-bold text-yellow-600 text-center">金幣</th>
                               <th className="px-4 py-4 text-2xl font-bold text-gray-500 text-center">銀幣</th>
                               <th className="px-4 py-4 text-2xl font-bold text-orange-700 text-center">銅幣</th>
                               {authMode === 'ADMIN' && ( <th className="px-4 py-4 text-2xl font-bold text-green-900 text-center">操作 (補發/歸零)</th> )}
                           </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-green-100">
                           {sortedStudents.map((student, index) => {
                               const data = bankData[student.id] || { bronze: 0, silver: 0, gold: 0 };
                               let rankIcon = index < 3 ? ["🥇","🥈","🥉"][index] : index + 1;
                               return (
                                   <tr key={student.id} className="hover:bg-green-50 transition duration-100">
                                       <td className="px-4 py-4 text-3xl font-black text-gray-700 text-center">{rankIcon}</td>
                                       <td className="px-4 py-4 text-2xl text-gray-600 font-medium text-center">{student.id}</td>
                                       <td className="px-4 py-4 text-2xl text-gray-900 font-bold text-center">{student.name[0] + 'O' + student.name.slice(2)}</td>
                                       <td className="px-4 py-4 text-center"><div className="inline-flex items-center justify-center bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-full shadow-sm min-w-[100px]"><div className="mr-2"><CoinIcon type="GOLD" size="w-8 h-8"/></div><span className="text-3xl font-black text-yellow-600">{data.gold}</span></div></td>
                                       <td className="px-4 py-4 text-center"><div className="inline-flex items-center justify-center bg-gray-50 border border-gray-200 px-4 py-2 rounded-full shadow-sm min-w-[100px]"><div className="mr-2"><CoinIcon type="SILVER" size="w-8 h-8"/></div><span className="text-3xl font-black text-gray-600">{data.silver}</span></div></td>
                                       <td className="px-4 py-4 text-center"><div className="inline-flex items-center justify-center bg-orange-50 border border-orange-200 px-4 py-2 rounded-full shadow-sm min-w-[100px]"><div className="mr-2"><CoinIcon type="BRONZE" size="w-8 h-8" textSize="text-lg"/></div><span className="text-3xl font-bold text-orange-700">{data.bronze}</span></div></td>
                                       {authMode === 'ADMIN' && (
                                           <td className="px-4 py-4 text-center">
                                               <div className="flex flex-row items-center justify-center gap-4">
                                                   <div className="flex gap-1 items-center bg-yellow-50 p-1 rounded-lg border border-yellow-200">
                                                       <button onClick={() => handleManualAdd(student.id, 'GOLD')} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg shadow-sm" title="補發金幣"><PlusCircle className="w-5 h-5"/></button>
                                                       <button onClick={() => handleReset(student.id, 'GOLD')} className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg shadow-sm" title="歸零金幣"><Eraser className="w-5 h-5"/></button>
                                                   </div>
                                                   <div className="flex gap-1 items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
                                                       <button onClick={() => handleManualAdd(student.id, 'SILVER')} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg shadow-sm" title="補發銀幣"><PlusCircle className="w-5 h-5"/></button>
                                                       <button onClick={() => handleReset(student.id, 'SILVER')} className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg shadow-sm" title="歸零銀幣"><Eraser className="w-5 h-5"/></button>
                                                   </div>
                                                   <div className="flex gap-1 items-center bg-orange-50 p-1 rounded-lg border border-orange-200">
                                                       <button onClick={() => handleManualAdd(student.id, 'BRONZE')} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg shadow-sm" title="補發銅幣"><PlusCircle className="w-5 h-5"/></button>
                                                       <button onClick={() => handleReset(student.id, 'BRONZE')} className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg shadow-sm" title="歸零銅幣"><Eraser className="w-5 h-5"/></button>
                                                   </div>
                                               </div>
                                           </td>
                                       )}
                                   </tr>
                               );
                           })}
                       </tbody>
                   </table>
               </div>
               <div className="mt-4 pt-4 border-t border-green-200 text-right"><button onClick={onClose} className="bg-green-600 text-white py-3 px-8 rounded-xl hover:bg-green-700 transition text-2xl font-bold shadow-md">關閉存簿</button></div>
           </div>
       </div>
   );
};
// --- Main App Component ---
const App = () => {
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
 const [dashboardStudent, setDashboardStudent] = useState(null);
 const { students, loadingStudents } = useStudents(db, isOffline);
 const { bankData, updateBankBalance } = useStudentBank(db, isAuthReady, isOffline, students);
 const { defaultSemester, defaultMonth } = useMemo(() => { const today = new Date(); const m = today.getMonth() + 1; const monthStr = String(m).padStart(2, '0'); let sem = 'S1'; if (m >= 2 && m <= 7) { sem = 'S2'; } return { defaultSemester: sem, defaultMonth: monthStr }; }, []);
 const [selectedSemester, setSelectedSemester] = useState(defaultSemester); const [selectedMonth, setSelectedMonth] = useState(defaultMonth); const [unlockClicks, setUnlockClicks] = useState({}); 
 const academicYear = "114"; const startYear = 2025; const endYear = 2026;
 const semesters = [ { id: 'S1', name: `上學期 (${startYear}/8 - ${endYear}/1)`, startMonth: '08', endMonth: '01', startYear: startYear, endYear: endYear }, { id: 'S2', name: `下學期 (${endYear}/2 - ${endYear}/7)`, startMonth: '02', endMonth: '07', startYear: endYear, endYear: endYear }, ];
 const months = useMemo(() => [ { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' }, { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' }, { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' }, { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' }, { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' }, { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' }, { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' }, { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' }, ], []);
 const { categories, loadingCategories, addCategory, deleteCategory, editCategory, moveCategory, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students); 
 useEffect(() => { const timer = setTimeout(() => { if (loading) setAuthTimeout(true); }, 3000); if (!firebaseConfig) { console.error("Firebase configuration is missing."); setError("無法載入 Firebase 設定。請檢查環境配置。"); setLoading(false); return; } try { const app = initializeApp(firebaseConfig); const firestore = getFirestore(app); const firebaseAuth = getAuth(app); setDb(firestore); setAuth(firebaseAuth); const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => { if (user) { setUserId(user.uid); setIsAuthReady(true); setIsAuthenticated(true); if (user.isAnonymous) { setAuthMode('GUEST'); } else { setAuthMode('ADMIN'); } } else { setIsAuthenticated(false); setAuthMode('GUEST'); } setLoadingLogin(false); }); return () => { unsubscribe(); clearTimeout(timer); }; } catch (e) { console.error("Firebase initialization failed:", e); setError("初始化失敗：" + e.message); setLoading(false); } }, []);
 const handleGoOffline = () => { setIsOffline(true); setUserId('guest_user'); setIsAuthReady(true); setLoading(false); setIsAuthenticated(true); setAuthMode('GUEST'); };
 const handleAdminLogin = async (email, password) => { setLoadingLogin(true); setLoginError(''); try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { console.error("Login failed", error); if (error.code === 'auth/invalid-email') { setLoginError('Email 格式不正確'); } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { setLoginError('帳號或密碼錯誤'); } else if (error.code === 'auth/too-many-requests') { setLoginError('嘗試次數過多，請稍後再試'); } else { setLoginError('登入失敗：' + error.message); } setLoadingLogin(false); } };
 const handleGuestLogin = async () => { setLoadingLogin(true); setLoginError(''); try { await signInAnonymously(auth); } catch (error) { console.error("Anonymous login failed", error); setLoginError('訪客登入失敗，請稍後再試。'); setLoadingLogin(false); } };
 const handleLogout = async () => { try { await signOut(auth); setIsAuthenticated(false); setAuthMode('GUEST'); } catch (e) { console.error("Logout failed", e); } };
 useEffect(() => { if (isOffline) { setLoading(false); return; } if (!isAuthReady || !db || !userId) return; const path = getAssignmentCollectionPath(); const assignmentsCollection = collection(db, path); const currentSemData = semesters.find(s => s.id === selectedSemester); let q; if (currentSemData) { const startDate = `${currentSemData.startYear}-${currentSemData.startMonth}-01`; const endDate = `${currentSemData.endYear}-${currentSemData.endMonth}-31`; q = query( assignmentsCollection, where("assignmentDate", ">=", startDate), where("assignmentDate", "<=", endDate) ); } else { q = query(assignmentsCollection); } const unsubscribe = onSnapshot(q, (snapshot) => { const groupedData = {}; snapshot.docs.forEach(doc => { const data = doc.data(); const date = data.assignmentDate; if (date) { if (!groupedData[date]) { groupedData[date] = []; } groupedData[date].push({ id: doc.id, assignmentName: data.assignmentName, order: data.order ?? 999, submissionStatus: data.submissionStatus || {}, lateDates: data.lateDates || {}, createdAt: data.createdAt?.toDate().toISOString() }); } }); setAllAssignmentsByDate(groupedData); if (!loadingCategories) { setLoading(false); } }, (e) => { console.error("Error fetching assignments:", e); if (e.code === 'permission-denied') { console.warn("Permission denied (transient)"); } else { setAlertMessage("讀取資料時發生錯誤，請稍後再試。"); setAuthTimeout(true); } setLoading(false); }); return () => unsubscribe(); }, [isAuthReady, db, userId, loadingCategories, isOffline, selectedSemester]);
 const assignmentsForSelectedDate = useMemo(() => { const assignments = allAssignmentsByDate[selectedDisplayDate] || []; return assignments.sort((a, b) => a.order - b.order); }, [allAssignmentsByDate, selectedDisplayDate]);
 const assignmentMap = useMemo(() => { return assignmentsForSelectedDate.reduce((acc, assignment) => { acc[assignment.assignmentName] = { id: assignment.id, submissionStatus: assignment.submissionStatus }; return acc; }, {}); }, [assignmentsForSelectedDate]);
 const filteredMonths = useMemo(() => { const currentSemesterData = semesters.find(s => s.id === selectedSemester); if (!currentSemesterData) return months; return months.filter(m => m.semester === selectedSemester); }, [months, selectedSemester, semesters]);
 useEffect(() => { if (filteredMonths.length > 0) { const currentMonthExists = filteredMonths.some(m => m.id === selectedMonth); if (!currentMonthExists) { setSelectedMonth(filteredMonths[0].id); } } }, [selectedSemester, filteredMonths, selectedMonth]);
 const availableDates = useMemo(() => { const dates = Object.keys(allAssignmentsByDate).sort(); if (dates.length > 0) { if (!dates.includes(selectedDisplayDate)) { setSelectedDisplayDate(dates[dates.length - 1]); } } else if (dates.length === 0 && selectedDisplayDate !== getTodayDate()) { setSelectedDisplayDate(getTodayDate()); } return dates; }, [allAssignmentsByDate, selectedDisplayDate]);
 const displayedDates = useMemo(() => { const dates = Object.keys(allAssignmentsByDate).sort(); const filteredByMonth = dates.filter(date => { const dateMonth = date.substring(5, 7); return dateMonth === selectedMonth; }).sort(); return filteredByMonth; }, [allAssignmentsByDate, selectedMonth]);
 useEffect(() => { if (displayedDates.length > 0 && !displayedDates.includes(selectedDisplayDate)) { setSelectedDisplayDate(displayedDates[0]); } else if (displayedDates.length === 0) { setSelectedDisplayDate(getTodayDate()); } }, [displayedDates, selectedDisplayDate]);
 const studentMissingStats = useMemo(() => { const stats = students.map(student => ({ id: student.id, name: student.name, missingCount: 0, missingDetails: [] })); Object.keys(allAssignmentsByDate).forEach(date => { const assignmentsOnDate = allAssignmentsByDate[date] || []; assignmentsOnDate.forEach(assignment => { const submissionStatus = assignment.submissionStatus || {}; students.forEach((student, index) => { if (submissionStatus[student.id] === false) { stats[index].missingCount += 1; stats[index].missingDetails.push({ date: date, assignment: assignment.assignmentName }); } }); }); }); stats.sort((a, b) => b.missingCount - a.missingCount); return stats; }, [allAssignmentsByDate, students]);
 const monthlyStudentStats = useMemo(() => { const stats = {}; students.forEach(student => { stats[student.id] = { studentName: student.name, monthStats: {} }; months.forEach(month => { stats[student.id].monthStats[month.id] = { daysCompleted: 0, daysLate: 0, daysMissing: 0, totalDays: 0 }; }); }); Object.keys(allAssignmentsByDate).forEach(date => { const monthId = date.substring(5, 7); const assignmentsOnDate = allAssignmentsByDate[date] || []; if (assignmentsOnDate.length === 0) return; students.forEach(student => { if (stats[student.id].monthStats[monthId]) { let worstStatusOfDay = 'true'; for (const assignment of assignmentsOnDate) { const status = assignment.submissionStatus[student.id]; if (status === false) { worstStatusOfDay = 'false'; break; } if (status === 'late') { worstStatusOfDay = 'late'; } } stats[student.id].monthStats[monthId].totalDays++; if (worstStatusOfDay === 'false') { stats[student.id].monthStats[monthId].daysMissing++; } else if (worstStatusOfDay === 'late') { stats[student.id].monthStats[monthId].daysLate++; } else { stats[student.id].monthStats[monthId].daysCompleted++; } } }); }); return stats; }, [allAssignmentsByDate, months, students]);
 const handleEditAssignmentName = useCallback(async (assignmentId, newAssignmentName) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以修改資料。"); return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].map(a => a.id === assignmentId ? { ...a, assignmentName: newAssignmentName } : a); }); return newMap; }); return; } if (!db || !userId) return; setLoading(true); try { const docRef = doc(db, getAssignmentCollectionPath(), assignmentId); await setDoc(docRef, { assignmentName: newAssignmentName }, { merge: true }); } catch (e) { console.error("Error editing assignment name: ", e); setAlertMessage("編輯作業名稱失敗（權限不足或網路錯誤）。"); } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, authMode]);
 const handleDeleteAssignment = useCallback(async (assignmentId, assignmentName, isForced = false) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以刪除資料。"); return; } const assignmentList = allAssignmentsByDate[selectedDisplayDate] || []; const targetAssignment = assignmentList.find(a => a.id === assignmentId); if (targetAssignment) { const submissionStatus = targetAssignment.submissionStatus || {}; const hasIncompleteWork = students.some(student => submissionStatus[student.id] === false); if (hasIncompleteWork && !isForced) { alert(`無法刪除作業「${assignmentName}」：\n\n尚有學生未完成此項作業的訂正！\n\n如需【強制刪除】，請在點擊刪除按鈕時按住 Control (Ctrl/Cmd) 鍵。`); return; } } if (!isForced && !window.confirm(`確定要刪除 ${assignmentName} 嗎？此操作不可逆轉。`)) { return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; if (newMap[selectedDisplayDate]) { newMap[selectedDisplayDate] = newMap[selectedDisplayDate].filter(a => a.id !== assignmentId); } return newMap; }); return; } if (!db || !userId) return; setLoading(true); try { const docRef = doc(db, getAssignmentCollectionPath(), assignmentId); await deleteDoc(docRef); } catch (e) { console.error("Error deleting assignment: ", e); setAlertMessage("刪除作業項目失敗。"); } finally { setLoading(false); } }, [db, userId, selectedDisplayDate, setAlertMessage, allAssignmentsByDate, isOffline, authMode, students]);
 const handleBatchAddDefaultAssignments = useCallback(async (targetDate, defaultCategories) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以新增日期。"); return; } if (isOffline) { const existingNamesOnDate = (allAssignmentsByDate[targetDate] || []).map(a => a.assignmentName); const newAssignments = []; defaultCategories.forEach(cat => { if (!existingNamesOnDate.includes(cat.name)) { newAssignments.push({ id: `offline-assign-${Date.now()}-${Math.random()}`, assignmentName: cat.name, assignmentDate: targetDate, order: cat.order, submissionStatus: getInitialSubmissionStatus, createdAt: new Date().toISOString() }); } }); setAllAssignmentsByDate(prev => ({ ...prev, [targetDate]: [...(prev[targetDate] || []), ...newAssignments] })); return; } if (!db || !userId || !targetDate || defaultCategories.length === 0) return; setLoading(true); try { const path = getAssignmentCollectionPath(); const assignmentCollection = collection(db, path); const batch = writeBatch(db); const existingNamesOnDate = (allAssignmentsByDate[targetDate] || []).map(a => a.assignmentName); let assignmentsAdded = 0; defaultCategories.forEach(cat => { if (!existingNamesOnDate.includes(cat.name)) { const newDocRef = doc(assignmentCollection); batch.set(newDocRef, { assignmentName: cat.name, assignmentDate: targetDate, order: cat.order, submissionStatus: getInitialSubmissionStatus, createdAt: Timestamp.now(), }); assignmentsAdded++; } }); if (assignmentsAdded > 0) { await batch.commit(); } const sortedDates = Object.keys(allAssignmentsByDate).sort(); const previousDates = sortedDates.filter(d => d < targetDate); const lastDate = previousDates.length > 0 ? previousDates[previousDates.length - 1] : null; if (lastDate) { const prevAssignments = allAssignmentsByDate[lastDate]; let rewardCount = 0; students.forEach(student => { if (prevAssignments && prevAssignments.length > 0) { const isAllGreen = prevAssignments.every(a => { const status = a.submissionStatus[student.id]; return status !== false && status !== 'late'; }); if (isAllGreen) { updateBankBalance(student.id, 0, 2, 0); rewardCount++; } } }); if (rewardCount > 0) { alert(`📅 日期新增成功！\n\n檢測到 ${lastDate} 有 ${rewardCount} 位學生表現優異（全綠燈），\n已自動發放【2 枚銀幣】作為獎勵！`); } } } catch (e) { console.error("Error batch adding assignments: ", e); setAlertMessage("自動新增作業失敗，請稍後再試。"); } finally { setLoading(false); } }, [db, userId, allAssignmentsByDate, getInitialSubmissionStatus, isOffline, authMode, updateBankBalance, students]);
 const handleNewAssignmentDateChange = useCallback((e) => { const newDate = e.target.value; setNewAssignmentDate(newDate); }, []);
 const handleAddNewDate = useCallback(async () => { const targetDate = newAssignmentDate; if (!targetDate || categories.length === 0) { setAlertMessage("請選擇一個日期並確保科目模板清單不為空。"); return; } if (allAssignmentsByDate[targetDate]) { setAlertMessage(`日期 ${targetDate} 已經有作業紀錄了。請直接選擇查看。`); setSelectedDisplayDate(targetDate); const date = new Date(targetDate); date.setDate(date.getDate() + 1); setNewAssignmentDate(date.toISOString().substring(0, 10)); return; } await handleBatchAddDefaultAssignments(targetDate, categories); setSelectedDisplayDate(targetDate); const date = new Date(targetDate); date.setDate(date.getDate() + 1); setNewAssignmentDate(date.toISOString().substring(0, 10)); }, [newAssignmentDate, categories, allAssignmentsByDate, handleBatchAddDefaultAssignments]);
 const handleAddNewAssignment = useCallback(async () => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以新增作業。"); return; } if (!selectedDisplayDate) { setAlertMessage("請先選擇一個日期。"); return; } if (isOffline) { const assignments = allAssignmentsByDate[selectedDisplayDate] || []; const newOrder = assignments.length > 0 ? assignments[assignments.length - 1].order + 1 : 0; const newName = `新增作業 ${assignments.length + 1}`; const newAssignment = { id: `offline-single-${Date.now()}`, assignmentName: newName, assignmentDate: selectedDisplayDate, order: newOrder, submissionStatus: getInitialSubmissionStatus, createdAt: new Date().toISOString() }; setAllAssignmentsByDate(prev => ({ ...prev, [selectedDisplayDate]: [...(prev[selectedDisplayDate] || []), newAssignment] })); return; } if (!db || !userId) return; setLoading(true); try { const path = getAssignmentCollectionPath(); const assignmentCollection = collection(db, path); const assignments = allAssignmentsByDate[selectedDisplayDate] || []; const newOrder = assignments.length > 0 ? assignments[assignments.length - 1].order + 1 : 0; const newName = `新增作業 ${assignments.length + 1}`; const newDocRef = doc(assignmentCollection); await setDoc(newDocRef, { assignmentName: newName, assignmentDate: selectedDisplayDate, order: newOrder, submissionStatus: getInitialSubmissionStatus, createdAt: Timestamp.now(), }); } catch (e) { console.error("Error adding new assignment:", e); setAlertMessage("新增單項作業失敗。"); } finally { setLoading(false); } }, [db, userId, selectedDisplayDate, allAssignmentsByDate, getInitialSubmissionStatus, isOffline, authMode]);
 const handleMoveAssignment = useCallback(async (dragId, hoverId) => { if (authMode !== 'ADMIN' && !isOffline) return; const assignments = assignmentsForSelectedDate; const dragIndex = assignments.findIndex(a => a.id === dragId); const hoverIndex = assignments.findIndex(a => a.id === hoverId); if (dragIndex === -1 || hoverIndex === -1) return; if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; const currentList = [...(newMap[selectedDisplayDate] || [])]; const dragItem = currentList[dragIndex]; const hoverItem = currentList[hoverIndex]; currentList[dragIndex] = { ...dragItem, order: hoverItem.order }; currentList[hoverIndex] = { ...hoverItem, order: dragItem.order }; newMap[selectedDisplayDate] = currentList.sort((a,b) => a.order - b.order); return newMap; }); return; } if (!db || !userId) return; const dragAssignment = assignments[dragIndex]; const hoverAssignment = assignments[hoverIndex]; const batch = writeBatch(db); const path = getAssignmentCollectionPath(); const docRef1 = doc(db, path, dragAssignment.id); const docRef2 = doc(db, path, hoverAssignment.id); batch.set(docRef1, { order: hoverAssignment.order }, { merge: true }); batch.set(docRef2, { order: dragAssignment.order }, { merge: true }); try { await batch.commit(); } catch (e) { console.error("Error moving assignment:", e); setAlertMessage("調整欄位順序失敗。"); } }, [db, userId, assignmentsForSelectedDate, setAlertMessage, isOffline, selectedDisplayDate, authMode]);
 const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatus) => { const assignmentData = assignmentMap[assignmentName]; if (!assignmentData) { setAlertMessage(`找不到作業「${assignmentName}」的紀錄。`); return; } const cellKey = `${studentId}-${assignmentData.id}`; let newStatus; let shouldUpdateDb = true; if (currentStatus === true || currentStatus === undefined) { newStatus = false; setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); } else if (currentStatus === false) { newStatus = 'late'; setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); } else { const currentCount = unlockClicks[cellKey] || 0; if (currentCount < 2) { setUnlockClicks(prev => ({ ...prev, [cellKey]: currentCount + 1 })); shouldUpdateDb = false; return; } else { newStatus = true; setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); } } if (shouldUpdateDb) { let bronzeToAdd = 0; let goldToAdd = 0; if (newStatus === 'late' && currentStatus === false) { bronzeToAdd = 10; let currentMissingCount = 0; Object.keys(allAssignmentsByDate).forEach(date => { const assignments = allAssignmentsByDate[date]; assignments.forEach(a => { if (a.submissionStatus[studentId] === false) currentMissingCount++; }); }); if (currentMissingCount === 1) { goldToAdd = 1; setRewardState({ type: 'GOLD_CLEAR' }); } else { setRewardState({ type: 'BRONZE' }); } } if (bronzeToAdd > 0 || goldToAdd > 0) { updateBankBalance(studentId, bronzeToAdd, 0, goldToAdd); } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].map(a => { if (a.id === assignmentData.id) { return { ...a, submissionStatus: { ...a.submissionStatus, [studentId]: newStatus }, lateDates: { ...a.lateDates, [studentId]: newStatus === 'late' ? getTodayDate() : undefined } }; } return a; }); }); return newMap; }); return; } if (!db || !userId) return; setLoading(true); try { const docRef = doc(db, getAssignmentCollectionPath(), assignmentData.id); await setDoc(docRef, { submissionStatus: { [studentId]: newStatus }, lateDates: { [studentId]: newStatus === 'late' ? getTodayDate() : null } }, { merge: true }); } catch (e) { console.error("Error updating submission status: ", e); setAlertMessage("更新訂正狀態失敗，請檢查網路連線或權限。"); } finally { setLoading(false); } } }, [db, userId, assignmentMap, unlockClicks, setAlertMessage, isOffline, allAssignmentsByDate, updateBankBalance, selectedDisplayDate]);
 const handleEditCurrentDate = useCallback(async (targetOldDate) => { const oldDate = typeof targetOldDate === 'string' ? targetOldDate : selectedDisplayDate; if (authMode !== 'ADMIN' || !oldDate) return; const newDate = prompt(`請輸入新的日期以取代 ${oldDate} (格式: YYYY-MM-DD)`, oldDate); if (!newDate || newDate === oldDate) return; const datePattern = /^\d{4}-\d{2}-\d{2}$/; if (!datePattern.test(newDate)) { alert("日期格式不正確，請使用 YYYY-MM-DD 格式。"); return; } if (allAssignmentsByDate[newDate]) { alert(`日期 ${newDate} 已經存在作業資料，無法直接修改日期至此日。請手動遷移或刪除目標日期資料。`); return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; newMap[newDate] = newMap[oldDate].map(a => ({...a, assignmentDate: newDate})); delete newMap[oldDate]; return newMap; }); setSelectedDisplayDate(newDate); setAlertMessage(`[離線] 日期已修改為 ${newDate}`); return; } if (!db || !userId) return; setLoading(true); try { const batch = writeBatch(db); const assignments = allAssignmentsByDate[oldDate] || []; const path = getAssignmentCollectionPath(); if (assignments.length === 0) { setAlertMessage("該日期沒有作業資料可供移動。"); setLoading(false); return; } assignments.forEach(assignment => { const docRef = doc(db, path, assignment.id); batch.update(docRef, { assignmentDate: newDate }); }); await batch.commit(); setSelectedDisplayDate(newDate); setAlertMessage(`日期已成功從 ${oldDate} 修改為 ${newDate}`); } catch(e) { console.error("Error modifying date:", e); setAlertMessage("修改日期失敗，請檢查網路或權限。"); } finally { setLoading(false); } }, [authMode, selectedDisplayDate, allAssignmentsByDate, isOffline, db, userId]);
 const handleBatchDelete = useCallback(async (assignmentIds, successMessage, failureMessage) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以執行批次刪除。"); return false; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].filter(a => !assignmentIds.includes(a.id)); }); return newMap; }); setAlertMessage(successMessage + " (離線)"); return true; } if (!db || !userId || assignmentIds.length === 0) return false; setLoading(true); try { const batch = writeBatch(db); const path = getAssignmentCollectionPath(); assignmentIds.forEach(id => { if (id) { const docRef = doc(db, path, id); batch.delete(docRef); } }); await batch.commit(); setAlertMessage(successMessage); return true; } catch (e) { console.error("Error during batch delete: ", e); setAlertMessage(failureMessage); return false; } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, authMode]);
 const handleDeleteStudentGlobalData = useCallback(async (studentId, studentName) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足。"); return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].map(a => { const newStatus = { ...a.submissionStatus }; delete newStatus[studentId]; return { ...a, submissionStatus: newStatus }; }); }); return newMap; }); setAlertMessage(`[離線] 成功刪除 ${studentName} 的所有訂正紀錄。`); return; } if (!db || !userId) return; if (!window.confirm(`【極度危險】確定要永久刪除學生 ${studentName} (${studentId}) 在所有日期上的所有訂正紀錄嗎？此操作不可逆轉！`)) { return; } setLoading(true); try { const path = getAssignmentCollectionPath(); const assignmentCollection = collection(db, path); const snapshot = await getDocs(assignmentCollection); const batch = writeBatch(db); let updateCount = 0; snapshot.docs.forEach(doc => { const docRef = doc.ref; const data = doc.data(); const submissionStatus = data.submissionStatus || {}; if (submissionStatus.hasOwnProperty(studentId)) { const newSubmissionStatus = { ...submissionStatus }; delete newSubmissionStatus[studentId]; batch.set(docRef, { submissionStatus: newSubmissionStatus }, { merge: true }); updateCount++; } }); await batch.commit(); setAlertMessage(`成功刪除 ${studentName} 的所有訂正紀錄 (${updateCount} 筆作業文件受到影響)。`); } catch (e) { console.error("Error deleting student data:", e); setAlertMessage("刪除學生數據失敗，請檢查權限或連線。"); } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, authMode]);
 const showConfirmation = useCallback((type, data) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足。"); return; } let title, message, confirmTitle, confirmColor; switch(type) { case 'DAILY': title = `🧨 確定刪除 ${selectedDisplayDate} 的所有紀錄嗎？`; message = `此操作將永久移除 ${selectedDisplayDate} 的所有 ${assignmentsForSelectedDate.length} 筆作業紀錄。刪除後不可恢復。`; confirmTitle = '日期'; confirmColor = 'bg-gray-900'; break; case 'MONTHLY': title = `💣 確認刪除 ${data.monthName} 的所有作業紀錄？`; message = `此操作將永久移除 ${data.monthName} 期間所有 ${data.count} 筆作業紀錄。請務必謹慎！`; confirmTitle = '月份'; confirmColor = 'bg-amber-800'; break; case 'SEMESTER': title = `☢️ 極度危險：確認刪除 ${data.semName} 的所有資料？`; message = `此操作將永久移除 ${data.semName} 期間所有 ${data.count} 筆紀錄。這是最高級別的刪除，數據將無法找回！`; confirmTitle = '學期'; confirmColor = 'bg-rose-500'; break; default: return; } setConfirmationModal({ title, message, confirmTitle, confirmColor, action: type, data }); }, [selectedDisplayDate, assignmentsForSelectedDate, authMode, isOffline]);
 const handleDeleteDateAssignments = useCallback(() => { if (assignmentsForSelectedDate.length === 0) { alert(`日期 ${selectedDisplayDate} 沒有任何作業紀錄可以刪除。`); return; } showConfirmation('DAILY', {}); }, [assignmentsForSelectedDate, selectedDisplayDate, showConfirmation]);
 const handleDeleteMonthAssignments = useCallback(() => { const monthName = months.find(m => m.id === selectedMonth)?.name || '該月'; const assignmentIdsToDelete = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = date.substring(5, 7); if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); } }); if (assignmentIdsToDelete.length === 0) { alert(`${monthName} 期間沒有找到作業紀錄可以刪除。`); return; } showConfirmation('MONTHLY', { monthName, count: assignmentIdsToDelete.length }); }, [allAssignmentsByDate, selectedMonth, months, showConfirmation]);
 const handleDeleteSemesterAssignments = useCallback(() => { const semesterData = semesters.find(s => s.id === selectedSemester); const semName = semesterData ? semesterData.name : '全部'; const assignmentIdsToDelete = []; const allDates = Object.keys(allAssignmentsByDate); allDates.forEach(date => { const dateMonth = parseInt(date.substring(5, 7), 10); const dateYear = parseInt(date.substring(0, 4), 10); let shouldDelete = false; if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { shouldDelete = true; } } else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { shouldDelete = true; } } if (shouldDelete) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); } }); if (assignmentIdsToDelete.length === 0) { alert(`${semName} 期間沒有找到作業紀錄可以刪除。`); return; } showConfirmation('SEMESTER', { semName, count: assignmentIdsToDelete.length }); }, [allAssignmentsByDate, selectedSemester, semesters, showConfirmation]);
 const executeDelete = useCallback(async () => { if (!confirmationModal) return; const { action, data } = confirmationModal; setConfirmationModal(null); let success = false; switch(action) { case 'DAILY': const assignmentIds = assignmentsForSelectedDate.map(a => a.id).filter(id => id); const name_daily = selectedDisplayDate; const count_daily = assignmentIds.length; success = await handleBatchDelete(assignmentIds, `成功刪除 ${name_daily} 的所有作業紀錄 (${count_daily} 筆)。`, "刪除該日作業失敗，請稍後再試。"); if (success) { const currentDates = availableDates.filter(d => d !== selectedDisplayDate); if (currentDates.length > 0) { setSelectedDisplayDate(currentDates[currentDates.length - 1]); } else { setSelectedDisplayDate(getTodayDate()); } } break; case 'MONTHLY': const monthName = months.find(m => m.id === selectedMonth)?.name || '該月'; const monthAssignmentIds = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = date.substring(5, 7); if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) monthAssignmentIds.push(assignment.id); }); } }); const monthCount = monthAssignmentIds.length; success = await handleBatchDelete(monthAssignmentIds, `成功刪除 ${monthName} 期間的 ${monthCount} 筆作業紀錄。`, "刪除月份作業失敗，請稍後再試。"); if (success) setSelectedDisplayDate(getTodayDate()); break; case 'SEMESTER': const semesterData = semesters.find(s => s.id === selectedSemester); const semName = semesterData ? semesterData.name : '全部'; const semAssignmentIds = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = parseInt(date.substring(5, 7), 10); const dateYear = parseInt(date.substring(0, 4), 10); if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } } else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } } }); const semCount = semAssignmentIds.length; success = await handleBatchDelete(semAssignmentIds, `成功刪除 ${semName} 期間的 ${semCount} 筆作業紀錄。`, "刪除學期作業失敗，請稍後再試。"); if (success) setSelectedDisplayDate(getTodayDate()); break; default: break; } }, [confirmationModal, handleBatchDelete, assignmentsForSelectedDate, selectedDisplayDate, availableDates, allAssignmentsByDate, months, selectedMonth, semesters]);
 const handleExportData = useCallback(async () => { if (!isOffline && (!db || !userId)) { setAlertMessage("請等待應用程式載入並登入後再匯出。"); return; } setLoading(true); try { let exportedData = []; if (isOffline) { Object.values(allAssignmentsByDate).forEach(assignments => { exportedData = [...exportedData, ...assignments]; }); } else { const path = getAssignmentCollectionPath(); const assignmentsCollection = collection(db, path); const snapshot = await getDocs(assignmentsCollection); snapshot.forEach(doc => { const data = doc.data(); const createdAt = data.createdAt?.toDate().toISOString() || null; exportedData.push({ id: doc.id, ...data, createdAt: createdAt }); }); } const dataStr = JSON.stringify(exportedData, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `assignment_data_${getTodayDate()}${isOffline ? '_offline' : ''}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); setAlertMessage(`成功匯出 ${exportedData.length} 筆作業紀錄。`); } catch (e) { console.error("Export failed:", e); setAlertMessage("匯出資料失敗。"); } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, allAssignmentsByDate]);
 const handleImportData = useCallback(async (e) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以匯入資料。"); return; } if (!isOffline && (!db || !userId)) { setAlertMessage("請等待應用程式載入並登入後再匯入。"); return; } const file = e.target.files[0]; if (!file) return; setLoading(true); const reader = new FileReader(); reader.onload = async (event) => { try { const json = JSON.parse(event.target.result); if (!Array.isArray(json)) { setAlertMessage("檔案格式錯誤：JSON 內容必須是作業紀錄陣列。"); return; } if (isOffline) { let importedCount = 0; const newMap = { ...allAssignmentsByDate }; json.forEach(item => { const date = item.assignmentDate || getTodayDate(); const name = (item.assignmentName || "未命名作業").trim(); if (!newMap[date]) newMap[date] = []; if (!newMap[date].some(a => a.assignmentName === name)) { newMap[date].push({ ...item, id: `offline-import-${Date.now()}-${Math.random()}`, assignmentName: name, assignmentDate: date }); importedCount++; } }); setAllAssignmentsByDate(newMap); setAlertMessage(`[離線] 成功匯入 ${importedCount} 筆紀錄。`); setLoading(false); e.target.value = null; return; } const path = getAssignmentCollectionPath(); const assignmentCollection = collection(db, path); let importCount = 0; let duplicateCount = 0; const itemsToAdd = []; const existingKeys = new Set(); Object.entries(allAssignmentsByDate).forEach(([dateKey, assignments]) => { assignments.forEach(a => { existingKeys.add(`${dateKey}_${a.assignmentName.trim()}`); }); }); json.forEach(item => { const date = item.assignmentDate || getTodayDate(); const name = (item.assignmentName || "未命名作業").trim(); const uniqueKey = `${date}_${name}`; if (existingKeys.has(uniqueKey)) { duplicateCount++; return; } const dataToImport = { assignmentName: name, assignmentDate: date, order: item.order || 999, submissionStatus: item.submissionStatus || getInitialSubmissionStatus, createdAt: serverTimestamp(), }; itemsToAdd.push(dataToImport); existingKeys.add(uniqueKey); }); if (itemsToAdd.length > 0) { const CHUNK_SIZE = 450; const chunks = []; for (let i = 0; i < itemsToAdd.length; i += CHUNK_SIZE) { chunks.push(itemsToAdd.slice(i, i + CHUNK_SIZE)); } for (const chunk of chunks) { const batch = writeBatch(db); chunk.forEach(data => { const newDocRef = doc(assignmentCollection); batch.set(newDocRef, data); }); await batch.commit(); importCount += chunk.length; } let msg = `成功匯入 ${importCount} 筆作業紀錄。`; if (duplicateCount > 0) msg += ` (已自動忽略 ${duplicateCount} 筆重複資料)`; setAlertMessage(msg); } else { if (duplicateCount > 0) { setAlertMessage(`沒有匯入任何新資料 (發現 ${duplicateCount} 筆重複資料)。`); } else { setAlertMessage("匯入檔案中沒有找到有效的作業紀錄。"); } } } catch (error) { console.error("Import failed:", error); setAlertMessage("匯入失敗：檔案解析錯誤或數據格式不正確。"); } finally { setLoading(false); e.target.value = null; } }; reader.readAsText(file); }, [db, userId, setAlertMessage, getInitialSubmissionStatus, allAssignmentsByDate, isOffline, authMode]); 
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
   <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
     {rewardState && ( <RewardOverlay type={rewardState.type} onClose={() => setRewardState(null)} /> )}
     {showBankModal && ( <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} authMode={authMode} students={students} /> )}
     
     {/* 儀表板 Modal */}
     {dashboardStudent && ( <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={() => setDashboardStudent(null)} /> )}
     
     {confirmationModal && ( <ConfirmationModal title={confirmationModal.title} message={confirmationModal.message} onConfirm={executeDelete} onCancel={() => setConfirmationModal(null)} confirmTitle={confirmationModal.confirmTitle} confirmColor={confirmationModal.confirmColor} /> )}
     {missingStudent && missingStudent.missingCount > 0 && ( <MissingDetailsModal student={students.find(s => s.id === missingStudent.id)} missingStats={studentMissingStats} onClose={() => setMissingStudent(null)} handleDeleteStudentGlobalData={handleDeleteStudentGlobalData} db={db} userId={userId} allAssignmentsByDate={allAssignmentsByDate} setAlertMessage={setAlertMessage} isOffline={isOffline} authMode={authMode} /> )}
     {showAllMissingModal && ( <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} /> )}
 
     <div className="bg-white shadow-xl w-full flex flex-col h-full">
       <header className="p-4 sm:p-6 text-center border-b border-gray-200 bg-white relative overflow-hidden shrink-0">
         {isOffline && ( <div className="absolute top-0 left-0 w-full bg-gray-800 text-white text-center py-2 text-xl font-bold tracking-wider z-10"> ⚠️ 目前為離線演示模式 (Guest Mode) </div> )}
          <button onClick={handleLogout} className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold transition z-20" title="登出系統"> <LogOut className="w-5 h-5" /> 登出 {authMode === 'ADMIN' ? '(老師)' : '(訪客)'} </button>
 
         <div className={`flex items-center justify-center text-5xl font-extrabold text-gray-900 mb-2 ${isOffline ? 'mt-8' : ''}`}><span className="text-orange-500 text-6xl mr-3">🐻‍❄️</span><span className="text-5xl">五年甲班訂正作業表</span><span className="text-green-600 text-6xl ml-3">🐼</span></div>
         <p className="text-3xl text-gray-600 mb-4"> {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long' })}</p>
         <p className={`absolute right-4 text-xl text-gray-500 font-bold z-30 transition-all ${authMode === 'ADMIN' ? 'top-20' : 'top-4'}`}> 版本: {VERSION}</p>
       </header>
       {alertMessage && ( <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} /> )}
       
       <div className="flex-1 overflow-auto bg-gray-50 p-4 relative">
           <div className="flex flex-wrap items-center gap-6 mb-6 text-3xl">
               <label className="font-semibold text-gray-700">學期：</label>
               <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="p-3 border border-gray-300 rounded-lg font-semibold" disabled={isGlobalLoading}>{semesters.map((s) => ( <option key={s.id} value={s.id}>{s.name}</option>))}</select>
               <label className="font-semibold text-gray-700">月份：</label>
               <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-3 border border-gray-300 rounded-lg font-semibold" disabled={isGlobalLoading} style={{ backgroundColor: months.find(m => m.id === selectedMonth)?.color || 'white' }}>{filteredMonths.map((m) => ( <option key={m.id} value={m.id} style={{ backgroundColor: m.color }}>{m.name}</option>))}</select>
               <button onClick={() => setShowBankModal(true)} className={`px-5 py-3 text-3xl font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition duration-150 shadow-md flex items-center justify-center`} disabled={isGlobalLoading} title="查看訂正存簿"> <BookOpen className="h-6 w-6 mr-2" />訂正存簿 </button>
           </div>
           
           <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2">
               {displayedDates.map(date => ( <DateTab key={date} date={date} isSelected={date === selectedDisplayDate} onClick={setSelectedDisplayDate} onEdit={() => handleEditCurrentDate(date)} authMode={authMode} /> ))}
           </div>
           
           <div className="flex flex-wrap items-center gap-2 mb-6">
                <input id="newAssignmentDate" type="date" value={newAssignmentDate} onChange={handleNewAssignmentDateChange} className="p-2 text-3xl border border-gray-300 rounded-lg font-semibold w-[230px] focus:ring-yellow-500 focus:border-yellow-500 transition flex-shrink-0" required disabled={isGlobalLoading} />
                 <button onClick={handleAddNewDate} className={`${authMode === 'ADMIN' ? 'px-4 py-2 flex-1' : 'px-5 py-3'} text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center ${isGlobalLoading ? 'bg-yellow-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`} disabled={isGlobalLoading || !newAssignmentDate}> + 新增日期 </button>
                <button onClick={handleExportData} className={`${authMode === 'ADMIN' ? 'px-4 py-2 flex-1' : 'px-5 py-3'} text-3xl font-medium rounded-lg text-white bg-fuchsia-400 hover:bg-fuchsia-500 transition duration-150 shadow-md flex items-center justify-center`} disabled={isGlobalLoading} title="將所有紀錄匯出為 JSON 檔案"> <Download className="h-6 w-6 mr-1" />匯出 </button>
                 <button onClick={() => setShowAllMissingModal(true)} className={`${authMode === 'ADMIN' ? 'px-4 py-2 flex-1' : 'px-5 py-3'} text-3xl font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition duration-150 shadow-md flex items-center justify-center`} disabled={isGlobalLoading} title="檢視全班未完成作業總表"> <FileText className="h-6 w-6 mr-1" />未完成總表 </button>
               <div className={`${authMode === 'ADMIN' ? 'flex-1 relative' : 'relative'}`}>
                   <input type="file" id="importFile" accept="application/json" onChange={handleImportData} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isGlobalLoading} title="選擇 JSON 檔案匯入紀錄" />
                   <button onClick={() => document.getElementById('importFile').click()} className={`${authMode === 'ADMIN' ? 'px-4 py-2 w-full' : 'px-5 py-3 w-full'} text-3xl font-medium rounded-lg text-white bg-cyan-500 hover:bg-cyan-600 transition duration-150 shadow-md flex items-center justify-center`} disabled={isGlobalLoading}> <Upload className="h-6 w-6 mr-1" />匯入 </button>
               </div>
 
               {authMode === 'ADMIN' && (
                   <>
                       <ProtectedButton onClick={() => handleDeleteDateAssignments()} disabled={isGlobalLoading || assignmentsForSelectedDate.length === 0} className={`px-4 py-2 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center flex-1 bg-gray-900 hover:bg-gray-800`} title="刪除該日所有作業 (需按住 Shift)"><span className="text-4xl mr-1">🧨</span>刪除日期</ProtectedButton>
                       <ProtectedButton onClick={() => handleDeleteMonthAssignments()} disabled={isGlobalLoading} className={`px-4 py-2 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center flex-1 bg-amber-800 hover:bg-amber-900`} title={`刪除所選月份`}><span className="text-4xl mr-1">💣</span>刪除月份</ProtectedButton>
                       <ProtectedButton onClick={() => handleDeleteSemesterAssignments()} disabled={isGlobalLoading} className={`px-4 py-2 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center flex-1 bg-rose-500 hover:bg-rose-600`} title={`刪除學期/全部資料`}><span className="text-4xl mr-1">☢️</span>刪除學期</ProtectedButton>
                   </>
               )}
           </div>
           
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-5xl font-bold text-gray-800 flex items-center">
                   <span className="text-gray-500 mr-3 text-5xl">📋</span>
                   {selectedDisplayDate ? (
                       <div className="flex items-center gap-3">
                           <span className="text-4xl">{new Date(selectedDisplayDate).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} 作業確認表</span>
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
           
           <div className={`w-full relative border border-gray-300 rounded-lg shadow-xl overflow-y-auto overflow-x-auto h-[calc(100vh-220px)] min-h-[500px] mb-8 ${focusedStudentId ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}> 
               <div className="pb-4 min-w-max">
                   {assignmentsForSelectedDate.length > 0 && selectedDisplayDate !== '' && (
                        <table className="divide-y divide-gray-300 w-full">
                           <thead className="bg-gray-100 sticky top-0 z-[70]">
                               <tr>
                                   <th className="px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 border-r border-gray-300 sticky left-0 top-0 bg-gray-100 z-[70] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '100px', width: '100px', maxWidth: '100px', left: '0px' }}>座號</th>
                                   <th className="px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 sticky top-0 bg-gray-100 z-[70] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '128px', width: '128px', maxWidth: '128px', left: '100px' }}>姓名</th>
                                   {assignmentsForSelectedDate.map((assignment) => (
                                       <AssignmentHeader key={assignment.id} assignment={assignment} isGlobalLoading={isGlobalLoading} handleDeleteAssignment={handleDeleteAssignment} handleEditSave={handleEditAssignmentName} handleMoveAssignment={handleMoveAssignment} setEditingAssignmentId={setEditingAssignmentId} setEditingAssignmentName={setEditingAssignmentName} editingAssignmentId={editingAssignmentId} editingAssignmentName={editingAssignmentName} authMode={authMode} />
                                   ))}
                               </tr>
                           </thead>
                           <tbody className={`divide-y divide-gray-200 ${focusedStudentId ? 'bg-blue-50' : 'bg-white'}`}>
                               {(focusedStudentId ? students.filter(s => s.id === focusedStudentId) : students).map((student) => (
                                   <tr key={student.id} className={`group ${focusedStudentId ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                                       <td onClick={() => setDashboardStudent(student)} className="px-2 py-4 text-3xl whitespace-normal font-medium text-gray-900 border-r border-gray-300 sticky left-0 bg-white z-[50] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer group-hover:text-blue-600 group-hover:bg-blue-100 break-words align-middle transition-colors" title="點擊查看學習歷程" style={{ minWidth: '100px', width: '100px', maxWidth: '100px', left: '0px' }}>
                                           {student.id}
                                       </td>
                                       <td onClick={() => setFocusedStudentId(focusedStudentId === student.id ? null : student.id)} className="px-2 py-4 text-3xl whitespace-nowrap text-gray-900 font-semibold sticky bg-white z-[50] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer group-hover:text-blue-600 group-hover:bg-blue-100 align-middle transition-colors" title={focusedStudentId === student.id ? "點擊以顯示全部學生" : "點擊以只顯示此學生"} style={{ minWidth: '128px', width: '128px', maxWidth: '128px', left: '100px' }}>
                                           {student.name[0] + 'O' + student.name.slice(2)}
                                       </td>
                                       {assignmentsForSelectedDate.map((assignment) => {
                                           const assignmentName = assignment.assignmentName;
                                           const assignmentData = assignmentMap[assignmentName];
                                           const status = assignmentData ? assignmentData.submissionStatus[student.id] ?? true : true;
                                           return (
                                               <td key={`${student.id}-${assignmentName}`} className="px-1 py-4 whitespace-nowrap text-center" style={{ minWidth: '150px' }}>
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
           <div className="mt-12 p-6 bg-gray-50 rounded-xl shadow-inner border border-gray-200">
               <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center"><span className="text-5xl mr-3">⚠️</span><span className="text-4xl">全班未訂正統計</span></h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                   {studentMissingStats.map((stat) => {
                       const colorClasses = getMissingColorClasses(stat.missingCount);
                       const countText = stat.missingCount;
                       return ( <div key={stat.id} onClick={() => { if (stat.missingCount > 0) setMissingStudent(stat); }} className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-150 ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} text-center border-2 border-b-[8px] active:border-b-[2px] active:translate-y-[6px] hover:-translate-y-[2px] hover:shadow-md`}> <p className="text-4xl font-semibold mb-1">{stat.name[0] + 'O' + stat.name.slice(2)}</p> <p className={`text-6xl font-black mt-2 ${colorClasses.countText}`}>{countText}</p> </div> );
                   })}
               </div>
           </div>
           <MonthlyStudentStats monthlyStats={monthlyStudentStats} months={filteredMonths} />
       </div>
     </div>
   </div>
   </DndProvider>
  );
};
 
export default App;
