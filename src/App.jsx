import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
 where,
 deleteField,
 getDoc
} from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  BookOpen, Download, Upload, X, Check, 
  RefreshCw, WifiOff, LogOut, FileText, AlertCircle, 
  Eye, Shield, User, Key, Edit, Pencil, Star,
  Coins, Eraser, Moon, PlusCircle, TrendingUp, Activity,
  BarChart2, Megaphone, Lock, Unlock 
} from 'lucide-react';

// --- 版本資訊 ---
const VERSION = 'v20.0.3 - 熊貓全能修復版 (含補救連動)'; 

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
  { id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, 
  { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' },
  { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' },
  { id: '10', name: '李婕妤' },
];

// 預設作業項目
const INITIAL_CATEGORIES = [
    { name: '數課', order: 0 }, { name: '數習', order: 1 }, { name: '數八', order: 2 },
    { name: '成語()+P.', order: 3 }, { name: '聯P.', order: 4 }, { name: '國', order: 5 },
];

const ItemTypes = { ASSIGNMENT: 'assignment' };

// 公開路徑設定
const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;
const getDailySettlementPath = () => `/artifacts/${appId}/public/data/daily_settlements`;

// --- SVG 圖表元件 ---
const SimpleLineChart = ({ data, width = 600, height = 300 }) => {
   if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據繪製圖表</div>;
   const padding = 40; const chartWidth = width - padding * 2; const chartHeight = height - padding * 2; const maxY = 100;
   const safeData = data.map(d => ({...d, value: isNaN(d.value) ? 0 : d.value}));
   const points = safeData.map((d, i) => { const x = (i / (safeData.length - 1)) * chartWidth + padding; const val = d.value; const y = chartHeight - (val / maxY) * chartHeight + padding; return `${x},${y}`; }).join(' ');
   const gridLines = [0, 60, 80, 100].map(val => { const y = chartHeight - (val / maxY) * chartHeight + padding; let color = "#e5e7eb"; if(val === 60) color = "#fca5a5"; if(val === 80) color = "#86efac"; return ( <g key={val}><line x1={padding} y1={y} x2={width - padding} y2={y} stroke={color} strokeWidth="2" strokeDasharray={val === 0 ? "" : "5,5"} /><text x={padding - 10} y={y + 5} textAnchor="end" fontSize="12" fill="gray">{val}</text></g> ); });
   return ( <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100"> {gridLines} <polyline fill="none" stroke="#3b82f6" strokeWidth="4" points={points} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" /> {safeData.map((d, i) => { const x = (i / (safeData.length - 1)) * chartWidth + padding; const val = d.value; const y = chartHeight - (val / maxY) * chartHeight + padding; let dotColor = "#ef4444"; if (val >= 60) dotColor = "#eab308"; if (val >= 80) dotColor = "#22c55e"; return ( <g key={i} className="group"><circle cx={x} cy={y} r="6" fill={dotColor} stroke="white" strokeWidth="2" className="transition-all duration-300 group-hover:r-8 cursor-pointer"/><g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"><rect x={x - 20} y={y - 35} width="40" height="25" rx="4" fill="black" fillOpacity="0.8" /><text x={x} y={y - 18} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{val.toFixed(0)}</text></g><text x={x} y={height - 10} textAnchor="middle" fontSize="14" fill="#374151" fontWeight="500">{d.label}</text></g> ); })} </svg> );
};

const SimpleStackedBarChart = ({ data, width = 600, height = 300 }) => {
   if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據繪製圖表</div>;
   const padding = 40; const chartWidth = width - padding * 2; const chartHeight = height - padding * 2;
   const maxTotal = Math.max(...data.map(d => d.details.count), 1); const barWidth = Math.min(60, chartWidth / data.length * 0.6); 
   return ( <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100"> <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" /> <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" /> {data.map((d, i) => { const x = padding + (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2; const totalHeight = chartHeight; const onTimeHeight = (d.details.onTime / maxTotal) * totalHeight; const lateHeight = (d.details.late / maxTotal) * totalHeight; const missingHeight = (d.details.missing / maxTotal) * totalHeight; const yGreen = (height - padding) - onTimeHeight; const yYellow = yGreen - lateHeight; const yRed = yYellow - missingHeight; return ( <g key={i} className="group"> {d.details.onTime > 0 && (<rect x={x} y={yGreen} width={barWidth} height={onTimeHeight} fill="#4ade80" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>)} {d.details.late > 0 && (<rect x={x} y={yYellow} width={barWidth} height={lateHeight} fill="#facc15" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>)} {d.details.missing > 0 && (<rect x={x} y={yRed} width={barWidth} height={missingHeight} fill="#f87171" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>)} <text x={x + barWidth/2} y={yRed - 5} textAnchor="middle" fontSize="14" fill="#6b7280" fontWeight="bold">{d.details.count}</text> <text x={x + barWidth/2} y={height - 10} textAnchor="middle" fontSize="14" fill="#374151" fontWeight="500">{d.label}</text> <title>{`${d.label}：\n🟢 準時：${d.details.onTime}\n🟡 補交：${d.details.late}\n🔴 缺交：${d.details.missing}`}</title> </g> ); })} </svg> );
};
// --- 學生學習歷程 Dashboard Modal (已修復日期 Crash 問題) ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('STATUS'); 
    if (!student || !allAssignmentsByDate) return null;

    // *** 關鍵修復：處理各種日期格式，防止崩潰 ***
    const getDaysDiff = (dateString, completedAt) => {
        try {
            const targetDate = new Date(dateString); 
            if (isNaN(targetDate.getTime())) return 0;
            targetDate.setHours(0,0,0,0);
            
            let completedDate = new Date();
            if (completedAt) {
                if (typeof completedAt.toDate === 'function') {
                    // 1. Firebase Timestamp
                    completedDate = completedAt.toDate();
                } else if (completedAt.seconds) {
                    // 2. JSON 匯入的 Timestamp (秒數)
                    completedDate = new Date(completedAt.seconds * 1000);
                } else {
                    // 3. 一般字串
                    completedDate = new Date(completedAt);
                }
            }
            
            if (isNaN(completedDate.getTime())) return 0;

            completedDate.setHours(0,0,0,0);
            return Math.max(0, Math.floor((completedDate - targetDate) / (1000 * 60 * 60 * 24)));
        } catch (e) {
            return 0; 
        }
    };

    const getDelayFromToday = (dateString) => {
        try {
            const today = new Date(); 
            today.setHours(0, 0, 0, 0);
            const target = new Date(dateString); 
            if (isNaN(target.getTime())) return 0;
            target.setHours(0, 0, 0, 0);
            return Math.floor((today - target) / (1000 * 60 * 60 * 24));
        } catch(e) { return 0; }
    };

    const { healthData, trendData, summaryStats, trendStats, emergencyData, overallData } = useMemo(() => {
        const healthByMonth = {}; const trendByMonth = {};
        let totalItems = 0; let totalDays = 0;
        let totalHealthPoints = 0; let totalTrendPoints = 0;
        let itemsCompleted = 0; let itemsLate = 0; let itemsMissing = 0;
        let daysCompleted = 0; let daysLate = 0; let daysMissing = 0;
        let currentMissingCount = 0; let maxDelayDays = 0;

        const sortedDates = Object.keys(allAssignmentsByDate).sort();
        sortedDates.forEach(date => {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return;

            const monthKey = `${dateObj.getMonth() + 1}月`;
            if (!healthByMonth[monthKey]) healthByMonth[monthKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            if (!trendByMonth[monthKey]) trendByMonth[monthKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };

            const assignments = allAssignmentsByDate[date] || [];
            if (assignments.length === 0) return;

            totalDays++;
            let dayHasMissing = false; let dayHasLate = false;
            
            assignments.forEach(assign => {
                const status = assign.submissionStatus?.[student.id];
                const completedAt = assign.completedAt?.[student.id];
                let tScore = 0;
                if (status === false) { 
                    itemsMissing++; trendByMonth[monthKey].missing++; currentMissingCount++; dayHasMissing = true;
                    const delay = getDelayFromToday(date); if (delay > maxDelayDays) maxDelayDays = delay; tScore = 0;
                } else if (status === 'late') { 
                    itemsLate++; trendByMonth[monthKey].late++; dayHasLate = true;
                    if (completedAt) { const daysLate = getDaysDiff(date, completedAt); tScore = Math.max(0, 100 - (daysLate * 5)); } else { tScore = 60; }
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

        // 安全除法
        const safeDiv = (a, b) => (b === 0 ? 0 : a / b);

        const healthChart = Object.keys(healthByMonth).map(key => ({ label: key, value: safeDiv(healthByMonth[key].totalPoints, healthByMonth[key].count), details: healthByMonth[key] }));
        const trendChart = Object.keys(trendByMonth).map(key => ({ label: key, value: safeDiv(trendByMonth[key].totalPoints, trendByMonth[key].count), details: trendByMonth[key] }));
        
        const isEmergency = maxDelayDays >= 3 || currentMissingCount >= 3;
        const avgHealthScore = safeDiv(totalHealthPoints, totalDays).toFixed(1);
        const avgTrendScore = safeDiv(totalTrendPoints, totalItems).toFixed(1);
        const overallScore = ((parseFloat(avgHealthScore) + parseFloat(avgTrendScore)) / 2).toFixed(1);

        return { healthData: healthChart, trendData: trendChart, summaryStats: { days: { total: totalDays, completed: daysCompleted, late: daysLate, missing: daysMissing }, items: { total: totalItems, completed: itemsCompleted, late: itemsLate, missing: itemsMissing }, avgScore: avgHealthScore }, trendStats: { avgScore: avgTrendScore }, emergencyData: { isEmergency, maxDelayDays, currentMissingCount }, overallData: { score: overallScore } };
    }, [allAssignmentsByDate, student.id]);

    const getStatusFeedback = (score, emergency) => {
        if (emergency.isEmergency) return { text: "❌ 紅燈警報！缺交太多了，請務必每天確實完成功課，並檢查聯絡簿。", color: "text-red-600", bg: "bg-red-50", border: "border-red-500", isAlert: true };
        const s = parseFloat(score);
        if (isNaN(s)) return { text: "⚪ 資料不足", color: "text-gray-400", bg: "bg-white", border: "border-gray-300" };
        if (s >= 100) return { text: "🏆 完美無瑕！作業全勤且準時，你是全班的作業楷模！", color: "text-blue-600", bg: "bg-white", border: "border-blue-600" };
        if (s >= 95) return { text: "✨ 超級優秀！表現非常棒，你的自律讓人佩服。", color: "text-blue-500", bg: "bg-white", border: "border-blue-500" };
        if (s >= 90) return { text: "🌟 表現極佳！絕大多數時間都能準時完成，態度很棒。", color: "text-green-600", bg: "bg-white", border: "border-green-600" };
        if (s >= 85) return { text: "👍 很不錯喔！作業狀況穩定，偶爾的小失誤修正就好。", color: "text-green-500", bg: "bg-white", border: "border-green-500" };
        if (s >= 80) return { text: "👌 保持水準！大部分都有完成，但要減少遲交的情況。", color: "text-lime-600", bg: "bg-white", border: "border-lime-600" };
        if (s >= 70) return { text: "💪 再加油點！遲交或缺交的頻率變高了，要更積極些。", color: "text-yellow-600", bg: "bg-white", border: "border-yellow-600" };
        return { text: "⚠️ 勉強及格！你的作業狀況令人擔心，必須調整步調。", color: "text-orange-500", bg: "bg-white", border: "border-orange-500" };
    };
    const getTrendFeedback = (score) => {
        const s = parseFloat(score);
        if (isNaN(s)) return { text: "資料不足", color: "text-gray-400", bg: "bg-gray-100", border: "border-gray-300" };
        if (s === 100) return { text: "👑 傳奇等級！完美的 100 分，無懈可擊！", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-500" };
        if (s >= 98) return { text: "🎖️ 頂尖卓越 (98+)，幾乎完美的表現！", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-500" };
        if (s >= 96) return { text: "🌟 出類拔萃 (96+)，令人驚嘆的自律！", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-500" };
        if (s >= 94) return { text: "✨ 極度優秀 (94+)，保持得非常好！", color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-500" };
        if (s >= 90) return { text: "👍 非常棒 (90+)，是大家學習的榜樣。", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-500" };
        if (s >= 85) return { text: "🌿 表現優異 (85+)，維持在高水準。", color: "text-green-600", bg: "bg-green-50", border: "border-green-500" };
        if (s >= 81) return { text: "😊 相當不錯 (81+)，繼續保持這個節奏。", color: "text-lime-600", bg: "bg-lime-50", border: "border-lime-500" };
        if (s >= 75) return { text: "🆗 表現尚可 (75+)，還有進步空間。", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-500" };
        if (s >= 70) return { text: "😐 普普通通 (70+)，遲交次數稍微多了點。", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-500" };
        if (s >= 65) return { text: "😟 需要注意 (65+)，分數開始下滑囉。", color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-500" };
        if (s >= 60) return { text: "⚠️ 低空飛過 (60+)，請再多用點心。", color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-600" };
        if (s >= 50) return { text: "🛑 不及格邊緣 (50+)，必須立刻修正態度！", color: "text-red-500", bg: "bg-red-50", border: "border-red-400" };
        if (s >= 40) return { text: "🌧️ 狀況不佳 (40+)，缺交或遲交太頻繁了。", color: "text-red-600", bg: "bg-red-50", border: "border-red-500" };
        if (s >= 30) return { text: "⛈️ 雷雨警報 (30+)，信用分數嚴重透支，請自我反省並修正態度。", color: "text-red-700", bg: "bg-red-100", border: "border-red-600" };
        if (s >= 20) return { text: "💔 令人擔憂 (20+)，作業幾乎都沒完成。", color: "text-red-800", bg: "bg-red-100", border: "border-red-700" };
        if (s >= 10) return { text: "🆘 緊急狀態 (10+)，你的作業幾乎一片空白，請面對現實。", color: "text-red-900", bg: "bg-red-200", border: "border-red-800" };
        if (s >= 5) return { text: "🌫️ 幾近空白 (5+)，請不要放棄學習！", color: "text-gray-600", bg: "bg-gray-200", border: "border-gray-500" };
        return { text: "🌑 完全空白 (0-4.9)，請重新開始努力！", color: "text-gray-800", bg: "bg-gray-300", border: "border-gray-700" };
    };
    const getOverallBadge = (score) => {
        const s = parseFloat(score);
        if (isNaN(s)) return { animal: "🥚 蛋", comment: "尚未孵化" };
        if (s >= 100) return { animal: "🐲 神龍", comment: "作業全勤無缺，品質完美無瑕，無可挑剔。" };
        if (s >= 97) return { animal: "🦁 獅王", comment: "態度極度自律，對自我要求高，細節處理極佳。" };
        if (s >= 94) return { animal: "🦅 雄鷹", comment: "繳交迅速確實，準確率非常高，學習態度積極。" };
        if (s >= 91) return { animal: "🐆 獵豹", comment: "訂正效率驚人，很少拖泥帶水，行動力極強。" };
        if (s >= 88) return { animal: "🐴 駿馬", comment: "保持穩定節奏，作業習慣良好，充滿學習幹勁。" };
        if (s >= 85) return { animal: "🐺 戰狼", comment: "能夠自我鞭策，按時完成任務，錯誤越來越少。" };
        if (s >= 82) return { animal: "🦊 靈狐", comment: "作業繳交穩定，若能多點細心，表現會更出色。" };
        if (s >= 77) return { animal: "🦉 貓頭鷹", comment: "逐漸掌握要領，學習狀況回穩，請持續保持。" };
        if (s >= 72) return { animal: "🐻 大熊", comment: "累積實力中，雖然細心度不足，但大多能完成。" };
        if (s >= 67) return { animal: "🐘 大象", comment: "腳踏實地完成，雖然速度較慢，但願意補救。" };
        if (s >= 60) return { animal: "🦈 鯊魚", comment: "努力跟上進度，正視缺交問題，積極修正中。" };
        if (s >= 50) return { animal: "🦘 袋鼠", comment: "再跳一步就及格，請補齊缺交，別讓分數停滯。" };
        if (s >= 40) return { animal: "🐿️ 松鼠", comment: "積少成多，每一項作業都很重要，請勿隨意放棄。" };
        if (s >= 30) return { animal: "🐇 白兔", comment: "別因貪玩而偷懶，趕快追上進度，你可以做得到。" };
        if (s >= 20) return { animal: "🦔 刺蝟", comment: "卸下防備與藉口，面對作業不逃避，勇敢承擔責任。" };
        if (s >= 10) return { animal: "🐢 烏龜", comment: "只要肯開始動筆，總會完成一項，哪怕慢也沒關係。" };
        return { animal: "🌱 種子", comment: "埋入土裡太久了，請翻開作業本，讓學習重新發芽。" };
    };

    const currentFeedback = viewMode === 'STATUS' ? getStatusFeedback(summaryStats.avgScore, emergencyData) : getTrendFeedback(trendStats.avgScore);
    const overallBadge = getOverallBadge(overallData.score);
    const currentStats = viewMode === 'STATUS' ? summaryStats.days : summaryStats.items;
    const statsUnit = viewMode === 'STATUS' ? '天' : '項';
    const chartData = viewMode === 'STATUS' ? healthData : trendData;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border-4 ${currentFeedback.isAlert ? 'border-red-500' : 'border-white'}`}>
                <div className={`px-6 py-4 flex justify-between items-center text-white shrink-0 transition-colors duration-500 ${currentFeedback.isAlert ? 'bg-red-600' : (viewMode === 'TREND' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-gradient-to-r from-indigo-600 to-purple-500')}`}>
                    <div className="flex items-center gap-6 w-full">
                        <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg border-4 shrink-0 ${currentFeedback.isAlert ? 'text-red-600 border-red-200' : (viewMode === 'TREND' ? 'text-blue-600 border-blue-200' : 'text-indigo-600 border-indigo-200')}`}>{student.id}</div>
                        <div className="flex flex-col justify-center flex-1">
                            <h2 className="text-4xl font-bold tracking-wide leading-none mb-1">{student.name} 的學習歷程</h2>
                            <p className="text-white/80 text-lg font-medium flex items-center gap-2"><Activity className="w-4 h-4" /> {semesterId === 'S1' ? '上學期' : '下學期'}綜合分析報表</p>
                        </div>
                        <div className="flex flex-col items-end justify-center bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/30 min-w-[280px]">
                            <div className="flex items-baseline gap-2"><span className="text-sm font-bold text-white/90">🏆 綜合總分</span><span className="text-3xl font-black text-yellow-300 drop-shadow-md">{overallData.score}</span><span className="text-2xl font-bold text-white">| {overallBadge.animal}</span></div>
                            <div className="text-left text-sm font-medium text-white/90 mt-1 max-w-[300px] leading-tight">{overallBadge.comment}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition backdrop-blur-md ml-4 shrink-0"><X className="w-8 h-8" /></button>
                </div>
                <div className={`flex-1 overflow-auto p-8 ${currentFeedback.bg}`}>
                    <div className="flex justify-center mb-8">
                        <div className="bg-gray-200 p-1 rounded-xl flex gap-1 shadow-inner">
                            <button onClick={() => setViewMode('STATUS')} className={`px-6 py-2 rounded-lg text-xl font-bold transition-all duration-300 ${viewMode === 'STATUS' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>📊 狀況統計 (Status)</button>
                            <button onClick={() => setViewMode('TREND')} className={`px-6 py-2 rounded-lg text-xl font-bold transition-all duration-300 ${viewMode === 'TREND' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>📈 績效分數 (Trend)</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-4 bg-yellow-100 text-yellow-600 rounded-2xl"><Coins className="w-10 h-10" /></div>
                            <div><p className="text-gray-500 text-lg font-bold">目前資產</p><div className="flex items-baseline gap-2"><span className="text-4xl font-black text-gray-800">{bankBalance?.gold || 0}</span><span className="text-sm text-yellow-500 font-bold">金</span><span className="text-2xl font-bold text-gray-400">/</span><span className="text-4xl font-black text-gray-800">{bankBalance?.silver || 0}</span><span className="text-sm text-gray-400 font-bold">銀</span></div></div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${viewMode === 'TREND' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>{viewMode === 'TREND' ? <TrendingUp className="w-10 h-10" /> : <BarChart2 className="w-10 h-10" />}</div>
                            <div className="flex-1">
                                <p className="text-gray-500 text-lg font-bold mb-1">本學期{viewMode === 'STATUS' ? '統計天數' : '作業總數'}</p>
                                <div className="flex items-baseline gap-2"><span className={`text-5xl font-black ${viewMode === 'STATUS' ? 'text-indigo-600' : 'text-blue-600'}`}>{currentStats.total}</span><span className="text-xl text-gray-400 font-medium">{statsUnit}</span></div>
                                <div className="flex gap-3 mt-2 text-sm font-bold"><span className="text-green-600 bg-green-100 px-2 py-0.5 rounded">準時 {currentStats.completed}</span><span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">遲交 {currentStats.late}</span><span className="text-red-600 bg-red-100 px-2 py-0.5 rounded">缺交 {currentStats.missing}</span></div>
                            </div>
                        </div>
                        <div className={`p-0 rounded-2xl shadow-sm border-l-8 flex overflow-hidden transition-all ${currentFeedback.border} ${currentFeedback.bg}`}>
                            <div className="w-1/3 flex flex-col items-center justify-center border-r border-gray-100 bg-white/50 p-2"><span className={`text-4xl font-black ${currentFeedback.color}`}>{viewMode === 'STATUS' ? summaryStats.avgScore : trendStats.avgScore}</span><span className="text-sm text-gray-500 font-bold mt-1">分</span></div>
                            <div className="w-2/3 p-4 flex flex-col justify-center"><p className="text-gray-500 text-xs font-bold mb-1">{viewMode === 'STATUS' ? '健康指數分析' : '績效評級分析'}</p><p className={`${currentFeedback.color} font-bold text-lg leading-tight text-left`}>{currentFeedback.text}</p></div>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 mb-8">
                        <h3 className="text-2xl font-bold text-gray-700 mb-6 flex items-center">{viewMode === 'TREND' ? (<><TrendingUp className="w-6 h-6 mr-2 text-blue-500" /> 作業績效趨勢圖</>) : (<><BarChart2 className="w-6 h-6 mr-2 text-indigo-500" /> 每月作業狀況分佈</>)}</h3>
                        <div className="h-[350px] w-full">{viewMode === 'TREND' ? ( <SimpleLineChart data={trendData} /> ) : ( <SimpleStackedBarChart data={healthData} /> )}</div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-500">詳細數據列表</div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white"><tr><th className="px-6 py-4 text-left text-xl font-bold text-gray-600">月份</th><th className="px-6 py-4 text-center text-xl font-bold text-green-600">準時({statsUnit})</th><th className="px-6 py-4 text-center text-xl font-bold text-yellow-600">補交({statsUnit})</th><th className="px-6 py-4 text-center text-xl font-bold text-red-600">缺交({statsUnit})</th><th className="px-6 py-4 text-center text-xl font-bold text-blue-600">{viewMode === 'STATUS' ? '健康平均' : '績效平均'}</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {chartData.map((row, idx) => {
                                    const tVal = row.value || 0;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50"><td className="px-6 py-4 text-xl font-bold text-gray-800">{row.label}</td><td className="px-6 py-4 text-center text-xl font-medium text-gray-600">{row.details.onTime}</td><td className="px-6 py-4 text-center text-xl font-medium text-gray-600">{row.details.late}</td><td className="px-6 py-4 text-center text-xl font-medium text-gray-600">{row.details.missing}</td><td className="px-6 py-4 text-center"><span className={`inline-block px-3 py-1 rounded-full text-lg font-bold ${tVal >= 90 ? 'bg-green-100 text-green-700' : (tVal >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}`}>{tVal.toFixed(1)}</span></td></tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
// --- [Part 3] 學生存簿系統 (含新版介面 & 表頭固定修復 & 慶祝特效) ---

const RewardOverlay = ({ type, onClose }) => {
   // 依據類型決定音效：金幣慶祝聲 或 銅幣叮咚聲
   const soundUrl = type === 'GOLD_CLEAR' ? ASSETS.GOLD_SOUND : ASSETS.BRONZE_SOUND;
   // 動畫時間：全對慶祝 6秒，普通補交 1秒
   const duration = type === 'GOLD_CLEAR' ? 6000 : 1000;

   // 自動關閉計時器
   useEffect(() => { const timer = setTimeout(() => { onClose(); }, duration); return () => clearTimeout(timer); }, [duration, onClose]);

   // 情境 A：全對慶祝畫面 (神龍/金幣 + 彩帶背景 + 6秒音樂)
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

   // 情境 B：補交獲得銅幣畫面 (+10 銅幣 + 叮咚聲)
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

const useStudentBank = (db, isAuthReady, isOffline, students) => {
   const initialData = useMemo(() => { const data = {}; students.forEach(s => data[s.id] = { bronze: 0, silver: 0, gold: 0 }); return data; }, [students]);
   const [bankData, setBankData] = useState(initialData);
   useEffect(() => {
       if (isOffline || !isAuthReady || !db) return;
       const q = query(collection(db, getBankCollectionPath()));
       const unsubscribe = onSnapshot(q, (snapshot) => { const remoteData = {}; snapshot.docs.forEach(doc => { remoteData[doc.id] = doc.data(); }); setBankData(prev => { const newData = { ...prev }; Object.keys(remoteData).forEach(key => { newData[key] = { bronze: Number(remoteData[key].bronze) || 0, silver: Number(remoteData[key].silver) || 0, gold: Number(remoteData[key].gold) || 0 }; }); return newData; }); }, (error) => { console.error("Bank sync error:", error); });
       return () => unsubscribe();
   }, [isAuthReady, db, isOffline, initialData]);
   
   const saveBalance = useCallback(async (studentId, newBronze, newSilver, newGold) => {
        let b = Math.max(0, newBronze); let s = Math.max(0, newSilver); let g = Math.max(0, newGold);
        if (b >= 100) { const silverGain = Math.floor(b / 100); b = b % 100; s += silverGain; }
        if (s >= 10) { const goldGain = Math.floor(s / 10); s = s % 10; g += goldGain; }
        const newState = { bronze: b, silver: s, gold: g };
        setBankData(prev => ({ ...prev, [studentId]: newState }));
        if (isOffline || !db) return;
        try { const docRef = doc(db, getBankCollectionPath(), studentId); await setDoc(docRef, { ...newState, lastUpdated: serverTimestamp() }, { merge: true }); } catch (e) { console.error("Error saving bank:", e); }
   }, [db, isOffline]);

   const updateBankBalance = useCallback((studentId, addBronze, addSilver, addGold) => {
       setBankData(prev => { const current = prev[studentId] || { bronze: 0, silver: 0, gold: 0 }; let b = (addBronze === 'RESET') ? 0 : (current.bronze || 0) + addBronze; let s = (addSilver === 'RESET') ? 0 : (current.silver || 0) + addSilver; let g = (addGold === 'RESET') ? 0 : (current.gold || 0) + addGold; saveBalance(studentId, b, s, g); return prev; });
   }, [saveBalance]);

   const setBankBalanceDirectly = useCallback((studentId, type, value) => {
       setBankData(prev => { const current = prev[studentId] || { bronze: 0, silver: 0, gold: 0 }; let b = current.bronze; let s = current.silver; let g = current.gold; if (type === 'BRONZE') b = value; if (type === 'SILVER') s = value; if (type === 'GOLD') g = value; saveBalance(studentId, b, s, g); return prev; });
   }, [saveBalance]);

   return { bankData, updateBankBalance, setBankBalanceDirectly };
};

// --- [v20.0.0 新版] 學生存簿介面 (上方切換模式 + 直接輸入 + 表頭固定修復) ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, setBankBalanceDirectly, authMode, students }) => {
  const [mode, setMode] = useState('bronze'); 

  // 定義模式設定 (顏色、圖示、增減數值)
  const MODE_CONFIG = {
    bronze: { label: '銅幣模式', icon: '🟤', color: 'orange', step: 10, key: 'bronze', bg: 'bg-orange-50' },
    silver: { label: '銀幣模式', icon: '⚪', color: 'gray', step: 1, key: 'silver', bg: 'bg-gray-50' },
    gold:   { label: '金幣模式', icon: '🟡', color: 'yellow', step: 1, key: 'gold', bg: 'bg-yellow-50' },
  };
  const cfg = MODE_CONFIG[mode];

  // 排序學生 (依金幣 > 銀幣 > 銅幣 > 座號)
  const sortedStudents = [...students].sort((a, b) => { 
      const bankA = bankData[a.id] || { bronze: 0, silver: 0, gold: 0 }; 
      const bankB = bankData[b.id] || { bronze: 0, silver: 0, gold: 0 }; 
      if (bankA.gold !== bankB.gold) return bankB.gold - bankA.gold; 
      if (bankA.silver !== bankB.silver) return bankB.silver - bankA.silver; 
      if (bankA.bronze !== bankB.bronze) return bankB.bronze - bankA.bronze; 
      return parseInt(a.id) - parseInt(b.id); 
  });

  // 處理直接輸入 (Input onChange)
  const handleInputChange = (studentId, type, value) => {
    if (authMode !== 'ADMIN') return;
    if (value === '') { setBankBalanceDirectly(studentId, type, 0); return; }
    const numVal = parseInt(value, 10);
    if (!isNaN(numVal) && numVal >= 0) { setBankBalanceDirectly(studentId, type, numVal); }
  };

  // 處理單一學生歸零
  const handleResetAll = async (studentId) => {
      if (authMode !== 'ADMIN') return;
      if (!window.confirm(`確定要將學生 ${studentId} 的【所有資產】歸零嗎？`)) return;
      onUpdateBalance(studentId, 'RESET', 'RESET', 'RESET');
  };

  // 處理全班歸零
  const handleResetClass = () => {
      if (authMode !== 'ADMIN') return;
      if(!window.confirm("⚠️ 危險操作：確定要將「全班所有人的錢」全部歸零嗎？\n此操作無法復原！")) return;
      if(!window.confirm("再次確認：您真的要歸零全班嗎？")) return;
      students.forEach(s => onUpdateBalance(s.id, 'RESET', 'RESET', 'RESET'));
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-[10000] p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-4 border-${cfg.color}-400 transition-colors duration-300`}>
        
        {/* 1. 頂部控制列：模式切換 */}
        <div className="bg-gray-100 p-4 border-b flex flex-wrap gap-4 justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button onClick={() => setMode('gold')} className={`px-4 py-2 rounded-lg font-bold text-xl flex items-center gap-2 transition border-2 ${mode === 'gold' ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-white border-transparent hover:bg-yellow-50'}`}>🟡 金幣</button>
            <button onClick={() => setMode('silver')} className={`px-4 py-2 rounded-lg font-bold text-xl flex items-center gap-2 transition border-2 ${mode === 'silver' ? 'bg-gray-200 border-gray-400 text-gray-800' : 'bg-white border-transparent hover:bg-gray-50'}`}>⚪ 銀幣</button>
            <button onClick={() => setMode('bronze')} className={`px-4 py-2 rounded-lg font-bold text-xl flex items-center gap-2 transition border-2 ${mode === 'bronze' ? 'bg-orange-100 border-orange-400 text-orange-800' : 'bg-white border-transparent hover:bg-orange-50'}`}>🟤 銅幣</button>
          </div>
          <div className="text-2xl font-bold text-gray-700 flex items-center gap-2">
            <span className="text-3xl">{cfg.icon}</span> 訂正存簿 ({cfg.label})
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X className="w-8 h-8" /></button>
        </div>

        {/* 2. 表格區 (修復表頭固定) */}
        <div className={`flex-1 overflow-auto p-4 ${cfg.bg}`}>
          <table className="w-full bg-white shadow-sm rounded-lg border border-gray-200 relative">
            <thead className="bg-gray-100 sticky top-0 z-50 shadow-md">
              <tr className="border-b-2 border-gray-300">
                <th className="p-3 text-2xl w-20 text-center bg-gray-100">名次</th>
                <th className="p-3 text-2xl w-24 text-center bg-gray-100">座號</th>
                <th className="p-3 text-2xl text-left bg-gray-100">姓名</th>
                <th className="p-3 text-2xl w-32 bg-yellow-50 text-yellow-700 text-center border-l border-gray-200">金幣</th>
                <th className="p-3 text-2xl w-32 bg-gray-50 text-gray-700 text-center border-l border-gray-200">銀幣</th>
                <th className="p-3 text-2xl w-32 bg-orange-50 text-orange-700 text-center border-l border-gray-200">銅幣</th>
                {authMode === 'ADMIN' && <th className="p-3 text-2xl w-48 text-center bg-gray-100 border-l border-gray-200">快速操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedStudents.map((student, idx) => {
                const bal = bankData[student.id] || { gold: 0, silver: 0, bronze: 0 };
                let rankIcon = idx < 3 ? ["🥇","🥈","🥉"][idx] : idx + 1;
                
                return (
                  <tr key={student.id} className="hover:bg-blue-50 transition duration-150 group">
                    <td className="p-3 text-center text-3xl font-black text-gray-500">{rankIcon}</td>
                    <td className="p-3 text-center text-2xl font-bold text-gray-600">{student.id}</td>
                    <td className="p-3 text-2xl font-bold text-gray-800">{student.name[0] + 'O' + student.name.slice(2)}</td>
                    
                    {/* 輸入框區：金 */}
                    <td className="p-2 text-center bg-yellow-50/30 border-l border-gray-100 group-hover:border-blue-100">
                      <input type="number" value={bal.gold} onChange={(e)=>handleInputChange(student.id, 'gold', e.target.value)} disabled={authMode!=='ADMIN'} 
                        className="w-24 text-center text-3xl font-bold text-yellow-600 bg-transparent border-b-2 border-transparent focus:border-yellow-500 outline-none hover:bg-white/50 rounded" />
                    </td>
                    {/* 輸入框區：銀 */}
                    <td className="p-2 text-center bg-gray-50/30 border-l border-gray-100 group-hover:border-blue-100">
                      <input type="number" value={bal.silver} onChange={(e)=>handleInputChange(student.id, 'silver', e.target.value)} disabled={authMode!=='ADMIN'} 
                        className="w-24 text-center text-3xl font-bold text-gray-600 bg-transparent border-b-2 border-transparent focus:border-gray-500 outline-none hover:bg-white/50 rounded" />
                    </td>
                    {/* 輸入框區：銅 */}
                    <td className="p-2 text-center bg-orange-50/30 border-l border-gray-100 group-hover:border-blue-100">
                      <input type="number" value={bal.bronze} onChange={(e)=>handleInputChange(student.id, 'bronze', e.target.value)} disabled={authMode!=='ADMIN'} 
                        className="w-24 text-center text-3xl font-bold text-orange-700 bg-transparent border-b-2 border-transparent focus:border-orange-500 outline-none hover:bg-white/50 rounded" />
                    </td>

                    {/* 按鈕區 (根據模式變色) */}
                    {authMode === 'ADMIN' && (
                        <td className="p-2 flex justify-center items-center gap-3 border-l border-gray-100 group-hover:border-blue-100">
                        <button onClick={() => onUpdateBalance(student.id, cfg.key==='bronze'?10:0, cfg.key==='silver'?1:0, cfg.key==='gold'?1:0)}
                            className={`w-12 h-12 rounded-full shadow flex items-center justify-center text-3xl font-bold transition transform active:scale-90 ${mode==='gold'?'bg-yellow-100 text-yellow-700 hover:bg-yellow-200': mode==='silver'?'bg-gray-100 text-gray-700 hover:bg-gray-200': 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`} title="增加">＋</button>
                        <button onClick={() => onUpdateBalance(student.id, cfg.key==='bronze'?-10:0, cfg.key==='silver'?-1:0, cfg.key==='gold'?-1:0)}
                            className={`w-12 h-12 rounded-full shadow flex items-center justify-center text-3xl font-bold transition transform active:scale-90 opacity-80 hover:opacity-100 ${mode==='gold'?'bg-yellow-50 text-yellow-600': mode==='silver'?'bg-gray-50 text-gray-600': 'bg-orange-50 text-orange-600'}`} title="減少">－</button>
                        <button onClick={() => handleResetAll(student.id)} className="p-2 ml-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition" title="單人歸零"><Eraser className="w-6 h-6"/></button>
                        </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* 3. 底部功能：全班歸零 (只有老師看得到) */}
        {authMode === 'ADMIN' && (
            <div className="p-4 bg-gray-100 border-t flex justify-start">
                <button onClick={handleResetClass} className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 flex items-center gap-2 text-xl shadow-md">⚠️ 期末全班歸零</button>
            </div>
        )}
      </div>
    </div>
  );
};
// --- [Part 4] 每日結算 Hook 與 輔助介面元件 ---

// --- 每日結算狀態 Hook ---
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

// --- 輔助 UI 元件 ---
const CustomAlert = ({ message, onClose }) => ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"> <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100"> <h3 className="text-4xl font-semibold text-gray-800 mb-4">通知</h3> <p className="text-3xl text-gray-600 mb-6">{message}</p> <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out font-medium text-4xl">確定</button> </div> </div> );

const LoginScreen = ({ onAdminLogin, onGuestLogin, isLoading, errorMsg }) => { 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [mode, setMode] = useState('GUEST'); 
  const handleAdminSubmit = (e) => { e.preventDefault(); onAdminLogin(email, password); }; 
  return ( <div className="fixed inset-0 bg-[#F0F8FF] flex items-center justify-center z-[10000]"> <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-blue-100"> <div className="text-center mb-8"> <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-wide">五年甲班作業表</h1> <p className="text-gray-400 text-xl font-medium">請選擇您的身分</p> </div> <div className="flex bg-gray-100 p-1 rounded-xl mb-6"> <button onClick={() => setMode('GUEST')} className={`flex-1 py-2 rounded-lg text-xl font-bold transition-all ${mode === 'GUEST' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>學生/家長</button> <button onClick={() => setMode('ADMIN')} className={`flex-1 py-2 rounded-lg text-xl font-bold transition-all ${mode === 'ADMIN' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>老師 (管理員)</button> </div> {mode === 'ADMIN' ? ( <form onSubmit={handleAdminSubmit} className="space-y-4 animate-fade-in"> <div><label className="block text-gray-600 text-lg font-bold mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="w-full px-4 py-3 text-xl border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all" autoFocus /></div> <div><label className="block text-gray-600 text-lg font-bold mb-1">密碼</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="請輸入密碼" className="w-full px-4 py-3 text-xl border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all" /></div> {errorMsg && (<p className="text-red-500 text-lg font-bold">{errorMsg}</p>)} <button type="submit" disabled={isLoading} className={`w-full py-3 rounded-xl text-white text-2xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-wait' : 'bg-red-500 hover:bg-red-600'}`}>{isLoading ? '驗證中...' : <><Key className="w-6 h-6" /> 管理員登入</>}</button> </form> ) : ( <div className="space-y-6 animate-fade-in"> <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-lg"><p className="font-bold flex items-center gap-2"><Shield className="w-5 h-5"/> 訪客模式說明：</p><p className="mt-1">您可以查看所有作業進度，但無法修改作業名稱或刪除紀錄。</p></div> <button onClick={onGuestLogin} disabled={isLoading} className={`w-full py-3 rounded-xl text-white text-2xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-wait' : 'bg-blue-500 hover:bg-blue-600'}`}>{isLoading ? '進入中...' : <><User className="w-6 h-6" /> 進入系統</>}</button> </div> )} <div className="mt-8 text-center text-gray-400 text-lg">系統版本：{VERSION}</div> </div> </div> ); 
};

const AllMissingAssignmentsModal = ({ missingStats, onClose }) => { const studentsWithMissing = missingStats.filter(s => s.missingCount > 0); return ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4"> <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200"> <div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="text-4xl font-bold text-gray-800 flex items-center"><AlertCircle className="w-10 h-10 text-red-500 mr-3" />全班未完成作業總表</h3><button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"><X className="w-8 h-8" /></button></div> <div className="flex-1 overflow-auto"> {studentsWithMissing.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400"><Check className="w-24 h-24 mb-4 text-green-400" /><p className="text-4xl font-bold text-green-600">太棒了！目前全班皆已完成所有作業。</p></div>) : ( <table className="min-w-full divide-y divide-gray-300"> <thead className="bg-gray-100 sticky top-0 z-10"><tr><th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-24 text-center border-r border-gray-300">座號</th><th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-32 text-center border-r border-gray-300">姓名</th><th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-32 text-center border-r border-gray-300">缺交數</th><th className="px-6 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider text-left">未完成項目明細 (依作業名稱排序)</th></tr></thead> <tbody className="bg-white divide-y divide-gray-200">{studentsWithMissing.map((student) => (<tr key={student.id} className="hover:bg-red-50 transition duration-100"><td className="px-4 py-4 text-2xl text-gray-900 font-medium text-center border-r border-gray-200">{student.id}</td><td className="px-4 py-4 text-2xl text-gray-900 font-bold text-center border-r border-gray-200">{student.name[0] + 'O' + student.name.slice(2)}</td><td className="px-4 py-4 text-center border-r border-gray-200"><span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-2xl">{student.missingCount}</span></td><td className="px-6 py-4 text-xl text-gray-700"><ul className="list-disc list-inside space-y-1">{[...student.missingDetails].sort((a, b) => a.assignment.localeCompare(b.assignment, 'zh-TW')).map((detail, idx) => (<li key={idx} className="flex items-start"><span className="text-red-600 font-bold text-xl mr-2">{detail.assignment}</span><span className="font-mono font-medium text-gray-400 text-lg">[{new Date(detail.date).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})}]</span></li>))}</ul></td></tr>))}</tbody> </table> )} </div> <div className="mt-4 pt-4 border-t border-gray-200 text-right"><button onClick={onClose} className="bg-gray-800 text-white py-3 px-8 rounded-xl hover:bg-gray-900 transition text-2xl font-bold">關閉視窗</button></div> </div> </div> ); };

const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmTitle, confirmColor }) => { const [isAltPressed, setIsAltPressed] = useState(false); useEffect(() => { const handleKeyDown = (e) => { if (e.key === 'Alt') setIsAltPressed(true); }; const handleKeyUp = (e) => { if (e.key === 'Alt') setIsAltPressed(false); }; window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); }; }, []); return ( <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4"> <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100"> <h3 className="text-4xl font-bold text-gray-800 mb-4">{title}</h3><p className="text-3xl text-gray-600 mb-6">{message}</p> <div className="flex justify-between gap-4 mt-6"><button onClick={onCancel} className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition duration-150 ease-in-out font-medium text-4xl">取消 (保留資料)</button><button onClick={() => { if (isAltPressed) { onConfirm(); } else { alert(`請按住 Alt 鍵，才能確認執行 ${confirmTitle} 操作！`); } }} disabled={!isAltPressed} className={`flex-1 text-white py-3 rounded-lg transition duration-150 ease-in-out font-medium text-4xl ${confirmColor} ${isAltPressed ? 'hover:brightness-110' : 'bg-red-400 cursor-not-allowed'}`}>{confirmTitle}</button></div><p className="mt-3 text-center text-red-500 text-3xl font-semibold opacity-0">請按住 **Alt 鍵** 才能啟用刪除按鈕！</p> </div> </div> ); };

const getTodayDate = () => { const d = new Date(); const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };

const MISSING_COLOR_TIERS = [ { min: 1, max: 3, colors: { bg: 'bg-blue-300', border: 'border-blue-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '1-3項' }, { min: 4, max: 6, colors: { bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-white', countText: 'text-white' }, label: '4-6項' }, { min: 7, max: 9, colors: { bg: 'bg-green-600', border: 'border-green-800', text: 'text-white', countText: 'text-white' }, label: '7-9項' }, { min: 10, max: 12, colors: { bg: 'bg-lime-500', border: 'border-lime-700', text: 'text-gray-900', countText: 'text-gray-900' }, label: '10-12項' }, { min: 13, max: 15, colors: { bg: 'bg-emerald-300', border: 'border-emerald-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '13-15項' }, { min: 16, max: 18, colors: { bg: 'bg-yellow-300', border: 'border-yellow-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '16-18項' }, { min: 19, max: 21, colors: { bg: 'bg-yellow-500', border: 'border-yellow-700', text: 'text-gray-900', countText: 'text-gray-900' }, label: '19-21項' }, { min: 22, max: 24, colors: { bg: 'bg-red-600', border: 'border-red-700', text: 'text-white', countText: 'text-white' }, label: '22-24項' }, { min: 25, max: 27, colors: { bg: 'bg-amber-800', border: 'border-amber-900', text: 'text-white', countText: 'text-white' }, label: '25-27項' }, { min: 28, max: 30, colors: { bg: 'bg-orange-600', border: 'border-orange-800', text: 'text-white', countText: 'text-white' }, label: '28-30項' }, { min: 31, max: 33, colors: { bg: 'bg-pink-300', border: 'border-pink-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '31-33項' }, { min: 34, max: 36, colors: { bg: 'bg-rose-400', border: 'border-rose-600', text: 'text-gray-900', countText: 'text-gray-900' }, label: '34-36項' }, { min: 37, max: 39, colors: { bg: 'bg-fuchsia-500', border: 'border-fuchsia-700', text: 'text-white', countText: 'text-white' }, label: '37-39項' }, { min: 40, max: 42, colors: { bg: 'bg-purple-600', border: 'border-purple-800', text: 'text-white', countText: 'text-white' }, label: '40-42項' }, { min: 43, max: 45, colors: { bg: 'bg-violet-600', border: 'border-violet-800', text: 'text-white', countText: 'text-white' }, label: '43-45項' }, { min: 46, max: 48, colors: { bg: 'bg-violet-300', border: 'border-violet-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '46-48項' }, { min: 49, max: 51, colors: { bg: 'bg-indigo-600', border: 'border-indigo-800', text: 'text-white', countText: 'text-white' }, label: '49-51項' }, { min: 52, max: 54, colors: { bg: 'bg-blue-600', border: 'border-blue-800', text: 'text-white', countText: 'text-white' }, label: '52-54項' }, { min: 55, max: 57, colors: { bg: 'bg-sky-600', border: 'border-sky-800', text: 'text-white', countText: 'text-white' }, label: '55-57項' }, { min: 58, max: 60, colors: { bg: 'bg-teal-800', border: 'border-teal-950', text: 'text-white', countText: 'text-white' }, label: '58-60項' }, { min: 61, max: 63, colors: { bg: 'bg-gray-400', border: 'border-gray-600', text: 'text-gray-900', countText: 'text-gray-900' }, label: '61-63項' }, { min: 64, max: 66, colors: { bg: 'bg-gray-500', border: 'border-gray-700', text: 'text-white', countText: 'text-white' }, label: '64-66項' }, { min: 67, max: 69, colors: { bg: 'bg-gray-700', border: 'border-gray-900', text: 'text-white', countText: 'text-white' }, label: '67-69項' }, { min: 70, max: 72, colors: { bg: 'bg-blue-900', border: 'border-blue-950', text: 'text-white', countText: 'text-white' }, label: '70-72項' }, { min: 73, max: Infinity, colors: { bg: 'bg-black', border: 'border-red-500', text: 'text-white', countText: 'text-white' }, label: '73項+' }, ];

const getMissingColorClasses = (count) => { if (count === 0) return { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-400', countText: 'text-gray-800' }; const tier = MISSING_COLOR_TIERS.find(t => count <= t.max); return tier ? tier.colors : MISSING_COLOR_TIERS[MISSING_COLOR_TIERS.length - 1].colors; };

const MissingColorExplanation = () => { const legendTiers = MISSING_COLOR_TIERS.map(tier => ({ count: tier.label, classes: tier.colors })); return (<div className="mt-8 p-4 sm:p-6 bg-white rounded-xl shadow-xl border border-gray-200"><h3 className="text-4xl font-bold text-gray-800 mb-6 flex items-center"><span className="text-pink-500 text-5xl mr-3">🎨</span>顏色分級說明</h3><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{legendTiers.map((item, index) => (<div key={index} className={`py-3 px-2 rounded-xl text-center cursor-default ${item.classes.bg} ${item.classes.border} border-2 border-b-[6px] flex items-center justify-center`}><p className={`text-2xl font-black ${item.classes.text} leading-tight`}>{item.count}</p></div>))}</div></div>); };

const MonthlyStudentStats = ({ monthlyStats, months }) => { const studentIds = useMemo(() => Object.keys(monthlyStats).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)), [monthlyStats]); if (studentIds.length === 0) return null; return (<div className="mt-12 p-4 sm:p-6 bg-white rounded-xl shadow-xl border border-gray-200 max-w-full"><h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center"><span className="text-5xl mr-3">📊</span><span className="text-4xl">每月繳交狀況統計</span></h2><div className="w-full relative border border-gray-300 rounded-lg shadow-lg"><table className="w-full divide-y divide-gray-300 table-fixed"><thead className="bg-gray-200"><tr><th className="sticky top-0 z-30 px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-700 w-24 border-r border-gray-300 bg-gray-200 shadow-sm">姓名</th>{months.map(month => (<th key={month.id} className={`sticky top-0 z-30 px-1 py-4 text-3xl font-semibold uppercase tracking-wider text-white ${month.color} break-words shadow-sm`}>{month.name}</th>))}</tr></thead><tbody className="bg-white divide-y divide-gray-200">{studentIds.map(studentId => { const studentData = monthlyStats[studentId]; if (!studentData) return null; return (<tr key={studentId} className="hover:bg-gray-50 transition duration-100"><td className="px-2 py-4 text-3xl font-semibold text-gray-900 border-r border-gray-300 text-center whitespace-nowrap">{studentData.studentName[0] + 'O' + studentData.studentName.slice(2)}</td>{months.map(month => { const stats = studentData.monthStats[month.id]; const hasMissing = stats.daysMissing > 0; const hasLate = stats.daysLate > 0; const hasTotal = stats.totalDays > 0; const hasCompletedOnly = !hasMissing && !hasLate && hasTotal; return (<td key={month.id} className={`px-1 py-4 text-center text-2xl sm:text-3xl ${hasMissing ? 'bg-red-100' : (hasLate ? 'bg-yellow-100' : (hasCompletedOnly ? 'bg-green-100' : 'bg-white'))}`}>{hasTotal ? (<div className="flex flex-col items-center justify-center gap-1"><span className="text-green-700 whitespace-nowrap">完成:<span className="inline-block w-8 text-right">{stats.daysCompleted}</span></span><span className={`${hasLate ? 'font-bold text-yellow-600' : 'text-gray-400'} whitespace-nowrap`}>遲交:<span className="inline-block w-8 text-right">{stats.daysLate}</span></span><span className={`${hasMissing ? 'font-bold text-red-600' : 'text-gray-400'} whitespace-nowrap`}>缺交:<span className="inline-block w-8 text-right">{stats.daysMissing}</span></span></div>) : <span className="text-gray-300">-</span>}</td>); })}</tr>); })}</tbody></table></div></div>); };

// --- [關鍵修復] MissingDetailsModal (批次補交發錢邏輯) ---
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
        }); return items.sort((a, b) => a.date.localeCompare(b.date)); 
    }, [allAssignmentsByDate, student.id]); 
    const numColumns = 4; 
    const columns = useMemo(() => { 
        if (detailedMissingItems.length === 0) return []; 
        const itemsPerColumn = Math.ceil(detailedMissingItems.length / numColumns); 
        return Array.from({ length: numColumns }, (_, colIndex) => { const start = colIndex * itemsPerColumn; return detailedMissingItems.slice(start, start + itemsPerColumn); }); 
    }, [detailedMissingItems]); 
    const handleToggleSelect = useCallback((assignmentId) => { setSelectedItemIds(prev => prev.includes(assignmentId) ? prev.filter(id => id !== assignmentId) : [...prev, assignmentId]); }, []); 
    const handleToggleSelectAll = useCallback(() => { if (selectedItemIds.length === detailedMissingItems.length) { setSelectedItemIds([]); } else { setSelectedItemIds(detailedMissingItems.map(item => item.assignmentId)); } }, [selectedItemIds.length, detailedMissingItems]); 
    
    // --- [修復點] 批次補交發錢邏輯 ---
    const handleBatchDeleteSelectedItems = useCallback(async (e) => { 
        if (selectedItemIds.length === 0) { alert("請先勾選至少一項要標記為『已補交』的作業紀錄。"); return; } 
        if (!e.ctrlKey && !e.metaKey) { return; } 
        setAlertMessage(null); 
        
        // 1. 計算金額並發放
        const bronzeReward = selectedItemIds.length * 10;
        updateBankBalance(student.id, bronzeReward, 0, 0);
        // 2. 播放動畫
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2"> 
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
// --- [Part 5] 資料 Hooks 與 App 主邏輯 ---

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
  
  // Hooks
  const { students, loadingStudents } = useStudents(db, isOffline);
  const { bankData, updateBankBalance, setBankBalanceDirectly } = useStudentBank(db, isAuthReady, isOffline, students);
  const dailySettlements = useDailySettlements(db, isAuthReady, isOffline);
  const { categories, loadingCategories, addCategory, deleteCategory, editCategory, moveCategory, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students);

  // 學期與月份
  const { defaultSemester, defaultMonth } = useMemo(() => { const today = new Date(); const m = today.getMonth() + 1; const monthStr = String(m).padStart(2, '0'); let sem = 'S1'; if (m >= 2 && m <= 7) { sem = 'S2'; } return { defaultSemester: sem, defaultMonth: monthStr }; }, []);
  const [selectedSemester, setSelectedSemester] = useState(defaultSemester); const [selectedMonth, setSelectedMonth] = useState(defaultMonth); const [unlockClicks, setUnlockClicks] = useState({});
  const academicYear = "114"; const startYear = 2025; const endYear = 2026;
  const semesters = [ { id: 'S1', name: `上學期 (${startYear}/8 - ${endYear}/1)`, startMonth: '08', endMonth: '01', startYear: startYear, endYear: endYear }, { id: 'S2', name: `下學期 (${endYear}/2 - ${endYear}/7)`, startMonth: '02', endMonth: '07', startYear: endYear, endYear: endYear }, ];
  const months = useMemo(() => [ { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' }, { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' }, { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' }, { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' }, { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' }, { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' }, { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' }, { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' }, ], []);

  // Firebase Init
  useEffect(() => { const timer = setTimeout(() => { if (loading) setAuthTimeout(true); }, 3000); if (!firebaseConfig) { console.error("Firebase configuration is missing."); setError("無法載入 Firebase 設定。請檢查環境配置。"); setLoading(false); return; } try { const app = initializeApp(firebaseConfig); const firestore = getFirestore(app); const firebaseAuth = getAuth(app); setDb(firestore); setAuth(firebaseAuth); const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => { if (user) { setUserId(user.uid); setIsAuthReady(true); setIsAuthenticated(true); if (user.isAnonymous) { setAuthMode('GUEST'); } else { setAuthMode('ADMIN'); } } else { setIsAuthenticated(false); setAuthMode('GUEST'); } setLoadingLogin(false); }); return () => { unsubscribe(); clearTimeout(timer); }; } catch (e) { console.error("Firebase initialization failed:", e); setError("初始化失敗：" + e.message); setLoading(false); } }, []);

  // Handlers
  const handleGoOffline = () => { setIsOffline(true); setUserId('guest_user'); setIsAuthReady(true); setLoading(false); setIsAuthenticated(true); setAuthMode('GUEST'); };
  const handleAdminLogin = async (email, password) => { setLoadingLogin(true); setLoginError(''); try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { console.error("Login failed", error); if (error.code === 'auth/invalid-email') { setLoginError('Email 格式不正確'); } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { setLoginError('帳號或密碼錯誤'); } else if (error.code === 'auth/too-many-requests') { setLoginError('嘗試次數過多，請稍後再試'); } else { setLoginError('登入失敗：' + error.message); } setLoadingLogin(false); } };
  const handleGuestLogin = async () => { setLoadingLogin(true); setLoginError(''); try { await signInAnonymously(auth); } catch (error) { console.error("Anonymous login failed", error); setLoginError('訪客登入失敗，請稍後再試。'); setLoadingLogin(false); } };
  const handleLogout = async () => { try { await signOut(auth); setIsAuthenticated(false); setAuthMode('GUEST'); } catch (e) { console.error("Logout failed", e); } };

  // Data Fetching & Calculation
  useEffect(() => { if (isOffline) { setLoading(false); return; } if (!isAuthReady || !db || !userId) return; const path = getAssignmentCollectionPath(); const assignmentsCollection = collection(db, path); const currentSemData = semesters.find(s => s.id === selectedSemester); let q; if (currentSemData) { const startDate = `${currentSemData.startYear}-${currentSemData.startMonth}-01`; const endDate = `${currentSemData.endYear}-${currentSemData.endMonth}-31`; q = query( assignmentsCollection, where("assignmentDate", ">=", startDate), where("assignmentDate", "<=", endDate) ); } else { q = query(assignmentsCollection); } const unsubscribe = onSnapshot(q, (snapshot) => { const groupedData = {}; snapshot.docs.forEach(doc => { const data = doc.data(); const date = data.assignmentDate; if (date) { if (!groupedData[date]) { groupedData[date] = []; } groupedData[date].push({ id: doc.id, assignmentName: data.assignmentName, order: data.order ?? 999, submissionStatus: data.submissionStatus || {}, completedAt: data.completedAt || {}, makeupClaimed: data.makeupClaimed || {}, createdAt: data.createdAt?.toDate().toISOString() }); } }); setAllAssignmentsByDate(groupedData); if (!loadingCategories) { setLoading(false); } }, (e) => { console.error("Error fetching assignments:", e); if (e.code === 'permission-denied') { console.warn("Permission denied (transient)"); } else { setAlertMessage("讀取資料時發生錯誤，請稍後再試。"); setAuthTimeout(true); } setLoading(false); }); return () => unsubscribe(); }, [isAuthReady, db, userId, loadingCategories, isOffline, selectedSemester]);
  const assignmentsForSelectedDate = useMemo(() => { const assignments = allAssignmentsByDate[selectedDisplayDate] || []; return assignments.sort((a, b) => a.order - b.order); }, [allAssignmentsByDate, selectedDisplayDate]);
  const assignmentMap = useMemo(() => { return assignmentsForSelectedDate.reduce((acc, assignment) => { acc[assignment.assignmentName] = { id: assignment.id, submissionStatus: assignment.submissionStatus, makeupClaimed: assignment.makeupClaimed }; return acc; }, {}); }, [assignmentsForSelectedDate]);
  const filteredMonths = useMemo(() => { const currentSemesterData = semesters.find(s => s.id === selectedSemester); if (!currentSemesterData) return months; return months.filter(m => m.semester === selectedSemester); }, [months, selectedSemester, semesters]);
  useEffect(() => { if (filteredMonths.length > 0) { const currentMonthExists = filteredMonths.some(m => m.id === selectedMonth); if (!currentMonthExists) { setSelectedMonth(filteredMonths[0].id); } } }, [selectedSemester, filteredMonths, selectedMonth]);
  const availableDates = useMemo(() => { const dates = Object.keys(allAssignmentsByDate).sort(); if (dates.length > 0) { if (!dates.includes(selectedDisplayDate)) { setSelectedDisplayDate(dates[dates.length - 1]); } } else if (dates.length === 0 && selectedDisplayDate !== getTodayDate()) { setSelectedDisplayDate(getTodayDate()); } return dates; }, [allAssignmentsByDate, selectedDisplayDate]);
  const displayedDates = useMemo(() => { const dates = Object.keys(allAssignmentsByDate).sort(); const filteredByMonth = dates.filter(date => { const dateMonth = date.substring(5, 7); return dateMonth === selectedMonth; }).sort(); return filteredByMonth; }, [allAssignmentsByDate, selectedMonth]);
  useEffect(() => { if (displayedDates.length > 0 && !displayedDates.includes(selectedDisplayDate)) { setSelectedDisplayDate(displayedDates[0]); } else if (displayedDates.length === 0) { setSelectedDisplayDate(getTodayDate()); } }, [displayedDates, selectedDisplayDate]);
  const studentMissingStats = useMemo(() => { const stats = students.map(student => ({ id: student.id, name: student.name, missingCount: 0, missingDetails: [] })); Object.keys(allAssignmentsByDate).forEach(date => { const assignmentsOnDate = allAssignmentsByDate[date] || []; assignmentsOnDate.forEach(assignment => { const submissionStatus = assignment.submissionStatus || {}; students.forEach((student, index) => { if (submissionStatus[student.id] === false) { stats[index].missingCount += 1; stats[index].missingDetails.push({ date: date, assignment: assignment.assignmentName }); } }); }); }); stats.sort((a, b) => b.missingCount - a.missingCount); return stats; }, [allAssignmentsByDate, students]);
  const monthlyStudentStats = useMemo(() => { const stats = {}; students.forEach(student => { stats[student.id] = { studentName: student.name, monthStats: {} }; months.forEach(month => { stats[student.id].monthStats[month.id] = { daysCompleted: 0, daysLate: 0, daysMissing: 0, totalDays: 0 }; }); }); Object.keys(allAssignmentsByDate).forEach(date => { const monthId = date.substring(5, 7); const assignmentsOnDate = allAssignmentsByDate[date] || []; if (assignmentsOnDate.length === 0) return; students.forEach(student => { if (stats[student.id].monthStats[monthId]) { let worstStatusOfDay = 'true'; for (const assignment of assignmentsOnDate) { const status = assignment.submissionStatus[student.id]; if (status === false) { worstStatusOfDay = 'false'; break; } if (status === 'late') { worstStatusOfDay = 'late'; } } stats[student.id].monthStats[monthId].totalDays++; if (worstStatusOfDay === 'false') { stats[student.id].monthStats[monthId].daysMissing++; } else if (worstStatusOfDay === 'late') { stats[student.id].monthStats[monthId].daysLate++; } else { stats[student.id].monthStats[monthId].daysCompleted++; } } }); }); return stats; }, [allAssignmentsByDate, months, students]);

  // --- [關鍵修復] 結算發布邏輯 (只發給未領過的人) ---
  const isDaySettled = useMemo(() => dailySettlements[selectedDisplayDate]?.isSettled || false, [dailySettlements, selectedDisplayDate]);
  
  const handleBatchSettlement = useCallback(async () => {
    if (!selectedDisplayDate) return;
    // 移除「已發布」的阻擋，改成允許補發
    const settledData = dailySettlements[selectedDisplayDate];
    const assignments = assignmentsForSelectedDate;
    if (assignments.length === 0) return;

    // 找出目前所有綠燈(準時完成)的學生
    const greenStudentIds = [];
    students.forEach(s => {
        const isAllGreen = assignments.every(a => {
            const status = a.submissionStatus[s.id];
            // 只有 True (綠燈) 才是全對，Late (黃燈) 不算
            return status === true; 
        });
        if (isAllGreen) greenStudentIds.push(s.id);
    });

    // 過濾掉「已經領過銀幣」的學生
    const claimedMap = settledData?.silverRewardClaimed || {};
    const newWinners = greenStudentIds.filter(id => !claimedMap[id]);

    if (newWinners.length === 0) {
        alert("目前所有全對的學生都已經領過銀幣了！\n沒有新符合資格的學生。");
        return;
    }

    const newWinnerNames = newWinners.map(id => {
        const s = students.find(stud => stud.id === id);
        return s ? `${s.id}.${s.name[0]}O${s.name.slice(2)}` : id; 
    });
    const nameListString = newWinnerNames.join('、');

    if (!window.confirm(`【補發銀幣確認】\n\n日期：${selectedDisplayDate}\n\n🏆 本次新增獲獎學生 (${newWinners.length}位)：\n${nameListString}\n\n注意：這些學生將獲得 2 枚銀幣。`)) return;

    setLoading(true);
    if (isOffline) {
        newWinners.forEach(sid => updateBankBalance(sid, 0, 2, 0));
        alert(`[離線] 補發成功！\n\n🎉 已發放銀幣給 ${newWinners.length} 位學生。`);
        setLoading(false);
        return;
    }

    try {
        const batch = writeBatch(db);
        const settlementRef = doc(db, getDailySettlementPath(), selectedDisplayDate);
        
        // 準備要更新的 map (將新獲獎者設為 true)
        const newClaims = {};
        newWinners.forEach(id => newClaims[id] = true);

        // 使用 merge: true 來保留舊的紀錄，只新增新的人
        batch.set(settlementRef, { 
            isSettled: true, 
            silverRewardClaimed: newClaims, // 這會透過 merge 合併進去
            settledAt: serverTimestamp() 
        }, { merge: true });

        await batch.commit();
        
        // 發錢
        newWinners.forEach(sid => { updateBankBalance(sid, 0, 2, 0); });
        
        setAlertMessage(`✅ 發放完成！\n\n共 ${newWinners.length} 位學生獲得銀幣獎勵：\n${nameListString}`);
    } catch (e) {
        console.error("Settlement failed:", e);
        setAlertMessage("結算發布失敗，請稍後再試。");
    } finally {
        setLoading(false);
    }
  }, [selectedDisplayDate, dailySettlements, assignmentsForSelectedDate, students, isOffline, db, updateBankBalance]);

  // --- [關鍵修復] 燈號切換邏輯 (含自動扣款/補發動畫) ---
  const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatus) => { 
      const assignmentData = assignmentMap[assignmentName]; 
      if (!assignmentData) return; 
      
      const settledData = dailySettlements[selectedDisplayDate];
      const isSettled = settledData?.isSettled || false;
      
      // 判斷是否為過去日期 (只要小於今天，就視為補救模式)
      const todayStr = getTodayDate();
      const isPastDate = selectedDisplayDate < todayStr;
      
      const isStrictMode = isSettled || isPastDate;

      // --- 模式 A: 未結算的當日作業 (自由修改，不扣錢) ---
      if (!isStrictMode) {
          const cellKey = `${studentId}-${assignmentData.id}`; 
          let newStatus; 
          // 循環：綠 -> 紅 -> 黃 -> 綠 (如果想恢復雙擊鎖定，可保留原本邏輯，這裡簡化為循環)
          if (currentStatus === true || currentStatus === undefined) { 
              newStatus = false; 
              setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
          } else if (currentStatus === false) { 
              newStatus = 'late'; 
              setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
          } else { 
              // 黃 -> 綠 (需要雙擊解鎖? 這裡先設為單擊循環)
              const currentCount = unlockClicks[cellKey] || 0; 
              if (currentCount < 2) { 
                  setUnlockClicks(prev => ({ ...prev, [cellKey]: currentCount + 1 })); return; 
              } else { 
                  newStatus = true; 
                  setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
              } 
          }
          
          // 寫入 (離線/線上)
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

      // --- 模式 B: 已結算或過去日期 (嚴格模式：連動錢包) ---
      let newStatus;
      let bronzeChange = 0;
      let silverChange = 0;
      let makeupUpdate = {}; 
      let settlementUpdate = null; 
      let triggerAnimation = null;

      // 1. 綠燈 (準時) -> 紅燈 (缺交)
      if (currentStatus === true || currentStatus === undefined) {
          newStatus = false;
          // 如果這天已經結算過，且他領過銀幣，就要扣回來
          if (settledData?.silverRewardClaimed?.[studentId]) {
              silverChange = -2;
              // 從領獎名單移除 (設為 deleteField)
              settlementUpdate = { [`silverRewardClaimed.${studentId}`]: deleteField() }; 
          }
      } 
      // 2. 紅燈 (缺交) -> 黃燈 (補交)
      else if (currentStatus === false) {
          newStatus = 'late';
          bronzeChange = 10; // 發放銅幣
          makeupUpdate = { [`makeupClaimed.${studentId}`]: true };
          triggerAnimation = 'BRONZE'; // 觸發動畫
      } 
      // 3. 黃燈 (補交) -> 紅燈 (退回)
      // *注意：這裡我們把循環改成 紅->黃->紅，避免黃直接變綠(誤發銀幣)*
      else {
          newStatus = false; // 退回紅燈
          // 如果之前已經因為補交領過 10 元，現在要扣回來
          // 這裡簡化邏輯：只要是黃變紅，就假設他之前領過補交賞，扣 10 元
          bronzeChange = -10; 
          makeupUpdate = { [`makeupClaimed.${studentId}`]: deleteField() };
          
          // 重置雙擊計數器
          const cellKey = `${studentId}-${assignmentData.id}`; 
          setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; }); 
      }

      // 執行錢包更新
      if (bronzeChange !== 0 || silverChange !== 0) {
          updateBankBalance(studentId, bronzeChange, silverChange, 0);
      }
      
      // 觸發動畫
      if (triggerAnimation) {
          setRewardState({ type: triggerAnimation });
      }

      // 檢查是否達成「全部完成」(觸發神龍)
      // 邏輯：如果這次操作讓紅燈消失，且沒有其他紅燈，就觸發
      if (newStatus !== false) {
          const assignments = assignmentsForSelectedDate;
          const otherAssignments = assignments.filter(a => a.id !== assignmentData.id);
          const hasOtherRed = otherAssignments.some(a => a.submissionStatus[studentId] === false);
          if (!hasOtherRed) {
              // 恭喜！全部紅燈都消滅了
              setRewardState({ type: 'GOLD_CLEAR' });
          }
      }

      // 寫入資料庫
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
          batch.update(assignRef, { [`submissionStatus.${studentId}`]: newStatus, ...makeupUpdate });
          
          if (settlementUpdate) {
              const settleRef = doc(db, getDailySettlementPath(), selectedDisplayDate);
              batch.update(settleRef, settlementUpdate);
          }
          await batch.commit();
      }
  }, [db, userId, assignmentMap, unlockClicks, isOffline, allAssignmentsByDate, updateBankBalance, selectedDisplayDate, dailySettlements, assignmentsForSelectedDate]);

  const handleEditCurrentDate = useCallback(async (targetOldDate) => { const oldDate = typeof targetOldDate === 'string' ? targetOldDate : selectedDisplayDate; if (authMode !== 'ADMIN' || !oldDate) return; const newDate = prompt(`請輸入新的日期以取代 ${oldDate} (格式: YYYY-MM-DD)`, oldDate); if (!newDate || newDate === oldDate) return; const datePattern = /^\d{4}-\d{2}-\d{2}$/; if (!datePattern.test(newDate)) { alert("日期格式不正確，請使用 YYYY-MM-DD格式。"); return; } if (allAssignmentsByDate[newDate]) { alert(`日期 ${newDate} 已經存在作業資料，無法直接修改日期至此日。請手動遷移或刪除目標日期資料。`); return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; newMap[newDate] = newMap[oldDate].map(a => ({...a, assignmentDate: newDate})); delete newMap[oldDate]; return newMap; }); setSelectedDisplayDate(newDate); setAlertMessage(`[離線] 日期已修改為 ${newDate}`); return; } if (!db || !userId) return; setLoading(true); try { const batch = writeBatch(db); const assignments = allAssignmentsByDate[oldDate] || []; const path = getAssignmentCollectionPath(); if (assignments.length === 0) { setAlertMessage("該日期沒有作業資料可供移動。"); setLoading(false); return; } assignments.forEach(assignment => { const docRef = doc(db, path, assignment.id); batch.update(docRef, { assignmentDate: newDate }); }); await batch.commit(); setSelectedDisplayDate(newDate); setAlertMessage(`日期已成功從 ${oldDate} 修改為 ${newDate}`); } catch(e) { console.error("Error modifying date:", e); setAlertMessage("修改日期失敗，請檢查網路或權限。"); } finally { setLoading(false); } }, [authMode, selectedDisplayDate, allAssignmentsByDate, isOffline, db, userId]);
  const handleBatchDelete = useCallback(async (assignmentIds, successMessage, failureMessage) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足：只有老師可以執行批次刪除。"); return false; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].filter(a => !assignmentIds.includes(a.id)); }); return newMap; }); setAlertMessage(successMessage + " (離線)"); return true; } if (!db || !userId || assignmentIds.length === 0) return false; setLoading(true); try { const batch = writeBatch(db); const path = getAssignmentCollectionPath(); assignmentIds.forEach(id => { if (id) { const docRef = doc(db, path, id); batch.delete(docRef); } }); await batch.commit(); setAlertMessage(successMessage); return true; } catch (e) { console.error("Error during batch delete: ", e); setAlertMessage(failureMessage); return false; } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, authMode]);
  const handleDeleteStudentGlobalData = useCallback(async (studentId, studentName) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足。"); return; } if (isOffline) { setAllAssignmentsByDate(prev => { const newMap = { ...prev }; Object.keys(newMap).forEach(date => { newMap[date] = newMap[date].map(a => { const newStatus = { ...a.submissionStatus }; delete newStatus[studentId]; return { ...a, submissionStatus: newStatus }; }); }); return newMap; }); setAlertMessage(`[離線] 成功刪除 ${studentName} 的所有訂正紀錄。`); return; } if (!db || !userId) return; if (!window.confirm(`【極度危險】確定要永久刪除學生 ${studentName} (${studentId}) 在所有日期上的所有訂正紀錄嗎？此操作不可逆轉！`)) { return; } setLoading(true); try { const path = getAssignmentCollectionPath(); const assignmentCollection = collection(db, path); const snapshot = await getDocs(assignmentCollection); const batch = writeBatch(db); let updateCount = 0; snapshot.docs.forEach(doc => { const docRef = doc.ref; const data = doc.data(); const submissionStatus = data.submissionStatus || {}; if (submissionStatus.hasOwnProperty(studentId)) { const newSubmissionStatus = { ...submissionStatus }; delete newSubmissionStatus[studentId]; batch.set(docRef, { submissionStatus: newSubmissionStatus }, { merge: true }); updateCount++; } }); await batch.commit(); setAlertMessage(`成功刪除 ${studentName} 的所有訂正紀錄 (${updateCount} 筆作業文件受到影響)。`); } catch (e) { console.error("Error deleting student data:", e); setAlertMessage("刪除學生數據失敗，請檢查權限或連線。"); } finally { setLoading(false); } }, [db, userId, setAlertMessage, isOffline, authMode]);
  const showConfirmation = useCallback((type, data) => { if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足。"); return; } let title, message, confirmTitle, confirmColor; switch(type) { case 'DAILY': title = `🧨 確定刪除 ${selectedDisplayDate} 的所有紀錄嗎？`; message = `此操作將永久移除 ${selectedDisplayDate} 的所有 ${assignmentsForSelectedDate.length} 筆作業紀錄。刪除後不可恢復。`; confirmTitle = '日期'; confirmColor = 'bg-gray-900'; break; case 'MONTHLY': title = `💣 確認刪除 ${data.monthName} 的所有作業紀錄？`; message = `此操作將永久移除 ${data.monthName} 期間所有 ${data.count} 筆作業紀錄。請務必謹慎！`; confirmTitle = '月份'; confirmColor = 'bg-amber-800'; break; case 'SEMESTER': title = `☢️ 極度危險：確認刪除 ${data.semName} 的所有資料？`; message = `此操作將永久移除 ${data.semName} 期間所有 ${data.count} 筆紀錄。這是最高級別的刪除，數據將無法找回！`; confirmTitle = '學期'; confirmColor = 'bg-rose-500'; break; default: return; } setConfirmationModal({ title, message, confirmTitle, confirmColor, action: type, data }); }, [selectedDisplayDate, assignmentsForSelectedDate, authMode, isOffline]);
  const handleDeleteDateAssignments = useCallback(() => { if (assignmentsForSelectedDate.length === 0) { alert(`日期 ${selectedDisplayDate} 沒有任何作業紀錄可以刪除。`); return; } showConfirmation('DAILY', {}); }, [assignmentsForSelectedDate, selectedDisplayDate, showConfirmation]);
  const handleDeleteMonthAssignments = useCallback(() => { const monthName = months.find(m => m.id === selectedMonth)?.name || '該月'; const assignmentIdsToDelete = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = date.substring(5, 7); if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); } }); if (assignmentIdsToDelete.length === 0) { alert(`${monthName} 期間沒有找到作業紀錄可以刪除。`); return; } showConfirmation('MONTHLY', { monthName, count: assignmentIdsToDelete.length }); }, [allAssignmentsByDate, selectedMonth, months, showConfirmation]);
  const handleDeleteSemesterAssignments = useCallback(() => { const semesterData = semesters.find(s => s.id === selectedSemester); const semName = semesterData ? semesterData.name : '全部'; const assignmentIdsToDelete = []; const allDates = Object.keys(allAssignmentsByDate); allDates.forEach(date => { const dateMonth = parseInt(date.substring(5, 7), 10); const dateYear = parseInt(date.substring(0, 4), 10); let shouldDelete = false; if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { shouldDelete = true; } } else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { shouldDelete = true; } } if (shouldDelete) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); } }); if (assignmentIdsToDelete.length === 0) { alert(`${semName} 期間沒有找到作業紀錄可以刪除。`); return; } showConfirmation('SEMESTER', { semName, count: assignmentIdsToDelete.length }); }, [allAssignmentsByDate, selectedSemester, semesters, showConfirmation]);
  const executeDelete = useCallback(async () => { if (!confirmationModal) return; const { action, data } = confirmationModal; setConfirmationModal(null); let success = false; switch(action) { case 'DAILY': const assignmentIds = assignmentsForSelectedDate.map(a => a.id).filter(id => id); const name_daily = selectedDisplayDate; const count_daily = assignmentIds.length; success = await handleBatchDelete(assignmentIds, `成功刪除 ${name_daily} 的所有作業紀錄 (${count_daily} 筆)。`, "刪除該日作業失敗，請稍後再試。"); if (success) { const currentDates = availableDates.filter(d => d !== selectedDisplayDate); if (currentDates.length > 0) { setSelectedDisplayDate(currentDates[currentDates.length - 1]); } else { setSelectedDisplayDate(getTodayDate()); } } break; case 'MONTHLY': const monthName = months.find(m => m.id === selectedMonth)?.name || '該月'; const monthAssignmentIds = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = date.substring(5, 7); if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) monthAssignmentIds.push(assignment.id); }); } }); const monthCount = monthAssignmentIds.length; success = await handleBatchDelete(monthAssignmentIds, `成功刪除 ${monthName} 期間的 ${monthCount} 筆作業紀錄。`, "刪除月份作業失敗，請稍後再試。"); if (success) setSelectedDisplayDate(getTodayDate()); break; case 'SEMESTER': const semesterData = semesters.find(s => s.id === selectedSemester); const semName = semesterData ? semesterData.name : '全部'; const semAssignmentIds = []; Object.keys(allAssignmentsByDate).forEach(date => { const dateMonth = parseInt(date.substring(5, 7), 10); const dateYear = parseInt(date.substring(0, 4), 10); if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } } else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } } }); const semCount = semAssignmentIds.length; success = await handleBatchDelete(semAssignmentIds, `成功刪除 ${semName} 期間的 ${semCount} 筆作業紀錄。`, "刪除學期作業失敗，請稍後再試。"); if (success) setSelectedDisplayDate(getTodayDate()); break; default: break; } }, [confirmationModal, handleBatchDelete, assignmentsForSelectedDate, selectedDisplayDate, availableDates, allAssignmentsByDate, months, selectedMonth, semesters]);
  
  // --- [v20.0.1] 匯出資料 ---
  const handleExportData = useCallback(async () => { 
     if (!isOffline && (!db || !userId)) { setAlertMessage("請等待應用程式載入並登入後再匯出。"); return; } 
     setLoading(true); 
     try { 
         const exportObj = {
             version: 'v20.0.1',
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
 
  // --- [v20.0.1] 匯入資料 ---
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
   <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
     {/* --- [特效層] 慶祝動畫與銅幣特效 --- */}
     {rewardState && ( <RewardOverlay type={rewardState.type} onClose={() => setRewardState(null)} /> )}
     
     {/* --- [彈窗層] 各式功能視窗 --- */}
     {showBankModal && ( <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} setBankBalanceDirectly={setBankBalanceDirectly} authMode={authMode} students={students} /> )}
     {dashboardStudent && ( <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={() => setDashboardStudent(null)} /> )}
     {confirmationModal && ( <ConfirmationModal title={confirmationModal.title} message={confirmationModal.message} onConfirm={executeDelete} onCancel={() => setConfirmationModal(null)} confirmTitle={confirmationModal.confirmTitle} confirmColor={confirmationModal.confirmColor} /> )}
     
     {/* 未訂正視窗 (傳入 updateBankBalance 與 setRewardState 以支援批次發錢特效) */}
     {missingStudent && missingStudent.missingCount > 0 && ( <MissingDetailsModal student={students.find(s => s.id === missingStudent.id)} missingStats={studentMissingStats} onClose={() => setMissingStudent(null)} handleDeleteStudentGlobalData={handleDeleteStudentGlobalData} db={db} userId={userId} allAssignmentsByDate={allAssignmentsByDate} setAlertMessage={setAlertMessage} isOffline={isOffline} authMode={authMode} updateBankBalance={updateBankBalance} setRewardState={setRewardState} /> )}
     
     {showAllMissingModal && ( <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} /> )}
 
     <div className="bg-white shadow-xl w-full flex flex-col h-full">
       <header className="p-4 sm:p-6 text-center border-b border-gray-200 bg-white relative overflow-hidden shrink-0">
         {isOffline && ( <div className="absolute top-0 left-0 w-full bg-gray-800 text-white text-center py-2 text-xl font-bold tracking-wider z-10"> ⚠️ 目前為離線演示模式 (Guest Mode) </div> )}
          <button onClick={handleLogout} className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold transition z-20" title="登出系統"> <LogOut className="w-5 h-5" /> 登出 {authMode === 'ADMIN' ? '(老師)' : '(訪客)'} </button>
 
         {/* 🐻‍❄️ 熊貓標題 - 這是最重要的部分！ */}
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
               <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-3 border border-gray-300 rounded-lg font-semibold" disabled={isGlobalLoading} style={{ backgroundColor: months.find((m) => m.id === selectedMonth)?.color || 'white' }}>{filteredMonths.map((m) => ( <option key={m.id} value={m.id} style={{ backgroundColor: m.color }}>{m.name}</option>))}</select>
               
               <div className="flex items-center gap-3">
                   <button onClick={() => setShowBankModal(true)} className="px-5 py-3 text-3xl font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition duration-150 shadow-md flex items-center justify-center" disabled={isGlobalLoading}> <BookOpen className="h-6 w-6 mr-2" />訂正存簿 </button>
                   {authMode === 'ADMIN' && (
                       <button 
                           onClick={handleBatchSettlement} 
                           className={`px-5 py-3 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center ${dailySettlements[selectedDisplayDate]?.isSettled ? 'bg-gray-500 hover:bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700'}`} 
                           disabled={isGlobalLoading}
                           title={dailySettlements[selectedDisplayDate]?.isSettled ? "點擊以補發給新完成的學生" : "結算並發放銀幣給全對學生"}
                       > 
                           {dailySettlements[selectedDisplayDate]?.isSettled ? <><Lock className="h-6 w-6 mr-2" />已發布(可補發)</> : <><Megaphone className="h-6 w-6 mr-2" />結算發布</>}
                       </button>
                   )}
               </div>
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
