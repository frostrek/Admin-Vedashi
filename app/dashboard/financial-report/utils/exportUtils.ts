import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialReportData, ExpenseBreakdown, RefundSummary, OrdersFinancialData } from '@/lib/api/analytics';

const GOLD = '#A89250';
const PRIMARY = '#3B5D3B';

export function exportToCSV(
  data: FinancialReportData,
  startDate: string,
  endDate: string,
  expenseData?: ExpenseBreakdown,
  refundData?: RefundSummary,
  ordersData?: OrdersFinancialData
) {
  let csvContent = "data:text/csv;charset=utf-8,";
  
  csvContent += `Financial Report,${startDate} to ${endDate}\n\n`;
  csvContent += "SUMMARY\nMetric,Value\n";
  csvContent += `Total Revenue,${data.summary.totalRevenue}\n`;
  csvContent += `Total Orders,${data.summary.totalOrders}\n`;
  csvContent += `Avg Order Value,${data.summary.avgOrderValue}\n`;
  csvContent += `Refund Amount,${data.summary.refundAmount}\n`;
  csvContent += `Cancelled Revenue Lost,${data.summary.cancelledRevenueLost}\n`;
  csvContent += `Cancellation Rate %,${data.summary.cancellationRate}%\n\n`;

  if (expenseData) {
    csvContent += "EXPENSES & PROFIT\nMetric,Value\n";
    csvContent += `Gross Profit,${expenseData.totals.grossProfit}\n`;
    csvContent += `Gross Profit Margin %,${expenseData.totals.grossProfitMargin}%\n`;
    csvContent += `Total Expenses,${expenseData.totals.totalExpenses}\n\n`;
  }

  if (refundData) {
    csvContent += "REFUNDS & CANCELLATIONS\nMetric,Value\n";
    csvContent += `Refund Count,${refundData.refundCount}\n`;
    csvContent += `Refund Total,${refundData.refundTotal}\n`;
    csvContent += `Cancellation Count,${refundData.cancelCount}\n`;
    csvContent += `Cancel Lost Revenue,${refundData.cancelLostRevenue}\n\n`;
  }

  csvContent += "SALES TREND\nPeriod,Revenue,Orders\n";
  data.salesTrend.forEach(row => {
    csvContent += `${row.period},${row.revenue},${row.orders}\n`;
  });
  csvContent += "\n";

  csvContent += "REVENUE BY HOUR\nHour,Revenue\n";
  data.revenueByHour.forEach(row => {
    csvContent += `${row.hour}:00,${row.revenue}\n`;
  });
  csvContent += "\n";

  csvContent += "TOP CATEGORIES\nCategory,Revenue,Orders\n";
  data.topCategories.forEach(row => {
    csvContent += `${row.category},${row.revenue},${row.orders}\n`;
  });
  csvContent += "\n";

  csvContent += "PAYMENT BREAKDOWN\nMethod,Amount,Orders\n";
  data.paymentBreakdown.forEach(row => {
    csvContent += `${row.method},${row.amount},${row.count}\n`;
  });
  csvContent += "\n";

  csvContent += "ORDER STATUS\nStatus,Count\n";
  data.orderStatusBreakdown.forEach(row => {
    csvContent += `${row.status},${row.count}\n`;
  });
  csvContent += "\n";

  csvContent += "TOP PRODUCTS\nRank,Product,Revenue,Units Sold\n";
  data.topProducts.forEach(p => {
    const safeName = `"${(p.name || '').replace(/"/g, '""')}"`;
    csvContent += `${p.rank},${safeName},${p.revenue},${p.unitsSold}\n`;
  });
  csvContent += "\n";

  if (ordersData && ordersData.orders.length > 0) {
    csvContent += "RECENT TRANSACTIONS\nOrder ID,Customer,Date,Subtotal,Shipping,Tax,Total,Status\n";
    ordersData.orders.forEach(o => {
        csvContent += `${o.orderId},"${o.customer}",${o.date},${o.subtotal},${o.shipping},${o.tax},${o.finalTotal},${o.orderStatus}\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `financial-report-${startDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(
  data: FinancialReportData,
  startDate: string,
  endDate: string,
  expenseData?: ExpenseBreakdown,
  refundData?: RefundSummary,
  ordersData?: OrdersFinancialData
) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryArray = [
    ["Metric", "Value"],
    ["Total Revenue", data.summary.totalRevenue],
    ["Total Orders", data.summary.totalOrders],
    ["Avg Order Value", data.summary.avgOrderValue],
    ["Refund Amount", data.summary.refundAmount],
    ["Cancelled Revenue Lost", data.summary.cancelledRevenueLost],
    ["Cancellation Rate %", data.summary.cancellationRate],
  ];

  if (expenseData) {
    summaryArray.push(["Gross Profit", expenseData.totals.grossProfit]);
    summaryArray.push(["Gross Profit Margin %", expenseData.totals.grossProfitMargin]);
    summaryArray.push(["Total Expenses", expenseData.totals.totalExpenses]);
  }

  if (refundData) {
    summaryArray.push(["Refund Count", refundData.refundCount]);
    summaryArray.push(["Refund Total", refundData.refundTotal]);
    summaryArray.push(["Cancellation Count", refundData.cancelCount]);
    summaryArray.push(["Cancel Lost Revenue", refundData.cancelLostRevenue]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryArray);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // Trends Sheet
  const trendData = data.salesTrend.map(t => ({
    Period: t.period,
    Revenue: t.revenue,
    Orders: t.orders
  }));
  const wsTrend = XLSX.utils.json_to_sheet(trendData);
  XLSX.utils.book_append_sheet(wb, wsTrend, "Sales Trend");

  // Revenue By Hour Sheet
  const hourData = data.revenueByHour.map(h => ({
    Hour: `${h.hour}:00`,
    Revenue: h.revenue
  }));
  const wsHour = XLSX.utils.json_to_sheet(hourData);
  XLSX.utils.book_append_sheet(wb, wsHour, "Hourly Revenue");

  // Transactions Sheet
  if (ordersData && ordersData.orders.length > 0) {
    const trxData = ordersData.orders.map(o => ({
        "Order ID": o.orderId,
        "Customer": o.customer,
        "Date": o.date,
        "Subtotal": o.subtotal,
        "Discounts": o.discounts,
        "Shipping": o.shipping,
        "Tax": o.tax,
        "Final Total": o.finalTotal,
        "Payment": o.paymentMethod,
        "Status": o.orderStatus
    }));
    const wsTrx = XLSX.utils.json_to_sheet(trxData);
    XLSX.utils.book_append_sheet(wb, wsTrx, "Transactions");
  }

  // Breakdown Sheet
  const paymentData = data.paymentBreakdown.map(p => ({
    Method: p.method,
    Amount: p.amount,
    Orders: p.count
  }));
  const wsPayment = XLSX.utils.json_to_sheet(paymentData);
  XLSX.utils.book_append_sheet(wb, wsPayment, "Payments");

  // Order Status Sheet
  const statusData = data.orderStatusBreakdown.map(s => ({
    Status: s.status,
    Count: s.count
  }));
  const wsStatus = XLSX.utils.json_to_sheet(statusData);
  XLSX.utils.book_append_sheet(wb, wsStatus, "Order Status");

  // Top Products Sheet
  const productsData = data.topProducts.map(p => ({
    Rank: p.rank,
    Product: p.name,
    Revenue: p.revenue,
    UnitsSold: p.unitsSold
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, wsProducts, "Top Products");

  // Top Categories Sheet
  const categoriesData = data.topCategories.map(c => ({
    Category: c.category,
    Revenue: c.revenue,
    Orders: c.orders
  }));
  const wsCategories = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, wsCategories, "Top Categories");

  XLSX.writeFile(wb, `financial-report-${startDate}.xlsx`);
}

export function exportToPDF(
  data: FinancialReportData,
  startDate: string,
  endDate: string,
  expenseData?: ExpenseBreakdown,
  refundData?: RefundSummary,
  ordersData?: OrdersFinancialData
) {
  const doc = new jsPDF();
  let currentY = 20;

  const addTableTitle = (title: string, y: number) => {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY);
    doc.text(title, 14, y);
    return y + 4;
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(GOLD);
  doc.text("Vedashi Analytics", 14, currentY);
  currentY += 8;

  doc.setFontSize(16);
  doc.setTextColor(PRIMARY);
  doc.text("Financial Report", 14, currentY);
  currentY += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#666666");
  doc.text(`Period: ${startDate} to ${endDate}`, 14, currentY);
  currentY += 12;

  // 1. Executive Summary Table
  currentY = addTableTitle("Executive Summary", currentY);
  const summaryRows = [
    ["Total Revenue", `Rs. ${data.summary.totalRevenue.toLocaleString()}`],
    ["Total Orders", data.summary.totalOrders.toLocaleString()],
    ["Avg Order Value", `Rs. ${data.summary.avgOrderValue.toLocaleString()}`],
    ["Refund Amount", `Rs. ${data.summary.refundAmount.toLocaleString()}`],
    ["Cancelled Revenue Lost", `Rs. ${data.summary.cancelledRevenueLost.toLocaleString()}`],
    ["Cancellation Rate", `${data.summary.cancellationRate}%`],
  ];
  if (expenseData) {
    summaryRows.push(["Gross Profit", `Rs. ${expenseData.totals.grossProfit.toLocaleString()}`]);
    summaryRows.push(["Gross Profit Margin", `${expenseData.totals.grossProfitMargin}%`]);
  }
  autoTable(doc, {
    startY: currentY,
    head: [["Metric", "Value"]],
    body: summaryRows,
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: "#ffffff", fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
    alternateRowStyles: { fillColor: "#f9f9f9" },
    margin: { left: 14, right: 14 }
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // 2. Sales Trend
  currentY = addTableTitle("Sales Trend (Daily/Weekly)", currentY);
  const trendRows = data.salesTrend.slice(0, 12).map(t => [t.period, `Rs. ${t.revenue.toLocaleString()}`, t.orders]);
  autoTable(doc, {
    startY: currentY,
    head: [["Period", "Revenue", "Orders"]],
    body: trendRows,
    theme: "striped",
    headStyles: { fillColor: GOLD, textColor: "#ffffff", fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // 3. Transactions (New!)
  if (ordersData && ordersData.orders.length > 0) {
    currentY = addTableTitle("Recent Transactions", currentY);
    const trxRows = ordersData.orders.slice(0, 20).map(o => [
        o.orderId.substring(0, 8) + '...',
        o.customer,
        o.date.split('T')[0],
        `Rs. ${o.finalTotal.toLocaleString()}`,
        o.orderStatus
    ]);
    autoTable(doc, {
        startY: currentY,
        head: [["ID", "Customer", "Date", "Total", "Status"]],
        body: trxRows,
        theme: "striped",
        headStyles: { fillColor: PRIMARY, textColor: "#ffffff", fontStyle: "bold" },
        styles: { fontSize: 8 },
    });
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // 4. Refunds & Cancellations
  if (refundData) {
    currentY = addTableTitle("Refunds & Cancellations Summary", currentY);
    const refundRows = [
        ["Refund Count", refundData.refundCount],
        ["Refund Total", `Rs. ${refundData.refundTotal.toLocaleString()}`],
        ["Cancellation Count", refundData.cancelCount],
        ["Cancel Lost Revenue", `Rs. ${refundData.cancelLostRevenue.toLocaleString()}`],
    ];
    autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Value"]],
        body: refundRows,
        theme: "grid",
        headStyles: { fillColor: "#d93025", textColor: "#ffffff", fontStyle: "bold" },
    });
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // 5. Category Performance
  currentY = addTableTitle("Category Performance", currentY);
  const catRows = data.topCategories.map(c => [c.category, `Rs. ${c.revenue.toLocaleString()}`, c.orders]);
  autoTable(doc, {
    startY: currentY,
    head: [["Category", "Revenue", "Orders"]],
    body: catRows,
    theme: "striped",
    headStyles: { fillColor: GOLD, textColor: "#ffffff", fontStyle: "bold" },
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // 6. Payment & Status
  currentY = addTableTitle("Payment Method Breakdown", currentY);
  const paymentRows = data.paymentBreakdown.map(p => [p.method, `Rs. ${p.amount.toLocaleString()}`, p.count]);
  autoTable(doc, {
    startY: currentY,
    head: [["Method", "Amount", "Orders"]],
    body: paymentRows,
    theme: "striped",
    headStyles: { fillColor: PRIMARY, textColor: "#ffffff", fontStyle: "bold" },
  });
  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // 7. Top Products
  currentY = addTableTitle("Top Revenue Products", currentY);
  const productRows = data.topProducts.map(p => [
    p.rank,
    p.name,
    `Rs. ${p.revenue.toLocaleString()}`,
    p.unitsSold
  ]);
  autoTable(doc, {
    startY: currentY,
    head: [["Rank", "Product", "Revenue", "Units sold"]],
    body: productRows,
    theme: "striped",
    headStyles: { fillColor: GOLD, textColor: "#ffffff", fontStyle: "bold" },
    styles: { fontSize: 8 },
  });

  // Save the PDF
  doc.save(`financial-report-${startDate}.pdf`);
}
