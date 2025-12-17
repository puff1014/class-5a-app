import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, query, Timestamp, getDocs, writeBatch, serverTimestamp, getDoc, where } from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BookOpen, Calendar, Download, Upload, Plus, X, Check, LogOut, FileText, Eye, EyeOff, Edit, Star, Moon, Activity, BarChart2, Archive, ArchiveRestore } from 'lucide-react';

// --- 版本資訊 ---
const VERSION = 'v17.3 - 完美對齊修正版'; 

// --- Config ---
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

// --- Helpers ---
const getTodayDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const calculateScore = (dueDate, submitDate) => {
    if (!dueDate || !submitDate) return 60; 
    const d1 = new Date(dueDate); const d2 = new Date(submitDate); d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
    if (d2 <= d1) return 100;
    const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)); 
    return Math.max(0, 100 - (diffDays * 5));
};
const getScoreFromStatus = (status, dueDate) => {
    if (status === true || status === undefined) return 100;
    if (status === false) return 0;
    if (status === 'late') return 60; 
    if (typeof status === 'object' && status.status === 'late') return calculateScore(dueDate, status.date);
    return 0; 
};

// --- Components ---
const CoinIcon = ({ type }) => {
    const base = `rounded-full border-[2px] flex items-center justify-center shadow-sm w-6 h-6 bg-white`;
    if (type === 'GOLD') return <div className={`${base} border-yellow-400 text-yellow-500`}><Moon className="w-3 h-3 fill-current" /></div>;
    if (type === 'SILVER') return <div className={`${base} border-gray-400 text-gray-500`}><Star className="w-3 h-3 fill-current" /></div>;
    return <div className={`${base} border-orange-700 text-orange-800`}><span className="font-bold text-xs">$</span></div>;
};

const DEFAULT_STUDENTS = Array.from({length:10}, (_,i)=>({id:String(i+1), name:`學生${i+1}`})).map((s,i)=>({id:String(i+1), name:['陳昕佑','徐偉綸','蕭淵群','吳秉晏','呂秉蔚','吳家昇','翁芷儀','鄭筱妍','周筱涵','李婕妤'][i]}));
const INITIAL_CATEGORIES = [{name:'數課',order:0},{name:'數習',order:1},{name:'數八',order:2},{name:'成語()+P.',order:3},{name:'聯P.',order:4},{name:'國',order:5}];
const ItemTypes = { ASSIGNMENT: 'assignment' };

const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;

// --- Chart Components ---
const SimpleLineChart = ({ data }) => {
    if (!data?.length) return <div className="text-gray-400 text-center py-10">無數據</div>;
    const padding = 40, width = 600, height = 300, chartW = width - padding*2, chartH = height - padding*2;
    const points = data.map((d, i) => `${(i/(data.length-1))*chartW+padding},${chartH-(isNaN(d.value)?0:d.value)/100*chartH+padding}`).join(' ');
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
            {[0,60,80,100].map(v => <line key={v} x1={padding} y1={chartH-v/100*chartH+padding} x2={width-padding} y2={chartH-v/100*chartH+padding} stroke={v===60?'#fca5a5':v===80?'#86efac':'#e5e7eb'} strokeWidth="2" strokeDasharray={v===0?'':'5,5'} />)}
            <polyline fill="none" stroke="#3b82f6" strokeWidth="4" points={points} strokeLinecap="round" strokeLinejoin="round" />
            {data.map((d, i) => {
                const x = (i/(data.length-1))*chartW+padding, y = chartH-(isNaN(d.value)?0:d.value)/100*chartH+padding;
                const color = d.value>=100?'#22c55e':d.value>=80?'#facc15':d.value>=60?'#f97316':d.value>0?'#ef4444':'#991b1b';
                return <circle key={i} cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" />;
            })}
        </svg>
    );
};

const SimpleStackedBarChart = ({ data }) => {
    if (!data?.length) return <div className="text-gray-400 text-center py-10">無數據</div>;
    const padding = 40, width = 600, height = 300, chartW = width - padding*2, chartH = height - padding*2;
    const max = Math.max(...data.map(d=>d.details.count), 5);
    const barW = Math.min(50, chartW/data.length*0.6);
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
            {data.map((d, i) => {
                const x = padding + (i*(chartW/data.length)) + (chartW/data.length-barW)/2;
                const hG = (d.details.onTime/max)*chartH, hA = (d.details.late/max)*chartH, hR = (d.details.missing/max)*chartH;
                const yG = (height-padding)-hG, yA = yG-hA, yR = yA-hR;
                return (
                    <g key={i}>
                        {d.details.onTime>0 && <rect x={x} y={yG} width={barW} height={hG} fill="#4ade80" stroke="white" />}
                        {d.details.late>0 && <rect x={x} y={yA} width={barW} height={hA} fill="#f59e0b" stroke="white" />}
                        {d.details.missing>0 && <rect x={x} y={yR} width={barW} height={hR} fill="#f87171" stroke="white" />}
                        <text x={x+barW/2} y={height-10} textAnchor="middle" fontSize="12" fill="#374151">{d.label}</text>
                    </g>
                );
            })}
        </svg>
    );
};

const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose }) => {
    const [mode, setMode] = useState('SCORE');
    const data = useMemo(() => {
        const stats = {};
        Object.keys(allAssignmentsByDate).sort().forEach(date => {
            const m = `${new Date(date).getMonth()+1}月`;
            if(!stats[m]) stats[m] = { score:0, count:0, onTime:0, late:0, missing:0 };
            allAssignmentsByDate[date].forEach(a => {
                const s = getScoreFromStatus(a.submissionStatus[student.id], a.assignmentDate);
                stats[m].count++; stats[m].score+=s;
                if(s===100) stats[m].onTime++; else if(s===0) stats[m].missing++; else stats[m].late++;
            });
        });
        return Object.keys(stats).map(k => ({ label: k, value: stats[k].count?stats[k].score/stats[k].count:0, details: stats[k] }));
    }, [allAssignmentsByDate, student.id]);
    
    const avg = data.length ? (data.reduce((a,b)=>a+b.value,0)/data.length).toFixed(1) : 0;
    const color = avg>=90?'text-green-600':avg>=80?'text-green-500':avg>=60?'text-orange-500':'text-red-500';

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
                <div className={`p-4 flex justify-between items-center text-white ${mode==='SCORE'?'bg-blue-500':'bg-indigo-500'}`}>
                    <h2 className="text-2xl font-bold">{student.name} 學習歷程</h2><button onClick={onClose}><X/></button>
                </div>
                <div className="p-6 overflow-auto bg-gray-50 flex-1">
                    <div className="flex justify-center gap-2 mb-6">
                        <button onClick={()=>setMode('SCORE')} className={`px-4 py-1 rounded font-bold ${mode==='SCORE'?'bg-white text-blue-600 shadow':'text-gray-500'}`}>分數趨勢</button>
                        <button onClick={()=>setMode('COUNT')} className={`px-4 py-1 rounded font-bold ${mode==='COUNT'?'bg-white text-indigo-600 shadow':'text-gray-500'}`}>作業統計</button>
                    </div>
                    <div className="text-center mb-6"><p className="text-gray-500 font-bold">平均分</p><p className={`text-5xl font-black ${color}`}>{avg}</p></div>
                    <div className="bg-white p-4 rounded-xl shadow h-[300px]">{mode==='SCORE'?<SimpleLineChart data={data}/>:<SimpleStackedBarChart data={data}/>}</div>
                </div>
            </div>
        </div>
    );
};

const RewardOverlay = ({ onClose }) => { useEffect(() => { setTimeout(onClose, 2000); }, [onClose]); return <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"><h2 className="text-white text-5xl font-bold">獎勵動畫!</h2></div>; };
const CustomAlert = ({ message, onClose }) => ( <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"><div className="bg-white p-6 rounded-xl"><h3 className="text-xl font-bold mb-4">{message}</h3><button onClick={onClose} className="bg-blue-600 text-white px-5 py-2 rounded">確定</button></div></div> );

const useStudentBank = (db, isAuth, isOff, students) => {
    const [bank, setBank] = useState(() => { const d={}; students.forEach(s=>d[s.id]={bronze:0,silver:0,gold:0}); return d; });
    useEffect(() => { if(isOff||!db)return; const q=query(collection(db,getBankCollectionPath())); return onSnapshot(q,s=>{ const r={}; s.docs.forEach(d=>r[d.id]=d.data()); setBank(p=>{ const n={...p}; Object.keys(r).forEach(k=>n[k]={bronze:Number(r[k].bronze)||0,silver:Number(r[k].silver)||0,gold:Number(r[k].gold)||0}); return n; }); }); }, [db,isOff]);
    const update = useCallback((sid, b, s, g) => { setBank(p=>{ const c=p[sid]||{bronze:0,silver:0,gold:0}; return {...p, [sid]:{bronze:c.bronze+(b==='RESET'?-c.bronze:b), silver:c.silver+(s==='RESET'?-c.silver:s), gold:c.gold+(g==='RESET'?-c.gold:g)}}; }); if(db&&!isOff) setDoc(doc(db,getBankCollectionPath(),sid), {lastUpdated:serverTimestamp()}, {merge:true}); }, [db,isOff]);
    return { bank, update };
};

const useCategories = (db, uid, isAuth, setAlert, isOff, students) => { 
    const [cats, setCats] = useState(INITIAL_CATEGORIES); 
    const initStatus = useMemo(()=>students.reduce((a,b)=>{a[b.id]=true;return a;},{}),[students]);
    return { categories: cats, loadingCategories: false, getInitialSubmissionStatus: initStatus }; 
};

const LoginScreen = ({ onAdmin, onGuest, loading, error }) => {
    const [e, setE] = useState(''); const [p, setP] = useState('');
    return (
        <div className="fixed inset-0 bg-blue-50 flex items-center justify-center z-[10000]">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-4">
                <h1 className="text-3xl font-bold text-center mb-6">五年甲班作業表</h1>
                <button onClick={onGuest} className="w-full py-2 bg-blue-500 text-white rounded font-bold">訪客進入</button>
                <div className="border-t pt-4">
                     <input placeholder="Email" value={e} onChange={x=>setE(x.target.value)} className="w-full p-2 border rounded mb-2"/>
                     <input type="password" placeholder="Password" value={p} onChange={x=>setP(x.target.value)} className="w-full p-2 border rounded mb-4"/>
                     <button onClick={()=>onAdmin(e,p)} className="w-full py-2 bg-red-500 text-white rounded font-bold">老師登入</button>
                </div>
                {error && <p className="text-red-500 text-center">{error}</p>}
                {loading && <p className="text-gray-500 text-center">載入中...</p>}
            </div>
        </div>
    );
};
// --- [Part 2] 主程式與介面 (v17.3 完美對齊版) ---

const App = () => {
  // --- States ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [allAssignmentsByDate, setAllAssignmentsByDate] = useState({});
  const [selectedDisplayDate, setSelectedDisplayDate] = useState(getTodayDate()); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  
  // UI States
  const [newAssignmentDate, setNewAssignmentDate] = useState(getTodayDate()); 
  const [showAllMissingModal, setShowAllMissingModal] = useState(false);
  const [focusedStudentId, setFocusedStudentId] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [rewardState, setRewardState] = useState(null); 
  const [dashboardStudent, setDashboardStudent] = useState(null);
  const [unlockClicks, setUnlockClicks] = useState({});
  const [showArchived, setShowArchived] = useState(false); // 封存開關

  // Login States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('GUEST'); 
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Hooks
  const { students } = useStudents(db, isOffline);
  const { bankData, updateBankBalance } = useStudentBank(db, isAuthReady, isOffline, students);
  
  // Semester Logic
  const { defaultSemester, defaultMonth } = useMemo(() => { 
      const today = new Date(); const m = today.getMonth() + 1; 
      const sem = (m >= 2 && m <= 7) ? 'S2' : 'S1';
      return { defaultSemester: sem, defaultMonth: String(m).padStart(2, '0') }; 
  }, []);
  const [selectedSemester, setSelectedSemester] = useState(defaultSemester); 
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  
  const semesters = [ 
      { id: 'S1', name: `上學期 (${2025}/8 - ${2026}/1)`, startYear: 2025, endYear: 2026 }, 
      { id: 'S2', name: `下學期 (${2026}/2 - ${2026}/7)`, startYear: 2026, endYear: 2026 }, 
  ];
  const months = useMemo(() => [ 
      { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' }, { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' }, 
      { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' }, 
      { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' }, 
      { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' }, 
      { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' }, { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' }, 
      { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' }, 
  ], []);

  const { categories, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students); 

  // --- Init ---
  useEffect(() => {
    if (!firebaseConfig) { setError("設定檔遺失"); return; }
    try {
      const app = initializeApp(firebaseConfig);
      setDb(getFirestore(app));
      setAuth(getAuth(app));
      return onAuthStateChanged(getAuth(app), u => {
        if (u) { setUserId(u.uid); setIsAuthReady(true); setIsAuthenticated(true); setAuthMode(u.isAnonymous?'GUEST':'ADMIN'); }
        else { setIsAuthenticated(false); setAuthMode('GUEST'); }
        setIsCheckingAuth(false); setLoadingLogin(false);
      });
    } catch (e) { setError("初始化失敗"); setLoading(false); setIsCheckingAuth(false); }
  }, []);

  // --- Handlers ---
  const handleAdminLogin = async (e, p) => { setLoadingLogin(true); try { await signInWithEmailAndPassword(auth, e, p); } catch(x) { setLoginError('登入失敗'); setLoadingLogin(false); } };
  const handleGuestLogin = async () => { setLoadingLogin(true); try { await signInAnonymously(auth); } catch(x) { setLoginError('失敗'); setLoadingLogin(false); } };
  const handleLogout = async () => { await signOut(auth); setIsAuthenticated(false); };
  
  // --- Data Fetch ---
  useEffect(() => { 
      if (isOffline) { setLoading(false); return; } 
      if (!isAuthReady || !db || !userId) return; 
      const sem = semesters.find(s => s.id === selectedSemester); if(!sem) return;
      const q = query(collection(db, getAssignmentCollectionPath()), where("assignmentDate", ">=", `${sem.startYear}-${sem.id==='S1'?'08':'02'}-01`), where("assignmentDate", "<=", `${sem.endYear}-${sem.id==='S1'?'01':'07'}-31`));
      return onSnapshot(q, s => { 
          const d = {}; s.docs.forEach(x => { const v=x.data(); if(v.assignmentDate) { if(!d[v.assignmentDate]) d[v.assignmentDate]=[]; d[v.assignmentDate].push({id:x.id,...v}); } }); 
          setAllAssignmentsByDate(d); setLoading(false); 
      }); 
  }, [isAuthReady, db, userId, isOffline, selectedSemester]);

  // --- Computations ---
  const assignmentsForSelectedDate = useMemo(() => (allAssignmentsByDate[selectedDisplayDate]||[]).filter(a=>showArchived||!a.archived).sort((a,b)=>(a.order||0)-(b.order||0)), [allAssignmentsByDate, selectedDisplayDate, showArchived]);
  const assignmentMap = useMemo(() => assignmentsForSelectedDate.reduce((a,b)=>{a[b.assignmentName]=b;return a;},{}), [assignmentsForSelectedDate]);
  const filteredMonths = useMemo(() => months.filter(m => m.semester === selectedSemester), [months, selectedSemester]);
  useEffect(() => { if (!filteredMonths.some(m => m.id === selectedMonth)) setSelectedMonth(filteredMonths[0].id); }, [selectedSemester]);
  const displayedDates = useMemo(() => Object.keys(allAssignmentsByDate).filter(d => d.substring(5, 7) === selectedMonth).sort(), [allAssignmentsByDate, selectedMonth]);

  // --- Actions ---
  const handleToggleArchive = async (id, current) => {
      if (authMode !== 'ADMIN' && !isOffline) return;
      if (isOffline) setAllAssignmentsByDate(p=>{const n={...p}; n[selectedDisplayDate]=n[selectedDisplayDate].map(a=>a.id===id?{...a,archived:!current}:a); return n;});
      else try { await setDoc(doc(db, getAssignmentCollectionPath(), id), { archived: !current }, { merge: true }); } catch(e){}
  };

  const handleToggleSubmission = useCallback(async (name, sid, currentStatus) => {
    const assign = assignmentMap[name]; if (!assign) return;
    let newStatus, shouldUpdate = true;
    const cellKey = `${sid}-${assign.id}`;
    
    // Status Logic: Green(100) -> Red(0) -> Amber(Late) -> Green
    const isGreen = currentStatus === true || currentStatus === undefined;
    const isRed = currentStatus === false;
    
    if (isGreen) {
        newStatus = false; 
        setUnlockClicks(p => { const n={...p}; delete n[cellKey]; return n; });
    } else if (isRed) {
        // [B方案] 寫入日期物件
        newStatus = { status: 'late', date: getTodayDate() };
        setUnlockClicks(p => { const n={...p}; delete n[cellKey]; return n; });
    } else {
        // Late -> Green (需點兩下)
        const clicks = unlockClicks[cellKey] || 0;
        if (clicks < 1) { setUnlockClicks(p => ({...p, [cellKey]: clicks + 1})); shouldUpdate = false; } 
        else { newStatus = true; setUnlockClicks(p => { const n={...p}; delete n[cellKey]; return n; }); }
    }

    if (shouldUpdate) {
        if (isRed && (newStatus.status==='late')) { updateBankBalance(sid, 10, 0, 0); setRewardState({ type: 'BRONZE' }); }
        if (isOffline) setAllAssignmentsByDate(p=>{const n={...p}; n[selectedDisplayDate]=n[selectedDisplayDate].map(a=>a.id===assign.id?{...a,submissionStatus:{...a.submissionStatus,[sid]:newStatus}}:a); return n;});
        else try { await setDoc(doc(db, getAssignmentCollectionPath(), assign.id), { submissionStatus: { [sid]: newStatus } }, { merge: true }); } catch(e){}
    }
  }, [assignmentMap, unlockClicks, updateBankBalance, isOffline, selectedDisplayDate, db]);

  // Legacy Actions (Simplified)
  const handleAddNewDate = async () => {}; // 需補回完整邏輯
  const handleExportData = async () => {}; 
  
  if (isCheckingAuth) return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div><p className="text-xl text-gray-600 font-bold">系統載入中...</p></div>;
  if (!isAuthenticated && !isOffline) return <LoginScreen onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} isLoading={loadingLogin} errorMsg={loginError} />;

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden text-base font-sans">
      {rewardState && <RewardOverlay type={rewardState.type} onClose={()=>setRewardState(null)} />}
      {showBankModal && <StudentBankModal bankData={bankData} onClose={()=>setShowBankModal(false)} onUpdateBalance={updateBankBalance} authMode={authMode} students={students} />}
      {dashboardStudent && <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={()=>setDashboardStudent(null)} />}
      {alertMessage && <CustomAlert message={alertMessage} onClose={()=>setAlertMessage(null)} />}

      <div className="bg-white shadow-md w-full flex flex-col h-full">
        {/* Header - Classic Layout */}
        <header className="p-3 text-center border-b border-gray-200 bg-white relative shrink-0">
           {isOffline && <div className="absolute top-0 left-0 w-full bg-gray-800 text-white py-1 text-sm font-bold z-10">⚠️ 離線模式</div>}
           <button onClick={handleLogout} className="absolute top-3 left-4 flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded text-red-700 font-bold transition z-20 text-sm"><LogOut className="w-4 h-4"/> 登出</button>
           <div className={`flex items-center justify-center text-3xl font-extrabold text-gray-900 mb-1 ${isOffline?'mt-6':''}`}><span className="text-orange-500 text-4xl mr-2">🐻‍❄️</span><span className="text-3xl">五年甲班訂正作業表</span><span className="text-green-600 text-4xl ml-2">🐼</span></div>
           <p className="text-lg text-gray-600 mb-2">{new Date().toLocaleDateString('zh-TW', {year:'numeric', month:'numeric', day:'numeric', weekday:'long'})}</p>
           <p className="absolute right-4 top-4 text-sm text-gray-500 font-bold z-30">版本: {VERSION}</p>
        </header>

        <div className="flex-1 overflow-auto bg-gray-50 p-3 relative">
            {/* Controls Row 1 */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-lg">
                <label className="font-semibold text-gray-700">學期：</label>
                <select value={selectedSemester} onChange={(e)=>setSelectedSemester(e.target.value)} className="p-2 border border-gray-300 rounded font-semibold text-base">{semesters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <label className="font-semibold text-gray-700">月份：</label>
                <select value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} className="p-2 border border-gray-300 rounded font-semibold text-base" style={{backgroundColor:months.find(m=>m.id===selectedMonth)?.color}}>{filteredMonths.map(m=><option key={m.id} value={m.id} style={{backgroundColor:m.color}}>{m.name}</option>)}</select>
                
                {/* Archive Switch */}
                <div className="flex items-center ml-2 cursor-pointer select-none group" onClick={() => setShowArchived(!showArchived)}>
                    <div className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ${showArchived ? 'bg-blue-500' : ''}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${showArchived ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-2 text-gray-600 font-bold text-base">顯示封存</span>
                </div>
                <button onClick={()=>setShowBankModal(true)} className="px-4 py-2 text-lg font-medium rounded text-white bg-green-600 hover:bg-green-700 shadow-sm flex items-center ml-auto"><BookOpen className="h-5 w-5 mr-1"/>訂正存簿</button>
            </div>

            {/* Date Tabs */}
            <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto pb-1">
                {displayedDates.map(date => (
                    <button key={date} onClick={()=>setSelectedDisplayDate(date)} className={`px-4 py-2 rounded text-xl font-bold whitespace-nowrap transition-all shadow-sm ${date===selectedDisplayDate ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>{date.slice(5)}</button>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <input type="date" value={newAssignmentDate} onChange={(e)=>setNewAssignmentDate(e.target.value)} className="p-1.5 text-lg border border-gray-300 rounded font-semibold w-[160px]" />
                <button onClick={handleAddNewDate} className="px-3 py-2 text-lg font-medium rounded text-white bg-yellow-500 hover:bg-yellow-600 shadow-sm">+ 新增日期</button>
                <button onClick={handleExportData} className="px-3 py-2 text-lg font-medium rounded text-white bg-fuchsia-400 hover:bg-fuchsia-500 shadow-sm flex items-center"><Download className="h-5 w-5 mr-1"/>匯出</button>
                <button onClick={()=>setShowAllMissingModal(true)} className="px-3 py-2 text-lg font-medium rounded text-white bg-orange-500 hover:bg-orange-600 shadow-sm flex items-center"><FileText className="h-5 w-5 mr-1"/>未完成總表</button>
                <div className="relative">
                    <input type="file" id="importFile" accept="application/json" onChange={()=>{}} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button className="px-3 py-2 text-lg font-medium rounded text-white bg-cyan-500 hover:bg-cyan-600 shadow-sm flex items-center"><Upload className="h-5 w-5 mr-1"/>匯入</button>
                </div>
            </div>

            {/* Date Title */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center"><span className="text-gray-500 mr-2 text-3xl">📋</span>{selectedDisplayDate ? `${new Date(selectedDisplayDate).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})} 作業確認表` : '請選擇日期'}</h2>
                <div className="flex items-center gap-2">
                     {focusedStudentId && <button onClick={()=>setFocusedStudentId(null)} className="px-3 py-2 text-lg font-medium rounded text-white bg-gray-600 shadow-sm flex items-center"><Eye className="h-5 w-5 mr-1"/>顯示全部</button>}
                     <button className="px-3 py-2 text-lg font-medium rounded text-white bg-blue-400 hover:bg-blue-500 shadow-sm flex items-center"><Plus className="h-5 w-5 mr-1"/>新增作業</button>
                </div>
            </div>

            {/* Main Table (修正後) */}
            <div className={`w-full relative border border-gray-300 rounded shadow-lg overflow-y-auto overflow-x-auto h-[calc(100vh-280px)] min-h-[400px] mb-6 ${focusedStudentId?'bg-blue-50 border-blue-300':'bg-white'}`}>
                <div className="pb-2 min-w-max">
                    {assignmentsForSelectedDate.length > 0 && (
                        <table className="divide-y divide-gray-300 w-full">
                            <thead className="bg-gray-100 sticky top-0 z-[70]">
                                <tr>
                                    {/* 座號 60px */}
                                    <th className="px-2 py-3 text-lg font-semibold uppercase tracking-wider text-gray-600 border-r border-gray-300 sticky left-0 top-0 bg-gray-100 z-[70] text-center shadow-sm" style={{minWidth:'60px', width:'60px', left:'0px'}}>座號</th>
                                    {/* 姓名 120px (加寬) */}
                                    <th className="px-2 py-3 text-lg font-semibold uppercase tracking-wider text-gray-600 sticky top-0 bg-gray-100 z-[70] text-center shadow-sm" style={{minWidth:'120px', width:'120px', left:'60px'}}>姓名</th>
                                    {assignmentsForSelectedDate.map(assign => (
                                        <th key={assign.id} className="px-2 py-3 text-lg text-center font-semibold text-gray-800 sticky top-0 bg-gray-100 z-[50] group min-w-[140px]">
                                            <div className="flex flex-col items-center">
                                                <span className={assign.archived ? 'text-gray-400 line-through' : ''}>{assign.assignmentName}</span>
                                                {authMode === 'ADMIN' && (
                                                    <button onClick={()=>handleToggleArchive(assign.id, assign.archived)} className="mt-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition">
                                                        {assign.archived ? <ArchiveRestore className="w-5 h-5"/> : <Archive className="w-5 h-5"/>}
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`divide-y divide-gray-200 ${focusedStudentId?'bg-blue-50':'bg-white'}`}>
                                {(focusedStudentId ? students.filter(s=>s.id===focusedStudentId) : students).map(student => (
                                    <tr key={student.id} className={`group ${focusedStudentId?'bg-blue-100':'hover:bg-blue-50'}`}>
                                        {/* 座號 */}
                                        <td onClick={()=>setFocusedStudentId(focusedStudentId===student.id?null:student.id)} className="px-2 py-3 text-xl font-bold text-gray-500 text-center sticky left-0 bg-white z-[50] border-r cursor-pointer group-hover:bg-blue-100" style={{minWidth:'60px', left:'0px'}}>{student.id}</td>
                                        
                                        {/* 姓名 (修正：使用 Relative 定位確保文字置中，圖示 Absolute 靠右) */}
                                        <td onClick={()=>setFocusedStudentId(focusedStudentId===student.id?null:student.id)} className="px-2 py-3 text-xl font-bold text-gray-800 text-center sticky bg-white z-[50] cursor-pointer group-hover:bg-blue-100 relative" style={{minWidth:'120px', left:'60px'}}>
                                            {/* 文字容器 */}
                                            <div className="w-full text-center">
                                                {student.name[0] + 'O' + student.name.slice(2)}
                                            </div>
                                            {/* 懸浮按鈕 (不佔據 flex 空間) */}
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                                                {/* 聚焦眼睛圖示 */}
                                                <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {focusedStudentId === student.id ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                                </span>
                                                {/* 儀表板圖示 */}
                                                <button onClick={(e)=>{e.stopPropagation();setDashboardStudent(student);}} className="p-1 bg-gray-100 hover:bg-blue-100 rounded-full text-gray-400 hover:text-blue-600 transition shadow-sm opacity-50 group-hover:opacity-100">
                                                    <BarChart2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>

                                        {assignmentsForSelectedDate.map(assign => {
                                            const statusData = assign.submissionStatus[student.id];
                                            const score = getScoreFromStatus(statusData, assign.assignmentDate);
                                            
                                            // 顏色邏輯
                                            let btnClass = "bg-red-100 text-red-600 border-red-200"; 
                                            let content = <X className="h-6 w-6"/>;
                                            
                                            if (score === 100) {
                                                btnClass = "bg-green-100 text-green-700 border-green-200";
                                                content = <Check className="h-6 w-6"/>;
                                            } else if (score > 0) {
                                                if(score >= 80) btnClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                                                else if(score >= 60) btnClass = "bg-orange-100 text-orange-700 border-orange-200";
                                                else btnClass = "bg-orange-200 text-orange-900 border-orange-300";
                                                content = <span className="text-lg font-bold">{score}分</span>;
                                            }

                                            return (
                                                <td key={assign.id} className="p-1 text-center" style={{minWidth:'140px'}}>
                                                    <button onClick={()=>handleToggleSubmission(assign.assignmentName, student.id, statusData)} className={`w-full py-2 rounded-lg border flex items-center justify-center transition active:scale-95 ${btnClass} ${assign.archived?'opacity-50 grayscale':''}`}>
                                                        {content}
                                                    </button>
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
        </div>
      </div>
    </div>
    </DndProvider>
  );
};

export default App;
