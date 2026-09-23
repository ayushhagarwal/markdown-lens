const SAMPLE_PDF_TEXT = ["Sample handbook", "Overview", "Keep decisions documented."];

export function createSamplePdfBytes() {
  const content = [
    "BT",
    "/F1 22 Tf",
    "72 720 Td",
    "(Sample handbook) Tj",
    "/F1 12 Tf",
    "0 -32 Td",
    "(Overview) Tj",
    "0 -20 Td",
    "(Keep decisions documented.) Tj",
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Title (Sample handbook) /Producer (Markdown Lens) >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefAt = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new TextEncoder().encode(body);
}

export function createSamplePdfFile() {
  const bytes = createSamplePdfBytes();
  return new File([Uint8Array.from(bytes)], "sample-handbook.pdf", { type: "application/pdf" });
}

export const samplePdfLines = SAMPLE_PDF_TEXT;
