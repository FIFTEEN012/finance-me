# แอปมือถือ FinanceMe (iOS + Android)

แอปมือถือสร้างด้วย [Capacitor](https://capacitorjs.com) ตัวแอปเปิดเว็บที่ deploy อยู่
(`https://finance-app-red-one.vercel.app`) ภายในแอป native ทำให้มือถือและเว็บใช้โค้ดชุดเดียวกัน
และใช้บัญชี/ข้อมูลชุดเดียวกันบนเซิร์ฟเวอร์

- แก้หน้าเว็บแล้ว deploy → แอปบนมือถือได้ของใหม่ทันที ไม่ต้องส่งแอปขึ้นสโตร์ใหม่
- ต้องส่งขึ้นสโตร์ใหม่เฉพาะเมื่อเปลี่ยนส่วน native: เพิ่ม/อัปเดต plugin, ไอคอน, สิทธิ์ (permission), ชื่อแอป
- ความสามารถของเครื่องที่ใช้: Splash screen, สี status bar ตามธีม, ปุ่ม back ของ Android,
  สั่นตอนบันทึกรายการสำเร็จ, ซิงก์อัตโนมัติเมื่อกลับมาเปิดแอป, หน้าออฟไลน์เมื่อไม่มีเน็ต
- โค้ดที่เกี่ยวข้อง: `capacitor.config.ts`, `mobile/www/` (หน้าออฟไลน์), `android/`, `ios/`,
  `src/components/shared/NativeBridge.tsx`, `src/lib/native.ts`

## การซิงก์ข้อมูลระหว่างมือถือกับเว็บ

ข้อมูลทุกส่วนเก็บบนเซิร์ฟเวอร์ (Postgres) แยกตามบัญชี:

| ข้อมูล | วิธีซิงก์ |
|---|---|
| รายการรับจ่าย, หมวดหมู่, งบประมาณ, เป้าหมาย, หนี้ | ตารางของแต่ละชนิด ผ่าน `/api/sync` และ API ของแต่ละชนิด |
| การลงทุน, การตั้งค่า, บันทึกรายเดือน, เลย์เอาต์แดชบอร์ด, onboarding, หารบิล, รายการประจำ, ของใช้ | ตาราง `finance_store_docs` ผ่าน `/api/sync/docs` |

- แต่ละรายการ (เช่น ของใช้ 1 ชิ้น หรือการตั้งค่า 1 ค่า) ซิงก์แยกกัน ถ้าสองเครื่องแก้คนละรายการ จะได้ทั้งคู่
  ถ้าแก้รายการเดียวกัน **การแก้ที่ทำทีหลังชนะ** (last-write-wins ตามเวลาแก้)
- การลบส่งต่อไปทุกเครื่อง (เก็บ "tombstone" ไว้ เครื่องที่ยังถือข้อมูลเก่าจะไม่อัปโหลดกลับ)
- ซิงก์เมื่อ: เปิดแอป/เว็บ, กลับมาที่แอปหรือแท็บ, ทุก 1 นาทีขณะเปิดอยู่, และ 2 วินาทีหลังแก้ข้อมูล
- โค้ด: `src/lib/storeDocs.ts` (กติกาการรวมข้อมูล), `src/lib/docSync.ts` (ฝั่ง client),
  `src/app/api/sync/docs/route.ts`, `src/lib/tombstones.ts`, `src/hooks/useInitialData.ts`

### ก่อน deploy: ต้องสร้างตารางใหม่บนฐานข้อมูลจริง

Migration `drizzle/0004_store_docs.sql` สร้างตาราง `finance_store_docs` ต้องรันบน Neon (production)
**ก่อน** merge/deploy โค้ดนี้ (ถ้ายังไม่รัน เว็บยังใช้งานได้ปกติ แต่ข้อมูล 8 ส่วนข้างบนจะยังไม่ซิงก์):

```bash
npm run db:migrate
```

(คำสั่งนี้ใช้ `DATABASE_URL` ใน `.env.local` — ตรวจให้แน่ใจว่าชี้ไปที่ฐานข้อมูลที่ตั้งใจ)

## สิ่งที่ต้องมี

| | Android | iOS |
|---|---|---|
| เครื่องสำหรับ build | Windows/Mac/Linux + [Android Studio](https://developer.android.com/studio) | **Mac** + Xcode (หรือบริการ build บนคลาวด์ เช่น Codemagic, Ionic Appflow) |
| ทดสอบบนเครื่องจริง | มือถือ Android เปิด USB debugging หรือใช้ emulator ใน Android Studio | iPhone + Mac (หรือ TestFlight) |
| ลงสโตร์ | บัญชี Google Play Console ($25 ครั้งเดียว) | Apple Developer Program ($99/ปี) |

## คำสั่ง

```bash
npm run mobile:sync        # คัดลอก config + หน้าออฟไลน์เข้า android/ และ ios/ (ทำทุกครั้งที่แก้ capacitor.config.ts หรือเพิ่ม plugin)
npm run mobile:android     # เปิดโปรเจกต์ใน Android Studio → กด Run
npm run mobile:ios         # (บน Mac) เปิดโปรเจกต์ใน Xcode → เลือกทีม Signing → กด Run
```

ทดสอบกับ dev server บนเครื่องแทนเว็บจริง (Android emulator เข้าถึงเครื่องเราที่ `10.0.2.2`):

```bash
npm run dev
CAP_SERVER_URL=http://10.0.2.2:3000 npx cap sync android
```

อย่าลืม `npm run mobile:sync` อีกครั้ง (ไม่มี `CAP_SERVER_URL`) ก่อน build ตัวจริง

### Build ตัวสำหรับส่งสโตร์

- **Android:** Android Studio → Build → Generate Signed Bundle (AAB) → สร้าง keystore (เก็บไฟล์และรหัสไว้ให้ดี
  ถ้าหายจะอัปเดตแอปเดิมไม่ได้) → อัปโหลด `.aab` ใน Play Console
- **iOS:** Xcode → Product → Archive → Distribute App → App Store Connect → ทดสอบผ่าน TestFlight → ส่งรีวิว

## ก่อนส่งสโตร์ครั้งแรก

- [ ] ตัดสินใจ `appId` ใน `capacitor.config.ts` (ตอนนี้ `com.financeme.app`) — เปลี่ยนไม่ได้หลังส่งครั้งแรก
      ถ้าเปลี่ยน ต้องแก้ใน `android/app/build.gradle` (`applicationId`, `namespace`) และ Xcode (Bundle Identifier) ด้วย
- [ ] ไอคอนและ splash: วางรูป `assets/icon.png` (1024×1024) และ `assets/splash.png` (2732×2732) แล้วรัน
      `npx @capacitor/assets generate` (ตอนนี้ยังเป็นไอคอนเริ่มต้นของ Capacitor)
- [ ] นโยบายความเป็นส่วนตัว (Privacy Policy URL) — ทั้งสองสโตร์บังคับสำหรับแอปที่มีบัญชีผู้ใช้
- [ ] App Store: แอปที่มีการสมัครบัญชีต้องมีปุ่ม **ลบบัญชี** ในแอป (Guideline 5.1.1(v))
- [ ] App Store Guideline 4.2: Apple อาจปฏิเสธแอปที่เป็นแค่เว็บห่อไว้ ควรเพิ่มความสามารถของเครื่องให้มากขึ้น
      เช่น ล็อกด้วย Face ID/ลายนิ้วมือ, แจ้งเตือนรายการประจำ/งบเกิน, วิดเจ็ต
