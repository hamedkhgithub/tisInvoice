import React from 'react';

export default function CurrencyModal({ isOpen, onClose, inputRate, setInputRate, onApply }) {
  if (!isOpen) return null;

  // 💡 تابع کمکی برای جدا کردن ۳ رقم ۳ رقم اعداد در حین تایپ کاربر
  const formatInput = (val) => {
    if (!val) return "";
    const clean = val.toString().replace(/[^0-9]/g, '');
    return parseInt(clean).toLocaleString();
  };

  const handleInputChange = (e) => {
    // فقط اعداد را نگه دار و ذخیره کن
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setInputRate(rawValue);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center" style={{ zIndex: 999999 }}>
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs w-full text-right border border-slate-100">
        <h3 className="font-bold text-slate-800 text-base mb-3">نرخ تبدیل دلار</h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">لطفاً قیمت روز هر دلار را جهت محاسبه مبالغ فاکتور به ریال وارد کنید:</p>
        
        <input 
          type="text" 
          placeholder="مثال: 680,000"
          value={formatInput(inputRate)} // 💡 نمایش فرمت ۳ رقم ۳ رقم زنده
          onChange={handleInputChange}
          className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-center text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        
        <div className="flex gap-2 text-xs font-semibold">
          <button onClick={onApply} className="flex-1 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700">تایید</button>
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200">انصراف</button>
        </div>
      </div>
    </div>
  );
}
