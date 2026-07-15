import React, { useState } from 'react';

export default function TotalSummary({ totalSum, taxServices, finalTotal, currency, taxRate, setTaxRate }) {
  // وضعیت موقت برای ادیت راحت درصد خدمات درون فیلد ورودی
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(taxRate);

  const formatPrice = (value) => {
    const rounded = Math.round(value).toLocaleString();
    return currency === "IRR" ? `${rounded} ریال` : `$${rounded}`;
  };

  const handleBlur = () => {
    const numericVal = Math.max(0, parseFloat(inputVal) || 0);
    setTaxRate(numericVal);
    setIsEditing(false);
  };

  return (
    <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-md mr-auto shadow-sm space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-600">جمع مبالغ تجهیزات:</span>
        <span className="font-bold font-mono text-slate-800">{formatPrice(totalSum)}</span>
      </div>
      
      {/* 🎯 اصلاح رنگ: رنگ کل سطر کاملاً مشکی/طوسی رسمی (text-slate-600) شد */}
      <div className="flex justify-between text-slate-600 items-center">
        <div className="flex items-center gap-1">
          <span>خدمات و نظارت:</span>
          {isEditing ? (
            <div className="flex items-center gap-0.5 print:hidden">
              <input 
                type="number" 
                min="0" 
                step="1"
                autoFocus
                value={inputVal} 
                onChange={(e) => setInputVal(e.target.value)} 
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                /* 🎯 استایل جدید: تغییر کادر ورودی به رنگ خنثی و رسمی طوسی */
                className="w-14 p-0.5 border border-slate-400 bg-white rounded text-center font-bold text-xs outline-none text-slate-800"
              />
              <span className="text-2xs text-slate-400 font-bold">%</span>
            </div>
          ) : (
            <span 
              onClick={() => { setInputVal(taxRate); setIsEditing(true); }}
              /* 🎯 استایل جدید: تغییر دکمه به رنگ طوسی اداری مماس با فونت کلیدها */
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-300 cursor-pointer font-bold transition-all print:bg-transparent print:border-transparent print:p-0"
            >
              ({taxRate}%)
            </span>
          )}
        </div>
        <span className="font-bold font-mono text-slate-800">{formatPrice(taxServices)}</span>
      </div>

      <div className="flex justify-between border-t border-slate-300 pt-2.5 text-base text-blue-600 font-bold">
        <span className="text-slate-800">جمع کل فاکتور:</span>
        <span className="font-mono">{formatPrice(finalTotal)}</span>
      </div>
    </div>
  );
}
