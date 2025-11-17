#!/usr/bin/env node

/**
 * Add SEO sections to translation JSON files
 * Usage: node scripts/add-seo-to-translations.js
 */

const fs = require('fs');
const path = require('path');

const seoTemplates = {
  en: {
    home: {
      title: "Docito - Book Doctor Appointments Online | Find Verified Healthcare Providers",
      description: "Find and book appointments with verified doctors and medical practices. Fast, secure, and convenient healthcare booking platform.",
      keywords: "doctor appointment, book doctor, medical practice, healthcare, telemedicine, online booking"
    },
    practices: {
      title: "Find Medical Practices & Clinics Near You | Docito",
      description: "Browse verified medical practices and clinics. Read reviews, check services, and book appointments with trusted healthcare facilities.",
      keywords: "medical practice, clinic, healthcare facility, medical center, find clinic, book clinic appointment"
    }
  },
  ru: {
    home: {
      title: "Docito - Запись к врачу онлайн | Найдите проверенных медицинских специалистов",
      description: "Найдите и запишитесь на прием к проверенным врачам и медицинским учреждениям. Быстрая, безопасная и удобная платформа.",
      keywords: "запись к врачу, онлайн запись, медицинская клиника, здравоохранение, телемедицина"
    },
    practices: {
      title: "Найдите медицинские практики и клиники рядом с вами | Docito",
      description: "Просмотрите проверенные медицинские практики и клиники. Читайте отзывы, проверяйте услуги и записывайтесь на прием.",
      keywords: "медицинская практика, клиника, медицинское учреждение, медицинский центр, найти клинику"
    }
  },
  uz: {
    home: {
      title: "Docito - Shifokorlarga onlayn yozilish | Tasdiqlangan tibbiy mutaxassislarni toping",
      description: "Tasdiqlangan shifokorlar va tibbiyot muassasalariga yoziling. Tez, xavfsiz va qulay tibbiy xizmatlar platformasi.",
      keywords: "shifokorga yozilish, onlayn yozilish, tibbiy klinika, sog'liqni saqlash, telemeditsina"
    },
    practices: {
      title: "Yaqin atrofdagi tibbiyot muassasalarini toping | Docito",
      description: "Tasdiqlangan tibbiy muassasalar va klinikalarni ko'ring. Sharhlarni o'qing, xizmatlarni tekshiring va yoziling.",
      keywords: "tibbiy muassasa, klinika, tibbiy markaz, klinika topish"
    }
  },
  ar: {
    home: {
      title: "Docito - حجز مواعيد الأطباء عبر الإنترنت | ابحث عن مقدمي الرعاية الصحية المعتمدين",
      description: "ابحث واحجز مواعيد مع أطباء وعيادات طبية معتمدة. منصة سريعة وآمنة ومريحة لحجز المواعيد الطبية.",
      keywords: "موعد طبيب، حجز طبيب، عيادة طبية، رعاية صحية، طب عن بعد، حجز عبر الإنترنت"
    },
    practices: {
      title: "ابحث عن العيادات والمراكز الطبية بالقرب منك | Docito",
      description: "تصفح العيادات والمراكز الطبية المعتمدة. اقرأ التقييمات، تحقق من الخدمات، واحجز المواعيد مع المرافق الصحية الموثوقة.",
      keywords: "عيادة طبية، مركز طبي، مرفق صحي، البحث عن عيادة، حجز موعد"
    }
  }
};

const languages = ['en', 'ru', 'uz', 'ar'];
const pages = ['home', 'practices'];

languages.forEach(lang => {
  pages.forEach(page => {
    const filePath = path.join(__dirname, '..', 'public', 'locales', lang, `${page}.json`);
    
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        let json = JSON.parse(content);
        
        // Add SEO section if it doesn't exist
        if (!json.seo && seoTemplates[lang] && seoTemplates[lang][page]) {
          json.seo = seoTemplates[lang][page];
          
          fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
          console.log(`✅ Added SEO to ${lang}/${page}.json`);
        } else {
          console.log(`⏭️  Skipped ${lang}/${page}.json (SEO already exists or no template)`);
        }
      } else {
        console.log(`⚠️  File not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${lang}/${page}.json:`, error.message);
    }
  });
});

console.log('\n✅ Done! SEO sections have been added to translation files.');
