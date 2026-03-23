'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Loader2, FileText, FileSpreadsheet, File } from 'lucide-react';
import { FinancialReportData, ExpenseBreakdown, RefundSummary, OrdersFinancialData } from '@/lib/api/analytics';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ExportButtonProps {
  startDate: string;
  endDate: string;
  data?: FinancialReportData;
  expenseData?: ExpenseBreakdown;
  refundData?: RefundSummary;
  ordersData?: OrdersFinancialData;
}

export default function ExportButton({ startDate, endDate, data, expenseData, refundData, ordersData }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!data || !startDate || !endDate) return;
    setIsExporting(true);
    setIsOpen(false);

    try {
      // Simulate slight delay for UI feedback
      await new Promise(res => setTimeout(res, 300));

      if (format === 'csv') {
        exportToCSV(data, startDate, endDate, expenseData, refundData, ordersData);
      } else if (format === 'xlsx') {
        exportToExcel(data, startDate, endDate, expenseData, refundData, ordersData);
      } else if (format === 'pdf') {
        exportToPDF(data, startDate, endDate, expenseData, refundData, ordersData);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const disabled = !data || isExporting;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B5D3B] text-white font-semibold text-sm shadow hover:bg-[#2e472e] transition-colors disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Export
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#A89250]/20 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => handleExport('xlsx')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#F7F4EE] hover:text-[#A89250] transition-colors"
            title="Download formatted Excel workbook with all tabs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#3B5D3B]" />
            Export Full Ledger (.xlsx)
          </button>
          
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#F7F4EE] hover:text-[#A89250] transition-colors"
            title="Download plain CSV file"
          >
            <FileText className="w-4 h-4 text-[#A89250]" />
             Export Flat Data (.csv)
          </button>
          
          <button
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#F7F4EE] hover:text-[#A89250] transition-colors"
            title="Download detailed themed PDF report"
          >
            <File className="w-4 h-4 text-[#d93025]" />
             Export Complete Report (.pdf)
          </button>
        </div>
      )}
    </div>
  );
}
