import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- [Part 1] 基礎設定與圖示 ---

// 模擬 Firebase SDK (防呆用，保留您原本的 import 即可)
const collection = () => {}; const getDocs = () => {}; const doc = () => {}; const writeBatch = () => {}; const serverTimestamp = () => new Date();

// 初始學生名單
const DEFAULT_STUDENTS = Array.from({ length: 14 }, (_, i) => ({
  id: String(i + 1),
  name: i === 0 ? "陳O佑" : i === 1 ? "徐O綸" : i === 2 ? "蕭O群" : i === 3 ? "吳O晏" : i === 4 ? "呂O蔚" : i === 5 ? "吳O昇" : i === 6 ? "翁O儀" : i === 7 ? "鄭O妍" : i === 8 ? "周O涵" : i === 9 ? "李O妤" : `學生${i + 1}`
}));

// 取得今日日期 (YYYY-MM-DD)
const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 缺交顏色分級 (保留原本設計)
const MISSING_COLOR_TIERS = [
  { min: 1, max: 3, colors: { bg: 'bg-blue-300', border: 'border-blue-500', text: 'text-gray-900' } },
  { min: 4, max: 6, colors: { bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-gray-900' } },
  { min: 7, max: 9, colors: { bg: 'bg-indigo-400', border: 'border-indigo-600', text: 'text-white' } },
  { min: 10, max: 99, colors: { bg: 'bg-purple-600', border: 'border-purple-800', text: 'text-white' } }
];

const getMissingColorClasses = (count) => {
  if (count === 0) return { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-400' };
  const tier = MISSING_COLOR_TIERS.find(t => count <= t.max);
  return tier ? tier.colors : MISSING_COLOR_TIERS[MISSING_COLOR_TIERS.length - 1].colors;
};

// 內建 SVG 圖示 (解決白畫面問題)
const Icons = {
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Bank: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>,
  Export: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Import: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
};
// --- [Part 2] 新版訂正存簿元件 (v20.0.0) ---
const StudentBankModal = ({ bankData, onClose, onUpdateBalance, setBankBalanceDirectly, authMode, students }) => {
  // 模式狀態：'bronze' | 'silver' | 'gold'
  const [mode, setMode] = useState('bronze'); 

  // 定義模式設定
  const MODE_CONFIG = {
    bronze: { label: '銅幣模式', icon: '🟤', color: 'orange', step: 10, key: 'bronze', bg: 'bg-orange-50' },
    silver: { label: '銀幣模式', icon: '⚪', color: 'gray', step: 1, key: 'silver', bg: 'bg-gray-50' },
    gold:   { label: '金幣模式', icon: '🟡', color: 'yellow', step: 1, key: 'gold', bg: 'bg-yellow-50' },
  };
  const cfg = MODE_CONFIG[mode];

  // 處理直接輸入
  const handleInputChange = (studentId, type, value) => {
    if (authMode !== 'ADMIN') return;
    if (value === '') {
       setBankBalanceDirectly(studentId, type, 0); // 暫時設為0避免錯誤
       return;
    }
    const numVal = parseInt(value, 10);
    if (!isNaN(numVal) && numVal >= 0) {
      setBankBalanceDirectly(studentId, type, numVal);
    }
  };

  // 處理期末歸零
  const handleResetAll = async () => {
      if (authMode !== 'ADMIN') return;
      if (!window.confirm("⚠️ 危險：確定要將「全班所有錢」歸零嗎？")) return;
      if (!window.confirm("🧨 二次確認：請確認已備份！歸零後無法復原！")) return;
      try {
          for (const s of students) {
              await setBankBalanceDirectly(s.id, 'gold', 0);
              await setBankBalanceDirectly(s.id, 'silver', 0);
              await setBankBalanceDirectly(s.id, 'bronze', 0);
          }
          alert("✅ 全班歸零完成");
      } catch(e) { console.error(e); alert("歸零失敗"); }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-[9999]">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border-4 border-${cfg.color}-400 transition-colors duration-300`}>
        
        {/* 1. 頂部控制列 */}
        <div className="bg-gray-100 p-4 border-b flex flex-wrap gap-4 justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button onClick={() => setMode('gold')} className={`px-4 py-2 rounded-lg font-bold text-xl flex items-center gap-2 transition border-2 ${mode === 'gold' ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-white border-transparent hover:bg-yellow-50'}`}>🟡 金幣</button>
            <button onClick={() => setMode('silver')} className={`px-4 py-2 rounded-lg font-bold text-xl flex items-center gap-2 transition border-2 ${mode === 'silver' ? 'bg-gray-200 border-gray-400 text-gray-800' : 'bg-white border-transparent hover:bg-gray-50'}`}>⚪ 銀幣</button>
            <button onClick={() => setMode('bronze')} className={`px-4 py-2 rounded-lg font-bold text-xl flex items-center gap-2 transition border-2 ${mode === 'bronze' ? 'bg-orange-100 border-orange-400 text-orange-800' : 'bg-white border-transparent hover:bg-orange-50'}`}>🟤 銅幣</button>
          </div>
          <div className="text-xl font-bold text-gray-600">
            當前操作：<span className={`px-3 py-1 rounded text-white bg-${cfg.color}-500`}>{cfg.icon} {cfg.label}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><Icons.X /></button>
        </div>

        {/* 2. 表格區 */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          <table className="w-full bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-100 sticky top-0 shadow text-gray-600">
              <tr>
                <th className="p-3 text-xl w-16">#</th>
                <th className="p-3 text-xl w-16">座號</th>
                <th className="p-3 text-xl text-left">姓名</th>
                <th className="p-3 text-xl w-28 bg-yellow-50 text-yellow-700">金幣</th>
                <th className="p-3 text-xl w-28 bg-gray-50 text-gray-700">銀幣</th>
                <th className="p-3 text-xl w-28 bg-orange-50 text-orange-700">銅幣</th>
                <th className="p-3 text-xl w-40 text-center">快速操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...students].sort((a,b)=> parseInt(a.id)-parseInt(b.id)).map((student, idx) => {
                const bal = bankData[student.id] || { gold: 0, silver: 0, bronze: 0 };
                return (
                  <tr key={student.id} className="hover:bg-blue-50 transition">
                    <td className="p-3 text-center text-gray-400 font-bold">{idx+1}</td>
                    <td className="p-3 text-center text-xl font-bold">{student.id}</td>
                    <td className="p-3 text-xl font-bold">{student.name}</td>
                    
                    {/* 輸入框區 */}
                    <td className="p-2 text-center bg-yellow-50/50">
                      <input type="number" value={bal.gold} onChange={(e)=>handleInputChange(student.id, 'gold', e.target.value)} disabled={authMode!=='ADMIN'} className="w-full text-center text-2xl font-bold text-yellow-700 bg-transparent border-b border-transparent focus:border-yellow-500 outline-none" />
                    </td>
                    <td className="p-2 text-center bg-gray-50/50">
                      <input type="number" value={bal.silver} onChange={(e)=>handleInputChange(student.id, 'silver', e.target.value)} disabled={authMode!=='ADMIN'} className="w-full text-center text-2xl font-bold text-gray-600 bg-transparent border-b border-transparent focus:border-gray-500 outline-none" />
                    </td>
                    <td className="p-2 text-center bg-orange-50/50">
                      <input type="number" value={bal.bronze} onChange={(e)=>handleInputChange(student.id, 'bronze', e.target.value)} disabled={authMode!=='ADMIN'} className="w-full text-center text-2xl font-bold text-orange-700 bg-transparent border-b border-transparent focus:border-orange-500 outline-none" />
                    </td>

                    {/* 按鈕區 */}
                    <td className="p-2 flex justify-center gap-3">
                      <button onClick={() => onUpdateBalance(student.id, cfg.key==='bronze'?10:0, cfg.key==='silver'?1:0, cfg.key==='gold'?1:0)}
                        className={`w-12 h-12 rounded-full shadow flex items-center justify-center text-2xl font-bold transition transform active:scale-90 ${mode==='gold'?'bg-yellow-100 text-yellow-700 hover:bg-yellow-200': mode==='silver'?'bg-gray-100 text-gray-700 hover:bg-gray-200': 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>＋</button>
                      <button onClick={() => onUpdateBalance(student.id, cfg.key==='bronze'?-10:0, cfg.key==='silver'?-1:0, cfg.key==='gold'?-1:0)}
                        className={`w-12 h-12 rounded-full shadow flex items-center justify-center text-2xl font-bold transition transform active:scale-90 opacity-80 hover:opacity-100 ${mode==='gold'?'bg-yellow-50 text-yellow-600': mode==='silver'?'bg-gray-50 text-gray-600': 'bg-orange-50 text-orange-600'}`}>－</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* 3. 底部功能 */}
        <div className="p-4 bg-gray-100 border-t flex justify-between">
           {authMode === 'ADMIN' ? <button onClick={handleResetAll} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold shadow hover:bg-red-700 transition"><Icons.Trash /> 期末歸零</button> : <div/>}
           <button onClick={onClose} className="px-8 py-3 bg-gray-300 text-gray-800 rounded-lg font-bold hover:bg-gray-400 transition text-xl">關閉存簿</button>
        </div>
      </div>
    </div>
  );
};
// --- [Part 3] 主程式邏輯 ---
const App = () => {
  const [students, setStudents] = useState(DEFAULT_STUDENTS);
  const [assignments, setAssignments] = useState([]);
  const [bankData, setBankData] = useState({}); 
  const [showBank, setShowBank] = useState(false);
  const [authMode, setAuthMode] = useState('ADMIN');
  const [db, setDb] = useState(null); // 模擬 DB 狀態
  const [userId, setUserId] = useState('teacher123');
  const [isOffline, setIsOffline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedDisplayDate, setSelectedDisplayDate] = useState(getTodayDate()); // 恢復原本的日期選擇
  const [allAssignmentsByDate, setAllAssignmentsByDate] = useState({}); // 恢復原本的離線資料結構

  // 1. 通用更新餘額 (按鈕用)
  const updateBankBalance = useCallback((studentId, addBronze, addSilver, addGold) => {
    setBankData(prev => {
      const current = prev[studentId] || { gold: 0, silver: 0, bronze: 0 };
      return {
        ...prev,
        [studentId]: {
          gold: Math.max(0, current.gold + addGold),
          silver: Math.max(0, current.silver + addSilver),
          bronze: Math.max(0, current.bronze + addBronze)
        }
      };
    });
  }, []);

  // 2. 直接設定餘額 (輸入框用) - 新增
  const setBankBalanceDirectly = useCallback((studentId, type, value) => {
    setBankData(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { gold: 0, silver: 0, bronze: 0 }),
        [type]: value
      }
    }));
  }, []);

  // 3. 全能匯出 (修復版：含存簿)
  const handleExportData = useCallback(async () => {
    setLoading(true);
    try {
      const exportObj = {
        version: 'v20.0.0',
        timestamp: new Date().toISOString(),
        students,
        assignments,
        bankData, // 💰
        allAssignmentsByDate
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `class_backup_${getTodayDate()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert("✅ 完整備份已匯出 (含存簿)");
    } catch (e) { console.error(e); alert("匯出失敗"); } 
    finally { setLoading(false); }
  }, [students, assignments, bankData, allAssignmentsByDate]);

  // 4. 全能匯入
  const handleImportData = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.students) setStudents(json.students);
        if (json.assignments) setAssignments(json.assignments);
        if (json.bankData) setBankData(json.bankData); // 💰
        if (json.allAssignmentsByDate) setAllAssignmentsByDate(json.allAssignmentsByDate);
        alert("✅ 資料還原成功！");
      } catch (err) { alert("匯入失敗：格式錯誤"); }
      finally { setLoading(false); }
    };
    reader.readAsText(file);
    e.target.value = null;
  }, []);

  // 計算缺交數 (保留原本邏輯)
  const missingStats = useMemo(() => {
    return students.map(s => {
      const count = assignments.filter(a => a.studentId === s.id && !a.status).length;
      return { ...s, missingCount: count };
    });
  }, [students, assignments]);

  // 模擬新增/刪除作業 (為了讓介面能動，保留原本的結構)
  const handleAddAssignment = () => {
    const name = prompt("請輸入作業名稱：");
    if(name) {
       const newAs = students.map(s => ({
         id: Date.now() + Math.random(),
         studentId: s.id,
         assignmentName: name,
         status: false,
         date: selectedDisplayDate
       }));
       setAssignments(prev => [...prev, ...newAs]);
    }
  };
  
  const toggleStatus = (assignId) => {
    setAssignments(prev => prev.map(a => a.id === assignId ? { ...a, status: !a.status } : a));
  };
   // --- [Part 4] 畫面渲染 (盡力還原原貌) ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      {/* 標題列 (保留原本藍色風格) */}
      <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-50 flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🚀 五甲星際守護聖域 <span className="text-sm bg-blue-800 px-2 py-1 rounded">v20.0.0</span>
        </h1>
        <div className="flex gap-2">
           <button onClick={() => setShowBank(true)} className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-bold shadow hover:bg-yellow-300 transition">
             <Icons.Bank /> 訂正存簿
           </button>
           <label className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-600 transition cursor-pointer">
             <Icons.Import /> 匯入
             <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
           </label>
           <button onClick={handleExportData} className="flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-400 transition">
             <Icons.Export /> 匯出
           </button>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="p-4 max-w-7xl mx-auto">
        {/* 日期控制與新增作業 */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow">
            <div className="flex items-center gap-4">
              <input type="date" value={selectedDisplayDate} onChange={(e) => setSelectedDisplayDate(e.target.value)} className="text-2xl font-bold p-2 border rounded" />
            </div>
            <button onClick={handleAddAssignment} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2">
               <Icons.Plus /> 新增作業
            </button>
        </div>

        {/* 學生作業格子 (保留原本的 Grid Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {missingStats.map(student => {
             const colors = getMissingColorClasses(student.missingCount);
             // 篩選出該學生在「選定日期」的作業
             const studentAssignments = assignments.filter(a => a.studentId === student.id && a.date === selectedDisplayDate);
             
             return (
               <div key={student.id} className={`bg-white rounded-xl shadow-lg border-t-8 ${colors.border} overflow-hidden flex flex-col`}>
                  {/* 學生標頭 */}
                  <div className={`p-3 border-b flex justify-between items-center ${colors.bg}`}>
                     <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-gray-700 bg-white/50 w-10 h-10 flex items-center justify-center rounded-full">{student.id}</span>
                        <span className="text-xl font-bold text-gray-900">{student.name}</span>
                     </div>
                     <span className="font-bold bg-white/80 px-2 py-1 rounded text-gray-800">
                        {student.missingCount > 0 ? `${student.missingCount} 缺` : '全對'}
                     </span>
                  </div>
                  
                  {/* 作業列表 (紅綠燈) */}
                  <div className="p-4 flex-1 space-y-3">
                     {studentAssignments.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">今日無作業紀錄</p>
                     ) : (
                        studentAssignments.map(assign => (
                           <div key={assign.id} className="flex justify-between items-center bg-gray-50 p-2 rounded hover:bg-gray-100 transition">
                              <span className="font-medium text-gray-700">{assign.assignmentName}</span>
                              <button 
                                onClick={() => toggleStatus(assign.id)}
                                className={`w-32 py-1 rounded-full font-bold text-white shadow transition-all duration-200 ${assign.status ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                              >
                                {assign.status ? '已完成' : '缺交'}
                              </button>
                           </div>
                        ))
                     )}
                  </div>
               </div>
             )
           })}
        </div>
      </main>

      {/* 存簿彈窗 (只在 showBank 為 true 時顯示) */}
      {showBank && (
        <StudentBankModal 
          bankData={bankData} 
          students={students} 
          authMode={authMode}
          onClose={() => setShowBank(false)}
          onUpdateBalance={updateBankBalance}
          setBankBalanceDirectly={setBankBalanceDirectly}
        />
      )}
    </div>
  );
};

export default App;
