import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, query, Timestamp, getDocs, writeBatch, serverTimestamp, where } from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
   BookOpen, Download, Upload, X, Check, RefreshCw, WifiOff, LogOut, 
   FileText, AlertCircle, Eye, Shield, User, Key, Edit, Pencil, Star,
   Coins, Eraser, Moon, PlusCircle, TrendingUp, Activity, BarChart2, BellRing 
} from 'lucide-react';

const VERSION = 'v18.4.0 - 終極修復整合版'; 
const appId = 'class-5a-app'; 
const firebaseConfig = { apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8", authDomain: "class-5a-app.firebaseapp.com", projectId: "class-5a-app", storageBucket: "class-5a-app.firebasestorage.app", messagingSenderId: "828328241350", appId: "1:828328241350:web:5d39d529209f87a2540fc7", measurementId: "G-8VGE0WKD01" };

// --- 核心輔助函數 ---
const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getStudentBadges = (score, missingCount) => {
    const badges = []; const s = parseFloat(score);
    if (s >= 95) badges.push({ icon: "🔥", label: "自律之火", style: "bg-orange-100 text-orange-600 border-orange-200" });
    if (missingCount === 0) badges.push({ icon: "🛡️", label: "不敗之盾", style: "bg-blue-100 text-blue-600 border-blue-200" });
    if (s >= 98) badges.push({ icon: "👑", label: "傳奇楷模", style: "bg-purple-100 text-purple-600 border-purple-200" });
    return badges;
};

const copyWarningToClipboard = (date, students, assignments, setAlert) => {
    if (!date || assignments.length === 0) { alert("目前日期無作業資料"); return; }
    const missing = students.map(s => {
        const items = assignments.filter(a => a.submissionStatus?.[s.id] === false).map(a => a.assignmentName);
        return { name: s.name, items };
    }).filter(s => s.items.length > 0);
    if (missing.length === 0) { alert("🎉 全數完成！"); return; }
    const d = new Date(date);
    let text = `【📢 五甲訂正催繳通知 - ${d.getMonth()+1}/${d.getDate()}】\n\n尚未完成名單：\n------------------\n`;
    missing.forEach((s, idx) => { text += `${idx + 1}. ${s.name[0]}O${s.name.slice(2)}：${s.items.join('、')}\n`; });
    text += `------------------\n💪 提醒孩子利用時間補齊，謝謝配合！`;
    navigator.clipboard.writeText(text).then(() => setAlert("✅ 催繳文字已複製！請貼到 LINE 群組。"));
};

const ASSETS = { BRONZE_SOUND: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3', GOLD_SOUND: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3', CONFETTI_BG: 'https://i.gifer.com/origin/e2/e29a997a3a304523b087050074697df0_w200.gif' };
const DEFAULT_STUDENTS = [ { id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' }, { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' } ];
const INITIAL_CATEGORIES = [ { name: '數課', order: 0 }, { name: '數習', order: 1 }, { name: '數八', order: 2 }, { name: '成語()+P.', order: 3 }, { name: '聯P.', order: 4 }, { name: '國', order: 5 } ];
const ItemTypes = { ASSIGNMENT: 'assignment' };
const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
// --- 延續第一段：路徑設定 ---
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;

// --- [UI 元件：硬幣與圖表] ---
const CoinIcon = ({ type, size = "w-8 h-8", textSize = "text-sm", innerSize = "w-3/5 h-3/5" }) => {
    const baseClasses = `rounded-full border-[4px] flex items-center justify-center shadow-lg ${size} bg-white`;
    if (type === 'GOLD') return (<div className={`${baseClasses} border-yellow-400 text-yellow-500 bg-yellow-50`} title="金幣"><Moon className={`${innerSize} fill-current`} /></div>);
    if (type === 'SILVER') return (<div className={`${baseClasses} border-gray-400 text-gray-500 bg-gray-50`} title="銀幣"><Star className={`${innerSize} fill-current`} /></div>);
    return (<div className={`${baseClasses} border-orange-700 text-orange-800 bg-orange-50`} title="銅幣"><span className={`font-bold ${textSize}`}>$</span></div>);
};

const SimpleLineChart = ({ data, width = 600, height = 300 }) => {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據繪製圖表</div>;
    const padding = 40; const chartWidth = width - padding * 2; const chartHeight = height - padding * 2; const maxY = 100;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * chartWidth + padding;
        const y = chartHeight - ((d.value || 0) / maxY) * chartHeight + padding;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
            <polyline fill="none" stroke="#3b82f6" strokeWidth="4" points={points} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />
            {data.map((d, i) => {
                const x = (i / (data.length - 1)) * chartWidth + padding;
                const y = chartHeight - ((d.value || 0) / maxY) * chartHeight + padding;
                return <circle key={i} cx={x} cy={y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />;
            })}
        </svg>
    );
};

// --- [Modal 元件：學生學習歷程 Dashboard] ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('STATUS'); 
    if (!student || !allAssignmentsByDate) return null;

    const stats = useMemo(() => {
        let total = 0, missing = 0, scoreSum = 0;
        Object.values(allAssignmentsByDate).flat().forEach(a => {
            total++;
            if (a.submissionStatus?.[student.id] === false) missing++;
            else scoreSum += 100;
        });
        const score = total === 0 ? 0 : (scoreSum / total).toFixed(1);
        return { score, missing, badges: getStudentBadges(score, missing) };
    }, [allAssignmentsByDate, student.id]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border-4 border-white">
                <div className="px-6 py-4 flex justify-between items-center text-white shrink-0 bg-gradient-to-r from-indigo-600 to-purple-500">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-indigo-600 shadow-lg border-4 border-indigo-200">{student.id}</div>
                        <div>
                            <h2 className="text-4xl font-black">{student.name} 的學習歷程</h2>
                            <div className="flex gap-2 mt-2">
                                {stats.badges.map((b, i) => (<span key={i} className={`px-2 py-0.5 rounded-full text-xs font-bold border-2 ${b.style}`}>{b.icon} {b.label}</span>))}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition"><X className="w-8 h-8" /></button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-gray-50 text-center">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-8 rounded-3xl border shadow-sm"><p className="text-gray-500 font-bold mb-2">綜合分數</p><p className="text-7xl font-black text-indigo-600">{stats.score}</p></div>
                        <div className="bg-white p-8 rounded-3xl border shadow-sm"><p className="text-gray-500 font-bold mb-2">資產</p><p className="text-4xl font-black text-yellow-600">{bankBalance?.gold || 0}金 / {bankBalance?.silver || 0}銀</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- [核心 Hooks：存簿與科目管理] ---
const useStudentBank = (db, isAuthReady, isOffline, students) => {
    const initialData = useMemo(() => { const data = {}; students.forEach(s => data[s.id] = { bronze: 0, silver: 0, gold: 0 }); return data; }, [students]);
    const [bankData, setBankData] = useState(initialData);
    useEffect(() => {
        if (isOffline || !isAuthReady || !db) return;
        return onSnapshot(query(collection(db, getBankCollectionPath())), (snapshot) => {
            const remoteData = {}; snapshot.docs.forEach(doc => { remoteData[doc.id] = doc.data(); });
            setBankData(prev => {
                const newData = { ...prev };
                Object.keys(remoteData).forEach(key => { newData[key] = { bronze: Number(remoteData[key].bronze) || 0, silver: Number(remoteData[key].silver) || 0, gold: Number(remoteData[key].gold) || 0 }; });
                return newData;
            });
        });
    }, [isAuthReady, db, isOffline]);

    const saveBalance = useCallback(async (sid, nb, ns, ng) => {
        let b=nb, s=ns, g=ng; if (b>=100) { s+=Math.floor(b/100); b%=100; } if (s>=10) { g+=Math.floor(s/10); s%=10; }
        const newState = { bronze: b, silver: s, gold: g }; setBankData(p => ({ ...p, [sid]: newState }));
        if (isOffline || !db) return;
        try { await setDoc(doc(db, getBankCollectionPath(), sid), { ...newState, lastUpdated: serverTimestamp() }, { merge: true }); } catch (e) {}
    }, [db, isOffline]);

    return { bankData, updateBankBalance: (id, ab, as, ag) => {
        setBankData(p => { const c = p[id] || { bronze: 0, silver: 0, gold: 0 }; 
        const b = ab==='RESET'?0:c.bronze+ab; const s = as==='RESET'?0:c.silver+as; const g = ag==='RESET'?0:c.gold+ag;
        saveBalance(id, b, s, g); return p; });
    }, setBankBalanceDirectly: (id, t, v) => {
        setBankData(p => { const c = p[id]; let {bronze:b, silver:s, gold:g} = c;
        if (t==='GOLD') g=v; if (t==='SILVER') s=v; if (t==='BRONZE') b=v;
        saveBalance(id, b, s, g); return p; });
    }};
};
// --- [Modal 元件：訂正存簿管理] ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, setBankBalanceDirectly, authMode, students }) => {
    const [editingCell, setEditingCell] = useState(null); 
    const sorted = [...students].sort((a, b) => { 
        const bA = bankData[a.id] || { bronze: 0, silver: 0, gold: 0 }; 
        const bB = bankData[b.id] || { bronze: 0, silver: 0, gold: 0 }; 
        if (bA.gold !== bB.gold) return bB.gold - bA.gold; 
        return bB.silver - bA.silver; 
    });

    return ( 
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-7xl h-[90vh] flex flex-col border border-green-200">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-4xl font-bold flex items-center gap-2"><CoinIcon type="GOLD" />訂正存簿排行</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X /></button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <table className="min-w-full divide-y">
                        <thead className="bg-green-50 sticky top-0">
                            <tr><th className="p-4 text-xl">座號</th><th className="p-4 text-xl">姓名</th><th className="p-4 text-xl text-yellow-600">金</th><th className="p-4 text-xl text-gray-500">銀</th><th className="p-4 text-xl text-orange-700">銅</th>{authMode==='ADMIN'&&<th className="p-4 text-xl">操作</th>}</tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {sorted.map(s => { 
                                const d = bankData[s.id] || { bronze: 0, silver: 0, gold: 0 }; 
                                return (
                                    <tr key={s.id} className="text-center hover:bg-green-50">
                                        <td className="p-4 text-2xl">{s.id}</td>
                                        <td className="p-4 text-2xl font-bold">{s.name[0]}O{s.name.slice(2)}</td>
                                        {['GOLD','SILVER','BRONZE'].map(t => (
                                            <td key={t} className="p-4 cursor-pointer" onClick={() => authMode==='ADMIN' && setEditingCell({id:s.id, t})}>
                                                {editingCell?.id===s.id && editingCell?.t===t ? 
                                                    <input type="number" autoFocus className="w-20 border-2 border-blue-400 rounded text-center text-2xl" onBlur={() => setEditingCell(null)} onChange={e => setBankBalanceDirectly(s.id, t, parseInt(e.target.value) || 0)}/> 
                                                    : <div className="inline-flex items-center gap-1 border px-3 py-1 rounded-full"><CoinIcon type={t} size="w-5 h-5"/> <span className="text-xl font-black">{t==='GOLD'?d.gold:t==='SILVER'?d.silver:d.bronze}</span></div>
                                                }
                                            </td>
                                        ))}
                                        {authMode==='ADMIN' && <td className="p-4"><button onClick={() => onUpdateBalance(s.id, 'RESET', 'RESET', 'RESET')} className="p-2 bg-red-100 rounded-lg text-red-600 hover:bg-red-200"><Eraser className="w-5 h-5"/></button></td>}
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

// --- [Modal 元件：未完成總表] ---
const AllMissingAssignmentsModal = ({ missingStats, onClose }) => {
    const studentsWithMissing = missingStats.filter(s => s.missingCount > 0);
    return ( 
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-4xl font-bold flex items-center gap-3"><AlertCircle className="text-red-500 w-10 h-10" />全班未完成總表</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X /></button>
                </div>
                <div className="flex-1 overflow-auto">
                    {studentsWithMissing.length === 0 ? 
                        <div className="h-full flex flex-col items-center justify-center text-green-600 font-bold text-4xl"><Check className="w-20 h-20 mb-4" />全班作業皆已完成</div> 
                        : (<table className="min-w-full divide-y">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-4 text-xl">座號</th><th className="p-4 text-xl">姓名</th><th className="p-4 text-xl text-red-600">缺交數</th><th className="p-4 text-xl text-left">詳細清單</th></tr></thead>
                            <tbody className="bg-white">{studentsWithMissing.map(s => (<tr key={s.id} className="text-center border-b hover:bg-red-50"><td className="p-4 text-xl">{s.id}</td><td className="p-4 text-xl font-bold">{s.name[0]}O{s.name.slice(2)}</td><td className="p-4 text-red-600 font-bold text-2xl">{s.missingCount}</td><td className="p-4 text-left"><ul className="list-disc list-inside">{s.missingDetails.map((d,i)=>(<li key={i} className="text-lg"><span className="text-red-600 font-medium">{d.assignment}</span> <span className="text-gray-400">[{d.date}]</span></li>))}</ul></td></tr>))}</tbody>
                           </table>)
                    }
                </div>
                <div className="mt-4 pt-4 border-t text-right"><button onClick={onClose} className="bg-gray-800 text-white py-3 px-8 rounded-xl font-bold text-xl">關閉</button></div>
            </div>
        </div> 
    );
};

const CustomAlert = ({ message, onClose }) => ( 
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
        <div className="bg-white rounded-xl p-8 max-w-lg w-full text-center shadow-2xl border-t-8 border-blue-600">
            <h3 className="text-3xl font-bold mb-6 text-gray-800">{message}</h3>
            <button onClick={onClose} className="w-full bg-blue-600 text-white py-4 rounded-xl text-2xl font-bold hover:bg-blue-700 transition active:scale-95 shadow-lg">確定</button>
        </div>
    </div> 
);
// --- [元件：登入介面] ---
const LoginScreen = ({ onAdminLogin, onGuestLogin, isLoading }) => {
    const [e, setE] = useState(''); const [p, setP] = useState('');
    return (
        <div className="fixed inset-0 bg-[#F0F8FF] flex items-center justify-center z-[10000]">
            <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border">
                <h1 className="text-4xl font-black text-center mb-8 text-gray-800">五甲作業管理系統</h1>
                <button onClick={onGuestLogin} className="w-full py-4 bg-blue-600 text-white rounded-xl text-2xl font-bold mb-4 shadow-lg hover:bg-blue-700 transition active:scale-95">訪客進入</button>
                <form onSubmit={(ev)=>{ev.preventDefault();onAdminLogin(e,p)}} className="space-y-4 pt-4 border-t">
                    <input type="email" value={e} onChange={ev=>setE(ev.target.value)} placeholder="老師 Email" className="w-full p-4 text-xl border rounded-xl" />
                    <input type="password" value={p} onChange={ev=>setP(ev.target.value)} placeholder="密碼" className="w-full p-4 text-xl border rounded-xl" />
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-gray-800 text-white rounded-xl text-xl font-bold hover:bg-black transition">管理員登入</button>
                </form>
            </div>
        </div>
    );
};

// --- [元件：作業標頭] ---
const AssignmentHeader = ({ assignment, authMode, onDelete }) => (
    <th className="px-2 py-4 text-3xl font-semibold bg-gray-100 sticky top-0 z-50 border-r min-w-[160px]">
        <div className="relative group p-2 bg-white rounded-xl shadow-sm border">
            <span className="font-bold">{assignment.assignmentName}</span>
            {authMode === 'ADMIN' && (
                <button onClick={()=>onDelete(assignment.id, assignment.assignmentName)} className="absolute -top-2 -right-2 text-red-500 opacity-0 group-hover:opacity-100 transition hover:scale-110"><X className="w-6 h-6 bg-white rounded-full border shadow-sm"/></button>
            )}
        </div>
    </th>
);

// --- [核心：App 主程式] ---
const App = () => {
    const [db, setDb] = useState(null); const [auth, setAuth] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false); const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [allAssignmentsByDate, setAllAssignmentsByDate] = useState({}); const [selectedDisplayDate, setSelectedDisplayDate] = useState(getTodayDate());
    const [loading, setLoading] = useState(true); const [alertMessage, setAlertMessage] = useState(null);
    const [authMode, setAuthMode] = useState('GUEST'); const [showBankModal, setShowBankModal] = useState(false);
    const [showAllMissingModal, setShowAllMissingModal] = useState(false); const [dashboardStudent, setDashboardStudent] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState('S1');

    const { bankData, updateBankBalance, setBankBalanceDirectly } = useStudentBank(db, isAuthReady, false, DEFAULT_STUDENTS);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig); const f = getFirestore(app); const a = getAuth(app);
            setDb(f); setAuth(a);
            onAuthStateChanged(a, user => {
                if (user) { setIsAuthenticated(true); setAuthMode(user.isAnonymous ? 'GUEST' : 'ADMIN'); }
                setIsAuthReady(true); setLoading(false);
            });
        } catch (e) { setLoading(false); }
    }, []);

    useEffect(() => {
        if (!db) return;
        return onSnapshot(query(collection(db, getAssignmentCollectionPath())), (sn) => {
            const grouped = {}; sn.docs.forEach(doc => {
                const data = doc.data(); const d = data.assignmentDate;
                if (!grouped[d]) grouped[d] = []; grouped[d].push({ id: doc.id, ...data });
            });
            setAllAssignmentsByDate(grouped);
        });
    }, [db]);

    const assignmentsForDate = useMemo(() => (allAssignmentsByDate[selectedDisplayDate] || []).sort((a,b) => (a.order || 0) - (b.order || 0)), [allAssignmentsByDate, selectedDisplayDate]);
    const studentMissingStats = useMemo(() => DEFAULT_STUDENTS.map(s => {
        let count = 0; let details = [];
        Object.keys(allAssignmentsByDate).forEach(date => {
            allAssignmentsByDate[date].forEach(a => { if (a.submissionStatus?.[s.id] === false) { count++; details.push({ date, assignment: a.assignmentName }); } });
        });
        return { id: s.id, name: s.name, missingCount: count, missingDetails: details };
    }).sort((a,b) => b.missingCount - a.missingCount), [allAssignmentsByDate]);

    const handleToggleSubmission = async (aName, sId, current) => {
        if (authMode !== 'ADMIN') return;
        const assign = assignmentsForDate.find(a => a.assignmentName === aName);
        const newS = current === true ? false : current === false ? 'late' : true;
        await setDoc(doc(db, getAssignmentCollectionPath(), assign.id), { submissionStatus: { [sId]: newS } }, { merge: true });
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-3xl font-black text-indigo-600 animate-pulse">五年甲班雲端同步中...</div>;
    if (!isAuthenticated) return <LoginScreen onGuestLogin={()=>signInAnonymously(auth)} onAdminLogin={(e,p)=>signInWithEmailAndPassword(auth,e,p)} isLoading={false} />;

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
                {alertMessage && <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} />}
                {dashboardStudent && <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} onClose={() => setDashboardStudent(null)} />}
                {showBankModal && <StudentBankModal bankData={bankData} onClose={() => setShowBankModal(false)} onUpdateBalance={updateBankBalance} setBankBalanceDirectly={setBankBalanceDirectly} authMode={authMode} students={DEFAULT_STUDENTS} />}
                {showAllMissingModal && <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} />}

                <header className="p-4 sm:p-6 text-center border-b bg-white flex justify-between items-center shrink-0 shadow-sm relative">
                    <button onClick={() => signOut(auth)} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg font-bold hover:bg-red-100 transition flex items-center gap-1"> <LogOut className="w-5 h-5"/> 登出 </button>
                    <div className="text-4xl font-black text-gray-900 flex items-center gap-3">🐻 五年甲班訂正作業表 🐼</div>
                    <div className="text-gray-400 font-bold">版本: {VERSION}</div>
                </header>

                <div className="flex-1 overflow-auto bg-gray-50 p-6 relative">
                    <div className="flex flex-wrap items-center gap-6 mb-8 text-3xl">
                        <div className="flex items-center gap-4">
                            <label className="font-semibold text-gray-700">學期：</label>
                            <select value={selectedSemester} onChange={e=>setSelectedSemester(e.target.value)} className="p-3 border rounded-lg font-bold bg-white text-indigo-600">
                                <option value="S1">114上學期</option>
                                <option value="S2">114下學期</option>
                            </select>
                        </div>

                        {/* 滿足需求：訂正存簿與未完成總表並排 */}
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowBankModal(true)} className="px-6 py-3 bg-green-600 text-white rounded-xl shadow-md font-bold flex items-center gap-2 hover:bg-green-700"> <BookOpen className="w-7 h-7" /> 訂正存簿 </button>
                            <button onClick={() => setShowAllMissingModal(true)} className="px-6 py-3 bg-orange-500 text-white rounded-xl shadow-md font-bold flex items-center gap-2 hover:bg-orange-600"> <FileText className="w-7 h-7" /> 未完成總表 </button>
                        </div>

                        <div className="flex-1"></div>

                        {/* 管理工具區：嵌入一鍵催繳 */}
                        <div className="flex items-center gap-2">
                             <button onClick={()=>{}} className="px-4 py-2 bg-fuchsia-400 text-white rounded-lg font-bold shadow-md hover:bg-fuchsia-500 flex items-center gap-1"><Download className="w-5 h-5"/>匯出</button>
                             {authMode === 'ADMIN' && (
                                <button onClick={() => copyWarningToClipboard(selectedDisplayDate, DEFAULT_STUDENTS, assignmentsForDate, setAlertMessage)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-black shadow-xl animate-pulse flex items-center gap-2 hover:bg-red-700"> <BellRing className="w-6 h-6"/>一鍵催繳 </button>
                             )}
                             <button onClick={() => document.getElementById('importFile').click()} className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-bold shadow-md hover:bg-cyan-600 flex items-center gap-1"><Upload className="w-5 h-5"/>匯入</button>
                             <input type="file" id="importFile" accept="application/json" onChange={()=>{}} className="hidden" />
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-6 border-b bg-gray-50 flex items-center gap-6">
                             <input type="date" value={selectedDisplayDate} onChange={e=>setSelectedDisplayDate(e.target.value)} className="p-3 border-2 border-indigo-100 rounded-xl text-2xl font-bold text-indigo-700 bg-white" />
                             <h2 className="text-3xl font-black text-gray-700 tracking-tight">作業清單實時確認</h2>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0 z-[70]">
                                    <tr>
                                        <th className="p-6 text-2xl font-bold text-gray-400 border-r w-24 text-center sticky left-0 bg-gray-50 z-[75]">座號</th>
                                        <th className="p-6 text-2xl font-bold text-gray-400 border-r w-40 text-center sticky left-24 bg-gray-50 z-[75]">姓名</th>
                                        {assignmentsForDate.map(a => (<AssignmentHeader key={a.id} assignment={a} authMode={authMode} onDelete={()=>{}} />))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {DEFAULT_STUDENTS.map(s => (
                                        <tr key={s.id} className="hover:bg-indigo-50 transition-colors group">
                                            <td onClick={() => setDashboardStudent(s)} className="p-6 text-2xl font-bold text-gray-400 border-r text-center sticky left-0 bg-white group-hover:bg-indigo-50 z-10 cursor-pointer">{s.id}</td>
                                            <td onClick={() => setDashboardStudent(s)} className="p-6 text-3xl font-black text-gray-800 border-r text-center sticky left-24 bg-white group-hover:bg-indigo-50 z-10 cursor-pointer">{s.name[0]}O{s.name.slice(2)}</td>
                                            {assignmentsForDate.map(a => {
                                                const status = a.submissionStatus?.[s.id] ?? true;
                                                return (<td key={a.id} className="p-4 border-r text-center"><button onClick={() => handleToggleSubmission(a.assignmentName, s.id, status)} className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 ${status === true ? 'bg-green-500' : (status === 'late' ? 'bg-yellow-400' : 'bg-red-500 border-4 border-red-200')}`}>{status === false ? <X className="w-8 h-8" /> : <Check className="w-8 h-8" />}</button></td>);
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {assignmentsForDate.length === 0 && <div className="p-20 text-center text-gray-300 font-bold text-3xl">此日期尚未建立作業紀錄</div>}
                        </div>
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default App;
