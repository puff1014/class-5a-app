import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
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
  updateDoc, 
  arrayRemove, 
  arrayUnion
} from 'firebase/firestore';
import { useDrag, useDrop, DndProvider } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BookOpen, Trash2, Calendar, Download, Upload, Plus, X, Copy, Check, RefreshCw, WifiOff, UserX, Lock, Settings, LogOut, FileText, AlertCircle, Eye, EyeOff, Lightbulb } from 'lucide-react';

// --- 版本資訊 ---
const VERSION = 'v11.18.19 - 大字體滿版修復 (Large Font Full Width)'; 

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

const initialAuthToken = null;

// 五年甲班學生名單
const STUDENT_LIST = [
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

// 公開路徑 (資料共用)
const getAssignmentCollectionPath = () => 
  `/artifacts/${appId}/public/data/assignments`;

const getCategoryCollectionPath = () => 
  `/artifacts/${appId}/public/data/categories`;

const getSettingsDocPath = () =>
  `/artifacts/${appId}/public/data/settings`; 

// 一般通知視窗
const CustomAlert = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100">
            <h3 className="text-3xl font-semibold text-gray-800 mb-4">通知</h3>
            <p className="text-3xl text-gray-600 mb-6">{message}</p>
            <button
                onClick={onClose}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out font-medium text-4xl"
            >
                確定
            </button>
        </div>
    </div>
);

// 登入畫面組件
const LoginScreen = ({ onLogin, loadingSettings, errorMsg }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(password);
    };

    return (
        <div className="fixed inset-0 bg-[#F0F8FF] flex items-center justify-center z-[10000]">
            <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center border border-blue-100">
                <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-2xl border-2 border-blue-400">
                        <Lock className="w-16 h-16 text-blue-500" />
                    </div>
                </div>
                <h1 className="text-5xl font-bold text-gray-800 mb-2 tracking-wide">五年甲班作業表</h1>
                <p className="text-gray-400 text-3xl mb-8 font-medium">請輸入密碼以存取資料</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="請輸入密碼"
                            className="w-full px-4 py-4 text-3xl text-center border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder-gray-300 text-gray-700"
                            autoFocus
                            disabled={loadingSettings}
                        />
                    </div>
                    {errorMsg && (
                        <p className="text-red-500 text-2xl font-bold animate-pulse">{errorMsg}</p>
                    )}
                    <button
                        type="submit"
                        disabled={loadingSettings}
                        className={`w-full py-4 rounded-xl text-white text-3xl font-bold tracking-wider shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                            ${loadingSettings ? 'bg-gray-400 cursor-wait' : 'bg-blue-500 hover:bg-blue-600'}
                        `}
                    >
                        {loadingSettings ? '讀取設定中...' : <><Lock className="w-6 h-6" /> 解鎖</>}
                    </button>
                </form>
                <div className="mt-8 text-gray-400 text-xl">
                    By 訂正作業系統 {VERSION}
                </div>
            </div>
        </div>
    );
};

// 密碼設定視窗
const PasswordSettingsModal = ({ currentSettings, onSave, onClose, isOffline }) => {
    const [userPwd, setUserPwd] = useState(currentSettings.userPassword);
    const [adminPwd, setAdminPwd] = useState(currentSettings.adminPassword);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!userPwd.trim() || !adminPwd.trim()) {
            alert("密碼不能為空！");
            return;
        }
        setSaving(true);
        await onSave(userPwd.trim(), adminPwd.trim());
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[11000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all scale-100 border-4 border-gray-100">
                <h3 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                    <Settings className="w-10 h-10 text-gray-600" />
                    系統密碼設定
                </h3>
                <p className="text-gray-500 text-2xl mb-6">修改後，所有使用者下次登入皆需使用新密碼。</p>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-2xl font-bold text-gray-700 mb-2">一般模式密碼 (User)</label>
                        <input 
                            type="text" 
                            value={userPwd}
                            onChange={(e) => setUserPwd(e.target.value)}
                            className="w-full p-4 border-2 border-gray-300 rounded-xl text-3xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-2xl font-bold text-gray-700 mb-2">管理員密碼 (Admin)</label>
                        <input 
                            type="text" 
                            value={adminPwd}
                            onChange={(e) => setAdminPwd(e.target.value)}
                            className="w-full p-4 border-2 border-gray-300 rounded-xl text-3xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl text-3xl font-bold hover:bg-gray-300 transition">取消</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-3xl font-bold hover:bg-blue-700 transition shadow-md"
                    >
                        {saving ? '儲存中...' : '確認修改'}
                    </button>
                </div>
                {isOffline && <p className="mt-4 text-center text-red-500 font-medium text-xl">目前為離線模式，修改不會儲存到雲端。</p>}
            </div>
        </div>
    );
};

// 全班未完成總表 (新增組件)
const AllMissingAssignmentsModal = ({ missingStats, onClose }) => {
    // Filter students who have missing assignments
    const studentsWithMissing = missingStats.filter(s => s.missingCount > 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-4xl font-bold text-gray-800 flex items-center">
                        <AlertCircle className="w-10 h-10 text-red-500 mr-3" />
                        全班未完成作業總表
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition p-2 rounded-full bg-gray-100 hover:bg-gray-200">
                        <X className="w-8 h-8" />
                    </button>
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
                                    <th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-24 text-center border-r border-gray-300">座號</th>
                                    <th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-32 text-center border-r border-gray-300">姓名</th>
                                    <th className="px-4 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider w-32 text-center border-r border-gray-300">缺交數</th>
                                    <th className="px-6 py-4 text-2xl font-bold text-gray-700 uppercase tracking-wider text-left">未完成項目明細 (依作業名稱排序)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {studentsWithMissing.map((student) => (
                                    <tr key={student.id} className="hover:bg-red-50 transition duration-100">
                                        <td className="px-4 py-4 text-2xl text-gray-900 font-medium text-center border-r border-gray-200">{student.id}</td>
                                        <td className="px-4 py-4 text-2xl text-gray-900 font-bold text-center border-r border-gray-200">{student.name}</td>
                                        <td className="px-4 py-4 text-center border-r border-gray-200">
                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-2xl">
                                                {student.missingCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xl text-gray-700">
                                            <ul className="list-disc list-inside space-y-1">
                                                {[...student.missingDetails]
                                                    .sort((a, b) => a.assignment.localeCompare(b.assignment, 'zh-TW'))
                                                    .map((detail, idx) => (
                                                    <li key={idx} className="flex items-start">
                                                        <span className="text-red-600 font-bold text-xl mr-2">{detail.assignment}</span>
                                                        <span className="font-mono font-medium text-gray-400 text-lg">[{new Date(detail.date).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'})}]</span>
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
                
                <div className="mt-4 pt-4 border-t border-gray-200 text-right">
                     <button onClick={onClose} className="bg-gray-800 text-white py-3 px-8 rounded-xl hover:bg-gray-900 transition text-2xl font-bold">
                        關閉視窗
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... ConfirmationModal component ...
const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmTitle, confirmColor }) => {
    const [isAltPressed, setIsAltPressed] = useState(false);
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Alt') setIsAltPressed(true); };
        const handleKeyUp = (e) => { if (e.key === 'Alt') setIsAltPressed(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100">
                <h3 className="text-4xl font-bold text-gray-800 mb-4">{title}</h3>
                <p className="text-3xl text-gray-600 mb-6">{message}</p>
                <div className="flex justify-between gap-4 mt-6">
                    <button onClick={onCancel} className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition duration-150 ease-in-out font-medium text-4xl">取消 (保留資料)</button>
                    <button
                        onClick={() => {
                            if (isAltPressed) { onConfirm(); } else { alert(`請按住 Alt 鍵，才能確認執行 ${confirmTitle} 操作！`); }
                        }}
                        disabled={!isAltPressed}
                        className={`flex-1 text-white py-3 rounded-lg transition duration-150 ease-in-out font-medium text-4xl ${confirmColor} ${isAltPressed ? 'hover:brightness-110' : 'bg-red-400 cursor-not-allowed'}`}
                    >
                        {confirmTitle} 
                    </button>
                </div>
                <p className="mt-3 text-center text-red-500 text-3xl font-semibold opacity-0">請按住 **Alt 鍵** 才能啟用刪除按鈕！</p>
            </div>
        </div>
    );
};

const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ... MISSING_COLOR_TIERS ...
const MISSING_COLOR_TIERS = [
    { min: 1, max: 3, colors: { bg: 'bg-blue-300', border: 'border-blue-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '1-3項' },
    { min: 4, max: 6, colors: { bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-white', countText: 'text-white' }, label: '4-6項' },
    { min: 7, max: 9, colors: { bg: 'bg-green-600', border: 'border-green-800', text: 'text-white', countText: 'text-white' }, label: '7-9項' },
    { min: 10, max: 12, colors: { bg: 'bg-lime-500', border: 'border-lime-700', text: 'text-gray-900', countText: 'text-gray-900' }, label: '10-12項' },
    { min: 13, max: 15, colors: { bg: 'bg-emerald-300', border: 'border-emerald-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '13-15項' },
    { min: 16, max: 18, colors: { bg: 'bg-yellow-300', border: 'border-yellow-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '16-18項' },
    { min: 19, max: 21, colors: { bg: 'bg-yellow-500', border: 'border-yellow-700', text: 'text-gray-900', countText: 'text-gray-900' }, label: '19-21項' },
    { min: 22, max: 24, colors: { bg: 'bg-red-600', border: 'border-red-700', text: 'text-white', countText: 'text-white' }, label: '22-24項' },
    { min: 25, max: 27, colors: { bg: 'bg-amber-800', border: 'border-amber-900', text: 'text-white', countText: 'text-white' }, label: '25-27項' },
    { min: 28, max: 30, colors: { bg: 'bg-orange-600', border: 'border-orange-800', text: 'text-white', countText: 'text-white' }, label: '28-30項' },
    { min: 31, max: 33, colors: { bg: 'bg-pink-300', border: 'border-pink-500', text: 'text-gray-900', countText: 'text-gray-900' }, label: '31-33項' },
    { min: 34, max: 36, colors: { bg: 'bg-rose-400', border: 'border-rose-600', text: 'text-gray-900', countText: 'text-gray-900' }, label: '34-36項' },
    { min: 37, max: 39, colors: { bg: 'bg-fuchsia-500', border: 'border-fuchsia-700', text: 'text-white', countText: 'text-white' }, label: '37-39項' },
    { min: 40, max: 42, colors: { bg: 'bg-purple-600', border: 'border-purple-800', text: 'text-white', countText: 'text-white' }, label: '40-42項' },
    { min: 43, max: 45, colors: { bg: 'bg-violet-600', border: 'border-violet-800', text: 'text-white', countText: 'text-white' }, label: '43-45項' },
    { min: 46, max: 48, colors: { bg: 'bg-gray-400', border: 'border-gray-600', text: 'text-gray-900', countText: 'text-gray-900' }, label: '46-48項' },
    { min: 49, max: 51, colors: { bg: 'bg-gray-500', border: 'border-gray-700', text: 'text-white', countText: 'text-white' }, label: '49-51項' },
    { min: 52, max: 54, colors: { bg: 'bg-gray-700', border: 'border-gray-900', text: 'text-white', countText: 'text-white' }, label: '52-54項' },
    { min: 55, max: 57, colors: { bg: 'bg-blue-900', border: 'border-blue-950', text: 'text-white', countText: 'text-white' }, label: '55-57項' },
    { min: 58, max: Infinity, colors: { bg: 'bg-black', border: 'border-red-500', text: 'text-white', countText: 'text-white' }, label: '58項+' },
];

const getMissingColorClasses = (count) => {
    if (count === 0) return { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-400', countText: 'text-gray-800' };
    const tier = MISSING_COLOR_TIERS.find(t => count <= t.max); 
    return tier ? tier.colors : MISSING_COLOR_TIERS[MISSING_COLOR_TIERS.length - 1].colors;
};

const MissingColorExplanation = () => {
    const legendTiers = MISSING_COLOR_TIERS.map(tier => ({ count: tier.label, classes: tier.colors }));
    return (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-xl border border-gray-200">
            <h3 className="text-4xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-pink-500 text-5xl mr-3">🎨</span>顏色分級說明
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"> 
                {legendTiers.map((item, index) => (
                    <div key={index} className={`
                        py-3 px-2 rounded-xl text-center cursor-default
                        ${item.classes.bg} ${item.classes.border} 
                        border-2 border-b-[6px]
                        flex items-center justify-center
                    `}>
                        <p className={`text-2xl font-black ${item.classes.text} leading-tight`}>{item.count}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ... MonthlyStudentStats ...
const MonthlyStudentStats = ({ monthlyStats, months }) => {
    const studentIds = useMemo(() => Object.keys(monthlyStats).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)), [monthlyStats]);
    if (studentIds.length === 0) return null;

    return (
        <div className="mt-12 p-6 bg-white rounded-xl shadow-xl border border-gray-200 max-w-full">
            <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center">
                <span className="text-5xl mr-3">📊</span><span className="text-4xl">每月繳交狀況統計</span>
            </h2> 
            <div className="w-full relative overflow-x-auto border border-gray-300 rounded-lg shadow-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-200 sticky top-0 z-30">
                        <tr>
                            <th className="px-4 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-700 w-36 sticky left-0 bg-gray-200 z-40 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">姓名</th>
                            {months.map(month => (
                                <th key={month.id} className={`px-4 py-4 text-3xl font-semibold uppercase tracking-wider text-white min-w-[200px] ${month.color}`}>{month.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {studentIds.map(studentId => {
                            const studentData = monthlyStats[studentId];
                            if (!studentData) return null;
                            return (
                                <tr key={studentId} className="hover:bg-gray-50 transition duration-100">
                                    <td className="px-4 py-4 text-3xl whitespace-nowrap text-gray-900 font-semibold w-36 sticky left-0 bg-white z-10 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{studentData.studentName}</td>
                                    {months.map(month => {
                                        const stats = studentData.monthStats[month.id];
                                        const hasMissing = stats.daysMissing > 0;
                                        const hasLate = stats.daysLate > 0;
                                        const hasTotal = stats.totalDays > 0;
                                        const hasCompletedOnly = !hasMissing && !hasLate && hasTotal;
                                        return (
                                            <td key={month.id} className={`px-4 py-4 whitespace-nowrap text-center text-3xl ${hasMissing ? 'bg-red-100' : (hasLate ? 'bg-yellow-100' : (hasCompletedOnly ? 'bg-green-100' : 'bg-white'))}`}>
                                                {hasTotal ? (
                                                    <div className="flex flex-col sm:flex-row justify-center items-center gap-1">
                                                        <span className="text-green-700 whitespace-nowrap text-xl">完:{stats.daysCompleted}</span>
                                                        <span className={`${hasLate ? 'font-bold text-yellow-600' : 'text-gray-700'} whitespace-nowrap text-xl`}>遲:{stats.daysLate}</span>
                                                        <span className={`${hasMissing ? 'font-bold text-red-600' : 'text-gray-700'} whitespace-nowrap text-xl`}>缺:{stats.daysMissing}</span>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
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

// ... MissingDetailsModal ...
const MissingDetailsModal = ({ student, missingStats, onClose, handleDeleteStudentGlobalData, db, userId, allAssignmentsByDate, setAlertMessage, isOffline, authMode }) => {
    const [selectedItemIds, setSelectedItemIds] = useState([]);
    const stat = missingStats.find(s => s.id === student.id);
    const hasMissingItems = stat && stat.missingCount > 0;
    const { missingCount, name } = stat || { missingCount: 0, missingDetails: [], name: student.name };
    const colorClasses = getMissingColorClasses(missingCount);

    const detailedMissingItems = useMemo(() => {
        const items = [];
        Object.keys(allAssignmentsByDate).forEach(date => {
            const assignmentsOnDate = allAssignmentsByDate[date] || [];
            assignmentsOnDate.forEach(assignment => {
                if (assignment.submissionStatus[student.id] === false) {
                    items.push({ date: date, assignmentName: assignment.assignmentName, assignmentId: assignment.id });
                }
            });
        });
        return items.sort((a, b) => a.date.localeCompare(b.date));
    }, [allAssignmentsByDate, student.id]);

    const numColumns = 4; 
    const columns = useMemo(() => {
        if (detailedMissingItems.length === 0) return [];
        const itemsPerColumn = Math.ceil(detailedMissingItems.length / numColumns);
        return Array.from({ length: numColumns }, (_, colIndex) => {
            const start = colIndex * itemsPerColumn;
            return detailedMissingItems.slice(start, start + itemsPerColumn);
        });
    }, [detailedMissingItems]);

    const handleToggleSelect = useCallback((assignmentId) => {
        setSelectedItemIds(prev => prev.includes(assignmentId) ? prev.filter(id => id !== assignmentId) : [...prev, assignmentId]);
    }, []);

    const handleToggleSelectAll = useCallback(() => {
        if (selectedItemIds.length === detailedMissingItems.length) { setSelectedItemIds([]); } else { setSelectedItemIds(detailedMissingItems.map(item => item.assignmentId)); }
    }, [selectedItemIds.length, detailedMissingItems]);
    
    // 修正：檢查 Alt 鍵而不是 Shift 鍵
    const handleGlobalDeleteClick = useCallback((e) => {
        if (e.altKey) { handleDeleteStudentGlobalData(student.id, name); } else { alert(`請按住 Alt 鍵，才能確認永久刪除 ${name} 的所有紀錄！`); }
    }, [student.id, name, handleDeleteStudentGlobalData]);

    const handleBatchDeleteSelectedItems = useCallback(async (e) => {
        if (selectedItemIds.length === 0) { alert("請先勾選至少一項要標記為『已補交』的作業紀錄。"); return; }
        if (!e.ctrlKey && !e.metaKey) { alert("請按住 Control (Ctrl/Cmd) 鍵，才能確認執行批次標記為已補交！"); return; }
        setAlertMessage(null);
        if (isOffline) {
            setAlertMessage(`[離線模式] 成功將 ${selectedItemIds.length} 項作業標記為「已補交」（記憶體暫存）。`);
            setSelectedItemIds([]); onClose();
            return;
        }
        try {
            const path = getAssignmentCollectionPath(userId);
            const batch = writeBatch(db);
            selectedItemIds.forEach(assignmentId => {
                const docRef = doc(db, path, assignmentId);
                batch.set(docRef, { submissionStatus: { [student.id]: 'late' } }, { merge: true });
            });
            await batch.commit();
            setAlertMessage(`成功將 ${selectedItemIds.length} 項作業標記為「已補交」。`);
            setSelectedItemIds([]); onClose();
        } catch (error) { console.error("Batch delete failed:", error); setAlertMessage("批次標記已訂正失敗。"); } 
    }, [selectedItemIds, db, userId, student.id, onClose, setAlertMessage, isOffline]);

    if (!hasMissingItems) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full transform transition-all duration-300 scale-100 max-h-[95vh] flex flex-col">
                <div className="relative border-b pb-2 mb-3">
                    <h3 className="text-4xl font-bold text-gray-800 text-center">{name} 的未訂正作業</h3>
                    <button onClick={onClose} className="absolute -top-2 -right-2 text-gray-500 hover:text-gray-800 text-4xl p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className={`p-4 rounded-xl mb-4 shadow-md border-l-8 ${colorClasses.bg} ${colorClasses.border} text-center`}>
                    <div className={`text-4xl font-semibold ${colorClasses.text}`}>累積總計：<span className={`ml-2 font-black ${colorClasses.countText} text-5xl`}>{missingCount}</span> 次</div>
                </div>
                <div className="flex justify-between items-center mb-2 border-b pb-2">
                    <h4 className="text-3xl font-bold text-gray-800">詳細未訂正項目 ({detailedMissingItems.length} 筆紀錄):</h4>
                    <button onClick={handleToggleSelectAll} className="text-2xl font-medium text-blue-600 hover:text-blue-800 transition">{selectedItemIds.length === detailedMissingItems.length ? '取消全選' : '全選'}</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4">
                        {columns.map((columnItems, colIndex) => (
                            <ul key={colIndex} className={`divide-y divide-gray-200 rounded-lg ${colIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}>
                                {columnItems.map((item) => {
                                    const isSelected = selectedItemIds.includes(item.assignmentId);
                                    return (
                                        <li key={item.assignmentId} className={`p-3 flex items-center gap-3 text-3xl text-gray-700 cursor-pointer transition duration-100 ${isSelected ? 'bg-blue-200' : 'hover:bg-blue-50'}`} onClick={() => handleToggleSelect(item.assignmentId)}>
                                            <input className="h-7 w-7 text-blue-600 rounded cursor-pointer" onClick={(e) => e.stopPropagation()} />
                                            <span className="font-medium text-gray-900 w-32">{item.date}</span>
                                            <span className="flex-1">{item.assignmentName}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ))}
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-green-300">
                    <button onClick={handleBatchDeleteSelectedItems} disabled={selectedItemIds.length === 0} className={`w-full py-3 rounded-lg transition duration-150 ease-in-out font-medium text-3xl flex items-center justify-center shadow-lg ${selectedItemIds.length === 0 ? 'bg-gray-400 cursor-not-allowed text-gray-200' : 'bg-green-600 hover:bg-green-700 text-white'}`} title="按住 Control (Ctrl/Cmd) 鍵並點擊以將選定的項目標記為已補交 (遲繳)">
                        <span className="text-5xl mr-2">⚠️</span> 批次標記 {selectedItemIds.length} 項為「已補交 (遲繳)」
                    </button>
                </div>
                <button onClick={onClose} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out font-medium text-3xl">關閉</button>
            </div>
        </div>
    );
};

// ... useCategories ...
const useCategories = (db, userId, isAuthReady, setAlertMessage, isOffline) => {
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const getInitialSubmissionStatus = useMemo(() => STUDENT_LIST.reduce((status, student) => { status[student.id] = true; return status; }, {}), []);

    const initializeCategories = useCallback(async (db, userId) => {
        if (!db || !userId) return;
        setLoadingCategories(true);
        const path = getCategoryCollectionPath();
        const categoriesCollection = collection(db, path);
        try {
            const snapshot = await getDocs(categoriesCollection);
            if (snapshot.empty) {
                const batchPromises = INITIAL_CATEGORIES.map(cat => { const newDocRef = doc(categoriesCollection); return setDoc(newDocRef, { ...cat, createdAt: Timestamp.now() }); });
                await Promise.all(batchPromises);
            }
        } catch (e) { console.error("Error initializing categories:", e); }
        setLoadingCategories(false);
    }, []); 

    useEffect(() => {
        if (isOffline) {
             setCategories(INITIAL_CATEGORIES.map((cat, i) => ({ ...cat, id: `offline-cat-${i}` })));
             setLoadingCategories(false);
             return;
        }

        if (isAuthReady && db && userId) {
            initializeCategories(db, userId); 
            const path = getCategoryCollectionPath();
            const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
                const loadedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                loadedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
                setCategories(loadedCategories);
                setLoadingCategories(false); 
            }, (e) => { console.error("Error fetching categories:", e); setAlertMessage("讀取作業項目清單時發生錯誤。"); setLoadingCategories(false); });
            return () => unsubscribe();
        }
    }, [isAuthReady, db, userId, setAlertMessage, initializeCategories, isOffline]);

    const addCategory = useCallback(async (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return false;
        if (categories.some(c => c.name === trimmedName)) { setAlertMessage(`科目模板「${trimmedName}」已經存在。`); return false; }

        if (isOffline) {
             const newOrder = categories.length > 0 ? categories[categories.length - 1].order + 1 : 0;
             setCategories(prev => [...prev, { id: `offline-cat-${Date.now()}`, name: trimmedName, order: newOrder }]);
             return true;
        }

        if (!db || !userId) return false;
        const newDocRef = doc(collection(db, getCategoryCollectionPath()));
        const newOrder = categories.length > 0 ? categories[categories.length - 1].order + 1 : 0;
        try { await setDoc(newDocRef, { name: trimmedName, order: newOrder, createdAt: Timestamp.now() }); return true; } catch (e) { console.error("Error adding category:", e); setAlertMessage("新增科目模板失敗。"); return false; }
    }, [db, userId, categories, setAlertMessage, isOffline]);

    const deleteCategory = useCallback(async (categoryId, categoryName) => {
        if (!window.confirm(`確定要刪除科目模板「${categoryName}」嗎？此操作只會將該科目從「自動新增」清單中移除。`)) return;
        if (isOffline) {
            setCategories(prev => prev.filter(c => c.id !== categoryId));
            setAlertMessage(`科目模板「${categoryName}」已刪除 (離線)。`);
            return;
        }
        if (!db || !userId) return;
        try { await deleteDoc(doc(db, getCategoryCollectionPath(), categoryId)); setAlertMessage(`科目模板「${categoryName}」已刪除。`); } catch (e) { console.error("Error deleting category:", e); setAlertMessage("刪除科目模板失敗。"); }
    }, [db, userId, setAlertMessage, isOffline]);

    const editCategory = useCallback(async (categoryId, currentName, newName) => {
        const trimmedName = newName.trim(); if (!trimmedName || trimmedName === currentName) return; 
        if (categories.some(c => c.name === trimmedName && c.id !== categoryId)) { setAlertMessage(`科目模板「${trimmedName}」已經存在。`); return; }
        
        if (isOffline) {
             setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name: trimmedName } : c));
             return;
        }

        if (!db || !userId) return;
        try { await setDoc(doc(db, getCategoryCollectionPath(), categoryId), { name: trimmedName }, { merge: true }); setAlertMessage(`科目模板名稱已從「${currentName}」更新為「${trimmedName}」。`); } catch (e) { console.error("Error editing category:", e); setAlertMessage("編輯科目模板失敗。"); }
    }, [db, userId, categories, setAlertMessage, isOffline]);

    const moveCategory = useCallback(async (dragId, hoverId) => {
        const dragIndex = categories.findIndex(c => c.id === dragId);
        const hoverIndex = categories.findIndex(c => c.id === hoverId);
        if (dragIndex === -1 || hoverIndex === -1) return;
        const dragCategory = categories[dragIndex];
        const hoverCategory = categories[hoverIndex];

        if (isOffline) {
             const newCategories = [...categories];
             newCategories[dragIndex] = { ...dragCategory, order: hoverCategory.order };
             newCategories[hoverIndex] = { ...hoverCategory, order: dragCategory.order };
             newCategories.sort((a, b) => a.order - b.order);
             setCategories(newCategories);
             return;
        }

        if (!db || !userId) return;
        const batch = writeBatch(db);
        const path = getCategoryCollectionPath();
        batch.set(doc(db, path, dragCategory.id), { order: hoverCategory.order }, { merge: true });
        batch.set(doc(db, path, hoverCategory.id), { order: dragCategory.order }, { merge: true });
        try { await batch.commit(); } catch (e) { console.error("Error moving category:", e); setAlertMessage("調整項目順序失敗。"); }
    }, [db, userId, categories, setAlertMessage, isOffline]);

    return { categories, loadingCategories, addCategory, deleteCategory, editCategory, moveCategory, getInitialSubmissionStatus };
};

// ... AssignmentHeader ...
const AssignmentHeader = ({ assignment, isGlobalLoading, handleDeleteAssignment, handleEditSave, handleMoveAssignment, setEditingAssignmentId, setEditingAssignmentName, editingAssignmentId, editingAssignmentName }) => {
    const isEditing = editingAssignmentId === assignment.id;
    const [{ isDragging }, drag] = useDrag({ type: ItemTypes.ASSIGNMENT, item: { id: assignment.id, type: ItemTypes.ASSIGNMENT }, collect: (monitor) => ({ isDragging: monitor.isDragging() }) });
    const [, drop] = useDrop({ 
        accept: ItemTypes.ASSIGNMENT,
        hover: (draggedItem) => { if (draggedItem.id !== assignment.id) { handleMoveAssignment(draggedItem.id, assignment.id); draggedItem.id = assignment.id; } }
    });

    const handleEditStart = useCallback(() => { if (isGlobalLoading) return; setEditingAssignmentId(assignment.id); setEditingAssignmentName(assignment.assignmentName); }, [assignment.id, assignment.assignmentName, setEditingAssignmentId, setEditingAssignmentName, isGlobalLoading]);
    const handleLocalEditSave = useCallback(() => { if (!isEditing || !editingAssignmentName.trim() || isGlobalLoading) return; handleEditSave(assignment.id, editingAssignmentName).finally(() => { setEditingAssignmentId(null); setEditingAssignmentName(''); }); }, [assignment.id, editingAssignmentName, handleEditSave, isEditing, setEditingAssignmentId, setEditingAssignmentName, isGlobalLoading]);
    const handleDeleteClick = useCallback((e) => { handleDeleteAssignment(assignment.id, assignment.assignmentName, e.ctrlKey || e.metaKey); }, [assignment.id, assignment.assignmentName, handleDeleteAssignment]);

    return (
        <th ref={(node) => drag(drop(node))} style={{ opacity: isDragging ? 0.4 : 1, cursor: isGlobalLoading ? 'default' : 'grab' }} className={`px-4 py-4 text-3xl text-center font-semibold uppercase tracking-wider text-gray-800 transition duration-100 ease-in-out sticky top-0 z-50 bg-gray-100`}>
            <div className="flex flex-col items-center justify-center min-w-[120px] group relative">
                <div className={`relative p-2 rounded-xl shadow-md transition duration-100 border-2 border-transparent ${isEditing ? 'ring-4 ring-blue-400 bg-white' : 'hover:bg-gray-50 bg-white'}`} onDoubleClick={handleEditStart}>
                    {isEditing ? (
                        <input type="text" value={editingAssignmentName} onChange={(e) => setEditingAssignmentName(e.target.value)} onBlur={handleLocalEditSave} onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } else if (e.key === 'Escape') { setEditingAssignmentId(null); setEditingAssignmentName(''); } }} className="font-bold text-center text-3xl w-full focus:outline-none bg-transparent" autoFocus disabled={isGlobalLoading} />
                    ) : <span className={`font-bold whitespace-nowrap ${isGlobalLoading ? 'cursor-default' : 'cursor-pointer'}`}>{assignment.assignmentName}</span>}
                    {!isEditing && (
                        <button onClick={handleDeleteClick} disabled={isGlobalLoading} className="absolute -top-3 -right-3 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition duration-150 p-1 rounded-full bg-white shadow-lg" title="點擊以刪除此項目 (Ctrl/Cmd 可強制刪除)">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>
        </th>
    );
};

const DateTab = ({ date, isSelected, onClick }) => {
    const formattedDate = new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    return (
        <button onClick={() => onClick(date)} className={`px-5 py-3 text-4xl font-semibold rounded-lg transition duration-150 ease-in-out shadow-md whitespace-nowrap ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
            {formattedDate}
        </button>
    );
};

const ProtectedButton = ({ onClick, disabled, className, title, children }) => {
    return ( <button onClick={onClick} disabled={disabled} className={`${className} transition duration-150`} title={title}>{children}</button> );
};


// Main Application Component
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false); // New state for offline mode
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
  const [authTimeout, setAuthTimeout] = useState(false); // Track if auth is taking too long
  
  // Auth State for Login Screen
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState(null); // 'USER' or 'ADMIN'
  const [systemSettings, setSystemSettings] = useState({ userPassword: '123++', adminPassword: 'tn0728' });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  // --- 新增狀態：全班未完成作業清單 ---
  const [showAllMissingModal, setShowAllMissingModal] = useState(false);
  // --- 新增狀態：學生專注模式 (Focused Student ID) ---
  const [focusedStudentId, setFocusedStudentId] = useState(null);

  // 智慧日期偵測
  const { defaultSemester, defaultMonth } = useMemo(() => {
    const today = new Date();
    const m = today.getMonth() + 1; // 1-12
    const monthStr = String(m).padStart(2, '0');
    let sem = 'S1';
    if (m >= 2 && m <= 7) { sem = 'S2'; }
    return { defaultSemester: sem, defaultMonth: monthStr };
  }, []);

  const [selectedSemester, setSelectedSemester] = useState(defaultSemester); 
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth); 
  const [unlockClicks, setUnlockClicks] = useState({}); 

  const academicYear = "114";
  const startYear = 2025;
  const endYear = 2026;
  const semesters = [
      { id: 'S1', name: `上學期 (${startYear}/8 - ${endYear}/1)`, startMonth: '08', endMonth: '01', startYear: startYear, endYear: endYear },
      { id: 'S2', name: `下學期 (${endYear}/2 - ${endYear}/7)`, startMonth: '02', endMonth: '07', startYear: endYear, endYear: endYear },
  ];
  const months = useMemo(() => [
      { id: '08', name: `8月`, color: 'bg-green-500', semester: 'S1' }, { id: '09', name: `9月`, color: 'bg-teal-500', semester: 'S1' },
      { id: '10', name: `10月`, color: 'bg-cyan-500', semester: 'S1' }, { id: '11', name: `11月`, color: 'bg-blue-500', semester: 'S1' },
      { id: '12', name: `12月`, color: 'bg-indigo-500', semester: 'S1' }, { id: '01', name: `1月`, color: 'bg-purple-500', semester: 'S1' },
      { id: '02', name: `2月`, color: 'bg-pink-500', semester: 'S2' }, { id: '03', name: `3月`, color: 'bg-rose-500', semester: 'S2' },
      { id: '04', name: `4月`, color: 'bg-red-500', semester: 'S2' }, { id: '05', name: `5月`, color: 'bg-orange-500', semester: 'S2' },
      { id: '06', name: `6月`, color: 'bg-amber-500', semester: 'S2' }, { id: '07', name: `7月`, color: 'bg-yellow-500', semester: 'S2' },
  ], []);

  const { categories, loadingCategories, addCategory, deleteCategory, editCategory, moveCategory, getInitialSubmissionStatus } = useCategories(db, userId, isAuthReady, setAlertMessage, isOffline); 

  useEffect(() => {
    // Timeout check for auth - if too long, show offline option
    const timer = setTimeout(() => {
         if (loading) setAuthTimeout(true);
    }, 3000);

    if (!firebaseConfig) { console.error("Firebase configuration is missing."); setError("無法載入 Firebase 設定。請檢查環境配置。"); setLoading(false); return; }
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
            setUserId(user.uid);
            setIsAuthReady(true);
        } else {
            try {
                if (initialAuthToken) { 
                    await signInWithCustomToken(firebaseAuth, initialAuthToken); 
                } else { 
                    await signInAnonymously(firebaseAuth); 
                } 
            } catch (e) {
                console.error("Auto-login failed:", e);
                setAuthTimeout(true); 
            }
        }
      });
      return () => {
          unsubscribe();
          clearTimeout(timer);
      };
    } catch (e) { console.error("Firebase initialization failed:", e); setError("初始化失敗：" + e.message); setLoading(false); }
  }, []);

  const handleGoOffline = () => {
      setIsOffline(true);
      setUserId('guest_user');
      setIsAuthReady(true);
      setLoading(false);
      setLoadingSettings(false); // In offline mode, settings are static default
  };

  // Fetch System Settings (Passwords)
  useEffect(() => {
    if (!isAuthReady || !db || isOffline) {
        if (isOffline) setLoadingSettings(false);
        return;
    }
    const path = getSettingsDocPath();
    const docRef = doc(db, path, 'global_config');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            setSystemSettings(docSnap.data());
        } else {
            // If config doesn't exist, create it with defaults
            setDoc(docRef, { userPassword: '123++', adminPassword: 'tn0728' });
        }
        setLoadingSettings(false);
    }, (error) => {
        console.error("Error fetching settings:", error);
        // Fallback to defaults on error
        setLoadingSettings(false);
    });
    return () => unsubscribe();
  }, [isAuthReady, db, isOffline]);

  // Handle Login Logic
  const handleLogin = (inputPassword) => {
      const trimmedInput = inputPassword.trim();
      if (trimmedInput === systemSettings.adminPassword) {
          setIsAuthenticated(true);
          setAuthMode('ADMIN');
          setLoginError('');
      } else if (trimmedInput === systemSettings.userPassword) {
          setIsAuthenticated(true);
          setAuthMode('USER');
          setLoginError('');
      } else {
          setLoginError('密碼錯誤，請再試一次。');
          setTimeout(() => setLoginError(''), 2000);
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setAuthMode(null);
  };
  
  const handleUpdatePasswords = async (newUserPwd, newAdminPwd) => {
      if (isOffline) {
          setSystemSettings({ userPassword: newUserPwd, adminPassword: newAdminPwd });
          alert("密碼已更新 (離線暫存)");
          return;
      }
      try {
          const path = getSettingsDocPath();
          const docRef = doc(db, path, 'global_config');
          await setDoc(docRef, { userPassword: newUserPwd, adminPassword: newAdminPwd }, { merge: true });
          alert("系統密碼已成功更新！");
      } catch (e) {
          console.error("Failed to update passwords:", e);
          alert("密碼更新失敗，請檢查連線。");
      }
  };

  useEffect(() => {
    if (isOffline) {
        setLoading(false);
        return;
    }
    if (!isAuthReady || !db || !userId) return;
    const path = getAssignmentCollectionPath();
    const assignmentsCollection = collection(db, path);
    const q = query(assignmentsCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupedData = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.assignmentDate;
        if (date) {
            if (!groupedData[date]) { groupedData[date] = []; }
            groupedData[date].push({ id: doc.id, assignmentName: data.assignmentName, order: data.order ?? 999, submissionStatus: data.submissionStatus || {}, createdAt: data.createdAt?.toDate().toISOString() });
        }
      });
      setAllAssignmentsByDate(groupedData);
      if (!loadingCategories) { setLoading(false); }
    }, (e) => { 
        console.error("Error fetching assignments:", e);
        if (e.code === 'permission-denied') {
            setAlertMessage("⚠️ 無法讀取雲端資料 (權限不足)。\n系統將顯示空白介面。");
        } else {
            setAlertMessage("讀取資料時發生錯誤，請稍後再試。");
            setAuthTimeout(true);
        }
        setLoading(false); 
    });
    return () => unsubscribe();
  }, [isAuthReady, db, userId, loadingCategories, isOffline]); 

  const assignmentsForSelectedDate = useMemo(() => {
      const assignments = allAssignmentsByDate[selectedDisplayDate] || [];
      return assignments.sort((a, b) => a.order - b.order);
  }, [allAssignmentsByDate, selectedDisplayDate]);
  
  const assignmentMap = useMemo(() => {
      return assignmentsForSelectedDate.reduce((acc, assignment) => { acc[assignment.assignmentName] = { id: assignment.id, submissionStatus: assignment.submissionStatus }; return acc; }, {});
  }, [assignmentsForSelectedDate]);

  const filteredMonths = useMemo(() => {
      const currentSemesterData = semesters.find(s => s.id === selectedSemester);
      if (!currentSemesterData) return months;
      return months.filter(m => m.semester === selectedSemester);
  }, [months, selectedSemester, semesters]);

  useEffect(() => {
      if (filteredMonths.length > 0) {
          const currentMonthExists = filteredMonths.some(m => m.id === selectedMonth);
          if (!currentMonthExists) { setSelectedMonth(filteredMonths[0].id); }
      }
  }, [selectedSemester, filteredMonths, selectedMonth]);

  const availableDates = useMemo(() => {
    const dates = Object.keys(allAssignmentsByDate).sort();
    if (dates.length > 0) {
        if (!dates.includes(selectedDisplayDate)) { setSelectedDisplayDate(dates[dates.length - 1]); }
    } else if (dates.length === 0 && selectedDisplayDate !== getTodayDate()) { setSelectedDisplayDate(getTodayDate()); }
    return dates; 
  }, [allAssignmentsByDate, selectedDisplayDate]);

  const displayedDates = useMemo(() => {
    const dates = Object.keys(allAssignmentsByDate).sort();
    const filteredByMonth = dates.filter(date => { const dateMonth = date.substring(5, 7); return dateMonth === selectedMonth; }).sort();
    return filteredByMonth;
  }, [allAssignmentsByDate, selectedMonth]);

  useEffect(() => {
      if (displayedDates.length > 0 && !displayedDates.includes(selectedDisplayDate)) { setSelectedDisplayDate(displayedDates[0]); } else if (displayedDates.length === 0) { setSelectedDisplayDate(getTodayDate()); }
  }, [displayedDates, selectedDisplayDate]);

  const studentMissingStats = useMemo(() => {
    const stats = STUDENT_LIST.map(student => ({ id: student.id, name: student.name, missingCount: 0, missingDetails: [] }));
    Object.keys(allAssignmentsByDate).forEach(date => {
        const assignmentsOnDate = allAssignmentsByDate[date] || [];
        assignmentsOnDate.forEach(assignment => {
            const submissionStatus = assignment.submissionStatus || {};
            STUDENT_LIST.forEach((student, index) => {
                if (submissionStatus[student.id] === false) { 
                    stats[index].missingCount += 1;
                    stats[index].missingDetails.push({ date: date, assignment: assignment.assignmentName });
                }
            });
        });
    });
    stats.sort((a, b) => b.missingCount - a.missingCount);
    return stats;
  }, [allAssignmentsByDate]);

  const monthlyStudentStats = useMemo(() => {
    const stats = {}; 
    STUDENT_LIST.forEach(student => { stats[student.id] = { studentName: student.name, monthStats: {} }; months.forEach(month => { stats[student.id].monthStats[month.id] = { daysCompleted: 0, daysLate: 0, daysMissing: 0, totalDays: 0 }; }); });
    Object.keys(allAssignmentsByDate).forEach(date => {
        const monthId = date.substring(5, 7); 
        const assignmentsOnDate = allAssignmentsByDate[date] || [];
        if (assignmentsOnDate.length === 0) return; 
        STUDENT_LIST.forEach(student => {
            if (stats[student.id].monthStats[monthId]) {
                let worstStatusOfDay = 'true'; 
                for (const assignment of assignmentsOnDate) {
                    const status = assignment.submissionStatus[student.id];
                    if (status === false) { worstStatusOfDay = 'false'; break; }
                    if (status === 'late') { worstStatusOfDay = 'late'; }
                }
                stats[student.id].monthStats[monthId].totalDays++; 
                if (worstStatusOfDay === 'false') { stats[student.id].monthStats[monthId].daysMissing++; } else if (worstStatusOfDay === 'late') { stats[student.id].monthStats[monthId].daysLate++; } else { stats[student.id].monthStats[monthId].daysCompleted++; }
            }
        });
    });
    return stats;
  }, [allAssignmentsByDate, months]);

  const handleEditAssignmentName = useCallback(async (assignmentId, newAssignmentName) => {
    if (isOffline) {
        setAllAssignmentsByDate(prev => {
             const newMap = { ...prev };
             Object.keys(newMap).forEach(date => {
                 newMap[date] = newMap[date].map(a => a.id === assignmentId ? { ...a, assignmentName: newAssignmentName } : a);
             });
             return newMap;
        });
        return;
    }
    if (!db || !userId) return;
    setLoading(true);
    try {
        const docRef = doc(db, getAssignmentCollectionPath(), assignmentId);
        await setDoc(docRef, { assignmentName: newAssignmentName }, { merge: true });
    } catch (e) { console.error("Error editing assignment name: ", e); setAlertMessage("編輯作業名稱失敗。"); } finally { setLoading(false); }
  }, [db, userId, setAlertMessage, isOffline]);

  const handleDeleteAssignment = useCallback(async (assignmentId, assignmentName, isForced = false) => {
    const assignmentList = allAssignmentsByDate[selectedDisplayDate] || [];
    const targetAssignment = assignmentList.find(a => a.id === assignmentId);
    if (targetAssignment) {
        const submissionStatus = targetAssignment.submissionStatus || {};
        const hasIncompleteWork = STUDENT_LIST.some(student => submissionStatus[student.id] === false);
        if (hasIncompleteWork && !isForced) { alert(`無法刪除作業「${assignmentName}」：\n\n尚有學生未完成此項作業的訂正！\n\n如需【強制刪除】，請在點擊刪除按鈕時按住 Control (Ctrl/Cmd) 鍵。`); return; }
    }
    if (!isForced && !window.confirm(`確定要刪除 ${assignmentName} 嗎？此操作不可逆轉。`)) { return; }
    
    if (isOffline) {
         setAllAssignmentsByDate(prev => {
             const newMap = { ...prev };
             if (newMap[selectedDisplayDate]) {
                 newMap[selectedDisplayDate] = newMap[selectedDisplayDate].filter(a => a.id !== assignmentId);
             }
             return newMap;
         });
         return;
    }

    if (!db || !userId) return;
    setLoading(true);
    try {
        const docRef = doc(db, getAssignmentCollectionPath(), assignmentId);
        await deleteDoc(docRef);
    } catch (e) { console.error("Error deleting assignment: ", e); setAlertMessage("刪除作業項目失敗。"); } finally { setLoading(false); }
  }, [db, userId, selectedDisplayDate, setAlertMessage, allAssignmentsByDate, isOffline]);

  const handleBatchAddDefaultAssignments = useCallback(async (targetDate, defaultCategories) => {
      if (isOffline) {
           const existingNamesOnDate = (allAssignmentsByDate[targetDate] || []).map(a => a.assignmentName);
           const newAssignments = [];
           defaultCategories.forEach(cat => {
               if (!existingNamesOnDate.includes(cat.name)) {
                   newAssignments.push({
                       id: `offline-assign-${Date.now()}-${Math.random()}`,
                       assignmentName: cat.name,
                       assignmentDate: targetDate,
                       order: cat.order,
                       submissionStatus: getInitialSubmissionStatus,
                       createdAt: new Date().toISOString()
                   });
               }
           });
           setAllAssignmentsByDate(prev => ({
               ...prev,
               [targetDate]: [...(prev[targetDate] || []), ...newAssignments]
           }));
           return;
      }

      if (!db || !userId || !targetDate || defaultCategories.length === 0) return;
      setLoading(true);
      try {
          const path = getAssignmentCollectionPath();
          const assignmentCollection = collection(db, path);
          const batch = writeBatch(db);
          const existingNamesOnDate = (allAssignmentsByDate[targetDate] || []).map(a => a.assignmentName);
          let assignmentsAdded = 0;
          defaultCategories.forEach(cat => {
              if (!existingNamesOnDate.includes(cat.name)) {
                  const newDocRef = doc(assignmentCollection);
                  batch.set(newDocRef, { assignmentName: cat.name, assignmentDate: targetDate, order: cat.order, submissionStatus: getInitialSubmissionStatus, createdAt: Timestamp.now(), });
                  assignmentsAdded++;
              }
          });
          if (assignmentsAdded > 0) { await batch.commit(); }
      } catch (e) {
          console.error("Error batch adding assignments: ", e);
            if (e.message && e.message.includes("Premature end of stream")) { setAlertMessage("自動新增作業失敗：網路連線中斷，請重新整理頁面。"); } else { setAlertMessage("自動新增作業失敗，請稍後再試。"); }
      } finally { setLoading(false); }
  }, [db, userId, allAssignmentsByDate, getInitialSubmissionStatus, isOffline]);
  
  const handleNewAssignmentDateChange = useCallback((e) => { const newDate = e.target.value; setNewAssignmentDate(newDate); }, []);

  const handleAddNewDate = useCallback(async () => {
      const targetDate = newAssignmentDate;
      if (!targetDate || categories.length === 0) { setAlertMessage("請選擇一個日期並確保科目模板清單不為空。"); return; }
      if (allAssignmentsByDate[targetDate]) {
          setAlertMessage(`日期 ${targetDate} 已經有作業紀錄了。請直接選擇查看。`); setSelectedDisplayDate(targetDate);
          const date = new Date(targetDate); date.setDate(date.getDate() + 1); setNewAssignmentDate(date.toISOString().substring(0, 10)); return;
      }
      await handleBatchAddDefaultAssignments(targetDate, categories);
      setSelectedDisplayDate(targetDate);
      const date = new Date(targetDate); date.setDate(date.getDate() + 1); setNewAssignmentDate(date.toISOString().substring(0, 10));
  }, [newAssignmentDate, categories, allAssignmentsByDate, handleBatchAddDefaultAssignments]);

    const handleAddNewAssignment = useCallback(async () => {
        if (!selectedDisplayDate) { setAlertMessage("請先選擇一個日期。"); return; }
        
        if (isOffline) {
            const assignments = allAssignmentsByDate[selectedDisplayDate] || [];
            const newOrder = assignments.length > 0 ? assignments[assignments.length - 1].order + 1 : 0;
            const newName = `新增作業 ${assignments.length + 1}`;
            const newAssignment = {
                id: `offline-single-${Date.now()}`,
                assignmentName: newName,
                assignmentDate: selectedDisplayDate,
                order: newOrder,
                submissionStatus: getInitialSubmissionStatus,
                createdAt: new Date().toISOString()
            };
            setAllAssignmentsByDate(prev => ({
                ...prev,
                [selectedDisplayDate]: [...(prev[selectedDisplayDate] || []), newAssignment]
            }));
            return;
        }

        if (!db || !userId) return;
        setLoading(true);
        try {
            const path = getAssignmentCollectionPath();
            const assignmentCollection = collection(db, path);
            const assignments = allAssignmentsByDate[selectedDisplayDate] || [];
            const newOrder = assignments.length > 0 ? assignments[assignments.length - 1].order + 1 : 0;
            const newName = `新增作業 ${assignments.length + 1}`;
            const newDocRef = doc(assignmentCollection);
            await setDoc(newDocRef, { assignmentName: newName, assignmentDate: selectedDisplayDate, order: newOrder, submissionStatus: getInitialSubmissionStatus, createdAt: Timestamp.now(), });
        } catch (e) { console.error("Error adding new assignment:", e); setAlertMessage("新增單項作業失敗。"); } finally { setLoading(false); }
    }, [db, userId, selectedDisplayDate, allAssignmentsByDate, getInitialSubmissionStatus, isOffline]);
  
  const handleMoveAssignment = useCallback(async (dragId, hoverId) => {
    const assignments = assignmentsForSelectedDate;
    const dragIndex = assignments.findIndex(a => a.id === dragId);
    const hoverIndex = assignments.findIndex(a => a.id === hoverId);
    if (dragIndex === -1 || hoverIndex === -1) return;
    
    if (isOffline) {
         setAllAssignmentsByDate(prev => {
             const newMap = { ...prev };
             const currentList = [...(newMap[selectedDisplayDate] || [])];
             const dragItem = currentList[dragIndex];
             const hoverItem = currentList[hoverIndex];
             
             // Swap orders logic roughly
             currentList[dragIndex] = { ...dragItem, order: hoverItem.order };
             currentList[hoverIndex] = { ...hoverItem, order: dragItem.order };
             
             newMap[selectedDisplayDate] = currentList.sort((a,b) => a.order - b.order);
             return newMap;
         });
         return;
    }

    if (!db || !userId) return;
    const dragAssignment = assignments[dragIndex];
    const hoverAssignment = assignments[hoverIndex];
    const batch = writeBatch(db);
    const path = getAssignmentCollectionPath();
    const docRef1 = doc(db, path, dragAssignment.id);
    const docRef2 = doc(db, path, hoverAssignment.id);
    batch.set(docRef1, { order: hoverAssignment.order }, { merge: true });
    batch.set(docRef2, { order: dragAssignment.order }, { merge: true });
    try { await batch.commit(); } catch (e) { console.error("Error moving assignment:", e); setAlertMessage("調整欄位順序失敗。"); }
  }, [db, userId, assignmentsForSelectedDate, setAlertMessage, isOffline, selectedDisplayDate]);


  // V11.7.0 FIX: 導入 3 次點擊切換 (Green -> Red -> Yellow -> (3 clicks) -> Green)
  const handleToggleSubmission = useCallback(async (assignmentName, studentId, currentStatus) => {
    const assignmentData = assignmentMap[assignmentName];
    if (!assignmentData) { setAlertMessage(`找不到作業「${assignmentName}」的紀錄。`); return; }

    const cellKey = `${studentId}-${assignmentData.id}`;

    let newStatus;
    let shouldUpdateDb = true;

    if (currentStatus === true || currentStatus === undefined) {
        newStatus = false; // 準時 (Green) -> 未訂正 (Red X)
        setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; });
    } else if (currentStatus === false) {
        newStatus = 'late'; // 未訂正 (Red X) -> 遲繳 (Yellow Check)
        setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; });
    } else { // 'late' (Yellow)
        const currentCount = unlockClicks[cellKey] || 0;
        if (currentCount < 2) {
             setUnlockClicks(prev => ({ ...prev, [cellKey]: currentCount + 1 }));
             shouldUpdateDb = false; 
             return;
        } else {
             newStatus = true; // 遲繳 (Yellow) -> 準時 (Green)
             setUnlockClicks(prev => { const next = {...prev}; delete next[cellKey]; return next; });
        }
    }

    if (shouldUpdateDb) {
        if (isOffline) {
             setAllAssignmentsByDate(prev => {
                 const newMap = { ...prev };
                 Object.keys(newMap).forEach(date => {
                     newMap[date] = newMap[date].map(a => {
                         if (a.id === assignmentData.id) {
                             return {
                                 ...a,
                                 submissionStatus: { ...a.submissionStatus, [studentId]: newStatus }
                             };
                         }
                         return a;
                     });
                 });
                 return newMap;
             });
             return;
        }

        if (!db || !userId) return;
        setLoading(true);
        try {
          const docRef = doc(db, getAssignmentCollectionPath(), assignmentData.id);
          await setDoc(docRef, { 
              submissionStatus: { 
                  [studentId]: newStatus 
              }
          }, { merge: true }); 
        } catch (e) {
          console.error("Error updating submission status: ", e);
          setAlertMessage("更新訂正狀態失敗，請檢查網路連線。");
        } finally {
          setLoading(false);
        }
    }
  }, [db, userId, assignmentMap, unlockClicks, setAlertMessage, isOffline]); 

  const handleBatchDelete = useCallback(async (assignmentIds, successMessage, failureMessage) => {
    if (isOffline) {
        setAllAssignmentsByDate(prev => {
            const newMap = { ...prev };
            Object.keys(newMap).forEach(date => {
                newMap[date] = newMap[date].filter(a => !assignmentIds.includes(a.id));
            });
            return newMap;
        });
        setAlertMessage(successMessage + " (離線)");
        return true;
    }
    if (!db || !userId || assignmentIds.length === 0) return false;
    setLoading(true);
    try {
        const batch = writeBatch(db);
        const path = getAssignmentCollectionPath();
        assignmentIds.forEach(id => { if (id) { const docRef = doc(db, path, id); batch.delete(docRef); } });
        await batch.commit();
        setAlertMessage(successMessage);
        return true;
    } catch (e) { console.error("Error during batch delete: ", e); setAlertMessage(failureMessage); return false; } finally { setLoading(false); }
  }, [db, userId, setAlertMessage, isOffline]);

  const handleDeleteStudentGlobalData = useCallback(async (studentId, studentName) => {
      if (isOffline) {
          setAllAssignmentsByDate(prev => {
              const newMap = { ...prev };
              Object.keys(newMap).forEach(date => {
                  newMap[date] = newMap[date].map(a => {
                      const newStatus = { ...a.submissionStatus };
                      delete newStatus[studentId];
                      return { ...a, submissionStatus: newStatus };
                  });
              });
              return newMap;
          });
          setAlertMessage(`[離線] 成功刪除 ${studentName} 的所有訂正紀錄。`);
          return;
      }
      if (!db || !userId) return;
      if (!window.confirm(`【極度危險】確定要永久刪除學生 ${studentName} (${studentId}) 在所有日期上的所有訂正紀錄嗎？此操作不可逆轉！`)) { return; }
      setLoading(true);
      try {
          const path = getAssignmentCollectionPath();
          const assignmentCollection = collection(db, path);
          const snapshot = await getDocs(assignmentCollection);
          const batch = writeBatch(db);
          let updateCount = 0;
          snapshot.docs.forEach(doc => {
              const docRef = doc.ref;
              const data = doc.data();
              const submissionStatus = data.submissionStatus || {};
              if (submissionStatus.hasOwnProperty(studentId)) {
                  const newSubmissionStatus = { ...submissionStatus };
                  delete newSubmissionStatus[studentId]; 
                  batch.set(docRef, { submissionStatus: newSubmissionStatus }, { merge: true });
                  updateCount++;
              }
          });
          await batch.commit();
          setAlertMessage(`成功刪除 ${studentName} 的所有訂正紀錄 (${updateCount} 筆作業文件受到影響)。`);
      } catch (e) { console.error("Error deleting student data:", e); setAlertMessage("刪除學生數據失敗，請檢查權限或連線。"); } finally { setLoading(false); }
  }, [db, userId, setAlertMessage, isOffline]);

  const showConfirmation = useCallback((type, data) => {
      let title, message, confirmTitle, confirmColor;
      switch(type) {
          case 'DAILY': title = `🧨 確定刪除 ${selectedDisplayDate} 的所有紀錄嗎？`; message = `此操作將永久移除 ${selectedDisplayDate} 的所有 ${assignmentsForSelectedDate.length} 筆作業紀錄。刪除後不可恢復。`; confirmTitle = '日期'; confirmColor = 'bg-gray-900'; break;
          case 'MONTHLY': title = `💣 確認刪除 ${data.monthName} 的所有作業紀錄？`; message = `此操作將永久移除 ${data.monthName} 期間所有 ${data.count} 筆作業紀錄。請務必謹慎！`; confirmTitle = '月份'; confirmColor = 'bg-amber-800'; break;
          case 'SEMESTER': title = `☢️ 極度危險：確認刪除 ${data.semName} 的所有資料？`; message = `此操作將永久移除 ${data.semName} 期間所有 ${data.count} 筆紀錄。這是最高級別的刪除，數據將無法找回！`; confirmTitle = '學期'; confirmColor = 'bg-rose-500'; break;
          default: return;
      }
      setConfirmationModal({ title, message, confirmTitle, confirmColor, action: type, data });
  }, [selectedDisplayDate, assignmentsForSelectedDate]);

  const handleDeleteDateAssignments = useCallback(() => {
    if (assignmentsForSelectedDate.length === 0) { alert(`日期 ${selectedDisplayDate} 沒有任何作業紀錄可以刪除。`); return; }
    showConfirmation('DAILY', {});
  }, [assignmentsForSelectedDate, selectedDisplayDate, showConfirmation]);

  const handleDeleteMonthAssignments = useCallback(() => {
    const monthName = months.find(m => m.id === selectedMonth)?.name || '該月';
    const assignmentIdsToDelete = [];
    Object.keys(allAssignmentsByDate).forEach(date => {
        const dateMonth = date.substring(5, 7);
        if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); }
    });
    if (assignmentIdsToDelete.length === 0) { alert(`${monthName} 期間沒有找到作業紀錄可以刪除。`); return; }
    showConfirmation('MONTHLY', { monthName, count: assignmentIdsToDelete.length });
  }, [allAssignmentsByDate, selectedMonth, months, showConfirmation]);

  const handleDeleteSemesterAssignments = useCallback(() => {
    const semesterData = semesters.find(s => s.id === selectedSemester);
    const semName = semesterData ? semesterData.name : '全部';
    const assignmentIdsToDelete = [];
    const allDates = Object.keys(allAssignmentsByDate);
    allDates.forEach(date => {
        const dateMonth = parseInt(date.substring(5, 7), 10);
        const dateYear = parseInt(date.substring(0, 4), 10);
        let shouldDelete = false;
        if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { shouldDelete = true; } } 
        else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { shouldDelete = true; } }
        if (shouldDelete) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) assignmentIdsToDelete.push(assignment.id); }); }
    });
    if (assignmentIdsToDelete.length === 0) { alert(`${semName} 期間沒有找到作業紀錄可以刪除。`); return; }
    showConfirmation('SEMESTER', { semName, count: assignmentIdsToDelete.length }); 
  }, [allAssignmentsByDate, selectedSemester, semesters, showConfirmation]);

  const executeDelete = useCallback(async () => {
      if (!confirmationModal) return;
      const { action, data } = confirmationModal;
      setConfirmationModal(null); 
      let success = false;
      switch(action) {
          case 'DAILY':
              const assignmentIds = assignmentsForSelectedDate.map(a => a.id).filter(id => id); 
              const name_daily = selectedDisplayDate;
              const count_daily = assignmentIds.length;
              success = await handleBatchDelete(assignmentIds, `成功刪除 ${name_daily} 的所有作業紀錄 (${count_daily} 筆)。`, "刪除該日作業失敗，請稍後再試。");
              if (success) {
                  const currentDates = availableDates.filter(d => d !== selectedDisplayDate);
                  if (currentDates.length > 0) { setSelectedDisplayDate(currentDates[currentDates.length - 1]); } else { setSelectedDisplayDate(getTodayDate()); }
              }
              break;
          case 'MONTHLY':
              const monthName = months.find(m => m.id === selectedMonth)?.name || '該月';
              const monthAssignmentIds = [];
              Object.keys(allAssignmentsByDate).forEach(date => {
                  const dateMonth = date.substring(5, 7);
                  if (dateMonth === selectedMonth) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) monthAssignmentIds.push(assignment.id); }); }
              });
              const monthCount = monthAssignmentIds.length;
              success = await handleBatchDelete(monthAssignmentIds, `成功刪除 ${monthName} 期間的 ${monthCount} 筆作業紀錄。`, "刪除月份作業失敗，請稍後再試。");
              if (success) setSelectedDisplayDate(getTodayDate()); 
              break;
          case 'SEMESTER':
              const semesterData = semesters.find(s => s.id === selectedSemester);
              const semName = semesterData ? semesterData.name : '全部';
              const semAssignmentIds = [];
              Object.keys(allAssignmentsByDate).forEach(date => {
                  const dateMonth = parseInt(date.substring(5, 7), 10);
                  const dateYear = parseInt(date.substring(0, 4), 10);
                  if (semesterData.id === 'S1') { if ((dateYear === semesterData.startYear && dateMonth >= 8 && dateMonth <= 12) || (dateYear === semesterData.endYear && dateMonth === 1)) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } } 
                  else if (semesterData.id === 'S2') { if (dateYear === semesterData.endYear && dateMonth >= 2 && dateMonth <= 7) { (allAssignmentsByDate[date] || []).forEach(assignment => { if (assignment.id) semAssignmentIds.push(assignment.id); }); } }
              });
              const semCount = semAssignmentIds.length;
              success = await handleBatchDelete(semAssignmentIds, `成功刪除 ${semName} 期間的 ${semCount} 筆作業紀錄。`, "刪除學期作業失敗，請稍後再試。");
              if (success) setSelectedDisplayDate(getTodayDate()); 
              break;
          default: break;
      }
  }, [confirmationModal, handleBatchDelete, assignmentsForSelectedDate, selectedDisplayDate, availableDates, allAssignmentsByDate, months, selectedMonth, semesters]);

    const handleExportData = useCallback(async () => {
        if (!isOffline && (!db || !userId)) { setAlertMessage("請等待應用程式載入並登入後再匯出。"); return; }
        setLoading(true);
        try {
            let exportedData = [];
            
            if (isOffline) {
                 Object.values(allAssignmentsByDate).forEach(assignments => {
                     exportedData = [...exportedData, ...assignments];
                 });
            } else {
                const path = getAssignmentCollectionPath();
                const assignmentsCollection = collection(db, path);
                const snapshot = await getDocs(assignmentsCollection);
                snapshot.forEach(doc => { const data = doc.data(); const createdAt = data.createdAt?.toDate().toISOString() || null; exportedData.push({ id: doc.id, ...data, createdAt: createdAt }); });
            }

            const dataStr = JSON.stringify(exportedData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `assignment_data_${getTodayDate()}${isOffline ? '_offline' : ''}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setAlertMessage(`成功匯出 ${exportedData.length} 筆作業紀錄。`);
        } catch (e) { console.error("Export failed:", e); setAlertMessage("匯出資料失敗。"); } finally { setLoading(false); }
    }, [db, userId, setAlertMessage, isOffline, allAssignmentsByDate]);

    // NEW: 優化後的匯入邏輯
    const handleImportData = useCallback(async (e) => {
        if (!isOffline && (!db || !userId)) { setAlertMessage("請等待應用程式載入並登入後再匯入。"); return; }
        const file = e.target.files[0]; if (!file) return;
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (!Array.isArray(json)) { setAlertMessage("檔案格式錯誤：JSON 內容必須是作業紀錄陣列。"); return; }
                
                if (isOffline) {
                    // Offline import logic
                    let importedCount = 0;
                    const newMap = { ...allAssignmentsByDate };
                    
                    json.forEach(item => {
                        const date = item.assignmentDate || getTodayDate();
                        const name = (item.assignmentName || "未命名作業").trim();
                        if (!newMap[date]) newMap[date] = [];
                        
                        // Check duplicate
                        if (!newMap[date].some(a => a.assignmentName === name)) {
                            newMap[date].push({
                                ...item,
                                id: `offline-import-${Date.now()}-${Math.random()}`,
                                assignmentName: name,
                                assignmentDate: date
                            });
                            importedCount++;
                        }
                    });
                    setAllAssignmentsByDate(newMap);
                    setAlertMessage(`[離線] 成功匯入 ${importedCount} 筆紀錄。`);
                    setLoading(false);
                    e.target.value = null;
                    return;
                }

                const path = getAssignmentCollectionPath();
                const assignmentCollection = collection(db, path);
                
                let importCount = 0;
                let duplicateCount = 0;
                const itemsToAdd = [];

                // 建立現有資料的快速查找 Set (Key: 日期_名稱)
                const existingKeys = new Set();
                Object.entries(allAssignmentsByDate).forEach(([dateKey, assignments]) => {
                    assignments.forEach(a => {
                        existingKeys.add(`${dateKey}_${a.assignmentName.trim()}`);
                    });
                });

                // 第一步：過濾出需要新增的資料
                json.forEach(item => {
                    const date = item.assignmentDate || getTodayDate();
                    const name = (item.assignmentName || "未命名作業").trim();
                    const uniqueKey = `${date}_${name}`;

                    // 檢查是否重複
                    if (existingKeys.has(uniqueKey)) {
                        duplicateCount++;
                        return; 
                    }

                    const dataToImport = { 
                        assignmentName: name, 
                        assignmentDate: date, 
                        order: item.order || 999, 
                        submissionStatus: item.submissionStatus || getInitialSubmissionStatus, 
                        createdAt: serverTimestamp(), 
                    };
                    
                    itemsToAdd.push(dataToImport);
                    existingKeys.add(uniqueKey); // 標記為已存在，防止同批次內重複
                });

                // 第二步：分批寫入
                if (itemsToAdd.length > 0) {
                    const CHUNK_SIZE = 450;
                    const chunks = [];
                    for (let i = 0; i < itemsToAdd.length; i += CHUNK_SIZE) {
                        chunks.push(itemsToAdd.slice(i, i + CHUNK_SIZE));
                    }

                    for (const chunk of chunks) {
                        const batch = writeBatch(db);
                        chunk.forEach(data => {
                            const newDocRef = doc(assignmentCollection);
                            batch.set(newDocRef, data);
                        });
                        await batch.commit();
                        importCount += chunk.length;
                    }

                    let msg = `成功匯入 ${importCount} 筆作業紀錄。`;
                    if (duplicateCount > 0) msg += ` (已自動忽略 ${duplicateCount} 筆重複資料)`;
                    setAlertMessage(msg); 
                } else {
                    if (duplicateCount > 0) {
                         setAlertMessage(`沒有匯入任何新資料 (發現 ${duplicateCount} 筆重複紀錄)。`);
                    } else {
                        setAlertMessage("匯入檔案中沒有找到有效的作業紀錄。"); 
                    }
                }

            } catch (error) { 
                console.error("Import failed:", error); 
                setAlertMessage("匯入失敗：檔案解析錯誤或數據格式不正確。"); 
            } finally { 
                setLoading(false); 
                e.target.value = null; 
            }
        };
        reader.readAsText(file);
    }, [db, userId, setAlertMessage, getInitialSubmissionStatus, allAssignmentsByDate, isOffline]); 

  const isGlobalLoading = loading || loadingCategories;
  
  if (isGlobalLoading && !isAuthReady && !isOffline) {
    return ( 
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-3xl text-gray-600 mb-6">正在連線至雲端資料庫...</p>
        
        {authTimeout && (
            <div className="text-center animate-fade-in">
                <p className="text-2xl text-amber-600 mb-4">連線似乎有點慢，或是無法連接到伺服器。</p>
                <button 
                    onClick={handleGoOffline}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-4 rounded-xl text-3xl font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-3 mx-auto"
                >
                    <WifiOff className="w-8 h-8" />
                    強制進入 (離線/演示模式)
                </button>
            </div>
        )}
      </div> 
    );
  }

  // --- Login Screen Guard ---
  if (!isAuthenticated && !loading && !loadingCategories) {
      return <LoginScreen onLogin={handleLogin} loadingSettings={loadingSettings} errorMsg={loginError} />;
  }

  if (error) {
    return ( 
        <div className="p-8 text-center bg-red-100 border-l-8 border-red-500 text-red-700">
            <h2 className="text-3xl font-bold mb-2">發生錯誤 (Error Occurred)</h2>
            <p className="text-xl whitespace-pre-line">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg text-xl hover:bg-red-700 transition flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6 mr-2" /> 重新整理
            </button>
        </div> 
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden w-full">
      {confirmationModal && ( <ConfirmationModal title={confirmationModal.title} message={confirmationModal.message} onConfirm={executeDelete} onCancel={() => setConfirmationModal(null)} confirmTitle={confirmationModal.confirmTitle} confirmColor={confirmationModal.confirmColor} /> )}
      {missingStudent && missingStudent.missingCount > 0 && ( <MissingDetailsModal student={STUDENT_LIST.find(s => s.id === missingStudent.id)} missingStats={studentMissingStats} onClose={() => setMissingStudent(null)} handleDeleteStudentGlobalData={handleDeleteStudentGlobalData} db={db} userId={userId} allAssignmentsByDate={allAssignmentsByDate} setAlertMessage={setAlertMessage} isOffline={isOffline} authMode={authMode} /> )}
      {showSettingsModal && ( <PasswordSettingsModal currentSettings={systemSettings} onSave={handleUpdatePasswords} onClose={() => setShowSettingsModal(false)} isOffline={isOffline} /> )}
      {/* --- 新增全班未完成總表 Modal --- */}
      {showAllMissingModal && ( <AllMissingAssignmentsModal missingStats={studentMissingStats} onClose={() => setShowAllMissingModal(false)} /> )}

      <div className="bg-white shadow-xl w-full flex flex-col h-full overflow-hidden">
        <header className="p-4 sm:p-6 text-center border-b border-gray-200 bg-white relative overflow-hidden shrink-0">
          {isOffline && (
              <div className="absolute top-0 left-0 w-full bg-gray-800 text-white text-center py-2 text-xl font-bold tracking-wider z-10">
                  ⚠️ 目前為離線演示模式 (Guest Mode)
              </div>
          )}
          {authMode === 'ADMIN' && (
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-bold transition z-20"
                title="修改系統密碼"
              >
                  <Settings className="w-5 h-5" /> 設定
              </button>
          )}
           <button 
                onClick={handleLogout}
                className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold transition z-20"
                title="登出系統"
            >
                <LogOut className="w-5 h-5" /> 登出 {authMode === 'ADMIN' ? '(Admin)' : '(User)'}
            </button>

          <div className={`flex items-center justify-center text-5xl font-extrabold text-gray-900 mb-2 ${isOffline ? 'mt-8' : ''}`}><span className="text-orange-500 text-6xl mr-3">🐻‍❄️</span><span className="text-5xl">五年甲班訂正作業表</span><span className="text-green-600 text-6xl ml-3">🐼</span></div>
          <p className="text-3xl text-gray-600 mb-4"> {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long' })}</p>
          <p className="text-2xl text-gray-500"> 版本: {VERSION}</p>
        </header>
        {alertMessage && ( <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} /> )}
        
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 p-4">
            <div className="flex flex-wrap items-center gap-6 mb-6 text-3xl shrink-0">
                <label className="font-semibold text-gray-700">學期：</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="p-3 border border-gray-300 rounded-lg font-semibold" disabled={isGlobalLoading}>{semesters.map((s) => ( <option key={s.id} value={s.id}>{s.name}</option>))}</select>
                <label className="font-semibold text-gray-700">月份：</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-3 border border-gray-300 rounded-lg font-semibold" disabled={isGlobalLoading} style={{ backgroundColor: months.find(m => m.id === selectedMonth)?.color || 'white' }}>{filteredMonths.map((m) => ( <option key={m.id} value={m.id} style={{ backgroundColor: m.color }}>{m.name}</option>))}</select>
            </div>
            <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 shrink-0">
                {displayedDates.map(date => ( <DateTab key={date} date={date} isSelected={date === selectedDisplayDate} onClick={setSelectedDisplayDate} /> ))}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-6 shrink-0">
                 <input id="newAssignmentDate" type="date" value={newAssignmentDate} onChange={handleNewAssignmentDateChange} className="p-2 text-3xl border border-gray-300 rounded-lg font-semibold w-[230px] focus:ring-yellow-500 focus:border-yellow-500 transition flex-shrink-0" required disabled={isGlobalLoading} />
                 
                 <button 
                    onClick={handleAddNewDate} 
                    className={`${authMode === 'ADMIN' ? 'px-4 py-2 flex-1' : 'px-5 py-3'} text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center ${isGlobalLoading ? 'bg-yellow-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`} 
                    disabled={isGlobalLoading || !newAssignmentDate}
                 >
                    + 新增日期
                 </button>
                 
                <button 
                    onClick={handleExportData} 
                    className={`${authMode === 'ADMIN' ? 'px-4 py-2 flex-1' : 'px-5 py-3'} text-3xl font-medium rounded-lg text-white bg-fuchsia-400 hover:bg-fuchsia-500 transition duration-150 shadow-md flex items-center justify-center`} 
                    disabled={isGlobalLoading} 
                    title="將所有紀錄匯出為 JSON 檔案"
                >
                    <Download className="h-6 w-6 mr-1" />匯出
                </button>

                {/* --- 新增按鈕：開啟全班未完成總表 --- */}
                 <button 
                    onClick={() => setShowAllMissingModal(true)} 
                    className={`${authMode === 'ADMIN' ? 'px-4 py-2 flex-1' : 'px-5 py-3'} text-3xl font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition duration-150 shadow-md flex items-center justify-center`} 
                    disabled={isGlobalLoading} 
                    title="檢視全班未完成作業總表"
                >
                    <FileText className="h-6 w-6 mr-1" />未完成總表
                </button>
                
                <div className={`${authMode === 'ADMIN' ? 'flex-1 relative' : 'relative'}`}>
                    <input type="file" id="importFile" accept="application/json" onChange={handleImportData} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isGlobalLoading} title="選擇 JSON 檔案匯入紀錄" />
                    <button 
                        onClick={() => document.getElementById('importFile').click()} 
                        className={`${authMode === 'ADMIN' ? 'px-4 py-2 w-full' : 'px-5 py-3 w-full'} text-3xl font-medium rounded-lg text-white bg-cyan-500 hover:bg-cyan-600 transition duration-150 shadow-md flex items-center justify-center`} 
                        disabled={isGlobalLoading}
                    >
                        <Upload className="h-6 w-6 mr-1" />匯入
                    </button>
                </div>

                {authMode === 'ADMIN' && (
                    <>
                        <ProtectedButton onClick={() => handleDeleteDateAssignments()} disabled={isGlobalLoading || assignmentsForSelectedDate.length === 0} className={`px-4 py-2 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center flex-1 bg-gray-900 hover:bg-gray-800`} title="刪除該日所有作業 (需按住 Shift)"><span className="text-4xl mr-1">🧨</span>刪除日期</ProtectedButton>
                        <ProtectedButton onClick={() => handleDeleteMonthAssignments()} disabled={isGlobalLoading} className={`px-4 py-2 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center flex-1 bg-amber-800 hover:bg-amber-900`} title={`刪除所選月份`}><span className="text-4xl mr-1">💣</span>刪除月份</ProtectedButton>
                        <ProtectedButton onClick={() => handleDeleteSemesterAssignments()} disabled={isGlobalLoading} className={`px-4 py-2 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center justify-center flex-1 bg-rose-500 hover:bg-rose-600`} title={`刪除學期/全部資料`}><span className="text-4xl mr-1">☢️</span>刪除學期</ProtectedButton>
                    </>
                )}
            </div>
            
             <div className="flex justify-between items-center mb-2 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-5xl font-bold text-gray-800 flex items-center"><span className="text-gray-500 mr-3 text-5xl">📋</span>{selectedDisplayDate ? <span className="text-4xl">{new Date(selectedDisplayDate).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} 作業確認表</span> : '請選擇日期'}</h2>
                    <span className="text-gray-500 text-lg mt-1 flex items-center"><Lightbulb className="w-5 h-5 mr-1 text-yellow-500"/> 提示：點擊「座號」或「姓名」可以只顯示該位學生，避免看錯行！</span>
                </div>
                 <div className="flex items-center gap-4">
                    {/* Show Reset View button if focused mode is active */}
                    {focusedStudentId && (
                        <button 
                            onClick={() => setFocusedStudentId(null)}
                            className="px-5 py-3 text-3xl font-medium rounded-lg text-white bg-gray-600 hover:bg-gray-700 transition duration-150 shadow-md flex items-center"
                        >
                            <Eye className="h-8 w-8 mr-2" /> 顯示全部學生
                        </button>
                    )}
                    <button onClick={handleAddNewAssignment} className={`px-5 py-3 text-3xl font-medium rounded-lg text-white transition duration-150 shadow-md flex items-center ${isGlobalLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-400 hover:bg-blue-500'}`} disabled={isGlobalLoading || !selectedDisplayDate}><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>新增作業</button>
                 </div>
            </div>

            {assignmentsForSelectedDate.length === 0 && selectedDisplayDate !== '' && ( <div className="text-center p-12 bg-gray-50 rounded-xl shadow-inner shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><h3 className="mt-4 text-3xl font-medium text-gray-900">該日無作業紀錄。</h3><p className='text-3xl text-gray-600 mt-2'>請選擇左側的日期標籤，或在上方輸入日期並點擊「新增日期」。</p></div> )}
            
            {/* 關鍵修改：將表格與統計區塊包在一個 overflow-auto 的容器中，實現內部捲動 */}
            <div className="flex-1 overflow-auto relative">
                <div className={`w-full relative border border-gray-300 rounded-lg shadow-xl mb-8 ${focusedStudentId ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}> 
                    <div className="min-w-full inline-block align-middle">
                        <table className="w-full divide-y divide-gray-300">
                            <thead className="bg-gray-100 sticky top-0 z-50"><tr>
                                    <th className="px-4 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 border-r border-gray-300 w-36 sticky left-0 top-0 bg-gray-100 z-50 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">座號</th>
                                    <th className="px-4 py-4 text-3xl font-semibold uppercase tracking-wider text-gray-600 w-48 sticky left-36 top-0 bg-gray-100 z-50 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">姓名</th>
                                    {assignmentsForSelectedDate.map((assignment) => ( <AssignmentHeader key={assignment.id} assignment={assignment} isGlobalLoading={isGlobalLoading} handleDeleteAssignment={handleDeleteAssignment} handleEditSave={handleEditAssignmentName} handleMoveAssignment={handleMoveAssignment} setEditingAssignmentId={setEditingAssignmentId} setEditingAssignmentName={setEditingAssignmentName} editingAssignmentId={editingAssignmentId} editingAssignmentName={editingAssignmentName} /> ))}
                                </tr></thead>
                            <tbody className={`divide-y divide-gray-200 ${focusedStudentId ? 'bg-blue-50' : 'bg-white'}`}>
                                {(focusedStudentId ? STUDENT_LIST.filter(s => s.id === focusedStudentId) : STUDENT_LIST).map((student) => (
                                    <tr key={student.id} className={`transition duration-100 group ${focusedStudentId ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                                        <td 
                                            onClick={() => setFocusedStudentId(focusedStudentId === student.id ? null : student.id)}
                                            className="px-4 py-4 text-3xl whitespace-nowrap font-medium text-gray-900 border-r border-gray-300 w-36 sticky left-0 bg-white z-30 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer group-hover:text-blue-600 group-hover:bg-blue-100"
                                            title={focusedStudentId === student.id ? "點擊以顯示全部學生" : "點擊以只顯示此學生"}
                                        >
                                            {student.id}
                                        </td> 
                                        <td 
                                            onClick={() => setFocusedStudentId(focusedStudentId === student.id ? null : student.id)}
                                            className="px-4 py-4 text-3xl whitespace-nowrap text-gray-900 font-semibold w-48 sticky left-36 bg-white z-30 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer group-hover:text-blue-600 group-hover:bg-blue-100 flex items-center justify-center gap-2"
                                            title={focusedStudentId === student.id ? "點擊以顯示全部學生" : "點擊以只顯示此學生"}
                                        >
                                            {student.name}
                                            <span className="opacity-0 group-hover:opacity-100 text-blue-400 text-sm transition-opacity">
                                                {focusedStudentId === student.id ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                            </span>
                                        </td> 
                                        {assignmentsForSelectedDate.map((assignment) => {
                                            const assignmentName = assignment.assignmentName;
                                            const assignmentData = assignmentMap[assignmentName];
                                            const status = assignmentData ? assignmentData.submissionStatus[student.id] ?? true : true; 
                                            
                                            const cellKey = `${student.id}-${assignmentData?.id}`;
                                            const clicks = unlockClicks[cellKey] || 0;
                                            const remaining = 3 - clicks;

                                            return (
                                                <td key={`${student.id}-${assignmentName}`} className="px-3 py-4 whitespace-nowrap text-center">
                                                    <div className="relative inline-block">
                                                        <button
                                                            onClick={() => handleToggleSubmission(assignmentName, student.id, status)}
                                                            disabled={isGlobalLoading}
                                                            className={`p-2 rounded-lg transition duration-150 shadow-md disabled:cursor-not-allowed relative ${status === true ? 'bg-green-200 text-green-700 hover:bg-green-300' : (status === 'late' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-white border-4 border-red-300 text-red-500 hover:bg-red-50')}`}
                                                            aria-label={status === true ? '已完成' : (status === 'late' ? '遲繳' : '待完成')}
                                                        >
                                                            {status === false ? ( <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> )}
                                                        </button>
                                                    </div>
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
                <div className="mt-12 p-6 bg-gray-50 rounded-xl shadow-inner border border-gray-200">
                    <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center"><span className="text-5xl mr-3">⚠️</span><span className="text-4xl">全班未訂正統計</span></h2> 
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {studentMissingStats.map((stat) => {
                            const colorClasses = getMissingColorClasses(stat.missingCount);
                            const countText = stat.missingCount;
                            return (
                                <div 
                                    key={stat.id} 
                                    onClick={() => { if (stat.missingCount > 0) setMissingStudent(stat); }} 
                                    className={`
                                        relative p-4 rounded-2xl cursor-pointer transition-all duration-150 
                                        ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} text-center
                                        border-2 border-b-[8px] active:border-b-[2px] active:translate-y-[6px] hover:-translate-y-[2px] hover:shadow-md
                                    `}
                                >
                                    <p className="text-4xl font-semibold mb-1">{stat.name}</p>
                                    <p className={`text-6xl font-black mt-2 ${colorClasses.countText}`}>{countText}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <MonthlyStudentStats monthlyStats={monthlyStudentStats} months={filteredMonths} />
            </div>
        </div>
      </div>
    </div>
    </DndProvider>
  );
};

export default App;
