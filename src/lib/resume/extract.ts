import "server-only";
import { RESUME_MAX_BYTES } from "@/lib/constants";

export type ResumeFileType = "pdf" | "doc" | "docx";

export class ResumeError extends Error {}

const EXTENSIONS: Record<string, ResumeFileType> = { pdf: "pdf", doc: "doc", docx: "docx" };

const CONTENT_TYPES: Record<ResumeFileType, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Identify the real format from the file's first bytes, not its name, so a
// renamed executable or image is rejected.
function sniff(bytes: Uint8Array): ResumeFileType | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (starts([0x50, 0x4b, 0x03, 0x04])) return "docx"; // ZIP (Office Open XML)
  if (starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "doc"; // OLE2
  return null;
}

// Validates an uploaded resume. Returns its type and content type or throws a
// ResumeError with a message that is safe to show the user.
export function validateResume(file: File, bytes: Uint8Array) {
  if (file.size === 0) throw new ResumeError("The file is empty.");
  if (file.size > RESUME_MAX_BYTES) throw new ResumeError("The file is larger than 5 MB.");

  const ext = EXTENSIONS[file.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!ext) throw new ResumeError("Upload a PDF, DOC or DOCX file.");

  const actual = sniff(bytes);
  if (!actual || actual !== ext) {
    throw new ResumeError("This file doesn't look like a valid PDF, DOC or DOCX document.");
  }
  return { fileType: actual, contentType: CONTENT_TYPES[actual] };
}

// Plain text of the resume, whitespace-normalized.
export async function extractResumeText(bytes: Uint8Array, type: ResumeFileType): Promise<string> {
  let text = "";
  try {
    if (type === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      // pdf.js takes ownership of (detaches) the buffer it is given, so pass a copy.
      const pdf = await getDocumentProxy(bytes.slice());
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
    } else if (type === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = result.value;
    } else {
      const { default: WordExtractor } = await import("word-extractor");
      const doc = await new WordExtractor().extract(Buffer.from(bytes));
      text = doc.getBody();
    }
  } catch {
    throw new ResumeError(
      "We couldn't read this document. It may be damaged or password-protected.",
    );
  }

  text = text
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length < 50) {
    throw new ResumeError(
      "We couldn't find readable text in this file. If it's a scanned image, upload a text-based PDF or DOCX instead.",
    );
  }
  return text.slice(0, 50_000);
}
