import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ACM brand colors
const ACM_BLUE = "#0088CC";
const ACM_DARK = "#0A1628";
const ACM_LIGHT_BLUE = "#00A4E4";
const TEXT_DARK = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER_COLOR = "#E5E7EB";
const SUCCESS_GREEN = "#10B981";
const WARNING_AMBER = "#F59E0B";

export interface PdfParticipant {
  rank: number;
  hrRank?: number;
  username: string;
  country?: string | null;
  score: number;
  timeTaken: number;
  problemsSolved: number;
  isFlaggedButAllowed?: boolean;
  flagReason?: string | null;
}

function formatTime(seconds: number): string {
  if (!seconds) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function drawAcmLogo(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  // Diamond background
  doc.setFillColor(0, 164, 228); // #00A4E4
  const d = r * 0.85;
  doc.moveTo(cx, cy - d);
  doc.lineTo(cx + d, cy);
  doc.lineTo(cx, cy + d);
  doc.lineTo(cx - d, cy);
  doc.fill();

  // Inner circle
  doc.setFillColor(0, 136, 204); // #0088CC
  doc.circle(cx, cy, r * 0.55, "F");

  // White ring
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.circle(cx, cy, r * 0.6, "S");

  // ACM text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size * 0.28);
  doc.setTextColor(255, 255, 255);
  doc.text("ACM", cx, cy + size * 0.08, { align: "center" });
}

function drawPageBackground(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // 1. Soft solid base color (light slate/blue tint)
  doc.setFillColor(238, 242, 246);
  doc.rect(0, 0, w, h, "F");

  // 2. Large subtle geometric circles in the bottom left
  doc.setDrawColor(210, 220, 230);
  doc.setFillColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.circle(-20, h + 20, 120, "DF");
  doc.circle(-10, h + 10, 80, "DF");

  // 3. Subtle angled accent top right (behind the header)
  doc.setFillColor(230, 236, 244);
  doc.triangle(w, 0, w - 140, 0, w, 140, "F");
}

export function generateResultsPdf(params: {
  contestName: string;
  contestIcon?: string | null;
  totalProblems: number;
  topX: number;
  cleanParticipants: PdfParticipant[];
  allowedFlagged: PdfParticipant[];
}) {
  const { contestName, totalProblems, topX, cleanParticipants, allowedFlagged } = params;
  
  // Combine clean and allowed participants, sort by original HackerRank rank
  const allParticipants = [...cleanParticipants, ...allowedFlagged].sort((a, b) => {
    // If hrRank is missing, put them at the end
    if (a.hrRank === undefined) return 1;
    if (b.hrRank === undefined) return -1;
    return a.hrRank - b.hrRank;
  });

  // Re-assign sequential rank based on this new merged order
  allParticipants.forEach((p, i) => {
    p.rank = i + 1;
  });

  const generatedDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Intercept addPage to automatically draw the background on all new pages
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalAddPage = doc.addPage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.addPage = function (...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalAddPage.apply(this, args as any);
    drawPageBackground(doc);
    return this;
  };

  // Draw background on the first page
  drawPageBackground(doc);

  // === HEADER SECTION ===

  // Blue header band
  doc.setFillColor(10, 22, 40); // #0A1628 dark navy
  doc.rect(0, 0, pageWidth, 52, "F");

  // Accent line
  doc.setFillColor(0, 164, 228); // #00A4E4
  doc.rect(0, 52, pageWidth, 1.5, "F");

  // ACM Logo
  drawAcmLogo(doc, margin, 8, 36);

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(contestName, margin + 44, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 200, 220);
  doc.text("Official Contest Results", margin + 44, 30);

  doc.setFontSize(9);
  doc.setTextColor(140, 160, 180);
  doc.text(`Generated: ${generatedDate}`, margin + 44, 38);

  // === SUMMARY STATS ===
  let currentY = 62;

  // Stats row
  const stats = [
    { label: "Total Selected", value: String(allParticipants.length) },
    { label: "Top Ranked", value: String(cleanParticipants.length) },
    { label: "Allowed (Flagged)", value: String(allowedFlagged.length) },
    { label: "Problems", value: String(totalProblems) },
  ];

  const statWidth = contentWidth / stats.length;
  stats.forEach((stat, i) => {
    const sx = margin + i * statWidth;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 136, 204);
    doc.text(stat.value, sx + statWidth / 2, currentY + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(stat.label.toUpperCase(), sx + statWidth / 2, currentY + 12, { align: "center" });
  });

  currentY += 22;

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // === MAIN RESULTS TABLE ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(26, 26, 46);
  doc.text(`Top ${topX} Ranked Participants${allowedFlagged.length > 0 ? " (Including Allowed)" : ""}`, margin, currentY + 2);
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Username", "Country", "Score", "Time", "Solved"]],
    body: allParticipants.map((p) => [
      String(p.rank),
      p.isFlaggedButAllowed ? `${p.username} *` : p.username,
      p.country || "-",
      String(p.score),
      formatTime(p.timeTaken),
      `${p.problemsSolved} / ${totalProblems}`,
    ]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: [26, 26, 46],
      lineColor: [210, 215, 225],
      lineWidth: 0.2,
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [240, 245, 250],
      textColor: [60, 70, 90],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 46, fontStyle: "bold" },
      2: { cellWidth: 30 },
      3: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [16, 185, 129] },
      4: { cellWidth: 28, halign: "right", font: "courier" },
      5: { cellWidth: 22, halign: "center" },
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      // Top-3 rank highlight
      if (data.section === "body" && data.column.index === 0) {
        const rank = parseInt(data.cell.text[0]);
        if (rank <= 3) {
          const colors: Record<number, [number, number, number]> = {
            1: [255, 215, 0],   // Gold
            2: [192, 192, 192], // Silver
            3: [205, 127, 50],  // Bronze
          };
          const color = colors[rank];
          if (color) {
            doc.setFillColor(...color);
            doc.circle(data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, 3.5, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.text(String(rank), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: "center" });
          }
        }
      }
    },
  });

  // === ALLOWED FLAGGED PARTICIPANTS (if any) ===
  if (allowedFlagged.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flagY = (doc as any).lastAutoTable.finalY + 12;

    // Check if we need a new page
    if (flagY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      flagY = 20; // reset Y to top margin
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 46);
    doc.text("Allowed Flagged Participants", margin, flagY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(
      "These participants were flagged during review but manually allowed for selection.",
      margin,
      flagY + 6
    );
    flagY += 12;

    autoTable(doc, {
      startY: flagY,
      head: [["Username", "Country", "Score", "Time", "Solved", "Flag Reason"]],
      body: allowedFlagged.map((p) => [
        p.username,
        p.country || "-",
        String(p.score),
        formatTime(p.timeTaken),
        `${p.problemsSolved} / ${totalProblems}`,
        p.flagReason || "-",
      ]),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        textColor: [26, 26, 46],
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
        fillColor: [255, 255, 255],
      },
      headStyles: {
        fillColor: [254, 243, 230], // Warm amber tint
        textColor: [120, 80, 20],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      },
      alternateRowStyles: {
        fillColor: [255, 251, 245],
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 26 },
        2: { cellWidth: 20, halign: "right", fontStyle: "bold", textColor: [245, 158, 11] },
        3: { cellWidth: 26, halign: "right", font: "courier" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 36, fontSize: 7.5, textColor: [107, 114, 128] },
      },
      margin: { left: margin, right: margin },
    });
  }

  // === FOOTER on each page ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();

    // Footer line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageWidth - margin, pageH - 14);

    // Footer text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 160);
    doc.text("ACM Contest Review Dashboard — Official Results", margin, pageH - 9);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageH - 9, { align: "right" });
  }

  // Download
  const safeName = contestName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  doc.save(`${safeName}_results_top${topX}.pdf`);
}
