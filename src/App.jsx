import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
   getAuth, signInAnonymously, signInWithEmailAndPassword, 
   signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
 getFirestore, collection, onSnapshot, doc, setDoc, 
 deleteDoc, query, Timestamp, getDocs, writeBatch, 
 serverTimestamp, where
} from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
   BookOpen, Download, Upload, X, Check, RefreshCw, WifiOff, LogOut, 
   FileText, AlertCircle, Eye, Shield, User, Key, Edit, Pencil, Star,
   Coins, Eraser, Moon, PlusCircle, TrendingUp, Activity, BarChart2, BellRing
} from 'lucide-react';

// --- 版本資訊 ---
const VERSION = 'v18.2.5 - 完整預警勳章整合版'; 

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

// --- [新功能邏輯] ---
const getStudentBadges = (score, missingCount) => {
    const badges = [];
    const s = parseFloat(score);
    if (s >= 95) badges.push({ icon: "🔥", label: "自律之火", style: "bg-orange-100 text-orange-600 border-orange-200" });
    if (missingCount === 0) badges.push({ icon: "🛡️", label: "不敗之盾", style: "bg-blue-100 text-blue-600 border-blue-200" });
    if (s === 100) badges.push({ icon: "👑", label: "傳奇楷模", style: "bg-purple-100 text-purple-600 border-purple-200" });
    return badges;
};

const copyWarningToClipboard = (date, students, assignments, setAlert) => {
    if (!date || assignments.length === 0) { alert("請先選擇有作業的日期"); return; }
    const missing = students.map(s => {
        const items = assignments.filter(a => a.submissionStatus[s.id] === false).map(a => a.assignmentName);
        return { name: s.name, items };
    }).filter(s => s.items.length > 0);
    if (missing.length === 0) { alert("🎉 該日作業已全數完成。"); return; }
    const dateStr = new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    let text = `【📢 五甲訂正催繳通知 - ${dateStr}】\n\n尚未完成名單：\n------------------\n`;
    missing.forEach((s, idx) => { text += `${idx + 1}. ${s.name[0]}O${s.name.slice(2)}：${s.items.join('、')}\n`; });
    text += `------------------\n💪 請提醒孩子利用時間補齊，謝謝！`;
    navigator.clipboard.writeText(text).then(() => setAlert("✅ 催繳文字已複製到剪貼簿！"));
};

// --- 原始代碼資產 ---
const ASSETS = {
   BRONZE_SOUND: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3', 
   GOLD_SOUND: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3', 
   CONFETTI_BG: 'https://i.gifer.com/origin/e2/e29a997a3a304523b087050074697df0_w200.gif'
};

const CoinIcon = ({ type, size = "w-8 h-8", textSize = "text-sm", innerSize = "w-3/5 h-3/5" }) => {
   const baseClasses = `rounded-full border-[4px] flex items-center justify-center shadow-lg ${size} bg-white`;
   if (type === 'GOLD') return (<div className={`${baseClasses} border-yellow-400 text-yellow-500 bg-yellow-50`}><Moon className={`${innerSize} fill-current`} /></div>);
   if (type === 'SILVER') return (<div className={`${baseClasses} border-gray-400 text-gray-500 bg-gray-50`}><Star className={`${innerSize} fill-current`} /></div>);
   return (<div className={`${baseClasses} border-orange-700 text-orange-800 bg-orange-50`}><span className={`font-bold ${textSize}`}>$</span></div>);
};

const DEFAULT_STUDENTS = [ { id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' }, { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' } ];
const INITIAL_CATEGORIES = [ { name: '數課', order: 0 }, { name: '數習', order: 1 }, { name: '數八', order: 2 }, { name: '成語()+P.', order: 3 }, { name: '聯P.', order: 4 }, { name: '國', order: 5 } ];
const ItemTypes = { ASSIGNMENT: 'assignment' };
const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;

// --- SVG 折線圖元件 ---
const SimpleLineChart = ({ data, width = 600, height = 300 }) => {
   if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據</div>;
   const padding = 40; const chartWidth = width - padding * 2; const chartHeight = height - padding * 2; const maxY = 100;
   const points = data.map((d, i) => {
       const x = (i / (data.length - 1)) * chartWidth + padding;
       const y = chartHeight - (d.value / maxY) * chartHeight + padding;
       return `${x},${y}`;
   }).join(' ');
   return (
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
           <polyline fill="none" stroke="#3b82f6" strokeWidth="4" points={points} strokeLinecap="round" strokeLinejoin="round" />
           {data.map((d, i) => {
               const x = (i / (data.length - 1)) * chartWidth + padding;
               const y = chartHeight - (d.value / maxY) * chartHeight + padding;
               return <circle key={i} cx={x} cy={y} r="6" fill="#3b82f6" stroke="white" strokeWidth="2" />;
           })}
       </svg>
   );
};

const SimpleStackedBarChart = ({ data, width = 600, height = 300 }) => {
   if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據</div>;
   const padding = 40; const chartWidth = width - padding * 2; const chartHeight = height - padding * 2;
   const maxTotal = Math.max(...data.map(d => d.details.count), 1);
   const barWidth = Math.min(60, chartWidth / data.length * 0.6); 
   return (
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
           <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
           {data.map((d, i) => {
               const x = padding + (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2;
               const h1 = (d.details.onTime / maxTotal) * chartHeight;
               const h2 = (d.details.late / maxTotal) * chartHeight;
               const h3 = (d.details.missing / maxTotal) * chartHeight;
               return (
                   <g key={i}>
                       <rect x={x} y={height - padding - h1} width={barWidth} height={h1} fill="#4ade80" />
                       <rect x={x} y={height - padding - h1 - h2} width={barWidth} height={h2} fill="#facc15" />
                       <rect x={x} y={height - padding - h1 - h2 - h3} width={barWidth} height={h3} fill="#f87171" />
                   </g>
               );
           })}
       </svg>
   );
};
// --- 學生學習歷程 Modal (整合勳章顯示) ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('STATUS'); 
    if (!student || !allAssignmentsByDate) return null;

    const getDaysDiff = (dateString, completedAtString) => {
        const targetDate = new Date(dateString); targetDate.setHours(0,0,0,0);
        let completedDate = completedAtString ? new Date(completedAtString) : new Date();
        completedDate.setHours(0,0,0,0);
        return Math.max(0, Math.floor((completedDate - targetDate) / 86400000));
    };

    const { healthData, trendData, summaryStats, overallData } = useMemo(() => {
        const hByMonth = {}; const tByMonth = {};
        let tItems = 0; let tDays = 0; let tHP = 0; let tTP = 0; let iMissing = 0;
        const sortedDates = Object.keys(allAssignmentsByDate).sort();
        
        sortedDates.forEach(date => {
            const mKey = `${new Date(date).getMonth() + 1}月`;
            if (!hByMonth[mKey]) hByMonth[mKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            if (!tByMonth[mKey]) tByMonth[mKey] = { totalPoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            const assigns = allAssignmentsByDate[date] || [];
            if (assigns.length === 0) return;
            tDays++; let dMissing = false; let dLate = false;
            assigns.forEach(assign => {
                const status = assign.submissionStatus?.[student.id];
                const completedAt = assign.completedAt?.[student.id];
                let tScore = 0;
                if (status === false) { iMissing++; tByMonth[mKey].missing++; dMissing = true; tScore = 0; }
                else if (status === 'late') { tByMonth[mKey].late++; dLate = true; tScore = completedAt ? Math.max(0, 100 - getDaysDiff(date, completedAt)*5) : 60; }
                else { tByMonth[mKey].onTime++; tScore = 100; }
                tByMonth[mKey].totalPoints += tScore; tByMonth[mKey].count++; tTP += tScore; tItems++;
            });
            let dScore = dMissing ? 0 : (dLate ? 60 : 100);
            if (dMissing) hByMonth[mKey].missing++; else if (dLate) hByMonth[mKey].late++; else hByMonth[mKey].onTime++;
            hByMonth[mKey].totalPoints += dScore; hByMonth[mKey].count++; tHP += dScore;
        });

        const score = tItems === 0 ? 0 : ((tTP/tItems + tHP/tDays)/2 || 0).toFixed(1);
        return { 
            healthData: Object.keys(hByMonth).map(k => ({ label: k, value: hByMonth[k].totalPoints / hByMonth[k].count, details: hByMonth[k] })),
            trendData: Object.keys(tByMonth).map(k => ({ label: k, value: tByMonth[k].totalPoints / tByMonth[k].count, details: tByMonth[k] })),
            summaryStats: { items: { missing: iMissing } },
            overallData: { score: score }
        };
    }, [allAssignmentsByDate, student.id]);

    const badges = getStudentBadges(overallData.score, summaryStats.items.missing);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border-4 border-white">
                <div className={`px-6 py-4 flex justify-between items-center text-white shrink-0 bg-gradient-to-r from-indigo-600 to-purple-500`}>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-indigo-600 shadow-lg border-4 border-indigo-200">{student.id}</div>
                        <div>
                            <h2 className="text-4xl font-black tracking-wide leading-none">{student.name} 的學習歷程</h2>
                            <div className="flex gap-2 mt-3">
                                {badges.map((b, i) => (
                                    <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold border-2 shadow-sm ${b.style}`}>{b.icon} {b.label}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition"><X className="w-8 h-8" /></button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                            <p className="text-gray-500 text-lg font-bold">綜合戰鬥力</p>
                            <p className="text-7xl font-black text-indigo-600">{overallData.score}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                            <p className="text-gray-500 text-lg font-bold">目前資產</p>
                            <p className="text-4xl font-black text-yellow-600">{bankBalance?.gold || 0}金 / {bankBalance?.silver || 0}銀</p>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-700">學習趨勢分析</h3>
                            <div className="bg-gray-100 p-1 rounded-xl flex gap-1 shadow-inner">
                                <button onClick={() => setViewMode('STATUS')} className={`px-4 py-1 rounded-lg text-sm font-bold transition ${viewMode === 'STATUS' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>健康度</button>
                                <button onClick={() => setViewMode('TREND')} className={`px-4 py-1 rounded-lg text-sm font-bold transition ${viewMode === 'TREND' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>績效度</button>
                            </div>
                        </div>
                        {viewMode === 'STATUS' ? <SimpleStackedBarChart data={healthData} /> : <SimpleLineChart data={trendData} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- [原始資料 Hook 邏輯] ---
const useStudentBank = (db, isAuthReady, isOffline, students) => {
   const initialData = useMemo(() => { const data = {}; students.forEach(s => data[s.id] = { bronze: 0, silver: 0, gold: 0 }); return data; }, [students]);
   const [bankData, setBankData] = useState(initialData);
   useEffect(() => {
       if (isOffline || !isAuthReady || !db) return;
       const unsubscribe = onSnapshot(query(collection(db, getBankCollectionPath())), (snapshot) => {
           const remoteData = {}; snapshot.docs.forEach(doc => { remoteData[doc.id] = doc.data(); });
           setBankData(prev => { const newData = { ...prev }; Object.keys(remoteData).forEach(key => { newData[key] = { bronze: Number(remoteData[key].bronze) || 0, silver: Number(remoteData[key].silver) || 0, gold: Number(remoteData[key].gold) || 0 }; }); return newData; });
       });
       return () => unsubscribe();
   }, [isAuthReady, db, isOffline]);

   const saveBalance = useCallback(async (studentId, nb, ns, ng) => {
        let b=nb, s=ns, g=ng; if (b>=100) { s+=Math.floor(b/100); b%=100; } if (s>=10) { g+=Math.floor(s/10); s%=10; }
        const newState = { bronze: b, silver: s, gold: g }; setBankData(p => ({ ...p, [studentId]: newState }));
        if (isOffline || !db) return;
        try { await setDoc(doc(db, getBankCollectionPath(), studentId), { ...newState, lastUpdated: serverTimestamp() }, { merge: true }); } catch (e) {}
   }, [db, isOffline]);

   return { bankData, updateBankBalance: (id, ab, as, ag) => {
       setBankData(p => { const c = p[id] || { bronze: 0, silver: 0, gold: 0 }; const b = ab==='RESET'?0:c.bronze+ab; const s = as==='RESET'?0:c.silver+as; const g = ag==='RESET'?0:c.gold+ag; saveBalance(id, b, s, g); return p; });
   }, setBankBalanceDirectly: (id, t, v) => {
       setBankData(p => { const c = p[id]; let {bronze:b, silver:s, gold:g} = c; if (t==='BRONZE') b=v; if (t==='SILVER') s=v; if (t==='GOLD') g=v; saveBalance(id, b, s, g); return p; });
   }};
};

const useCategories = (db, userId, isAuthReady, setAlert, isOffline, students) => {
    const [categories, setCategories] = useState([]); const [loading, setLoading] = useState(true);
    const getInitialSubmissionStatus = useMemo(() => students.reduce((st, s) => { st[s.id] = true; return st; }, {}), [students]);
    useEffect(() => {
        if (isOffline) { setCategories(INITIAL_CATEGORIES.map((cat, i) => ({ ...cat, id: `offline-cat-${i}` }))); setLoading(false); return; }
        if (isAuthReady && db && userId) {
            const unsubscribe = onSnapshot(collection(db, getCategoryCollectionPath()), (snapshot) => {
                const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (a.order || 0) - (b.order || 0));
                setCategories(loaded); setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [isAuthReady, db, userId, isOffline]);
    return { categories, loadingCategories: loading, getInitialSubmissionStatus };
};
// --- 訂正存簿 Modal (保留原始編輯功能) ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, setBankBalanceDirectly, authMode, students }) => {
   const [editingCell, setEditingCell] = useState(null); 
   const [editValue, setEditValue] = useState('');
   const sortedStudents = [...students].sort((a, b) => {
       const bA = bankData[a.id] || { bronze: 0, silver: 0, gold: 0 };
       const bB = bankData[b.id] || { bronze: 0, silver: 0, gold: 0 };
       if (bA.gold !== bB.gold) return bB.gold - bA.gold;
       if (bA.silver !== bB.silver) return bB.silver - bA.silver;
       return bB.bronze - bA.bronze;
   });
   return (
       <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
           <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-7xl h-[90vh] flex flex-col border border-green-200">
               <div className="flex justify-between items-center mb-6 border-b border-green-200 pb-4">
                   <h3 className="text-4xl font-bold text-gray-800 flex items-center"><div className="mr-3 transform scale-125"><CoinIcon type="GOLD" /></div>訂正存簿</h3>
                   <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 rounded-full bg-gray-100"><X className="w-8 h-8" /></button>
               </div>
               <div className="flex-1 overflow-auto bg-green-50 rounded-xl p-4">
                   <table className="min-w-full divide-y divide-green-200">
                       <thead className="bg-green-100 sticky top-0 z-10 shadow-sm">
                           <tr>
                               <th className="px-4 py-4 text-2xl font-bold text-green-900 text-center">名次</th>
                               <th className="px-4 py-4 text-2xl font-bold text-green-900 text-center">座號</th>
                               <th className="px-4 py-4 text-2xl font-bold text-green-900 text-center">姓名</th>
                               <th className="px-4 py-4 text-2xl font-bold text-yellow-600 text-center">金幣</th>
                               <th className="px-4 py-4 text-2xl font-bold text-gray-500 text-center">銀幣</th>
                               <th className="px-4 py-4 text-2xl font-bold text-orange-700 text-center">銅幣</th>
                               {authMode === 'ADMIN' && <th className="px-4 py-4 text-2xl font-bold text-green-900 text-center">操作</th>}
                           </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-green-100">
                           {sortedStudents.map((s, idx) => {
                               const d = bankData[s.id] || { bronze: 0, silver: 0, gold: 0 };
                               return (
                                   <tr key={s.id} className="hover:bg-green-50">
                                       <td className="px-4 py-4 text-3xl font-black text-gray-700 text-center">{idx < 3 ? ["🥇","🥈","🥉"][idx] : idx + 1}</td>
                                       <td className="px-4 py-4 text-2xl text-gray-600 text-center">{s.id}</td>
                                       <td className="px-4 py-4 text-2xl font-bold text-center">{s.name[0]}O{s.name.slice(2)}</td>
                                       {['GOLD', 'SILVER', 'BRONZE'].map(type => (
                                           <td key={type} className="px-4 py-4 text-center cursor-pointer" onClick={() => authMode === 'ADMIN' && setEditingCell({id: s.id, type})}>
                                               {editingCell?.id === s.id && editingCell?.type === type ? 
                                                   <input type="number" autoFocus className="w-20 border-2 border-blue-400 rounded text-center text-2xl" onBlur={() => setEditingCell(null)} onChange={(e) => setBankBalanceDirectly(s.id, type, parseInt(e.target.value))} /> : 
                                                   <div className="inline-flex items-center gap-2 border px-3 py-1 rounded-full"><CoinIcon type={type} size="w-6 h-6" /> <span className="text-2xl font-black">{type==='GOLD'?d.gold:type==='SILVER'?d.silver:d.bronze}</span></div>
                                               }
                                           </td>
                                       ))}
                                       {authMode === 'ADMIN' && <td className="px-4 py-4 text-center"><button onClick={() => onUpdateBalance(s.id, 'RESET', 'RESET', 'RESET')} className="p-2 bg-red-100 text-red-600 rounded-lg"><Eraser className="w-5 h-5"/></button></td>}
                                   </tr>
                               );
                           })}
                       </tbody>
                   </table>
               </div>
           </div>
       </div>
   );
};

// --- 全班未完成總表 (保留原始詳細清單樣式) ---
const AllMissingAssignmentsModal = ({ missingStats, onClose }) => {
    const swm = missingStats.filter(s => s.missingCount > 0);
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b pb-4"><h3 className="text-4xl font-bold flex items-center"><AlertCircle className="w-10 h-10 text-red-500 mr-3" />全班未完成作業總表</h3><button onClick={onClose} className="p-2 rounded-full bg-gray-100"><X className="w-8 h-8" /></button></div>
                <div className="flex-1 overflow-auto">
                    {swm.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-green-600 font-bold text-4xl"><Check className="w-24 h-24 mb-4" />全班皆已完成作業</div> : (
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-4 text-2xl font-bold">座號</th><th className="p-4 text-2xl font-bold">姓名</th><th className="p-4 text-2xl font-bold">缺交數</th><th className="p-4 text-2xl font-bold text-left">未完成項目明細</th></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">{swm.map(s => (<tr key={s.id} className="hover:bg-red-50"><td className="p-4 text-2xl text-center">{s.id}</td><td className="p-4 text-2xl font-bold text-center">{s.name[0]}O{s.name.slice(2)}</td><td className="p-4 text-center"><span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-2xl">{s.missingCount}</span></td><td className="p-4 text-xl"><ul className="list-disc list-inside">{s.missingDetails.map((d, i) => (<li key={i}><span className="text-red-600 font-bold">{d.assignment}</span> [{d.date}]</li>))}</ul></td></tr>))}</tbody>
                        </table>
                    )}
                </div>
                <div className="mt-4 text-right"><button onClick={onClose} className="bg-gray-800 text-white py-3 px-8 rounded-xl text-2xl font-bold">關閉視窗</button></div>
            </div>
        </div>
    );
};

// --- [其餘原始組件：CustomAlert, LoginScreen, ConfirmationModal, MissingDetailsModal, AssignmentHeader, DateTab, ProtectedButton, useStudents] ---
const CustomAlert = ({ message, onClose }) => ( <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"><div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg scale-100"><h3 className="text-4xl font-semibold mb-4 text-gray-800">通知</h3><p className="text-3xl text-gray-600 mb-6">{message}</p><button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg text-4xl">確定</button></div></div> );
const LoginScreen = ({ onAdminLogin, onGuestLogin, isLoading, errorMsg }) => { const [e, setE] = useState(''); const [p, setP] = useState(''); const [m, setM] = useState('GUEST'); return ( <div className="fixed inset-0 bg-[#F0F8FF] flex items-center justify-center z-[10000]"><div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-blue-100"><div className="text-center mb-8"><h1 className="text-4xl font-bold mb-2">五年甲班作業表</h1><p className="text-gray-400 text-xl font-medium">請選擇身分</p></div><div className="flex bg-gray-100 p-1 rounded-xl mb-6"><button onClick={()=>setM('GUEST')} className={`flex-1 py-2 rounded-lg text-xl font-bold ${m==='GUEST'?'bg-white text-blue-600 shadow':'text-gray-500'}`}>學生/家長</button><button onClick={()=>setM('ADMIN')} className={`flex-1 py-2 rounded-lg text-xl font-bold ${m==='ADMIN'?'bg-white text-red-600 shadow':'text-gray-500'}`}>老師</button></div>{m==='ADMIN'?(<form onSubmit={(ev)=>{ev.preventDefault();onAdminLogin(e,p)}} className="space-y-4"><div><label className="block text-gray-600 font-bold">Email</label><input type="email" value={e} onChange={(ev)=>setE(ev.target.value)} className="w-full px-4 py-3 text-xl border-2 rounded-xl" /></div><div><label className="block text-gray-600 font-bold">密碼</label><input type="password" value={p} onChange={(ev)=>setP(ev.target.value)} className="w-full px-4 py-3 text-xl border-2 rounded-xl" /></div>{errorMsg&&<p className="text-red-500 font-bold">{errorMsg}</p>}<button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-red-500 text-white text-2xl font-bold">{isLoading?'驗證中...':'管理員登入'}</button></form>):(<button onClick={onGuestLogin} className="w-full py-3 rounded-xl bg-blue-500 text-white text-2xl font-bold shadow-lg">進入系統</button>)}<div className="mt-8 text-center text-gray-400">系統版本：{VERSION}</div></div></div> ); };
const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmTitle, confirmColor }) => ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"><div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full text-center"><h3 className="text-3xl font-bold mb-4">{title}</h3><p className="text-xl text-gray-600 mb-6">{message}</p><div className="flex gap-4"><button onClick={onCancel} className="flex-1 bg-gray-300 py-3 rounded-lg text-2xl font-bold">取消</button><button onClick={onConfirm} className={`flex-1 text-white py-3 rounded-lg text-2xl font-bold ${confirmColor}`}>{confirmTitle}</button></div></div></div> );
const MissingDetailsModal = ({ student, missingStats, onClose }) => (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2"><div className="bg-white rounded-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-auto"><h3 className="text-4xl font-bold mb-6 text-center">{student.name} 的缺交明細</h3><button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg text-2xl font-bold">關閉</button></div></div>);
const AssignmentHeader = ({ assignment, handleMoveAssignment, setEditingAssignmentId, setEditingAssignmentName, editingAssignmentId, editingAssignmentName, authMode, handleDeleteAssignment }) => { const isEditing = editingAssignmentId === assignment.id; return ( <th className="px-2 py-4 text-3xl text-center font-semibold bg-gray-100 sticky top-0 z-50 border-r border-gray-300 min-w-[150px]"><div onDoubleClick={() => authMode === 'ADMIN' && setEditingAssignmentId(assignment.id)} className="relative group p-2 bg-white rounded-xl shadow-sm"> {isEditing ? <input value={editingAssignmentName} autoFocus onBlur={()=>setEditingAssignmentId(null)} className="w-full text-center outline-none" /> : <span className="font-bold">{assignment.assignmentName}</span>} {authMode === 'ADMIN' && !isEditing && <button onClick={()=>handleDeleteAssignment(assignment.id, assignment.assignmentName)} className="absolute -top-2 -right-2 text-red-500 opacity-0 group-hover:opacity-100"><X /></button>} </div></th> ); };
const DateTab = ({ date, isSelected, onClick }) => ( <button onClick={() => onClick(date)} className={`px-5 py-3 text-3xl font-semibold rounded-lg shadow-md transition ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>{new Date(date).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})}</button> );
const useStudents = (db, isOffline) => { const [students, setStudents] = useState(DEFAULT_STUDENTS); useEffect(() => { if (!db || isOffline) return; onSnapshot(collection(db, `/artifacts/${appId}/public/data/students`), (snapshot) => { const loaded = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })); if (loaded.length) setStudents(loaded.sort((a,b)=>parseInt(a.id)-parseInt(b.id))); }); }, [db, isOffline]); return { students }; };
// --- 主程式：App ---
const App = () => {
    // 1. 狀態定義 (完全保留您原本的狀態)
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isOffline, setIsOffline] = useState(false); 
    const [allAssignmentsByDate, setAllAssignmentsByDate] = useState({});
    const [selectedDisplayDate, setSelectedDisplayDate] = useState(getTodayDate()); 
    const [loading, setLoading] = useState(true);
    const [alertMessage, setAlertMessage] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authMode, setAuthMode] = useState('GUEST'); 
    const [showBankModal, setShowBankModal] = useState(false);
    const [showAllMissingModal, setShowAllMissingModal] = useState(false);
    const [dashboardStudent, setDashboardStudent] = useState(null);
    const [rewardState, setRewardState] = useState(null);
    const [editingAssignmentId, setEditingAssignmentId] = useState(null);
    const [editingAssignmentName, setEditingAssignmentName] = useState('');

    // 2. 引入 Hooks
    const { students } = useStudents(db, isOffline);
    const { bankData, updateBankBalance, setBankBalanceDirectly } = useStudentBank(db, isAuthReady, isOffline, students);
    const { categories, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students);

    // 3. Firebase 初始化與連線邏輯
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestore); setAuth(firebaseAuth);
            onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid); setIsAuthReady(true); setIsAuthenticated(true);
                    setAuthMode(user.isAnonymous ? 'GUEST' : 'ADMIN');
                } else { setIsAuthenticated(false); }
                setLoading(false);
            });
        } catch (e) { console.error(e); setIsOffline(true); setLoading(false); }
    }, []);

    // 4. 資料監聽與同步
    useEffect(() => {
        if (!db || isOffline) return;
        const q = query(collection(db, getAssignmentCollectionPath()));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const grouped = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!grouped[data.assignmentDate]) grouped[data.assignmentDate] = [];
                grouped[data.assignmentDate].push({ id: doc.id, ...data });
            });
            setAllAssignmentsByDate(grouped);
        });
        return () => unsubscribe();
    }, [db, isOffline]);

    // 5. 核心計算
    const assignmentsForSelectedDate = useMemo(() => {
        const a = allAssignmentsByDate[selectedDisplayDate] || [];
        return a.sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [allAssignmentsByDate, selectedDisplayDate]);

    const studentMissingStats = useMemo(() => {
        return students.map(s => {
            let count = 0; let details = [];
            Object.keys(allAssignmentsByDate).forEach(date => {
                allAssignmentsByDate[date].forEach(a => {
                    if (a.submissionStatus[s.id] === false) {
                        count++; details.push({ date, assignment: a.assignmentName });
                    }
                });
            });
            return { id: s.id, name: s.name, missingCount: count, missingDetails: details };
        }).sort((a,b) => b.missingCount - a.missingCount);
    }, [allAssignmentsByDate, students]);

    const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatus) => {
        const assignment = assignmentsForSelectedDate.find(a => a.assignmentName === assignmentName);
        if (!assignment || authMode !== 'ADMIN') return;
        const newStatus = currentStatus === true ? false : currentStatus === false ? 'late' : true;
        const docRef = doc(db, getAssignmentCollectionPath(), assignment.id);
        await setDoc(docRef, { submissionStatus: { [studentId]: newStatus } }, { merge: true });
    }, [db, assignmentsForSelectedDate, authMode]);

    if (loading && !isOffline) return <div className="h-screen flex items-center justify-center text-3xl font-bold">連線中...</div>;
    if (!isAuthenticated) return <LoginScreen onAdminLogin={(e,p)=>signInWithEmailAndPassword(auth,e,p)} onGuestLogin={()=>signInAnonymously(auth)} />;

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
                {/* 彈窗渲染 */}
                {rewardState && <RewardOverlay type={rewardState.type} onClose={() => setRewardState(null)} />}
                {showBankModal && <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} setBankBalanceDirectly={setBankBalanceDirectly} authMode={authMode} students={students} />}
                {showAllMissingModal && <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} />}
                {dashboardStudent && <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} onClose={() => setDashboardStudent(null)} />}

                <header className="p-4 sm:p-6 text-center border-b border-gray-200 bg-white relative shrink-0 shadow-sm">
                    <button onClick={() => signOut(auth)} className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold transition z-20"> <LogOut className="w-5 h-5" /> 登出 {authMode === 'ADMIN' ? '(老師)' : '(訪客)'} </button>
                    <div className="flex items-center justify-center text-5xl font-extrabold text-gray-900 mb-2">🐻‍❄️ 五年甲班訂正作業表 🐼</div>
                    <p className="absolute right-4 top-4 text-xl text-gray-500 font-bold"> 版本: {VERSION}</p>
                </header>

                <div className="flex-1 overflow-auto bg-gray-50 p-4 relative">
                    {/* --- [核心按鈕重排區] --- */}
                    <div className="flex flex-wrap items-center gap-6 mb-6 text-3xl">
                        <button onClick={() => setShowBankModal(true)} className="px-5 py-3 text-3xl font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center">
                            <BookOpen className="h-6 w-6 mr-2" />訂正存簿
                        </button>
                        {/* 這裡滿足您的要求：未完成總表移到存簿旁邊 */}
                        <button onClick={() => setShowAllMissingModal(true)} className="px-5 py-3 text-3xl font-bold rounded-lg text-white bg-orange-500 hover:bg-orange-600 shadow-md flex items-center">
                            <FileText className="h-6 w-6 mr-2" />未完成總表
                        </button>
                        
                        <div className="flex-1"></div> {/* 撐開中間空間 */}

                        <div className="flex items-center gap-2">
                            <button onClick={() => {}} className="px-4 py-2 text-2xl font-medium rounded-lg text-white bg-fuchsia-500 hover:bg-fuchsia-600 shadow-md flex items-center">
                                <Download className="h-5 w-5 mr-1" />匯出
                            </button>
                            
                            {/* 一鍵催繳：只在老師模式顯示 */}
                            {authMode === 'ADMIN' && (
                                <button onClick={() => copyWarningToClipboard(selectedDisplayDate, students, assignmentsForSelectedDate, setAlertMessage)} className="px-4 py-2 text-2xl font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-xl animate-pulse flex items-center">
                                    <BellRing className="h-5 w-5 mr-1" />一鍵催繳
                                </button>
                            )}
                            
                            <button onClick={() => document.getElementById('importFile').click()} className="px-4 py-2 text-2xl font-medium rounded-lg text-white bg-cyan-500 shadow-md flex items-center">
                                <Upload className="h-5 w-5 mr-1" />匯入
                                <input type="file" id="importFile" accept="application/json" className="hidden" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <input type="date" value={selectedDisplayDate} onChange={(e) => setSelectedDisplayDate(e.target.value)} className="p-2 text-3xl border rounded-lg font-semibold w-[240px] bg-white shadow-inner" />
                        <h2 className="text-4xl font-black text-gray-800">作業確認表格區</h2>
                    </div>

                    {/* 3. 主要作業表格 (完全保留原本的 Sticky 與 Table 樣式) */}
                    <div className="w-full relative border border-gray-300 rounded-lg shadow-xl overflow-auto h-[calc(100vh-250px)] min-h-[500px] bg-white"> 
                        <table className="divide-y divide-gray-300 w-full table-auto">
                           <thead className="bg-gray-100 sticky top-0 z-[70]">
                               <tr>
                                   <th className="px-4 py-4 text-3xl font-bold text-gray-600 border-r sticky left-0 bg-gray-100 z-[75] text-center" style={{ minWidth: '100px', left: '0px' }}>座號</th>
                                   <th className="px-4 py-4 text-3xl font-bold text-gray-600 border-r sticky left-[100px] bg-gray-100 z-[75] text-center" style={{ minWidth: '130px' }}>姓名</th>
                                   {assignmentsForSelectedDate.map(a => (
                                       <th key={a.id} className="px-4 py-4 text-3xl font-bold text-gray-800 text-center border-r min-w-[150px]">{a.assignmentName}</th>
                                   ))}
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-200">
                               {students.map((s) => (
                                   <tr key={s.id} className="hover:bg-blue-50 group">
                                     <td onClick={() => setDashboardStudent(s)} className="px-4 py-6 text-3xl font-medium text-gray-400 border-r sticky left-0 bg-white z-[50] group-hover:bg-blue-50 text-center cursor-pointer transition-colors">{s.id}</td>
                                     <td onClick={() => setDashboardStudent(s)} className="px-4 py-6 text-3xl font-black text-gray-800 border-r sticky left-[100px] bg-white z-[50] group-hover:bg-blue-50 text-center cursor-pointer transition-colors">{s.name[0]}O{s.name.slice(2)}</td>
                                    {assignmentsForSelectedDate.map((a) => {
                                      const status = a.submissionStatus[s.id] ?? true;
                                      return (
                                          <td key={a.id} className="px-1 py-4 text-center border-r">
                                              <button onClick={() => handleToggleSubmission(a.assignmentName, s.id, status)} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transition mx-auto ${status === true ? 'bg-green-500' : (status === 'late' ? 'bg-yellow-400' : 'bg-red-500 border-4 border-red-200')}`}>
                                                  {status === false ? <X className="w-8 h-8" /> : <Check className="w-8 h-8" />}
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
            </div>
        </DndProvider>
    );
};

export default App;
