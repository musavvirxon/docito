// supabase/functions/appointment-summary-pdf/index.ts
//
// Generates a downloadable PDF summary of a single appointment, including:
//   - Appointment metadata (date/time/doctor/facility/status)
//   - Diagnoses (appointment_diagnoses)
//   - Procedures performed (appointment_procedures + clinical items)
//   - Recommendations / notes
//   - Prescriptions issued (with items)
//   - Bills (billing_transactions filtered by appointment_id)
// Localized labels, displayed in the requesting user's preferred currency.
// Returns base64-encoded PDF bytes for SDK compatibility.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Locale = "en" | "ru" | "uz" | "tr" | "ar" | "ja" | "ko" | "zh" | "es" | "pt" | "de";

interface ReqBody {
  appointment_id: string;
  display_currency?: string;
  language?: string;
}

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    title: "Appointment Summary", patient: "Patient", doctor: "Doctor",
    facility: "Facility", date: "Date", time: "Time", status: "Status",
    type: "Type", diagnoses: "Diagnoses", procedures: "Procedures",
    recommendations: "Recommendations", prescriptions: "Prescriptions",
    bills: "Bills & Payments", total: "Total", verify: "Verify at",
    none: "None recorded", generated: "Generated",
  },
  ru: {
    title: "Сводка приёма", patient: "Пациент", doctor: "Врач",
    facility: "Учреждение", date: "Дата", time: "Время", status: "Статус",
    type: "Тип", diagnoses: "Диагнозы", procedures: "Процедуры",
    recommendations: "Рекомендации", prescriptions: "Рецепты",
    bills: "Счета и платежи", total: "Итого", verify: "Проверка",
    none: "Не указано", generated: "Создано",
  },
  uz: {
    title: "Qabul xulosasi", patient: "Bemor", doctor: "Shifokor",
    facility: "Muassasa", date: "Sana", time: "Vaqt", status: "Holat",
    type: "Turi", diagnoses: "Tashxislar", procedures: "Muolajalar",
    recommendations: "Tavsiyalar", prescriptions: "Retseptlar",
    bills: "Hisob-kitoblar", total: "Jami", verify: "Tekshirish",
    none: "Yozilmagan", generated: "Yaratildi",
  },
  tr: {
    title: "Randevu Özeti", patient: "Hasta", doctor: "Doktor",
    facility: "Tesis", date: "Tarih", time: "Saat", status: "Durum",
    type: "Tür", diagnoses: "Tanılar", procedures: "İşlemler",
    recommendations: "Öneriler", prescriptions: "Reçeteler",
    bills: "Fatura ve Ödemeler", total: "Toplam", verify: "Doğrulama",
    none: "Kaydedilmemiş", generated: "Oluşturuldu",
  },
  ar: {
    title: "ملخص الموعد", patient: "المريض", doctor: "الطبيب",
    facility: "المنشأة", date: "التاريخ", time: "الوقت", status: "الحالة",
    type: "النوع", diagnoses: "التشخيصات", procedures: "الإجراءات",
    recommendations: "التوصيات", prescriptions: "الوصفات",
    bills: "الفواتير", total: "الإجمالي", verify: "تحقق",
    none: "لا يوجد", generated: "تم الإنشاء",
  },
  ja: { title: "診察サマリー", patient: "患者", doctor: "医師", facility: "施設", date: "日付", time: "時間", status: "状態", type: "種別", diagnoses: "診断", procedures: "処置", recommendations: "推奨事項", prescriptions: "処方箋", bills: "請求", total: "合計", verify: "検証", none: "なし", generated: "発行" },
  ko: { title: "진료 요약", patient: "환자", doctor: "의사", facility: "시설", date: "날짜", time: "시간", status: "상태", type: "유형", diagnoses: "진단", procedures: "시술", recommendations: "권장사항", prescriptions: "처방전", bills: "청구", total: "합계", verify: "확인", none: "없음", generated: "생성됨" },
  zh: { title: "就诊总结", patient: "患者", doctor: "医生", facility: "机构", date: "日期", time: "时间", status: "状态", type: "类型", diagnoses: "诊断", procedures: "操作", recommendations: "建议", prescriptions: "处方", bills: "账单", total: "总计", verify: "验证", none: "无", generated: "生成于" },
  es: { title: "Resumen de cita", patient: "Paciente", doctor: "Doctor", facility: "Centro", date: "Fecha", time: "Hora", status: "Estado", type: "Tipo", diagnoses: "Diagnósticos", procedures: "Procedimientos", recommendations: "Recomendaciones", prescriptions: "Recetas", bills: "Facturas", total: "Total", verify: "Verificar", none: "Sin registros", generated: "Generado" },
  pt: { title: "Resumo da consulta", patient: "Paciente", doctor: "Médico", facility: "Unidade", date: "Data", time: "Hora", status: "Estado", type: "Tipo", diagnoses: "Diagnósticos", procedures: "Procedimentos", recommendations: "Recomendações", prescriptions: "Receitas", bills: "Faturas", total: "Total", verify: "Verificar", none: "Sem registros", generated: "Gerado" },
  de: { title: "Termin-Zusammenfassung", patient: "Patient", doctor: "Arzt", facility: "Einrichtung", date: "Datum", time: "Uhrzeit", status: "Status", type: "Typ", diagnoses: "Diagnosen", procedures: "Verfahren", recommendations: "Empfehlungen", prescriptions: "Rezepte", bills: "Rechnungen", total: "Gesamt", verify: "Verifizieren", none: "Keine Einträge", generated: "Erstellt" },
};

function pickLocale(input?: string): Locale {
  const code = (input || "en").split("-")[0].toLowerCase();
  return (Object.keys(LABELS) as Locale[]).includes(code as Locale) ? (code as Locale) : "en";
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: ["JPY", "KRW", "UZS"].includes(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Convert a number to ASCII-only safe string (pdf-lib StandardFonts can't render most non-Latin chars)
function safe(text: string | null | undefined): string {
  if (!text) return "";
  // Replace common smart quotes/dashes with ASCII; drop characters outside printable ASCII to avoid WinAnsi errors
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.appointment_id || typeof body.appointment_id !== "string") {
      return new Response(JSON.stringify({ error: "appointment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locale = pickLocale(body.language);
    const L = LABELS[locale];
    const displayCurrency = (body.display_currency || "USD").toUpperCase();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch appointment
    const { data: appt } = await admin
      .from("appointments")
      .select("*")
      .eq("id", body.appointment_id)
      .maybeSingle();

    if (!appt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorisation: user must be the patient, the doctor, or staff of the facility
    const isPatient = appt.patient_id === user.id;
    const { data: doctorRow } = appt.doctor_id
      ? await admin.from("doctors").select("id, user_id").eq("id", appt.doctor_id).maybeSingle()
      : { data: null };
    const isDoctor = !!doctorRow && (doctorRow as any).user_id === user.id;

    if (!isPatient && !isDoctor) {
      // Allow if user is admin/staff of the appointment's practice
      const { data: staffRows } = appt.practice_id
        ? await admin
            .from("clinic_staff")
            .select("id")
            .eq("practice_id", appt.practice_id)
            .eq("user_id", user.id)
            .limit(1)
        : { data: [] };
      if (!staffRows || staffRows.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch related data in parallel
    const [diagRes, clinRes, rxRes, billsRes, doctorProfileRes, patientProfileRes] = await Promise.all([
      admin.from("appointment_diagnoses").select("diagnosis_title, icd10_code, notes").eq("appointment_id", body.appointment_id),
      admin.from("appointment_clinical_items").select("title, description, item_type, cost").eq("appointment_id", body.appointment_id),
      admin.from("prescriptions").select("id, prescription_number, status, created_at").eq("appointment_id", body.appointment_id).limit(20),
      admin.from("billing_transactions").select("amount, currency, status, description, transaction_type").eq("appointment_id", body.appointment_id),
      doctorRow ? admin.from("profiles").select("full_name").eq("user_id", (doctorRow as any).profile_id).maybeSingle() : Promise.resolve({ data: null }),
      appt.patient_id ? admin.from("profiles").select("full_name, email").eq("user_id", appt.patient_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    // Fetch FX rates for currency conversion
    const { data: fxRows } = await admin.from("fx_rates").select("quote, rate").eq("base", "USD");
    const rates: Record<string, number> = { USD: 1 };
    for (const r of fxRows || []) rates[r.quote] = Number(r.rate);

    const convert = (amount: number, from: string): number => {
      const f = rates[from?.toUpperCase()] || 1;
      const t = rates[displayCurrency] || 1;
      return (amount / f) * t;
    };

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const margin = 48;
    let y = height - margin;

    const drawText = (text: string, opts: { size?: number; bold?: boolean; color?: any; x?: number } = {}) => {
      const f = opts.bold ? fontBold : font;
      const size = opts.size ?? 11;
      const xPos = opts.x ?? margin;
      if (y < margin + size + 8) {
        page = pdfDoc.addPage([595, 842]);
        y = height - margin;
      }
      page.drawText(safe(text), { x: xPos, y, size, font: f, color: opts.color || rgb(0.1, 0.1, 0.15) });
      y -= size + 4;
    };

    const drawDivider = () => {
      y -= 6;
      if (y < margin + 12) {
        page = pdfDoc.addPage([595, 842]);
        y = height - margin;
      }
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.9),
      });
      y -= 12;
    };

    // Header
    drawText("DOCITO", { size: 18, bold: true, color: rgb(0.13, 0.34, 0.78) });
    drawText(L.title, { size: 22, bold: true });
    y -= 4;

    // Verification code
    const verificationCode = `AS-${body.appointment_id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    drawText(`${L.verify}: docito.app/verify/${verificationCode}`, { size: 9, color: rgb(0.4, 0.4, 0.45) });

    // QR code top-right
    try {
      const qrData = `https://docito.app/verify/${verificationCode}`;
      const qrPng = await QRCode.toBuffer(qrData, { width: 96, margin: 0 });
      const qrImg = await pdfDoc.embedPng(qrPng);
      page.drawImage(qrImg, { x: width - margin - 72, y: height - margin - 56, width: 72, height: 72 });
    } catch (qrErr) {
      console.error("QR error:", qrErr);
    }

    drawDivider();

    // Metadata
    const doctorName = (doctorProfileRes as any)?.data?.full_name || "—";
    const patientName = (patientProfileRes as any)?.data?.full_name || "—";

    drawText(`${L.patient}: ${patientName}`, { bold: true });
    drawText(`${L.doctor}: ${doctorName}`);
    if (appt.appointment_date) drawText(`${L.date}: ${appt.appointment_date}`);
    if (appt.start_time) drawText(`${L.time}: ${appt.start_time}${appt.end_time ? ` – ${appt.end_time}` : ""}`);
    if (appt.appointment_type) drawText(`${L.type}: ${appt.appointment_type}`);
    if (appt.status) drawText(`${L.status}: ${appt.status}`);

    // Diagnoses
    drawDivider();
    drawText(L.diagnoses, { size: 13, bold: true });
    const diagnoses = (diagRes.data as any[]) || [];
    if (diagnoses.length === 0) {
      drawText(L.none, { color: rgb(0.5, 0.5, 0.55) });
    } else {
      for (const d of diagnoses) {
        const line = d.icd10_code ? `${d.diagnosis_title} (${d.icd10_code})` : d.diagnosis_title;
        drawText(`• ${line}`);
        if (d.notes) drawText(`   ${d.notes}`, { size: 9, color: rgb(0.4, 0.4, 0.5) });
      }
    }

    // Procedures
    drawDivider();
    drawText(L.procedures, { size: 13, bold: true });
    const items = (clinRes.data as any[]) || [];
    const procs = items.filter((i) => i.item_type === "procedure" || i.item_type === "treatment");
    if (procs.length === 0) {
      drawText(L.none, { color: rgb(0.5, 0.5, 0.55) });
    } else {
      for (const p of procs) {
        const cost = p.cost != null ? `  —  ${formatMoney(convert(Number(p.cost), "USD"), displayCurrency)}` : "";
        drawText(`• ${p.title}${cost}`);
        if (p.description) drawText(`   ${p.description}`, { size: 9, color: rgb(0.4, 0.4, 0.5) });
      }
    }

    // Recommendations / notes
    drawDivider();
    drawText(L.recommendations, { size: 13, bold: true });
    const recs = items.filter((i) => i.item_type === "recommendation" || i.item_type === "note");
    if (recs.length === 0 && !appt.notes) {
      drawText(L.none, { color: rgb(0.5, 0.5, 0.55) });
    } else {
      if (appt.notes) drawText(safe(appt.notes));
      for (const r of recs) {
        drawText(`• ${r.title}`);
        if (r.description) drawText(`   ${r.description}`, { size: 9, color: rgb(0.4, 0.4, 0.5) });
      }
    }

    // Prescriptions
    drawDivider();
    drawText(L.prescriptions, { size: 13, bold: true });
    const rx = (rxRes.data as any[]) || [];
    if (rx.length === 0) {
      drawText(L.none, { color: rgb(0.5, 0.5, 0.55) });
    } else {
      for (const r of rx) {
        drawText(`• Rx #${r.prescription_number || r.id.slice(0, 8).toUpperCase()}  —  ${r.status}`);
      }
    }

    // Bills
    drawDivider();
    drawText(L.bills, { size: 13, bold: true });
    const bills = (billsRes.data as any[]) || [];
    let total = 0;
    if (bills.length === 0) {
      drawText(L.none, { color: rgb(0.5, 0.5, 0.55) });
    } else {
      for (const b of bills) {
        const amount = Number(b.amount) || 0;
        const cur = (b.currency || "USD").toUpperCase();
        const converted = convert(amount, cur);
        if (b.transaction_type !== "refund") total += converted;
        drawText(
          `• ${b.description || b.transaction_type || "—"}  —  ${formatMoney(converted, displayCurrency)} (${b.status})`,
        );
      }
      drawText(`${L.total}: ${formatMoney(total, displayCurrency)}`, { bold: true });
    }

    // Footer
    y = margin;
    page.drawText(safe(`${L.generated}: ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC  •  docito.app`), {
      x: margin, y, size: 8, font, color: rgb(0.55, 0.55, 0.6),
    });

    // Audit log
    await admin.from("appointment_summary_documents").insert({
      appointment_id: body.appointment_id,
      verification_code: verificationCode,
      generated_by: user.id,
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      display_currency: displayCurrency,
    });

    const pdfBytes = await pdfDoc.save();
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({ pdf_base64: base64, verification_code: verificationCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("appointment-summary-pdf error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
