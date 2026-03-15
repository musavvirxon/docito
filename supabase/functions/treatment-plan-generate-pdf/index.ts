// supabase/functions/treatment-plan-generate-pdf/index.ts
// Path: supabase/functions/treatment-plan-generate-pdf/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import reshaper from "https://esm.sh/arabic-persian-reshaper@1.0.0";
import bidiFactory from "https://esm.sh/bidi-js@1.0.2";

import {
  corsHeaders,
  errorResponse,
  secureHandler,
} from "../_shared/security-middleware.ts";
import type { ValidationSchema } from "../_shared/input-validator.ts";

import { DOCITO_FONT_TTF_BASE64, DOCITO_LOGO_PNG_BASE64, DOCITO_LOGO_FULL_PNG_BASE64 } from "./assets.ts";

type Locale =
  | "en"
  | "ru"
  | "uz"
  | "tr"
  | "ar"
  | "ja"
  | "ko"
  | "zh"
  | "es"
  | "pt"
  | "de";

type ReqBody = {
  treatment_plan_id: string;
  locale?: string;
};

const schema: ValidationSchema<ReqBody> = {
  treatment_plan_id: { type: "uuid", required: true },
  locale: { type: "string", required: false, minLength: 2, maxLength: 16, sanitize: true, trim: true },
};

function b64ToBytes(b64: string): Uint8Array {
  try {
    const bin = atob(b64);
    if (bin.length < 16) throw new Error("base64 payload too small");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}

function safeUrl(url?: string | null): string | null {
  const u = (url || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) return null;
  return u;
}

function initialsFromName(name?: string | null): string {
  const n = (name || "").trim();
  if (!n) return "D";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "D").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b).slice(0, 2) || "D";
}

function isLikelyDentistSpecialty(s?: string | null): boolean {
  const v = (s || "").toLowerCase();
  if (!v) return false;
  const keywords = [
    "dent",
    "dental",
    "odont",
    "stomat",
    "стомат",
    "tish",
    "ortho",
    "orthodont",
    "endodont",
    "periodont",
    "prosthodont",
    "oral surgery",
    "maxillofacial",
  ];
  return keywords.some((k) => v.includes(k));
}

async function fetchImageBytes(url: string, maxBytes = 2_000_000): Promise<{ bytes: Uint8Array; type: "png" | "jpg" | null }> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return { bytes: new Uint8Array(0), type: null };

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const ab = await res.arrayBuffer();
    if (ab.byteLength > maxBytes) return { bytes: new Uint8Array(0), type: null };

    const bytes = new Uint8Array(ab);
    const urlLower = url.toLowerCase();

    const isPng = contentType.includes("png") || urlLower.endsWith(".png");
    const isJpg = contentType.includes("jpeg") || contentType.includes("jpg") || urlLower.endsWith(".jpg") || urlLower.endsWith(".jpeg");

    return { bytes, type: isPng ? "png" : isJpg ? "jpg" : null };
  } catch {
    return { bytes: new Uint8Array(0), type: null };
  }
}

function normalizeLocale(raw?: string | null): Locale {
  const s = (raw || "").toLowerCase().trim();
  if (s === "deutsch") return "de";
  if (s.startsWith("de")) return "de";
  if (s.startsWith("ru")) return "ru";
  if (s.startsWith("uz")) return "uz";
  if (s.startsWith("tr")) return "tr";
  if (s.startsWith("ar")) return "ar";
  if (s.startsWith("ja")) return "ja";
  if (s.startsWith("ko")) return "ko";
  if (s.startsWith("zh")) return "zh";
  if (s.startsWith("es")) return "es";
  if (s.startsWith("pt")) return "pt";
  return "en";
}

const I18N: Record<Locale, Record<string, string>> = {
  en: {
    title: "Treatment Plan",
    planId: "Plan ID",
    createdAt: "Created At",
    updatedAt: "Updated At",
    publishedAt: "Published At",
    completedAt: "Completed At",
    status: "Status",
    totalCost: "Total Cost",
    description: "Description",
    notes: "Notes",
    patient: "Patient",
    doctor: "Provider",
    specialty: "Specialty",
    phone: "Phone",
    email: "Email",
    dob: "Date of Birth",
    gender: "Gender",
    address: "Address",
    procedures: "Procedures",
    procedure: "Procedure",
    tooth: "Tooth/Teeth",
    cost: "Cost",
    procedureStatus: "Status",
    procedureNotes: "Notes",
    medications: "Medications",
    medication: "Medication",
    dosage: "Dosage",
    frequency: "Frequency",
    instructions: "Instructions",
    startDate: "Start Date",
    endDate: "End Date",
    medicationStatus: "Status",
    consentForms: "Consent Forms",
    consentTitle: "Title",
    consentStatus: "Status",
    signedAt: "Signed At",
    consentContent: "Content",
    attachments: "Attachments",
    fileName: "File",
    fileType: "Type",
    filePath: "Path",
    uploadedAt: "Uploaded At",
    fileDescription: "Description",
    dentalChart: "Dental Chart",
    teethInvolved: "Teeth involved",
    verification: "Verification",
    verificationCode: "Verification Code",
    verifyAt: "Verify at",
    generatedBy: "Generated by Docito (docito.app)",
    dentalTitle: "Dental Treatment Plan",
    toothNo: "Tooth No.",
    estimatedVisits: "Est. Visits",
    patientSignature: "Patient Signature",
    providerSignature: "Doctor Signature",
    signatureDate: "Date",
    independentPractitioner: "Independent Dental Practitioner",
    na: "—",
  },
  ru: {
    title: "План лечения",
    planId: "ID плана",
    createdAt: "Дата создания",
    updatedAt: "Дата обновления",
    publishedAt: "Дата публикации",
    completedAt: "Дата завершения",
    status: "Статус",
    totalCost: "Итоговая стоимость",
    description: "Описание",
    notes: "Заметки",
    patient: "Пациент",
    doctor: "Врач/провайдер",
    specialty: "Специальность",
    phone: "Телефон",
    email: "Email",
    dob: "Дата рождения",
    gender: "Пол",
    address: "Адрес",
    procedures: "Процедуры",
    procedure: "Процедура",
    tooth: "Зуб(ы)",
    cost: "Стоимость",
    procedureStatus: "Статус",
    procedureNotes: "Заметки",
    medications: "Назначения",
    medication: "Препарат",
    dosage: "Дозировка",
    frequency: "Частота",
    instructions: "Инструкции",
    startDate: "Начало",
    endDate: "Окончание",
    medicationStatus: "Статус",
    consentForms: "Согласия",
    consentTitle: "Название",
    consentStatus: "Статус",
    signedAt: "Подписано",
    consentContent: "Содержание",
    attachments: "Вложения",
    fileName: "Файл",
    fileType: "Тип",
    filePath: "Путь",
    uploadedAt: "Загружено",
    fileDescription: "Описание",
    dentalChart: "Зубная схема",
    teethInvolved: "Задействованные зубы",
    verification: "Проверка",
    verificationCode: "Код проверки",
    verifyAt: "Проверить на",
    generatedBy: "Сформировано в Docito (docito.app)",
    dentalTitle: "План лечения (стоматология)",
    toothNo: "Зуб №",
    estimatedVisits: "Визитов (оценка)",
    patientSignature: "Подпись пациента",
    providerSignature: "Подпись врача",
    signatureDate: "Дата",
    independentPractitioner: "Частный стоматолог",
    na: "—",
  },
  uz: {
    title: "Davolash rejasi",
    planId: "Reja ID",
    createdAt: "Yaratilgan sana",
    updatedAt: "Yangilangan sana",
    publishedAt: "E’lon qilingan sana",
    completedAt: "Yakunlangan sana",
    status: "Holat",
    totalCost: "Umumiy narx",
    description: "Tavsif",
    notes: "Qaydlar",
    patient: "Bemor",
    doctor: "Shifokor/Provayder",
    specialty: "Mutaxassislik",
    phone: "Telefon",
    email: "Email",
    dob: "Tug‘ilgan sana",
    gender: "Jins",
    address: "Manzil",
    procedures: "Protseduralar",
    procedure: "Protsedura",
    tooth: "Tish(lar)",
    cost: "Narx",
    procedureStatus: "Holat",
    procedureNotes: "Qaydlar",
    medications: "Dori-darmonlar",
    medication: "Dori",
    dosage: "Doza",
    frequency: "Qabul qilish tezligi",
    instructions: "Ko‘rsatmalar",
    startDate: "Boshlanish",
    endDate: "Tugash",
    medicationStatus: "Holat",
    consentForms: "Rozilik shakllari",
    consentTitle: "Sarlavha",
    consentStatus: "Holat",
    signedAt: "Imzolangan sana",
    consentContent: "Mazmuni",
    attachments: "Ilovalar",
    fileName: "Fayl",
    fileType: "Turi",
    filePath: "Yo‘l",
    uploadedAt: "Yuklangan sana",
    fileDescription: "Tavsif",
    dentalChart: "Tish jadvali",
    teethInvolved: "Qamrab olingan tishlar",
    verification: "Tasdiqlash",
    verificationCode: "Tasdiqlash kodi",
    verifyAt: "Tekshirish",
    generatedBy: "Docito orqali yaratildi (docito.app)",
    dentalTitle: "Stomatologik davolash rejasi",
    toothNo: "Tish №",
    estimatedVisits: "Tashriflar (taxm.)",
    patientSignature: "Bemor imzosi",
    providerSignature: "Shifokor imzosi",
    signatureDate: "Sana",
    independentPractitioner: "Mustaqil stomatolog",
    na: "—",
  },
  tr: {
    title: "Tedavi Planı",
    planId: "Plan ID",
    createdAt: "Oluşturulma Tarihi",
    updatedAt: "Güncellenme Tarihi",
    publishedAt: "Yayınlanma Tarihi",
    completedAt: "Tamamlanma Tarihi",
    status: "Durum",
    totalCost: "Toplam Tutar",
    description: "Açıklama",
    notes: "Notlar",
    patient: "Hasta",
    doctor: "Sağlayıcı",
    specialty: "Uzmanlık",
    phone: "Telefon",
    email: "Email",
    dob: "Doğum Tarihi",
    gender: "Cinsiyet",
    address: "Adres",
    procedures: "İşlemler",
    procedure: "İşlem",
    tooth: "Diş(ler)",
    cost: "Tutar",
    procedureStatus: "Durum",
    procedureNotes: "Notlar",
    medications: "İlaçlar",
    medication: "İlaç",
    dosage: "Doz",
    frequency: "Sıklık",
    instructions: "Talimatlar",
    startDate: "Başlangıç",
    endDate: "Bitiş",
    medicationStatus: "Durum",
    consentForms: "Onam Formları",
    consentTitle: "Başlık",
    consentStatus: "Durum",
    signedAt: "İmzalanma",
    consentContent: "İçerik",
    attachments: "Ekler",
    fileName: "Dosya",
    fileType: "Tür",
    filePath: "Yol",
    uploadedAt: "Yüklenme",
    fileDescription: "Açıklama",
    dentalChart: "Diş Şeması",
    teethInvolved: "İlgili dişler",
    verification: "Doğrulama",
    verificationCode: "Doğrulama Kodu",
    verifyAt: "Doğrula",
    generatedBy: "Docito tarafından oluşturuldu (docito.app)",
    na: "—",
  },
  ar: {
    title: "خطة العلاج",
    planId: "معرّف الخطة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "تاريخ التحديث",
    publishedAt: "تاريخ النشر",
    completedAt: "تاريخ الإكمال",
    status: "الحالة",
    totalCost: "التكلفة الإجمالية",
    description: "الوصف",
    notes: "ملاحظات",
    patient: "المريض",
    doctor: "مقدم الرعاية",
    specialty: "التخصص",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    dob: "تاريخ الميلاد",
    gender: "الجنس",
    address: "العنوان",
    procedures: "الإجراءات",
    procedure: "الإجراء",
    tooth: "السن/الأسنان",
    cost: "التكلفة",
    procedureStatus: "الحالة",
    procedureNotes: "ملاحظات",
    medications: "الأدوية",
    medication: "الدواء",
    dosage: "الجرعة",
    frequency: "التكرار",
    instructions: "التعليمات",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    medicationStatus: "الحالة",
    consentForms: "نماذج الموافقة",
    consentTitle: "العنوان",
    consentStatus: "الحالة",
    signedAt: "تاريخ التوقيع",
    consentContent: "المحتوى",
    attachments: "المرفقات",
    fileName: "الملف",
    fileType: "النوع",
    filePath: "المسار",
    uploadedAt: "تاريخ الرفع",
    fileDescription: "الوصف",
    dentalChart: "مخطط الأسنان",
    teethInvolved: "الأسنان المعنية",
    verification: "التحقق",
    verificationCode: "رمز التحقق",
    verifyAt: "تحقق عبر",
    generatedBy: "تم إنشاؤه بواسطة Docito (docito.app)",
    na: "—",
  },
  ja: {
    title: "治療計画",
    planId: "プランID",
    createdAt: "作成日",
    updatedAt: "更新日",
    publishedAt: "公開日",
    completedAt: "完了日",
    status: "ステータス",
    totalCost: "合計金額",
    description: "説明",
    notes: "メモ",
    patient: "患者",
    doctor: "提供者",
    specialty: "専門",
    phone: "電話",
    email: "メール",
    dob: "生年月日",
    gender: "性別",
    address: "住所",
    procedures: "処置",
    procedure: "処置",
    tooth: "歯",
    cost: "費用",
    procedureStatus: "ステータス",
    procedureNotes: "メモ",
    medications: "薬",
    medication: "薬",
    dosage: "用量",
    frequency: "頻度",
    instructions: "指示",
    startDate: "開始日",
    endDate: "終了日",
    medicationStatus: "ステータス",
    consentForms: "同意書",
    consentTitle: "タイトル",
    consentStatus: "ステータス",
    signedAt: "署名日時",
    consentContent: "内容",
    attachments: "添付",
    fileName: "ファイル",
    fileType: "種類",
    filePath: "パス",
    uploadedAt: "アップロード",
    fileDescription: "説明",
    dentalChart: "歯科チャート",
    teethInvolved: "対象歯",
    verification: "検証",
    verificationCode: "検証コード",
    verifyAt: "確認",
    generatedBy: "Docito で生成 (docito.app)",
    na: "—",
  },
  ko: {
    title: "치료 계획",
    planId: "계획 ID",
    createdAt: "생성일",
    updatedAt: "수정일",
    publishedAt: "게시일",
    completedAt: "완료일",
    status: "상태",
    totalCost: "총 비용",
    description: "설명",
    notes: "메모",
    patient: "환자",
    doctor: "제공자",
    specialty: "전문과",
    phone: "전화",
    email: "이메일",
    dob: "생년월일",
    gender: "성별",
    address: "주소",
    procedures: "시술",
    procedure: "시술",
    tooth: "치아",
    cost: "비용",
    procedureStatus: "상태",
    procedureNotes: "메모",
    medications: "약",
    medication: "약",
    dosage: "용량",
    frequency: "빈도",
    instructions: "지침",
    startDate: "시작일",
    endDate: "종료일",
    medicationStatus: "상태",
    consentForms: "동의서",
    consentTitle: "제목",
    consentStatus: "상태",
    signedAt: "서명일",
    consentContent: "내용",
    attachments: "첨부",
    fileName: "파일",
    fileType: "유형",
    filePath: "경로",
    uploadedAt: "업로드",
    fileDescription: "설명",
    dentalChart: "치아 차트",
    teethInvolved: "해당 치아",
    verification: "검증",
    verificationCode: "검증 코드",
    verifyAt: "검증",
    generatedBy: "Docito에서 생성 (docito.app)",
    na: "—",
  },
  zh: {
    title: "治疗计划",
    planId: "计划ID",
    createdAt: "创建时间",
    updatedAt: "更新时间",
    publishedAt: "发布时间",
    completedAt: "完成时间",
    status: "状态",
    totalCost: "总费用",
    description: "描述",
    notes: "备注",
    patient: "患者",
    doctor: "服务提供者",
    specialty: "专科",
    phone: "电话",
    email: "邮箱",
    dob: "出生日期",
    gender: "性别",
    address: "地址",
    procedures: "项目",
    procedure: "项目",
    tooth: "牙位",
    cost: "费用",
    procedureStatus: "状态",
    procedureNotes: "备注",
    medications: "用药",
    medication: "药物",
    dosage: "剂量",
    frequency: "频率",
    instructions: "说明",
    startDate: "开始日期",
    endDate: "结束日期",
    medicationStatus: "状态",
    consentForms: "同意书",
    consentTitle: "标题",
    consentStatus: "状态",
    signedAt: "签署时间",
    consentContent: "内容",
    attachments: "附件",
    fileName: "文件",
    fileType: "类型",
    filePath: "路径",
    uploadedAt: "上传时间",
    fileDescription: "描述",
    dentalChart: "牙科图表",
    teethInvolved: "涉及牙位",
    verification: "验证",
    verificationCode: "验证码",
    verifyAt: "验证于",
    generatedBy: "由 Docito 生成 (docito.app)",
    na: "—",
  },
  es: {
    title: "Plan de tratamiento",
    planId: "ID del plan",
    createdAt: "Creado",
    updatedAt: "Actualizado",
    publishedAt: "Publicado",
    completedAt: "Completado",
    status: "Estado",
    totalCost: "Costo total",
    description: "Descripción",
    notes: "Notas",
    patient: "Paciente",
    doctor: "Proveedor",
    specialty: "Especialidad",
    phone: "Teléfono",
    email: "Email",
    dob: "Fecha de nacimiento",
    gender: "Género",
    address: "Dirección",
    procedures: "Procedimientos",
    procedure: "Procedimiento",
    tooth: "Diente(s)",
    cost: "Costo",
    procedureStatus: "Estado",
    procedureNotes: "Notas",
    medications: "Medicamentos",
    medication: "Medicamento",
    dosage: "Dosis",
    frequency: "Frecuencia",
    instructions: "Instrucciones",
    startDate: "Inicio",
    endDate: "Fin",
    medicationStatus: "Estado",
    consentForms: "Consentimientos",
    consentTitle: "Título",
    consentStatus: "Estado",
    signedAt: "Firmado",
    consentContent: "Contenido",
    attachments: "Adjuntos",
    fileName: "Archivo",
    fileType: "Tipo",
    filePath: "Ruta",
    uploadedAt: "Subido",
    fileDescription: "Descripción",
    dentalChart: "Diagrama dental",
    teethInvolved: "Dientes involucrados",
    verification: "Verificación",
    verificationCode: "Código de verificación",
    verifyAt: "Verificar en",
    generatedBy: "Generado por Docito (docito.app)",
    na: "—",
  },
  pt: {
    title: "Plano de tratamento",
    planId: "ID do plano",
    createdAt: "Criado em",
    updatedAt: "Atualizado em",
    publishedAt: "Publicado em",
    completedAt: "Concluído em",
    status: "Status",
    totalCost: "Custo total",
    description: "Descrição",
    notes: "Observações",
    patient: "Paciente",
    doctor: "Prestador",
    specialty: "Especialidade",
    phone: "Telefone",
    email: "Email",
    dob: "Data de nascimento",
    gender: "Gênero",
    address: "Endereço",
    procedures: "Procedimentos",
    procedure: "Procedimento",
    tooth: "Dente(s)",
    cost: "Custo",
    procedureStatus: "Status",
    procedureNotes: "Observações",
    medications: "Medicamentos",
    medication: "Medicamento",
    dosage: "Dosagem",
    frequency: "Frequência",
    instructions: "Instruções",
    startDate: "Início",
    endDate: "Fim",
    medicationStatus: "Status",
    consentForms: "Consentimentos",
    consentTitle: "Título",
    consentStatus: "Status",
    signedAt: "Assinado em",
    consentContent: "Conteúdo",
    attachments: "Anexos",
    fileName: "Arquivo",
    fileType: "Tipo",
    filePath: "Caminho",
    uploadedAt: "Enviado em",
    fileDescription: "Descrição",
    dentalChart: "Mapa dental",
    teethInvolved: "Dentes envolvidos",
    verification: "Verificação",
    verificationCode: "Código de verificação",
    verifyAt: "Verificar em",
    generatedBy: "Gerado por Docito (docito.app)",
    na: "—",
  },
  de: {
    title: "Behandlungsplan",
    planId: "Plan-ID",
    createdAt: "Erstellt am",
    updatedAt: "Aktualisiert am",
    publishedAt: "Veröffentlicht am",
    completedAt: "Abgeschlossen am",
    status: "Status",
    totalCost: "Gesamtkosten",
    description: "Beschreibung",
    notes: "Notizen",
    patient: "Patient:in",
    doctor: "Anbieter",
    specialty: "Fachgebiet",
    phone: "Telefon",
    email: "E-Mail",
    dob: "Geburtsdatum",
    gender: "Geschlecht",
    address: "Adresse",
    procedures: "Behandlungen",
    procedure: "Behandlung",
    tooth: "Zahn/Zähne",
    cost: "Kosten",
    procedureStatus: "Status",
    procedureNotes: "Notizen",
    medications: "Medikamente",
    medication: "Medikament",
    dosage: "Dosierung",
    frequency: "Häufigkeit",
    instructions: "Anweisungen",
    startDate: "Startdatum",
    endDate: "Enddatum",
    medicationStatus: "Status",
    consentForms: "Einwilligungen",
    consentTitle: "Titel",
    consentStatus: "Status",
    signedAt: "Unterschrieben am",
    consentContent: "Inhalt",
    attachments: "Anhänge",
    fileName: "Datei",
    fileType: "Typ",
    filePath: "Pfad",
    uploadedAt: "Hochgeladen am",
    fileDescription: "Beschreibung",
    dentalChart: "Zahnkarte",
    teethInvolved: "Betroffene Zähne",
    verification: "Verifizierung",
    verificationCode: "Verifizierungscode",
    verifyAt: "Prüfen unter",
    generatedBy: "Erstellt von Docito (docito.app)",
    na: "—",
  },
};

function t(locale: Locale, key: string): string {
  return I18N[locale]?.[key] || I18N.en[key] || key;
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v : String(v);
  const out = s.trim();
  return out ? out : null;
}

function asNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sanitize text for PDF rendering – replace characters that cannot be encoded
 * in WinAnsi (Helvetica fallback) or may cause pdf-lib to throw.
 */
function sanitizeForPdf(s: string): string {
  return String(s || "")
    .replace(/\u2192/g, "->")   // →
    .replace(/\u2190/g, "<-")   // ←
    .replace(/\u2194/g, "<->")  // ↔
    .replace(/\u2013/g, "-")    // en dash
    .replace(/\u2014/g, "--")   // em dash —
    .replace(/\u2018/g, "'")    // left single quote
    .replace(/\u2019/g, "'")    // right single quote
    .replace(/\u201C/g, '"')    // left double quote
    .replace(/\u201D/g, '"')    // right double quote
    .replace(/\u2026/g, "...")  // ellipsis
    .replace(/\u00B7/g, ".")    // middle dot
    .replace(/\u2022/g, "-")    // bullet
    .replace(/\u00A0/g, " ");   // non-breaking space
}

function safeText(v: unknown, fallback = "-"): string {
  const s = asString(v);
  return sanitizeForPdf(s || fallback);
}

function isoDate(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoDateTime(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqNumbers(arr: unknown): number[] {
  if (!Array.isArray(arr)) return [];
  const set = new Set<number>();
  for (const v of arr) {
    const n = Number(v);
    if (Number.isFinite(n)) set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function isRtlLocale(locale: Locale) {
  return locale === "ar";
}

function formatForLocale(locale: Locale, input: string): string {
  const s = sanitizeForPdf(String(input || ""));
  if (!s) return s;

  if (!isRtlLocale(locale)) return s;

  try {
    const reshaped = reshaper.reshape(s);
    const bidi = bidiFactory();
    if (typeof bidi?.getReorderedString === "function") {
      return bidi.getReorderedString(reshaped);
    }
    return reshaped;
  } catch {
    return s;
  }
}

async function getActorLocale(serviceClient: any, userId: string): Promise<Locale> {
  try {
    const { data } = await serviceClient
      .from("profiles")
      .select("language")
      .eq("user_id", userId)
      .maybeSingle();

    const raw = asString((data as any)?.language);
    return normalizeLocale(raw);
  } catch {
    return "en";
  }
}

async function safeSelectAll(serviceClient: any, table: string, build: (q: any) => any): Promise<any[]> {
  try {
    const q = serviceClient.from(table).select("*");
    const { data, error } = await build(q);
    if (error) return [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function canUserAccessTreatmentPlan(context: any, plan: any): Promise<boolean> {
  const userId = context?.userId;
  const roles: string[] = context?.roles || [];
  const providerId = asString(plan?.doctor_id) || asString(plan?.dentist_id);
  const patientId = asString(plan?.patient_id);

  // Admin roles can access
  const adminRoles = new Set([
    "admin",
    "super_admin",
    "clinic_admin",
    "lab_admin",
    "imaging_admin",
    "pharmacy_admin",
    "staff",
  ]);
  if (roles.some((r) => adminRoles.has(r))) return true;

  // Patient can access own
  if (patientId && userId === patientId) return true;

  // Doctor can access own plans
  if (providerId && roles.includes("doctor")) {
    try {
      const { data: docRow } = await context.serviceClient
        .from("doctors")
        .select("id, user_id")
        .eq("id", providerId)
        .maybeSingle();

      const doctorUserId = asString((docRow as any)?.user_id);
      if (doctorUserId && doctorUserId === userId) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Font embedding for multiple locales.
 */
async function embedLocaleFont(pdf: PDFDocument, locale: Locale): Promise<PDFFont> {
  // Use Docito embedded TTF for consistent premium look, but fall back to standard fonts if embed fails.
  try {
    pdf.registerFontkit(fontkit);
    const bytes = b64ToBytes(DOCITO_FONT_TTF_BASE64);
    if (bytes.length > 0) {
      return await pdf.embedFont(bytes, { subset: true });
    }
  } catch {
    // ignore
  }
  return await pdf.embedFont(StandardFonts.Helvetica);
}

type DrawTextOpts = {
  page: PDFPage;
  font: PDFFont;
  x: number;
  y: number;
  size: number;
  maxWidth: number;
  rtl: boolean;
  color: { r: number; g: number; b: number };
};

function drawWrappedText(text: string, opts: DrawTextOpts): { lines: number; yAfter: number } {
  const { page, font, x, y, size, maxWidth, rtl, color } = opts;
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: 0, yAfter: y - 2 };

  const lines: string[] = [];
  let cur: string[] = [];
  let curW = 0;

  const spaceW = font.widthOfTextAtSize(" ", size);

  for (const w of words) {
    const ww = font.widthOfTextAtSize(w, size);
    const nextW = cur.length ? curW + spaceW + ww : ww;
    if (nextW <= maxWidth) {
      cur.push(w);
      curW = nextW;
    } else {
      lines.push(cur.join(" "));
      cur = [w];
      curW = ww;
    }
  }
  if (cur.length) lines.push(cur.join(" "));

  let yy = y;
  for (const line of lines) {
    const drawLine = rtl ? formatForLocale("ar", line) : line;
    const w = font.widthOfTextAtSize(drawLine, size);
    page.drawText(drawLine, {
      x: rtl ? (x + maxWidth - w) : x,
      y: yy,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
    yy -= size + 3;
  }

  return { lines: lines.length, yAfter: yy + 2 };
}

// --- Dental chart helpers (kept from existing implementation) ---

function normalizeToothNumberToFdi(n: number): number | null {
  // Accept FDI already
  if (n >= 11 && n <= 48) return n;

  // Accept Universal (1..32) -> FDI mapping (approx)
  const universalToFdi: Record<number, number> = {
    1: 18, 2: 17, 3: 16, 4: 15, 5: 14, 6: 13, 7: 12, 8: 11,
    9: 21, 10: 22, 11: 23, 12: 24, 13: 25, 14: 26, 15: 27, 16: 28,
    17: 38, 18: 37, 19: 36, 20: 35, 21: 34, 22: 33, 23: 32, 24: 31,
    25: 41, 26: 42, 27: 43, 28: 44, 29: 45, 30: 46, 31: 47, 32: 48,
  };
  if (universalToFdi[n]) return universalToFdi[n];

  return null;
}

function drawDentalChart(params: {
  page: PDFPage;
  font: PDFFont;
  locale: Locale;
  x: number;
  yTop: number;
  width: number;
  height: number;
  highlightedFdi: Set<number>;
}) {
  const { page, font, locale, x, yTop, width, height, highlightedFdi } = params;

  const border = rgb(0.88, 0.88, 0.88);
  const fill = rgb(0.98, 0.98, 0.99);
  const accent = rgb(0.16, 0.47, 0.82);
  const muted = rgb(0.35, 0.35, 0.35);

  page.drawRectangle({
    x,
    y: yTop - height,
    width,
    height,
    color: fill,
    borderColor: border,
    borderWidth: 1,
  });

  const title = formatForLocale(locale, t(locale, "teethInvolved"));
  const titleSize = 10;
  page.drawText(title, {
    x: x + 10,
    y: yTop - 18,
    size: titleSize,
    font,
    color: muted,
  });

  // Simplified chart layout: two rows of 8 teeth for upper, two rows for lower
  const teethUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const teethLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const cellW = (width - 20) / 16;
  const cellH = 24;

  const drawRow = (teeth: number[], rowY: number) => {
    for (let i = 0; i < teeth.length; i++) {
      const fdi = teeth[i];
      const cx = x + 10 + i * cellW;
      const cy = rowY;

      const isHi = highlightedFdi.has(fdi);

      page.drawRectangle({
        x: cx + 1,
        y: cy,
        width: cellW - 2,
        height: cellH,
        color: isHi ? rgb(0.93, 0.96, 1.0) : rgb(1, 1, 1),
        borderColor: isHi ? accent : border,
        borderWidth: 1,
      });

      const label = String(fdi);
      const size = 8;
      const w = font.widthOfTextAtSize(label, size);
      page.drawText(label, {
        x: cx + (cellW - w) / 2,
        y: cy + 8,
        size,
        font,
        color: isHi ? accent : muted,
      });
    }
  };

  const upperY = yTop - 54;
  const lowerY = yTop - 54 - (cellH + 16);

  drawRow(teethUpper, upperY);
  drawRow(teethLower, lowerY);
}

async function generateTreatmentPlanPdf(params: {
  locale: Locale;
  isDentist: boolean;
  practiceLogoUrl?: string | null;
  doctorLogoUrl?: string | null;
  planId: string;
  title: string;
  status: string;
  totalCost: string;
  description?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  completedAt?: string | null;

  patientName: string;
  patientDob?: string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientAddress?: string | null;
  patientIdNumber?: string | null;

  doctorName: string;
  doctorSpecialty?: string | null;
  doctorPhone?: string | null;
  doctorEmail?: string | null;

  practiceName?: string | null;
  practiceAddress?: string | null;
  practicePhone?: string | null;

  procedures: Array<{
    name: string;
    status: string | null;
    cost: string | null;
    toothNumbers: number[];
    notes: string | null;
  }>;

  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    instructions: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
  }>;

  consentForms: Array<{
    title: string;
    status: string | null;
    signedAt: string | null;
    content: string | null;
  }>;

  attachments: Array<{
    fileName: string | null;
    fileType: string | null;
    filePath: string | null;
    uploadedAt: string | null;
    description: string | null;
  }>;

  verificationCode: string;
  verifyUrl: string;
}) {
  const W = 595.28;
  const H = 841.89;
  const margin = 44;

  const pdf = await PDFDocument.create();
  const font = await embedLocaleFont(pdf, params.locale);

  // Embed Docito icon (stamp) — used in footer (smaller 12px for quality)
  const logoBytes = b64ToBytes(DOCITO_LOGO_PNG_BASE64);
  let docitoLogo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  let docitoLogoW = 12;
  let docitoLogoH = 12;
  if (logoBytes.length > 0) {
    try {
      docitoLogo = await pdf.embedPng(logoBytes);
      docitoLogoH = (docitoLogo.height / docitoLogo.width) * docitoLogoW;
    } catch {
      docitoLogo = null;
    }
  }

  // Embed Docito full horizontal logo — used in the blue header bar
  const fullLogoBytes = b64ToBytes(DOCITO_LOGO_FULL_PNG_BASE64);
  let docitoFullLogo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  let docitoFullLogoW = 0;
  let docitoFullLogoH = 0;
  if (fullLogoBytes.length > 0) {
    try {
      docitoFullLogo = await pdf.embedPng(fullLogoBytes);
      // scale to fit header (target height 12px — smaller but higher quality)
      docitoFullLogoH = 12;
      docitoFullLogoW = (docitoFullLogo.width / docitoFullLogo.height) * docitoFullLogoH;
    } catch {
      docitoFullLogo = null;
    }
  }

  // Optional entity logo (doctor logo for independent, practice logo for clinic).
  let entityLogo: any | null = null;
  let entityLogoW = 40;
  let entityLogoH = 40;

  const entityLogoUrl = safeUrl(params.practiceLogoUrl || params.doctorLogoUrl || null);
  if (entityLogoUrl) {
    const img = await fetchImageBytes(entityLogoUrl);
    if (img.type === "png" && img.bytes.length) {
      try {
        entityLogo = await pdf.embedPng(img.bytes);
      } catch {
        entityLogo = null;
      }
    } else if (img.type === "jpg" && img.bytes.length) {
      try {
        entityLogo = await pdf.embedJpg(img.bytes);
      } catch {
        entityLogo = null;
      }
    }
    if (entityLogo) {
      const ratio = entityLogo.height / entityLogo.width;
      entityLogoH = entityLogoW * ratio;
      if (entityLogoH > 44) {
        entityLogoH = 44;
        entityLogoW = entityLogoH / ratio;
      }
    }
  }

  const rtl = isRtlLocale(params.locale);

  // Brand colors
  const accentColor = rgb(0.16, 0.47, 0.82); // Professional blue
  const accentLight = rgb(0.93, 0.96, 1.0);
  const sectionBg = rgb(0.95, 0.97, 1.0);
  const textDark = rgb(0.05, 0.05, 0.05);
  const textMuted = rgb(0.35, 0.35, 0.35);
  const borderLight = rgb(0.88, 0.88, 0.88);
  const rowAlt = rgb(0.97, 0.97, 0.98);

  const bottomReserve = 220;

  let page = pdf.addPage([W, H]);
  let y = H - margin;

  // ─── header() ────────────────────────────────────────────────────────────
  // Entity logo (doctor/clinic) on the left, practice name + doc type on the right.
  const HEADER_H = 52; // increased to prevent text overlapping
  const header = () => {
    y = H - margin;

    // ── Blue background bar (full width) ──────────────────────────────────
    page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: accentColor });

    // ── Left side: Entity logo (doctor/clinic) or fallback initials ───────
    const logoLeftX = margin;
    const logoAreaH = HEADER_H - 12;
    if (entityLogo) {
      // Scale entity logo to fit header
      let elW = entityLogoW;
      let elH = entityLogoH;
      if (elH > logoAreaH) {
        elH = logoAreaH;
        elW = elH / (entityLogo.height / entityLogo.width);
      }
      const logoTopY = H - HEADER_H + (HEADER_H - elH) / 2;
      page.drawImage(entityLogo, {
        x: logoLeftX,
        y: logoTopY,
        width: elW,
        height: elH,
      });
    } else {
      // Fallback: show practice/doctor name text on the left
      const leftLabel = params.practiceName || params.doctorName || "—";
      const leftSize = 12;
      const leftText = formatForLocale(params.locale, leftLabel);
      page.drawText(leftText.slice(0, 30), {
        x: logoLeftX,
        y: H - HEADER_H + (HEADER_H + leftSize) / 2 - 3,
        size: leftSize,
        font,
        color: rgb(1, 1, 1),
      });
    }

    // ── Right side (white text): practice name + document type ────────────
    const practiceLabel = params.practiceName || t(params.locale, "independentPractitioner");
    const docTitle = params.isDentist ? t(params.locale, "dentalTitle") : t(params.locale, "title");

    const pNameSize = 11;
    const pNameText = formatForLocale(params.locale, practiceLabel).slice(0, 40);
    const pNameW = font.widthOfTextAtSize(pNameText, pNameSize);
    page.drawText(pNameText, {
      x: W - margin - pNameW,
      y: H - HEADER_H + HEADER_H - 16,
      size: pNameSize,
      font,
      color: rgb(1, 1, 1),
    });

    const docTitleSize = 9;
    const docTitleText = formatForLocale(params.locale, docTitle);
    const docTitleW = font.widthOfTextAtSize(docTitleText, docTitleSize);
    page.drawText(docTitleText, {
      x: W - margin - docTitleW,
      y: H - HEADER_H + HEADER_H - 30,
      size: docTitleSize,
      font,
      color: rgb(0.85, 0.90, 1.0),
    });

    const metaSize = 8;
    const createdLine = params.createdAt ? `${t(params.locale, "createdAt")}: ${params.createdAt}` : "";
    if (createdLine) {
      const createdText = formatForLocale(params.locale, createdLine);
      const createdW = font.widthOfTextAtSize(createdText, metaSize);
      page.drawText(createdText, {
        x: W - margin - createdW,
        y: H - HEADER_H + 8,
        size: metaSize,
        font,
        color: rgb(0.75, 0.82, 0.97),
      });
    }

    // ── Thin white divider below header (optional accent) ─────────────────
    page.drawRectangle({ x: 0, y: H - HEADER_H - 2, width: W, height: 2, color: accentLight });

    // ── Plan title (below header) ─────────────────────────────────────────
    y = H - HEADER_H - 22;

    const titleText = formatForLocale(params.locale, params.title || t(params.locale, "title"));
    const titleSize = 18;
    const titleW = font.widthOfTextAtSize(titleText, titleSize);
    page.drawText(titleText, {
      x: rtl ? (W - margin - titleW) : margin,
      y,
      size: titleSize,
      font,
      color: accentColor,
    });
    y -= 16;

    // Doctor + practice subtitle line
    let generatedLine = "";
    if (params.doctorName && params.doctorName !== "—") {
      generatedLine = params.doctorName;
      if (params.doctorSpecialty) generatedLine += ` · ${params.doctorSpecialty}`;
      if (params.practiceName) generatedLine += ` — ${params.practiceName}`;
    }
    if (generatedLine) {
      const genText = formatForLocale(params.locale, generatedLine);
      const genSize = 9;
      const genW = font.widthOfTextAtSize(genText, genSize);
      page.drawText(genText, {
        x: rtl ? (W - margin - genW) : margin,
        y,
        size: genSize,
        font,
        color: textMuted,
      });
      y -= 14;
    }

    // ── Accent divider line under the title block ─────────────────────────
    y -= 4;
    page.drawRectangle({ x: margin, y, width: W - margin * 2, height: 2, color: accentColor });
    y -= 14;
  };

  const newPage = () => {
    page = pdf.addPage([W, H]);
    header();
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < (margin + bottomReserve)) newPage();
  };

  header();

  const colLabelX = margin;
  const colValueX = margin + 160;
  const maxValueW = W - margin - colValueX;

  const labelSize = 10;
  const valueSize = 10;
  const lineGap = 14;

  const drawKV = (labelKey: string, rawValue: string | null | undefined) => {
    ensureSpace(2 * lineGap);

    const label = formatForLocale(params.locale, t(params.locale, labelKey));
    const value = formatForLocale(params.locale, safeText(rawValue, t(params.locale, "na")));

    const labelW = font.widthOfTextAtSize(label, labelSize);
    const labelX = rtl ? (colValueX + maxValueW - labelW) : colLabelX;

    page.drawText(label, { x: labelX, y, size: labelSize, font, color: textMuted });

    const res = drawWrappedText(value, {
      page,
      font,
      x: colValueX,
      y,
      size: valueSize,
      maxWidth: maxValueW,
      rtl,
      color: { r: 0.05, g: 0.05, b: 0.05 },
    });

    y = res.yAfter;
  };

  const drawSection = (titleKey: string) => {
    ensureSpace(32);
    y -= 6;

    const sectionTitle = formatForLocale(params.locale, t(params.locale, titleKey));
    const sectionSize = 12;
    const sectionW = font.widthOfTextAtSize(sectionTitle, sectionSize);

    // Blue bold section title — patient-PDF style
    page.drawText(sectionTitle, {
      x: rtl ? (W - margin - sectionW) : margin,
      y,
      size: sectionSize,
      font,
      color: accentColor,
    });

    // Gray underline beneath the title
    page.drawLine({
      start: { x: margin, y: y - 3 },
      end: { x: W - margin, y: y - 3 },
      thickness: 0.8,
      color: borderLight,
    });

    y -= (sectionSize + 10);
  };

  // Plan header fields
  drawKV("planId", params.planId);
  drawKV("status", params.status);
  drawKV("totalCost", params.totalCost);
  if (params.description) drawKV("description", params.description);
  if (params.notes) drawKV("notes", params.notes);
  if (params.createdAt) drawKV("createdAt", params.createdAt);
  if (params.updatedAt) drawKV("updatedAt", params.updatedAt);
  if (params.publishedAt) drawKV("publishedAt", params.publishedAt);
  if (params.completedAt) drawKV("completedAt", params.completedAt);

  // Dental chart removed — tooth numbers are shown inline in the procedures table

  // Patient section
  y -= 6;
  drawSection("patient");
  drawKV("patient", params.patientName);
  if (params.patientDob) drawKV("dob", params.patientDob);
  if (params.patientGender) drawKV("gender", params.patientGender);
  if (params.patientPhone) drawKV("phone", params.patientPhone);
  if (params.patientEmail) drawKV("email", params.patientEmail);
  if (params.patientAddress) drawKV("address", params.patientAddress);

  // Doctor section
  y -= 6;
  drawSection("doctor");
  drawKV("doctor", params.doctorName);
  if (params.doctorSpecialty) drawKV("specialty", params.doctorSpecialty);
  if (params.doctorPhone) drawKV("phone", params.doctorPhone);
  if (params.doctorEmail) drawKV("email", params.doctorEmail);
  if (params.practiceName) {
    const practiceLabel = params.practiceName + (params.practicePhone ? ` · ${params.practicePhone}` : "");
    drawKV("notes", practiceLabel);
  }

  // Procedures table
  y -= 6;
  drawSection("procedures");
  if (!params.procedures.length) {
    drawKV("procedures", t(params.locale, "na"));
  } else {
    const showTeeth = !!params.isDentist;

    const tableX = margin;

    const totalW = W - margin * 2;

    // Columns (premium + scan-friendly)
    // - If dentist: Tooth No. FIRST, then Procedure
    // - If not dentist: omit tooth column entirely
    const headers = showTeeth
      ? ["toothNo", "procedure", "estimatedVisits", "cost", "procedureNotes"]
      : ["procedure", "estimatedVisits", "cost", "procedureNotes"];

    const colWidths = showTeeth
      ? [72, 230, 80, 70, totalW - (72 + 230 + 80 + 70)]
      : [250, 90, 80, totalW - (250 + 90 + 80)];

    ensureSpace(34);

    // Header row background
    page.drawRectangle({
      x: tableX,
      y: y - 6,
      width: totalW,
      height: 18,
      color: accentLight,
    });

    // Header texts
    let hx = tableX + 8;
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      const label = key === "toothNo"
        ? t(params.locale, "toothNo")
        : key === "estimatedVisits"
          ? t(params.locale, "estimatedVisits")
          : t(params.locale, key);

      const hText = formatForLocale(params.locale, label);
      page.drawText(hText, { x: hx, y, size: 8.5, font, color: accentColor });
      hx += colWidths[i];
    }
    y -= 22;

    const visitsLabelFromName = (name: string) => {
      const v = (name || "").toLowerCase();
      if (v.includes("multi") || v.includes("2+") || v.includes("several")) return "2+";
      return "1";
    };

    for (let idx = 0; idx < params.procedures.length; idx++) {
      const p = params.procedures[idx];
      ensureSpace(24);

      // Alternating row background
      if (idx % 2 === 1) {
        page.drawRectangle({
          x: tableX,
          y: y - 6,
          width: totalW,
          height: 18,
          color: rowAlt,
        });
      }

      const teeth = showTeeth
        ? (p.toothNumbers || [])
          .map((n) => normalizeToothNumberToFdi(n) ?? n)
          .filter((n) => n != null) as number[]
        : [];

      const teethStr = showTeeth ? (teeth.length ? teeth.join(", ") : "—") : "";
      const procStr = `${idx + 1}. ${safeText(p.name, "—")}`;
      const visitsStr = visitsLabelFromName(procStr);
      const costStr = safeText(p.cost, "—");
      const notesStr = safeText(p.notes, "");

      const rowData = showTeeth
        ? [teethStr, procStr, visitsStr, costStr, notesStr]
        : [procStr, visitsStr, costStr, notesStr];

      let rx = tableX + 8;
      const rowSize = 8.5;

      for (let ci = 0; ci < rowData.length; ci++) {
        const raw = rowData[ci] ?? "";
        // Allow longer text for notes column (last column)
        const maxLen = ci === rowData.length - 1 ? 200 : 90;
        const txt = formatForLocale(params.locale, String(raw)).slice(0, maxLen);

        // Tooth cell highlight (premium scan anchor)
        if (showTeeth && ci === 0) {
          const cellW = colWidths[0] - 10;
          page.drawRectangle({
            x: rx - 4,
            y: y - 5,
            width: Math.max(40, cellW),
            height: 16,
            color: sectionBg,
          });
          page.drawText(txt, { x: rx, y, size: rowSize, font, color: accentColor });
        } else if (ci === rowData.length - 1 && txt.length > 40) {
          // Wrap notes text
          const res = drawWrappedText(txt, {
            page, font, x: rx, y, size: 7.5, maxWidth: colWidths[ci] - 8,
            rtl, color: { r: 0.35, g: 0.35, b: 0.35 },
          });
          // If wrapped text extends below, adjust y
          if (res.yAfter < y - 18) y = res.yAfter + 16;
        } else {
          page.drawText(txt, { x: rx, y, size: rowSize, font, color: textDark });
        }

        rx += colWidths[ci];
      }

      y -= 18;
    }

    // Table bottom border
    page.drawLine({
      start: { x: margin, y: y + 10 },
      end: { x: W - margin, y: y + 10 },
      thickness: 0.8,
      color: borderLight,
    });
    y -= 6;
  }

  // Medications table
  y -= 6;
  drawSection("medications");
  if (!params.medications.length) {
    drawKV("medications", t(params.locale, "na"));
  } else {
    const tableX = margin;
    const medColWidths = [140, 80, 80, 80, W - margin * 2 - 140 - 80 - 80 - 80];
    const medHeaders = ["medication", "dosage", "frequency", "medicationStatus", "instructions"];

    ensureSpace(30);

    page.drawRectangle({
      x: tableX,
      y: y - 4,
      width: W - margin * 2,
      height: 16,
      color: accentLight,
    });

    let hx = tableX + 4;
    for (let hi = 0; hi < medHeaders.length; hi++) {
      const hText = formatForLocale(params.locale, t(params.locale, medHeaders[hi]));
      page.drawText(hText, { x: hx, y, size: 8, font, color: accentColor });
      hx += medColWidths[hi];
    }
    y -= 18;

    for (let i = 0; i < params.medications.length; i++) {
      const m = params.medications[i];
      ensureSpace(20);

      if (i % 2 === 1) {
        page.drawRectangle({
          x: tableX,
          y: y - 4,
          width: W - margin * 2,
          height: 16,
          color: rowAlt,
        });
      }

      const rowData = [
        `${i + 1}. ${m.name}`,
        m.dosage,
        m.frequency,
        safeText(m.status, "—"),
        safeText(m.instructions, ""),
      ];

      let rx = tableX + 4;
      for (let ci = 0; ci < rowData.length; ci++) {
        const txt = formatForLocale(params.locale, rowData[ci]).slice(0, 50);
        page.drawText(txt, { x: rx, y, size: 8, font, color: textDark });
        rx += medColWidths[ci];
      }
      y -= 16;

      // Date range below if present
      if (m.startDate || m.endDate) {
        ensureSpace(14);
        const dateStr = `${m.startDate || "?"} -> ${m.endDate || "?"}`;
        page.drawText(dateStr, { x: tableX + 8, y, size: 7, font, color: textMuted });
        y -= 12;
      }
    }

    page.drawLine({
      start: { x: margin, y: y + 8 },
      end: { x: W - margin, y: y + 8 },
      thickness: 0.8,
      color: borderLight,
    });
    y -= 6;
  }

  // Consent Forms
  y -= 6;
  drawSection("consentForms");
  if (!params.consentForms.length) {
    drawKV("consentForms", t(params.locale, "na"));
  } else {
    for (let i = 0; i < params.consentForms.length; i++) {
      const c = params.consentForms[i];
      ensureSpace(90);

      const head = formatForLocale(params.locale, `${i + 1}. ${c.title}`);
      const headSize = 11;
      const headW = font.widthOfTextAtSize(head, headSize);

      page.drawText(head, { x: rtl ? (W - margin - headW) : margin, y, size: headSize, font, color: textDark });
      y -= 14;

      if (c.status) drawKV("consentStatus", c.status);
      if (c.signedAt) drawKV("signedAt", c.signedAt);
      if (c.content) drawKV("consentContent", c.content);

      y -= 6;
      page.drawLine({
        start: { x: margin, y },
        end: { x: W - margin, y },
        thickness: 0.8,
        color: borderLight,
      });
      y -= 12;
    }
  }

  // Attachments
  y -= 6;
  drawSection("attachments");
  if (!params.attachments.length) {
    drawKV("attachments", t(params.locale, "na"));
  } else {
    for (let i = 0; i < params.attachments.length; i++) {
      const a = params.attachments[i];
      ensureSpace(80);

      const head = formatForLocale(params.locale, `${i + 1}. ${safeText(a.fileName, t(params.locale, "na"))}`);
      const headSize = 11;
      const headW = font.widthOfTextAtSize(head, headSize);

      page.drawText(head, { x: rtl ? (W - margin - headW) : margin, y, size: headSize, font, color: textDark });
      y -= 14;

      if (a.fileType) drawKV("fileType", a.fileType);
      if (a.filePath) drawKV("filePath", a.filePath);
      if (a.uploadedAt) drawKV("uploadedAt", a.uploadedAt);
      if (a.description) drawKV("fileDescription", a.description);

      y -= 6;
      page.drawLine({
        start: { x: margin, y },
        end: { x: W - margin, y },
        thickness: 0.8,
        color: borderLight,
      });
      y -= 12;
    }
  }

  // Footer on last page — ensure enough space for signature + verification + QR
  const footerBlockH = 200;
  if (y < margin + footerBlockH + 20) newPage();

  // ── Signature section (print-ready) ─────────────────────────────────────
  const sigGap = 24;
  const sigW = (W - margin * 2 - sigGap) / 2;
  // Position signatures well above verification block
  let sigY = y - 10;

  const patientSigLabel = formatForLocale(params.locale, t(params.locale, "patientSignature"));
  const providerSigLabel = formatForLocale(params.locale, t(params.locale, "providerSignature"));
  const dateLabel = formatForLocale(params.locale, t(params.locale, "signatureDate"));

  // Patient signature box (left)
  page.drawLine({
    start: { x: margin, y: sigY },
    end: { x: margin + sigW, y: sigY },
    thickness: 0.8,
    color: borderLight,
  });
  page.drawText(patientSigLabel, { x: margin, y: sigY - 12, size: 8.5, font, color: textMuted });
  page.drawText(`${dateLabel}: ____________`, { x: margin, y: sigY - 24, size: 8, font, color: textMuted });

  // Provider signature box (right)
  const sx2 = margin + sigW + sigGap;
  page.drawLine({
    start: { x: sx2, y: sigY },
    end: { x: sx2 + sigW, y: sigY },
    thickness: 0.8,
    color: borderLight,
  });
  page.drawText(providerSigLabel, { x: sx2, y: sigY - 12, size: 8.5, font, color: textMuted });
  page.drawText(`${dateLabel}: ____________`, { x: sx2, y: sigY - 24, size: 8, font, color: textMuted });

  // ── Verification section ────────────────────────────────────────────────
  const verSectionY = sigY - 50;

  page.drawLine({
    start: { x: margin, y: verSectionY },
    end: { x: W - margin, y: verSectionY },
    thickness: 0.8,
    color: borderLight,
  });

  const verificationLabel = formatForLocale(params.locale, t(params.locale, "verification") + ":");
  const verificationLabelSize = 9;
  page.drawText(verificationLabel, {
    x: margin,
    y: verSectionY - 14,
    size: verificationLabelSize,
    font,
    color: textMuted,
  });

  const vCodeLine = formatForLocale(params.locale, `${t(params.locale, "verificationCode")}: ${params.verificationCode}`);
  const vUrlLine = formatForLocale(params.locale, `${t(params.locale, "verifyAt")}: ${params.verifyUrl}`);
  const vSize = 8;

  page.drawText(vCodeLine, {
    x: margin,
    y: verSectionY - 28,
    size: vSize,
    font,
    color: textDark,
  });

  page.drawText(vUrlLine, {
    x: margin,
    y: verSectionY - 40,
    size: vSize,
    font,
    color: textDark,
  });

  // QR code (right-aligned next to verification text)
  try {
    const dataUrl = await QRCode.toDataURL(params.verifyUrl, { margin: 1, width: 140 });
    const b64 = dataUrl.split(",")[1] || "";
    if (b64) {
      const qrBytes = b64ToBytes(b64);
      const qr = await pdf.embedPng(qrBytes);
      const qrW = 70;
      const qrH = 70;

      page.drawImage(qr, {
        x: W - margin - qrW,
        y: verSectionY - qrH + 10,
        width: qrW,
        height: qrH,
      });
    }
  } catch {
    // ignore QR failures
  }

  // ── Confidential + Docito branding (bottom) ─────────────────────────────
  const brandY = verSectionY - 56;

  // Docito icon stamp
  if (docitoLogo) {
    page.drawImage(docitoLogo, {
      x: margin,
      y: brandY - 2,
      width: docitoLogoW,
      height: docitoLogoH,
    });
  }

  const confLabel = formatForLocale(params.locale, `Confidential -- ${params.practiceName || t(params.locale, "generatedBy")}`);
  page.drawText(confLabel, {
    x: docitoLogo ? margin + docitoLogoW + 4 : margin,
    y: brandY + 2,
    size: 7.5,
    font,
    color: textMuted,
  });

  const genText = formatForLocale(params.locale, t(params.locale, "generatedBy"));
  page.drawText(genText, {
    x: docitoLogo ? margin + docitoLogoW + 4 : margin,
    y: brandY - 8,
    size: 7,
    font,
    color: textMuted,
  });

  // ── Page numbers on every page (patient-PDF style) ────────────────────────
  const pageCount = pdf.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pg = pdf.getPage(i);
    const pageNum = i + 1;
    const pageLabel = `Page ${pageNum} of ${pageCount}`;
    const pageLabelSize = 8;
    const pageLabelW = font.widthOfTextAtSize(pageLabel, pageLabelSize);
    pg.drawText(pageLabel, {
      x: W - margin - pageLabelW,
      y: margin + 8,
      size: pageLabelSize,
      font,
      color: textMuted,
    });
  }

  const bytes = await pdf.save();
  return bytes;
}

serve(async (req: Request) => {
  const sec = await secureHandler(req, "treatment-plan-generate-pdf", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
    rateLimit: "STANDARD",
    validationSchema: schema,
    logRequests: false,
  });

  if (sec.response) return sec.response;

  const context = sec.context!;
  const body = sec.validatedBody as ReqBody;

  const { serviceClient, userId } = context;

  if (!userId) return errorResponse("Unauthorized", 401);

  // Locale: request overrides, otherwise use profile language
  const locale = body.locale ? normalizeLocale(body.locale) : await getActorLocale(serviceClient, userId);

  // Fetch treatment plan
  const { data: plan, error: planError } = await serviceClient
    .from("treatment_plans")
    .select("*")
    .eq("id", body.treatment_plan_id)
    .maybeSingle();

  if (planError || !plan) {
    return errorResponse("Treatment plan not found", 404);
  }

  // Access control (service role bypasses RLS, so enforce)
  const ok = await canUserAccessTreatmentPlan(context, plan);
  if (!ok) return errorResponse("Forbidden", 403);

  const planId = asString((plan as any)?.id) || body.treatment_plan_id;
  const patientId = asString((plan as any)?.patient_id);
  const providerId = asString((plan as any)?.doctor_id) || asString((plan as any)?.dentist_id);

  // Patient profile
  const { data: patientProfile } = patientId
    ? await serviceClient
      .from("profiles")
      .select("full_name, phone, email, date_of_birth, gender, address")
      .eq("user_id", patientId)
      .maybeSingle()
    : { data: null };

  // Doctor/dentist + profile
  let doctorName = "—";
  let doctorSpecialty: string | null = null;
  let doctorPhone: string | null = null;
  let doctorEmail: string | null = null;
  let practiceName: string | null = null;
  let practiceAddress: string | null = null;
  let practicePhone: string | null = null;
  let practiceEmail: string | null = null;
  let practiceLogoUrl: string | null = null;

  if (providerId) {
    const { data: doctorRow } = await serviceClient
      .from("doctors")
      .select("id, user_id, specialty, specialty_en, specialty_ru, specialty_uz, specialty_ar, practice_id")
      .eq("id", providerId)
      .maybeSingle();

    const doctorUserId = asString((doctorRow as any)?.user_id);
    const practiceId = asString((doctorRow as any)?.practice_id);
    const specKey = locale === "ru"
      ? "specialty_ru"
      : locale === "uz"
        ? "specialty_uz"
        : locale === "ar"
          ? "specialty_ar"
          : "specialty_en";

    doctorSpecialty = asString((doctorRow as any)?.[specKey]) || asString((doctorRow as any)?.specialty) || null;

    if (doctorUserId) {
      const { data: doctorProfile } = await serviceClient
        .from("profiles")
        .select("full_name, phone, email")
        .eq("user_id", doctorUserId)
        .maybeSingle();

      doctorName = safeText((doctorProfile as any)?.full_name, "—");
      doctorPhone = asString((doctorProfile as any)?.phone);
      doctorEmail = asString((doctorProfile as any)?.email);
    }

    // Fetch practice info
    if (practiceId) {
      const { data: practiceRow } = await serviceClient
        .from("practices")
        .select("name, address, phone, email, logo_url")
        .eq("id", practiceId)
        .maybeSingle();

      practiceName = asString((practiceRow as any)?.name);
      practiceAddress = asString((practiceRow as any)?.address);
      practicePhone = asString((practiceRow as any)?.phone);
      practiceEmail = asString((practiceRow as any)?.email);
      practiceLogoUrl = asString((practiceRow as any)?.logo_url);
    }
  }

  // Determine if the provider is a dentist (controls whether tooth numbers are shown)
  let doctorIsDentist = isLikelyDentistSpecialty(doctorSpecialty);
  const patientName = safeText((patientProfile as any)?.full_name, "—");
  const patientDob = isoDate((patientProfile as any)?.date_of_birth);
  const patientGender = asString((patientProfile as any)?.gender);
  const patientPhone = asString((patientProfile as any)?.phone);
  const patientEmail = asString((patientProfile as any)?.email);
  const patientAddress = asString((patientProfile as any)?.address);

  // Procedures
  let proceduresRaw: any[] = [];
  try {
    const q = serviceClient
      .from("treatment_plan_procedures")
      .select("*, procedures:procedure_id(*)")
      .eq("treatment_plan_id", planId);

    // Some schemas have sequence_order; fallback safely if ordering fails
    const { data: ordered, error: orderErr } = await q.order("sequence_order", { ascending: true });
    if (!orderErr && Array.isArray(ordered)) proceduresRaw = ordered;
    else {
      const { data: fallback } = await serviceClient
        .from("treatment_plan_procedures")
        .select("*, procedures:procedure_id(*)")
        .eq("treatment_plan_id", planId)
        .order("created_at", { ascending: true });
      proceduresRaw = Array.isArray(fallback) ? fallback : [];
    }
  } catch {
    proceduresRaw = [];
  }

  // If any procedure row includes tooth numbers, treat this plan as dental context.
  if (!doctorIsDentist) {
    try {
      doctorIsDentist = proceduresRaw.some((r) => Array.isArray((r as any)?.tooth_numbers) && ((r as any)?.tooth_numbers?.length || 0) > 0);
    } catch {
      // ignore
    }
  }

  const procedures = proceduresRaw.map((row) => {
    const proc = (row as any)?.procedures || {};
    const name = safeText(proc?.name, safeText((row as any)?.name, "—"));

    const toothNumbers = doctorIsDentist ? uniqNumbers((row as any)?.tooth_numbers) : [];

    // cost fields differ across migrations — this is the UNIT cost
    const unitCost =
      asNumber((row as any)?.custom_cost) ??
      asNumber((row as any)?.cost) ??
      asNumber(proc?.default_cost) ??
      0;

    // Total cost = unit cost × number of teeth (if teeth selected), otherwise unit cost
    const teethCount = toothNumbers.length > 0 ? toothNumbers.length : 1;
    const totalCost = Number.isFinite(unitCost) ? unitCost * teethCount : 0;

    const notes =
      asString((row as any)?.custom_notes) ??
      asString((row as any)?.notes) ??
      null;

    const status = asString((row as any)?.status) ?? null;

    return {
      name,
      status,
      cost: Number.isFinite(totalCost) ? `${totalCost}` : null,
      toothNumbers,
      notes,
    };
  });

  // Medications
  const medicationsRaw = await safeSelectAll(serviceClient, "medications", (q) =>
    q.eq("treatment_plan_id", planId).order("created_at", { ascending: true })
  );

  const medications = medicationsRaw.map((m) => ({
    name: safeText((m as any)?.name, "—"),
    dosage: safeText((m as any)?.dosage, "—"),
    frequency: safeText((m as any)?.frequency, "—"),
    instructions: asString((m as any)?.instructions),
    startDate: isoDate((m as any)?.start_date),
    endDate: isoDate((m as any)?.end_date),
    status: asString((m as any)?.status),
  }));

  // Consent forms
  const consentsRaw = await safeSelectAll(serviceClient, "consent_forms", (q) =>
    q.eq("treatment_plan_id", planId).order("created_at", { ascending: true })
  );

  const consentForms = consentsRaw.map((c) => {
    const rawContent = asString((c as any)?.content);
    const content = rawContent ? stripHtml(rawContent) : null;
    return {
      title: safeText((c as any)?.title, "—"),
      status: asString((c as any)?.status),
      signedAt: isoDateTime((c as any)?.signed_at),
      content,
    };
  });

  // Attachments (support multiple schema/table names)
  const attachmentsA = await safeSelectAll(serviceClient, "procedure_attachments", (q) =>
    q.eq("treatment_plan_id", planId).order("created_at", { ascending: true })
  );

  // Some installs may use procedure_files linked by procedure_id; fetch by procedures list if present
  const procedureIds = proceduresRaw.map((r) => asString((r as any)?.procedure_id)).filter(Boolean) as string[];
  const attachmentsB = procedureIds.length
    ? await safeSelectAll(serviceClient, "procedure_files", (q) =>
      q.in("procedure_id", procedureIds).order("created_at", { ascending: true })
    )
    : [];

  const attachmentsUnified = [...attachmentsA, ...attachmentsB];

  const attachments = attachmentsUnified.map((a) => ({
    fileName: asString((a as any)?.file_name) || asString((a as any)?.filename) || asString((a as any)?.name) || null,
    fileType: asString((a as any)?.file_type) || asString((a as any)?.mime_type) || null,
    filePath: asString((a as any)?.file_path) || asString((a as any)?.path) || null,
    uploadedAt: isoDateTime((a as any)?.created_at) || isoDateTime((a as any)?.uploaded_at) || null,
    description: asString((a as any)?.description) || null,
  }));

  // Verification code (prefer dedicated column if present; fallback to plan ID)
  const verificationCode =
    asString((plan as any)?.verification_code) ||
    asString((plan as any)?.public_code) ||
    planId;

  const siteBase = (Deno.env.get("PUBLIC_SITE_URL") || "https://docito.app").replace(/\/$/, "");
  const verifyUrl = `${siteBase}/verify?type=treatment-plan&code=${encodeURIComponent(verificationCode)}`;

  const status = safeText((plan as any)?.status, "—");
  
  // Compute total cost from procedures (unit * teeth count) instead of relying on DB value
  const computedTotalCost = procedures.reduce((sum, p) => {
    const costVal = asNumber(p.cost);
    return sum + (costVal ?? 0);
  }, 0);
  const totalCostNum = computedTotalCost > 0 ? computedTotalCost : (asNumber((plan as any)?.total_cost) ?? asNumber((plan as any)?.totalCost) ?? 0);

  const title = safeText((plan as any)?.title, t(locale, "title"));
  const description = asString((plan as any)?.description) || null;
  const notes = asString((plan as any)?.notes) || null;

  const createdAt = isoDateTime((plan as any)?.created_at);
  const updatedAt = isoDateTime((plan as any)?.updated_at);
  const publishedAt = isoDateTime((plan as any)?.published_at);
  const completedAt = isoDateTime((plan as any)?.completed_at);

  const pdfBytes = await generateTreatmentPlanPdf({
    locale,
    isDentist: doctorIsDentist,
    practiceLogoUrl: practiceLogoUrl,
    planId,
    title,
    status,
    totalCost: `${totalCostNum}`,
    description: description ? formatForLocale(locale, description) : null,
    notes: notes ? formatForLocale(locale, notes) : null,
    createdAt,
    updatedAt,
    publishedAt,
    completedAt,

    patientName: formatForLocale(locale, patientName),
    patientDob,
    patientGender: patientGender ? formatForLocale(locale, patientGender) : null,
    patientPhone,
    patientEmail,
    patientAddress,

    doctorName: formatForLocale(locale, doctorName),
    doctorSpecialty: doctorSpecialty ? formatForLocale(locale, doctorSpecialty) : null,
    doctorPhone,
    doctorEmail,

    practiceName: practiceName ? formatForLocale(locale, practiceName) : null,
    practiceAddress: practiceAddress ? formatForLocale(locale, practiceAddress) : null,
    practicePhone,

    procedures: procedures.map((p) => ({
      ...p,
      name: formatForLocale(locale, p.name),
      notes: p.notes ? formatForLocale(locale, p.notes) : null,
      status: p.status ? formatForLocale(locale, p.status) : null,
    })),

    medications: medications.map((m) => ({
      ...m,
      name: formatForLocale(locale, m.name),
      dosage: formatForLocale(locale, m.dosage),
      frequency: formatForLocale(locale, m.frequency),
      instructions: m.instructions ? formatForLocale(locale, m.instructions) : null,
      status: m.status ? formatForLocale(locale, m.status) : null,
    })),

    consentForms: consentForms.map((c) => ({
      ...c,
      title: formatForLocale(locale, c.title),
      status: c.status ? formatForLocale(locale, c.status) : null,
      content: c.content ? formatForLocale(locale, c.content) : null,
    })),

    attachments: attachments.map((a) => ({
      ...a,
      fileName: a.fileName ? formatForLocale(locale, a.fileName) : null,
      fileType: a.fileType ? formatForLocale(locale, a.fileType) : null,
      filePath: a.filePath ? a.filePath : null,
      description: a.description ? formatForLocale(locale, a.description) : null,
    })),

    verificationCode,
    verifyUrl,
  });

  const filenameSafe = verificationCode.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const filename = `treatment-plan-${filenameSafe}.pdf`;

  return new Response(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
