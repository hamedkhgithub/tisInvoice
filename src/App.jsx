import React, { useState, useEffect, useMemo, useRef } from 'react';
import ProductTable from './ProductTable';
import CurrencyModal from './CurrencyModal';
import TotalSummary from './TotalSummary';
import * as XLSX from 'xlsx';
import './print.css';

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // 🎯 تعریف وضعیت داینامیک درصد خدمات با ذخیره خودکار در مرورگر
  const [taxRate, setTaxRate] = useState(() => {
  const savedTax = localStorage.getItem('tis_tax_rate');
  return savedTax !== null ? parseFloat(savedTax) : 15;
  });
  const INITIAL_PERCENT_WIDTHS = { index: "5%", image: "8%", category: "11%", title: "15%", model: "12%", descEn: "15%", descFa: "15%", count: "6%", price: "6%", total: "7%" };
  // وضعیت آرایه‌ای دسته‌های انتخاب شده (فیلتر اکسلی)
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef(null);

  const [hideZeroRows, setHideZeroRows] = useState(false); 
  const [currency, setCurrency] = useState("USD"); 
  const [dollarRate, setDollarRate] = useState(1); 
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [inputRate, setInputRate] = useState(() => localStorage.getItem('saved_rate') || "");

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // وضعیت انتخاب نوع فاکتور در بدو ورود
  const [appMode, setAppMode] = useState(null);

  // 🎯 اصلاح قطعی: بازگشت به کلید صحیح descEn جهت لود بدون نقص جدول
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const savedColumns = localStorage.getItem('table_visible_columns');
    return savedColumns ? JSON.parse(savedColumns) : {
      image: true, category: true, title: true, model: true, descEn: true, descFa: true
    };
  });

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns(prev => {
      const updated = { ...prev, [columnKey]: !prev[columnKey] };
      localStorage.setItem('table_visible_columns', JSON.stringify(updated));
      return updated;
    });
  };

  const [plans, setPlans] = useState(() => {
    const savedPlans = localStorage.getItem('tis_saved_plans_list');
    return savedPlans ? JSON.parse(savedPlans) : ["طرح پیش‌فرض"];
  });
  const [selectedPlan, setSelectedPlan] = useState(() => {
    return localStorage.getItem('tis_active_plan_name') || "طرح پیش‌فرض";
  });
  
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planNameInput, setPlanNameInput] = useState("");
  const [planToDelete, setPlanToDelete] = useState("");
  const [isResizeEnabled, setIsResizeEnabled] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch('/products.xlsx')
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]; 
        const excelRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (excelRows.length === 0) {
          setLoading(false);
          return;
        }

        const headerRow = excelRows[0] || [];
        const colIndices = {
          id: headerRow.findIndex(h => h && h.toString().trim() === "ردیف"),
          category: headerRow.findIndex(h => h && h.toString().trim() === "دسته بندی"),
          title: headerRow.findIndex(h => h && h.toString().trim() === "عنوان"),
          model: headerRow.findIndex(h => h && h.toString().trim() === "مدل"),
          descEn: headerRow.findIndex(h => h && h.toString().trim() === "Product Description"),
          descFa: headerRow.findIndex(h => h && h.toString().trim() === "توضیحات"),
          price: headerRow.findIndex(h => h && h.toString().trim() === "قیمت واحد")
        };

        const parsedProducts = excelRows.slice(1).map((row, idx) => {
          if (!row || row === undefined) return null; 

          const id = colIndices.id !== -1 && row[colIndices.id] ? parseInt(row[colIndices.id]) : idx + 1;
          const category = colIndices.category !== -1 && row[colIndices.category] ? row[colIndices.category].toString().trim() : "سایر";
          const title = colIndices.title !== -1 && row[colIndices.title] ? row[colIndices.title].toString().trim() : "";
          const model = colIndices.model !== -1 && row[colIndices.model] ? row[colIndices.model].toString().trim() : "";
          const descEn = colIndices.descEn !== -1 && row[colIndices.descEn] ? row[colIndices.descEn].toString().trim() : "";
          const descFa = colIndices.descFa !== -1 && row[colIndices.descFa] ? row[colIndices.descFa].toString().trim() : "";
          const price = colIndices.price !== -1 && row[colIndices.price] ? parseInt(row[colIndices.price].toString().replace(/,/g, '')) : 0;

          const savedActivePlan = localStorage.getItem('tis_active_plan_name') || "طرح پیش‌فرض";
          const savedQty = localStorage.getItem(`plan_${savedActivePlan}_qty_${id || model}`);
          const quantity = savedQty ? parseInt(savedQty) : 0; 

          return {
            id, excelIndex: idx + 1, category, title, model, descEn, descFa, quantity, price
          };
        }).filter(item => item !== null && item.title !== "");

        setData(parsedProducts);
        
        const allCats = [...new Set(parsedProducts.map(i => i.category))];
        setSelectedCategories(allCats);
        
        setLoading(false);
      });
  }, []);
  const categories = useMemo(() => [...new Set(data.map(i => i.category))], [data]);

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(search.toLowerCase()) || 
      item.model.toLowerCase().includes(search.toLowerCase()) ||
      item.descEn.toLowerCase().includes(search.toLowerCase()) || 
      item.descFa.toLowerCase().includes(search.toLowerCase()); 
      
    const matchesCategory = selectedCategories.includes(item.category);
    const matchesZeroFilter = hideZeroRows ? item.quantity > 0 : true;
    return matchesSearch && matchesCategory && matchesZeroFilter;
  });

  const handleCategoryToggle = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]); 
    } else {
      setSelectedCategories(categories); 
    }
  };

  const handleSort = (key) => {
    let nextDir = sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'desc' : sortConfig.direction === 'desc' ? null : 'asc') : 'asc';
    setSortConfig({ key: nextDir ? key : null, direction: nextDir });
    setData([...data].sort((a, b) => !nextDir ? a.excelIndex - b.excelIndex : (a[key] < b[key] ? (nextDir === 'asc' ? -1 : 1) : (nextDir === 'asc' ? 1 : -1))));
  };

  const applyCurrencyExchange = () => {
    const rate = parseInt(inputRate);
    if (!rate || rate <= 0) return alert("نرخ معتبر نیست.");
    localStorage.setItem('saved_rate', inputRate);
    setDollarRate(rate); setCurrency("IRR"); setShowCurrencyModal(false);
  };

  const toggleCurrency = () => currency === "IRR" ? (setCurrency("USD"), setDollarRate(1)) : (setInputRate(localStorage.getItem('saved_rate') || ""), setShowCurrencyModal(true));
  
  const handleSave = (id) => { 
    const updatedData = data.map(i => {
      if (i.id === id) {
        return { ...editFormData, quantity: parseInt(editFormData.quantity) || 0 };
      }
      return i;
    });
    setData(updatedData); 
    setEditingId(null); 
  };

  const handleSaveChangesToCurrentPlan = () => {
    data.forEach(item => {
      localStorage.setItem(`plan_${selectedPlan}_qty_${item.id || item.model}`, item.quantity.toString());
    });
    alert(`تغییرات تعداد کالاها با موفقیت در طرح جاری "${selectedPlan}" ذخیره شد.`);
  };

  const handleCreatePlan = () => {
    const name = planNameInput.trim();
    if (!name) return alert("لطفاً نام طرح را وارد کنید.");
    if (plans.includes(name)) return alert("این نام طرح قبلاً ایجاد شده است.");

    const updatedPlans = [...plans, name];
    setPlans(updatedPlans);
    localStorage.setItem('tis_saved_plans_list', JSON.stringify(updatedPlans));
    
    setSelectedPlan(name);
    localStorage.setItem('tis_active_plan_name', name);
    
    data.forEach(item => {
      localStorage.setItem(`plan_${name}_qty_${item.id || item.model}`, item.quantity.toString());
    });

    setPlanNameInput("");
    setShowPlanModal(false);
    alert(`طرح جدید با نام "${name}" ایجاد شد و تعداد کالاها در آن ذخیره گردید.`);
  };

  const handlePlanChange = (name) => {
    setSelectedPlan(name);
    localStorage.setItem('tis_active_plan_name', name);
    
    const switchedData = data.map(item => {
      const savedQty = localStorage.getItem(`plan_${name}_qty_${item.id || item.model}`);
      return { ...item, quantity: savedQty ? parseInt(savedQty) : 0 };
    });
    setData(switchedData);
  };

  const handleDeletePlan = () => {
    if (!planToDelete) return alert("لطفاً یک طرح را برای حذف انتخاب کنید.");
    if (planToDelete === "طرح پیش‌فرض") return alert("شما نمی‌توانید طرح پیش‌فرض سیستم را حذف کنید.");

    data.forEach(item => {
      localStorage.removeItem(`plan_${planToDelete}_qty_${item.id || item.model}`);
    });

    const updatedPlans = plans.filter(p => p !== planToDelete);
    setPlans(updatedPlans);
    localStorage.setItem('tis_saved_plans_list', JSON.stringify(updatedPlans));

    let nextActivePlan = selectedPlan;
    if (selectedPlan === planToDelete) {
      nextActivePlan = "طرح پیش‌فرض";
      setSelectedPlan("طرح پیش‌فرض");
      localStorage.setItem('tis_active_plan_name', "طرح پیش‌فرض");
    }

    const refreshedData = data.map(item => {
      const savedQty = localStorage.getItem(`plan_${nextActivePlan}_qty_${item.id || item.model}`);
      return { ...item, quantity: savedQty ? parseInt(savedQty) : 0 };
    });
    setData(refreshedData);

    setPlanToDelete("");
    setShowDeleteModal(false);
  };

  // 🎯 اعمال محاسبات مالی بر اساس درصد داینامیک ورودی کاربر
  const totalSum = filteredData.reduce((sum, item) => sum + (item.quantity * item.price * dollarRate), 0);
  const taxServices = totalSum * (taxRate / 100);
  const finalTotal = totalSum + taxServices;

  // 📥 دانلود فایل طرح فعال جاری با پنجره بومی ویندوز (Save As JSON)
  const handleDownloadPlanJson = async () => {
    try {
      const planPayload = {
        planName: selectedPlan,
        items: data.map(item => ({ id: item.id, model: item.model, quantity: item.quantity }))
      };
      const jsonString = JSON.stringify(planPayload, null, 2);

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${selectedPlan}.json`,
          types: [{ description: 'TIS Plan File', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
      } else {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedPlan}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.log("دانلود لغو شد", err);
    }
  };

  // 📤 بارگذاری فایل طرح با پنجره بومی انتخاب فایل ویندوز (Upload JSON)
  const handleUploadPlanJson = async () => {
    try {
      if (window.showOpenFilePicker) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{ description: 'TIS Plan File', accept: { 'application/json': ['.json'] } }],
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!parsed.items || !Array.isArray(parsed.items)) return alert("فرمت فایل معتبر نیست.");

        // 🎯 ۱. استخراج نام طرح از فایل و اضافه کردن هوشمند آن به کمبوباکس طرح‌ها
        const uploadedPlanName = parsed.planName || "طرح بارگذاری‌شده";
        
        let updatedPlansList = [...plans];
        if (!plans.includes(uploadedPlanName)) {
          updatedPlansList = [...plans, uploadedPlanName];
          setPlans(updatedPlansList);
          localStorage.setItem('tis_saved_plans_list', JSON.stringify(updatedPlansList));
        }

        // 🎯 ۲. تنظیم اتوماتیک طرح فعال کمبوباکس به نام طرح جدید
        setSelectedPlan(uploadedPlanName);
        localStorage.setItem('tis_active_plan_name', uploadedPlanName);

        // ۳. اعمال تعداد کالاها روی جدول و ذخیره روی همین نام طرح جدید
        const updatedData = data.map(item => {
          const matchedItem = parsed.items.find(f => 
            f.id === item.id || 
            (f.model && item.model && f.model.toString().trim().toLowerCase() === item.model.toString().trim().toLowerCase())
          );
          const newQty = matchedItem ? parseInt(matchedItem.quantity) || 0 : 0;
          
          // قفل کردن تعدادها روی نام طرحی که الان به کمبوباکس اضافه شد
          localStorage.setItem(`plan_${uploadedPlanName}_qty_${item.id || item.model}`, newQty.toString());
          return { ...item, quantity: newQty };
        });

        setData(updatedData);
        alert(`طرح "${uploadedPlanName}" با موفقیت به منو اضافه و روی جدول اعمال شد.`);
      }
    } catch (err) {
      console.log("آپلود لغو شد", err);
    }
  };


  if (loading) return <div className="text-center p-10 font-bold">در حال بارگذاری...</div>;
  if (appMode === null) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ direction: 'rtl', zIndex: 999999 }}>
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-100">
          <div className="text-4xl mb-3">📄</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">انتخاب نوع فاکتور بازرگانی</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">لطفاً فرمت نمایش و خروجی را مشخص کنید:</p>
          <div className="flex flex-col gap-3 font-semibold text-sm">
            <button onClick={() => setAppMode('quotation')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl shadow-md transition-all">💰 صدور پیش‌فاکتور (همراه با قیمت)</button>
            <button onClick={() => setAppMode('equipment')} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 px-4 rounded-xl shadow-md transition-all">📋 صدور لیست اقلام (کنترل کیفی فنی)</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto text-right print:p-0" style={{ direction: 'rtl' }}>
      <div className="flex justify-between items-center border-b pb-3 mb-6 print:mb-4">
      <h1 className="text-xl font-bold text-slate-800 print:text-lg">
          {appMode === 'quotation' ? 'پیش فاکتور هوشمندسازی' : 'لیست اقلام هوشمند سازی'}
        </h1>
        <span onClick={() => setAppMode(null)} className="print:hidden cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 text-2xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-all">
          {appMode === 'quotation' ? '🔄 وضعیت: پیش‌فاکتور مالی' : '🔄 وضعیت: لیست فنی اقلام'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 items-end print:hidden">
        <div>
          <input type="text" placeholder="جستجو..." className="w-full p-2.5 border border-slate-300 rounded-xl text-sm shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        <div ref={catDropdownRef} className="relative text-right">
        <button 
        onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)} 
          className={`w-full p-2.5 border rounded-xl text-sm shadow-sm font-medium flex justify-between items-center outline-none focus:border-blue-500 transition-colors ${
          /* 🎯 اضافه شدن کلس animate-pulse برای فعال شدن مجدد حالت چشمک‌زن در وضعیت قرمز */
          data.some(item => item.quantity > 0 && !selectedCategories.includes(item.category))
            ? 'bg-red-100 text-red-900 border-red-400 font-bold animate-pulse' // 🔴 چشمک‌زن بحرانی
           : selectedCategories.length !== categories.length
           ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold' // 🟡 هشدار معمولی
            : 'bg-white text-slate-700 border-slate-300' // ⚪ استاندارد
       }`}
>

            <span>📊 دسته‌بندی‌ها ({selectedCategories.length})</span>
            <span className="text-slate-400 text-2xs">▼</span>
          </button>
          
          {isCatDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
              <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer font-bold text-slate-800 border-b pb-1.5 mb-1.5 text-xs">
                <input type="checkbox" checked={selectedCategories.length === categories.length && categories.length > 0} onChange={handleSelectAllCategories} className="w-4 h-4 rounded text-blue-600 accent-blue-600" />
                <span>(انتخاب همه / پاک کردن)</span>
              </label>
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-2 p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer text-xs font-semibold text-slate-600">
                  <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => handleCategoryToggle(cat)} className="w-4 h-4 rounded text-blue-600 accent-blue-600" />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <select className="w-full p-2.5 border border-slate-300 rounded-xl text-sm shadow-sm bg-white font-semibold text-blue-700 border-blue-200" value={selectedPlan} onChange={(e) => handlePlanChange(e.target.value)}>
            {plans.map(p => <option key={p} value={p}>📂 طرح: {p}</option>)}
          </select>
        </div>

        <div>
          {appMode === 'quotation' ? (
            <button onClick={toggleCurrency} className={`w-full p-2.5 rounded-xl border text-sm font-semibold ${currency === "IRR" ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}>{currency === "IRR" ? '💵 دلار ($)' : '🔄 تبدیل به ریال'}</button>
          ) : (
            <div className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm font-medium text-center select-none">❌ ارز غیرفعال</div>
          )}
        </div>
      </div>

            {/* 💡 ساختار نهایی و تراز شده دکمه‌ها با کلس flex-wrap جهت شکستن سطر */}
      <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-4 items-center print:hidden text-xs font-semibold text-slate-700 shadow-2xs">
        <span className="text-slate-500 font-bold">🛠️ تنظیمات ستون‌های فاکتور:</span>
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={visibleColumns.image} onChange={() => handleColumnToggle('image')} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> تصویر</label>
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={visibleColumns.category} onChange={() => handleColumnToggle('category')} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> دسته‌بندی</label>
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={visibleColumns.title} onChange={() => handleColumnToggle('title')} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> عنوان</label>
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={visibleColumns.model} onChange={() => handleColumnToggle('model')} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> مدل</label>
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={visibleColumns.descEn} onChange={() => handleColumnToggle('descEn')} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> Product Description</label>
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={visibleColumns.descFa} onChange={() => handleColumnToggle('descFa')} className="w-4 h-4 rounded text-blue-600 accent-blue-600" /> توضیحات</label>
        
        {/* 🎯 اصلاح نهایی دکمه‌ها: هم‌اندازه شدن کامل دکمه‌ها و تغییر رنگ به سبز بازرگانی */}
        <div className="mr-auto flex flex-row-reverse items-center gap-3">
          <button onClick={() => window.print()} className="w-36 bg-slate-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-900 shadow-sm whitespace-nowrap text-center">🖨️ چاپ فاکتور (PDF)</button>
          
          <button onClick={() => setHideZeroRows(!hideZeroRows)} className={`w-36 py-2 rounded-xl border text-xs font-bold transition-all whitespace-nowrap text-center ${
            hideZeroRows 
              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' 
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}>
            {hideZeroRows ? '🔄 نمایش همه' : '🖨️ آماده چاپ'}
          </button>
        </div>


        
        <div className="w-full border-t border-slate-200/60 my-1"></div>
        
        <span className="text-slate-500 font-bold ml-2">📂 عملیات و پشتیبان‌گیری طرح‌ها:</span>
        <button onClick={handleSaveChangesToCurrentPlan} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm">ذخیره طرح فعلی</button>
        <button onClick={() => setShowPlanModal(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm">ذخیره طرح جدید</button>
        <button onClick={() => { setPlanToDelete(""); setShowDeleteModal(true); }} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 shadow-sm">حذف طرح</button>
        
        <button onClick={handleDownloadPlanJson} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-100 shadow-sm transition-all">📥 دانلود فایل طرح (JSON)</button>
        <button onClick={handleUploadPlanJson} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-100 shadow-sm transition-all">📤 بارگذاری فایل طرح (JSON)</button>
{/* 🎯 ادغام متن و سوئیچ در یک المان واحد بومی (Label) - ۱۰۰٪ کنار هم بدون جدایی */}
<label 
  onClick={() => setIsResizeEnabled(!isResizeEnabled)}
  className="inline-flex items-center gap-2 cursor-pointer select-none print:hidden whitespace-nowrap text-xs font-bold text-slate-500"
>
  <span>🔒 قفل ابعاد:</span>
  
  {/* بدنه سوئیچ */}
  <span 
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      !isResizeEnabled ? 'bg-blue-600' : 'bg-slate-300'
    }`}
  >
    {/* دایره متحرک داخلی */}
    <span 
      style={{
        right: !isResizeEnabled ? '4px' : '24px'
      }}
      className="absolute h-4 w-4 rounded-full bg-white transition-all duration-200" 
    />
  </span>
</label>

      </div>




      {/* 🎯 بستن مستقل تیکت کامپوننت جدول با کاراکتر /> استاندارد ری‌اکت */}
      <ProductTable 
      filteredData={filteredData} 
      sortConfig={sortConfig} 
      handleSort={handleSort} 
      editingId={editingId} 
      editFormData={editFormData} 
      handleEditClick={(i) => { setEditingId(i.id); setEditFormData({...i}); }} 
      handleInputChange={(e, f) => setEditFormData({ ...editFormData, [f]: f === 'quantity' ? parseInt(e.target.value) || 0 : e.target.value })} 
      handleSave={handleSave} currency={currency} 
      dollarRate={dollarRate} 
      visibleColumns={visibleColumns} 
      search={search} 
      appMode={appMode}
      INITIAL_PERCENT_WIDTHS={INITIAL_PERCENT_WIDTHS} 
      isResizeEnabled={isResizeEnabled}     
     />
      
      {/* 🎯 رندر مستقل و ۱۰۰٪ تضمینی باکس مالی پایینی منحصراً در وضعیت پیش‌فاکتور */}
      {/* 🎯 اضافه شدن taxRate و setTaxRate به کامپوننت محاسب مالی پایینی */}
      {appMode === 'quotation' && (
        <TotalSummary 
          totalSum={totalSum} 
          taxServices={taxServices} 
          finalTotal={finalTotal} 
          currency={currency}
          taxRate={taxRate}
          setTaxRate={(val) => {
            setTaxRate(val);
            localStorage.setItem('tis_tax_rate', val.toString());
          }}
        />
      )}

      
      <CurrencyModal isOpen={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} inputRate={inputRate} setInputRate={setInputRate} onApply={applyCurrencyExchange} />

{/* پاپ‌آپ ذخیره طرح جدید (Save As) */}
{showPlanModal && (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center" style={{ zIndex: 999999 }}>
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs w-full text-right border border-slate-100">
      <h3 className="font-bold text-slate-800 text-base mb-2">ثبت طرح جدید فاکتور</h3>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">لطفاً نامی برای ذخیره‌سازی این تعداد و مقادیر فاکتور وارد کنید:</p>
      <input type="text" placeholder="مثال: پروژه هتل اسپیناس" value={planNameInput} onChange={(e) => setPlanNameInput(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4 font-medium" />
      <div className="flex gap-2 text-xs font-semibold">
        <button onClick={handleCreatePlan} className="flex-1 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700">ذخیره طرح</button>
        <button onClick={() => setShowPlanModal(false)} className="flex-1 bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200">انصراف</button>
      </div>
    </div>
  </div>
)}

{/* پاپ‌آوپ حذف طرح */}
{showDeleteModal && (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center" style={{ zIndex: 999999 }}>
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs w-full text-right border border-slate-100">
      <h3 className="font-bold text-red-700 text-base mb-2">حذف طرح‌های فاکتور</h3>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">طرح مورد نظر را برای حذف دائمی انتخاب کنید (طرح پیش‌فرض قابل حذف نیست):</p>
      <select className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white font-medium mb-4 outline-none focus:ring-2 focus:ring-red-500" value={planToDelete} onChange={(e) => setPlanToDelete(e.target.value)}>
        <option value="">-- انتخاب طرح --</option>
        {plans.filter(p => p !== "طرح پیش‌فرض").map(p => <option key={p} value={p}>📄 {p}</option>)}
      </select>
      <div className="flex gap-2 text-xs font-semibold">
        <button onClick={handleDeletePlan} className="flex-1 bg-red-600 text-white p-2.5 rounded-xl hover:bg-red-700">حذف قطعی</button>
        <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200">انصراف</button>
      </div>
    </div>
  </div>
)}
</div>
);

}
