import { jsPDF } from 'jspdf';

export interface DashboardReportData {
  schoolName: string;
  schoolCode?: string;
  timeframeLabel: string;
  timeframeKey: string;
  timestamp: string;
  periodEnrollments: number;
  totalStudents: number;
  periodCollected: number;
  periodDemand: number;
  periodDues: number;
  collectionRate: number;
  enrollmentData: Array<{
    label: string;
    newEnrollments: number;
    inquiries: number;
    totalEnrolled: number;
  }>;
  feeData: Array<{
    label: string;
    collected: number;
    demand: number;
    dues: number;
  }>;
  paymentModeData: Array<{
    name: string;
    value: number;
  }>;
  gradeCapacityData: Array<{
    grade: string;
    students: number;
    capacity: number;
  }>;
}

/**
 * Exports current dashboard chart data to a downloadable PDF file
 * with a high-fidelity tabular layout, executive branding, timestamp,
 * and current filter selection.
 */
export function exportDashboardChartsToPdf(data: DashboardReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Title & School Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.schoolName.toUpperCase(), margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254); // Indigo-200
  doc.text('EXECUTIVE PERFORMANCE & KPI ANALYTICS REPORT', margin + 6, y + 14);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('ACADEMIC & FINANCIAL GOVERNANCE SYSTEM', margin + 6, y + 19);

  // Right-aligned report badge
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.roundedRect(pageWidth - margin - 38, y + 5, 34, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('OFFICIAL REPORT', pageWidth - margin - 21, y + 9.5, { align: 'center' });

  y += 28;

  // 2. Filter & Metadata Bar
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('CURRENT FILTER SELECTION:', margin + 4, y + 6);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(data.timeframeLabel, margin + 54, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('GENERATED TIMESTAMP:', margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(data.timestamp, margin + 48, y + 11);

  // Right side of filter bar: Total Cohort
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Active Cohort: ${data.totalStudents} Students`, pageWidth - margin - 4, y + 8.5, { align: 'right' });

  y += 18;

  // 3. KPI Highlight Summary Cards (4 Columns)
  const cardWidth = (contentWidth - 9) / 4; // ~43.25mm each
  const cardHeight = 18;
  const cards = [
    {
      title: 'Period Enrollments',
      value: `+${data.periodEnrollments}`,
      sub: `${data.timeframeLabel}`,
      bgColor: [238, 242, 255], // Indigo-50
      textColor: [67, 56, 202]  // Indigo-700
    },
    {
      title: 'Fees Collected',
      value: `Rs. ${data.periodCollected.toLocaleString('en-IN')}`,
      sub: `${data.collectionRate}% Realization`,
      bgColor: [236, 253, 245], // Emerald-50
      textColor: [4, 120, 87]   // Emerald-700
    },
    {
      title: 'Period Demand',
      value: `Rs. ${data.periodDemand.toLocaleString('en-IN')}`,
      sub: 'Assessed Invoices',
      bgColor: [248, 250, 252], // Slate-50
      textColor: [51, 65, 85]   // Slate-700
    },
    {
      title: 'Outstanding Dues',
      value: `Rs. ${data.periodDues.toLocaleString('en-IN')}`,
      sub: 'Pending Recovery',
      bgColor: [254, 242, 242], // Rose-50
      textColor: [185, 28, 28]  // Rose-700
    }
  ];

  cards.forEach((c, i) => {
    const cx = margin + i * (cardWidth + 3);
    doc.setFillColor(c.bgColor[0], c.bgColor[1], c.bgColor[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title.toUpperCase(), cx + 3, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(c.textColor[0], c.textColor[1], c.textColor[2]);
    doc.text(c.value, cx + 3, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.sub, cx + 3, y + 15);
  });

  y += cardHeight + 6;

  // 4. Section 1: Student Enrollment Growth & Inquiries (Table)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. STUDENT ENROLLMENT GROWTH & INTAKE TRAJECTORY', margin, y);
  y += 3.5;

  // Table Header
  const enrollCols = [
    { name: 'Period / Interval', width: 45, align: 'left' as const },
    { name: 'New Enrollments', width: 45, align: 'right' as const },
    { name: 'Inquiries Received', width: 45, align: 'right' as const },
    { name: 'Cumulative Cohort', width: 47, align: 'right' as const }
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  let curX = margin;
  enrollCols.forEach((col) => {
    const textX = col.align === 'right' ? curX + col.width - 2 : curX + 2;
    doc.text(col.name, textX, y + 4.2, { align: col.align });
    curX += col.width;
  });
  y += 6;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  data.enrollmentData.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 5.2, 'F');
    }
    doc.setTextColor(15, 23, 42);
    curX = margin;

    // Col 0: Period
    doc.text(row.label, curX + 2, y + 3.8);
    curX += enrollCols[0].width;

    // Col 1: New Enrollments
    doc.text(`+${row.newEnrollments}`, curX + enrollCols[1].width - 2, y + 3.8, { align: 'right' });
    curX += enrollCols[1].width;

    // Col 2: Inquiries
    doc.text(String(row.inquiries), curX + enrollCols[2].width - 2, y + 3.8, { align: 'right' });
    curX += enrollCols[2].width;

    // Col 3: Cohort
    doc.text(String(row.totalEnrolled), curX + enrollCols[3].width - 2, y + 3.8, { align: 'right' });

    y += 5.2;
  });

  // Enrollment Totals Row
  const totalInquiries = data.enrollmentData.reduce((acc, c) => acc + c.inquiries, 0);
  doc.setFillColor(224, 231, 255); // Indigo-100
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(49, 46, 129);
  doc.text(`Total (${data.timeframeLabel})`, margin + 2, y + 3.8);
  doc.text(`+${data.periodEnrollments}`, margin + enrollCols[0].width + enrollCols[1].width - 2, y + 3.8, { align: 'right' });
  doc.text(String(totalInquiries), margin + enrollCols[0].width + enrollCols[1].width + enrollCols[2].width - 2, y + 3.8, { align: 'right' });
  doc.text(`Active: ${data.totalStudents}`, margin + contentWidth - 2, y + 3.8, { align: 'right' });

  y += 9.5;

  // 5. Section 2: Fee Collection Status & Dues Recovery (Table)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. FEE COLLECTION STATUS & REALIZATION', margin, y);
  y += 3.5;

  const feeCols = [
    { name: 'Period / Interval', width: 40, align: 'left' as const },
    { name: 'Collected (INR)', width: 38, align: 'right' as const },
    { name: 'Demand (INR)', width: 38, align: 'right' as const },
    { name: 'Pending Dues (INR)', width: 38, align: 'right' as const },
    { name: 'Recovery Rate', width: 28, align: 'right' as const }
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  curX = margin;
  feeCols.forEach((col) => {
    const textX = col.align === 'right' ? curX + col.width - 2 : curX + 2;
    doc.text(col.name, textX, y + 4.2, { align: col.align });
    curX += col.width;
  });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  data.feeData.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 5.2, 'F');
    }
    doc.setTextColor(15, 23, 42);
    curX = margin;

    const rate = row.demand > 0 ? Math.round((row.collected / row.demand) * 100) : 0;

    // Col 0: Period
    doc.text(row.label, curX + 2, y + 3.8);
    curX += feeCols[0].width;

    // Col 1: Collected
    doc.text(`Rs. ${row.collected.toLocaleString('en-IN')}`, curX + feeCols[1].width - 2, y + 3.8, { align: 'right' });
    curX += feeCols[1].width;

    // Col 2: Demand
    doc.text(`Rs. ${row.demand.toLocaleString('en-IN')}`, curX + feeCols[2].width - 2, y + 3.8, { align: 'right' });
    curX += feeCols[2].width;

    // Col 3: Dues
    doc.text(`Rs. ${row.dues.toLocaleString('en-IN')}`, curX + feeCols[3].width - 2, y + 3.8, { align: 'right' });
    curX += feeCols[3].width;

    // Col 4: Recovery %
    doc.text(`${rate}%`, curX + feeCols[4].width - 2, y + 3.8, { align: 'right' });

    y += 5.2;
  });

  // Fee Totals Row
  doc.setFillColor(209, 250, 229); // Emerald-100
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text(`Total (${data.timeframeLabel})`, margin + 2, y + 3.8);
  doc.text(`Rs. ${data.periodCollected.toLocaleString('en-IN')}`, margin + feeCols[0].width + feeCols[1].width - 2, y + 3.8, { align: 'right' });
  doc.text(`Rs. ${data.periodDemand.toLocaleString('en-IN')}`, margin + feeCols[0].width + feeCols[1].width + feeCols[2].width - 2, y + 3.8, { align: 'right' });
  doc.text(`Rs. ${data.periodDues.toLocaleString('en-IN')}`, margin + feeCols[0].width + feeCols[1].width + feeCols[2].width + feeCols[3].width - 2, y + 3.8, { align: 'right' });
  doc.text(`${data.collectionRate}%`, margin + contentWidth - 2, y + 3.8, { align: 'right' });

  y += 9.5;

  // 6. Section 3: Dual Grid (Payment Modes & Classroom Utilization)
  const halfWidth = (contentWidth - 6) / 2; // ~88mm each

  // Left Sub-table: Payment Modes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3A. PAYMENT MODE SHARE', margin, y);

  // Right Sub-table: Classroom Capacity
  doc.text('3B. CLASS CAPACITY UTILIZATION', margin + halfWidth + 6, y);
  y += 3.5;

  // Left header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, halfWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Channel', margin + 2, y + 3.8);
  doc.text('Amount (INR)', margin + halfWidth - 22, y + 3.8, { align: 'right' });
  doc.text('Share %', margin + halfWidth - 2, y + 3.8, { align: 'right' });

  // Right header
  const rx = margin + halfWidth + 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(rx, y, halfWidth, 5.5, 'F');
  doc.text('Grade', rx + 2, y + 3.8);
  doc.text('Enrolled / Cap', rx + halfWidth - 22, y + 3.8, { align: 'right' });
  doc.text('Usage %', rx + halfWidth - 2, y + 3.8, { align: 'right' });

  y += 5.5;

  const totalPaymentModeAmount = data.paymentModeData.reduce((acc, c) => acc + c.value, 0);

  const maxRows = Math.max(data.paymentModeData.length, data.gradeCapacityData.length);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  for (let r = 0; r < maxRows; r++) {
    const rowY = y + r * 4.8;
    if (r % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, halfWidth, 4.8, 'F');
      doc.rect(rx, rowY, halfWidth, 4.8, 'F');
    }

    // Left data
    if (r < data.paymentModeData.length) {
      const pm = data.paymentModeData[r];
      const pct = totalPaymentModeAmount > 0 ? Math.round((pm.value / totalPaymentModeAmount) * 100) : 0;
      doc.setTextColor(15, 23, 42);
      doc.text(pm.name, margin + 2, rowY + 3.4);
      doc.text(`Rs. ${pm.value.toLocaleString('en-IN')}`, margin + halfWidth - 22, rowY + 3.4, { align: 'right' });
      doc.text(`${pct}%`, margin + halfWidth - 2, rowY + 3.4, { align: 'right' });
    }

    // Right data
    if (r < data.gradeCapacityData.length) {
      const gc = data.gradeCapacityData[r];
      const util = gc.capacity > 0 ? Math.round((gc.students / gc.capacity) * 100) : 0;
      doc.setTextColor(15, 23, 42);
      doc.text(gc.grade, rx + 2, rowY + 3.4);
      doc.text(`${gc.students} / ${gc.capacity}`, rx + halfWidth - 22, rowY + 3.4, { align: 'right' });
      doc.text(`${util}%`, rx + halfWidth - 2, rowY + 3.4, { align: 'right' });
    }
  }

  y += maxRows * 4.8 + 6;

  // 7. Footer & Verification Stamp
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Generated by Vidyavahini Comprehensive School ERP System • Confidential Academic & Financial Record', margin, pageHeight - 11);
  doc.text(`Filter Applied: ${data.timeframeLabel} • Timestamp: ${data.timestamp}`, margin, pageHeight - 7.5);
  doc.text('Page 1 of 1', pageWidth - margin, pageHeight - 11, { align: 'right' });

  // Trigger browser download
  const safeSchoolName = data.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${safeSchoolName}_kpi_report_${data.timeframeKey}_${Date.now()}.pdf`;
  doc.save(filename);
}
