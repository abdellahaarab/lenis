# الجيل العربي الرقمي

متجر إلكتروني (عربي/إنجليزي) للأجهزة والتجهيزات — React 19، Vite، Fastify، MySQL.

> **تنبيه:** اسم المستودع `lenis` تاريخي (fork قديم). المشروع الحالي **متجر الجيل العربي** وليس صفحة تسويق مكتبة Lenis.  
> **Cursor Cloud:** اتبع [docs/CURSOR-CLOUD.md](docs/CURSOR-CLOUD.md) وملف [`.cursor/environment.json`](.cursor/environment.json) — المنفذ **53000** ومسار **`/ar/shop`**.

## التشغيل (محلي كامل — مثل الإنتاج)

```sh
npm install
npm run build:all
npm run start:local    # http://127.0.0.1:53000/ar/shop — قاعدة MariaDB محلية فقط
```

تطوير الواجهة فقط (بدون نفس منفذ المتجر الكامل):

```sh
npm run dev            # Vite — غالباً 5173؛ يحتاج dev:server للـ API
npm run build
```

## التصميم والحركة

- العربية افتراضيًا؛ اللغة والمظهر محفوظان محليًا.
- GSAP وScrollTrigger: دخول متدرج، عمق في المشهد الرئيسي، وتجميع منتجات خلال مشهد مثبت على الكمبيوتر.
- تحت عرض 900 بكسل يتحول المشهد إلى تمرير طبيعي دون تثبيت. احترام إعداد تقليل الحركة في النظام.
- Lenis للتمرير مع حلقة واحدة تُنظف عند الإزالة؛ تمرير اللمس يبقى طبيعيًا.
- Radix للتبويبات وحوار معلومات الموقع؛ القائمة تدير التركيز وتدعم Escape.
- صور WebP محلية؛ سجل المصادر في `public/images/sources.json`. الشاشة مركبة من صورة العتاد وصورة الشاشة الأصليتين.
- نموذج الاحتياج ينسخ الملخص محليًا. لم يُربط بإرسال خارجي لعدم توفر بيانات التواصل الفعلية للمحل.

التوثيق البصري ونتائج الاختبار في `review/REVIEW.md`.

## نظام الإدارة — MySQL وHostinger

المتجر ولوحة الإدارة وFastify يعملون تحت `/` و`/admin/` و`/api/`. المحتوى القابل للإدارة يأتي من MySQL، والصور تُحفظ داخل القاعدة. المرجع الحالي هو [دليل Hostinger والتشغيل والنسخ الاحتياطي](docs/HOSTINGER-MYSQL.md) و[دليل إضافة الوظائف](docs/DEVELOPMENT-MYSQL.md). تم التحقق من قاعدة Hostinger، بينما نشر التطبيق على الدومين لم يُنفّذ بعد.

الأوامر التالية ووثائق المرحلة A أدناه محفوظة للسياق التاريخي الخاص بـPostgreSQL؛ استخدم دليل MySQL أعلاه للتشغيل الحالي.

مساحات العمل `server/` و`admin/` و`packages/shared/` داخل هذا المستودع. المتجر في `src/`، وواجهة الإدارة منفصلة تحت `/admin/`. لم يُعدّل تصميم المتجر أو الحركات لهذه المرحلة.

```sh
npm install
npm run env:init
npm run db:generate
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml exec -it api npm run seed:owner
```

افتح `http://localhost:5174/admin/`. أمر إنشاء المالك تفاعلي دون حساب أو كلمة مرور افتراضية، ويلزم تغيير كلمة المرور عند أول دخول. تفعيل التحقق بخطوتين اختياري في المرحلة A. البيانات التجارية لا تُعبّأ تلقائيًا.

للتطوير المحلي واختبارات قاعدة البيانات وخيارات الأمان راجع [دليل الأساس](docs/admin-foundation.md)، [خطة A](docs/ADMIN-PLAN-A.md)، [تقرير A](docs/ADMIN-REPORT-A.md) و[سجل التغييرات](docs/ADMIN-CHANGELOG.md).

```sh
npm run build:all
npm run typecheck
npm run lint
npm test
npm run test:ui
```
