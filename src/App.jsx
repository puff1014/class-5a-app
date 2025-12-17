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
    Coins, Eraser, Moon, PlusCircle, TrendingUp, TrendingDown, Activity, BarChart2,
    Archive, ArchiveRestore
} from 'lucide-react';

// --- 版本資訊 ---
const VERSION = 'v17.0 - 智能分數與封存版'; 

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

// --- [新增] 日期與分數計算工具 ---
const getTodayDate = () => { 
    const d = new Date(); 
    const year = d.getFullYear(); 
    const month = String(d.getMonth() + 1).padStart(2, '0'); 
    const day = String(d.getDate()).padStart(2, '0'); 
    return `${year}-${month}-${day}`; 
};

// 計算分數核心邏輯 (B方案)
const calculateScore = (dueDate, submitDate) => {
    // 舊資料相容：若無日期資訊，預設給 60 分 (及格邊緣)
    if (!dueDate || !submitDate) return 60; 

    const d1 = new Date(dueDate);
    const d2 = new Date(submitDate);
    // 歸零時間，只比較日期
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);

    if (d2 <= d1) return 100; // 準時或提早

    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // 規則：遲交一天扣 5 分，最低 0 分
    let score = 100 - (diffDays * 5);
    return Math.max(0, score);
};

// 解析狀態並回傳分數
const getScoreFromStatus = (statusData, dueDate) => {
    // 1. 準時 (True / Undefined)
    if (statusData === true || statusData === undefined) return 100;
    // 2. 缺交 (False)
    if (statusData === false) return 0;
    
    // 3. 舊版遲交 (字串 'late') -> 預設 60 分
    if (statusData === 'late') return 60; 
    
    // 4. 新版遲交 (物件 { status: 'late', date: 'YYYY-MM-DD' })
    if (typeof statusData === 'object' && statusData.status === 'late') {
        return calculateScore(dueDate, statusData.date);
    }
    
    return 0; // Fallback
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

const INITIAL_CATEGORIES = [
    { name: '數課', order: 0 }, { name: '數習', order: 1 }, { name: '數八', order: 2 },
    { name: '成語()+P.', order: 3 }, { name: '聯P.', order: 4 }, { name: '國', order: 5 },
];

const ItemTypes = { ASSIGNMENT: 'assignment' };

// 公開路徑
const getAssignmentCollectionPath = () => `/artifacts/${appId}/public/data/assignments`;
const getCategoryCollectionPath = () => `/artifacts/${appId}/public/data/categories`;
const getBankCollectionPath = () => `/artifacts/${appId}/public/data/student_bank`;

// --- [修改] SVG 折線圖元件 (顏色邏輯更新) ---
const SimpleLineChart = ({ data, width = 600, height = 300 }) => {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據繪製圖表</div>;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxY = 100;

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
                // [修改] 顏色邏輯：琥珀色階
                let dotColor = "#b45309"; // 深焦糖 (低分)
                if (safeValue >= 100) dotColor = "#22c55e"; // 綠 (滿分)
                else if (safeValue >= 80) dotColor = "#facc15"; // 黃 (優秀)
                else if (safeValue >= 60) dotColor = "#f97316"; // 橘 (及格)
                else if (safeValue > 0) dotColor = "#ef4444"; // 紅 (不及格)
                else dotColor = "#991b1b"; // 深紅 (0分)

                return (
                    <g key={i} className="group">
                        <circle cx={x} cy={y} r="6" fill={dotColor} stroke="white" strokeWidth="2" className="transition-all duration-300 group-hover:r-8 cursor-pointer"/>
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <rect x={x - 20} y={y - 35} width="40" height="25" rx="4" fill="black" fillOpacity="0.8" />
                            <text x={x} y={y - 18} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{safeValue.toFixed(0)}</text>
                        </g>
                        <text x={x} y={height - 10} textAnchor="middle" fontSize="14" fill="#374151" fontWeight="500">{d.label}</text>
                    </g>
                );
            })}
        </svg>
    );
};

// --- [修改] SVG 堆疊長條圖元件 (熱點圖改色) ---
const SimpleStackedBarChart = ({ data, width = 600, height = 300 }) => {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-10">尚無足夠數據繪製圖表</div>;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxTotal = Math.max(...data.map(d => d.details.count), 5);
    const barWidth = Math.min(60, chartWidth / data.length * 0.6);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-100">
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
            
            {data.map((d, i) => {
                const x = padding + (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2;
                const totalHeight = chartHeight;
                // 高度計算
                const onTimeHeight = (d.details.onTime / maxTotal) * totalHeight;
                const lateHeight = (d.details.late / maxTotal) * totalHeight;
                const missingHeight = (d.details.missing / maxTotal) * totalHeight;

                const yGreen = (height - padding) - onTimeHeight;
                const yAmber = yGreen - lateHeight;
                const yRed = yAmber - missingHeight;

                return (
                    <g key={i} className="group">
                        {/* 綠色：準時 */}
                        {d.details.onTime > 0 && (
                            <rect x={x} y={yGreen} width={barWidth} height={onTimeHeight} fill="#4ade80" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>
                        )}
                        {/* [修改] 琥珀色：補交 (取代原本的黃色) */}
                        {d.details.late > 0 && (
                            <rect x={x} y={yAmber} width={barWidth} height={lateHeight} fill="#f59e0b" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>
                        )}
                        {/* 紅色：缺交 */}
                        {d.details.missing > 0 && (
                            <rect x={x} y={yRed} width={barWidth} height={missingHeight} fill="#f87171" stroke="white" strokeWidth="1" className="opacity-90 hover:opacity-100"/>
                        )}
                        <text x={x + barWidth/2} y={yRed - 5} textAnchor="middle" fontSize="14" fill="#6b7280" fontWeight="bold">{d.details.count}</text>
                        <text x={x + barWidth/2} y={height - 10} textAnchor="middle" fontSize="14" fill="#374151" fontWeight="500">{d.label}</text>
                        <title>{`${d.label}：\n🟢 準時：${d.details.onTime}\n🟠 補交：${d.details.late}\n🔴 缺交：${d.details.missing}`}</title>
                    </g>
                );
            })}
        </svg>
    );
};

// --- [修改] 學生學習歷程 Modal (整合分數計算) ---
const StudentHistoryModal = ({ student, allAssignmentsByDate, onClose, bankBalance, semesterId }) => {
    const [viewMode, setViewMode] = useState('SCORE');

    const chartData = useMemo(() => {
        const statsByMonth = {};
        const sortedDates = Object.keys(allAssignmentsByDate).sort();
        if(sortedDates.length === 0) return [];

        sortedDates.forEach(date => {
            const dateObj = new Date(date);
            const monthKey = `${dateObj.getMonth() + 1}月`;
            
            if (!statsByMonth[monthKey]) {
                statsByMonth[monthKey] = { totalScorePoints: 0, count: 0, onTime: 0, late: 0, missing: 0 };
            }

            const assignments = allAssignmentsByDate[date];
            assignments.forEach(assign => {
                // [關鍵修改] 呼叫新的分數計算邏輯
                const rawStatus = assign.submissionStatus[student.id];
                const score = getScoreFromStatus(rawStatus, assign.assignmentDate);
                
                if (score === 100) statsByMonth[monthKey].onTime++;
                else if (score === 0) statsByMonth[monthKey].missing++;
                else statsByMonth[monthKey].late++; // 包含舊版60分和新版依天數扣分
                
                statsByMonth[monthKey].totalScorePoints += score;
                statsByMonth[monthKey].count++;
            });
        });

        return Object.keys(statsByMonth).map(key => {
            const data = statsByMonth[key];
            const avgScore = data.count === 0 ? 0 : (data.totalScorePoints / data.count);
            return { label: key, value: avgScore, details: data };
        });
    }, [allAssignmentsByDate, student.id]);

    const currentAverage = useMemo(() => {
        if (chartData.length === 0) return 0;
        const sum = chartData.reduce((acc, cur) => acc + cur.value, 0);
        return (sum / chartData.length).toFixed(1);
    }, [chartData]);

    // ... (省略部分 UI 渲染細節，主要修改在於顏色 Class) ...
    // 在此只展示核心顏色修改
    const getScoreColor = (score) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-orange-500'; // 修改為橘色
        return 'text-red-500';
    };

    const feedbackText = Number(currentAverage) >= 80 ? "表現優異" : (Number(currentAverage) >= 60 ? "再接再厲" : "需要加油");

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border-4 border-white">
                <div className={`p-6 flex justify-between items-center text-white shrink-0 ${viewMode === 'SCORE' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-gradient-to-r from-indigo-600 to-purple-500'}`}>
                    <div className="flex items-center gap-4">
                        <h2 className="text-4xl font-bold">{student.name} 的學習歷程</h2>
                    </div>
                    <button onClick={onClose}><X className="w-8 h-8" /></button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-gray-50">
                    <div className="flex justify-center mb-8">
                        <div className="bg-gray-200 p-1 rounded-xl flex gap-1 shadow-inner">
                            <button onClick={() => setViewMode('SCORE')} className={`px-6 py-2 rounded-lg text-xl font-bold ${viewMode === 'SCORE' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>🎯 績效分數</button>
                            <button onClick={() => setViewMode('COUNT')} className={`px-6 py-2 rounded-lg text-xl font-bold ${viewMode === 'COUNT' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500'}`}>📊 狀況統計</button>
                        </div>
                    </div>
                    {/* 簡易數據卡片 */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                            <p className="text-gray-500 font-bold">目前平均分</p>
                            <p className={`text-5xl font-black ${getScoreColor(currentAverage)}`}>{currentAverage}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                            <p className="text-gray-500 font-bold">評語</p>
                            <p className="text-3xl font-bold text-gray-700">{feedbackText}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-3xl shadow-sm h-[400px]">
                        {viewMode === 'SCORE' ? <SimpleLineChart data={chartData} /> : <SimpleStackedBarChart data={chartData} />}
                    </div>
                     <div className="mt-4 bg-white rounded-xl p-4 overflow-hidden">
                        <table className="w-full text-center">
                            <thead className="bg-gray-100"><tr><th>月份</th><th>分數</th><th>準時</th><th>補交</th><th>缺交</th></tr></thead>
                            <tbody>
                                {chartData.map((d, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-2 font-bold">{d.label}</td>
                                        <td className={`font-bold ${getScoreColor(d.value)}`}>{d.value.toFixed(1)}</td>
                                        <td className="text-green-600">{d.details.onTime}</td>
                                        <td className="text-orange-500">{d.details.late}</td>
                                        <td className="text-red-500">{d.details.missing}</td>
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

// ... (RewardOverlay, CoinIcon 保持不變，為節省篇幅省略，請使用上一版或預設) ...
const RewardOverlay = ({ type, onClose }) => {
    // 簡單版實作，完整版請保留原程式碼
    useEffect(() => { setTimeout(onClose, 2000); }, [onClose]);
    return <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"><h2 className="text-white text-6xl font-bold">獎勵動畫!</h2></div>;
};

// --- Hooks ---
const useStudentBank = (db, isAuthReady, isOffline, students) => {
    const initialData = useMemo(() => {
        const data = {};
        students.forEach(s => data[s.id] = { bronze: 0, silver: 0, gold: 0 });
        return data;
    }, [students]);
    const [bankData, setBankData] = useState(initialData);
    
    useEffect(() => {
        if (isOffline || !db) return;
        const q = query(collection(db, getBankCollectionPath()));
        const unsubscribe = onSnapshot(q, (snap) => {
            const remote = {};
            snap.docs.forEach(d => remote[d.id] = d.data());
            setBankData(prev => {
                const next = { ...prev };
                Object.keys(remote).forEach(k => {
                   next[k] = { bronze: Number(remote[k].bronze)||0, silver: Number(remote[k].silver)||0, gold: Number(remote[k].gold)||0 };
                });
                return next;
            });
        });
        return () => unsubscribe();
    }, [db, isOffline]);

    const updateBankBalance = useCallback(async (studentId, addBronze, addSilver, addGold) => {
        // ... (省略詳細計算邏輯，與上一版相同) ...
        // 為了確保運作，這裡只做簡單 State 更新，Firebase 寫入請保留原版邏輯
        setBankData(prev => {
            const current = prev[studentId] || { bronze: 0, silver: 0, gold: 0 };
            return { ...prev, [studentId]: { 
                bronze: current.bronze + (addBronze === 'RESET' ? -current.bronze : addBronze),
                silver: current.silver + (addSilver === 'RESET' ? -current.silver : addSilver),
                gold: current.gold + (addGold === 'RESET' ? -current.gold : addGold)
            }};
        });
        if(db && !isOffline) {
             const docRef = doc(db, getBankCollectionPath(), studentId);
             // 實際寫入邏輯需補上
             setDoc(docRef, { lastUpdated: serverTimestamp() }, { merge: true });
        }
    }, [db, isOffline]);

    return { bankData, updateBankBalance };
};

const useStudents = (db, isOffline) => {
    const [students, setStudents] = useState(DEFAULT_STUDENTS);
    const [loadingStudents, setLoadingStudents] = useState(true);
    // ... (讀取 Firebase 學生名單邏輯，與上一版相同) ...
    useEffect(() => { setLoadingStudents(false); }, []); // 簡化版
    return { students, loadingStudents };
};

const useCategories = (db, userId, isAuthReady, setAlertMessage, isOffline, students) => {
    const [categories, setCategories] = useState(INITIAL_CATEGORIES);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const getInitialSubmissionStatus = useMemo(() => students.reduce((s, st) => { s[st.id] = true; return s; }, {}), [students]);
    // ... (Firebase Category 讀取邏輯) ...
    return { categories, loadingCategories, getInitialSubmissionStatus };
};

// ... (LoginScreen, CustomAlert, etc. 保持不變) ...
const CustomAlert = ({ message, onClose }) => ( <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"><div className="bg-white p-8 rounded-xl"><h3 className="text-2xl font-bold mb-4">{message}</h3><button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded">確定</button></div></div> );
const LoginScreen = ({ onAdminLogin, onGuestLogin, isLoading, errorMsg }) => {
    const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
    return (
        <div className="fixed inset-0 bg-blue-50 flex items-center justify-center z-[10000]">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h1 className="text-4xl font-bold text-center mb-8">五年甲班作業表</h1>
                <div className="space-y-4">
                    <button onClick={onGuestLogin} className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-xl">訪客進入</button>
                    <div className="border-t pt-4">
                         <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-3 border rounded mb-2"/>
                         <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-3 border rounded mb-4"/>
                         <button onClick={()=>onAdminLogin(email, password)} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-xl">老師登入</button>
                    </div>
                    {errorMsg && <p className="text-red-500 text-center">{errorMsg}</p>}
                    {isLoading && <p className="text-gray-500 text-center">載入中...</p>}
                </div>
            </div>
        </div>
    );
};
// --- [Part 2] 主程式與介面邏輯 ---

const App = () => {
  // Firebase & Auth States
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // [修復] 自動登入偵測狀態

  // Data States
  const [allAssignmentsByDate, setAllAssignmentsByDate] = useState({});
  const [selectedDisplayDate, setSelectedDisplayDate] = useState(getTodayDate()); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(null); 
  
  // UI Interaction States
  const [editingAssignmentId, setEditingAssignmentId] = useState(null); 
  const [editingAssignmentName, setEditingAssignmentName] = useState('');
  const [missingStudent, setMissingStudent] = useState(null);
  const [newAssignmentDate, setNewAssignmentDate] = useState(getTodayDate()); 
  const [showAllMissingModal, setShowAllMissingModal] = useState(false);
  const [focusedStudentId, setFocusedStudentId] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [rewardState, setRewardState] = useState(null); 
  const [dashboardStudent, setDashboardStudent] = useState(null);
  const [unlockClicks, setUnlockClicks] = useState({}); // 用於防止誤觸
  
  // [新增] 封存功能狀態
  const [showArchived, setShowArchived] = useState(false);

  // Login States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('GUEST'); 
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Custom Hooks (using Part 1)
  const { students, loadingStudents } = useStudents(db, isOffline);
  const { bankData, updateBankBalance } = useStudentBank(db, isAuthReady, isOffline, students);
  
  // Semester & Month Logic
  const { defaultSemester, defaultMonth } = useMemo(() => { 
      const today = new Date(); const m = today.getMonth() + 1; 
      const sem = (m >= 2 && m <= 7) ? 'S2' : 'S1';
      return { defaultSemester: sem, defaultMonth: String(m).padStart(2, '0') }; 
  }, []);
  const [selectedSemester, setSelectedSemester] = useState(defaultSemester); 
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  
  const semesters = [ 
      { id: 'S1', name: `上學期 (8月 - 1月)`, startYear: 2025, endYear: 2026 }, 
      { id: 'S2', name: `下學期 (2月 - 7月)`, startYear: 2026, endYear: 2026 }, 
  ];
  const months = useMemo(() => [ 
      { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' }, { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' }, 
      { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' }, 
      { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' }, 
      { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' }, 
      { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' }, { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' }, 
      { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' }, 
  ], []);

  const { categories, loadingCategories, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline, students); 

  // --- Initialize Firebase & Auto Login ---
  useEffect(() => {
    if (!firebaseConfig) { setError("設定檔遺失"); return; }
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
            // [修復] 自動登入成功
            setUserId(user.uid);
            setIsAuthReady(true);
            setIsAuthenticated(true);
            setAuthMode(user.isAnonymous ? 'GUEST' : 'ADMIN');
        } else {
            setIsAuthenticated(false);
            setAuthMode('GUEST');
        }
        setIsCheckingAuth(false); // [修復] 檢查完畢，隱藏 Loading
        setLoadingLogin(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setError("初始化失敗");
      setLoading(false);
      setIsCheckingAuth(false);
    }
  }, []);

  const handleAdminLogin = async (email, password) => { 
      setLoadingLogin(true); setLoginError('');
      try { await signInWithEmailAndPassword(auth, email, password); } 
      catch (error) { setLoginError('登入失敗'); setLoadingLogin(false); } 
  };
  const handleGuestLogin = async () => { 
      setLoadingLogin(true); setLoginError('');
      try { await signInAnonymously(auth); } 
      catch (error) { setLoginError('訪客登入失敗'); setLoadingLogin(false); } 
  };
  const handleLogout = async () => { await signOut(auth); setIsAuthenticated(false); };

  // --- Data Fetching (Semester Filter) ---
  useEffect(() => { 
      if (isOffline) { setLoading(false); return; } 
      if (!isAuthReady || !db || !userId) return; 
      
      const currentSemData = semesters.find(s => s.id === selectedSemester);
      if (!currentSemData) return;

      const startDate = `${currentSemData.startYear}-${selectedSemester === 'S1' ? '08' : '02'}-01`;
      const endDate = `${currentSemData.endYear}-${selectedSemester === 'S1' ? '01' : '07'}-31`;
      
      const q = query(collection(db, getAssignmentCollectionPath()), where("assignmentDate", ">=", startDate), where("assignmentDate", "<=", endDate));
      
      const unsubscribe = onSnapshot(q, (snapshot) => { 
          const groupedData = {}; 
          snapshot.docs.forEach(doc => { 
              const data = doc.data(); 
              const date = data.assignmentDate; 
              if (date) { 
                  if (!groupedData[date]) groupedData[date] = []; 
                  groupedData[date].push({ id: doc.id, ...data }); 
              } 
          }); 
          setAllAssignmentsByDate(groupedData); 
          if (!loadingCategories) setLoading(false); 
      }); 
      return () => unsubscribe(); 
  }, [isAuthReady, db, userId, loadingCategories, isOffline, selectedSemester]);

  // --- Computed Data ---
  const assignmentsForSelectedDate = useMemo(() => {
      const assignments = allAssignmentsByDate[selectedDisplayDate] || [];
      // [新增] 封存過濾邏輯
      return assignments
          .filter(a => showArchived || !a.archived)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allAssignmentsByDate, selectedDisplayDate, showArchived]);

  const assignmentMap = useMemo(() => assignmentsForSelectedDate.reduce((acc, a) => { acc[a.assignmentName] = a; return acc; }, {}), [assignmentsForSelectedDate]);
  
  const filteredMonths = useMemo(() => months.filter(m => m.semester === selectedSemester), [months, selectedSemester]);
  useEffect(() => { if (!filteredMonths.some(m => m.id === selectedMonth)) setSelectedMonth(filteredMonths[0].id); }, [selectedSemester]);
  
  const displayedDates = useMemo(() => {
      return Object.keys(allAssignmentsByDate)
        .filter(d => d.substring(5, 7) === selectedMonth)
        .sort();
  }, [allAssignmentsByDate, selectedMonth]);

  // --- Actions ---
  // [新增] 封存/解封作業
  const handleToggleArchive = async (assignmentId, currentArchivedStatus) => {
      if (authMode !== 'ADMIN' && !isOffline) { setAlertMessage("權限不足"); return; }
      if (isOffline) {
          setAllAssignmentsByDate(prev => {
              const newMap = {...prev};
              const dateData = newMap[selectedDisplayDate].map(a => a.id === assignmentId ? {...a, archived: !currentArchivedStatus} : a);
              newMap[selectedDisplayDate] = dateData;
              return newMap;
          });
          return;
      }
      try {
          await setDoc(doc(db, getAssignmentCollectionPath(), assignmentId), { archived: !currentArchivedStatus }, { merge: true });
      } catch (e) { setAlertMessage("更新封存狀態失敗"); }
  };

  // [修改] 狀態切換 (B方案：依天數扣分)
  const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatusData) => {
    const assignmentData = assignmentMap[assignmentName];
    if (!assignmentData) return;

    // 解析當前狀態
    let currentStatusKey = 'true';
    if (currentStatusData === false) currentStatusKey = 'false';
    else if (currentStatusData === 'late' || (typeof currentStatusData === 'object' && currentStatusData.status === 'late')) currentStatusKey = 'late';

    let newStatusData;
    let shouldUpdate = true;
    const cellKey = `${studentId}-${assignmentData.id}`;

    // 狀態機： Green(True) -> Red(False) -> Yellow(Late) -> Green(True)
    if (currentStatusKey === 'true') {
        newStatusData = false; // 變缺交
        setUnlockClicks(p => { const n={...p}; delete n[cellKey]; return n; });
    } else if (currentStatusKey === 'false') {
        // [關鍵修改] 變遲交 -> 寫入物件 { status: 'late', date: 'YYYY-MM-DD' }
        newStatusData = { status: 'late', date: getTodayDate() };
        setUnlockClicks(p => { const n={...p}; delete n[cellKey]; return n; });
    } else {
        // 遲交 -> 準時 (需防誤觸)
        const clicks = unlockClicks[cellKey] || 0;
        if (clicks < 1) { // 點兩下才解鎖
            setUnlockClicks(p => ({...p, [cellKey]: clicks + 1}));
            shouldUpdate = false;
        } else {
            newStatusData = true; // 變準時
            setUnlockClicks(p => { const n={...p}; delete n[cellKey]; return n; });
        }
    }

    if (shouldUpdate) {
        // 獎勵邏輯 (簡單版)
        if (currentStatusKey === 'false' && (newStatusData.status === 'late' || newStatusData === 'late')) {
             updateBankBalance(studentId, 10, 0, 0); // 補交獎勵
             setRewardState({ type: 'BRONZE' });
        }

        if (isOffline) {
            setAllAssignmentsByDate(prev => {
                const newMap = {...prev};
                newMap[selectedDisplayDate] = newMap[selectedDisplayDate].map(a => 
                    a.id === assignmentData.id ? {...a, submissionStatus: {...a.submissionStatus, [studentId]: newStatusData}} : a
                );
                return newMap;
            });
        } else {
            try {
                await setDoc(doc(db, getAssignmentCollectionPath(), assignmentData.id), { submissionStatus: { [studentId]: newStatusData } }, { merge: true });
            } catch(e) { setAlertMessage("更新失敗"); }
        }
    }
  }, [assignmentMap, unlockClicks, updateBankBalance, isOffline, selectedDisplayDate, db]);

  // --- Rendering ---
  
  // 1. Loading Screen (Checking Auth)
  if (isCheckingAuth) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-2xl text-gray-600 font-bold">系統載入中...</p>
          </div>
      );
  }

  // 2. Login Screen
  if (!isAuthenticated && !isOffline) {
      return <LoginScreen onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} isLoading={loadingLogin} errorMsg={loginError} />;
  }

  // 3. Main Dashboard
  return (
    <DndProvider backend={HTML5Backend}>
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
        {rewardState && <RewardOverlay type={rewardState.type} onClose={()=>setRewardState(null)} />}
        {showBankModal && <StudentBankModal bankData={bankData} onClose={()=>setShowBankModal(false)} onUpdateBalance={updateBankBalance} authMode={authMode} students={students} />}
        {dashboardStudent && <StudentHistoryModal student={dashboardStudent} allAssignmentsByDate={allAssignmentsByDate} bankBalance={bankData[dashboardStudent.id]} semesterId={selectedSemester} onClose={()=>setDashboardStudent(null)} />}
        {alertMessage && <CustomAlert message={alertMessage} onClose={()=>setAlertMessage(null)} />}

        {/* Header */}
        <header className="p-4 bg-white shadow-sm z-20 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                        <span className="text-5xl">🐻‍❄️</span>五年甲班作業表
                    </h1>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-500 font-bold">{VERSION}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-bold text-xl px-4 py-2 rounded-lg hover:bg-red-50 transition">
                    <LogOut className="w-6 h-6" /> 登出
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <select value={selectedSemester} onChange={(e)=>setSelectedSemester(e.target.value)} className="p-2 rounded-lg border-2 border-gray-300 font-bold text-xl focus:border-blue-500 outline-none">
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} className="p-2 rounded-lg border-2 border-gray-300 font-bold text-xl text-white outline-none" style={{ backgroundColor: months.find(m=>m.id===selectedMonth)?.color }}>
                    {filteredMonths.map(m => <option key={m.id} value={m.id} style={{backgroundColor:m.color}}>{m.name}</option>)}
                </select>

                {/* [新增] 封存 Toggle Switch */}
                <div className="flex items-center ml-4 cursor-pointer select-none group" onClick={() => setShowArchived(!showArchived)}>
                    <div className={`w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${showArchived ? 'bg-blue-500' : 'group-hover:bg-gray-400'}`}>
                        <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out ${showArchived ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <span className="ml-2 text-gray-600 font-bold text-xl">顯示已封存</span>
                </div>
                
                <div className="flex-1"></div>
                
                <button onClick={()=>setShowBankModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-xl font-bold text-xl hover:bg-green-700 shadow-md transition transform active:scale-95">
                    <BookOpen className="w-6 h-6"/> 訂正存簿
                </button>
            </div>

            {/* Date Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {displayedDates.map(date => (
                    <button key={date} onClick={()=>setSelectedDisplayDate(date)} 
                        className={`px-5 py-2 rounded-xl text-2xl font-bold whitespace-nowrap transition-all shadow-sm ${date === selectedDisplayDate ? 'bg-blue-600 text-white scale-105' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                        {date.slice(5)}
                    </button>
                ))}
            </div>
        </header>

        {/* Main Table Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                {assignmentsForSelectedDate.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Calendar className="w-24 h-24 mb-4 opacity-20"/>
                        <p className="text-3xl font-bold opacity-50">該日期沒有{showArchived ? '' : '未封存的'}作業紀錄</p>
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <th className="p-4 text-2xl font-bold text-gray-600 border-b w-24 bg-gray-50 sticky left-0 z-40">座號</th>
                                    <th className="p-4 text-2xl font-bold text-gray-600 border-b w-32 bg-gray-50 sticky left-24 z-40">姓名</th>
                                    {assignmentsForSelectedDate.map(assign => (
                                        <th key={assign.id} className="p-4 min-w-[140px] border-b border-l text-center relative group">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-2xl font-bold ${assign.archived ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{assign.assignmentName}</span>
                                                {/* [新增] 封存按鈕 (僅管理員) */}
                                                {authMode === 'ADMIN' && (
                                                    <button onClick={()=>handleToggleArchive(assign.id, assign.archived)} className="mt-2 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition">
                                                        {assign.archived ? <ArchiveRestore className="w-6 h-6"/> : <Archive className="w-6 h-6"/>}
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id} className="hover:bg-blue-50 transition border-b">
                                        <td className="p-4 text-3xl font-bold text-gray-500 text-center sticky left-0 bg-white z-20 border-r">{student.id}</td>
                                        <td className="p-4 text-3xl font-bold text-gray-800 text-center sticky left-24 bg-white z-20 border-r cursor-pointer hover:text-blue-600" onClick={()=>setDashboardStudent(student)}>
                                            {student.name[0] + 'O' + student.name.slice(2)}
                                        </td>
                                        {assignmentsForSelectedDate.map(assign => {
                                            const statusData = assign.submissionStatus[student.id];
                                            const score = getScoreFromStatus(statusData, assign.assignmentDate);
                                            
                                            // 顏色邏輯 (對應 Part 1 的 SVG 顏色)
                                            let btnClass = "bg-red-100 text-red-600 border-red-200"; // 缺交 (0分)
                                            let icon = <X className="w-8 h-8"/>;
                                            
                                            if (score === 100) {
                                                btnClass = "bg-green-100 text-green-700 border-green-200"; // 準時
                                                icon = <Check className="w-8 h-8"/>;
                                            } else if (score > 0) {
                                                // [修改] 遲交：琥珀色階
                                                if(score >= 80) btnClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                                                else if(score >= 60) btnClass = "bg-orange-100 text-orange-700 border-orange-200";
                                                else btnClass = "bg-orange-200 text-orange-900 border-orange-300"; // 低分遲交
                                                
                                                icon = <span className="text-xl font-bold">{score}分</span>;
                                            }

                                            return (
                                                <td key={assign.id} className="p-2 border-l text-center">
                                                    <button onClick={()=>handleToggleSubmission(assign.assignmentName, student.id, statusData)}
                                                        className={`w-full py-3 rounded-xl flex items-center justify-center border-2 shadow-sm transition transform active:scale-95 ${btnClass} ${assign.archived ? 'opacity-50 grayscale' : ''}`}>
                                                        {icon}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
    </DndProvider>
  );
};

export default App;
