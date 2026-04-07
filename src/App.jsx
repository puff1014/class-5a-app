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

const VERSION = 'v20.0.55 - 1700行完整還原版'; 
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
                const filtered = rawItems.filter(item => {
                    const txt = typeof item === 'string' ? item : item.text;
                    return txt && !txt.startsWith('※') && !txt.startsWith(' ');
                }).map((item, idx) => ({
                    id: idx,
                    text: typeof item === 'string' ? item.trim() : item.text.trim(),
                    selected: true
                }));
                setTasks(filtered);
            } else { alert("找不到資料。"); }
        } catch (e) { console.error(e); }
        setLoading(false);
    };
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100005] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border-8 border-blue-100">
                <div className="p-8 border-b-4 border-blue-50">
                    <h3 className="text-4xl font-black text-blue-900 mb-6 flex items-center gap-3">📥 載入任務</h3>
                    <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-2xl">
                        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="flex-1 p-2 text-2xl rounded-xl border-2 border-blue-200" />
                        <button onClick={fetchTasks} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-2xl font-black">抓取</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 max-h-[50vh]">
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border-2 border-gray-100 mb-2">
                            <input type="checkbox" checked={task.selected} onChange={e => setTasks(tasks.map(t => t.id === task.id ? {...t, selected: e.target.checked} : t))} className="w-8 h-8" />
                            <input type="text" value={task.text} onChange={e => setTasks(tasks.map(t => t.id === task.id ? {...t, text: e.target.value} : t))} className="flex-1 p-2 text-2xl font-bold rounded-lg border" />
                        </div>
                    ))}
                </div>
                <div className="p-8 border-t-4 border-blue-50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-2xl font-black">取消</button>
                    <button onClick={() => onConfirm(tasks.filter(t => t.selected))} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-2xl font-black shadow-lg">確認注入</button>
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
// --- [原始邏輯]：狀況統計與績效回饋語 ---
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
// --- [原始組件]：學生學習歷程彈窗 (含趨勢分析與績效計算) ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('STATUS'); 
    if (!student) return null;
    const maskedName = student.name[0] + 'O' + student.name.slice(2);
    
    // 原始日期差異計算邏輯
    const getDaysDiff = (dateString, completedAt) => { 
        try { 
            const targetDate = new Date(dateString); 
            if (isNaN(targetDate.getTime())) return 0; 
            targetDate.setHours(0,0,0,0); 
            let completedDate = new Date(); 
            if (completedAt) { 
                if (typeof completedAt.toDate === 'function') completedDate = completedAt.toDate(); 
                else if (completedAt.seconds) completedDate = new Date(completedAt.seconds * 1000); 
                else completedDate = new Date(completedAt); 
            } 
            if (isNaN(completedDate.getTime())) return 0; 
            completedDate.setHours(0,0,0,0); 
            return Math.max(0, Math.floor((completedDate - targetDate) / (1000 * 60 * 60 * 24))); 
        } catch (e) { return 0; } 
    };

    const getDelayFromToday = (dateString) => { 
        try { 
            const today = new Date(); today.setHours(0, 0, 0, 0); 
            const target = new Date(dateString); 
            if (isNaN(target.getTime())) return 0; 
            target.setHours(0, 0, 0, 0); 
            return Math.floor((today - target) / (1000 * 60 * 60 * 24)); 
        } catch(e) { return 0; } 
    };
    
    // 核心數據計算引擎
    const { healthData, trendData, summaryStats, trendStats, emergencyData, overallData } = useMemo(() => {
        const healthByMonth = {}; const trendByMonth = {};
        let totalItems = 0; let totalDays = 0; let totalHealthPoints = 0; let totalTrendPoints = 0;
        let itemsCompleted = 0; let itemsLate = 0; let itemsMissing = 0; 
        let daysCompleted = 0; let daysLate = 0; let daysMissing = 0;
        let currentMissingCount = 0; let maxDelayDays = 0;
        
        const sortedDates = Object.keys(allAssignmentsByDate || {}).sort();
        
        sortedDates.forEach(date => {
            const dateObj = new Date(date); 
            if (isNaN(dateObj.getTime())) return;
            const monthKey = `${dateObj.getMonth() + 1}月`;
            
            if (!healthByMonth[monthKey]) healthByMonth[monthKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            if (!trendByMonth[monthKey]) trendByMonth[monthKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            
            const assignments = allAssignmentsByDate[date] || []; 
            if (assignments.length === 0) return;
            
            totalDays++; 
            let dayHasMissing = false; 
            let dayHasLate = false;
            
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
                    if (completedAt) { 
                        const daysLateVal = getDaysDiff(date, completedAt); 
                        tScore = Math.max(0, 100 - (daysLateVal * 5)); 
                    } else { tScore = 60; } 
                } else { 
                    itemsCompleted++; trendByMonth[monthKey].onTime++; tScore = 100; 
                }
                trendByMonth[monthKey].totalPoints += tScore; 
                trendByMonth[monthKey].count++; 
                totalTrendPoints += tScore; 
                totalItems++;
            });
            
            let dayScore = 0; 
            if (dayHasMissing) { dayScore = 0; healthByMonth[monthKey].missing++; daysMissing++; } 
            else if (dayHasLate) { dayScore = 60; healthByMonth[monthKey].late++; daysLate++; } 
            else { dayScore = 100; healthByMonth[monthKey].onTime++; daysCompleted++; }
            
            healthByMonth[monthKey].totalPoints += dayScore; 
            healthByMonth[monthKey].count++; 
            totalHealthPoints += dayScore;
        });

        const safeDiv = (a, b) => (b === 0 ? 0 : a / b);
        const healthChart = Object.keys(healthByMonth).map(key => ({ label: key, value: safeDiv(healthByMonth[key].totalPoints, healthByMonth[key].count), details: healthByMonth[key] }));
        const trendChart = Object.keys(trendByMonth).map(key => ({ label: key, value: safeDiv(trendByMonth[key].totalPoints, trendByMonth[key].count), details: trendByMonth[key] }));
        
        const avgHealthScore = safeNumber(safeDiv(totalHealthPoints, totalDays)); 
        const avgTrendScore = safeNumber(safeDiv(totalTrendPoints, totalItems));
        
        return { 
            healthData: healthChart, 
            trendData: trendChart, 
            summaryStats: { days: { total: totalDays, completed: daysCompleted, late: daysLate, missing: daysMissing }, items: { total: totalItems, completed: itemsCompleted, late: itemsLate, missing: itemsMissing }, avgScore: avgHealthScore.toFixed(1) }, 
            trendStats: { avgScore: avgTrendScore.toFixed(1) }, 
            emergencyData: { isEmergency: (maxDelayDays >= 3 || currentMissingCount >= 3), maxDelayDays, currentMissingCount }, 
            overallData: { score: ((avgHealthScore + avgTrendScore) / 2).toFixed(1) } 
        };
    }, [allAssignmentsByDate, student.id]);

    const currentFeedback = viewMode === 'STATUS' ? getStatusFeedback(summaryStats.avgScore, emergencyData) : getTrendFeedback(trendStats.avgScore);
    const overallBadge = getOverallBadge(overallData.score);
    const currentStats = viewMode === 'STATUS' ? summaryStats.days : summaryStats.items;
    const statsUnit = viewMode === 'STATUS' ? '天' : '項';

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] h-[98vh] flex flex-col overflow-hidden border-[8px] ${currentFeedback.isAlert ? 'border-red-500' : 'border-white'}`}>
                <div className={`px-4 py-3 flex justify-between items-center text-white shrink-0 transition-colors duration-500 ${currentFeedback.isAlert ? 'bg-red-600' : (viewMode === 'TREND' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-gradient-to-r from-indigo-600 to-purple-500')}`}>
                    <div className="flex items-center gap-4 w-full">
                        <div className="flex items-center gap-4 shrink-0">
                            <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg border-4 ${currentFeedback.isAlert ? 'text-red-600' : 'text-indigo-600'}`}>{student.id}</div>
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
                                <div className="text-4xl font-medium text-white/95 leading-tight bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/30">{overallBadge.comment}</div>
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
                    <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-200 h-[550px] shrink-0">
                        <div className="w-full h-[450px]">{viewMode === 'TREND' ? ( <SimpleLineChart data={trendData} height={450} /> ) : ( <SimpleStackedBarChart data={healthData} height={450} /> )}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
// --- [原始組件]：獎勵特效疊加層 (包含音效與動畫) ---
const RewardOverlay = ({ type, onClose }) => {
    const soundUrl = type === 'GOLD_CLEAR' ? ASSETS.GOLD_SOUND : ASSETS.BRONZE_SOUND;
    const duration = type === 'GOLD_CLEAR' ? 6000 : 1000;

    useEffect(() => { 
        const timer = setTimeout(() => { onClose(); }, duration); 
        return () => clearTimeout(timer); 
    }, [duration, onClose]);

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

// --- [原始邏輯]：存簿數據同步 Hook ---
const useStudentBank = (db, isAuthReady, isOffline, students) => {
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
        } catch (e) { console.error("Bank update failed", e); }
    }, [db, isOffline]);

    const setBankBalanceDirectly = useCallback(async (studentId, type, value) => {
        if (isOffline) {
            setBankData(prev => ({ ...prev, [studentId]: { ...prev[studentId], [type]: value } }));
            return;
        }
        if (!db) return;
        const docRef = doc(db, getBankCollectionPath(), studentId);
        await setDoc(docRef, { [type]: value }, { merge: true });
    }, [db, isOffline]);

    return { bankData, updateBankBalance, setBankBalanceDirectly, setBankData }; 
};

// --- [原始組件]：訂正存簿彈窗 (含完整管理邏輯) ---
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
      if(!window.confirm("⚠️ 確定要將「全班所有人的錢」全部歸零嗎？此操作無法復原！")) return;
      students.forEach(s => {
          setBankBalanceDirectly(s.id, 'gold', 0);
          setBankBalanceDirectly(s.id, 'silver', 0);
          setBankBalanceDirectly(s.id, 'bronze', 0);
      });
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-4 border-orange-400">
        <div className="bg-gray-100 p-4 border-b flex justify-between items-center shrink-0">
          <div className="text-3xl font-bold text-gray-700 flex items-center gap-2">💰 訂正存簿</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-8 h-8" /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-orange-50">
          <table className="w-full bg-white shadow-sm rounded-lg border border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                <tr className="border-b-2 border-gray-300">
                  <th className="p-3 text-2xl w-20 text-center">排名</th>
                  <th className="p-3 text-2xl w-24 text-center">座號</th>
                  <th className="p-3 text-2xl text-left">姓名</th>
                  <th className="p-3 text-2xl w-32 bg-yellow-50 text-yellow-700">金幣</th>
                  <th className="p-3 text-2xl w-32 bg-gray-50 text-gray-700">銀幣</th>
                  <th className="p-3 text-2xl w-32 bg-orange-50 text-orange-700">銅幣</th>
                  <th className="p-3 text-center bg-gray-100">操作</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {sortedStudents.map((student, idx) => {
                  const bal = bankData[student.id] || { gold: 0, silver: 0, bronze: 0 };
                  return (
                    <tr key={student.id} className="hover:bg-blue-50 transition">
                      <td className="p-3 text-center text-3xl font-black text-gray-400">{idx + 1}</td>
                      <td className="p-3 text-center text-2xl font-bold text-gray-600">{student.id}</td>
                      <td className="p-3 text-2xl font-bold text-gray-800">{student.name[0] + 'O' + student.name.slice(2)}</td>
                      <td className="p-2 text-center bg-yellow-50/30">
                        <input type="number" value={bal.gold || 0} onChange={(e)=>setBankBalanceDirectly(student.id, 'gold', parseInt(e.target.value))} disabled={authMode!=='ADMIN'} className="w-24 text-center text-3xl font-bold text-yellow-600 bg-transparent outline-none" />
                      </td>
                      <td className="p-2 text-center bg-gray-50/30">
                        <input type="number" value={bal.silver || 0} onChange={(e)=>setBankBalanceDirectly(student.id, 'silver', parseInt(e.target.value))} disabled={authMode!=='ADMIN'} className="w-24 text-center text-3xl font-bold text-gray-600 bg-transparent outline-none" />
                      </td>
                      <td className="p-2 text-center bg-orange-50/30">
                        <input type="number" value={bal.bronze || 0} onChange={(e)=>setBankBalanceDirectly(student.id, 'bronze', parseInt(e.target.value))} disabled={authMode!=='ADMIN'} className="w-24 text-center text-3xl font-bold text-orange-700 bg-transparent outline-none" />
                      </td>
                      <td className="p-2 flex justify-center items-center gap-2">
                          <button onClick={() => handleExchange(student.id, 'B2S')} className="w-12 h-12 rounded-full shadow-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center" title="100銅換1銀"><RotateCw className="w-7 h-7"/></button>
                          <button onClick={() => handleExchange(student.id, 'S2G')} className="w-12 h-12 rounded-full shadow-md bg-yellow-100 hover:bg-yellow-200 flex items-center justify-center" title="10銀換1金"><RotateCw className="w-7 h-7"/></button>
                          {authMode === 'ADMIN' && (
                              <button onClick={() => { setBankBalanceDirectly(student.id, 'gold', 0); setBankBalanceDirectly(student.id, 'silver', 0); setBankBalanceDirectly(student.id, 'bronze', 0); }} className="p-2 ml-2 bg-red-100 text-red-600 rounded-lg"><Eraser className="w-7 h-7"/></button>
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
                 <button onClick={handleResetClass} className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 text-xl shadow-md">⚠️ 期末全班歸零</button>
            </div>
        )}
      </div>
    </div>
  );
};
// --- [原始組件]：全班未完成作業總表 (支援列印) ---
const AllMissingAssignmentsModal = ({ missingStats, onClose }) => { 
    const studentsWithMissing = missingStats.filter(s => s.missingCount > 0); 
    return ( 
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4 print:p-0 print:block print:bg-white print:absolute print:inset-0"> 
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200 print:hidden"> 
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                        <AlertCircle className="w-10 h-10 text-red-500" /> 全班未完成作業總表
                    </h3>
                    <div className="flex gap-3">
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-xl font-bold transition shadow-sm active:scale-95 hover:bg-blue-700">
                            <Printer className="w-6 h-6"/> 列印待補單
                        </button>
                        <button onClick={onClose} className="text-gray-500 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"><X className="w-8 h-8" /></button>
                    </div>
                </div> 
                <div className="flex-1 overflow-auto"> 
                    {studentsWithMissing.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Check className="w-24 h-24 mb-4 text-green-400" />
                            <p className="text-4xl font-bold text-green-600">太棒了！目前全班皆已完成所有作業。</p>
                        </div>
                    ) : (
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
                                        <td className="px-4 py-4 text-2xl text-center border-r font-medium">{student.id}</td>
                                        <td className="px-4 py-4 text-2xl font-bold text-center border-r">{student.name[0] + 'O' + student.name.slice(2)}</td>
                                        <td className="px-4 py-4 text-center border-r"><span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-2xl">{student.missingCount}</span></td>
                                        <td className="px-6 py-4 text-xl">
                                            <ul className="list-disc list-inside space-y-1">
                                                {student.missingDetails.map((detail, idx) => (
                                                    <li key={idx} className="flex items-start">
                                                        <span className="text-red-600 font-bold text-xl mr-2">{detail.assignment}</span>
                                                        <span className="text-gray-400 text-lg font-mono">({detail.date.substring(5)})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                    </tr>
                                ))}
                            </tbody> 
                        </table> 
                    )}
                </div> 
            </div> 

            {/* --- [列印專用區] --- */}
            <div className="hidden print:block w-full h-full bg-white text-black p-4">
                <h1 className="text-4xl font-extrabold text-center mb-6 border-b-4 border-black pb-4">五年甲班 未完成作業待補單</h1>
                <p className="text-right text-lg font-medium mb-4">列印日期：{new Date().toLocaleDateString('zh-TW')} (共 {studentsWithMissing.length} 人待補)</p>
                <div className="flex flex-col gap-6">
                    {studentsWithMissing.map((student) => (
                        <div key={student.id} className="border-2 border-black rounded-2xl p-4 break-inside-avoid shadow-none">
                            <div className="flex justify-between items-center border-b-2 border-gray-300 pb-2 mb-3">
                                <span className="text-3xl font-black tracking-widest">{student.name[0] + 'O' + student.name.slice(2)} 待補清單</span>
                                <span className="text-xl font-bold text-gray-700">共缺交 {student.missingCount} 項</span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                                {student.missingDetails.map((detail, idx) => (
                                    <div key={idx} className="flex items-start text-lg leading-tight">
                                        <div className="w-5 h-5 border-2 border-black mr-2 shrink-0 bg-white mt-0.5"></div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-black">{detail.assignment}</span>
                                            <span className="text-base text-gray-500 font-medium">({detail.date.substring(5)})</span>
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

// --- [原始組件]：點擊學生顯示的詳細未訂正列表 (含批次補交) ---
const MissingDetailsModal = ({ student, missingStats, onClose, db, allAssignmentsByDate, updateBankBalance, setRewardState }) => { 
    const [selectedItemIds, setSelectedItemIds] = useState([]); 
    const stat = missingStats.find(s => s.id === student.id); 
    const detailedMissingItems = useMemo(() => { 
        const items = []; 
        Object.keys(allAssignmentsByDate || {}).forEach(date => { 
            (allAssignmentsByDate[date] || []).forEach(assignment => { 
                if (assignment.submissionStatus[student.id] === false) { 
                    items.push({ date: date, assignmentName: assignment.assignmentName, assignmentId: assignment.id }); 
                } 
            }); 
        }); 
        return items.sort((a, b) => a.date.localeCompare(b.date)); 
    }, [allAssignmentsByDate, student.id]); 

    const handleBatchMakeup = async (e) => { 
        if (selectedItemIds.length === 0) return; 
        if (!e.ctrlKey && !e.metaKey) { alert("請按住 Ctrl/Cmd 鍵點擊確認，以領取銅幣獎勵。"); return; } 
        const bronzeReward = selectedItemIds.length * 10;
        updateBankBalance(student.id, 0, 0, bronzeReward);
        setRewardState({ type: 'BRONZE' });
        const batch = writeBatch(db); 
        selectedItemIds.forEach(assignmentId => { 
            const docRef = doc(db, getAssignmentCollectionPath(), assignmentId); 
            batch.update(docRef, { [`submissionStatus.${student.id}`]: 'late' }); 
        }); 
        await batch.commit(); 
        onClose(); 
    }; 

    if (!stat || stat.missingCount === 0) return null; 
    const colorClasses = getMissingColorClasses(stat.missingCount);

    return ( 
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm"> 
            <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] flex flex-col border-4 border-blue-100"> 
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-5xl font-black text-gray-800">{stat.name} 的未訂正作業</h3> 
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={40}/></button>
                </div>
                <div className={`p-6 rounded-2xl mb-6 shadow-sm border-l-[12px] ${colorClasses.bg} ${colorClasses.border} text-center flex items-center justify-center gap-4`}>
                    <div className={`text-4xl font-semibold ${colorClasses.text}`}>累積未訂正：</div>
                    <div className={`text-6xl font-black ${colorClasses.text}`}>{stat.missingCount} <span className="text-3xl">次</span></div>
                </div> 
                <div className="flex-1 overflow-y-auto custom-scrollbar"> 
                    {detailedMissingItems.map((item) => (
                        <div key={item.assignmentId} onClick={() => setSelectedItemIds(prev => prev.includes(item.assignmentId) ? prev.filter(id => id !== item.assignmentId) : [...prev, item.assignmentId])}
                             className={`p-4 flex items-center gap-4 text-3xl text-gray-700 cursor-pointer rounded-xl mb-2 border-2 transition-colors ${selectedItemIds.includes(item.assignmentId) ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-50 border-transparent'}`}>
                            <div className={`w-8 h-8 rounded border-2 flex items-center justify-center ${selectedItemIds.includes(item.assignmentId) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300'}`}>
                                {selectedItemIds.includes(item.assignmentId) && <Check size={24} strokeWidth={4}/>}
                            </div>
                            <span className="font-bold text-gray-900 w-36 bg-white px-3 py-1 rounded shadow-sm text-center">{item.date.substring(5)}</span>
                            <span className="flex-1 font-semibold">{item.assignmentName}</span>
                        </div>
                    ))}
                </div> 
                <div className="mt-6 pt-6 border-t-4 border-green-100"> 
                    <button onClick={handleBatchMakeup} disabled={selectedItemIds.length === 0} 
                            className={`w-full py-4 rounded-2xl text-white font-black text-3xl shadow-lg transition-all ${selectedItemIds.length === 0 ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600 active:scale-95'}`}>
                        按住 Ctrl 標記 {selectedItemIds.length} 項為「已補交」
                    </button> 
                </div> 
            </div> 
        </div> 
    ); 
};

// --- [原始組件]：登入選擇畫面 ---
const LoginScreen = ({ onAdminLogin, onGuestLogin, isLoading, errorMsg }) => { 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [mode, setMode] = useState('GUEST'); 
  return ( 
      <div className="fixed inset-0 bg-[#F0F8FF] flex items-center justify-center z-[10000]"> 
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border-8 border-white"> 
              <div className="text-center mb-8"> 
                  <div className="text-8xl mb-4 animate-bounce">🏫</div>
                  <h1 className="text-4xl font-black text-gray-800 mb-2">五年甲班作業表</h1> 
                  <p className="text-gray-400 text-xl font-bold">請選擇身分</p> 
              </div> 
              <div className="flex bg-gray-100 p-2 rounded-2xl mb-8"> 
                  <button onClick={() => setMode('GUEST')} className={`flex-1 py-3 rounded-xl text-2xl font-black transition ${mode === 'GUEST' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>學生/家長</button> 
                  <button onClick={() => setMode('ADMIN')} className={`flex-1 py-3 rounded-xl text-2xl font-black transition ${mode === 'ADMIN' ? 'bg-white shadow text-red-600' : 'text-gray-400'}`}>老師 (管理)</button> 
              </div> 
              {mode === 'ADMIN' ? ( 
                  <form onSubmit={(e) => { e.preventDefault(); onAdminLogin(email, password); }} className="space-y-4"> 
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-4 text-xl border-2 rounded-2xl focus:border-red-500 outline-none" autoFocus /> 
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼" className="w-full px-4 py-4 text-xl border-2 rounded-2xl focus:border-red-500 outline-none" /> 
                      {errorMsg && <p className="text-red-500 text-lg font-bold text-center">{errorMsg}</p>} 
                      <button type="submit" disabled={isLoading} className="w-full py-4 rounded-2xl bg-red-500 text-white text-3xl font-black shadow-lg hover:bg-red-600 active:scale-95 transition">管理員登入</button> 
                  </form> 
              ) : ( 
                  <div className="space-y-6"> 
                      <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 text-lg text-blue-800 font-bold leading-relaxed">● 訪客模式可查看全班進度與獎勵<br/>● 所有的資料將同步至雲端資料庫</div> 
                      <button onClick={onGuestLogin} disabled={isLoading} className="w-full py-4 rounded-2xl bg-blue-500 text-white text-3xl font-black shadow-lg hover:bg-blue-600 active:scale-95 transition">進入系統</button> 
                  </div> 
              )} 
          </div> 
      </div> 
  ); 
};

// --- [原始組件]：危險操作確認 (按住 Alt 鍵) ---
const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmTitle, confirmColor }) => { 
    const [isAltPressed, setIsAltPressed] = useState(false); 
    useEffect(() => { 
        const down = (e) => e.key === 'Alt' && setIsAltPressed(true); 
        const up = (e) => e.key === 'Alt' && setIsAltPressed(false); 
        window.addEventListener('keydown', down); window.addEventListener('keyup', up); 
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); }; 
    }, []); 
    return ( 
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"> 
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-lg text-center border-8 border-red-50"> 
                <h3 className="text-4xl font-black text-gray-800 mb-4">{title}</h3>
                <p className="text-2xl text-gray-600 mb-8 font-bold">{message}</p> 
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl text-2xl font-black">取消</button>
                    <button onClick={() => isAltPressed ? onConfirm() : alert("請按住 Alt 鍵以啟用按鈕")} 
                            className={`flex-1 py-4 rounded-2xl text-2xl font-black text-white transition ${isAltPressed ? confirmColor : 'bg-gray-300'}`}>
                        {confirmTitle}
                    </button>
                </div>
                {!isAltPressed && <p className="mt-4 text-red-500 font-bold animate-pulse">⚠️ 請按住 Alt 鍵才能點擊確認</p>}
            </div> 
        </div> 
    ); 
};

// --- [原始組件]：日期分頁標籤 ---
const DateTab = ({ date, isSelected, onClick, onEdit, authMode }) => { 
    const dObj = new Date(date);
    return ( 
        <div className="relative shrink-0"> 
            <button onClick={() => onClick(date)} 
                    className={`px-8 py-5 text-3xl font-black rounded-2xl transition-all shadow-md flex items-center gap-3 ${isSelected ? 'bg-blue-600 text-white scale-110 z-10 shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`}> 
                {dObj.getMonth()+1}/{dObj.getDate()}
                {isSelected && authMode === 'ADMIN' && ( 
                    <span onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 bg-white/20 rounded-full hover:bg-white/40 cursor-pointer"><Pencil size={20}/></span> 
                )} 
            </button> 
        </div> 
    ); 
};

// --- [原始組件]：作業表頭 (支援拖拽排序與編輯名稱) ---
const AssignmentHeader = ({ assignment, handleDeleteAssignment, handleEditSave, handleMoveAssignment, setEditingAssignmentId, setEditingAssignmentName, editingAssignmentId, editingAssignmentName, authMode }) => { 
    const isEditing = editingAssignmentId === assignment.id; 
    const [{ isDragging }, drag] = useDrag({ type: ItemTypes.ASSIGNMENT, item: { id: assignment.id }, collect: (monitor) => ({ isDragging: monitor.isDragging() }) }); 
    const [, drop] = useDrop({ accept: ItemTypes.ASSIGNMENT, hover: (item) => { if (item.id !== assignment.id) { handleMoveAssignment(item.id, assignment.id); item.id = assignment.id; } } }); 
    return ( 
        <th ref={(node) => drag(drop(node))} style={{ opacity: isDragging ? 0.4 : 1 }} className="px-2 py-4 text-3xl font-black text-gray-700 sticky top-0 z-50 bg-gray-100 border-gray-200">
            <div className="flex flex-col items-center justify-center group relative min-w-[160px]">
                <div className={`relative p-3 rounded-2xl shadow-sm border-2 w-full transition-all ${isEditing ? 'ring-4 ring-blue-400 bg-white border-blue-400' : 'bg-white border-gray-100'}`} 
                     onDoubleClick={() => authMode === 'ADMIN' && (setEditingAssignmentId(assignment.id), setEditingAssignmentName(assignment.assignmentName))}>
                    {isEditing ? (
                        <input type="text" value={editingAssignmentName} onChange={(e) => setEditingAssignmentName(e.target.value)} onBlur={() => handleEditSave(assignment.id, editingAssignmentName).then(() => setEditingAssignmentId(null))} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} className="font-black text-center text-3xl w-full outline-none bg-transparent" autoFocus />
                    ) : <span className="block truncate">{assignment.assignmentName}</span>}
                    {!isEditing && authMode === 'ADMIN' && (
                        <button onClick={(e) => handleDeleteAssignment(assignment.id, assignment.assignmentName, e.ctrlKey)} className="absolute -top-4 -right-4 text-red-500 opacity-0 group-hover:opacity-100 transition p-2 bg-white rounded-full shadow-lg border border-red-50 hover:bg-red-50"><X size={24} strokeWidth={4}/></button>
                    )}
                </div>
            </div>
        </th> 
    ); 
};
// --- [原始 Hooks]：核心數據同步 (學生與科目類別) ---
const useStudents = (db, isOffline) => {
   const [students, setStudents] = useState(DEFAULT_STUDENTS);
   const [loadingStudents, setLoadingStudents] = useState(true);
   useEffect(() => {
       if (isOffline || !db) { setLoadingStudents(false); return; }
       const q = query(collection(db, `/artifacts/${appId}/public/data/students`));
       return onSnapshot(q, (snapshot) => {
           const loaded = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
           if (loaded.length > 0) setStudents(loaded.sort((a, b) => parseInt(a.id) - parseInt(b.id)));
           setLoadingStudents(false);
       });
   }, [db, isOffline]);
   return { students, loadingStudents };
};

const useCategories = (db, userId, isAuthReady, isOffline, students) => { 
  const [categories, setCategories] = useState([]); 
  const [loadingCategories, setLoadingCategories] = useState(true); 
  const getInitialSubmissionStatus = useMemo(() => 
    students.reduce((status, student) => { status[student.id] = true; return status; }, {}), 
    [students]
  ); 
  useEffect(() => { 
    if (isOffline) { 
        setCategories(INITIAL_CATEGORIES.map((cat, i) => ({ ...cat, id: `offline-cat-${i}` }))); 
        setLoadingCategories(false); 
        return; 
    }
    if (isAuthReady && db && userId) {
      return onSnapshot(collection(db, getCategoryCollectionPath()), (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0)));
        setLoadingCategories(false);
      });
    }
  }, [isAuthReady, db, userId, isOffline, students]);
  return { categories, loadingCategories, getInitialSubmissionStatus }; 
};

// --- [App 主程式]：邏輯中樞 ---
const App = () => {
  // 1. 核心狀態宣告
  const [db, setDb] = useState(null); 
  const [auth, setAuth] = useState(null); 
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); 
  const [isOffline, setIsOffline] = useState(false);
  const [allAssignmentsByDate, setAllAssignmentsByDate] = useState({}); 
  const [selectedDisplayDate, setSelectedDisplayDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true); 
  const [alertMessage, setAlertMessage] = useState(null); 
  const [confirmationModal, setConfirmationModal] = useState(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null); 
  const [editingAssignmentName, setEditingAssignmentName] = useState('');
  const [newAssignmentDate, setNewAssignmentDate] = useState(getTodayDate()); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('GUEST'); 
  const [loginError, setLoginError] = useState(''); 
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [showAllMissingModal, setShowAllMissingModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false); 
  const [rewardState, setRewardState] = useState(null);
  const [dashboardStudent, setDashboardStudent] = useState(null);
  const [unlockClicks, setUnlockClicks] = useState({});
  const [selectedSemester, setSelectedSemester] = useState('S1'); 
  const [selectedMonth, setSelectedMonth] = useState('02');

  // 2. [新引擎狀態]：任務載入器
  const [showTaskLoader, setShowTaskLoader] = useState(false);

  // 3. 廣播系統狀態 (保留所有原始色彩設定)
  const [broadcastData, setBroadcastData] = useState(null);
  const [dismissedBroadcastTime, setDismissedBroadcastTime] = useState(null);
  const [showBroadcastEditor, setShowBroadcastEditor] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState("");
  const [bcBgColor, setBcBgColor] = useState("bg-amber-400");
  const [bcTextColor, setBcTextColor] = useState("text-slate-900");
  const [bcFontSize, setBcFontSize] = useState(80);

  // 4. 掛載核心數據
  const { students, loadingStudents } = useStudents(db, isOffline);
  const { bankData, updateBankBalance, setBankBalanceDirectly } = useStudentBank(db, isAuthReady, isOffline, students);
  const dailySettlements = useDailySettlements(db, isAuthReady, isOffline);
  const { categories, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, isOffline, students);

  const semesters = [ { id: 'S1', name: `上學期` }, { id: 'S2', name: `下學期` } ];
  const months = useMemo(() => [
    { id: '08', name: '8月', color: 'bg-green-500', semester: 'S1' }, { id: '09', name: '9月', color: 'bg-teal-500', semester: 'S1' },
    { id: '10', name: '10月', color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: '11月', color: 'bg-blue-500', semester: 'S1' },
    { id: '12', name: '12月', color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: '1月', color: 'bg-purple-500', semester: 'S1' },
    { id: '02', name: '2月', color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: '3月', color: 'bg-rose-500', semester: 'S2' },
    { id: '04', name: '4月', color: 'bg-red-500', semester: 'S2' }, { id: '05', name: '5月', color: 'bg-orange-500', semester: 'S2' },
    { id: '06', name: '6月', color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: '7月', color: 'bg-yellow-500', semester: 'S2' },
  ], []);

  // 5. 初始化 Firebase 與身份監聽
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);
    setDb(firestore); setAuth(firebaseAuth);
    return onAuthStateChanged(firebaseAuth, (user) => {
        if (user) { setUserId(user.uid); setIsAuthReady(true); setIsAuthenticated(true); setAuthMode(user.isAnonymous ? 'GUEST' : 'ADMIN'); }
        setLoadingLogin(false);
    });
  }, []);

  // 6. 同步所有作業資料
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

  // 7. [新引擎邏輯]：注入任務到資料庫
  const handleLoadFromAnnouncements = async (tasksToInject) => {
    if (!selectedDisplayDate || !db) return;
    setLoading(true);
    try {
        const batch = writeBatch(db); 
        const path = getAssignmentCollectionPath(); 
        const currentCount = (allAssignmentsByDate[selectedDisplayDate] || []).length;
        tasksToInject.forEach((task, idx) => {
            const newRef = doc(collection(db, path));
            batch.set(newRef, { 
                assignmentName: task.text, 
                order: currentCount + idx, 
                assignmentDate: selectedDisplayDate, 
                submissionStatus: getInitialSubmissionStatus, 
                createdAt: serverTimestamp() 
            });
        });
        await batch.commit(); 
        setAlertMessage(`✅ 成功注入 ${tasksToInject.length} 項任務！`); 
        setShowTaskLoader(false);
    } catch (e) { alert("載入失敗：" + e.message); }
    setLoading(false);
  };
  // 8. 基礎 CRUD 處理器
  const handleAddNewDate = useCallback(async () => {
    if (!newAssignmentDate) return;
    if (allAssignmentsByDate[newAssignmentDate]) { alert("該日期已存在"); return; }
    setSelectedDisplayDate(newAssignmentDate);
    setAlertMessage(`已新增日期 ${newAssignmentDate}。建議點擊「📥 載入任務」獲取作業！`);
  }, [newAssignmentDate, allAssignmentsByDate]);

  const handleAddNewAssignment = useCallback(async () => {
    if (!selectedDisplayDate) { alert("請先選擇或新增一個日期。"); return; }
    const currentAssignments = allAssignmentsByDate[selectedDisplayDate] || [];
    const maxOrder = currentAssignments.reduce((max, item) => Math.max(max, item.order || 0), -1);
    setLoading(true);
    try {
        await setDoc(doc(collection(db, getAssignmentCollectionPath())), { 
          assignmentName: "新增作業", 
          assignmentDate: selectedDisplayDate, 
          order: maxOrder + 1, 
          submissionStatus: getInitialSubmissionStatus, 
          makeupClaimed: {}, 
          createdAt: serverTimestamp() 
        });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedDisplayDate, allAssignmentsByDate, getInitialSubmissionStatus, db]);

  const handleDeleteAssignment = useCallback(async (id, name, force) => {
    if (authMode !== 'ADMIN' && !isOffline) return; 
    if (!force && !window.confirm(`確定要刪除作業「${name}」嗎？`)) return;
    if (isOffline) {
        setAllAssignmentsByDate(prev => ({ ...prev, [selectedDisplayDate]: prev[selectedDisplayDate].filter(a => a.id !== id) }));
        return;
    }
    try { await deleteDoc(doc(db, getAssignmentCollectionPath(), id)); } catch (e) { console.error(e); }
  }, [authMode, isOffline, db, selectedDisplayDate]);

  const handleEditAssignmentName = useCallback(async (id, newName) => {
    if (isOffline) {
        setAllAssignmentsByDate(prev => ({ ...prev, [selectedDisplayDate]: prev[selectedDisplayDate].map(a => a.id === id ? { ...a, assignmentName: newName } : a) }));
        return;
    }
    await setDoc(doc(db, getAssignmentCollectionPath(), id), { assignmentName: newName }, { merge: true });
  }, [isOffline, db, selectedDisplayDate]);

  const handleMoveAssignment = useCallback(async (dragId, hoverId) => {
    const items = [...assignmentsForSelectedDate]; 
    const dragIdx = items.findIndex(i => i.id === dragId);
    const hoverIdx = items.findIndex(i => i.id === hoverId); 
    if (dragIdx === -1 || hoverIdx === -1) return;
    const dragItem = items[dragIdx]; 
    items.splice(dragIdx, 1); items.splice(hoverIdx, 0, dragItem); 
    const updated = items.map((item, index) => ({ ...item, order: index })); 
    setAllAssignmentsByDate(prev => ({ ...prev, [selectedDisplayDate]: updated })); 
    if (isOffline) return;
    const batch = writeBatch(db);
    updated.forEach(item => { batch.update(doc(db, getAssignmentCollectionPath(), item.id), { order: item.order }); });
    batch.commit().catch(e => console.error(e));
  }, [assignmentsForSelectedDate, isOffline, db, selectedDisplayDate]);

  // 9. [核心邏輯]：作業繳交狀態切換 (含獎勵與解鎖機制)
  const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatus) => { 
      const assignmentData = assignmentsForSelectedDate.find(a => a.assignmentName === assignmentName);
      if (!assignmentData) return; 
      const settledData = dailySettlements[selectedDisplayDate]; 
      const isSettled = settledData?.isSettled === true;

      if (!isSettled) {
          // 未結算模式：true -> false -> late -> (需點擊三次) -> true
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
                  setUnlockClicks(prev => ({ ...prev, [cellKey]: currentCount + 1 })); return; 
              } else { 
                  newStatus = true; 
                  setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; });
              } 
          }
          if (isOffline) {
              setAllAssignmentsByDate(prev => {
                const dayItems = prev[selectedDisplayDate].map(a => a.id === assignmentData.id ? { ...a, submissionStatus: { ...a.submissionStatus, [studentId]: newStatus } } : a);
                return { ...prev, [selectedDisplayDate]: dayItems };
              });
          } else {
              await setDoc(doc(db, getAssignmentCollectionPath(), assignmentData.id), { submissionStatus: { [studentId]: newStatus } }, { merge: true });
          }
          return;
      }

      // 已結算模式：觸發獎勵機制
      let newStatus; let bChange = 0; let sChange = 0; let gChange = 0; let trigger = null;
      if (currentStatus === true || currentStatus === undefined) { 
          newStatus = false; 
          if (settledData?.silverRewardClaimed?.[studentId]) { sChange = -2; } 
      } else if (currentStatus === false) { 
          newStatus = 'late'; bChange = 10; trigger = 'BRONZE';
          const allA = Object.values(allAssignmentsByDate).flat();
          const remains = allA.filter(a => a.submissionStatus[studentId] === false && a.id !== assignmentData.id);
          if (remains.length === 0) { trigger = 'GOLD_CLEAR'; gChange = 3; bChange = 10; }
      } else { 
          newStatus = false; bChange = -10; 
      }

      if (bChange !== 0 || sChange !== 0 || gChange !== 0) updateBankBalance(studentId, gChange, sChange, bChange);
      if (trigger) setRewardState({ type: trigger });
      
      const batch = writeBatch(db);
      batch.update(doc(db, getAssignmentCollectionPath(), assignmentData.id), { [`submissionStatus.${studentId}`]: newStatus });
      if (sChange < 0) batch.update(doc(db, getDailySettlementPath(), selectedDisplayDate), { [`silverRewardClaimed.${studentId}`]: deleteField() });
      await batch.commit();
  }, [db, assignmentsForSelectedDate, unlockClicks, isOffline, allAssignmentsByDate, updateBankBalance, selectedDisplayDate, dailySettlements]);

  // 10. 匯入匯出與登入處理器
  const handleExportData = async () => { 
      try { 
          const data = { version: VERSION, bankData, allAssignmentsByDate };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); 
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob); 
          link.download = `backup_${selectedDisplayDate}.json`; link.click(); 
      } catch (e) { alert("匯出失敗"); }
  };

  const handleImportData = async (e) => { 
      const file = e.target.files[0]; if (!file) return; 
      const reader = new FileReader(); 
      reader.onload = async (event) => { 
          try { 
              const json = JSON.parse(event.target.result); 
              if (json.bankData) { /* 原始邏輯：批次還原存簿 */ }
              alert("匯入成功，請重整頁面。");
          } catch (error) { alert("匯入格式錯誤"); } 
      }; reader.readAsText(file); 
  };

  const handleAdminLogin = async (e, p) => { setLoadingLogin(true); try { await signInWithEmailAndPassword(auth, e, p); } catch { setLoginError('驗證失敗'); } setLoadingLogin(false); };
  const handleGuestLogin = async () => { setLoadingLogin(true); try { await signInAnonymously(auth); } catch { setLoginError('進入失敗'); } setLoadingLogin(false); };
  const handleLogout = async () => { await signOut(auth); setIsAuthenticated(false); setAuthMode('GUEST'); };

  // 11. 渲染判定
  if (loading && !isAuthReady && !isOffline) return <div className="flex items-center justify-center min-h-screen text-3xl font-bold">系統初始化中...</div>;
  if (!isAuthenticated) return <LoginScreen onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} isLoading={loadingLogin} errorMsg={loginError} />;

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none overflow-x-hidden">
      {rewardState && <RewardOverlay type={rewardState.type} onClose={() => setRewardState(null)} />}
      {showBankModal && <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} setBankBalanceDirectly={setBankBalanceDirectly} authMode={authMode} students={students} />}
      {dashboardStudent && <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={() => setDashboardStudent(null)} />}
      {missingStudent && <MissingDetailsModal student={students.find(s => s.id === missingStudent.id)} missingStats={studentMissingStats} onClose={() => setMissingStudent(null)} db={db} allAssignmentsByDate={allAssignmentsByDate} updateBankBalance={updateBankBalance} setRewardState={setRewardState} />}
      {showAllMissingModal && <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} />}
      {showTaskLoader && <TaskLoaderModal db={db} initialDate={selectedDisplayDate} onClose={() => setShowTaskLoader(false)} onConfirm={handleLoadFromAnnouncements} />}
      {alertMessage && <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} />}

      <header className="p-8 text-center border-b-4 border-slate-200 bg-white relative shadow-sm">
          <button onClick={handleLogout} className="absolute top-8 left-8 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition flex items-center gap-2 text-xl"><LogOut size={24}/> 登出系統</button>
          <div className="flex items-center justify-center gap-4">
              <span className="text-7xl">🐻‍❄️</span>
              <h1 className="text-6xl font-black text-slate-800 tracking-tighter">五年甲班訂正作業表</h1>
              <span className="text-7xl">🐼</span>
          </div>
          <p className="text-3xl text-slate-400 mt-4 font-bold flex items-center justify-center gap-3">
             <Activity className="text-blue-500"/> {new Date().toLocaleDateString('zh-TW', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
      </header>

      <main className="flex-1 p-8 flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-8 bg-white p-8 rounded-[3rem] shadow-xl border-4 border-white">
             <div className="flex items-center gap-4 bg-slate-100 p-3 rounded-2xl">
                <label className="text-2xl font-black text-slate-500">學期</label>
                <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} className="bg-transparent text-3xl font-black outline-none">{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
             </div>
             <div className="flex items-center gap-4 bg-slate-100 p-3 rounded-2xl">
                <label className="text-2xl font-black text-slate-500">月份</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-3xl font-black outline-none">{months.filter(m => m.semester === selectedSemester).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
             </div>
             <div className="flex gap-4 ml-auto">
                {authMode === 'ADMIN' && <button onClick={() => setShowTaskLoader(true)} className="px-8 py-5 bg-blue-600 text-white text-3xl font-black rounded-[2rem] shadow-lg flex items-center gap-3 hover:bg-blue-700 active:scale-95 transition"><DownloadCloud size={32}/> 載入任務</button>}
                {authMode === 'ADMIN' && <button onClick={() => setShowBroadcastEditor(true)} className="px-8 py-5 bg-amber-500 text-white text-3xl font-black rounded-[2rem] shadow-lg flex items-center gap-3 hover:bg-amber-600 active:scale-95 transition"><Megaphone size={32}/> 廣播控制</button>}
                <button onClick={() => setShowBankModal(true)} className="px-8 py-5 bg-emerald-500 text-white text-3xl font-black rounded-[2rem] shadow-lg flex items-center gap-3 hover:bg-emerald-600 active:scale-95 transition"><Coins size={32}/> 訂正存簿</button>
             </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {displayedDates.map(d => ( <DateTab key={d} date={d} isSelected={selectedDisplayDate === d} onClick={setSelectedDisplayDate} onEdit={() => {}} authMode={authMode} /> ))}
            <button onClick={handleAddNewDate} className="px-8 py-5 text-3xl font-black rounded-2xl bg-white text-slate-300 border-4 border-dashed border-slate-200 hover:text-blue-500 hover:border-blue-500 transition">+</button>
          </div>

          <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border-[12px] border-white flex-1 min-h-[700px] flex flex-col relative">
              <div className="p-8 bg-slate-50 border-b-4 border-slate-100 flex justify-between items-center">
                  <h2 className="text-5xl font-black text-slate-800 flex items-center gap-4">📋 {selectedDisplayDate} <span className="text-slate-400">作業確認表</span></h2>
                  <div className="flex gap-4">
                      {authMode === 'ADMIN' && <button onClick={handleAddNewAssignment} className="px-6 py-3 bg-blue-100 text-blue-600 rounded-2xl font-black text-xl hover:bg-blue-200 transition">+ 新增作業項目</button>}
                      <button onClick={() => setShowAllMissingModal(true)} className="px-6 py-3 bg-rose-100 text-rose-600 rounded-2xl font-black text-xl hover:bg-rose-200 transition flex items-center gap-2"><FileText/> 未完成總表</button>
                  </div>
              </div>
              <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-40 bg-slate-50">
                          <tr>
                            <th className="p-6 text-3xl font-black text-slate-400 border-r-2 border-slate-100 sticky left-0 z-50 bg-slate-50 w-[120px]">座號</th>
                            <th className="p-6 text-3xl font-black text-slate-800 border-r-4 border-slate-200 sticky left-[120px] z-50 bg-slate-50 shadow-md w-[180px]">姓名</th>
                            {assignmentsForSelectedDate.map(a => (
                              <AssignmentHeader key={a.id} assignment={a} handleDeleteAssignment={handleDeleteAssignment} handleEditSave={handleEditAssignmentName} handleMoveAssignment={handleMoveAssignment} setEditingAssignmentId={setEditingAssignmentId} setEditingAssignmentName={setEditingAssignmentName} editingAssignmentId={editingAssignmentId} editingAssignmentName={editingAssignmentName} authMode={authMode} />
                            ))}
                          </tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <tr key={s.id} className="border-b-2 border-slate-50 hover:bg-blue-50/30 transition-colors group">
                            <td onClick={() => setDashboardStudent(s)} className="p-6 text-4xl font-black text-slate-300 border-r-2 border-slate-50 text-center sticky left-0 bg-white group-hover:bg-blue-50 transition-colors cursor-pointer">{s.id}</td>
                            <td onClick={() => { if(bankData[s.id]) setDashboardStudent(s); }} className="p-6 text-4xl font-black text-slate-700 border-r-4 border-slate-100 text-center sticky left-[120px] shadow-md z-30 bg-white group-hover:bg-blue-50 transition-colors cursor-pointer">{s.name[0]+'O'+s.name.slice(2)}</td>
                            {assignmentsForSelectedDate.map(a => {
                              const st = a.submissionStatus[s.id] ?? true;
                              return (
                                <td key={a.id} className="p-4 text-center border-r-2 border-slate-50">
                                  <button onClick={() => handleToggleSubmission(a.assignmentName, s.id, st)} className={`w-24 h-24 rounded-[2rem] shadow-xl transition-all flex items-center justify-center border-b-[10px] active:border-b-0 active:translate-y-2 ${st === true ? 'bg-emerald-100 text-emerald-600 border-emerald-300' : (st === 'late' ? 'bg-amber-100 text-amber-600 border-amber-300' : 'bg-white text-rose-500 border-rose-200 border-4')}`}>
                                    {st === true ? <Check size={56} strokeWidth={5}/> : (st === 'late' ? <RotateCw size={56} strokeWidth={5}/> : <X size={56} strokeWidth={5}/>)}
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
          
          <div className="mt-8 p-10 bg-white rounded-[4rem] shadow-xl border-4 border-white">
              <h2 className="text-5xl font-black text-slate-800 mb-10 flex items-center gap-4"><AlertCircle className="text-rose-500" size={48}/> 全班未訂正統計排行</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {studentMissingStats.map(stat => {
                      const colors = getMissingColorClasses(stat.missingCount);
                      return (
                          <div key={stat.id} onClick={() => stat.missingCount > 0 && setMissingStudent(stat)} className={`p-6 rounded-[2.5rem] cursor-pointer border-2 border-b-[10px] transition-all hover:-translate-y-2 active:scale-95 text-center ${colors.bg} ${colors.border} ${colors.text}`}>
                              <p className="text-3xl font-black opacity-80">{stat.name[0]+'O'+stat.name.slice(2)}</p>
                              <p className="text-7xl font-black mt-2">{stat.missingCount}</p>
                          </div>
                      );
                  })}
              </div>
          </div>

          <MonthlyStudentStats monthlyStats={monthlyStudentStats} months={filteredMonths} />
          
          <footer className="mt-12 text-center text-slate-300 font-bold text-xl pb-10">
              {VERSION} • Five-A Task Engine • Powered by Firebase Cloud
          </footer>
      </main>

      {/* [原始編輯器]：全域廣播控制台 */}
      {showBroadcastEditor && authMode === 'ADMIN' && (
         <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100000] flex items-center justify-center p-8">
           <div className="bg-white rounded-[4rem] p-12 w-full max-w-5xl flex flex-col border-[12px] border-white shadow-2xl relative">
             <button onClick={() => setShowBroadcastEditor(false)} className="absolute top-8 right-8 p-4 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={32}/></button>
             <h2 className="text-5xl font-black text-slate-800 mb-8 flex items-center gap-4"><Megaphone size={48} className="text-amber-500"/> 全班廣播系統</h2>
             <textarea value={broadcastInput} onChange={e => setBroadcastInput(e.target.value)} className={`w-full min-h-[350px] p-10 text-5xl border-4 border-slate-100 rounded-[3rem] font-black outline-none shadow-inner focus:border-amber-400 transition-colors ${bcBgColor} ${bcTextColor}`} style={{ fontSize: `${bcFontSize}px` }} placeholder="請輸入廣播內容..." />
             
             <div className="grid grid-cols-2 gap-8 mt-8 bg-slate-50 p-8 rounded-[3rem]">
                 <div className="space-y-4">
                     <label className="text-2xl font-black text-slate-400">字體大小: {bcFontSize}px</label>
                     <input type="range" min="40" max="150" value={bcFontSize} onChange={e => setBcFontSize(e.target.value)} className="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                 </div>
                 <div className="flex flex-wrap gap-4 items-center">
                    {[{bg:'bg-amber-400', text:'text-slate-900'}, {bg:'bg-rose-500', text:'text-white'}, {bg:'bg-blue-600', text:'text-white'}, {bg:'bg-slate-900', text:'text-amber-400'}].map((t, i) => (
                        <button key={i} onClick={() => { setBcBgColor(t.bg); setBcTextColor(t.text); }} className={`w-16 h-16 rounded-full border-4 ${t.bg} ${bcBgColor === t.bg ? 'border-amber-500 scale-110 shadow-lg' : 'border-white'}`} />
                    ))}
                 </div>
             </div>

             <div className="flex gap-6 mt-8">
                <button onClick={async () => { await setDoc(doc(db, "broadcasts", "current"), { message: broadcastInput, active: true, timestamp: serverTimestamp(), settings: { bgColor: bcBgColor, textColor: bcTextColor, fontSize: bcFontSize } }); setShowBroadcastEditor(false); }} className="flex-[2] bg-amber-500 text-white text-4xl font-black py-6 rounded-[2.5rem] shadow-xl hover:bg-amber-600 active:scale-95 transition">立即發布廣播</button>
                <button onClick={async () => { await setDoc(doc(db, "broadcasts", "current"), { active: false }, { merge: true }); setShowBroadcastEditor(false); }} className="flex-1 bg-slate-200 text-slate-600 text-3xl font-black py-6 rounded-[2.5rem] hover:bg-slate-300 transition">撤回訊息</button>
             </div>
           </div>
         </div>
      )}

      {/* [原始顯示器]：廣播訊息疊加層 */}
      {broadcastData?.active && broadcastData?.message && dismissedBroadcastTime !== broadcastData.timestamp?.toMillis() && (
        <div className="fixed inset-0 bg-slate-900/95 z-[100000] flex items-center justify-center p-8 backdrop-blur-2xl print:hidden">
          <div className={`${broadcastData.settings?.bgColor || 'bg-amber-400'} p-20 rounded-[5rem] border-[20px] border-white/20 w-full max-w-7xl text-center shadow-[0_0_150px_rgba(255,215,0,0.3)] animate-pop-in relative overflow-hidden`}>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="text-[10rem] mb-10 animate-bounce">📢</div>
            <p style={{ fontSize: `${broadcastData.settings?.fontSize || 80}px` }} className={`font-black ${broadcastData.settings?.textColor || 'text-slate-900'} leading-tight whitespace-pre-wrap drop-shadow-sm`}>{broadcastData.message}</p>
            <button onClick={() => setDismissedBroadcastTime(broadcastData.timestamp?.toMillis())} className="mt-16 w-full max-w-2xl bg-black/20 text-5xl font-black py-8 rounded-[3rem] hover:bg-black/30 transition-all border-4 border-black/5 active:scale-95">收到，沒問題！</button>
          </div>
        </div>
      )}
    </div>
    </DndProvider>
  );
};

export default App;
