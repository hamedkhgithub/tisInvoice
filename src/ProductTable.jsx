import React, { useState, useRef, useEffect } from 'react';
import ImageZoomPopup from './ImageZoomPopup';

// 🎯 تابع کمکی برای پیدا کردن متن سرچ شده و قرار دادن آن داخل تگ استاندارد <mark>
const highlightText = (text, searchWord) => {
  if (!searchWord || !text) return text;
  const stringText = text.toString();
  const regex = new RegExp(`(${searchWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = stringText.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-300 text-black rounded-sm px-0.5 font-bold">
        {part}
      </mark>
    ) : (
      part
    )
  );
};


export default function ProductTable({ 
  filteredData, sortConfig, handleSort, editingId, 
  editFormData, handleEditClick, handleInputChange, handleSave, currency, dollarRate, visibleColumns,
  search, appMode,isResizeEnabled // 🎯 دریافت وضعیت نوع سند از کامپوننت پدر
}) {
  const tableContainerRef = useRef(null);
  const [tableZoom, setTableZoom] = useState(1);

  const [widths, setWidths] = useState(() => {
    const savedWidths = localStorage.getItem('table_column_widths');
    if (savedWidths) return JSON.parse(savedWidths);
  
    // 🎯 گرفتن عرض زنده پنجره
    const screenWidth = window.innerWidth;
  
    // 🎯 جادو اینجاست: در موبایل کل صفحه مال جدول است، اما در لپ‌تاپ جدول محدود به باکس فاکتور (حداکثر ۱۲۴۰ پیکسل) است.
    // کسر کادر و پدینگ‌ها (۳۲ پیکسل) برای موبایل اعمال می‌شود
    const tableWidth = screenWidth < 750 ? 750 : Math.min(screenWidth - 64, 1240);
  
    return {
      index: Math.round(tableWidth * 0.04),      // ۴٪
      image: Math.round(tableWidth * 0.12),      // ۷٪
      category: Math.round(tableWidth * 0.09),   // ۱۰٪
      title: Math.round(tableWidth * 0.09),      // ۱۵٪
      model: Math.round(tableWidth * 0.09),      // ۱۲٪
      descEn: Math.round(tableWidth * 0.18),     // ۱۵٪
      descFa: Math.round(tableWidth * 0.20),     // ۱۷٪
      quantity: Math.round(tableWidth * 0.04),   // ۶٪
      price: Math.round(tableWidth * 0.07),      // ۷٪
      totalPrice: Math.round(tableWidth * 0.08)  // ۷٪
    };
  });
  
  

  const [rowHeights, setRowHeights] = useState(() => {
    const savedHeights = localStorage.getItem('table_row_heights');
    return savedHeights ? JSON.parse(savedHeights) : {};
  });

  useEffect(() => {
    if (filteredData && filteredData.length > 0 && widths.image === null) {
      const firstProduct = filteredData[0];
      const cleanModel = firstProduct.model ? firstProduct.model.toString().trim() : "no-model";
      
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}pics/${cleanModel}.png`;
      
      img.onload = () => {
        const scale = 0.25;
        const newWidth = Math.round(img.naturalWidth * scale);
        const newHeight = Math.round(img.naturalHeight * scale);
        
        setWidths(prev => {
          const updatedWidths = { ...prev, image: newWidth };
          localStorage.setItem('table_column_widths', JSON.stringify(updatedWidths));
          return updatedWidths;
        });
        
        const updatedHeights = {};
        filteredData.forEach(item => {
          updatedHeights[item.id] = newHeight;
        });
        setRowHeights(updatedHeights);
        localStorage.setItem('table_row_heights', JSON.stringify(updatedHeights));
      };
      
      img.onerror = () => {
        setWidths(prev => ({ ...prev, image: 85 }));
      };
    }
  }, [filteredData, widths.image]);

  const resizerRef = useRef({ active: null, startX: 0, startWidth: 0 });
  const isResizingRef = useRef(false);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    if (!tableContainer) return;

    const handleTableWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setTableZoom((prevZoom) => {
          const delta = e.deltaY < 0 ? 0.05 : -0.05;
          const newZoom = prevZoom + delta;
          return Math.min(Math.max(0.7, newZoom), 1.5);
        });
      }
    };
    tableContainer.addEventListener('wheel', handleTableWheel, { passive: false });
    return () => tableContainer.removeEventListener('wheel', handleTableWheel);
  }, []);
  const startRowResize = (e, itemId) => {
    if (!isResizeEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const currentHeight = rowHeights[itemId] || 90;

    const handleRowMouseMove = (moveEvent) => {
      const currentY = moveEvent.clientY;
      const diffY = currentY - startY;
      const newHeight = currentHeight + (diffY / tableZoom);
      
      // حداقل ارتفاع هوشمند: سطر به راحتی کوچک می‌شود تا متون پر شوند
      const finalHeight = Math.max(30, newHeight);
      
      setRowHeights(prev => {
        const updated = { ...prev, [itemId]: finalHeight };
        localStorage.setItem('table_row_heights', JSON.stringify(updated));
        return updated;
      });
    };

    const handleRowMouseUp = () => {
      document.removeEventListener('mousemove', handleRowMouseMove);
      document.removeEventListener('mouseup', handleRowMouseUp);
    };

    document.addEventListener('mousemove', handleRowMouseMove);
    document.addEventListener('mouseup', handleRowMouseUp);
  };


  const startResize = (e, columnKey) => {
    if (!isResizeEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true; 
    resizerRef.current = { active: columnKey, startX: e.clientX, startWidth: widths[columnKey] };
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e) => {
    const { active, startX, startWidth } = resizerRef.current;
    if (!active) return;
    const currentX = e.clientX;
    const diff = startX - currentX;
    
    const minAllowedWidth = active === 'image' ? 100 : 40;
    const newWidth = Math.max(minAllowedWidth, startWidth + diff);
    
    setWidths(prev => {
      const updated = { ...prev, [active]: newWidth };
      localStorage.setItem('table_column_widths', JSON.stringify(updated));
      return updated;
    });
  };

  const stopResize = () => {
    resizerRef.current = { active: null, startX: 0, startWidth: 0 };
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    setTimeout(() => { isResizingRef.current = false; }, 50);
  };
  // --- اضافه شده برای پشتیبانی از لمس موبایل (Touch Events) ---

  // ۱. کنترل تغییر ارتفاع سطرها با لمس در موبایل
  const startRowTouchSize = (e, itemId) => {
    if (!isResizeEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    // گرفتن مختصات اولین انگشت لمس شده
    const touch = e.touches[0];
    const startY = touch.clientY;
    const currentHeight = rowHeights[itemId] || 90;

    const handleRowTouchMove = (moveEvent) => {
      if (moveEvent.touches.length === 0) return;
      const currentY = moveEvent.touches[0].clientY;
      const diffY = currentY - startY;
      const newHeight = currentHeight + (diffY / tableZoom);
      const finalHeight = Math.max(30, newHeight);
      
      setRowHeights(prev => {
        const updated = { ...prev, [itemId]: finalHeight };
        localStorage.setItem('table_row_heights', JSON.stringify(updated));
        return updated;
      });
    };

    const handleRowTouchEnd = () => {
      document.removeEventListener('touchmove', handleRowTouchMove);
      document.removeEventListener('touchend', handleRowTouchEnd);
    };

    document.addEventListener('touchmove', handleRowTouchMove, { passive: false });
    document.addEventListener('touchend', handleRowTouchEnd);
  };

  // ۲. شروع تغییر عرض ستون‌ها با لمس در موبایل
  const startTouchResize = (e, columnKey) => {
    if (!isResizeEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true; 
    
    const touch = e.touches[0];
    resizerRef.current = { active: columnKey, startX: touch.clientX, startWidth: widths[columnKey] };
    
    document.addEventListener('touchmove', handleTouchResize, { passive: false });
    document.addEventListener('touchend', stopTouchResize);
  };

  // ۳. محاسبه و اعمال عرض جدید ستون در حین حرکت انگشت
  const handleTouchResize = (e) => {
    const { active, startX, startWidth } = resizerRef.current;
    if (!active || e.touches.length === 0) return;
    
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    
    const minAllowedWidth = active === 'image' ? 100 : 40;
    const newWidth = Math.max(minAllowedWidth, startWidth + diff);
    
    setWidths(prev => {
      const updated = { ...prev, [active]: newWidth };
      localStorage.setItem('table_column_widths', JSON.stringify(updated));
      return updated;
    });
  };

  // ۴. پایان فرآیند لمس و ست کردن وضعیت پایانی
  const stopTouchResize = () => {
    resizerRef.current = { active: null, startX: 0, startWidth: 0 };
    document.removeEventListener('touchmove', handleTouchResize);
    document.removeEventListener('touchend', stopTouchResize);
    setTimeout(() => { isResizingRef.current = false; }, 50);
  };

  const handleProtectedSort = (columnKey) => {
    if (isResizingRef.current) return; 
    handleSort(columnKey);
  };

  const dynamicStyles = `
    ${!visibleColumns.image ? '.col-image { display: none !important; }' : ''}
    ${!visibleColumns.category ? '.col-category { display: none !important; }' : ''}
    ${!visibleColumns.title ? '.col-title { display: none !important; }' : ''}
    ${!visibleColumns.model ? '.col-model { display: none !important; }' : ''}
    ${!visibleColumns.descEn ? '.col-descEn { display: none !important; }' : ''}
    ${!visibleColumns.descFa ? '.col-descFa { display: none !important; }' : ''}
    /* 🎯 حذف فضاهای خالی ستون‌های مالی در حالت لیست فنی اقلام */
    ${appMode !== 'quotation' ? '.col-price, .col-totalPrice { display: none !important; }' : ''}
  `;

  return (
    <div ref={tableContainerRef} 
    className="md:block overflow-x-auto overflow-y-hidden bg-white rounded-xl shadow-md border border-slate-300 w-full print:shadow-none print:border-slate-300 print:rounded-none"
    style={{ fontSize: `${tableZoom * 0.875}rem` }}
    >
      <style>{dynamicStyles}</style>
      
      <table className="text-right border-separate border-spacing-0 table-fixed min-w-full print:w-full border-r border-t border-slate-300" style={{ width: '100%' }}>
        <thead>
          <tr className="bg-slate-200 text-slate-800 select-none print:bg-slate-200">
            <th style={{ width: widths.index * tableZoom }} className="p-1 text-center font-bold relative border-l border-b border-slate-300 col-index">
              ردیف
              <div 
                onMouseDown={(e) => startResize(e, 'index')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'index')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>
                </th>
            <th style={{ width: (widths.image || 85) * tableZoom }}
                 className="p-0 font-bold text-center relative border-l border-b border-slate-300 col-image">
              تصویر
              <div 
                onMouseDown={(e) => startResize(e, 'image')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'image')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>            </th>
            <th style={{ width: widths.category * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold relative border-l border-b border-slate-300 col-category" onClick={() => handleProtectedSort('category')}>
              دسته‌بندی <span className="print:hidden">{sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
              <div 
                onMouseDown={(e) => startResize(e, 'category')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'category')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>            </th>
            <th style={{ width: widths.title * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold relative border-l border-b border-slate-300 col-title" onClick={() => handleProtectedSort('title')}>
              عنوان <span className="print:hidden">{sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
              <div 
                onMouseDown={(e) => startResize(e, 'title')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'title')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>            </th>
            <th style={{ width: widths.model * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold relative border-l border-b border-slate-300 col-model" onClick={() => handleProtectedSort('model')}>
              مدل <span className="print:hidden">{sortConfig.key === 'model' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
              <div 
                onMouseDown={(e) => startResize(e, 'model')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'model')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>            </th>
            <th style={{ width: widths.descEn * tableZoom }} className="p-1 font-bold relative border-l border-b border-slate-300 col-descEn">
              Product Description
              <div 
                onMouseDown={(e) => startResize(e, 'descEn')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'descEn')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>            </th>
            <th style={{ width: widths.descFa * tableZoom }} className="p-1 font-bold relative border-l border-b border-slate-300 col-descFa">
              توضیحات
              <div 
                onMouseDown={(e) => startResize(e, 'descFa')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'descFa')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>            </th>
            <th style={{ width: widths.quantity * tableZoom }} className="p-1 font-bold text-center relative border-l border-b border-slate-300 col-quantity">
              تعداد
              <div 
                onMouseDown={(e) => startResize(e, 'quantity')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'quantity')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>            </th>
            
            {/* 🎯 پنهان‌سازی هوشمند هدر قیمت واحد */}
            {appMode === 'quotation' && (
              <th style={{ width: widths.price * tableZoom }} className="p-1 cursor-pointer hover:bg-slate-300 font-bold text-left relative border-l border-b border-slate-300 col-price" onClick={() => handleProtectedSort('price')}>
                {currency === "IRR" ? 'قیمت واحد (ریال)' : 'قیمت واحد ($)'} <span className="print:hidden">{sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕'}</span>
                <div 
                onMouseDown={(e) => startResize(e, 'price')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'price')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>              </th>
            )}
            
            {/* 🎯 پنهان‌سازی هوشمند هدر قیمت کل */}
            {appMode === 'quotation' && (
              <th style={{ width: widths.totalPrice * tableZoom }} className="p-1 font-bold text-left relative border-l border-b border-slate-300 col-totalPrice">
                {currency === "IRR" ? 'قیمت کل (ریال)' : 'قیمت کل ($)'}
                <div 
                onMouseDown={(e) => startResize(e, 'totalPrice')} 
                 // اضافه کردن هندلر لمسی موبایل که در مرحله قبل نوشتیم
                 onTouchStart={(e) => startTouchResize(e, 'totalPrice')}
                 // md:w-1.5 عرض دسکتاپ را ثابت نگه می‌دارد، اما w-4 محدوده لمس موبایل را بزرگتر می‌کند تا انگشت راحت‌تر آن را بگیرد
                className="absolute left-0 top-0 h-full w-4 md:w-1.5 cursor-col-resize hover:bg-blue-500 bg-transparent z-10 print:hidden touch-none"/>              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item, index) => (
            <tr key={item.id} 
            style={{ 
              height: `${Math.max(
                 rowHeights[item.id] || 90,45) * tableZoom}px` 
            }}           
            className="odd:bg-slate-100 even:bg-white hover:bg-blue-100/50 transition-colors relative">
<td 
style={{ height: 'auto' }} className="p-1 text-center text-slate-500 font-semibold break-words border-l border-b border-slate-300 col-index relative select-none">
  {index + 1}
  <div 
  onMouseDown={(e) => startRowResize(e, item.id)} 
  // اضافه کردن هندلر لمسی موبایل برای تغییر ارتفاع سطر
  onTouchStart={(e) => startRowTouchSize(e, item.id)}
  
  // md:h-1.5 ارتفاع را در دسکتاپ ثابت نگه می‌دارد، اما h-4 محدوده لمس انگشت را در موبایل بزرگتر می‌کند
  className="absolute bottom-0 right-0 w-full h-4 md:h-1.5 cursor-row-resize bg-transparent hover:bg-blue-500/30 z-20 print:hidden touch-none" />
</td>
              
              {visibleColumns.image && (
<ImageZoomPopup 
  model={item.model} 
  excelIndex={item.excelIndex} 
  title={item.title} 
  tableZoom={tableZoom} 
  columnWidth={widths.image || 85}
  currentRowHeight={(rowHeights && rowHeights[item.id]) || 45}
  
/>

              )}
              
              <td style={{ height: 'auto' }} className="p-1 text-slate-900 font-medium break-words whitespace-normal border-l border-b border-slate-300 col-category">{item.category}</td>
              
              <td style={{ height: 'auto' , fontSize: '0.95em' }} className="p-1 text-slate-700 font-semibold break-words whitespace-normal border-l border-b border-slate-300 col-title">
                {highlightText(item.title, search)}
              </td>
              
              <td style={{ height: 'auto' }} className="p-1 text-slate-600 font-mono text-xs break-all whitespace-normal border-l border-b border-slate-300 col-model">
                {highlightText(item.model, search)}
              </td>
              
              <td style={{ height: 'auto' , fontSize: '0.8em' }} className="p-1 text-slate-500 font-mono break-words whitespace-normal border-l border-b border-slate-300 col-descEn">
                {highlightText(item.descEn, search)}
              </td>
              
              <td style={{ height: 'auto' , fontSize: '0.85em' }} className="p-1 text-slate-500 break-words whitespace-normal border-l border-b border-slate-300 col-descFa">
                {highlightText(item.descFa, search)}   
              </td>

              <td style={{ height: 'auto' }} className="p-1 text-center cursor-pointer select-none border-l border-b border-slate-300 col-quantity">
                {editingId === item.id ? (
                  <input type="number" min="0" autoFocus value={editFormData.quantity} onChange={(e) => handleInputChange(e, 'quantity')} onBlur={() => handleSave(item.id)} onKeyDown={(e) => e.key === 'Enter' && handleSave(item.id)} className="border border-blue-500 bg-blue-50/20 p-1 rounded-lg w-full text-center outline-none font-bold print:border-transparent print:bg-transparent" />
                ) : (
                  <div onClick={() => handleEditClick(item)} className="font-bold text-slate-800 hover:bg-slate-200 p-1 rounded-lg border border-transparent hover:border-slate-300 transition-all print:hover:bg-transparent">{item.quantity}</div>
                )}
              </td>
              
              {/* 🎯 پنهان‌سازی سلول قیمت واحد هر محصول */}
              {appMode === 'quotation' && (
                <td style={{ height: 'auto' }} className="p-1 text-left text-slate-700 font-mono break-all border-l border-b border-slate-300 col-price">
                  {currency === "IRR" ? `${Math.round(item.price * dollarRate).toLocaleString()} ریال` : `$${Math.round(item.price).toLocaleString()}`}
                </td>
              )}
              
              {/* 🎯 پنهان‌سازی سلول قیمت کل هر محصول */}
              {appMode === 'quotation' && (
                <td style={{ height: 'auto' }} className="p-1 text-left text-blue-700 font-bold font-mono break-all border-l border-b border-slate-300 col-totalPrice">
                  {currency === "IRR" ? `${Math.round(item.quantity * item.price * dollarRate).toLocaleString()} ریال` : `$${Math.round(item.quantity * item.price).toLocaleString()}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
