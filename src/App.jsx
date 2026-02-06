import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
 getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, query, Timestamp, getDocs, writeBatch, serverTimestamp, where, deleteField, getDoc
} from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  BookOpen, Download, Upload, X, Check, RefreshCw, WifiOff, LogOut, FileText, AlertCircle, Eye, Shield, User, Key, Edit, Pencil, Star, Coins, Eraser, Moon, PlusCircle, TrendingUp, Activity, BarChart2, Megaphone, Lock, Unlock, RotateCw
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ReferenceLine 
} from 'recharts';

// --- 版本資訊 (V20.0.41) ---
const VERSION = 'v20.0.41 - 表頭凍結'; 
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

// --- [V20.0.37] 自定義評價與等級邏輯 (整合用戶提供版本) ---
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

// --- [V20.0.37] Dashboard Modal ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('STATUS'); 
    if (!student) return null;
    const maskedName = student.name[0] + 'O' + student.name.slice(2);
    
    // 日期計算：防呆
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
        
        const isEmergency = maxDelayDays >= 3 || currentMissingCount >= 3;

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
// --- [Part 3] 學生存簿系統 & 獎勵特效 ---

const RewardOverlay = ({ type, onClose }) => {
    // GOLD_CLEAR 對應音效
    const soundUrl = type === 'GOLD_CLEAR' ? ASSETS.GOLD_SOUND : ASSETS.BRONZE_SOUND;
    const duration = type === 'GOLD_CLEAR' ? 6000 : 1000;

    useEffect(() => { const timer = setTimeout(() => { onClose(); }, duration); return () => clearTimeout(timer); }, [duration, onClose]);

    // GOLD_CLEAR 視覺特效
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

    // 普通補交畫面
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

// --- 學生存簿邏輯 Hook ---
const useStudentBank = (db, isAuthReady, isOffline, students) => {
    const [bankData, setBankData] = useState({});

    useEffect(() => {
        if (isOffline) {
            const initialData = {};
            students.forEach(s => initialData[s.id] = { gold: 0, silver: 0 });
            setBankData(initialData);
            return;
        }
        if (!isAuthReady || !db) return;
        const q = query(collection(db, getBankCollectionPath()));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = {};
            snapshot.forEach(doc => { data[doc.id] = doc.data(); });
            setBankData(data);
        });
        return () => unsubscribe();
    }, [isAuthReady, db, isOffline, students]);

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
            let current = { gold: 0, silver: 0, bronze: 0 };
            if (docSnap.exists()) current = docSnap.data();

            await setDoc(docRef, {
                gold: Math.max(0, (current.gold || 0) + goldChange),
                silver: Math.max(0, (current.silver || 0) + silverChange),
                bronze: Math.max(0, (current.bronze || 0) + bronzeChange),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Update bank balance failed:", e);
        }
    }, [db, isOffline]);

    const setBankBalanceDirectly = useCallback(async (studentId, type, value) => {
        if (isOffline) {
            setBankData(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], [type]: value }
            }));
            return;
        }
        if (!db) return;
        const docRef = doc(db, getBankCollectionPath(), studentId);
        await setDoc(docRef, { [type]: value }, { merge: true });
    }, [db, isOffline]);

    return { bankData, updateBankBalance, setBankBalanceDirectly, setBankData }; 
};

// --- [V20.0.35] 學生存簿介面 (維持 V20.0.30 的設計) ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, setBankBalanceDirectly, authMode, students }) => {
  const sortedStudents = [...students].sort((a, b) => { 
      const bankA = bankData[a.id] || { bronze: 0, silver: 0, gold: 0 }; 
      const bankB = bankData[b.id] || { bronze: 0, silver: 0, gold: 0 }; 
      if (bankA.gold !== bankB.gold) return bankB.gold - bankA.gold; 
      if (bankA.silver !== bankB.silver) return bankB.silver - bankA.silver; 
      if (bankA.bronze !== bankB.bronze) return bankB.bronze - bankA.bronze; 
      return parseInt(a.id) - parseInt(b.id); 
  });

  const handleInputChange = (studentId, type, value) => {
    if (authMode !== 'ADMIN') return;
    if (value === '') { setBankBalanceDirectly(studentId, type, 0); return; }
    const numVal = parseInt(value, 10);
    if (!isNaN(numVal) && numVal >= 0) { setBankBalanceDirectly(studentId, type, numVal); }
  };

  const handleResetAll = async (studentId) => {
      if (authMode !== 'ADMIN') return;
      if (!window.confirm(`確定要將學生 ${studentId} 的【所有資產】歸零嗎？`)) return;
      setBankBalanceDirectly(studentId, 'gold', 0);
      setBankBalanceDirectly(studentId, 'silver', 0);
      setBankBalanceDirectly(studentId, 'bronze', 0);
  };

  const handleExchange = (studentId, type) => {
      const bal = bankData[studentId] || { gold: 0, silver: 0, bronze: 0 };
      if (type === 'B2S') {
          // 100 銅換 1 銀
          if ((bal.bronze || 0) >= 100) {
              onUpdateBalance(studentId, 0, 1, -100);
          } else {
              alert("銅幣不足 100，無法兌換！");
          }
      } else if (type === 'S2G') {
          // 10 銀換 1 金
          if ((bal.silver || 0) >= 10) {
              onUpdateBalance(studentId, 1, -10, 0);
          } else {
              alert("銀幣不足 10，無法兌換！");
          }
      }
  };

  const handleResetClass = () => {
      if (authMode !== 'ADMIN') return;
      if(!window.confirm("⚠️ 危險操作：確定要將「全班所有人的錢」全部歸零嗎？\n此操作無法復原！")) return;
      if(!window.confirm("再次確認：您真的要歸零全班嗎？")) return;
      students.forEach(s => {
          setBankBalanceDirectly(s.id, 'gold', 0);
          setBankBalanceDirectly(s.id, 'silver', 0);
          setBankBalanceDirectly(s.id, 'bronze', 0);
      });
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-[10000] p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-4 border-orange-400 transition-colors duration-300`}>
        
        {/* Header */}
        <div className="bg-gray-100 p-4 border-b flex justify-between items-center shrink-0">
          <div className="text-3xl font-bold text-gray-700 flex items-center gap-2">
            <span className="text-4xl">💰</span> 訂正存簿
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X className="w-8 h-8" /></button>
        </div>

        <div className={`flex-1 overflow-auto p-4 bg-orange-50`}>
          <table className="w-full bg-white shadow-sm rounded-lg border border-gray-200 relative">
            <thead className="bg-gray-100 sticky top-0 z-[100] shadow-md">
               <tr className="border-b-2 border-gray-300">
                 <th className="p-3 text-2xl w-20 text-center bg-gray-100">名次</th>
                 <th className="p-3 text-2xl w-24 text-center bg-gray-100">座號</th>
                 <th className="p-3 text-2xl text-left bg-gray-100">姓名</th>
                 <th className="p-3 text-2xl w-32 bg-yellow-50 text-yellow-700 text-center border-l border-gray-200">金幣</th>
                 <th className="p-3 text-2xl w-32 bg-gray-50 text-gray-700 text-center border-l border-gray-200">銀幣</th>
                 <th className="p-3 text-2xl w-32 bg-orange-50 text-orange-700 text-center border-l border-gray-200">銅幣</th>
                 
                 {/* [操作欄] 對所有人開放標題 */}
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
                     <td className="p-3 text-center text-3xl font-black text-gray-500">{rankIcon}</td>
                     <td className="p-3 text-center text-2xl font-bold text-gray-600">{student.id}</td>
                     <td className="p-3 text-2xl font-bold text-gray-800">{student.name[0] + 'O' + student.name.slice(2)}</td>
                     
                     <td className="p-2 text-center bg-yellow-50/30 border-l border-gray-100 group-hover:border-blue-100">
                       <input type="number" value={bal.gold || 0} onChange={(e)=>handleInputChange(student.id, 'gold', e.target.value)} disabled={authMode!=='ADMIN'} 
                         className="w-24 text-center text-3xl font-bold text-yellow-600 bg-transparent border-b-2 border-transparent focus:border-yellow-500 outline-none hover:bg-white/50 rounded" />
                     </td>
                     <td className="p-2 text-center bg-gray-50/30 border-l border-gray-100 group-hover:border-blue-100">
                       <input type="number" value={bal.silver || 0} onChange={(e)=>handleInputChange(student.id, 'silver', e.target.value)} disabled={authMode!=='ADMIN'} 
                         className="w-24 text-center text-3xl font-bold text-gray-600 bg-transparent border-b-2 border-transparent focus:border-gray-500 outline-none hover:bg-white/50 rounded" />
                     </td>
                     <td className="p-2 text-center bg-orange-50/30 border-l border-gray-100 group-hover:border-blue-100">
                       <input type="number" value={bal.bronze || 0} onChange={(e)=>handleInputChange(student.id, 'bronze', e.target.value)} disabled={authMode!=='ADMIN'} 
                         className="w-24 text-center text-3xl font-bold text-orange-700 bg-transparent border-b-2 border-transparent focus:border-orange-500 outline-none hover:bg-white/50 rounded" />
                     </td>
 
                     <td className="p-2 flex justify-center items-center gap-2 border-l border-gray-100 group-hover:border-blue-100">
                         {/* 兌換按鈕 (簡化圖示，所有人可見) */}
                         <div className="flex gap-2">
                            {/* 100銅換1銀 */}
                            <button onClick={() => handleExchange(student.id, 'B2S')} className="w-12 h-12 rounded-full shadow-md flex items-center justify-center bg-gray-200 hover:bg-gray-300 border-2 border-gray-400 text-gray-700 active:scale-95 transition" title="100銅 換 1銀"><RotateCw className="w-7 h-7"/></button>
                            {/* 10銀換1金 */}
                            <button onClick={() => handleExchange(student.id, 'S2G')} className="w-12 h-12 rounded-full shadow-md flex items-center justify-center bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-400 text-yellow-700 active:scale-95 transition" title="10銀 換 1金"><RotateCw className="w-7 h-7"/></button>
                         </div>

                         {/* 增減按鈕與歸零 (僅管理員可見) */}
                         {authMode === 'ADMIN' && (
                             <>
                                <div className="w-[2px] h-10 bg-gray-300 mx-2"></div>
                                {/* 按鈕不縮小，維持大尺寸 */}
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
                  <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-wide">五年甲班作業表</h1> 
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

const AllMissingAssignmentsModal = ({ missingStats, onClose }) => { 
    const studentsWithMissing = missingStats.filter(s => s.missingCount > 0); 
    return ( 
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4"> 
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200"> 
                <div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="text-4xl font-bold text-gray-800 flex items-center"><AlertCircle className="w-10 h-10 text-red-500 mr-3" />全班未完成作業總表</h3><button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200"><X className="w-8 h-8" /></button></div> 
                <div className="flex-1 overflow-auto"> 
                    {studentsWithMissing.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400"><Check className="w-24 h-24 mb-4 text-green-400" /><p className="text-4xl font-bold text-green-600">太棒了！目前全班皆已完成所有作業。</p></div>) : ( 
                        <table className="min-w-full divide-y divide-gray-300"> 
                            <thead className="bg-gray-100 sticky top-0 z-10"><tr><th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-24 text-center border-r border-gray-300">座號</th><th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-32 text-center border-r border-gray-300">姓名</th><th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-32 text-center border-r border-gray-300">缺交數</th><th className="px-6 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider text-left">未完成項目明細 (依作業名稱排序)</th></tr></thead> 
                            <tbody className="bg-white divide-y divide-gray-200">{studentsWithMissing.map((student) => (<tr key={student.id} className="hover:bg-red-50 transition duration-100"><td className="px-4 py-4 text-2xl text-gray-900 font-medium text-center border-r border-gray-200">{student.id}</td><td className="px-4 py-4 text-2xl text-gray-900 font-bold text-center border-r border-gray-200">{student.name[0] + 'O' + student.name.slice(2)}</td><td className="px-4 py-4 text-center border-r border-gray-200"><span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-2xl">{student.missingCount}</span></td><td className="px-6 py-4 text-xl text-gray-700"><ul className="list-disc list-inside space-y-1">{[...student.missingDetails].sort((a, b) => a.assignment.localeCompare(b.assignment, 'zh-TW')).map((detail, idx) => (<li key={idx} className="flex items-start"><span className="text-red-600 font-bold text-xl mr-2">{detail.assignment}</span><span className="font-mono font-medium text-gray-400 text-lg">[{new Date(detail.date).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})}]</span></li>))}</ul></td></tr>))}</tbody> 
                        </table> 
                    )} 
                </div> 
                <div className="mt-4 pt-4 border-t border-gray-200 text-right"><button onClick={onClose} className="bg-gray-800 text-white py-3 px-8 rounded-xl hover:bg-gray-900 transition text-2xl font-bold">關閉視窗</button></div> 
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
    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-xl shadow-xl border border-gray-200 max-w-full">
            <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center"><span className="text-5xl mr-3">📊</span><span className="text-4xl">每月繳交狀況統計</span></h2>
            <div className="w-full relative border border-gray-300 rounded-lg shadow-lg">
                <table className="w-full divide-y divide-gray-300 table-fixed">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="sticky top-0 z-[60] px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-700 w-24 border-r border-gray-300 bg-gray-200 shadow-sm">姓名</th>
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
                                <tr key={studentId} className="hover:bg-gray-50 transition duration-100">
                                    <td className="px-2 py-4 text-3xl font-semibold text-gray-900 border-r border-gray-300 text-center whitespace-nowrap">{studentData.studentName[0] + 'O' + studentData.studentName.slice(2)}</td>
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

// --- [V20.0.38 Fix] 補回 MissingDetailsModal 與其他輔助元件 (Z-Index修正版) ---
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
    
    // [V20.0.38 Fix] 將 z-50 改為 z-[10000] 以確保蓋過表格標題
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
  
  const { students, loadingStudents } = useStudents(db, isOffline);
  const { bankData, updateBankBalance, setBankBalanceDirectly, setBankData } = useStudentBank(db, isAuthReady, isOffline, students);
  const dailySettlements = useDailySettlements(db, isAuthReady, isOffline);
  const { categories, loadingCategories, addCategory, deleteCategory, editCategory, moveCategory, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students);

  const { defaultSemester, defaultMonth } = useMemo(() => { const today = new Date(); const m = today.getMonth() + 1; const monthStr = String(m).padStart(2, '0'); let sem = 'S1'; if (m >= 2 && m <= 7) { sem = 'S2'; } return { defaultSemester: sem, defaultMonth: monthStr }; }, []);
  const [selectedSemester, setSelectedSemester] = useState(defaultSemester); const [selectedMonth, setSelectedMonth] = useState(defaultMonth); const [unlockClicks, setUnlockClicks] = useState({});
  const academicYear = "114"; const startYear = 2025; const endYear = 2026;
  const semesters = [ { id: 'S1', name: `上學期 (${startYear}/8 - ${endYear}/1)`, startMonth: '08', endMonth: '01', startYear: startYear, endYear: endYear }, { id: 'S2', name: `下學期 (${endYear}/2 - ${endYear}/7)`, startMonth: '02', endMonth: '07', startYear: endYear, endYear: endYear }, ];
  const months = useMemo(() => [ { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' }, { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' }, { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' }, { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' }, { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' }, { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' }, { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' }, { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' }, ], []);

  useEffect(() => { const timer = setTimeout(() => { if (loading) setAuthTimeout(true); }, 3000); if (!firebaseConfig) { console.error("Firebase configuration is missing."); setError("無法載入 Firebase 設定。請檢查環境配置。"); setLoading(false); return; } try { const app = initializeApp(firebaseConfig); const firestore = getFirestore(app); const firebaseAuth = getAuth(app); setDb(firestore); setAuth(firebaseAuth); const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => { if (user) { setUserId(user.uid); setIsAuthReady(true); setIsAuthenticated(true); if (user.isAnonymous) { setAuthMode('GUEST'); } else { setAuthMode('ADMIN'); } } else { setIsAuthenticated(false); setAuthMode('GUEST'); } setLoadingLogin(false); }); return () => { unsubscribe(); clearTimeout(timer); }; } catch (e) { console.error("Firebase initialization failed:", e); setError("初始化失敗：" + e.message); setLoading(false); } }, []);

  const handleGoOffline = () => { setIsOffline(true); setUserId('guest_user'); setIsAuthReady(true); setLoading(false); setIsAuthenticated(true); setAuthMode('GUEST'); };
  const handleAdminLogin = async (email, password) => { setLoadingLogin(true); setLoginError(''); try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { console.error("Login failed", error); if (error.code === 'auth/invalid-email') { setLoginError('Email 格式不正確'); } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { setLoginError('帳號或密碼錯誤'); } else if (error.code === 'auth/too-many-requests') { setLoginError('嘗試次數過多，請稍後再試'); } else { setLoginError('登入失敗：' + error.message); } setLoadingLogin(false); } };
  const handleGuestLogin = async () => { setLoadingLogin(true); setLoginError(''); try { await signInAnonymously(auth); } catch (error) { console.error("Anonymous login failed", error); setLoginError('訪客登入失敗，請稍後再試。'); setLoadingLogin(false); } };
  const handleLogout = async () => { try { await signOut(auth); setIsAuthenticated(false); setAuthMode('GUEST'); } catch (e) { console.error("Logout failed", e); } };

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

  const studentMissingStats = useMemo(() => { const stats = students.map(student => ({ id: student.id, name: student.name, missingCount: 0, missingDetails: [] })); Object.keys(allAssignmentsByDate).forEach(date => { const assignmentsOnDate = allAssignmentsByDate[date] || []; assignmentsOnDate.forEach(assignment => { const submissionStatus = assignment.submissionStatus || {}; students.forEach((student, index) => { if (submissionStatus[student.id] === false) { stats[index].missingCount += 1; stats[index].missingDetails.push({ date: date, assignment: assignment.assignmentName }); } }); }); }); stats.sort((a, b) => b.missingCount - a.missingCount); return stats; }, [allAssignmentsByDate, students]);
  const monthlyStudentStats = useMemo(() => { const stats = {}; students.forEach(student => { stats[student.id] = { studentName: student.name, monthStats: {} }; months.forEach(month => { stats[student.id].monthStats[month.id] = { daysCompleted: 0, daysLate: 0, daysMissing: 0, totalDays: 0 }; }); }); Object.keys(allAssignmentsByDate).forEach(date => { const monthId = date.substring(5, 7); const assignmentsOnDate = allAssignmentsByDate[date] || []; if (assignmentsOnDate.length === 0) return; students.forEach(student => { if (stats[student.id].monthStats[monthId]) { let worstStatusOfDay = 'true'; for (const assignment of assignmentsOnDate) { const status = assignment.submissionStatus[student.id]; if (status === false) { worstStatusOfDay = 'false'; break; } if (status === 'late') { worstStatusOfDay = 'late'; } } stats[student.id].monthStats[monthId].totalDays++; if (worstStatusOfDay === 'false') { stats[student.id].monthStats[monthId].daysMissing++; } else if (worstStatusOfDay === 'late') { stats[student.id].monthStats[monthId].daysLate++; } else { stats[student.id].monthStats[monthId].daysCompleted++; } } }); }); return stats; }, [allAssignmentsByDate, months, students]);
  
  const handleNewAssignmentDateChange = (e) => { setNewAssignmentDate(e.target.value); };
  
  const handleAddNewDate = useCallback(async () => {
      if (!newAssignmentDate) return;
      if (allAssignmentsByDate[newAssignmentDate]) { alert("該日期已存在，請直接在上方選擇。"); return; }
      
      const d = new Date(newAssignmentDate);
      const m = d.getMonth() + 1;
      const targetMonth = String(m).padStart(2, '0');
      let targetSemester = 'S1';
      if (m >= 2 && m <= 7) targetSemester = 'S2';
      
      setSelectedSemester(targetSemester);
      setSelectedMonth(targetMonth);
      
      setLoading(true);

      const assignmentsToCreate = categories.map(cat => ({
          assignmentName: cat.name,
          order: cat.order,
          assignmentDate: newAssignmentDate,
          submissionStatus: getInitialSubmissionStatus,
          makeupClaimed: {},
          createdAt: serverTimestamp() 
      }));

      if (isOffline) { 
          const newOfflineAssignments = assignmentsToCreate.map((a, idx) => ({
              ...a,
              id: `offline-auto-${Date.now()}-${idx}`,
              createdAt: new Date().toISOString()
          }));
          setAllAssignmentsByDate(prev => {
              const prevData = { ...prev };
              prevData[newAssignmentDate] = newOfflineAssignments;
              return prevData;
          });
          setSelectedDisplayDate(newAssignmentDate); 
          setAlertMessage(`[離線] 已新增日期 ${newAssignmentDate} 並自動帶入 ${newOfflineAssignments.length} 項預設作業。`); 
          setLoading(false);
          return; 
      }

      try {
          const batch = writeBatch(db);
          const path = getAssignmentCollectionPath();
          assignmentsToCreate.forEach(assignData => {
              const newDocRef = doc(collection(db, path));
              batch.set(newDocRef, assignData);
          });
          await batch.commit();
          setSelectedDisplayDate(newAssignmentDate); 
          setAlertMessage(`已新增日期 ${newAssignmentDate} 並自動帶入 ${assignmentsToCreate.length} 項預設作業。`);
      } catch (e) {
          console.error("Error auto-populating assignments:", e);
          setAlertMessage("新增日期成功，但自動帶入作業失敗，請手動新增。");
          setSelectedDisplayDate(newAssignmentDate);
      } finally {
          setLoading(false);
      }
  }, [newAssignmentDate, allAssignmentsByDate, isOffline, categories, getInitialSubmissionStatus, db, userId]);

  // [V20.0.35] 新增作業 (修正排序 + 確保順序)
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

  // [V20.0.35] 拖曳排序優化 (過濾空值，避免 undefined)
  const handleMoveAssignment = useCallback(async (dragId, hoverId) => {
      const items = [...assignmentsForSelectedDate]; 
      const dragIndex = items.findIndex(i => i.id === dragId); 
      const hoverIndex = items.findIndex(i => i.id === hoverId); 
      if (dragIndex === -1 || hoverIndex === -1) return;
      
      const dragItem = items[dragIndex]; 
      
      const newItems = [...items]; 
      newItems.splice(dragIndex, 1); 
      newItems.splice(hoverIndex, 0, dragItem); 
      
      // [關鍵] 加入 filter(i => i) 防止產生 empty slot
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

  // --- [V20.0.35] 燈號切換邏輯 (維持 V20.0.30 嚴格計分 + 3-Click) ---
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
          // 黃變紅：反悔扣分
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
     {showBankModal && ( <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} setBankBalanceDirectly={setBankBalanceDirectly} authMode={authMode} students={students} /> )}
     {dashboardStudent && ( <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={() => setDashboardStudent(null)} /> )}
     {confirmationModal && ( <ConfirmationModal title={confirmationModal.title} message={confirmationModal.message} onConfirm={executeDelete} onCancel={() => setConfirmationModal(null)} confirmTitle={confirmationModal.confirmTitle} confirmColor={confirmationModal.confirmColor} /> )}
     
     {/* 未訂正視窗 (Z-Index Fix 已於 Part 3 修正) */}
     {missingStudent && missingStudent.missingCount > 0 && ( <MissingDetailsModal student={students.find(s => s.id === missingStudent.id)} missingStats={studentMissingStats} onClose={() => setMissingStudent(null)} handleDeleteStudentGlobalData={handleDeleteStudentGlobalData} db={db} userId={userId} allAssignmentsByDate={allAssignmentsByDate} setAlertMessage={setAlertMessage} isOffline={isOffline} authMode={authMode} updateBankBalance={updateBankBalance} setRewardState={setRewardState} /> )}
     
     {showAllMissingModal && ( <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} /> )}
 
     <div className="bg-white shadow-xl w-full flex flex-col h-full">
       <header className="p-4 sm:p-6 text-center border-b border-gray-200 bg-white relative overflow-hidden shrink-0">
         {isOffline && ( <div className="absolute top-0 left-0 w-full bg-gray-800 text-white text-center py-2 text-xl font-bold tracking-wider z-10"> ⚠️ 目前為離線演示模式 (Guest Mode) </div> )}
          <button onClick={handleLogout} className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold transition z-20" title="登出系統"> <LogOut className="w-5 h-5" /> 登出 {authMode === 'ADMIN' ? '(老師)' : '(訪客)'} </button>
 
         {/* 🐻‍❄️ 熊貓標題 */}
         <div className={`flex items-center justify-center text-5xl font-extrabold text-gray-900 mb-2 ${isOffline ? 'mt-8' : ''}`}><span className="text-orange-500 text-6xl mr-3">🐻‍❄️</span><span className="text-5xl">五年甲班訂正作業表</span><span className="text-green-600 text-6xl ml-3">🐼</span></div>
         <p className="text-3xl text-gray-600 mb-4"> {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long' })}</p>
         <p className={`absolute right-4 text-xl text-gray-500 font-bold z-30 transition-all ${authMode === 'ADMIN' ? 'top-20' : 'top-4'}`}> 版本: {VERSION}</p>
       </header>
       {alertMessage && ( <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} /> )}
       
       <div className="flex-1 overflow-x-hidden bg-gray-50 p-4 relative flex flex-col">
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
           
           <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 shrink-0">
               {displayedDates.map(date => ( <DateTab key={date} date={date} isSelected={date === selectedDisplayDate} onClick={setSelectedDisplayDate} onEdit={() => handleEditCurrentDate(date)} authMode={authMode} /> ))}
           </div>
           
           <div className="flex flex-wrap items-center gap-2 mb-6 shrink-0">
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
           
           {/* [V20.0.42 Fix] 表格容器強制鎖定寬度 (max-w-[100vw])，內部允許 overflow-auto */}
           <div className={`w-full max-w-[100vw] relative border border-gray-300 rounded-lg shadow-xl overflow-auto h-[85vh] min-h-[500px] mb-8 bg-white`}> 
               {/* 移除 inline-block，改用 div 讓 table 自然撐開但被父層級截斷產生卷軸 */}
               <div className="min-w-full">
                   {assignmentsForSelectedDate.length > 0 && selectedDisplayDate !== '' && (
                        <table className="divide-y divide-gray-300 min-w-full w-max">
                           <thead className="bg-gray-100 sticky top-0 z-40">
                               <tr>
                                   {/* [V20.0.40] 凍結座號：sticky left-0, bg-gray-100 (不透明), z-50 (最高) */}
                                   <th className="px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 border-r border-gray-300 sticky left-0 top-0 z-50 bg-gray-100 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '100px', width: '100px', maxWidth: '100px' }}>座號</th>
                                   {/* [V20.0.42] 凍結姓名：sticky left-[100px], bg-gray-100, z-50 + 強制右側邊框陰影 */}
                                   <th className="px-2 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 sticky top-0 left-[100px] z-50 bg-gray-100 text-center shadow-[4px_0_10px_-2px_rgba(0,0,0,0.3)] border-r-4 border-gray-300" style={{ minWidth: '128px', width: '128px', maxWidth: '128px' }}>姓名</th>
                                   {assignmentsForSelectedDate.map((assignment) => (
                                       <AssignmentHeader key={assignment.id} assignment={assignment} isGlobalLoading={isGlobalLoading} handleDeleteAssignment={handleDeleteAssignment} handleEditSave={handleEditAssignmentName} handleMoveAssignment={handleMoveAssignment} setEditingAssignmentId={setEditingAssignmentId} setEditingAssignmentName={setEditingAssignmentName} editingAssignmentId={editingAssignmentId} editingAssignmentName={editingAssignmentName} authMode={authMode} />
                                   ))}
                               </tr>
                           </thead>
                           <tbody className={`divide-y divide-gray-200 ${focusedStudentId ? 'bg-blue-50' : 'bg-white'}`}>
                               {(focusedStudentId ? students.filter(s => s.id === focusedStudentId) : students).map((student) => (
                                   <tr key={student.id} className={`group ${focusedStudentId ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                                           {/* [V20.0.40] 凍結座號Body：sticky left-0, bg-white (關鍵！不透明背景) */}
                                           <td onClick={() => setDashboardStudent(student)} className="px-2 py-4 text-3xl whitespace-normal font-medium text-gray-900 border-r border-gray-300 sticky left-0 z-30 bg-white text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer group-hover:text-blue-600 group-hover:bg-blue-100 break-words align-middle transition-colors" title="點擊查看學習歷程" style={{ minWidth: '100px', width: '100px', maxWidth: '100px' }}>
                                               {student.id}
                                           </td>
                                           {/* [V20.0.42] 凍結姓名Body：sticky left-[100px], bg-white + 強制右側邊框 */}
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
