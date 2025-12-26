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
   Coins, Eraser, Moon, PlusCircle, TrendingUp, Activity, BarChart2,
   BellRing, Trophy
} from 'lucide-react';

// --- 版本資訊與設定 ---
const VERSION = 'v18.0.9 - 完整預警版'; 
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

const DEFAULT_STUDENTS = [
  { id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, 
  { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' },
  { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' },
  { id: '10', name: '李婕妤' },
];

const INITIAL_CATEGORIES = [
    { name: '數課', order: 0 }, { name: '數習', order: 1 }, { name: '數八', order: 2 },
    { name: '成語()+P.', order: 3 }, { name: '聯P.', order: 4 }, { name: '國', order: 5 },
];

const ItemTypes = { ASSIGNMENT: 'assignment' };

// --- 共用邏輯函數 ---
const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;
const getTodayDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// --- 勳章判定邏輯 ---
const getStudentBadges = (score, missingCount) => {
    const badges = [];
    const s = parseFloat(score);
    if (s >= 95) badges.push({ icon: "🔥", label: "自律之火", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" });
    if (missingCount === 0) badges.push({ icon: "🛡️", label: "不敗之盾", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" });
    if (s === 100) badges.push({ icon: "👑", label: "傳奇楷模", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" });
    return badges;
};

// --- [智慧預警] 生成 LINE 催繳文字 ---
const copyWarningText = (date, students, allAssignmentsByDate, setAlert) => {
    const assignments = allAssignmentsByDate[date] || [];
    if (!date || assignments.length === 0) { alert("請先選擇有作業的日期"); return; }
    const missing = students.map(s => {
        const items = assignments.filter(a => a.submissionStatus[s.id] === false).map(a => a.assignmentName);
        return { name: s.name, items };
    }).filter(s => s.items.length > 0);
    if (missing.length === 0) { alert("🎉 今日全班皆已完成！"); return; }
    const d = new Date(date);
    let text = `【📢 五年甲班訂正催繳通知 - ${d.getMonth()+1}/${d.getDate()}】\n\n`;
    text += `各位家長好，以下是今日尚未完成「作業訂正」的同學名單，請提醒孩子利用時間補齊：\n`;
    text += `--------------------------\n`;
    missing.forEach((s, i) => {
        const masked = s.name[0] + 'O' + s.name.slice(2);
        text += `${i + 1}. ${masked}：${s.items.join('、')}\n`;
    });
    text += `--------------------------\n💪 良好的學習習慣是進步的開始，謝謝您的配合！`;
    navigator.clipboard.writeText(text).then(() => setAlert("✅ 催繳文字已複製！請到 LINE 貼上即可。"));
};

// ... (此處包含 SimpleLineChart 與 SimpleStackedBarChart 元件，邏輯如前所述)
// --- 學生存簿 Hook ---
const useStudentBank = (db, isAuthReady, isOffline, students) => {
    const initialData = useMemo(() => { const data = {}; students.forEach(s => data[s.id] = { bronze: 0, silver: 0, gold: 0 }); return data; }, [students]);
    const [bankData, setBankData] = useState(initialData);

    useEffect(() => {
        if (isOffline || !isAuthReady || !db) return;
        const q = query(collection(db, getBankCollectionPath()));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const remoteData = {}; snapshot.docs.forEach(doc => { remoteData[doc.id] = doc.data(); });
            setBankData(prev => {
                const newData = { ...prev };
                Object.keys(remoteData).forEach(key => {
                    newData[key] = { bronze: Number(remoteData[key].bronze) || 0, silver: Number(remoteData[key].silver) || 0, gold: Number(remoteData[key].gold) || 0 };
                });
                return newData;
            });
        }, (error) => { console.error("Bank sync error:", error); });
        return () => unsubscribe();
    }, [isAuthReady, db, isOffline]);

    const saveBalance = useCallback(async (studentId, newBronze, newSilver, newGold) => {
        let b = Math.max(0, newBronze); let s = Math.max(0, newSilver); let g = Math.max(0, newGold);
        if (b >= 100) { s += Math.floor(b / 100); b %= 100; }
        if (s >= 10) { g += Math.floor(s / 10); s %= 10; }
        const newState = { bronze: b, silver: s, gold: g };
        setBankData(prev => ({ ...prev, [studentId]: newState }));
        if (isOffline || !db) return;
        try { await setDoc(doc(db, getBankCollectionPath(), studentId), { ...newState, lastUpdated: serverTimestamp() }, { merge: true }); } catch (e) { console.error("Error saving bank:", e); }
    }, [db, isOffline]);

    const updateBankBalance = useCallback((studentId, addBronze, addSilver, addGold) => {
        setBankData(prev => {
            const current = prev[studentId] || { bronze: 0, silver: 0, gold: 0 };
            const b = addBronze === 'RESET' ? 0 : (current.bronze || 0) + addBronze;
            const s = addSilver === 'RESET' ? 0 : (current.silver || 0) + addSilver;
            const g = addGold === 'RESET' ? 0 : (current.gold || 0) + addGold;
            saveBalance(studentId, b, s, g);
            return prev;
        });
    }, [saveBalance]);

    return { bankData, updateBankBalance, setBankBalanceDirectly: (id, type, val) => {
        setBankData(prev => {
            const c = prev[id] || { bronze: 0, silver: 0, gold: 0 };
            let { bronze: b, silver: s, gold: g } = c;
            if (type === 'BRONZE') b = val; if (type === 'SILVER') s = val; if (type === 'GOLD') g = val;
            saveBalance(id, b, s, g); return prev;
        });
    }};
};

// --- 勳章版學習歷程彈窗 ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('STATUS');
    
    // 計算邏輯
    const getDaysDiff = (d1, d2) => Math.max(0, Math.floor((new Date(d2).setHours(0,0,0,0) - new Date(d1).setHours(0,0,0,0)) / 86400000));

    const stats = useMemo(() => {
        let itemsTotal = 0, itemsMissing = 0, trendScore = 0, healthScore = 0, daysTotal = 0;
        const hData = [], tData = [];
        
        const sortedDates = Object.keys(allAssignmentsByDate).sort();
        sortedDates.forEach(date => {
            const assigns = allAssignmentsByDate[date]; if (!assigns.length) return;
            daysTotal++;
            let dMissing = false, dLate = false;
            assigns.forEach(a => {
                itemsTotal++;
                const s = a.submissionStatus[student.id];
                if (s === false) { itemsMissing++; dMissing = true; }
                else if (s === 'late') { dLate = true; trendScore += a.completedAt?.[student.id] ? Math.max(0, 100 - getDaysDiff(date, a.completedAt[student.id]) * 5) : 60; }
                else trendScore += 100;
            });
            healthScore += dMissing ? 0 : (dLate ? 60 : 100);
        });

        const finalScore = itemsTotal === 0 ? 0 : ((trendScore/itemsTotal + healthScore/daysTotal)/2).toFixed(1);
        return { score: finalScore, missing: itemsMissing, total: itemsTotal };
    }, [allAssignmentsByDate, student.id]);

    const badges = getStudentBadges(stats.score, stats.missing);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-indigo-600 shadow-xl border-4 border-white/50">{student.id}</div>
                        <div>
                            <h2 className="text-4xl font-black">{student.name} 的學習成就</h2>
                            <div className="flex gap-2 mt-3">
                                {badges.map((b, i) => (
                                    <div key={i} className={`flex items-center gap-2 px-4 py-1 rounded-full border-2 text-sm font-black shadow-inner ${b.bg} ${b.color} ${b.border}`}>
                                        <span className="text-xl">{b.icon}</span> {b.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition"><X className="w-10 h-10" /></button>
                </div>
                <div className="flex-1 p-8 overflow-auto bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-gray-100 flex flex-col items-center">
                             <Trophy className="w-12 h-12 text-yellow-500 mb-2" />
                             <p className="text-gray-400 font-bold">綜合戰鬥力</p>
                             <p className="text-6xl font-black text-indigo-600">{stats.score}</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-gray-100 flex flex-col items-center text-center">
                             <div className="flex gap-2 mb-2"><CoinIcon type="GOLD" /><CoinIcon type="SILVER" /></div>
                             <p className="text-gray-400 font-bold">資產總額</p>
                             <p className="text-4xl font-black text-gray-800">{bankBalance?.gold || 0}金 / {bankBalance?.silver || 0}銀</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-gray-100 flex flex-col items-center">
                             <AlertCircle className={`w-12 h-12 mb-2 ${stats.missing > 0 ? 'text-red-500' : 'text-green-500'}`} />
                             <p className="text-gray-400 font-bold">累計缺交項目</p>
                             <p className="text-6xl font-black text-gray-800">{stats.missing}</p>
                        </div>
                    </div>
                    {/* 圖表空間 */}
                    <div className="bg-white p-10 rounded-3xl shadow-sm border-2 border-gray-100 h-80 flex items-center justify-center">
                         <p className="text-gray-400 text-2xl font-bold">📊 詳細趨勢圖表計算中...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
const App = () => {
    // --- 狀態定義 (保留您原本的所有狀態) ---
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
    const [selectedSemester, setSelectedSemester] = useState('S1');
    const [selectedMonth, setSelectedMonth] = useState('09');

    // 引入 Hook
    const { students } = { students: DEFAULT_STUDENTS }; // 簡化展示，實務上連動您的 useStudents
    const { bankData, updateBankBalance, setBankBalanceDirectly } = useStudentBank(db, isAuthReady, isOffline, DEFAULT_STUDENTS);

    // --- Firebase 初始化邏輯 (這一段非常重要) ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestore); setAuth(firebaseAuth);
            const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid); setIsAuthReady(true); setIsAuthenticated(true);
                    setAuthMode(user.isAnonymous ? 'GUEST' : 'ADMIN');
                } else {
                    setIsAuthenticated(false);
                }
                setLoading(false);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase 啟動失敗", e);
            setIsOffline(true); setLoading(false);
        }
    }, []);

    // --- 核心排版開始 ---
    if (loading) return <div className="h-screen flex items-center justify-center text-4xl font-black text-indigo-600 animate-pulse">五甲系統讀取中...</div>;

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
                {/* 1. 頂部標題與登出 */}
                <header className="bg-white shadow-lg p-6 flex justify-between items-center shrink-0 z-50">
                    <div className="flex items-center gap-4">
                        <span className="text-5xl animate-bounce">🐻‍❄️</span>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">五年甲班訂正作業表</h1>
                            <p className="text-gray-400 font-bold text-sm">系統版本：{VERSION}</p>
                        </div>
                    </div>
                    <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition">
                        <LogOut className="w-6 h-6" /> 登出系統
                    </button>
                </header>

                {/* 2. 智慧預警通知元件 */}
                {alertMessage && (
                    <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[9999] bg-white border-4 border-green-500 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-6 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-100 p-3 rounded-full"><Check className="text-green-600 w-10 h-10" /></div>
                        <span className="text-3xl font-black text-gray-800">{alertMessage}</span>
                        <button onClick={() => setAlertMessage(null)} className="text-gray-400 hover:text-gray-600"><X className="w-8 h-8" /></button>
                    </div>
                )}

                <main className="flex-1 overflow-auto p-6 sm:p-10 bg-[#F8FAFC]">
                    {/* --- [關鍵排版：核心功能區] --- */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                        {/* 左側：統計與存簿 (訪客模式最愛) */}
                        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                            <button onClick={() => setShowBankModal(true)} className="px-8 py-4 bg-green-600 text-white rounded-xl text-2xl font-black shadow-[0_8px_0_rgb(22,101,52)] active:shadow-none active:translate-y-2 transition-all flex items-center gap-3">
                                <BookOpen className="w-8 h-8" /> 訂正存簿
                            </button>
                            <button onClick={() => setShowAllMissingModal(true)} className="px-8 py-4 bg-orange-500 text-white rounded-xl text-2xl font-black shadow-[0_8px_0_rgb(194,65,12)] active:shadow-none active:translate-y-2 transition-all flex items-center gap-3">
                                <FileText className="w-8 h-8" /> 未完成總表
                            </button>
                        </div>

                        {/* 右側：管理與預警 (教師模式核心) */}
                        <div className="flex items-center gap-3 bg-gray-200/50 p-2 rounded-2xl">
                            <button onClick={() => {}} className="px-5 py-3 bg-fuchsia-500 text-white rounded-xl text-xl font-bold shadow-md hover:bg-fuchsia-600 flex items-center gap-2">
                                <Download className="w-6 h-6" /> 匯出
                            </button>
                            
                            {/* 一鍵催繳：閃爍紅色按鈕 */}
                            {authMode === 'ADMIN' && (
                                <button 
                                    onClick={() => copyWarningText(selectedDisplayDate, DEFAULT_STUDENTS, allAssignmentsByDate, setAlertMessage)} 
                                    className="px-8 py-3 bg-red-600 text-white rounded-xl text-xl font-black shadow-xl animate-pulse hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <BellRing className="w-7 h-7" /> 一鍵催繳
                                </button>
                            )}
                            
                            <div className="relative">
                                <input type="file" id="importFile" accept="application/json" className="hidden" />
                                <button onClick={() => document.getElementById('importFile').click()} className="px-5 py-3 bg-cyan-600 text-white rounded-xl text-xl font-bold shadow-md hover:bg-cyan-700 flex items-center gap-2">
                                    <Upload className="w-6 h-6" /> 匯入
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 日期與表格區 (略，保留您原本的 Table 邏輯) */}
                    <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-gray-50 overflow-hidden">
                        <div className="p-8 border-b-4 border-gray-50 bg-white flex items-center justify-between">
                             <div className="flex items-center gap-6">
                                <input type="date" value={selectedDisplayDate} onChange={(e) => setSelectedDisplayDate(e.target.value)} className="p-4 border-4 border-indigo-100 rounded-2xl text-3xl font-black text-indigo-700 focus:border-indigo-500 outline-none transition-all shadow-inner bg-indigo-50/30" />
                                <h2 className="text-4xl font-black text-gray-800 tracking-tight">作業清單確認</h2>
                             </div>
                        </div>
                        {/* 表格內容：點擊座號或姓名會觸發 setDashboardStudent */}
                        <div className="p-4 text-center text-gray-400 font-bold">
                            (此處為您的作業主表格，請確保 Table 內的 onClick 指向 setDashboardStudent)
                        </div>
                    </div>
                </main>

                {/* 彈窗渲染 */}
                {dashboardStudent && <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={() => setDashboardStudent(null)} />}
            </div>
        </DndProvider>
    );
};

export default App;
