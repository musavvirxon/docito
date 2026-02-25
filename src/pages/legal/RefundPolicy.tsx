// File: src/pages/legal/RefundPolicy.tsx
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';

type SupportedLang = 'en' | 'ru' | 'uz' | 'ar' | 'tr' | 'zh' | 'es' | 'pt' | 'de' | 'ja' | 'ko';

type RefundPolicyLocaleContent = {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  title: string;
  summary: string;
  effectiveDate: string;
  lastUpdated: string;
  contactEmail: string;
  content: string;
};

const ISO_EFFECTIVE_DATE = '2026-02-25';
const ISO_LAST_UPDATED = '2026-02-25';
const SUPPORT_EMAIL = 'legal@docito.com';

const ENGLISH_MARKDOWN = `# Refund Policy

## 1. Scope of this Refund Policy
This Refund Policy explains how refunds are handled for:

- **Docito subscriptions** (including entity subscriptions and recurring platform plans), and
- **payments made for telemedicine / live consultations through Docito** when payment is processed inside the Docito platform.

Docito is a technology platform that connects patients, doctors, and healthcare entities (clinics, labs, imaging centers, pharmacies). For many healthcare services, **the treating doctor or responsible entity** is the service provider and is responsible for treatment delivery and service-level refund decisions, subject to applicable law.

## 2. Subscription Refunds (Docito platform subscriptions)

### 2.1 No refunds after a subscription payment is charged
All paid subscriptions on Docito are **non-refundable** once charged, unless required by applicable law.

### 2.2 14-day free trial before billing
Docito provides a **14-day free trial period** (where offered) so users can evaluate the platform before payment.

During the free trial, users may cancel the subscription before the trial ends to avoid being charged.

### 2.3 Access for the paid period remains active
If a subscription payment has already been charged, the user will still have access to the subscribed product/features **for the duration of the billing period paid for** (for example, monthly or yearly term), unless the account is suspended or terminated under the Terms of Service or applicable law.

### 2.4 No prorated refunds
Docito does not provide prorated or partial refunds for unused subscription time, downgrades, or early cancellation after a paid term has started, unless required by law.

## 3. Patient Payments to Doctors / Entities on the Platform

### 3.1 Who is responsible for the refund
If a patient pays a doctor or healthcare entity through Docito for a consultation or treatment, the **responsible doctor / entity** (not Docito) is responsible for deciding and issuing any refund, subject to applicable law and the terms shown at booking/checkout.

### 3.2 Refund eligibility (treatment/service not performed)
As a general platform rule, a refund may be considered by the responsible doctor / entity **only if the treatment/service was not performed**.

Final eligibility and the refund amount are determined by the responsible doctor / entity in accordance with applicable law, medical documentation, and the circumstances of the case.

### 3.3 Non-refundable deductions (transaction fees and taxes)
Where payment was processed through Docito, the responsible doctor / entity may decline to refund (or may deduct from the refunded amount) any amount that was irreversibly lost due to:

- payment processor / gateway transaction fees,
- bank charges,
- platform processing charges,
- taxes, duties, or similar mandatory charges,
- currency conversion costs or transfer fees,

to the extent such amounts were actually incurred and are non-recoverable, and as permitted by applicable law.

## 4. Payments Made in Cash or Outside Docito
If a payment was made **in cash** or through **any payment processor, bank transfer, wallet, or method outside of Docito**, then:

- **Docito is not responsible** for that payment,
- **Docito cannot issue or guarantee any refund** for that payment, and
- any refund request must be resolved directly with the doctor / clinic / entity that received the payment.

## 5. Telemedicine / Live Consultation Utilities and Tools Costs (Docito-processed payments only)
For **telemedicine / live consultations conducted in Docito**, if payment was processed via Docito, the responsible doctor / entity may have the right (subject to applicable law) to **withhold or deduct part of the payment** that was already spent on utilities, tools, consumables, preparation, or other expenditures reasonably incurred for the patient’s treatment/consultation.

This section applies **only** to cases of:

- telemedicine consultations,
- live consultations,
- remote sessions

that are conducted **in Docito** and paid through Docito-supported payment flows.

## 6. Physical / Home / Office Visits and Other Offline Services
For any appointment or service that is **not** a Docito telemedicine/live consultation (including but not limited to **physical visits, home visits, office visits, clinic procedures, lab services, imaging services, or pharmacy fulfillment**), **Docito is not responsible for refunds**.

Any refund, rescheduling, partial refund, or no-refund decision for such services must be handled directly by the responsible doctor / entity according to their own policies, the payment method used, and applicable law.

## 7. Chargebacks and Payment Disputes
If a user initiates a chargeback or payment dispute with a bank/card issuer/payment provider, Docito and/or the responsible doctor/entity may provide supporting records (appointment status, timestamps, communications, service logs where legally permitted, and payment records) to respond to the dispute.

Filing a chargeback does not automatically make a payment refundable.

## 8. How to Request a Refund

### If your issue is a Docito subscription
- Cancel the subscription before the end of the 14-day free trial to avoid charges.
- If you were already charged, your subscription remains active until the end of the paid term.
- For billing questions, contact Docito support through the Help Center or legal/support contact details shown on the platform.

### If your issue is a doctor/entity payment
- Contact the responsible doctor / clinic / entity directly first.
- Provide appointment ID, payment receipt, date/time, and the reason for the request.
- If the booking/payment was made through Docito, Docito may assist with routing the request, but the final refund decision remains with the responsible doctor/entity unless applicable law requires otherwise.

## 9. Important Legal Note
Nothing in this Refund Policy limits any non-waivable rights you may have under applicable consumer protection, healthcare, or payment laws.

Where local law requires a different outcome than this policy, the applicable law will prevail.

## 10. Contact
For questions about this Refund Policy or Docito subscription billing, contact **${SUPPORT_EMAIL}**.

For treatment/service refund requests, please contact the responsible doctor / entity shown in your booking or receipt.
`;

const RUSSIAN_MARKDOWN = `# Политика возврата средств

## 1. Сфера действия настоящей Политики возврата
Настоящая Политика возврата объясняет, как обрабатываются возвраты для:

- **подписок Docito** (включая подписки организаций и регулярные тарифы платформы), и
- **платежей за телемедицинские / онлайн-консультации через Docito**, если оплата была обработана внутри платформы Docito.

Docito — это технологическая платформа, которая соединяет пациентов, врачей и медицинские организации (клиники, лаборатории, центры визуализации, аптеки). Для многих медицинских услуг **лечащий врач или соответствующая организация** является поставщиком услуги и несет ответственность за оказание услуги и решения о возврате в соответствии с применимым законодательством.

## 2. Возврат по подпискам (подписки на платформу Docito)

### 2.1 Возврат после списания оплаты не производится
Все платные подписки Docito **не подлежат возврату** после списания оплаты, кроме случаев, когда возврат обязателен по закону.

### 2.2 Бесплатный пробный период 14 дней до списания
Docito предоставляет **14-дневный бесплатный пробный период** (где применимо), чтобы пользователи могли оценить платформу до оплаты.

В течение пробного периода пользователь может отменить подписку до окончания пробного периода, чтобы избежать списания.

### 2.3 Доступ сохраняется на оплаченный период
Если оплата за подписку уже списана, пользователь сохраняет доступ к оплаченным функциям **до окончания оплаченного расчетного периода** (например, месячного или годового), если аккаунт не приостановлен/не прекращен по Условиям использования или закону.

### 2.4 Нет пропорционального возврата
Docito не предоставляет частичный/пропорциональный возврат за неиспользованное время подписки, понижение тарифа или досрочную отмену после начала оплаченного периода, кроме случаев, когда это требуется законом.

## 3. Платежи пациентов врачам / организациям на платформе

### 3.1 Кто отвечает за возврат
Если пациент оплачивает консультацию или лечение врачу/медицинской организации через Docito, решение о возврате и сам возврат осуществляет **соответствующий врач / организация** (а не Docito) в соответствии с применимым законодательством и условиями, показанными при бронировании/оплате.

### 3.2 Когда может рассматриваться возврат (если услуга не оказана)
По общему правилу платформы возврат может рассматриваться соответствующим врачом / организацией **только если лечение/услуга не были выполнены**.

Окончательное решение о наличии права на возврат и сумме возврата принимает соответствующий врач / организация с учетом закона, медицинской документации и обстоятельств случая.

### 3.3 Невозвращаемые удержания (комиссии и налоги)
Если платеж был обработан через Docito, соответствующий врач / организация может отказать в возврате (или удержать из суммы возврата) суммы, которые были безвозвратно потеряны из-за:

- комиссий платежного провайдера / шлюза,
- банковских комиссий,
- комиссий за обработку платежа,
- налогов, сборов и иных обязательных платежей,
- расходов на конвертацию валюты или переводы,

в той мере, в какой такие суммы фактически понесены, невозмещаемы и это допускается законом.

## 4. Платежи наличными или вне Docito
Если оплата была произведена **наличными** или через **любой платежный сервис, банковский перевод, кошелек или иной способ вне Docito**, тогда:

- **Docito не несет ответственности** за такой платеж,
- **Docito не может оформить или гарантировать возврат** по такому платежу,
- запрос на возврат должен решаться напрямую с врачом / клиникой / организацией, которая получила оплату.

## 5. Расходы на инструменты и ресурсы для телемедицины / онлайн-консультаций (только для платежей через Docito)
Для **телемедицинских / онлайн-консультаций, проведенных в Docito**, если оплата была обработана через Docito, соответствующий врач / организация может иметь право (если это допускается законом) **удержать часть оплаты**, которая уже была потрачена на ресурсы, инструменты, расходные материалы, подготовку или иные разумные расходы, понесенные для консультации/лечения пациента.

Этот раздел применяется **только** к:

- телемедицинским консультациям,
- онлайн-консультациям,
- удаленным сессиям,

которые проводятся **в Docito** и оплачиваются через поддерживаемые Docito платежные потоки.

## 6. Очные / выездные / офисные визиты и другие офлайн-услуги
Для любых услуг, которые **не являются** телемедицинской/онлайн-консультацией в Docito (включая, помимо прочего, **очные визиты, визиты на дом, визиты в офис/клинику, процедуры, лабораторные услуги, услуги визуализации и аптечное обслуживание**), **Docito не несет ответственности за возвраты**.

Любой возврат, перенос записи, частичный возврат или отказ в возврате по таким услугам должен решаться напрямую с соответствующим врачом / организацией согласно их правилам, способу оплаты и применимому законодательству.

## 7. Чарджбеки и платежные споры
Если пользователь инициирует чарджбек или платежный спор через банк/эмитента карты/платежного провайдера, Docito и/или соответствующий врач/организация могут предоставить подтверждающие записи (статус записи, временные метки, коммуникации, журналы услуги — если это разрешено законом, и платежные записи) для ответа на спор.

Инициирование чарджбека не означает автоматического права на возврат.

## 8. Как запросить возврат

### Если вопрос связан с подпиской Docito
- Отмените подписку до окончания 14-дневного пробного периода, чтобы избежать списания.
- Если списание уже произошло, подписка остается активной до конца оплаченного срока.
- По вопросам биллинга обратитесь в поддержку Docito через Help Center или по указанным контактам.

### Если вопрос связан с оплатой врачу/организации
- Сначала свяжитесь напрямую с соответствующим врачом / клиникой / организацией.
- Укажите ID записи, чек/квитанцию, дату/время и причину запроса.
- Если бронирование/оплата были через Docito, Docito может помочь с маршрутизацией запроса, но финальное решение о возврате остается за врачом/организацией, если иное не требуется законом.

## 9. Важное юридическое примечание
Ничто в настоящей Политике возврата не ограничивает неотчуждаемые права, которые могут принадлежать вам по законам о защите прав потребителей, здравоохранении или платежах.

Если местное законодательство требует иного результата, применяется соответствующее законодательство.

## 10. Контакты
По вопросам настоящей Политики возврата или биллинга подписок Docito пишите на **${SUPPORT_EMAIL}**.

По вопросам возврата за лечение/услуги обращайтесь к соответствующему врачу / организации, указанным в бронировании или квитанции.
`;

const UZBEK_MARKDOWN = `# Mablag‘ni qaytarish siyosati

## 1. Ushbu siyosatning amal qilish doirasi
Ushbu Mablag‘ni qaytarish siyosati quyidagilar bo‘yicha qaytarish tartibini tushuntiradi:

- **Docito obunalari** (shu jumladan tashkilot obunalari va platformaning takroriy tarif rejalari), va
- **Docito orqali telemeditsina / jonli konsultatsiyalar uchun to‘lovlar**, agar to‘lov Docito platformasi ichida qayta ishlangan bo‘lsa.

Docito — bu bemorlar, shifokorlar va tibbiy muassasalarni (klinika, laboratoriya, tasvirlash markazi, dorixona) bog‘laydigan texnologik platforma. Ko‘plab tibbiy xizmatlar bo‘yicha **davolovchi shifokor yoki mas’ul muassasa** xizmat ko‘rsatuvchi hisoblanadi va xizmat ko‘rsatish hamda qaytarish bo‘yicha qarorlar uchun amaldagi qonunchilik doirasida javob beradi.

## 2. Obuna to‘lovlari bo‘yicha qaytarish (Docito platforma obunalari)

### 2.1 Obuna uchun to‘lov yechilgandan keyin qaytarilmaydi
Docito’dagi barcha pullik obunalar **to‘lov yechilgandan keyin qaytarilmaydi**, agar amaldagi qonunchilikda boshqacha talab qilinmagan bo‘lsa.

### 2.2 To‘lovdan oldin 14 kunlik bepul sinov muddati
Docito (tegishli hollarda) foydalanuvchilarga platformani to‘lovdan oldin baholash uchun **14 kunlik bepul sinov muddati** beradi.

Sinov muddati davomida foydalanuvchi obunani sinov tugashidan oldin bekor qilib, to‘lov yechilishini oldini olishi mumkin.

### 2.3 To‘langan davr uchun kirish saqlanib qoladi
Agar obuna uchun to‘lov allaqachon yechilgan bo‘lsa, foydalanuvchi **to‘lagan billing davri tugaguncha** (masalan, oylik yoki yillik muddat) obuna funksiyalaridan foydalanishda davom etadi, agar hisob qaydnomasi Xizmat shartlari yoki qonunga ko‘ra to‘xtatilmagan bo‘lsa.

### 2.4 Proportsional (qisman) qaytarish yo‘q
Docito ishlatilmagan obuna vaqti, tarifni pasaytirish yoki pullik davr boshlanganidan keyin erta bekor qilish uchun proportsional/qisman qaytarishni taqdim etmaydi, agar qonun talab qilmasa.

## 3. Platformadagi shifokor / muassasalarga bemor to‘lovlari

### 3.1 Qaytarish uchun kim javobgar
Agar bemor Docito orqali shifokor yoki tibbiy muassasaga konsultatsiya/davolanish uchun to‘lov qilsa, qaytarish haqida qaror va qaytarishning o‘zi bo‘yicha **mas’ul shifokor / muassasa** (Docito emas) amaldagi qonunchilik va bron/qabul paytidagi shartlarga muvofiq javob beradi.

### 3.2 Qaytarish ko‘rib chiqilishi mumkin bo‘lgan holat (xizmat bajarilmagan bo‘lsa)
Platformaning umumiy qoidasi bo‘yicha qaytarish **faqat davolash/xizmat bajarilmagan bo‘lsa** mas’ul shifokor / muassasa tomonidan ko‘rib chiqilishi mumkin.

Qaytarish huquqi va qaytariladigan summa bo‘yicha yakuniy qaror mas’ul shifokor / muassasa tomonidan qonun, tibbiy hujjatlar va holat sharoitlarini hisobga olgan holda qabul qilinadi.

### 3.3 Qaytarilmaydigan ushlab qolinadigan summalar (komissiya va soliqlar)
Agar to‘lov Docito orqali qayta ishlangan bo‘lsa, mas’ul shifokor / muassasa quyidagilar sababli qaytarib bo‘lmaydigan (yoki qaytarish summasidan ushlab qolinadigan) xarajatlarni qaytarmaslikka haqli bo‘lishi mumkin:

- to‘lov provayderi / gateway komissiyalari,
- bank komissiyalari,
- to‘lovni qayta ishlash xarajatlari,
- soliqlar, yig‘imlar va boshqa majburiy to‘lovlar,
- valyuta konvertatsiyasi yoki o‘tkazma xarajatlari,

agar bu summalar amalda yuzaga kelgan, qaytarib olinmaydigan bo‘lsa va qonun ruxsat etsa.

## 4. Naqd yoki Docito’dan tashqarida qilingan to‘lovlar
Agar to‘lov **naqd pulda** yoki **Docito’dan tashqari istalgan to‘lov tizimi, bank o‘tkazmasi, hamyon yoki boshqa usul orqali** amalga oshirilgan bo‘lsa, unda:

- **Docito bunday to‘lov uchun javobgar emas**,
- **Docito bunday to‘lov bo‘yicha qaytarishni amalga oshira olmaydi va kafolatlamaydi**,
- qaytarish so‘rovi to‘lovni olgan shifokor / klinika / muassasa bilan to‘g‘ridan-to‘g‘ri hal qilinishi kerak.

## 5. Telemeditsina / jonli konsultatsiya xarajatlari (faqat Docito orqali qayta ishlangan to‘lovlar)
**Docito ichida o‘tkazilgan telemeditsina / jonli konsultatsiyalar** uchun, agar to‘lov Docito orqali qayta ishlangan bo‘lsa, mas’ul shifokor / muassasa (qonun ruxsat bergan doirada) bemor konsultatsiyasi/davolanishi uchun allaqachon sarflangan kommunal xarajatlar, vositalar, sarf materiallari, tayyorgarlik yoki boshqa oqilona xarajatlar uchun **to‘lovning bir qismini ushlab qolish** huquqiga ega bo‘lishi mumkin.

Bu bo‘lim **faqat** quyidagilarga tatbiq etiladi:

- telemeditsina konsultatsiyalari,
- jonli konsultatsiyalar,
- masofaviy sessiyalar,

agar ular **Docito ichida** o‘tkazilgan va Docito qo‘llab-quvvatlaydigan to‘lov oqimlari orqali to‘langan bo‘lsa.

## 6. Ofis / uyga tashrif / klinik tashrif va boshqa oflayn xizmatlar
Agar xizmat **Docito telemeditsina/jonli konsultatsiyasi bo‘lmasa** (jumladan, **jismoniy tashriflar, uyga tashriflar, ofis/klinika qabul qilishi, klinik protseduralar, laboratoriya xizmatlari, tasvirlash xizmatlari yoki dorixona xizmatlari**), unda **Docito qaytarish uchun javobgar emas**.

Bunday xizmatlar bo‘yicha qaytarish, qayta rejalashtirish, qisman qaytarish yoki qaytarmaslik qarori mas’ul shifokor / muassasa tomonidan o‘z siyosati, ishlatilgan to‘lov usuli va amaldagi qonunchilikka muvofiq hal qilinadi.

## 7. Chargeback va to‘lov nizolari
Agar foydalanuvchi bank/karta emitenti/to‘lov provayderi orqali chargeback yoki to‘lov nizosini boshlab yuborsa, Docito va/yoki mas’ul shifokor/muassasa nizoga javob berish uchun qo‘llab-quvvatlovchi yozuvlarni (bron holati, vaqt belgilari, yozishmalar, qonun ruxsat bergan hollarda xizmat jurnallari va to‘lov yozuvlari) taqdim etishi mumkin.

Chargeback yuborilishi avtomatik tarzda qaytarish huquqini bermaydi.

## 8. Qaytarishni qanday so‘rash kerak

### Muammo Docito obunasi bilan bog‘liq bo‘lsa
- To‘lov yechilishini oldini olish uchun obunani 14 kunlik sinov muddati tugashidan oldin bekor qiling.
- Agar to‘lov allaqachon yechilgan bo‘lsa, obuna pullik muddat oxirigacha faol qoladi.
- Billing savollari uchun Docito yordam markazi yoki platformadagi support/legal kontaktlari orqali murojaat qiling.

### Muammo shifokor/muassasaga to‘lov bilan bog‘liq bo‘lsa
- Avvalo mas’ul shifokor / klinika / muassasa bilan bevosita bog‘laning.
- Qabul IDsi, to‘lov cheki, sana/vaqt va so‘rov sababini taqdim eting.
- Agar bron/to‘lov Docito orqali amalga oshirilgan bo‘lsa, Docito so‘rovni yo‘naltirishga yordam berishi mumkin, ammo yakuniy qaytarish qarori (qonun boshqacha talab qilmagan bo‘lsa) mas’ul shifokor/muassasaga tegishli bo‘ladi.

## 9. Muhim yuridik eslatma
Ushbu Mablag‘ni qaytarish siyosatidagi hech narsa iste’molchi huquqlari, sog‘liqni saqlash yoki to‘lov qonunlari bo‘yicha sizda bo‘lishi mumkin bo‘lgan bekor qilib bo‘lmaydigan huquqlarni cheklamaydi.

Agar mahalliy qonunchilik ushbu siyosatdan boshqacha natijani talab qilsa, mahalliy qonunchilik ustuvor bo‘ladi.

## 10. Aloqa
Ushbu Mablag‘ni qaytarish siyosati yoki Docito obuna billing savollari bo‘yicha **${SUPPORT_EMAIL}** manziliga yozing.

Davolash/xizmat bo‘yicha qaytarish so‘rovlari uchun bron yoki chekda ko‘rsatilgan mas’ul shifokor / muassasaga murojaat qiling.
`;

const ARABIC_MARKDOWN = `# سياسة الاسترداد

## 1. نطاق سياسة الاسترداد هذه
توضح سياسة الاسترداد هذه كيفية التعامل مع طلبات الاسترداد المتعلقة بـ:

- **اشتراكات Docito** (بما في ذلك اشتراكات الجهات وخطط المنصة المتكررة)، و
- **المدفوعات الخاصة بالطب عن بُعد / الاستشارات المباشرة عبر Docito** عندما تتم معالجة الدفع داخل منصة Docito.

Docito هي منصة تقنية تربط المرضى والأطباء والجهات الصحية (العيادات والمختبرات ومراكز التصوير والصيدليات). وفي كثير من الخدمات الصحية، يكون **الطبيب المعالج أو الجهة المسؤولة** هو مقدم الخدمة ويتحمل مسؤولية تقديم الخدمة واتخاذ قرار الاسترداد وفقًا للقانون المعمول به.

## 2. استرداد الاشتراكات (اشتراكات منصة Docito)

### 2.1 لا يوجد استرداد بعد تحصيل رسوم الاشتراك
جميع الاشتراكات المدفوعة في Docito **غير قابلة للاسترداد** بعد تحصيل الرسوم، إلا إذا كان القانون يلزم بخلاف ذلك.

### 2.2 فترة تجريبية مجانية لمدة 14 يومًا قبل الفوترة
يوفر Docito **فترة تجريبية مجانية لمدة 14 يومًا** (عند توفرها) حتى يتمكن المستخدم من تقييم المنصة قبل الدفع.

يمكن للمستخدم إلغاء الاشتراك خلال الفترة التجريبية قبل انتهائها لتجنب تحصيل الرسوم.

### 2.3 استمرار الوصول طوال الفترة المدفوعة
إذا تم تحصيل رسوم الاشتراك بالفعل، فسيظل للمستخدم حق الوصول إلى الميزات المشترَك بها **حتى نهاية فترة الفوترة المدفوعة** (مثل شهرية أو سنوية)، ما لم يتم تعليق الحساب أو إنهاؤه بموجب شروط الخدمة أو القانون.

### 2.4 لا توجد استردادات نسبية
لا تقدم Docito استردادات نسبية/جزئية عن الوقت غير المستخدم من الاشتراك أو تخفيض الخطة أو الإلغاء المبكر بعد بدء الفترة المدفوعة، إلا إذا كان القانون يفرض ذلك.

## 3. مدفوعات المرضى للأطباء / الجهات على المنصة

### 3.1 من المسؤول عن الاسترداد
إذا قام المريض بدفع مبلغ لطبيب أو جهة صحية عبر Docito مقابل استشارة أو علاج، فإن **الطبيب / الجهة المسؤولة** (وليس Docito) هي المسؤولة عن تقرير وإصدار أي استرداد، وفقًا للقانون المعمول به والشروط المعروضة عند الحجز/الدفع.

### 3.2 أهلية الاسترداد (إذا لم تُنفذ الخدمة/العلاج)
كقاعدة عامة على المنصة، قد يتم النظر في الاسترداد من قبل الطبيب / الجهة المسؤولة **فقط إذا لم يتم تنفيذ العلاج/الخدمة**.

ويتم تحديد الأهلية النهائية ومبلغ الاسترداد من قبل الطبيب / الجهة المسؤولة وفقًا للقانون المعمول به والوثائق الطبية وظروف الحالة.

### 3.3 اقتطاعات غير قابلة للاسترداد (رسوم المعاملات والضرائب)
عندما تتم معالجة الدفع عبر Docito، يجوز للطبيب / الجهة المسؤولة رفض رد (أو خصم) المبالغ التي فُقدت بشكل غير قابل للاسترداد بسبب:

- رسوم بوابة / مزود الدفع،
- الرسوم البنكية،
- رسوم معالجة الدفع،
- الضرائب والرسوم الإلزامية المشابهة،
- تكاليف تحويل العملات أو التحويلات،

وذلك بقدر ما تكون هذه المبالغ قد تم تكبدها فعلًا وغير قابلة للاسترداد ويجيزها القانون.

## 4. المدفوعات النقدية أو المدفوعات خارج Docito
إذا تم الدفع **نقدًا** أو عبر **أي مزود دفع أو تحويل بنكي أو محفظة أو وسيلة أخرى خارج Docito**، فإن:

- **Docito غير مسؤول** عن هذا الدفع،
- **Docito لا يمكنه إصدار أو ضمان أي استرداد** لهذا الدفع،
- يجب تسوية طلب الاسترداد مباشرة مع الطبيب / العيادة / الجهة التي استلمت المبلغ.

## 5. تكاليف الأدوات والمستلزمات في الطب عن بُعد / الاستشارات المباشرة (للمدفوعات المعالجة عبر Docito فقط)
بالنسبة إلى **الاستشارات الطبية عن بُعد / الاستشارات المباشرة التي تتم داخل Docito**، وإذا تمت معالجة الدفع عبر Docito، فقد يكون للطبيب / الجهة المسؤولة الحق (وفقًا لما يسمح به القانون) في **حجز أو خصم جزء من المبلغ** الذي تم إنفاقه بالفعل على المرافق أو الأدوات أو المستهلكات أو التحضير أو غيرها من المصروفات المعقولة المتعلقة بعلاج/استشارة المريض.

ينطبق هذا القسم **فقط** على حالات:

- استشارات الطب عن بُعد،
- الاستشارات المباشرة،
- الجلسات عن بُعد،

التي تتم **داخل Docito** ويتم سدادها عبر مسارات الدفع المدعومة من Docito.

## 6. الزيارات الحضورية / المنزلية / المكتبية وغيرها من الخدمات غير المتصلة
بالنسبة لأي موعد أو خدمة **ليست** استشارة طب عن بُعد/استشارة مباشرة داخل Docito (بما في ذلك على سبيل المثال لا الحصر **الزيارات الحضورية، الزيارات المنزلية، الزيارات المكتبية/العيادية، الإجراءات السريرية، خدمات المختبر، خدمات التصوير، أو صرف الأدوية من الصيدلية**)، فإن **Docito غير مسؤول عن الاستردادات**.

أي قرار متعلق بالاسترداد أو إعادة الجدولة أو الاسترداد الجزئي أو عدم الاسترداد لهذه الخدمات يجب أن يتم التعامل معه مباشرة مع الطبيب / الجهة المسؤولة وفقًا لسياساتهم وطريقة الدفع المستخدمة والقانون المعمول به.

## 7. استرداد المدفوعات عبر البنك (Chargeback) والنزاعات
إذا بدأ المستخدم نزاعًا أو طلب استرجاع عبر البنك/جهة إصدار البطاقة/مزود الدفع، فقد تقدم Docito و/أو الطبيب/الجهة المسؤولة سجلات داعمة (حالة الموعد، الطوابع الزمنية، المراسلات، سجلات الخدمة حيث يسمح القانون، وسجلات الدفع) للرد على النزاع.

تقديم طلب Chargeback لا يعني تلقائيًا استحقاق الاسترداد.

## 8. كيفية طلب الاسترداد

### إذا كانت المشكلة تتعلق باشتراك Docito
- قم بإلغاء الاشتراك قبل نهاية الفترة التجريبية المجانية (14 يومًا) لتجنب تحصيل الرسوم.
- إذا تم تحصيل الرسوم بالفعل، يبقى الاشتراك نشطًا حتى نهاية الفترة المدفوعة.
- للأسئلة المتعلقة بالفوترة، تواصل مع دعم Docito عبر مركز المساعدة أو بيانات الاتصال الظاهرة على المنصة.

### إذا كانت المشكلة تتعلق بدفع لطبيب/جهة
- تواصل أولًا مباشرة مع الطبيب / العيادة / الجهة المسؤولة.
- قدّم رقم الموعد/الحجز، إيصال الدفع، التاريخ/الوقت، وسبب الطلب.
- إذا تم الحجز/الدفع عبر Docito، قد يساعد Docito في توجيه الطلب، لكن القرار النهائي بشأن الاسترداد يظل للطبيب/الجهة المسؤولة ما لم يفرض القانون خلاف ذلك.

## 9. ملاحظة قانونية مهمة
لا يوجد في سياسة الاسترداد هذه ما يحد من أي حقوق إلزامية غير قابلة للتنازل قد تكون لك بموجب قوانين حماية المستهلك أو الرعاية الصحية أو المدفوعات.

إذا تطلب القانون المحلي نتيجة مختلفة عن هذه السياسة، فإن القانون المعمول به هو الذي يسود.

## 10. التواصل
للاستفسارات بشأن سياسة الاسترداد هذه أو فوترة اشتراكات Docito، يرجى التواصل عبر **${SUPPORT_EMAIL}**.

وبالنسبة لطلبات استرداد رسوم العلاج/الخدمة، يُرجى التواصل مع الطبيب / الجهة المسؤولة الموضحة في الحجز أو الإيصال.
`;

const TURKISH_MARKDOWN = `# İade Politikası

## 1. Bu İade Politikasının Kapsamı
Bu İade Politikası, aşağıdakiler için iadelerin nasıl ele alındığını açıklar:

- **Docito abonelikleri** (kurum abonelikleri ve tekrarlayan platform planları dahil), ve
- ödemenin Docito platformu içinde işlendiği durumlarda **Docito üzerinden yapılan tele-tıp / canlı danışma ödemeleri**.

Docito; hastaları, doktorları ve sağlık kuruluşlarını (klinikler, laboratuvarlar, görüntüleme merkezleri, eczaneler) bir araya getiren bir teknoloji platformudur. Birçok sağlık hizmetinde **tedaviyi yapan doktor veya sorumlu kuruluş** hizmet sağlayıcıdır ve hizmetin sunulması ile hizmete ilişkin iade kararlarından, yürürlükteki hukuka tabi olarak, sorumludur.

## 2. Abonelik İadeleri (Docito platform abonelikleri)

### 2.1 Abonelik ücreti tahsil edildikten sonra iade yoktur
Docito’daki tüm ücretli abonelikler, yürürlükteki hukuk tarafından zorunlu tutulmadıkça, ücret tahsil edildikten sonra **iade edilmez**.

### 2.2 Faturalandırmadan önce 14 günlük ücretsiz deneme
Docito (sunulduğu yerlerde), kullanıcıların ödeme yapmadan önce platformu değerlendirebilmesi için **14 günlük ücretsiz deneme süresi** sunar.

Kullanıcılar, ücretlendirilmemek için deneme süresi bitmeden aboneliği iptal edebilir.

### 2.3 Ödenen dönem boyunca erişim devam eder
Abonelik ücreti tahsil edilmişse, kullanıcı hesabı Hizmet Şartları veya yürürlükteki hukuk uyarınca askıya alınmadıkça/sonlandırılmadıkça, kullanıcı **ödenen faturalandırma dönemi boyunca** (örneğin aylık veya yıllık dönem) abonelik özelliklerine erişmeye devam eder.

### 2.4 Orantılı/kısmi iade yoktur
Docito, yürürlükteki hukuk tarafından zorunlu tutulmadıkça, kullanılmayan abonelik süresi, plan düşürme veya ücretli dönem başladıktan sonra erken iptal için orantılı/kısmi iade sağlamaz.

## 3. Platformdaki Doktorlara / Kuruluşlara Yapılan Hasta Ödemeleri

### 3.1 İadeden kim sorumludur
Bir hasta, Docito üzerinden bir doktora veya sağlık kuruluşuna danışma ya da tedavi için ödeme yaparsa, herhangi bir iadenin değerlendirilmesi ve gerçekleştirilmesinden **sorumlu doktor / kuruluş** (Docito değil) sorumludur. Bu süreç, yürürlükteki hukuk ve rezervasyon/ödeme sırasında gösterilen şartlara tabidir.

### 3.2 İade uygunluğu (tedavi/hizmet sunulmadıysa)
Platformun genel kuralı olarak, bir iade yalnızca **tedavi/hizmet sunulmamışsa** sorumlu doktor / kuruluş tarafından değerlendirilebilir.

İade uygunluğu ve iade tutarına ilişkin nihai karar; yürürlükteki hukuk, tıbbi kayıtlar ve olayın koşullarına göre sorumlu doktor / kuruluş tarafından verilir.

### 3.3 İade edilmeyebilecek kesintiler (işlem ücretleri ve vergiler)
Ödeme Docito üzerinden işlendiğinde, sorumlu doktor / kuruluş aşağıdaki nedenlerle geri alınamayan tutarları iade etmeyi reddedebilir (veya iade tutarından düşebilir):

- ödeme sağlayıcısı / ağ geçidi işlem ücretleri,
- banka ücretleri,
- platform işlem/işleme ücretleri,
- vergiler, harçlar veya benzeri zorunlu ücretler,
- kur dönüşüm maliyetleri veya transfer ücretleri,

yalnızca bu tutarların fiilen oluşmuş, geri alınamayan nitelikte olması ve yürürlükteki hukukun izin vermesi şartıyla.

## 4. Nakit veya Docito Dışında Yapılan Ödemeler
Bir ödeme **nakit** olarak veya **Docito dışındaki herhangi bir ödeme sağlayıcısı, banka havalesi, cüzdan ya da başka bir yöntem** ile yapılmışsa:

- bu ödeme için **Docito sorumlu değildir**,
- **Docito bu ödeme için iade sağlayamaz veya garanti edemez**,
- iade talebi, ödemeyi alan doktor / klinik / kuruluş ile doğrudan çözülmelidir.

## 5. Tele-tıp / Canlı Danışma Araç ve Giderleri (yalnızca Docito üzerinden işlenen ödemeler)
**Docito içinde gerçekleştirilen tele-tıp / canlı danışmalar** için, ödeme Docito üzerinden işlendiğinde, sorumlu doktor / kuruluş (yürürlükteki hukukun izin verdiği ölçüde) hastanın tedavisi/danışması için makul şekilde katlanılmış ve önceden harcanmış altyapı, araç, sarf malzemesi, hazırlık veya diğer giderler için **ödemenin bir kısmını kesme veya alıkoyma** hakkına sahip olabilir.

Bu bölüm **yalnızca** aşağıdaki durumlar için geçerlidir:

- tele-tıp danışmaları,
- canlı danışmalar,
- uzaktan oturumlar,

ve bunların **Docito içinde** gerçekleştirilmiş ve Docito destekli ödeme akışları üzerinden ödenmiş olması gerekir.

## 6. Fiziksel / Ev / Ofis Ziyaretleri ve Diğer Çevrimdışı Hizmetler
Bir randevu veya hizmet **Docito tele-tıp/canlı danışması değilse** (bunlarla sınırlı olmamak üzere **fiziksel ziyaretler, ev ziyaretleri, ofis/klinik ziyaretleri, klinik işlemler, laboratuvar hizmetleri, görüntüleme hizmetleri veya eczane hizmetleri** dahil), **Docito iadelerden sorumlu değildir**.

Bu tür hizmetlere ilişkin her türlü iade, yeniden planlama, kısmi iade veya iadesizlik kararı; ilgili doktor / kuruluş tarafından kendi politikalarına, kullanılan ödeme yöntemine ve yürürlükteki hukuka göre doğrudan yönetilmelidir.

## 7. Chargeback ve Ödeme Uyuşmazlıkları
Bir kullanıcı banka/kart kuruluşu/ödeme sağlayıcısı üzerinden chargeback veya ödeme uyuşmazlığı başlatırsa, Docito ve/veya sorumlu doktor/kuruluş uyuşmazlığa yanıt vermek için destekleyici kayıtları (randevu durumu, zaman damgaları, iletişim kayıtları, hukuken izin verilen hallerde hizmet kayıtları ve ödeme kayıtları) sağlayabilir.

Chargeback başlatılması, ödemenin otomatik olarak iade edilebilir olduğu anlamına gelmez.

## 8. İade Nasıl Talep Edilir

### Sorununuz Docito aboneliği ile ilgiliyse
- Ücret alınmasını önlemek için aboneliğinizi 14 günlük ücretsiz deneme süresi bitmeden iptal edin.
- Zaten ücret tahsil edildiyse aboneliğiniz, ödenen dönem sonuna kadar aktif kalır.
- Faturalandırma soruları için Yardım Merkezi veya platformda belirtilen yasal/destek iletişim bilgileri üzerinden Docito desteğe ulaşın.

### Sorununuz doktor/kuruluş ödemesi ile ilgiliyse
- Önce doğrudan ilgili doktor / klinik / kuruluş ile iletişime geçin.
- Randevu ID’si, ödeme makbuzu, tarih/saat ve talep nedenini paylaşın.
- Rezervasyon/ödeme Docito üzerinden yapıldıysa, Docito talebin yönlendirilmesine yardımcı olabilir; ancak yürürlükteki hukuk aksini gerektirmedikçe nihai iade kararı sorumlu doktor/kuruluşa aittir.

## 9. Önemli Hukuki Not
Bu İade Politikasındaki hiçbir hüküm, tüketici koruma, sağlık veya ödeme mevzuatı kapsamında sahip olabileceğiniz devredilemez/yasayla korunmuş hakları sınırlamaz.

Yerel hukuk bu politikadan farklı bir sonuç gerektiriyorsa, yürürlükteki hukuk üstün gelir.

## 10. İletişim
Bu İade Politikası veya Docito abonelik faturalandırması hakkında sorularınız için **${SUPPORT_EMAIL}** adresi üzerinden bizimle iletişime geçin.

Tedavi/hizmet iade talepleri için lütfen rezervasyonunuzda veya makbuzunuzda belirtilen sorumlu doktor / kuruluş ile iletişime geçin.
`;

const GERMAN_MARKDOWN = `# Rückerstattungsrichtlinie

## 1. Geltungsbereich dieser Rückerstattungsrichtlinie
Diese Rückerstattungsrichtlinie erklärt, wie Rückerstattungen behandelt werden für:

- **Docito-Abonnements** (einschließlich Unternehmensabonnements und wiederkehrender Plattformpläne), und
- **Zahlungen für Telemedizin-/Live-Konsultationen über Docito**, wenn die Zahlung innerhalb der Docito-Plattform verarbeitet wurde.

Docito ist eine Technologieplattform, die Patient:innen, Ärzt:innen und Gesundheitseinrichtungen (Kliniken, Labore, Bildgebungszentren, Apotheken) verbindet. Bei vielen Gesundheitsleistungen ist **die behandelnde Ärztin/der behandelnde Arzt oder die verantwortliche Einrichtung** die leistungserbringende Partei und für die Leistungserbringung sowie Entscheidungen zu servicebezogenen Rückerstattungen verantwortlich, vorbehaltlich des anwendbaren Rechts.

## 2. Rückerstattungen für Abonnements (Docito-Plattformabonnements)

### 2.1 Keine Rückerstattung nach Belastung einer Abonnementzahlung
Alle kostenpflichtigen Docito-Abonnements sind nach Belastung **nicht erstattungsfähig**, sofern das anwendbare Recht nichts anderes vorschreibt.

### 2.2 14-tägige kostenlose Testphase vor der Abrechnung
Docito bietet (soweit verfügbar) eine **14-tägige kostenlose Testphase**, damit Nutzer:innen die Plattform vor einer Zahlung testen können.

Während der Testphase kann das Abonnement vor Ablauf der Testphase gekündigt werden, um eine Belastung zu vermeiden.

### 2.3 Zugang bleibt für den bezahlten Zeitraum aktiv
Wenn eine Abonnementzahlung bereits belastet wurde, bleibt der Zugang zu den gebuchten Produktfunktionen **für die Dauer des bezahlten Abrechnungszeitraums** (z. B. monatlich oder jährlich) bestehen, sofern das Konto nicht gemäß Nutzungsbedingungen oder anwendbarem Recht gesperrt oder beendet wird.

### 2.4 Keine anteiligen Rückerstattungen
Docito bietet keine anteiligen oder teilweisen Rückerstattungen für ungenutzte Abonnementzeit, Downgrades oder vorzeitige Kündigungen nach Beginn eines bezahlten Zeitraums, sofern dies nicht gesetzlich vorgeschrieben ist.

## 3. Patientenzahlungen an Ärzt:innen / Einrichtungen auf der Plattform

### 3.1 Wer für die Rückerstattung verantwortlich ist
Wenn eine Patientin/ein Patient über Docito eine Ärztin/einen Arzt oder eine Gesundheitseinrichtung für eine Beratung oder Behandlung bezahlt, ist **die verantwortliche Ärztin/der verantwortliche Arzt bzw. die Einrichtung** (nicht Docito) für die Entscheidung und Durchführung einer Rückerstattung verantwortlich, vorbehaltlich des anwendbaren Rechts und der bei Buchung/Checkout angezeigten Bedingungen.

### 3.2 Erstattungsfähigkeit (wenn Behandlung/Dienstleistung nicht durchgeführt wurde)
Als allgemeine Plattformregel kann eine Rückerstattung von der verantwortlichen Ärztin/dem verantwortlichen Arzt bzw. der Einrichtung **nur dann geprüft werden, wenn die Behandlung/Dienstleistung nicht durchgeführt wurde**.

Die endgültige Erstattungsfähigkeit und die Höhe einer Rückerstattung werden von der verantwortlichen Ärztin/dem verantwortlichen Arzt bzw. der Einrichtung unter Berücksichtigung des anwendbaren Rechts, der medizinischen Dokumentation und der Umstände des Einzelfalls bestimmt.

### 3.3 Nicht erstattungsfähige Abzüge (Transaktionsgebühren und Steuern)
Wurde eine Zahlung über Docito verarbeitet, kann die verantwortliche Ärztin/der verantwortliche Arzt bzw. die Einrichtung Beträge nicht erstatten (oder vom Erstattungsbetrag abziehen), die unwiderruflich verloren gingen aufgrund von:

- Zahlungsanbieter-/Gateway-Transaktionsgebühren,
- Bankgebühren,
- Plattform-Verarbeitungsgebühren,
- Steuern, Abgaben oder ähnlichen verpflichtenden Gebühren,
- Währungsumrechnungs- oder Überweisungsgebühren,

soweit diese Beträge tatsächlich angefallen, nicht rückholbar und nach anwendbarem Recht zulässig sind.

## 4. Barzahlungen oder Zahlungen außerhalb von Docito
Wurde eine Zahlung **in bar** oder über **einen Zahlungsdienst, eine Banküberweisung, Wallet oder eine andere Methode außerhalb von Docito** vorgenommen, dann gilt:

- **Docito ist für diese Zahlung nicht verantwortlich**,
- **Docito kann für diese Zahlung keine Rückerstattung ausstellen oder garantieren**, und
- jeder Rückerstattungsantrag muss direkt mit der Ärztin/dem Arzt, der Klinik oder der Einrichtung geklärt werden, die die Zahlung erhalten hat.

## 5. Kosten für Telemedizin-/Live-Konsultation (nur bei über Docito verarbeiteten Zahlungen)
Für **Telemedizin-/Live-Konsultationen, die in Docito durchgeführt werden**, kann die verantwortliche Ärztin/der verantwortliche Arzt bzw. die Einrichtung, wenn die Zahlung über Docito verarbeitet wurde, vorbehaltlich des anwendbaren Rechts das Recht haben, **einen Teil der Zahlung einzubehalten oder abzuziehen**, der bereits für Versorgungskosten, Tools, Verbrauchsmaterialien, Vorbereitung oder andere angemessene Aufwendungen für die Behandlung/Konsultation der Patientin/des Patienten verwendet wurde.

Dieser Abschnitt gilt **nur** für:

- Telemedizin-Konsultationen,
- Live-Konsultationen,
- Remote-Sitzungen,

die **in Docito** durchgeführt und über von Docito unterstützte Zahlungsabläufe bezahlt wurden.

## 6. Physische / Haus- / Praxisbesuche und andere Offline-Leistungen
Für Termine oder Leistungen, die **keine** Telemedizin-/Live-Konsultationen in Docito sind (einschließlich, aber nicht beschränkt auf **physische Besuche, Hausbesuche, Praxis-/Klinikbesuche, klinische Eingriffe, Laborleistungen, Bildgebungsleistungen oder Apothekenabgaben**), ist **Docito nicht für Rückerstattungen verantwortlich**.

Jede Entscheidung über Rückerstattung, Umbuchung, Teilrückerstattung oder Nicht-Erstattung für solche Leistungen muss direkt von der verantwortlichen Ärztin/dem verantwortlichen Arzt bzw. der Einrichtung nach deren Richtlinien, der verwendeten Zahlungsmethode und dem anwendbaren Recht getroffen werden.

## 7. Chargebacks und Zahlungsstreitigkeiten
Wenn ein:e Nutzer:in ein Chargeback oder eine Zahlungsstreitigkeit bei einer Bank/Kartenausgeberin/einem Kartenausgeber/Zahlungsanbieter einleitet, können Docito und/oder die verantwortliche Ärztin/der verantwortliche Arzt bzw. die Einrichtung unterstützende Nachweise (Terminstatus, Zeitstempel, Kommunikation, Servicelogs soweit rechtlich zulässig und Zahlungsaufzeichnungen) zur Antwort auf die Streitigkeit bereitstellen.

Die Einleitung eines Chargebacks führt nicht automatisch zu einem Anspruch auf Rückerstattung.

## 8. So beantragen Sie eine Rückerstattung

### Wenn Ihr Anliegen ein Docito-Abonnement betrifft
- Kündigen Sie das Abonnement vor Ablauf der 14-tägigen kostenlosen Testphase, um eine Belastung zu vermeiden.
- Wenn bereits belastet wurde, bleibt Ihr Abonnement bis zum Ende des bezahlten Zeitraums aktiv.
- Bei Fragen zur Abrechnung wenden Sie sich über das Help Center oder die auf der Plattform angezeigten Legal-/Support-Kontaktdaten an den Docito-Support.

### Wenn Ihr Anliegen eine Zahlung an Ärzt:innen/Einrichtungen betrifft
- Kontaktieren Sie zuerst direkt die verantwortliche Ärztin/den verantwortlichen Arzt, die Klinik oder Einrichtung.
- Geben Sie Termin-ID, Zahlungsbeleg, Datum/Uhrzeit und den Grund der Anfrage an.
- Wenn Buchung/Zahlung über Docito erfolgt ist, kann Docito bei der Weiterleitung der Anfrage unterstützen; die endgültige Erstattungsentscheidung verbleibt jedoch bei der verantwortlichen Ärztin/dem verantwortlichen Arzt bzw. der Einrichtung, sofern das anwendbare Recht nichts anderes verlangt.

## 9. Wichtiger rechtlicher Hinweis
Nichts in dieser Rückerstattungsrichtlinie schränkt unverzichtbare Rechte ein, die Ihnen nach anwendbarem Verbraucher-, Gesundheits- oder Zahlungsrecht zustehen können.

Wenn lokales Recht ein anderes Ergebnis als diese Richtlinie verlangt, hat das anwendbare Recht Vorrang.

## 10. Kontakt
Bei Fragen zu dieser Rückerstattungsrichtlinie oder zur Abrechnung von Docito-Abonnements kontaktieren Sie bitte **${SUPPORT_EMAIL}**.

Bei Rückerstattungsanfragen zu Behandlung/Dienstleistung wenden Sie sich bitte an die verantwortliche Ärztin/den verantwortlichen Arzt bzw. die Einrichtung, die in Ihrer Buchung oder Quittung angegeben ist.
`;

const SPANISH_MARKDOWN = `# Política de reembolso

## 1. Alcance de esta Política de reembolso
Esta Política de reembolso explica cómo se gestionan los reembolsos para:

- **suscripciones de Docito** (incluidas suscripciones de entidades y planes recurrentes de la plataforma), y
- **pagos por telemedicina / consultas en vivo a través de Docito** cuando el pago se procesa dentro de la plataforma Docito.

Docito es una plataforma tecnológica que conecta pacientes, médicos y entidades de salud (clínicas, laboratorios, centros de imagen y farmacias). En muchos servicios de salud, **el médico tratante o la entidad responsable** es el proveedor del servicio y es responsable de la prestación del servicio y de las decisiones de reembolso relacionadas con el servicio, sujeto a la legislación aplicable.

## 2. Reembolsos de suscripciones (suscripciones de la plataforma Docito)

### 2.1 No hay reembolso después de que se cobre una suscripción
Todas las suscripciones pagadas en Docito **no son reembolsables** una vez cobradas, salvo que la ley aplicable exija lo contrario.

### 2.2 Prueba gratuita de 14 días antes de la facturación
Docito ofrece (cuando corresponda) un **período de prueba gratuito de 14 días** para que los usuarios evalúen la plataforma antes de pagar.

Durante la prueba gratuita, los usuarios pueden cancelar la suscripción antes de que termine el período de prueba para evitar el cobro.

### 2.3 El acceso permanece activo durante el período pagado
Si el pago de la suscripción ya fue cobrado, el usuario seguirá teniendo acceso a las funciones del producto suscrito **durante el período de facturación pagado** (por ejemplo, mensual o anual), salvo que la cuenta sea suspendida o terminada conforme a los Términos del Servicio o la ley aplicable.

### 2.4 No hay reembolsos prorrateados
Docito no ofrece reembolsos prorrateados o parciales por tiempo de suscripción no utilizado, cambios a un plan inferior o cancelación anticipada después de que haya comenzado un período pagado, salvo que la ley lo exija.

## 3. Pagos de pacientes a médicos / entidades en la plataforma

### 3.1 Quién es responsable del reembolso
Si un paciente paga a un médico o entidad de salud a través de Docito por una consulta o tratamiento, **el médico / entidad responsable** (y no Docito) es quien decide y emite cualquier reembolso, sujeto a la ley aplicable y a los términos mostrados al reservar/pagar.

### 3.2 Elegibilidad de reembolso (si el tratamiento/servicio no se realizó)
Como regla general de la plataforma, un reembolso podrá ser considerado por el médico / entidad responsable **solo si el tratamiento/servicio no fue realizado**.

La elegibilidad final y el monto del reembolso son determinados por el médico / entidad responsable de acuerdo con la ley aplicable, la documentación médica y las circunstancias del caso.

### 3.3 Deducciones no reembolsables (comisiones y impuestos)
Cuando el pago fue procesado a través de Docito, el médico / entidad responsable puede negarse a reembolsar (o puede deducir del monto reembolsado) cualquier cantidad que se haya perdido de forma irreversible debido a:

- comisiones del procesador/pasarela de pago,
- cargos bancarios,
- cargos de procesamiento de la plataforma,
- impuestos, tasas u otros cargos obligatorios similares,
- costos de conversión de moneda o transferencias,

en la medida en que dichos importes hayan sido efectivamente incurridos, no sean recuperables y estén permitidos por la ley aplicable.

## 4. Pagos en efectivo o fuera de Docito
Si un pago se realizó **en efectivo** o mediante **cualquier procesador de pago, transferencia bancaria, billetera o método fuera de Docito**, entonces:

- **Docito no es responsable** de ese pago,
- **Docito no puede emitir ni garantizar ningún reembolso** de ese pago, y
- cualquier solicitud de reembolso debe resolverse directamente con el médico / clínica / entidad que recibió el pago.

## 5. Costos de herramientas y gastos en telemedicina / consulta en vivo (solo pagos procesados por Docito)
Para **telemedicina / consultas en vivo realizadas dentro de Docito**, si el pago fue procesado a través de Docito, el médico / entidad responsable puede tener derecho (sujeto a la ley aplicable) a **retener o deducir parte del pago** que ya se haya gastado en servicios, herramientas, consumibles, preparación u otros gastos razonables incurridos para el tratamiento/consulta del paciente.

Esta sección aplica **únicamente** a casos de:

- consultas de telemedicina,
- consultas en vivo,
- sesiones remotas,

que se realicen **dentro de Docito** y se paguen mediante flujos de pago compatibles con Docito.

## 6. Visitas físicas / a domicilio / en consultorio y otros servicios fuera de línea
Para cualquier cita o servicio que **no** sea una telemedicina/consulta en vivo de Docito (incluyendo, entre otros, **visitas físicas, visitas a domicilio, visitas en consultorio/centro, procedimientos clínicos, servicios de laboratorio, servicios de imagen o dispensación en farmacia**), **Docito no es responsable de los reembolsos**.

Cualquier decisión sobre reembolso, reprogramación, reembolso parcial o no reembolso para dichos servicios debe ser gestionada directamente por el médico / entidad responsable según sus propias políticas, el método de pago utilizado y la ley aplicable.

## 7. Contracargos y disputas de pago
Si un usuario inicia un contracargo o disputa de pago con un banco/emisor de tarjeta/proveedor de pagos, Docito y/o el médico/entidad responsable pueden proporcionar registros de respaldo (estado de la cita, marcas de tiempo, comunicaciones, registros del servicio cuando lo permita la ley y registros de pago) para responder a la disputa.

Presentar un contracargo no convierte automáticamente un pago en reembolsable.

## 8. Cómo solicitar un reembolso

### Si su problema es una suscripción de Docito
- Cancele la suscripción antes de que finalice la prueba gratuita de 14 días para evitar cargos.
- Si ya se le cobró, su suscripción permanecerá activa hasta el final del período pagado.
- Para preguntas de facturación, contacte al soporte de Docito a través del Centro de ayuda o de los datos de contacto legales/soporte mostrados en la plataforma.

### Si su problema es un pago a un médico/entidad
- Contacte primero directamente al médico / clínica / entidad responsable.
- Proporcione el ID de la cita, comprobante de pago, fecha/hora y el motivo de la solicitud.
- Si la reserva/pago se realizó a través de Docito, Docito puede ayudar a canalizar la solicitud, pero la decisión final de reembolso permanece con el médico/entidad responsable salvo que la ley aplicable exija lo contrario.

## 9. Nota legal importante
Nada de lo establecido en esta Política de reembolso limita derechos irrenunciables que usted pueda tener conforme a las leyes aplicables de protección al consumidor, salud o pagos.

Si la legislación local exige un resultado distinto al de esta política, prevalecerá la ley aplicable.

## 10. Contacto
Para preguntas sobre esta Política de reembolso o la facturación de suscripciones de Docito, contacte a **${SUPPORT_EMAIL}**.

Para solicitudes de reembolso por tratamiento/servicio, contacte al médico / entidad responsable que figure en su reserva o recibo.
`;

const PORTUGUESE_MARKDOWN = `# Política de reembolso

## 1. Escopo desta Política de reembolso
Esta Política de reembolso explica como os reembolsos são tratados para:

- **assinaturas do Docito** (incluindo assinaturas de entidades e planos recorrentes da plataforma), e
- **pagamentos por telemedicina / consultas ao vivo através do Docito** quando o pagamento é processado dentro da plataforma Docito.

O Docito é uma plataforma tecnológica que conecta pacientes, médicos e entidades de saúde (clínicas, laboratórios, centros de imagem e farmácias). Em muitos serviços de saúde, **o médico responsável pelo atendimento ou a entidade responsável** é o prestador do serviço e responde pela prestação do serviço e pelas decisões de reembolso relacionadas ao serviço, sujeito à legislação aplicável.

## 2. Reembolsos de assinaturas (assinaturas da plataforma Docito)

### 2.1 Não há reembolso após a cobrança da assinatura
Todas as assinaturas pagas no Docito **não são reembolsáveis** após a cobrança, salvo se a legislação aplicável exigir o contrário.

### 2.2 Teste gratuito de 14 dias antes da cobrança
O Docito oferece (quando aplicável) um **período de teste gratuito de 14 dias** para que os usuários possam avaliar a plataforma antes do pagamento.

Durante o teste gratuito, os usuários podem cancelar a assinatura antes do fim do período de teste para evitar cobrança.

### 2.3 O acesso permanece ativo durante o período pago
Se a cobrança da assinatura já tiver sido realizada, o usuário continuará tendo acesso aos recursos do produto contratado **durante o período de faturamento pago** (por exemplo, mensal ou anual), salvo se a conta for suspensa ou encerrada de acordo com os Termos de Serviço ou a legislação aplicável.

### 2.4 Não há reembolsos proporcionais
O Docito não oferece reembolsos proporcionais ou parciais por tempo de assinatura não utilizado, downgrade de plano ou cancelamento antecipado após o início de um período pago, salvo se exigido por lei.

## 3. Pagamentos de pacientes a médicos / entidades na plataforma

### 3.1 Quem é responsável pelo reembolso
Se um paciente pagar um médico ou entidade de saúde através do Docito por uma consulta ou tratamento, **o médico / entidade responsável** (e não o Docito) será responsável por decidir e emitir qualquer reembolso, sujeito à legislação aplicável e aos termos exibidos no agendamento/checkout.

### 3.2 Elegibilidade para reembolso (tratamento/serviço não realizado)
Como regra geral da plataforma, um reembolso poderá ser considerado pelo médico / entidade responsável **somente se o tratamento/serviço não tiver sido realizado**.

A elegibilidade final e o valor do reembolso são determinados pelo médico / entidade responsável de acordo com a legislação aplicável, a documentação médica e as circunstâncias do caso.

### 3.3 Deduções não reembolsáveis (taxas de transação e impostos)
Quando o pagamento é processado por meio do Docito, o médico / entidade responsável pode recusar o reembolso (ou deduzir do valor reembolsado) qualquer valor que tenha sido perdido de forma irreversível devido a:

- taxas do processador/gateway de pagamento,
- tarifas bancárias,
- taxas de processamento da plataforma,
- impostos, tributos ou encargos obrigatórios semelhantes,
- custos de conversão de moeda ou transferência,

na medida em que tais valores tenham sido efetivamente incorridos, não sejam recuperáveis e sejam permitidos pela legislação aplicável.

## 4. Pagamentos em dinheiro ou fora do Docito
Se um pagamento foi feito **em dinheiro** ou por **qualquer processador de pagamento, transferência bancária, carteira digital ou método fora do Docito**, então:

- **o Docito não é responsável** por esse pagamento,
- **o Docito não pode emitir nem garantir qualquer reembolso** desse pagamento, e
- qualquer solicitação de reembolso deve ser resolvida diretamente com o médico / clínica / entidade que recebeu o pagamento.

## 5. Custos de ferramentas e despesas em telemedicina / consulta ao vivo (somente pagamentos processados pelo Docito)
Para **telemedicina / consultas ao vivo realizadas dentro do Docito**, se o pagamento tiver sido processado via Docito, o médico / entidade responsável poderá ter o direito (sujeito à legislação aplicável) de **reter ou deduzir parte do pagamento** já utilizado com serviços, ferramentas, consumíveis, preparação ou outras despesas razoáveis incorridas para o tratamento/consulta do paciente.

Esta seção se aplica **somente** a casos de:

- consultas de telemedicina,
- consultas ao vivo,
- sessões remotas,

realizadas **dentro do Docito** e pagas por fluxos de pagamento compatíveis com o Docito.

## 6. Visitas presenciais / domiciliares / em consultório e outros serviços offline
Para qualquer consulta ou serviço que **não** seja uma telemedicina/consulta ao vivo no Docito (incluindo, sem limitação, **visitas presenciais, visitas domiciliares, visitas em consultório/clínica, procedimentos clínicos, serviços laboratoriais, serviços de imagem ou dispensação em farmácia**), **o Docito não é responsável por reembolsos**.

Qualquer decisão sobre reembolso, reagendamento, reembolso parcial ou não reembolso desses serviços deve ser tratada diretamente pelo médico / entidade responsável de acordo com suas próprias políticas, o método de pagamento utilizado e a legislação aplicável.

## 7. Chargebacks e disputas de pagamento
Se um usuário iniciar um chargeback ou disputa de pagamento com banco/emissor do cartão/provedor de pagamento, o Docito e/ou o médico/entidade responsável poderão fornecer registros de suporte (status do agendamento, registros de data/hora, comunicações, logs de serviço quando legalmente permitido e registros de pagamento) para responder à disputa.

Abrir um chargeback não torna automaticamente um pagamento reembolsável.

## 8. Como solicitar um reembolso

### Se o seu problema for uma assinatura do Docito
- Cancele a assinatura antes do fim do teste gratuito de 14 dias para evitar cobrança.
- Se a cobrança já ocorreu, sua assinatura permanecerá ativa até o final do período pago.
- Para dúvidas de faturamento, contate o suporte do Docito pelo Centro de Ajuda ou pelos contatos jurídicos/suporte exibidos na plataforma.

### Se o seu problema for um pagamento a médico/entidade
- Entre primeiro em contato diretamente com o médico / clínica / entidade responsável.
- Informe o ID do agendamento, comprovante de pagamento, data/hora e o motivo da solicitação.
- Se o agendamento/pagamento foi feito via Docito, o Docito poderá ajudar a encaminhar a solicitação, mas a decisão final de reembolso permanece com o médico/entidade responsável, salvo se a legislação aplicável exigir o contrário.

## 9. Nota legal importante
Nada nesta Política de reembolso limita quaisquer direitos irrenunciáveis que você possa ter de acordo com leis aplicáveis de defesa do consumidor, saúde ou pagamentos.

Se a legislação local exigir um resultado diferente desta política, prevalecerá a legislação aplicável.

## 10. Contato
Para dúvidas sobre esta Política de reembolso ou sobre faturamento de assinaturas do Docito, entre em contato com **${SUPPORT_EMAIL}**.

Para solicitações de reembolso de tratamento/serviço, entre em contato com o médico / entidade responsável indicado(a) no seu agendamento ou recibo.
`;

const JAPANESE_MARKDOWN = `# 返金ポリシー

## 1. 本返金ポリシーの適用範囲
本返金ポリシーは、以下に関する返金の取り扱いを説明します。

- **Docitoのサブスクリプション**（事業者向けサブスクリプションおよび継続課金プランを含む）
- **Docitoを通じた遠隔医療／ライブ相談の支払い**（支払いがDocitoプラットフォーム内で処理された場合）

Docitoは、患者、医師、および医療機関（クリニック、検査機関、画像診断センター、薬局）をつなぐテクノロジープラットフォームです。多くの医療サービスにおいて、**治療を担当する医師または責任ある医療機関**がサービス提供者であり、適用法に従って、治療提供およびサービスに関する返金判断に責任を負います。

## 2. サブスクリプションの返金（Docitoプラットフォームのサブスクリプション）

### 2.1 サブスクリプション料金の請求後は返金不可
Docito上の有料サブスクリプションは、適用法で別途定めがある場合を除き、**請求完了後は返金不可**です。

### 2.2 課金前の14日間無料トライアル
Docitoでは（提供される場合）、ユーザーが支払い前にプラットフォームを評価できるよう、**14日間の無料トライアル期間**を提供します。

無料トライアル期間中は、トライアル終了前にサブスクリプションを解約することで、課金を回避できます。

### 2.3 支払い済み期間中は利用可能
サブスクリプション料金がすでに請求されている場合、ユーザーは、利用規約または適用法に基づきアカウントが停止・終了されない限り、**支払い済みの請求期間（例：月額または年額）中**は契約した機能を利用できます。

### 2.4 日割り・部分返金なし
Docitoは、未使用のサブスクリプション期間、ダウングレード、または有料期間開始後の早期解約について、法律で義務付けられる場合を除き、日割りまたは部分返金を行いません。

## 3. プラットフォーム上の医師／医療機関への患者支払い

### 3.1 返金責任者
患者がDocitoを通じて医師または医療機関に診療・治療費を支払った場合、返金の判断および実行は、適用法および予約／決済時に表示される条件に従い、**責任ある医師／医療機関**（Docitoではありません）が行います。

### 3.2 返金対象（治療／サービスが実施されていない場合）
プラットフォーム上の一般ルールとして、返金は、**治療／サービスが実施されていない場合に限り**、責任ある医師／医療機関により検討されることがあります。

最終的な返金可否および返金額は、適用法、医療記録、および個別事情に基づき、責任ある医師／医療機関が決定します。

### 3.3 返金対象外の控除（手数料・税金）
支払いがDocitoを通じて処理された場合、責任ある医師／医療機関は、以下により不可逆的に失われた金額について、返金を拒否する、または返金額から控除することがあります（適用法で認められる範囲）。

- 決済代行／ゲートウェイ手数料
- 銀行手数料
- プラットフォーム処理手数料
- 税金、租税、公課その他の法定費用
- 為替手数料または送金手数料

これらは、実際に発生し、回収不能である範囲に限ります。

## 4. 現金払いまたはDocito外での支払い
支払いが**現金**または**Docito外の決済代行業者、銀行振込、ウォレット、その他の方法**で行われた場合は、以下のとおりです。

- **Docitoは当該支払いについて責任を負いません**
- **Docitoは当該支払いの返金を実行または保証できません**
- 返金請求は、支払いを受領した医師／クリニック／医療機関と直接解決してください

## 5. 遠隔医療／ライブ相談における設備・ツール等の費用（Docito処理決済のみ）
**Docito内で実施された遠隔医療／ライブ相談**について、支払いがDocito経由で処理された場合、責任ある医師／医療機関は、適用法で認められる範囲で、患者の診療／相談のためにすでに合理的に支出された設備費、ツール、消耗品、準備費用、その他の費用に相当する金額を、**支払額から一部留保または控除**できる場合があります。

本項は、以下の場合に**のみ**適用されます。

- 遠隔医療相談
- ライブ相談
- リモートセッション

かつ、これらが**Docito内で実施**され、Docito対応の決済フローで支払われた場合に限ります。

## 6. 対面診療／往診／院内診療およびその他オフラインサービス
Docitoの遠隔医療／ライブ相談に該当しない予約またはサービス（例として、**対面診療、往診、院内／クリニック受診、処置、検査サービス、画像診断サービス、薬局での調剤**等を含みますがこれらに限りません）については、**Docitoは返金に責任を負いません**。

これらのサービスに関する返金、再予約、部分返金、返金不可の判断は、責任ある医師／医療機関が、自らのポリシー、使用された支払い方法、および適用法に従って直接対応するものとします。

## 7. チャージバックおよび支払い紛争
ユーザーが銀行／カード発行会社／決済事業者に対してチャージバックまたは支払い紛争を申し立てた場合、Docitoおよび／または責任ある医師／医療機関は、紛争対応のために、予約ステータス、タイムスタンプ、通信記録、（法的に許される範囲での）サービスログ、および支払い記録等の資料を提出することがあります。

チャージバックの申し立てにより、自動的に返金対象となるわけではありません。

## 8. 返金の申請方法

### 問題がDocitoサブスクリプションに関する場合
- 課金を回避するには、14日間の無料トライアル終了前にサブスクリプションを解約してください。
- すでに課金されている場合、サブスクリプションは支払い済み期間の終了まで有効です。
- 請求に関するお問い合わせは、ヘルプセンターまたはプラットフォーム上の法務／サポート連絡先からDocitoサポートへご連絡ください。

### 問題が医師／医療機関への支払いに関する場合
- まず、責任ある医師／クリニック／医療機関へ直接ご連絡ください。
- 予約ID、支払い領収書、日時、申請理由を提示してください。
- 予約／支払いがDocito経由で行われた場合、Docitoは申請の取り次ぎを支援することがありますが、最終的な返金判断は、適用法で別段の定めがない限り、責任ある医師／医療機関にあります。

## 9. 重要な法的注意
本返金ポリシーのいかなる規定も、消費者保護法、医療法、決済関連法等に基づく放棄不能な権利を制限するものではありません。

本ポリシーと現地法が抵触する場合は、適用法が優先されます。

## 10. お問い合わせ
本返金ポリシーまたはDocitoサブスクリプションの請求についてのお問い合わせは、**${SUPPORT_EMAIL}** までご連絡ください。

治療／サービスに関する返金申請については、予約または領収書に記載の責任ある医師／医療機関へご連絡ください。
`;

const KOREAN_MARKDOWN = `# 환불 정책

## 1. 본 환불 정책의 적용 범위
본 환불 정책은 다음에 대한 환불 처리 방식을 설명합니다.

- **Docito 구독**(기관 구독 및 반복 결제 플랫폼 플랜 포함)
- **Docito를 통한 원격의료 / 라이브 상담 결제**(결제가 Docito 플랫폼 내에서 처리된 경우)

Docito는 환자, 의사 및 의료기관(클리닉, 검사실, 영상센터, 약국)을 연결하는 기술 플랫폼입니다. 많은 의료 서비스에서 **진료를 담당한 의사 또는 책임 의료기관**이 실제 서비스 제공자이며, 관련 법령에 따라 진료 제공 및 서비스 수준의 환불 결정에 대한 책임을 집니다.

## 2. 구독 환불 (Docito 플랫폼 구독)

### 2.1 구독 결제 청구 후 환불 불가
Docito의 모든 유료 구독은 관련 법령에서 달리 요구하지 않는 한, 결제가 청구된 이후에는 **환불되지 않습니다**.

### 2.2 결제 전 14일 무료 체험
Docito는(제공되는 경우) 사용자가 결제 전에 플랫폼을 평가할 수 있도록 **14일 무료 체험 기간**을 제공합니다.

무료 체험 기간 중에는 체험 종료 전에 구독을 취소하여 청구를 피할 수 있습니다.

### 2.3 결제한 기간 동안 이용 가능
구독 결제가 이미 청구된 경우, 서비스 약관 또는 관련 법령에 따라 계정이 정지되거나 종료되지 않는 한, 사용자는 **결제한 청구 기간(예: 월간 또는 연간)** 동안 구독한 기능을 계속 이용할 수 있습니다.

### 2.4 일할/부분 환불 없음
Docito는 법령상 요구되는 경우를 제외하고, 미사용 구독 기간, 하위 플랜 변경, 또는 유료 기간 시작 후 조기 해지에 대해 일할 또는 부분 환불을 제공하지 않습니다.

## 3. 플랫폼 내 의사 / 기관에 대한 환자 결제

### 3.1 환불 책임 주체
환자가 Docito를 통해 의사 또는 의료기관에 상담/치료 비용을 지불한 경우, 환불 여부 결정 및 환불 실행의 책임은 관련 법령 및 예약/결제 시 표시된 조건에 따라 **책임 의사 / 기관**(Docito가 아님)에 있습니다.

### 3.2 환불 가능 요건 (치료/서비스 미이행)
플랫폼의 일반 원칙상, 환불은 **치료/서비스가 수행되지 않은 경우에 한해** 책임 의사 / 기관이 검토할 수 있습니다.

최종 환불 가능 여부 및 환불 금액은 관련 법령, 의료 문서, 개별 사정을 바탕으로 책임 의사 / 기관이 결정합니다.

### 3.3 환불 불가 공제 항목 (거래 수수료 및 세금)
결제가 Docito를 통해 처리된 경우, 책임 의사 / 기관은 다음 사유로 회수 불가능하게 소요된 금액에 대해 환불을 거부하거나(또는 환불액에서 공제할) 수 있습니다. 이는 관련 법령이 허용하는 범위 내에서만 적용됩니다.

- 결제대행사 / 게이트웨이 거래 수수료
- 은행 수수료
- 플랫폼 결제 처리 수수료
- 세금, 공과금 또는 유사한 법정 부담금
- 환전 비용 또는 송금 수수료

해당 금액은 실제로 발생했고 회수가 불가능한 경우에 한합니다.

## 4. 현금 결제 또는 Docito 외부 결제
결제가 **현금** 또는 **Docito 외부의 결제대행사, 은행이체, 전자지갑, 기타 방식**으로 이루어진 경우:

- **Docito는 해당 결제에 대해 책임지지 않습니다**
- **Docito는 해당 결제에 대한 환불을 처리하거나 보장할 수 없습니다**
- 환불 요청은 결제를 수령한 의사 / 클리닉 / 기관과 직접 해결해야 합니다

## 5. 원격의료 / 라이브 상담의 설비·도구·소모비용 (Docito 처리 결제에만 적용)
**Docito 내에서 진행된 원격의료 / 라이브 상담**의 경우, 결제가 Docito를 통해 처리되었다면, 책임 의사 / 기관은 관련 법령이 허용하는 범위에서, 환자의 진료/상담을 위해 이미 합리적으로 지출된 설비, 도구, 소모품, 준비 비용 또는 기타 비용에 해당하는 금액을 **결제금액의 일부에서 보류 또는 공제**할 권리를 가질 수 있습니다.

본 조항은 다음의 경우에 **한해서만** 적용됩니다.

- 원격의료 상담
- 라이브 상담
- 원격 세션

그리고 해당 서비스가 **Docito 내에서 진행**되고 Docito 지원 결제 흐름을 통해 결제된 경우에 한합니다.

## 6. 대면 / 방문 / 내원 진료 및 기타 오프라인 서비스
Docito 원격의료/라이브 상담이 아닌 모든 예약 또는 서비스(예: **대면 진료, 방문 진료, 병원/클리닉 내원, 시술, 검사 서비스, 영상 서비스, 약국 조제** 등을 포함하되 이에 한정되지 않음)에 대해서는 **Docito가 환불 책임을 지지 않습니다**.

이러한 서비스의 환불, 재예약, 부분 환불 또는 환불 불가 결정은 책임 의사 / 기관이 자체 정책, 사용된 결제수단 및 관련 법령에 따라 직접 처리해야 합니다.

## 7. 차지백 및 결제 분쟁
사용자가 은행/카드사/결제 제공업체를 통해 차지백 또는 결제 분쟁을 제기하는 경우, Docito 및/또는 책임 의사/기관은 분쟁 대응을 위해 예약 상태, 타임스탬프, 커뮤니케이션 기록, (법적으로 허용되는 범위의) 서비스 로그 및 결제 기록 등을 제출할 수 있습니다.

차지백 제기가 자동으로 환불 자격을 의미하지는 않습니다.

## 8. 환불 요청 방법

### Docito 구독 관련 문제인 경우
- 청구를 피하려면 14일 무료 체험 종료 전에 구독을 취소하세요.
- 이미 청구되었다면 구독은 결제한 기간 종료 시점까지 활성 상태로 유지됩니다.
- 청구 관련 문의는 도움말 센터 또는 플랫폼에 표시된 법무/지원 연락처를 통해 Docito 지원팀에 문의하세요.

### 의사/기관 결제 관련 문제인 경우
- 먼저 책임 의사 / 클리닉 / 기관에 직접 연락하세요.
- 예약 ID, 결제 영수증, 날짜/시간, 요청 사유를 제공하세요.
- 예약/결제가 Docito를 통해 이루어진 경우 Docito가 요청 전달을 도울 수 있으나, 관련 법령에서 달리 요구하지 않는 한 최종 환불 결정은 책임 의사/기관에 있습니다.

## 9. 중요한 법적 고지
본 환불 정책의 어떤 내용도 소비자보호, 의료 또는 결제 관련 법령에 따라 귀하가 가질 수 있는 강행규정상 권리를 제한하지 않습니다.

현지 법령이 본 정책과 다른 결과를 요구하는 경우, 해당 법령이 우선합니다.

## 10. 문의
본 환불 정책 또는 Docito 구독 청구에 관한 문의는 **${SUPPORT_EMAIL}** 로 연락해 주세요.

치료/서비스 환불 요청은 예약 또는 영수증에 표시된 책임 의사 / 기관에 문의해 주세요.
`;

const CHINESE_MARKDOWN = `# 退款政策

## 1. 本退款政策的适用范围
本退款政策说明以下情形的退款处理方式：

- **Docito 订阅**（包括机构订阅及平台周期性套餐）；以及
- **通过 Docito 进行的远程医疗 / 实时咨询付款**（仅当付款在 Docito 平台内处理时）。

Docito 是一个连接患者、医生和医疗机构（诊所、实验室、影像中心、药房）的技术平台。对于许多医疗服务，**提供治疗的医生或负责的机构**才是实际服务提供方，并在适用法律范围内负责服务履行及与服务相关的退款决定。

## 2. 订阅退款（Docito 平台订阅）

### 2.1 订阅费用扣款后不退款
除非适用法律另有强制规定，Docito 上所有付费订阅在扣款后均**不予退款**。

### 2.2 扣费前提供 14 天免费试用
Docito（如适用）提供**14 天免费试用期**，以便用户在付费前评估平台。

在免费试用期间，用户可在试用结束前取消订阅，以避免被扣费。

### 2.3 已付款周期内仍可继续使用
如果订阅费用已经扣款，除非根据服务条款或适用法律账户被暂停或终止，用户仍可在**已支付的计费周期内**（例如按月或按年）继续使用所订阅的产品/功能。

### 2.4 不提供按比例或部分退款
除非法律另有要求，Docito 不对未使用的订阅时长、降级套餐或在付费周期开始后的提前取消提供按比例或部分退款。

## 3. 平台内患者向医生 / 机构支付的款项

### 3.1 谁负责退款
如果患者通过 Docito 向医生或医疗机构支付咨询或治疗费用，则任何退款的决定与执行均由**负责的医生 / 机构**（而非 Docito）负责，并受适用法律及预订/结账页面所显示条款的约束。

### 3.2 可退款条件（治疗/服务未执行）
作为平台的一般规则，只有在**治疗/服务未实际执行**的情况下，负责的医生 / 机构才可能考虑退款。

最终是否符合退款条件以及退款金额，由负责的医生 / 机构根据适用法律、医疗记录和个案情况决定。

### 3.3 不可退还的扣除项（交易手续费与税费）
若付款通过 Docito 处理，负责的医生 / 机构可拒绝退还（或从退款金额中扣除）因以下原因不可逆产生且无法追回的金额（在适用法律允许范围内）：

- 支付处理商 / 支付网关交易手续费
- 银行手续费
- 平台处理费用
- 税费、关税或类似法定费用
- 汇率转换费用或转账费用

仅在上述费用确已发生、不可追回的范围内适用。

## 4. 现金支付或在 Docito 平台外支付
如果付款是通过**现金**或**任何 Docito 平台之外的支付处理商、银行转账、电子钱包或其他方式**完成的，则：

- **Docito 不对该付款负责**
- **Docito 无法出具或保证该付款的退款**
- 任何退款请求必须直接与收款的医生 / 诊所 / 机构解决

## 5. 远程医疗 / 实时咨询中的工具与消耗成本（仅限通过 Docito 处理的付款）
对于**在 Docito 内进行的远程医疗 / 实时咨询**，若付款通过 Docito 处理，则负责的医生 / 机构在适用法律允许范围内，可能有权**保留或扣除部分款项**，该部分款项已被合理用于患者治疗/咨询相关的设备、公用资源、工具、耗材、准备工作或其他支出。

本条款**仅适用于**以下情形：

- 远程医疗咨询
- 实时咨询
- 远程会话

且必须是在 **Docito 内进行** 并通过 Docito 支持的支付流程完成付款。

## 6. 线下服务（到院 / 上门 / 门诊等）及其他非在线服务
对于任何**不属于 Docito 远程医疗/实时咨询**的预约或服务（包括但不限于**到院就诊、上门服务、门诊/诊所就诊、临床操作、实验室服务、影像服务或药房配药**），**Docito 不负责退款**。

此类服务的退款、改期、部分退款或不退款决定，应由负责的医生 / 机构根据其自身政策、所使用的支付方式以及适用法律直接处理。

## 7. 拒付（Chargeback）与支付争议
如果用户向银行/发卡机构/支付服务商发起拒付或支付争议，Docito 和/或负责的医生/机构可提供支持材料（预约状态、时间戳、沟通记录、在法律允许范围内的服务日志及支付记录）以回应争议。

发起拒付并不自动意味着该笔付款可退款。

## 8. 如何申请退款

### 如果问题与 Docito 订阅有关
- 请在 14 天免费试用结束前取消订阅，以避免扣费。
- 如果已经扣费，您的订阅将保持有效直至已付费周期结束。
- 如有账单问题，请通过帮助中心或平台显示的法务/支持联系方式联系 Docito 支持团队。

### 如果问题与向医生/机构支付的款项有关
- 请先直接联系负责的医生 / 诊所 / 机构。
- 请提供预约 ID、付款凭证、日期/时间及申请原因。
- 如果预约/付款通过 Docito 完成，Docito 可协助转交请求；但除非适用法律另有要求，最终退款决定仍由负责的医生/机构作出。

## 9. 重要法律说明
本退款政策中的任何内容均不限制您根据适用的消费者保护、医疗或支付法律所享有的不可放弃权利。

如果当地法律要求的结果与本政策不同，则以适用法律为准。

## 10. 联系方式
如对本退款政策或 Docito 订阅账单有任何疑问，请联系 **${SUPPORT_EMAIL}**。

如需申请治疗/服务相关退款，请联系您预约或收据中所列明的负责医生 / 机构。
`;

const TRANSLATIONS: Record<
  'en' | 'ru' | 'uz' | 'ar' | 'tr' | 'de' | 'es' | 'pt' | 'ja' | 'ko' | 'zh',
  RefundPolicyLocaleContent
> = {
  en: {
    seoTitle: 'Refund Policy | Docito',
    seoDescription:
      'Docito refund policy for subscriptions, telemedicine/live consultation payments, provider refund responsibility, and off-platform payment limitations.',
    seoKeywords:
      'Docito refund policy, subscription refund, telemedicine refund, healthcare booking refunds, doctor payment refund, clinic refund policy',
    title: 'Refund Policy',
    summary:
      'Refund terms for subscriptions, telemedicine/live consultations in Docito, and provider/entity refund responsibilities.',
    effectiveDate: 'February 25, 2026',
    lastUpdated: 'February 25, 2026',
    contactEmail: SUPPORT_EMAIL,
    content: ENGLISH_MARKDOWN,
  },
  ru: {
    seoTitle: 'Политика возврата средств | Docito',
    seoDescription:
      'Политика возврата Docito для подписок, телемедицинских/онлайн-консультаций, ответственности врача/организации и ограничений для платежей вне платформы.',
    seoKeywords:
      'политика возврата Docito, возврат подписки, возврат телемедицина, возврат оплаты врачу, возврат клиника',
    title: 'Политика возврата средств',
    summary:
      'Условия возврата по подпискам, телемедицинским/онлайн-консультациям в Docito и зонам ответственности врача/организации.',
    effectiveDate: '25 февраля 2026',
    lastUpdated: '25 февраля 2026',
    contactEmail: SUPPORT_EMAIL,
    content: RUSSIAN_MARKDOWN,
  },
  uz: {
    seoTitle: 'Mablag‘ni qaytarish siyosati | Docito',
    seoDescription:
      'Docito obunalari, telemeditsina/jonli konsultatsiya to‘lovlari, shifokor yoki muassasa javobgarligi va platformadan tashqari to‘lovlar bo‘yicha qaytarish siyosati.',
    seoKeywords:
      'Docito qaytarish siyosati, obuna qaytarish, telemeditsina qaytarish, shifokor tolov qaytarish, klinika qaytarish',
    title: 'Mablag‘ni qaytarish siyosati',
    summary:
      'Docito obunalari, telemeditsina/jonli konsultatsiyalar va shifokor/muassasa javobgarligi bo‘yicha qaytarish shartlari.',
    effectiveDate: '2026-yil 25-fevral',
    lastUpdated: '2026-yil 25-fevral',
    contactEmail: SUPPORT_EMAIL,
    content: UZBEK_MARKDOWN,
  },
  ar: {
    seoTitle: 'سياسة الاسترداد | Docito',
    seoDescription:
      'سياسة استرداد Docito للاشتراكات ومدفوعات الطب عن بُعد/الاستشارات المباشرة ومسؤولية الطبيب/الجهة والقيود الخاصة بالمدفوعات خارج المنصة.',
    seoKeywords:
      'سياسة استرداد Docito, استرداد الاشتراك, استرداد الطب عن بعد, استرداد دفع الطبيب, استرداد العيادة',
    title: 'سياسة الاسترداد',
    summary:
      'شروط استرداد الاشتراكات ومدفوعات الاستشارات عن بُعد داخل Docito ومسؤوليات الطبيب/الجهة.',
    effectiveDate: '25 فبراير 2026',
    lastUpdated: '25 فبراير 2026',
    contactEmail: SUPPORT_EMAIL,
    content: ARABIC_MARKDOWN,
  },
  tr: {
    seoTitle: 'İade Politikası | Docito',
    seoDescription:
      'Docito abonelikleri, tele-tıp/canlı danışma ödemeleri, sağlayıcı iade sorumluluğu ve platform dışı ödeme sınırlamaları için iade politikası.',
    seoKeywords:
      'Docito iade politikası, abonelik iadesi, tele-tıp iadesi, canlı danışma iadesi, doktor ödeme iadesi',
    title: 'İade Politikası',
    summary:
      'Docito abonelikleri, Docito içi tele-tıp/canlı danışmalar ve doktor/kuruluş iade sorumluluğu için iade koşulları.',
    effectiveDate: '25 Şubat 2026',
    lastUpdated: '25 Şubat 2026',
    contactEmail: SUPPORT_EMAIL,
    content: TURKISH_MARKDOWN,
  },
  de: {
    seoTitle: 'Rückerstattungsrichtlinie | Docito',
    seoDescription:
      'Docito-Rückerstattungsrichtlinie für Abonnements, Telemedizin-/Live-Konsultationszahlungen, Verantwortlichkeit von Anbietern und Einschränkungen bei Zahlungen außerhalb der Plattform.',
    seoKeywords:
      'Docito Rückerstattungsrichtlinie, Abo Rückerstattung, Telemedizin Rückerstattung, Arztzahlung Rückerstattung, Klinik Rückerstattung',
    title: 'Rückerstattungsrichtlinie',
    summary:
      'Rückerstattungsbedingungen für Abonnements, Telemedizin-/Live-Konsultationen in Docito und die Verantwortlichkeiten von Ärzt:innen/Einrichtungen.',
    effectiveDate: '25. Februar 2026',
    lastUpdated: '25. Februar 2026',
    contactEmail: SUPPORT_EMAIL,
    content: GERMAN_MARKDOWN,
  },
  es: {
    seoTitle: 'Política de reembolso | Docito',
    seoDescription:
      'Política de reembolso de Docito para suscripciones, pagos de telemedicina/consultas en vivo, responsabilidad del proveedor y limitaciones para pagos fuera de la plataforma.',
    seoKeywords:
      'política de reembolso Docito, reembolso suscripción, reembolso telemedicina, reembolso pago médico, reembolso clínica',
    title: 'Política de reembolso',
    summary:
      'Términos de reembolso para suscripciones, telemedicina/consultas en vivo en Docito y responsabilidades de médicos/entidades.',
    effectiveDate: '25 de febrero de 2026',
    lastUpdated: '25 de febrero de 2026',
    contactEmail: SUPPORT_EMAIL,
    content: SPANISH_MARKDOWN,
  },
  pt: {
    seoTitle: 'Política de reembolso | Docito',
    seoDescription:
      'Política de reembolso do Docito para assinaturas, pagamentos de telemedicina/consultas ao vivo, responsabilidade do prestador e limitações para pagamentos fora da plataforma.',
    seoKeywords:
      'política de reembolso Docito, reembolso assinatura, reembolso telemedicina, reembolso pagamento médico, reembolso clínica',
    title: 'Política de reembolso',
    summary:
      'Termos de reembolso para assinaturas, telemedicina/consultas ao vivo no Docito e responsabilidades de médicos/entidades.',
    effectiveDate: '25 de fevereiro de 2026',
    lastUpdated: '25 de fevereiro de 2026',
    contactEmail: SUPPORT_EMAIL,
    content: PORTUGUESE_MARKDOWN,
  },
  ja: {
    seoTitle: '返金ポリシー | Docito',
    seoDescription:
      'Docitoのサブスクリプション、遠隔医療/ライブ相談の支払い、医師・医療機関の返金責任、プラットフォーム外支払いの制限に関する返金ポリシー。',
    seoKeywords:
      'Docito 返金ポリシー, サブスクリプション 返金, 遠隔医療 返金, 医師 支払い 返金, クリニック 返金',
    title: '返金ポリシー',
    summary:
      'Docitoのサブスクリプション、Docito内の遠隔医療/ライブ相談、医師・医療機関の返金責任に関する条件。',
    effectiveDate: '2026年2月25日',
    lastUpdated: '2026年2月25日',
    contactEmail: SUPPORT_EMAIL,
    content: JAPANESE_MARKDOWN,
  },
  ko: {
    seoTitle: '환불 정책 | Docito',
    seoDescription:
      'Docito 구독, 원격의료/라이브 상담 결제, 의료 제공자 환불 책임 및 플랫폼 외부 결제 제한에 대한 환불 정책.',
    seoKeywords:
      'Docito 환불 정책, 구독 환불, 원격의료 환불, 의사 결제 환불, 클리닉 환불',
    title: '환불 정책',
    summary:
      'Docito 구독, Docito 내 원격의료/라이브 상담 및 의사/기관의 환불 책임에 대한 환불 조건.',
    effectiveDate: '2026년 2월 25일',
    lastUpdated: '2026년 2월 25일',
    contactEmail: SUPPORT_EMAIL,
    content: KOREAN_MARKDOWN,
  },
  zh: {
    seoTitle: '退款政策 | Docito',
    seoDescription:
      'Docito 关于订阅、远程医疗/实时咨询付款、服务提供方退款责任以及平台外付款限制的退款政策。',
    seoKeywords:
      'Docito 退款政策, 订阅退款, 远程医疗退款, 医生付款退款, 诊所退款',
    title: '退款政策',
    summary:
      '适用于 Docito 订阅、Docito 内远程医疗/实时咨询以及医生/机构退款责任的退款条款。',
    effectiveDate: '2026年2月25日',
    lastUpdated: '2026年2月25日',
    contactEmail: SUPPORT_EMAIL,
    content: CHINESE_MARKDOWN,
  },
};

const SUPPORTED_LANGS: SupportedLang[] = ['en', 'ru', 'uz', 'ar', 'tr', 'zh', 'es', 'pt', 'de', 'ja', 'ko'];

function normalizeLang(value?: string | null): SupportedLang {
  const base = String(value || 'en').toLowerCase().split('-')[0] as SupportedLang;
  return SUPPORTED_LANGS.includes(base) ? base : 'en';
}

function getPolicyContent(lang: SupportedLang): RefundPolicyLocaleContent {
  if (lang in TRANSLATIONS) {
    return TRANSLATIONS[lang as keyof typeof TRANSLATIONS];
  }
  return TRANSLATIONS.en;
}

export default function RefundPolicy() {
  const { t, i18n } = useTranslation(['legal']);
  const { lang } = useParams<{ lang?: string }>();
  const location = useLocation();

  const currentLang = normalizeLang(lang || i18n.language);
  const policy = getPolicyContent(currentLang);
  const legalHref = lang ? `/${lang}/legal` : '/legal';
  const isArabic = currentLang === 'ar';

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: policy.title,
      description: policy.seoDescription,
      inLanguage: currentLang,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Docito',
      },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Legal',
            item: legalHref,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: policy.title,
            item: location.pathname,
          },
        ],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: policy.title,
      description: policy.seoDescription,
      datePublished: ISO_EFFECTIVE_DATE,
      dateModified: ISO_LAST_UPDATED,
      inLanguage: currentLang,
      author: {
        '@type': 'Organization',
        name: 'Docito',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Docito',
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <SEOHead
        title={policy.seoTitle}
        description={policy.seoDescription}
        keywords={policy.seoKeywords}
        type="article"
        structuredData={structuredData}
      />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link to={legalHref}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('legal:detail.backToLegal')}
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className={isArabic ? 'text-right w-full' : ''} dir={isArabic ? 'rtl' : 'ltr'}>
              <h1 className="text-4xl font-bold mb-2">{policy.title}</h1>
              <p className="text-muted-foreground">{policy.summary}</p>
              <div className="flex flex-col gap-1 text-muted-foreground mt-3">
                <p>
                  {t('legal:detail.effectiveDate')}: {policy.effectiveDate}
                </p>
                <p>
                  {t('legal:lastUpdated')}: {policy.lastUpdated}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardContent
            className={`prose prose-slate dark:prose-invert max-w-none p-8 ${isArabic ? 'text-right' : ''}`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <ReactMarkdown>{policy.content}</ReactMarkdown>
          </CardContent>
        </Card>

        <div className={`mt-8 text-center ${isArabic ? 'text-right' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
          <p className="text-sm text-muted-foreground">
            {t('legal:detail.questions')}{' '}
            <a href={`mailto:${policy.contactEmail}`} className="text-primary hover:underline">
              {policy.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
