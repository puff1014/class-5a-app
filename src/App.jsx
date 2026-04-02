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
  BookOpen, Download, Upload, X, Check, RefreshCw, WifiOff, LogOut, FileText, AlertCircle, Eye, Shield, User, Key, Edit, Pencil, Star, Coins, Eraser, Moon, PlusCircle, TrendingUp, Activity, BarChart2, Megaphone, Lock, Unlock, RotateCw, Printer, BellRing, Type, Minus, Plus, DownloadCloud
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ReferenceLine 
} from 'recharts';

// --- 版本資訊 (V20.0.49) ---
const VERSION = 'v20.0.49 - 引擎完全體'; 
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

// === [NEW] 任務載入引擎組件 (微創植入) ===
const TaskLoaderModal = ({ db, initialDate, onConfirm, onClose }) => {
    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date(initialDate);
        const day = d.getDay();
        const diff = (day === 1) ? 3 : 1; 
        d.setDate(d.getDate() - diff);
        return d.toISOString().split('T')[0];
    });
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "announcements", targetDate);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const rawItems = docSnap.data().items || [];
                const filtered = rawItems
                    .filter(item => {
                        const txt = typeof item === 'string' ? item : item.text;
                        return txt && !txt.startsWith('※') && !txt.startsWith(' ');
                    })
                    .map((item, idx) => ({
                        id: idx,
                        text: typeof item === 'string' ? item.trim() : item.text.trim(),
                        selected: true
                    }));
                setTasks(filtered);
                if(filtered.length === 0) alert("該日期無符合條件的任務項目。");
            } else {
                alert("找不到該日期的航海日誌資料。");
                setTasks([]);
            }
        } catch (e) {
            console.error(e);
            alert("抓取資料失敗。");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100005] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border-8 border-blue-100">
                <div className="p-8 border-b-4 border-blue-50">
                    <h3 className="text-4xl font-black text-blue-900 mb-6 flex items-center gap-3">📥 載入航海日誌任務</h3>
                    <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-2xl">
                        <label className="text-2xl font-bold text-blue-700 whitespace-nowrap">來源日期：</label>
                        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="flex-1 p-2 text-2xl rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none" />
                        <button onClick={fetchTasks} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-2xl font-black hover:bg-blue-700 active:scale-95 transition-all">抓取</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 max-h-[50vh]">
                    {tasks.length > 0 ? (
                        <div className="space-y-4">
                            <p className="text-gray-500 font-bold">請修改精簡標題（勾選代表載入）：</p>
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border-2 border-gray-100">
                                    <input type="checkbox" checked={task.selected} onChange={e => setTasks(tasks.map(t => t.id === task.id ? {...t, selected: e.target.checked} : t))} className="w-8 h-8 cursor-pointer" />
                                    <input type="text" value={task.text} onChange={e => setTasks(tasks.map(t => t.id === task.id ? {...t, text: e.target.value} : t))} className="flex-1 p-2 text-2xl font-bold rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-2xl font-bold italic">尚未抓取任務或該日無任務</div>
                    )}
                </div>
                <div className="p-8 border-t-4 border-blue-50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-2xl font-black hover:bg-gray-200 transition-all">取消</button>
                    <button onClick={() => onConfirm(tasks.filter(t => t.selected && t.text.trim()))} disabled={tasks.length === 0} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-2xl font-black hover:bg-emerald-600 transition-all active:scale-95 shadow-lg disabled:bg-gray-300">確認注入作業表</button>
                </div>
            </div>
        </div>
    );
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
                    if (completedAt) { const daysLateVal = getDaysDiff(date, completedAt); tScore = Math.max(0, 100 - (daysLateVal * 5)); } 
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
// --- [V20.0.43] 學生存簿介面 ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, setBankBalanceDirectly, authMode, students }) => {
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => { 
        const bankA = bankData[a.id] || { bronze: 0, silver: 0, gold: 0 }; 
        const bankB = bankData[b.id] || { bronze: 0, silver: 0, gold: 0 }; 
        if (bankA.gold !== bankB.gold) return bankB.gold - bankA.gold; 
        if (bankA.silver !== bankB.silver) return bankB.silver - bankA.silver; 
        if (bankA.bronze !== bankB.bronze) return bankB.bronze - bankA.bronze; 
        return parseInt(a.id) - parseInt(b.id); 
    });
  }, [bankData, students]); 

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
          setBankBalanceDirectly(s.id, 'gold', 0);
          setBankBalanceDirectly(s.id, 'silver', 0);
          setBankBalanceDirectly(s.id, 'bronze', 0);
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

        <div className={`flex-1 overflow-auto p-4 bg-orange-50`}>
          <table className="w-full bg-white shadow-sm rounded-lg border border-gray-200 relative border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-[150] shadow-md">
                <tr className="border-b-2 border-gray-300">
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
                      <td className="p-3 text-center text-3xl font-black text-gray-400 sticky left-0 bg-white group-hover:bg-blue-50 z-10">{rankIcon}</td>
                      <td className="p-3 text-center text-2xl font-bold text-gray-600 sticky left-[80px] bg-white group-hover:bg-blue-50 z-10">{student.id}</td>
                      <td className="p-3 text-2xl font-bold text-gray-800 sticky left-[176px] bg-white group-hover:bg-blue-50 z-10 border-r-2 border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{student.name[0] + 'O' + student.name.slice(2)}</td>
                      <td className="p-2 text-center bg-yellow-50/30">
                        <input type="number" value={bal.gold || 0} onChange={(e)=>handleInputChange(student.id, 'gold', e.target.value)} disabled={authMode!=='ADMIN'} 
                          className="w-24 text-center text-3xl font-bold text-yellow-600 bg-transparent border-b-2 border-transparent focus:border-yellow-500 outline-none rounded" />
                      </td>
                      <td className="p-2 text-center bg-gray-50/30 border-l border-gray-100">
                        <input type="number" value={bal.silver || 0} onChange={(e)=>handleInputChange(student.id, 'silver', e.target.value)} disabled={authMode!=='ADMIN'} 
                          className="w-24 text-center text-3xl font-bold text-gray-600 bg-transparent border-b-2 border-transparent focus:border-gray-500 outline-none rounded" />
                      </td>
                      <td className="p-2 text-center bg-orange-50/30 border-l border-gray-100">
                        <input type="number" value={bal.bronze || 0} onChange={(e)=>handleInputChange(student.id, 'bronze', e.target.value)} disabled={authMode!=='ADMIN'} 
                          className="w-24 text-center text-3xl font-bold text-orange-700 bg-transparent border-b-2 border-transparent focus:border-orange-500 outline-none rounded" />
                      </td>
                      <td className="p-2 flex justify-center items-center gap-2 border-l border-gray-100">
                          <div className="flex gap-2">
                            <button onClick={() => handleExchange(student.id, 'B2S')} className="w-12 h-12 rounded-full shadow-md flex items-center justify-center bg-gray-200 hover:bg-gray-300 border-2 border-gray-400 active:scale-95 transition" title="100銅換1銀"><RotateCw className="w-7 h-7"/></button>
                            <button onClick={() => handleExchange(student.id, 'S2G')} className="w-12 h-12 rounded-full shadow-md flex items-center justify-center bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-400 active:scale-95 transition" title="10銀換1金"><RotateCw className="w-7 h-7"/></button>
                          </div>
                          {authMode === 'ADMIN' && (
                              <>
                                <div className="w-[2px] h-10 bg-gray-300 mx-2"></div>
                                <button onClick={() => onUpdateBalance(student.id, 0, 0, 10)} className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-black text-3xl flex items-center justify-center shadow-sm">+</button>
                                <button onClick={() => onUpdateBalance(student.id, 0, 0, -10)} className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 font-black text-3xl flex items-center justify-center shadow-sm">-</button>
                                <button onClick={() => handleResetAll(student.id)} className="p-2 ml-2 bg-red-100 text-red-600 rounded-lg shadow-sm" title="單人歸零"><Eraser className="w-7 h-7"/></button>
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

// --- Hook 與 輔助彈窗 ---
const useDailySettlements = (db, isAuthReady, isOffline) => {
    const [settlements, setSettlements] = useState({}); 
    useEffect(() => {
        if (isOffline || !isAuthReady || !db) return;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4"> 
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform scale-100"> 
            <h3 className="text-4xl font-semibold text-gray-800 mb-4">通知</h3> 
            <p className="text-3xl text-gray-600 mb-6 whitespace-pre-wrap">{message}</p> 
            <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium text-4xl">確定</button> 
        </div> 
    </div> 
);

const AllMissingAssignmentsModal = ({ missingStats, onClose }) => { 
    const studentsWithMissing = missingStats.filter(s => s.missingCount > 0); 
    return ( 
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4 print:p-0 print:block print:bg-white print:absolute print:inset-0"> 
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200 print:hidden"> 
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-4xl font-bold text-gray-800 flex items-center">
                        <AlertCircle className="w-10 h-10 text-red-500 mr-3" />全班未完成作業總表
                    </h3>
                    <div className="flex gap-3">
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-xl font-bold transition shadow-sm">
                            <Printer className="w-6 h-6"/> 列印總表
                        </button>
                        <button onClick={onClose} className="text-gray-500 p-2 rounded-full bg-gray-100"><X className="w-8 h-8" /></button>
                    </div>
                </div> 
                <div className="flex-1 overflow-auto"> 
                    <table className="min-w-full divide-y divide-gray-300"> 
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-4 text-2xl font-bold text-gray-700 w-24 text-center border-r">座號</th>
                                <th className="px-4 py-4 text-2xl font-bold text-gray-700 w-32 text-center border-r">姓名</th>
                                <th className="px-4 py-4 text-2xl font-bold text-gray-700 w-32 text-center border-r">缺交數</th>
                                <th className="px-6 py-4 text-2xl font-bold text-gray-700 text-left">未完成項目明細</th>
                            </tr>
                        </thead> 
                        <tbody className="bg-white divide-y divide-gray-200">
                            {studentsWithMissing.map((student) => (
                                <tr key={student.id} className="hover:bg-red-50 transition duration-100">
                                    <td className="px-4 py-4 text-2xl text-center border-r">{student.id}</td>
                                    <td className="px-4 py-4 text-2xl font-bold text-center border-r">{student.name[0] + 'O' + student.name.slice(2)}</td>
                                    <td className="px-4 py-4 text-center border-r"><span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-2xl">{student.missingCount}</span></td>
                                    <td className="px-6 py-4 text-xl">
                                        <ul className="list-disc list-inside space-y-1">
                                            {student.missingDetails.map((detail, idx) => (
                                                <li key={idx} className="flex items-start">
                                                    <span className="text-red-600 font-bold text-xl mr-2">{detail.assignment}</span>
                                                    <span className="text-gray-400 text-lg">({detail.date.substring(5)})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            ))}
                        </tbody> 
                    </table> 
                </div> 
                <div className="mt-4 pt-4 border-t text-right">
                    <button onClick={onClose} className="bg-gray-800 text-white py-3 px-8 rounded-xl text-2xl font-bold">關閉視窗</button>
                </div> 
            </div> 

            {/* --- [列印專用區] --- */}
            <div className="hidden print:block w-full h-full bg-white text-black p-4">
                <h1 className="text-4xl font-extrabold text-center mb-6 border-b-4 border-black pb-4">五年甲班 未完成作業待補單</h1>
                <div className="flex flex-col gap-6">
                    {studentsWithMissing.map((student) => (
                        <div key={student.id} className="border-2 border-black rounded-2xl p-4 break-inside-avoid">
                            <div className="flex justify-between items-center border-b-2 border-gray-300 pb-2 mb-3">
                                <span className="text-3xl font-black">{student.name[0] + 'O' + student.name.slice(2)} 待補清單</span>
                                <span className="text-xl font-bold">共缺交 {student.missingCount} 項</span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                                {student.missingDetails.map((detail, idx) => (
                                    <div key={idx} className="flex items-start text-lg">
                                        <div className="w-5 h-5 border-2 border-black mr-2 shrink-0 bg-white mt-0.5"></div>
                                        <div className="flex flex-col">
                                            <span className="font-bold">{detail.assignment}</span>
                                            <span className="text-base text-gray-500">({detail.date.substring(5)})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div> 
    ); 
};
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
    const colWidth = 100 / (months.length + 1); 

    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-xl shadow-xl border border-gray-200 max-w-full">
            <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center"><span className="text-5xl mr-3">📊</span><span className="text-4xl">每月繳交狀況統計</span></h2>
            <div className="w-full relative border border-gray-300 rounded-lg shadow-lg overflow-auto max-h-[80vh]">
                <table className="w-full divide-y divide-gray-300 table-fixed border-collapse">
                    <colgroup>
                        <col style={{ width: `${colWidth}%` }} />
                        {months.map(m => <col key={m.id} style={{ width: `${colWidth}%` }} />)}
                    </colgroup>
                    <thead className="bg-gray-100 sticky top-0 z-[60]">
                        <tr>
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
    const { missingCount, name } = stat || { missingCount: 0, name: student.name }; 
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

    const handleToggleSelect = useCallback((assignmentId) => { setSelectedItemIds(prev => prev.includes(assignmentId) ? prev.filter(id => id !== assignmentId) : [...prev, assignmentId]); }, []); 
    const handleToggleSelectAll = useCallback(() => { if (selectedItemIds.length === detailedMissingItems.length) { setSelectedItemIds([]); } else { setSelectedItemIds(detailedMissingItems.map(item => item.assignmentId)); } }, [selectedItemIds.length, detailedMissingItems]); 
    const handleBatchDeleteSelectedItems = useCallback(async (e) => { 
        if (selectedItemIds.length === 0) { alert("請先勾選項目。"); return; } 
        if (!e.ctrlKey && !e.metaKey) { alert("請按住 Ctrl/Cmd 鍵點擊確認。"); return; } 
        const bronzeReward = selectedItemIds.length * 10;
        updateBankBalance(student.id, 0, 0, bronzeReward);
        setRewardState({ type: 'BRONZE' });
        try { 
            const batch = writeBatch(db); 
            selectedItemIds.forEach(assignmentId => { 
                const docRef = doc(db, getAssignmentCollectionPath(), assignmentId); 
                batch.set(docRef, { submissionStatus: { [student.id]: 'late' }, makeupClaimed: { [student.id]: true } }, { merge: true }); 
            }); 
            await batch.commit(); 
            setAlertMessage(`成功補交 ${selectedItemIds.length} 項作業，獲得 ${bronzeReward} 銅幣。`); 
            onClose(); 
        } catch (error) { console.error(error); } 
    }, [selectedItemIds, db, student.id, onClose, setAlertMessage, updateBankBalance, setRewardState]); 

    if (!hasMissingItems) return null; 
    return ( 
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-2"> 
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[95vh] flex flex-col"> 
                <h3 className="text-5xl font-bold text-gray-800 text-center mb-4">{name} 的未訂正作業</h3> 
                <div className={`p-4 rounded-xl mb-4 shadow-md border-l-8 ${colorClasses.bg} ${colorClasses.border} text-center`}>
                    <div className={`text-4xl font-semibold ${colorClasses.text}`}>累積總計：<span className="ml-2 font-black text-5xl">{missingCount}</span> 次</div>
                </div> 
                <div className="flex justify-between items-center mb-2 border-b pb-2">
                    <h4 className="text-3xl font-bold text-gray-800">詳細列表 ({detailedMissingItems.length}):</h4>
                    <button onClick={handleToggleSelectAll} className="text-2xl font-medium text-blue-600">全選/取消</button>
                </div> 
                <div className="flex-1 overflow-y-auto"> 
                    <ul className="divide-y divide-gray-200">
                        {detailedMissingItems.map((item) => (
                            <li key={item.assignmentId} className={`p-3 flex items-center gap-3 text-3xl text-gray-700 cursor-pointer ${selectedItemIds.includes(item.assignmentId) ? 'bg-blue-100' : ''}`} onClick={() => handleToggleSelect(item.assignmentId)}>
                                <input type="checkbox" checked={selectedItemIds.includes(item.assignmentId)} readOnly className="h-7 w-7" />
                                <span className="font-medium text-gray-900 w-32">{item.date}</span>
                                <span className="flex-1">{item.assignmentName}</span>
                            </li>
                        ))}
                    </ul>
                </div> 
                <div className="mt-4 pt-4 border-t border-green-300 flex flex-col gap-2"> 
                    <button onClick={handleBatchDeleteSelectedItems} className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-3xl shadow-lg">⚠️ 按住 Ctrl 標記 {selectedItemIds.length} 項為「已補交」</button> 
                    <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg text-3xl">關閉</button> 
                </div> 
            </div> 
        </div> 
    ); 
};

const AssignmentHeader = ({ assignment, isGlobalLoading, handleDeleteAssignment, handleEditSave, handleMoveAssignment, setEditingAssignmentId, setEditingAssignmentName, editingAssignmentId, editingAssignmentName, authMode }) => { 
    const isEditing = editingAssignmentId === assignment.id; 
    const [{ isDragging }, drag] = useDrag({ type: ItemTypes.ASSIGNMENT, item: { id: assignment.id }, collect: (monitor) => ({ isDragging: monitor.isDragging() }) }); 
    const [, drop] = useDrop({ accept: ItemTypes.ASSIGNMENT, hover: (item) => { if (item.id !== assignment.id) { handleMoveAssignment(item.id, assignment.id); item.id = assignment.id; } } }); 
    return ( 
        <th ref={(node) => drag(drop(node))} style={{ opacity: isDragging ? 0.4 : 1 }} className="px-2 py-4 text-3xl text-center font-semibold uppercase tracking-wider text-gray-800 sticky top-0 z-50 bg-gray-100 break-words">
            <div className="flex flex-col items-center justify-center group relative min-w-[150px]">
                <div className={`relative p-2 rounded-xl shadow-md border-2 border-transparent ${isEditing ? 'ring-4 ring-blue-400 bg-white' : 'hover:bg-gray-50 bg-white'}`} onDoubleClick={() => authMode === 'ADMIN' && (setEditingAssignmentId(assignment.id), setEditingAssignmentName(assignment.assignmentName))}>
                    {isEditing ? (
                        <input type="text" value={editingAssignmentName} onChange={(e) => setEditingAssignmentName(e.target.value)} onBlur={() => handleEditSave(assignment.id, editingAssignmentName).then(() => setEditingAssignmentId(null))} className="font-bold text-center text-3xl w-full outline-none" autoFocus />
                    ) : <span className="font-bold break-words">{assignment.assignmentName}</span>}
                    {!isEditing && authMode === 'ADMIN' && (
                        <button onClick={(e) => handleDeleteAssignment(assignment.id, assignment.assignmentName, e.ctrlKey)} className="absolute -top-3 -right-3 text-red-500 opacity-0 group-hover:opacity-100 transition p-1 bg-white rounded-full shadow-lg">
                            <X className="h-8 w-8" />
                        </button>
                    )}
                </div>
            </div>
        </th> 
    ); 
};
const DateTab = ({ date, isSelected, onClick, onEdit, authMode }) => { 
    const formattedDate = new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }); 
    return ( 
        <div className="relative group"> 
            <button onClick={() => onClick(date)} className={`px-5 py-3 text-4xl font-semibold rounded-lg transition shadow-md whitespace-nowrap flex items-center gap-2 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}> 
                {formattedDate} 
                {isSelected && authMode === 'ADMIN' && ( 
                    <span onClick={(e) => { e.stopPropagation(); onEdit(); }} className="inline-flex items-center justify-center p-1 bg-white/20 rounded-full hover:bg-white/40 cursor-pointer transition-colors"> 
                        <Pencil className="w-4 h-4 text-white" /> 
                    </span> 
                )} 
            </button> 
        </div> 
    ); 
};

// --- [App 主程式] ---
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
  
  // 新增：載入引擎狀態
  const [showTaskLoader, setShowTaskLoader] = useState(false);

  // 廣播視覺修復：保留完整色彩主題與標楷體設定
  const [broadcastData, setBroadcastData] = useState(null);
  const [dismissedBroadcastTime, setDismissedBroadcastTime] = useState(null);
  const [showBroadcastEditor, setShowBroadcastEditor] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState("");
  const [bcBgColor, setBcBgColor] = useState("bg-white");
  const [bcTextColor, setBcTextColor] = useState("text-slate-800");
  const [bcFontSize, setBcFontSize] = useState(80);
  const [bcBiauKai, setBcBiauKai] = useState(false);

  // ... 承接 Part 8 ...
  // 接續 App 組件內部
  const { students, loadingStudents } = useStudents(db, isOffline);
  const { bankData, updateBankBalance, setBankBalanceDirectly, setBankData } = useStudentBank(db, isAuthReady, isOffline, students);
  const dailySettlements = useDailySettlements(db, isAuthReady, isOffline);
  const { categories, loadingCategories, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students);

  const semesters = [ { id: 'S1', name: `上學期` }, { id: 'S2', name: `下學期` } ];
  const months = useMemo(() => [
    { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' },
    { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' },
    { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' },
    { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' },
    { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' },
    { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' },
    { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' },
    { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' },
    { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' },
    { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' },
    { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' },
    { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' },
  ], []);
  const [selectedSemester, setSelectedSemester] = useState('S1');
  const [selectedMonth, setSelectedMonth] = useState('02');
  const [unlockClicks, setUnlockClicks] = useState({});

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);
    setDb(firestore); setAuth(firebaseAuth);
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (u) => {
      if (u) { setUserId(u.uid); setIsAuthReady(true); setIsAuthenticated(true); setAuthMode(u.isAnonymous ? 'GUEST' : 'ADMIN'); }
      setLoadingLogin(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, "broadcasts", "current"), (snap) => {
      if (snap.exists()) setBroadcastData(snap.data()); else setBroadcastData(null);
    });
  }, [db]);

  useEffect(() => {
    if (!isAuthReady || !db || isOffline) return;
    const q = query(collection(db, getAssignmentCollectionPath()));
    return onSnapshot(q, (snapshot) => {
      const grouped = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data(); const d = data.assignmentDate;
        if (d) { if (!grouped[d]) grouped[d] = []; grouped[d].push({ id: doc.id, ...data }); }
      });
      setAllAssignmentsByDate(grouped); setLoading(false);
    });
  }, [isAuthReady, db, isOffline]);

  // ... 承接 Part 9 ...
  const assignmentsForSelectedDate = useMemo(() => 
    (allAssignmentsByDate[selectedDisplayDate] || []).sort((a, b) => (a.order || 0) - (b.order || 0))
  , [allAssignmentsByDate, selectedDisplayDate]);

  const assignmentMap = useMemo(() => 
    assignmentsForSelectedDate.reduce((acc, a) => { acc[a.assignmentName] = a; return acc; }, {})
  , [assignmentsForSelectedDate]);

  const displayedDates = useMemo(() => 
    Object.keys(allAssignmentsByDate).filter(d => d.substring(5, 7) === selectedMonth).sort()
  , [allAssignmentsByDate, selectedMonth]);

  const studentMissingStats = useMemo(() => {
    const stats = students.map(s => ({ id: s.id, name: s.name, missingCount: 0, missingDetails: [] }));
    Object.keys(allAssignmentsByDate).forEach(date => {
      (allAssignmentsByDate[date] || []).forEach(a => {
        students.forEach((s, idx) => {
          if (a.submissionStatus[s.id] === false) {
            stats[idx].missingCount++;
            stats[idx].missingDetails.push({ date, assignment: a.assignmentName });
          }
        });
      });
    });
    return stats.sort((a, b) => b.missingCount - a.missingCount);
  }, [allAssignmentsByDate, students]);

  // === [核心引擎：航海日誌任務注入邏輯] ===
  const handleLoadFromAnnouncements = async (tasksToInject) => {
    if (!selectedDisplayDate) return;
    setLoading(true);
    try {
        const batch = writeBatch(db);
        const path = getAssignmentCollectionPath();
        const currentCount = assignmentsForSelectedDate.length;

        tasksToInject.forEach((task, idx) => {
            const newRef = doc(collection(db, path));
            batch.set(newRef, {
                assignmentName: task.text,
                order: currentCount + idx,
                assignmentDate: selectedDisplayDate,
                submissionStatus: getInitialSubmissionStatus,
                makeupClaimed: {},
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        setAlertMessage(`✅ 成功載入 ${tasksToInject.length} 項任務！`);
        setShowTaskLoader(false);
    } catch (e) {
        console.error(e);
        alert("載入失敗，請檢查網路權限");
    }
    setLoading(false);
  };

  const handleAddNewDate = async () => {
    if (!newAssignmentDate || allAssignmentsByDate[newAssignmentDate]) {
        alert("日期已存在或無效"); return;
    }
    setSelectedDisplayDate(newAssignmentDate);
    setAlertMessage(`📅 日期 ${newAssignmentDate} 已就緒，請使用載入任務功能。`);
  };

  const handleAddNewAssignment = async () => {
    if (!selectedDisplayDate) return;
    const maxOrder = assignmentsForSelectedDate.reduce((max, i) => Math.max(max, i.order || 0), -1);
    await setDoc(doc(collection(db, getAssignmentCollectionPath())), { 
        assignmentName: "手動新增作業", assignmentDate: selectedDisplayDate, order: maxOrder + 1, 
        submissionStatus: getInitialSubmissionStatus, makeupClaimed: {}, createdAt: serverTimestamp() 
    });
  };

  const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatus) => { 
      const aData = assignmentMap[assignmentName]; if (!aData) return; 
      const isSettled = dailySettlements[selectedDisplayDate]?.isSettled || false;
      let newStatus;
      
      if (!isSettled) {
          const cellKey = `${studentId}-${aData.id}`;
          if (currentStatus === true || currentStatus === undefined) newStatus = false;
          else if (currentStatus === false) newStatus = 'late';
          else {
              const count = unlockClicks[cellKey] || 0;
              if (count < 2) { setUnlockClicks(prev => ({...prev, [cellKey]: count + 1})); return; }
              newStatus = true;
          }
          await setDoc(doc(db, getAssignmentCollectionPath(), aData.id), { submissionStatus: { [studentId]: newStatus } }, { merge: true });
          return;
      }

      // --- 結算發布後的嚴格獎懲邏輯 (全量恢復) ---
      let bronzeChange = 0; let silverChange = 0; let goldChange = 0; 
      let triggerAnimation = null;

      if (currentStatus === true || currentStatus === undefined) {
          newStatus = false;
          if (dailySettlements[selectedDisplayDate]?.silverRewardClaimed?.[studentId]) {
              silverChange = -2;
              await setDoc(doc(db, getDailySettlementPath(), selectedDisplayDate), { [`silverRewardClaimed.${studentId}`]: deleteField() }, { merge: true });
          }
      } else if (currentStatus === false) {
          newStatus = 'late'; 
          bronzeChange = 10; triggerAnimation = 'BRONZE';
          const allAssignments = Object.values(allAssignmentsByDate).flat();
          const remains = allAssignments.filter(a => a.submissionStatus[studentId] === false && a.id !== aData.id);
          if (remains.length === 0) { triggerAnimation = 'GOLD_CLEAR'; goldChange = 3; }
      } else { 
          newStatus = false; bronzeChange = -10; 
      }

      if (bronzeChange !== 0 || silverChange !== 0 || goldChange !== 0) {
          updateBankBalance(studentId, goldChange, silverChange, bronzeChange);
      }
      if (triggerAnimation) setRewardState({ type: triggerAnimation });
      await setDoc(doc(db, getAssignmentCollectionPath(), aData.id), { submissionStatus: { [studentId]: newStatus } }, { merge: true });
  }, [db, assignmentMap, unlockClicks, updateBankBalance, selectedDisplayDate, dailySettlements, allAssignmentsByDate]);

  const handleBatchSettlement = async () => {
    const assignments = assignmentsForSelectedDate;
    if (assignments.length === 0) return;
    const greenIds = students.filter(s => assignments.every(a => a.submissionStatus[s.id] === true)).map(s => s.id);
    if (greenIds.length === 0) { alert("目前無人全對"); return; }
    if (!window.confirm(`確定結算？將發放銀幣給 ${greenIds.length} 位同學。`)) return;
    
    setLoading(true);
    try {
        const batch = writeBatch(db);
        const settleRef = doc(db, getDailySettlementPath(), selectedDisplayDate);
        const claims = {}; 
        greenIds.forEach(id => { claims[id] = true; updateBankBalance(id, 0, 2, 0); });
        batch.set(settleRef, { isSettled: true, silverRewardClaimed: claims, settledAt: serverTimestamp() }, { merge: true });
        await batch.commit(); 
        setAlertMessage("🎉 結算成功！銀幣已入帳。");
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  const isGlobalLoading = loading || loadingStudents;

  if (!isAuthenticated && !isGlobalLoading) return (
    <LoginScreen 
      onAdminLogin={(e, p) => handleAdminLogin(e, p)} 
      onGuestLogin={handleGuestLogin} 
      isLoading={loadingLogin} 
      errorMsg={loginError} 
    />
  );

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="min-h-screen flex flex-col bg-gray-100 font-sans select-none overflow-x-hidden">
      {/* 特效與彈窗掛載 */}
      {rewardState && <RewardOverlay type={rewardState.type} onClose={() => setRewardState(null)} />}
      {showBankModal && <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} setBankBalanceDirectly={setBankBalanceDirectly} authMode={authMode} students={students} />}
      {dashboardStudent && <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={() => setDashboardStudent(null)} />}
      {showAllMissingModal && <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} />}
      {showTaskLoader && <TaskLoaderModal db={db} initialDate={selectedDisplayDate} onClose={() => setShowTaskLoader(false)} onConfirm={handleLoadFromAnnouncements} />}
      {missingStudent && <MissingDetailsModal student={students.find(s => s.id === missingStudent.id)} missingStats={studentMissingStats} onClose={() => setMissingStudent(null)} db={db} userId={userId} allAssignmentsByDate={allAssignmentsByDate} setAlertMessage={setAlertMessage} isOffline={isOffline} authMode={authMode} updateBankBalance={updateBankBalance} setRewardState={setRewardState} />}
      {confirmationModal && <ConfirmationModal title={confirmationModal.title} message={confirmationModal.message} onConfirm={executeDelete} onCancel={() => setConfirmationModal(null)} confirmTitle={confirmationModal.confirmTitle} confirmColor={confirmationModal.confirmColor} />}

      <div className="bg-white shadow-xl w-full flex flex-col h-full print:hidden">
        <header className="p-6 text-center border-b bg-white relative shrink-0">
          <button onClick={handleLogout} className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold transition hover:bg-red-200 active:scale-95"><LogOut size={20}/> 登出</button>
          <h1 className="text-6xl font-black tracking-tighter">🐻‍❄️ 五年甲班訂正作業表 🐼</h1>
          <p className="text-3xl text-gray-500 mt-2 font-bold">{new Date().toLocaleDateString('zh-TW', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="absolute right-4 top-4 text-gray-400 font-bold">Ver: {VERSION}</p>
        </header>

        {alertMessage && <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} />}

        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 flex flex-col gap-6">
          {/* 控制列 */}
          <div className="flex flex-wrap items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-4">
                <label className="text-3xl font-black text-gray-700">學期</label>
                <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} className="p-3 text-2xl border-2 rounded-xl font-bold">{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
             </div>
             <div className="flex items-center gap-4">
                <label className="text-3xl font-black text-gray-700">月份</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-3 text-2xl border-2 rounded-xl font-bold">{months.filter(m => m.semester === selectedSemester).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
             </div>
             <div className="flex gap-4 ml-auto">
                <button onClick={() => setShowBankModal(true)} className="px-6 py-4 bg-green-600 text-white text-3xl font-black rounded-2xl shadow-lg flex items-center gap-3 active:scale-95 transition"><BookOpen/> 訂正存簿</button>
                {authMode === 'ADMIN' && (
                  <>
                    <button onClick={handleBatchSettlement} className="px-6 py-4 bg-indigo-600 text-white text-3xl font-black rounded-2xl shadow-lg flex items-center gap-3 active:scale-95 transition"><Megaphone/> 結算發布</button>
                    <button onClick={() => setShowBroadcastEditor(true)} className="px-6 py-4 bg-amber-500 text-white text-3xl font-black rounded-2xl shadow-lg flex items-center gap-3 active:scale-95 transition"><Megaphone/> 全域廣播</button>
                  </>
                )}
             </div>
          </div>

          {/* 日期標籤列 */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {displayedDates.map(d => ( 
              <DateTab key={d} date={d} isSelected={selectedDisplayDate === d} onClick={setSelectedDisplayDate} onEdit={() => handleEditCurrentDate(d)} authMode={authMode} />
            ))}
          </div>

          {/* 功能按鈕列 */}
          <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <input type="date" value={newAssignmentDate} onChange={e => setNewAssignmentDate(e.target.value)} className="p-3 text-3xl border-2 rounded-xl font-bold w-[260px]"/>
              <button onClick={handleAddNewDate} className="px-6 py-3 bg-yellow-500 text-white text-3xl font-black rounded-xl shadow-md active:scale-95">+ 新增日期</button>
              {authMode === 'ADMIN' && (
                <button onClick={() => setShowTaskLoader(true)} className="px-6 py-3 bg-blue-500 text-white text-3xl font-black rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition"><DownloadCloud/> 📥 載入任務</button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={handleExportData} className="p-3 bg-fuchsia-100 text-fuchsia-700 rounded-xl hover:bg-fuchsia-200 transition shadow-sm active:scale-95"><Download size={32}/></button>
                <div className="relative">
                   <input type="file" onChange={handleImportData} className="absolute inset-0 opacity-0 cursor-pointer" />
                   <button className="p-3 bg-cyan-100 text-cyan-700 rounded-xl pointer-events-none shadow-sm"><Upload size={32}/></button>
                </div>
                <button onClick={() => setShowAllMissingModal(true)} className="p-3 bg-orange-100 text-orange-700 rounded-xl shadow-sm active:scale-95"><FileText size={32}/></button>
              </div>
          </div>

          {/* 主表格區 */}
          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white flex-1 min-h-[600px] flex flex-col relative">
              <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                  <h2 className="text-4xl font-black text-gray-800 flex items-center gap-4">📋 {selectedDisplayDate} 作業確認表</h2>
                  {authMode === 'ADMIN' && <button onClick={handleAddNewAssignment} className="px-6 py-3 bg-blue-400 text-white text-2xl font-black rounded-2xl shadow-md flex items-center gap-2 active:scale-95"><Plus/> 手動加項</button>}
              </div>
              <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-40 bg-gray-100">
                          <tr>
                            <th className="p-4 text-3xl font-black text-gray-500 border-r sticky left-0 z-50 bg-gray-100" style={{width:'100px'}}>座號</th>
                            <th className="p-4 text-3xl font-black text-gray-800 border-r-4 sticky left-[100px] z-50 bg-gray-100 shadow-md" style={{width:'150px'}}>姓名</th>
                            {assignmentsForSelectedDate.map(a => (
                              <AssignmentHeader key={a.id} assignment={a} isGlobalLoading={isGlobalLoading} handleDeleteAssignment={handleDeleteAssignment} handleEditSave={handleEditAssignmentName} handleMoveAssignment={handleMoveAssignment} setEditingAssignmentId={setEditingAssignmentId} setEditingAssignmentName={setEditingAssignmentName} editingAssignmentId={editingAssignmentId} editingAssignmentName={editingAssignmentName} authMode={authMode} />
                            ))}
                          </tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <tr key={s.id} className="border-b hover:bg-blue-50 transition-colors">
                            <td onClick={() => setDashboardStudent(s)} className="p-4 text-4xl font-black text-gray-400 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50 z-30 cursor-pointer">{s.id}</td>
                            <td onClick={() => setFocusedStudentId(focusedStudentId === s.id ? null : s.id)} className={`p-4 text-4xl font-black border-r-4 text-center sticky left-[100px] shadow-md z-30 cursor-pointer ${focusedStudentId === s.id ? 'bg-blue-600 text-white' : 'bg-white group-hover:bg-blue-100'}`}>{s.name[0]+'O'+s.name.slice(2)}</td>
                            {assignmentsForSelectedDate.map(a => {
                              const st = a.submissionStatus[s.id] ?? true;
                              return (
                                <td key={a.id} className="p-2 text-center border-r">
                                  <button onClick={() => handleToggleSubmission(a.assignmentName, s.id, st)} className={`w-20 h-20 rounded-2xl shadow-lg transition-all flex items-center justify-center border-b-8 active:border-b-0 active:translate-y-2 ${st === true ? 'bg-green-100 text-green-700 border-green-300' : (st === 'late' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-red-500 border-red-300 border-4')}`}>
                                    {st === true ? <Check size={48} strokeWidth={4}/> : (st === 'late' ? <RotateCw size={48} strokeWidth={4}/> : <X size={48} strokeWidth={4}/>)}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                  </table>
              </div>
          </div>
          <MissingColorExplanation />
          <MonthlyStudentStats monthlyStats={monthlyStudentStats} months={months.filter(m => m.semester === selectedSemester)} />
        </div>

        {/* 廣播編輯器：恢復完整視覺設定功能 */}
        {showBroadcastEditor && authMode === 'ADMIN' && (
          <div className="fixed inset-0 bg-sky-900/90 backdrop-blur-md z-[100000] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-5xl border-8 border-sky-200 relative zoom-in-95 flex flex-col max-h-[95vh]">
              <button onClick={() => setShowBroadcastEditor(false)} className="absolute top-6 right-6 p-3 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-full transition-colors shadow-sm"><X size={32}/></button>
              <h2 className="text-4xl font-black text-sky-800 flex items-center gap-4 mb-6 border-b-4 border-sky-100 pb-4 shrink-0"><Megaphone size={48}/> 全域廣播控制台</h2>
              <div className="flex flex-col gap-6 overflow-y-auto pr-4 shrink text-left">
                  <div className="flex flex-col gap-2">
                      <label className="text-2xl font-bold text-slate-600 flex items-center gap-2"><Type size={28}/> 廣播內容與即時預覽</label>
                      <textarea value={broadcastInput} onChange={e => setBroadcastInput(e.target.value)} style={{ fontSize: `${Math.min(bcFontSize, 60)}px`, fontFamily: bcBiauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit' }} className={`w-full min-h-[300px] p-8 border-4 border-slate-200 rounded-[2rem] font-black focus:outline-none focus:border-sky-400 transition-colors shadow-inner ${bcBgColor} ${bcTextColor}`} placeholder="請輸入廣播內容..." />
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <label className="text-2xl font-bold text-slate-600 border-b-2 border-slate-200 pb-2 block">字體設定</label>
                          <div className="flex items-center gap-4">
                              <button onClick={() => setBcBiauKai(!bcBiauKai)} className={`flex-1 py-4 rounded-2xl text-2xl font-bold transition-all border-2 ${bcBiauKai ? 'bg-sky-500 text-white border-sky-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>標楷體</button>
                              <div className="flex items-center bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                                  <button onClick={() => setBcFontSize(f => Math.max(30, f - 10))} className="p-4 hover:bg-slate-100 text-slate-600 transition-colors"><Minus size={28}/></button>
                                  <span className="w-20 text-center text-3xl font-black text-slate-800">{bcFontSize}</span>
                                  <button onClick={() => setBcFontSize(f => Math.min(150, f + 10))} className="p-4 hover:bg-slate-100 text-slate-600 transition-colors"><Plus size={28}/></button>
                              </div>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="text-2xl font-bold text-slate-600 border-b-2 border-slate-200 pb-2 block">主題色彩</label>
                          <div className="flex flex-wrap gap-4">
                              {[
                                { bg: 'bg-white', text: 'text-slate-800' }, { bg: 'bg-amber-400', text: 'text-slate-900' },
                                { bg: 'bg-rose-600', text: 'text-white' }, { bg: 'bg-emerald-500', text: 'text-white' },
                                { bg: 'bg-blue-600', text: 'text-white' }, { bg: 'bg-slate-900', text: 'text-yellow-400' }
                              ].map((theme, i) => (
                                <button key={i} onClick={() => { setBcBgColor(theme.bg); setBcTextColor(theme.text); }} className={`w-16 h-16 rounded-full border-4 shadow-md transition-all active:scale-90 ${theme.bg} ${bcBgColor === theme.bg ? 'border-sky-400 scale-110 ring-4' : 'border-slate-200'}`} />
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
              <div className="flex gap-6 mt-8 pt-6 border-t-4 border-sky-100 shrink-0">
                <button onClick={async () => { if(!broadcastInput.trim()) return; await setDoc(doc(db, "broadcasts", "current"), { message: broadcastInput.trim(), timestamp: serverTimestamp(), active: true, settings: { bgColor: bcBgColor, textColor: bcTextColor, fontSize: bcFontSize, biauKai: bcBiauKai } }); setShowBroadcastEditor(false); }} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-3xl font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"><Megaphone size={36}/> 立即發布廣播</button>
                <button onClick={async () => { await setDoc(doc(db, "broadcasts", "current"), { active: false }, { merge: true }); setShowBroadcastEditor(false); }} className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 text-2xl font-bold py-5 rounded-2xl border-2 border-slate-300 active:scale-95 shadow-md">收回廣播</button>
              </div>
            </div>
          </div>
        )}

        {/* 廣播接收視窗 (學生與大螢幕用) */}
        {(() => {
            const currentId = broadcastData?.timestamp?.toMillis() || broadcastData?.message;
            const isVisible = broadcastData?.active && currentId && currentId !== dismissedBroadcastTime;
            if (!isVisible) return null;
            const s = broadcastData.settings || { bgColor: 'bg-amber-400', textColor: 'text-slate-900', fontSize: 80, biauKai: false };
            return (
              <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300 print:hidden">
                <div className={`${s.bgColor} rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 md:p-16 w-full max-w-[95vw] min-h-[80vh] border-[16px] border-white/20 flex flex-col items-center justify-center text-center relative`}>
                  <div className="absolute -top-20 bg-white/20 backdrop-blur-md p-6 rounded-full border-8 border-white/30 shadow-xl animate-bounce"><BellRing size={80} className={s.textColor}/></div>
                  <div className="flex-1 flex items-center justify-center w-full py-12">
                    <p style={{ fontSize: `${s.fontSize}px`, fontFamily: s.biauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit' }} className={`font-black ${s.textColor} leading-snug whitespace-pre-wrap break-words w-full max-h-[60vh] overflow-y-auto custom-scrollbar`}>{broadcastData.message}</p>
                  </div>
                  <button onClick={() => setDismissedBroadcastTime(currentId)} className={`w-full max-w-2xl bg-black/20 hover:bg-black/40 ${s.textColor} border-4 border-black/10 text-5xl font-black py-6 rounded-[2.5rem] shadow-xl transition-all active:scale-95 shrink-0`}>我知道了！</button>
                </div>
              </div>
            );
        })()}
      </div>
    </div>
    </DndProvider>
  );
};

// --- 其他輔助邏輯與 Hook ---
const useStudents = (db, isOffline) => {
   const [students, setStudents] = useState(DEFAULT_STUDENTS);
   const [loadingStudents, setLoadingStudents] = useState(true);
   useEffect(() => {
       if (isOffline) { setLoadingStudents(false); return; }
       if (!db) return;
       return onSnapshot(query(collection(db, `/artifacts/${appId}/public/data/students`)), (snapshot) => {
           const loaded = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
           if (loaded.length > 0) setStudents(loaded.sort((a, b) => parseInt(a.id) - parseInt(b.id)));
           setLoadingStudents(false);
       });
   }, [db, isOffline]);
   return { students, loadingStudents };
};

const useCategories = (db, userId, isAuthReady, setAlertMessage, isOffline, students) => { 
  const [categories, setCategories] = useState([]); 
  const [loadingCategories, setLoadingCategories] = useState(true); 
  const getInitialSubmissionStatus = useMemo(() => students.reduce((status, student) => { status[student.id] = true; return status; }, {}), [students]); 
  useEffect(() => { 
    if (isOffline) { setCategories(INITIAL_CATEGORIES.map((cat, i) => ({ ...cat, id: `offline-cat-${i}` }))); setLoadingCategories(false); return; }
    if (isAuthReady && db && userId) {
      onSnapshot(collection(db, getCategoryCollectionPath()), (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0)));
        setLoadingCategories(false);
      });
    }
  }, [isAuthReady, db, userId, isOffline, students]);
  return { categories, loadingCategories, getInitialSubmissionStatus }; 
};

export default App;
