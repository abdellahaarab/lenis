# Cursor Cloud — متجر الجيل العربي

## إعداد دائم (لا يتكرر)

1. على GitHub: الفرع **`main`** يجب أن يحتوي المتجر (تمت مزامنته). الافتراضي = **`main`**.
2. في Cursor → Environment → **environment.json location** = `.cursor/environment.json` من هذا الم repo.
3. **Secrets:** `DATABASE_URL`, `SESSION_SECRET`, `TOTP_ENCRYPTION_KEY`.
4. بعد أي تغيير على Environment: **Save** ثم **Rebuild** للـ Build.
5. المعاينة: **`https://…:53000/ar/shop`** — ليس منفذ 5173.

## لماذا كان يظهر موقع Lenis بدل المتجر؟

المستودع اسمه `lenis` لأنه **fork** قديم لمكتبة Lenis. فرع **`main` على GitHub** كان يحتوي صفحة تسويق Lenis («The scroll experience…»). **المتجر الكامل** (مسارات `/ar/shop`، الإدارة، API) على فرع **`design/ui-refresh-base`** وعلى **`main` بعد الدمج**.

Cursor Cloud Agent يختار غالبًا **الفرع الافتراضي `main`**. إن كان قديمًا، ترى موقع Lenis وليس متجر الجيل العربي.

## إعداد البيئة في Cursor (Environment)

| الحقل | القيمة |
|--------|--------|
| **Repository** | `ammaruo1/lenis` |
| **Branch** | `main` (بعد آخر push) أو `design/ui-refresh-base` |
| **Install** | `npm install` |
| **Start** | `npm run build:all && npm run start` |
| **Port** | `53000` (ليس `5173`) |

**Secrets (مطلوبة):** انسخ من `.env.hostinger` المحلي — على الأقل `DATABASE_URL`, `SESSION_SECRET`, `TOTP_ENCRYPTION_KEY`. بدونها الكتالوج والإدارة لا يعملان.

**معاينة المتجر:** `/ar/shop` — وليس `/` فقط.

### لا تستخدم `npm run dev` وحده للمعاينة

`npm run dev` (منفذ 5173) **Vite للواجهة فقط** ولا يطابق تشغيل الإنتاج على `53000` (`npm run start:local` أو `npm start` مع البناء الكامل).

للتطوير السحابي مع Hostinger: `build:all` + `npm start` و`PORT=53000`.

### وكيل API اختياري (وضع dev)

إذا أردت `npm run dev` مع بروكسي لقاعدة بعيدة، عيّن `API_PROXY` إلى URL عام لموقعك (مثلاً `https://your-domain.example`) — انظر `vite.config.ts`.

## بعد تغيير الفرع

احفظ Environment من جديد، أو أنشئ Cloud Agent جديدًا من الفرع الصحيح، ثم **Pull** أحدث commit.
