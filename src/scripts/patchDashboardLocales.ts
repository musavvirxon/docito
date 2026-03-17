// src/scripts/patchDashboardLocales.ts
// Run: npx ts-node src/scripts/patchDashboardLocales.ts

import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../../public/locales');

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      deepMerge(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function patchFile(filePath: string, patch: Record<string, unknown>) {
  if (!fs.existsSync(filePath)) { console.warn(`SKIP: ${filePath}`); return; }
  const raw = fs.readFileSync(filePath, 'utf8');
  let existing: Record<string, unknown>;
  try { existing = JSON.parse(raw); }
  catch { console.error(`PARSE ERROR: ${filePath}`); return; }
  const merged = deepMerge(existing, patch);
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`PATCHED: ${filePath}`);
}

// ─── Doctor session patch (same keys all languages, translated below) ─────────

const doctorSessionByLang: Record<string, Record<string, string>> = {
  en: {
    notFoundTitle: "Session Not Found",
    notFoundBody: "This appointment session could not be loaded.",
    backToDashboard: "Back to Dashboard",
    loadError: "Failed to load appointment session",
    loading: "Loading appointment session...",
    ended: "Session ended",
    endError: "Failed to end session",
    notesSaved: "Notes saved",
    notesSaveError: "Failed to save notes",
    videoRequiresRegistered: "Video calls require a registered patient",
    videoStartError: "Failed to start video consultation",
    dentalProceduresLoadError: "Failed to load dental procedures"
  },
  ar: {
    notFoundTitle: "الجلسة غير موجودة",
    notFoundBody: "تعذّر تحميل جلسة الموعد هذه.",
    backToDashboard: "العودة إلى لوحة التحكم",
    loadError: "فشل تحميل جلسة الموعد",
    loading: "جارٍ تحميل جلسة الموعد...",
    ended: "انتهت الجلسة",
    endError: "فشل إنهاء الجلسة",
    notesSaved: "تم حفظ الملاحظات",
    notesSaveError: "فشل حفظ الملاحظات",
    videoRequiresRegistered: "تتطلب مكالمات الفيديو مريضاً مسجلاً",
    videoStartError: "فشل بدء الاستشارة المرئية",
    dentalProceduresLoadError: "فشل تحميل الإجراءات السنية"
  },
  de: {
    notFoundTitle: "Sitzung nicht gefunden",
    notFoundBody: "Diese Terminsitzung konnte nicht geladen werden.",
    backToDashboard: "Zurück zum Dashboard",
    loadError: "Terminsitzung konnte nicht geladen werden",
    loading: "Terminsitzung wird geladen...",
    ended: "Sitzung beendet",
    endError: "Sitzung konnte nicht beendet werden",
    notesSaved: "Notizen gespeichert",
    notesSaveError: "Notizen konnten nicht gespeichert werden",
    videoRequiresRegistered: "Videoanrufe erfordern einen registrierten Patienten",
    videoStartError: "Videokonsultation konnte nicht gestartet werden",
    dentalProceduresLoadError: "Zahnärztliche Eingriffe konnten nicht geladen werden"
  },
  es: {
    notFoundTitle: "Sesión no encontrada",
    notFoundBody: "Esta sesión de cita no se pudo cargar.",
    backToDashboard: "Volver al panel",
    loadError: "Error al cargar la sesión de cita",
    loading: "Cargando sesión de cita...",
    ended: "Sesión finalizada",
    endError: "Error al finalizar la sesión",
    notesSaved: "Notas guardadas",
    notesSaveError: "Error al guardar las notas",
    videoRequiresRegistered: "Las videollamadas requieren un paciente registrado",
    videoStartError: "Error al iniciar la consulta por video",
    dentalProceduresLoadError: "Error al cargar los procedimientos dentales"
  },
  ru: {
    notFoundTitle: "Сеанс не найден",
    notFoundBody: "Не удалось загрузить этот сеанс приёма.",
    backToDashboard: "Вернуться на панель управления",
    loadError: "Не удалось загрузить сеанс приёма",
    loading: "Загрузка сеанса приёма...",
    ended: "Сеанс завершён",
    endError: "Не удалось завершить сеанс",
    notesSaved: "Заметки сохранены",
    notesSaveError: "Не удалось сохранить заметки",
    videoRequiresRegistered: "Видеозвонки требуют зарегистрированного пациента",
    videoStartError: "Не удалось начать видеоконсультацию",
    dentalProceduresLoadError: "Не удалось загрузить стоматологические процедуры"
  },
  uz: {
    notFoundTitle: "Sessiya topilmadi",
    notFoundBody: "Bu qabulxona sessiyasini yuklab bo'lmadi.",
    backToDashboard: "Boshqaruv paneliga qaytish",
    loadError: "Sessiyani yuklab bo'lmadi",
    loading: "Sessiya yuklanmoqda...",
    ended: "Sessiya tugadi",
    endError: "Sessiyani tugatib bo'lmadi",
    notesSaved: "Eslatmalar saqlandi",
    notesSaveError: "Eslatmalarni saqlab bo'lmadi",
    videoRequiresRegistered: "Video qo'ng'iroqlar uchun ro'yxatdan o'tgan bemor kerak",
    videoStartError: "Video maslahatni boshlash muvaffaqiyatsiz bo'ldi",
    dentalProceduresLoadError: "Stomatologik protseduralarni yuklab bo'lmadi"
  },
  tr: {
    notFoundTitle: "Oturum Bulunamadı",
    notFoundBody: "Bu randevu oturumu yüklenemedi.",
    backToDashboard: "Panele Dön",
    loadError: "Randevu oturumu yüklenemedi",
    loading: "Randevu oturumu yükleniyor...",
    ended: "Oturum sona erdi",
    endError: "Oturum sonlandırılamadı",
    notesSaved: "Notlar kaydedildi",
    notesSaveError: "Notlar kaydedilemedi",
    videoRequiresRegistered: "Görüntülü aramalar kayıtlı hasta gerektirir",
    videoStartError: "Görüntülü konsültasyon başlatılamadı",
    dentalProceduresLoadError: "Diş işlemleri yüklenemedi"
  },
  pt: {
    notFoundTitle: "Sessão Não Encontrada",
    notFoundBody: "Esta sessão de consulta não pôde ser carregada.",
    backToDashboard: "Voltar ao Painel",
    loadError: "Falha ao carregar sessão de consulta",
    loading: "A carregar sessão de consulta...",
    ended: "Sessão encerrada",
    endError: "Falha ao encerrar sessão",
    notesSaved: "Notas guardadas",
    notesSaveError: "Falha ao guardar notas",
    videoRequiresRegistered: "As videochamadas requerem um paciente registado",
    videoStartError: "Falha ao iniciar consulta por vídeo",
    dentalProceduresLoadError: "Falha ao carregar procedimentos dentários"
  },
  zh: {
    notFoundTitle: "未找到会话",
    notFoundBody: "无法加载此预约会话。",
    backToDashboard: "返回仪表板",
    loadError: "加载预约会话失败",
    loading: "正在加载预约会话...",
    ended: "会话已结束",
    endError: "结束会话失败",
    notesSaved: "笔记已保存",
    notesSaveError: "保存笔记失败",
    videoRequiresRegistered: "视频通话需要已注册的患者",
    videoStartError: "启动视频咨询失败",
    dentalProceduresLoadError: "加载牙科程序失败"
  },
  ja: {
    notFoundTitle: "セッションが見つかりません",
    notFoundBody: "この予約セッションを読み込めませんでした。",
    backToDashboard: "ダッシュボードに戻る",
    loadError: "予約セッションの読み込みに失敗しました",
    loading: "予約セッションを読み込んでいます...",
    ended: "セッションが終了しました",
    endError: "セッションの終了に失敗しました",
    notesSaved: "メモを保存しました",
    notesSaveError: "メモの保存に失敗しました",
    videoRequiresRegistered: "ビデオ通話には登録済みの患者が必要です",
    videoStartError: "ビデオ診察の開始に失敗しました",
    dentalProceduresLoadError: "歯科処置の読み込みに失敗しました"
  },
  ko: {
    notFoundTitle: "세션을 찾을 수 없음",
    notFoundBody: "이 예약 세션을 불러올 수 없습니다.",
    backToDashboard: "대시보드로 돌아가기",
    loadError: "예약 세션 불러오기 실패",
    loading: "예약 세션을 불러오는 중...",
    ended: "세션이 종료되었습니다",
    endError: "세션 종료에 실패했습니다",
    notesSaved: "메모가 저장되었습니다",
    notesSaveError: "메모 저장에 실패했습니다",
    videoRequiresRegistered: "화상 통화에는 등록된 환자가 필요합니다",
    videoStartError: "화상 진료 시작에 실패했습니다",
    dentalProceduresLoadError: "치과 시술 불러오기 실패"
  }
};

// ─── Patient patch ────────────────────────────────────────────────────────────

type PatientPatch = {
  subtitle: string;
  menu: Record<string, string>;
  signOut: { label: string; error: string };
  nav: { notifications: string };
  welcome: { title: string; book: string; findDoctor: string };
  stats: { upcoming: string; prescriptions: string; records: string };
  dashboard: { upcomingTitle: string; upcomingEmpty: string; viewAll: string };
  appointments: {
    refresh: string; book: string; upcoming: string; upcomingEmpty: string;
    past: string; pastEmpty: string; open: string;
  };
  prescriptions: { title: string; emptyTitle: string; emptyDesc: string };
  records: { emptyTitle: string; emptyDesc: string };
  loading: string;
  settings: {
    profile: string; preferences: string; signOut: string;
    account: { timezone: string; timezoneHint: string; language: string; selectLanguage: string };
  };
};

const patientByLang: Record<string, PatientPatch> = {
  en: {
    subtitle: "Manage appointments, prescriptions, records and more.",
    menu: { dashboard: "Dashboard", appointments: "Appointments", prescriptions: "Prescriptions", records: "Medical Records", treatmentPlans: "Treatment Plans", billing: "Billing", referrals: "Referrals", settings: "Settings" },
    signOut: { label: "Sign Out", error: "Failed to sign out" },
    nav: { notifications: "Notifications" },
    welcome: { title: "Welcome back", book: "Book appointment", findDoctor: "Find a doctor" },
    stats: { upcoming: "Upcoming", prescriptions: "Prescriptions", records: "Records" },
    dashboard: { upcomingTitle: "Upcoming Appointments", upcomingEmpty: "No upcoming appointments.", viewAll: "View all appointments" },
    appointments: { refresh: "Refresh", book: "Book", upcoming: "Upcoming", upcomingEmpty: "No upcoming appointments.", past: "Past", pastEmpty: "No past appointments.", open: "Open" },
    prescriptions: { title: "Prescriptions", emptyTitle: "No prescriptions", emptyDesc: "You don't have any prescriptions yet." },
    records: { emptyTitle: "No Medical Records Found", emptyDesc: "Add your first record using the Add button." },
    loading: "Loading...",
    settings: { profile: "Edit Profile", preferences: "Preferences", signOut: "Sign Out", account: { timezone: "Timezone", timezoneHint: "All appointment times will be shown in your selected timezone.", language: "Language", selectLanguage: "Select language" } }
  },
  ar: {
    subtitle: "إدارة المواعيد والوصفات والسجلات والمزيد.",
    menu: { dashboard: "لوحة التحكم", appointments: "المواعيد", prescriptions: "الوصفات الطبية", records: "السجلات الطبية", treatmentPlans: "خطط العلاج", billing: "الفواتير", referrals: "الإحالات", settings: "الإعدادات" },
    signOut: { label: "تسجيل الخروج", error: "فشل تسجيل الخروج" },
    nav: { notifications: "الإشعارات" },
    welcome: { title: "مرحباً بعودتك", book: "حجز موعد", findDoctor: "البحث عن طبيب" },
    stats: { upcoming: "القادمة", prescriptions: "الوصفات", records: "السجلات" },
    dashboard: { upcomingTitle: "المواعيد القادمة", upcomingEmpty: "لا توجد مواعيد قادمة.", viewAll: "عرض جميع المواعيد" },
    appointments: { refresh: "تحديث", book: "حجز", upcoming: "القادمة", upcomingEmpty: "لا توجد مواعيد قادمة.", past: "السابقة", pastEmpty: "لا توجد مواعيد سابقة.", open: "فتح" },
    prescriptions: { title: "الوصفات الطبية", emptyTitle: "لا توجد وصفات", emptyDesc: "ليس لديك أي وصفات طبية حتى الآن." },
    records: { emptyTitle: "لم يتم العثور على سجلات طبية", emptyDesc: "أضف سجلك الأول باستخدام زر الإضافة." },
    loading: "جارٍ التحميل...",
    settings: { profile: "تعديل الملف الشخصي", preferences: "التفضيلات", signOut: "تسجيل الخروج", account: { timezone: "المنطقة الزمنية", timezoneHint: "سيتم عرض جميع أوقات المواعيد في منطقتك الزمنية المحددة.", language: "اللغة", selectLanguage: "اختر اللغة" } }
  },
  de: {
    subtitle: "Verwalten Sie Termine, Rezepte, Aufzeichnungen und mehr.",
    menu: { dashboard: "Dashboard", appointments: "Termine", prescriptions: "Rezepte", records: "Medizinische Akten", treatmentPlans: "Behandlungspläne", billing: "Abrechnung", referrals: "Überweisungen", settings: "Einstellungen" },
    signOut: { label: "Abmelden", error: "Abmeldung fehlgeschlagen" },
    nav: { notifications: "Benachrichtigungen" },
    welcome: { title: "Willkommen zurück", book: "Termin buchen", findDoctor: "Arzt finden" },
    stats: { upcoming: "Bevorstehend", prescriptions: "Rezepte", records: "Aufzeichnungen" },
    dashboard: { upcomingTitle: "Bevorstehende Termine", upcomingEmpty: "Keine bevorstehenden Termine.", viewAll: "Alle Termine anzeigen" },
    appointments: { refresh: "Aktualisieren", book: "Buchen", upcoming: "Bevorstehend", upcomingEmpty: "Keine bevorstehenden Termine.", past: "Vergangene", pastEmpty: "Keine vergangenen Termine.", open: "Öffnen" },
    prescriptions: { title: "Rezepte", emptyTitle: "Keine Rezepte", emptyDesc: "Sie haben noch keine Rezepte." },
    records: { emptyTitle: "Keine Medizinischen Akten Gefunden", emptyDesc: "Fügen Sie Ihren ersten Eintrag über die Schaltfläche Hinzufügen hinzu." },
    loading: "Wird geladen...",
    settings: { profile: "Profil bearbeiten", preferences: "Einstellungen", signOut: "Abmelden", account: { timezone: "Zeitzone", timezoneHint: "Alle Terminzeiten werden in Ihrer ausgewählten Zeitzone angezeigt.", language: "Sprache", selectLanguage: "Sprache auswählen" } }
  },
  es: {
    subtitle: "Gestiona citas, recetas, registros y más.",
    menu: { dashboard: "Panel", appointments: "Citas", prescriptions: "Recetas", records: "Historial Médico", treatmentPlans: "Planes de Tratamiento", billing: "Facturación", referrals: "Derivaciones", settings: "Configuración" },
    signOut: { label: "Cerrar Sesión", error: "Error al cerrar sesión" },
    nav: { notifications: "Notificaciones" },
    welcome: { title: "Bienvenido de nuevo", book: "Reservar cita", findDoctor: "Buscar médico" },
    stats: { upcoming: "Próximas", prescriptions: "Recetas", records: "Registros" },
    dashboard: { upcomingTitle: "Próximas Citas", upcomingEmpty: "No hay citas próximas.", viewAll: "Ver todas las citas" },
    appointments: { refresh: "Actualizar", book: "Reservar", upcoming: "Próximas", upcomingEmpty: "No hay citas próximas.", past: "Pasadas", pastEmpty: "No hay citas pasadas.", open: "Abrir" },
    prescriptions: { title: "Recetas", emptyTitle: "Sin recetas", emptyDesc: "Aún no tienes ninguna receta." },
    records: { emptyTitle: "No Se Encontraron Registros", emptyDesc: "Añade tu primer registro usando el botón Añadir." },
    loading: "Cargando...",
    settings: { profile: "Editar Perfil", preferences: "Preferencias", signOut: "Cerrar Sesión", account: { timezone: "Zona horaria", timezoneHint: "Todos los horarios de citas se mostrarán en tu zona horaria seleccionada.", language: "Idioma", selectLanguage: "Seleccionar idioma" } }
  },
  ru: {
    subtitle: "Управляйте приёмами, рецептами, записями и многим другим.",
    menu: { dashboard: "Панель управления", appointments: "Приёмы", prescriptions: "Рецепты", records: "Медицинские записи", treatmentPlans: "Планы лечения", billing: "Выставление счетов", referrals: "Направления", settings: "Настройки" },
    signOut: { label: "Выйти", error: "Ошибка выхода из системы" },
    nav: { notifications: "Уведомления" },
    welcome: { title: "С возвращением", book: "Записаться на приём", findDoctor: "Найти врача" },
    stats: { upcoming: "Предстоящие", prescriptions: "Рецепты", records: "Записи" },
    dashboard: { upcomingTitle: "Предстоящие приёмы", upcomingEmpty: "Нет предстоящих приёмов.", viewAll: "Все приёмы" },
    appointments: { refresh: "Обновить", book: "Записаться", upcoming: "Предстоящие", upcomingEmpty: "Нет предстоящих приёмов.", past: "Прошедшие", pastEmpty: "Нет прошедших приёмов.", open: "Открыть" },
    prescriptions: { title: "Рецепты", emptyTitle: "Нет рецептов", emptyDesc: "У вас пока нет рецептов." },
    records: { emptyTitle: "Медицинские записи не найдены", emptyDesc: "Добавьте первую запись с помощью кнопки «Добавить»." },
    loading: "Загрузка...",
    settings: { profile: "Редактировать профиль", preferences: "Настройки", signOut: "Выйти", account: { timezone: "Часовой пояс", timezoneHint: "Все времена приёмов будут отображаться в выбранном часовом поясе.", language: "Язык", selectLanguage: "Выбрать язык" } }
  },
  uz: {
    subtitle: "Qabullar, retseptlar, yozuvlar va boshqalarni boshqaring.",
    menu: { dashboard: "Boshqaruv paneli", appointments: "Qabullar", prescriptions: "Retseptlar", records: "Tibbiy yozuvlar", treatmentPlans: "Davolash rejalari", billing: "Hisob-kitob", referrals: "Yo'llanmalar", settings: "Sozlamalar" },
    signOut: { label: "Chiqish", error: "Chiqish muvaffaqiyatsiz bo'ldi" },
    nav: { notifications: "Bildirishnomalar" },
    welcome: { title: "Qaytganingiz bilan", book: "Qabul band qilish", findDoctor: "Shifokor topish" },
    stats: { upcoming: "Rejalashtirilgan", prescriptions: "Retseptlar", records: "Yozuvlar" },
    dashboard: { upcomingTitle: "Rejalashtirilgan qabullar", upcomingEmpty: "Rejalashtirilgan qabullar yo'q.", viewAll: "Barcha qabullarni ko'rish" },
    appointments: { refresh: "Yangilash", book: "Band qilish", upcoming: "Rejalashtirilgan", upcomingEmpty: "Rejalashtirilgan qabullar yo'q.", past: "O'tgan", pastEmpty: "O'tgan qabullar yo'q.", open: "Ochish" },
    prescriptions: { title: "Retseptlar", emptyTitle: "Retseptlar yo'q", emptyDesc: "Sizda hali retseptlar mavjud emas." },
    records: { emptyTitle: "Tibbiy yozuvlar topilmadi", emptyDesc: "Qo'shish tugmasi orqali birinchi yozuvingizni qo'shing." },
    loading: "Yuklanmoqda...",
    settings: { profile: "Profilni tahrirlash", preferences: "Sozlamalar", signOut: "Chiqish", account: { timezone: "Vaqt mintaqasi", timezoneHint: "Barcha qabul vaqtlari tanlangan vaqt mintaqangizda ko'rsatiladi.", language: "Til", selectLanguage: "Tilni tanlang" } }
  },
  tr: {
    subtitle: "Randevuları, reçeteleri, kayıtları ve daha fazlasını yönetin.",
    menu: { dashboard: "Panel", appointments: "Randevular", prescriptions: "Reçeteler", records: "Tıbbi Kayıtlar", treatmentPlans: "Tedavi Planları", billing: "Faturalama", referrals: "Sevkler", settings: "Ayarlar" },
    signOut: { label: "Çıkış Yap", error: "Çıkış yapılamadı" },
    nav: { notifications: "Bildirimler" },
    welcome: { title: "Tekrar hoş geldiniz", book: "Randevu al", findDoctor: "Doktor bul" },
    stats: { upcoming: "Yaklaşan", prescriptions: "Reçeteler", records: "Kayıtlar" },
    dashboard: { upcomingTitle: "Yaklaşan Randevular", upcomingEmpty: "Yaklaşan randevu yok.", viewAll: "Tüm randevuları görüntüle" },
    appointments: { refresh: "Yenile", book: "Randevu Al", upcoming: "Yaklaşan", upcomingEmpty: "Yaklaşan randevu yok.", past: "Geçmiş", pastEmpty: "Geçmiş randevu yok.", open: "Aç" },
    prescriptions: { title: "Reçeteler", emptyTitle: "Reçete yok", emptyDesc: "Henüz reçeteniz bulunmuyor." },
    records: { emptyTitle: "Tıbbi Kayıt Bulunamadı", emptyDesc: "Ekle düğmesini kullanarak ilk kaydınızı ekleyin." },
    loading: "Yükleniyor...",
    settings: { profile: "Profili Düzenle", preferences: "Tercihler", signOut: "Çıkış Yap", account: { timezone: "Saat dilimi", timezoneHint: "Tüm randevu saatleri seçtiğiniz saat diliminde gösterilecektir.", language: "Dil", selectLanguage: "Dil seçin" } }
  },
  pt: {
    subtitle: "Gerencie consultas, receitas, registos e muito mais.",
    menu: { dashboard: "Painel", appointments: "Consultas", prescriptions: "Receitas", records: "Registos Médicos", treatmentPlans: "Planos de Tratamento", billing: "Faturação", referrals: "Referências", settings: "Definições" },
    signOut: { label: "Terminar Sessão", error: "Falha ao terminar sessão" },
    nav: { notifications: "Notificações" },
    welcome: { title: "Bem-vindo de volta", book: "Marcar consulta", findDoctor: "Encontrar médico" },
    stats: { upcoming: "Próximas", prescriptions: "Receitas", records: "Registos" },
    dashboard: { upcomingTitle: "Próximas Consultas", upcomingEmpty: "Sem consultas próximas.", viewAll: "Ver todas as consultas" },
    appointments: { refresh: "Atualizar", book: "Marcar", upcoming: "Próximas", upcomingEmpty: "Sem consultas próximas.", past: "Passadas", pastEmpty: "Sem consultas passadas.", open: "Abrir" },
    prescriptions: { title: "Receitas", emptyTitle: "Sem receitas", emptyDesc: "Ainda não tem receitas." },
    records: { emptyTitle: "Nenhum Registo Médico Encontrado", emptyDesc: "Adicione o seu primeiro registo usando o botão Adicionar." },
    loading: "A carregar...",
    settings: { profile: "Editar Perfil", preferences: "Preferências", signOut: "Terminar Sessão", account: { timezone: "Fuso horário", timezoneHint: "Todos os horários de consultas serão mostrados no seu fuso horário selecionado.", language: "Idioma", selectLanguage: "Selecionar idioma" } }
  },
  zh: {
    subtitle: "管理预约、处方、病历等。",
    menu: { dashboard: "仪表板", appointments: "预约", prescriptions: "处方", records: "病历", treatmentPlans: "治疗计划", billing: "账单", referrals: "转诊", settings: "设置" },
    signOut: { label: "退出登录", error: "退出登录失败" },
    nav: { notifications: "通知" },
    welcome: { title: "欢迎回来", book: "预约挂号", findDoctor: "查找医生" },
    stats: { upcoming: "即将到来", prescriptions: "处方", records: "病历" },
    dashboard: { upcomingTitle: "即将到来的预约", upcomingEmpty: "暂无即将到来的预约。", viewAll: "查看全部预约" },
    appointments: { refresh: "刷新", book: "预约", upcoming: "即将到来", upcomingEmpty: "暂无即将到来的预约。", past: "历史", pastEmpty: "暂无历史预约。", open: "查看" },
    prescriptions: { title: "处方", emptyTitle: "暂无处方", emptyDesc: "您目前还没有任何处方。" },
    records: { emptyTitle: "未找到病历", emptyDesc: "使用\u201C添加\u201D按钮添加您的第一条记录。" },
    loading: "加载中...",
    settings: { profile: "编辑个人资料", preferences: "偏好设置", signOut: "退出登录", account: { timezone: "时区", timezoneHint: "所有预约时间将以您选择的时区显示。", language: "语言", selectLanguage: "选择语言" } }
  },
  ja: {
    subtitle: "予約、処方箋、記録などを管理します。",
    menu: { dashboard: "ダッシュボード", appointments: "予約", prescriptions: "処方箋", records: "診療記録", treatmentPlans: "治療計画", billing: "請求", referrals: "紹介状", settings: "設定" },
    signOut: { label: "サインアウト", error: "サインアウトに失敗しました" },
    nav: { notifications: "通知" },
    welcome: { title: "おかえりなさい", book: "予約する", findDoctor: "医師を探す" },
    stats: { upcoming: "予定", prescriptions: "処方箋", records: "記録" },
    dashboard: { upcomingTitle: "予定の予約", upcomingEmpty: "予定の予約はありません。", viewAll: "すべての予約を見る" },
    appointments: { refresh: "更新", book: "予約", upcoming: "予定", upcomingEmpty: "予定の予約はありません。", past: "過去", pastEmpty: "過去の予約はありません。", open: "開く" },
    prescriptions: { title: "処方箋", emptyTitle: "処方箋なし", emptyDesc: "まだ処方箋がありません。" },
    records: { emptyTitle: "診療記録が見つかりません", emptyDesc: "追加ボタンで最初の記録を追加してください。" },
    loading: "読み込み中...",
    settings: { profile: "プロフィール編集", preferences: "設定", signOut: "サインアウト", account: { timezone: "タイムゾーン", timezoneHint: "すべての予約時間は選択したタイムゾーンで表示されます。", language: "言語", selectLanguage: "言語を選択" } }
  },
  ko: {
    subtitle: "예약, 처방전, 기록 등을 관리하세요.",
    menu: { dashboard: "대시보드", appointments: "예약", prescriptions: "처방전", records: "진료 기록", treatmentPlans: "치료 계획", billing: "청구", referrals: "의뢰", settings: "설정" },
    signOut: { label: "로그아웃", error: "로그아웃에 실패했습니다" },
    nav: { notifications: "알림" },
    welcome: { title: "다시 오셨군요", book: "예약하기", findDoctor: "의사 찾기" },
    stats: { upcoming: "예정된", prescriptions: "처방전", records: "기록" },
    dashboard: { upcomingTitle: "예정된 예약", upcomingEmpty: "예정된 예약이 없습니다.", viewAll: "모든 예약 보기" },
    appointments: { refresh: "새로 고침", book: "예약", upcoming: "예정된", upcomingEmpty: "예정된 예약이 없습니다.", past: "지난", pastEmpty: "지난 예약이 없습니다.", open: "열기" },
    prescriptions: { title: "처방전", emptyTitle: "처방전 없음", emptyDesc: "아직 처방전이 없습니다." },
    records: { emptyTitle: "진료 기록을 찾을 수 없음", emptyDesc: "추가 버튼을 사용하여 첫 번째 기록을 추가하세요." },
    loading: "불러오는 중...",
    settings: { profile: "프로필 편집", preferences: "환경 설정", signOut: "로그아웃", account: { timezone: "시간대", timezoneHint: "모든 예약 시간은 선택한 시간대로 표시됩니다.", language: "언어", selectLanguage: "언어 선택" } }
  }
};

// ─── Apply all patches ────────────────────────────────────────────────────────

const langs = ['en','ar','de','es','ru','uz','tr','pt','zh','ja','ko'];

for (const lang of langs) {
  const filePath = path.join(LOCALES_DIR, lang, 'dashboard.json');

  if (patientByLang[lang]) {
    patchFile(filePath, { patient: patientByLang[lang] });
  }

  if (doctorSessionByLang[lang]) {
    patchFile(filePath, { doctor: { session: doctorSessionByLang[lang] } });
  }
}

console.log('All dashboard locale patches applied.');
