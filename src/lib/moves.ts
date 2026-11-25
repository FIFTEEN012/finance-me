// The app's own small, hand-written Move library (ADR-0001).
// Each Move cites a reputable source (ACE, NSCA, NHS). The owner reviews
// this content before merge — do not generate Moves at runtime.

export type MoveGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'stretch'

export type Equipment = 'bodyweight' | 'dumbbell'
export type MoveLevel = 'beginner' | 'intermediate'
/** How one set is counted: repetitions, or seconds held / worked. */
export type CountMode = 'reps' | 'seconds'
/** The part of the body a Workout Plan trains. */
export type TrainingFocus = 'full' | 'upper' | 'lower' | 'core' | 'cardio'

export interface MoveSource {
  org: 'ACE' | 'NSCA' | 'NHS'
  title: string
  url?: string
}

export interface MoveRecommendation {
  sets: number
  /** Reps per set, or seconds per set — read with the Move's countMode. */
  count: number
  restSeconds: number
}

export interface Move {
  /** Stable id: Workout Sessions and Plans refer to Moves by this. Never rename. */
  id: string
  name: string
  nameEn: string
  group: MoveGroup
  equipment: Equipment
  level: MoveLevel
  countMode: CountMode
  recommended: MoveRecommendation
  /** Suitable as a plan's warm-up. */
  warmUp: boolean
  /** Suitable as a plan's cool-down. */
  coolDown: boolean
  /** Muscles / purpose, in Thai. */
  targets: string
  steps: string[]
  mistakes: string[]
  cautions: string[]
  source: MoveSource
}

export const MOVE_GROUPS: { value: MoveGroup; label: string }[] = [
  { value: 'chest', label: 'อก' },
  { value: 'back', label: 'หลัง' },
  { value: 'shoulders', label: 'ไหล่' },
  { value: 'arms', label: 'แขน' },
  { value: 'legs', label: 'ขา/ก้น' },
  { value: 'core', label: 'แกนกลาง' },
  { value: 'cardio', label: 'คาร์ดิโอ' },
  { value: 'stretch', label: 'ยืดเหยียด/วอร์มอัพ' },
]

export const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: 'bodyweight', label: 'ไม่มีอุปกรณ์' },
  { value: 'dumbbell', label: 'ดัมเบล' },
]

/** Ordered easiest first. */
export const MOVE_LEVELS: { value: MoveLevel; label: string }[] = [
  { value: 'beginner', label: 'เริ่มต้น' },
  { value: 'intermediate', label: 'กลาง' },
]

export const TRAINING_FOCUSES: { value: TrainingFocus; label: string }[] = [
  { value: 'full', label: 'ทั้งตัว' },
  { value: 'upper', label: 'ช่วงบน' },
  { value: 'lower', label: 'ช่วงล่าง' },
  { value: 'core', label: 'แกนกลาง' },
  { value: 'cardio', label: 'คาร์ดิโอ' },
]

/** Which Move groups each Training Focus draws its main Moves from. */
export const FOCUS_GROUPS: Record<TrainingFocus, MoveGroup[]> = {
  full: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'],
  upper: ['chest', 'back', 'shoulders', 'arms'],
  lower: ['legs'],
  core: ['core'],
  cardio: ['cardio'],
}

const ACE_LIBRARY = 'https://www.acefitness.org/resources/everyone/exercise-library/'
const NHS_STRENGTH = 'https://www.nhs.uk/live-well/exercise/strength-exercises/'
const NHS_FLEXIBILITY = 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/'
const NHS_WARM_UP = 'https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/'
const NSCA_MANUAL = 'NSCA — Exercise Technique Manual for Resistance Training'

const ace = (exercise: string): MoveSource => ({
  org: 'ACE',
  title: `ACE Exercise Library — ${exercise}`,
  url: ACE_LIBRARY,
})
const nsca = (exercise: string): MoveSource => ({ org: 'NSCA', title: `${NSCA_MANUAL} — ${exercise}` })
const nhs = (page: string, url: string, exercise: string): MoveSource => ({
  org: 'NHS',
  title: `NHS — ${page}: ${exercise}`,
  url,
})

const BACK_PAIN = 'หากรู้สึกปวดหลังส่วนล่าง ให้หยุดและลดช่วงการเคลื่อนไหวลง'
const STOP_IF_PAIN = 'หยุดทันทีหากเจ็บแปลบ ชา หรือปวดข้อ (ต่างจากความรู้สึกล้ากล้ามเนื้อ)'
const BREATHE = 'หายใจตามปกติ อย่ากลั้นหายใจระหว่างออกแรง'

export const MOVES: Move[] = [
  // ── อก ────────────────────────────────────────────────
  {
    id: 'wall-push-up',
    name: 'วิดพื้นกับผนัง',
    nameEn: 'Wall push-up',
    group: 'chest',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 2, count: 12, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'อก ไหล่ด้านหน้า หลังแขน',
    steps: [
      'ยืนหันหน้าเข้าผนัง ห่างประมาณหนึ่งช่วงแขน วางฝ่ามือบนผนังระดับไหล่ กว้างกว่าไหล่เล็กน้อย',
      'เกร็งหน้าท้องให้ลำตัวตรงตั้งแต่ศีรษะถึงส้นเท้า',
      'งอศอกค่อยๆ เอนอกเข้าหาผนังจนจมูกเกือบแตะ ศอกทำมุมราว 45 องศากับลำตัว',
      'ดันผนังกลับสู่ท่าเริ่มต้นจนแขนเกือบตึง',
    ],
    mistakes: ['ก้นยื่นหรือหลังแอ่น ลำตัวไม่เป็นแนวตรง', 'กางศอกออกข้างจนตั้งฉากกับลำตัว', 'ยืนใกล้ผนังเกินไปจนแทบไม่ได้งอศอก'],
    cautions: ['ใส่รองเท้าหรือยืนบนพื้นที่ไม่ลื่น', 'ผู้ที่มีปัญหาข้อมือให้ลดจำนวนครั้งหรือหยุดเมื่อปวด', BREATHE],
    source: nhs('Strength exercises', NHS_STRENGTH, 'Wall press-up'),
  },
  {
    id: 'knee-push-up',
    name: 'วิดพื้นแบบคุกเข่า',
    nameEn: 'Knee push-up',
    group: 'chest',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'อก ไหล่ด้านหน้า หลังแขน',
    steps: [
      'คุกเข่าบนเสื่อ วางมือบนพื้นใต้ไหล่ กว้างกว่าไหล่เล็กน้อย',
      'เลื่อนมือไปข้างหน้าจนลำตัวเป็นแนวตรงจากศีรษะถึงเข่า เกร็งหน้าท้องและก้น',
      'งอศอกลดอกลงจนเกือบแตะพื้น ศอกชี้ไปด้านหลังเฉียงราว 45 องศา',
      'ดันพื้นกลับขึ้นจนแขนเกือบตึง โดยลำตัวยังคงเป็นแนวตรง',
    ],
    mistakes: ['ก้นโด่งหรือสะโพกตกลงก่อนอก', 'ก้มคอลงไปหาพื้น', 'ลดตัวลงแค่ครึ่งทาง'],
    cautions: ['รองเข่าด้วยเสื่อหรือผ้าพับ', 'หากปวดข้อมือ ลองทำบนกำปั้นหรือเปลี่ยนเป็นวิดพื้นกับผนัง', BREATHE],
    source: ace('Modified push-up (knees)'),
  },
  {
    id: 'push-up',
    name: 'วิดพื้น',
    nameEn: 'Push-up',
    group: 'chest',
    equipment: 'bodyweight',
    level: 'intermediate',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'อก ไหล่ด้านหน้า หลังแขน แกนกลาง',
    steps: [
      'เริ่มในท่าแพลงก์แขนตึง มืออยู่ใต้ไหล่กว้างกว่าไหล่เล็กน้อย เท้าชิดหรือห่างเล็กน้อย',
      'เกร็งหน้าท้องและก้นให้ลำตัวตรงจากศีรษะถึงส้นเท้า',
      'งอศอกลดตัวลงพร้อมกันทั้งตัวจนอกเกือบแตะพื้น ศอกทำมุมราว 45 องศากับลำตัว',
      'ดันพื้นกลับขึ้นจนแขนเกือบตึง โดยไม่ล็อกศอก',
    ],
    mistakes: ['สะโพกตกหรือหลังแอ่น', 'กางศอกออกข้างมากเกินไป', 'ยื่นคอหรือก้มศีรษะนำลงไปก่อน'],
    cautions: ['หากทำได้ไม่ถึง 8 ครั้งด้วยท่าที่ถูกต้อง ให้กลับไปใช้วิดพื้นแบบคุกเข่า', 'ผู้ที่มีอาการบาดเจ็บไหล่หรือข้อมือควรปรึกษาผู้เชี่ยวชาญก่อน', BREATHE],
    source: ace('Push-up'),
  },
  {
    id: 'dumbbell-floor-press',
    name: 'ดันดัมเบลนอนพื้น',
    nameEn: 'Dumbbell floor press',
    group: 'chest',
    equipment: 'dumbbell',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 12, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'อก หลังแขน ไหล่ด้านหน้า',
    steps: [
      'นอนหงายบนเสื่อ ชันเข่า เท้าวางราบ ถือดัมเบลมือละข้าง ต้นแขนวางบนพื้นทำมุมราว 45 องศากับลำตัว',
      'เริ่มจากศอกงอ ดัมเบลอยู่เหนืออกส่วนล่าง ข้อมือตรง',
      'ดันดัมเบลขึ้นตรงเหนืออกจนแขนเกือบตึง',
      'ค่อยๆ ลดลงจนต้นแขนแตะพื้นเบาๆ แล้วเริ่มครั้งถัดไป',
    ],
    mistakes: ['ปล่อยต้นแขนกระแทกพื้น', 'ข้อมืองอพับไปด้านหลัง', 'แอ่นหลังยกก้นขึ้นจากพื้น'],
    cautions: ['เลือกน้ำหนักที่ทำครบจำนวนครั้งได้ด้วยท่าที่ถูกต้อง', 'วางดัมเบลลงข้างลำตัวอย่างระมัดระวังเมื่อจบเซ็ต', BREATHE],
    source: nsca('Dumbbell bench press (floor variation)'),
  },

  // ── หลัง ───────────────────────────────────────────────
  {
    id: 'superman',
    name: 'ซูเปอร์แมน',
    nameEn: 'Superman',
    group: 'back',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 2, count: 10, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'หลังส่วนล่าง ก้น หลังส่วนบน',
    steps: [
      'นอนคว่ำบนเสื่อ เหยียดแขนไปข้างหน้า ขาเหยียดตรง หน้าผากหรือคางแตะพื้นเบาๆ',
      'เกร็งก้นและหน้าท้องเล็กน้อย',
      'ยกแขน อก และขาขึ้นจากพื้นพร้อมกันเพียงเล็กน้อย สายตามองพื้น',
      'ค้างไว้ 2–3 วินาที แล้วค่อยๆ ลดลง',
    ],
    mistakes: ['ยกสูงเกินไปจนหลังส่วนล่างหักงอ', 'เงยหน้าขึ้นมองข้างหน้า', 'ใช้แรงเหวี่ยงแทนการค่อยๆ ยก'],
    cautions: [BACK_PAIN, 'ผู้ที่มีโรคหมอนรองกระดูกควรปรึกษาแพทย์ก่อน', BREATHE],
    source: ace('Superman'),
  },
  {
    id: 'one-arm-dumbbell-row',
    name: 'ดึงดัมเบลแขนเดียว',
    nameEn: 'One-arm dumbbell row',
    group: 'back',
    equipment: 'dumbbell',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 12, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'หลังส่วนบน ปีกหลัง หน้าแขน',
    steps: [
      'วางมือและเข่าข้างหนึ่งบนม้านั่งหรือเก้าอี้ที่มั่นคง อีกขายืนบนพื้น หลังตรงขนานพื้น',
      'มือข้างที่ว่างถือดัมเบล แขนห้อยตรงใต้ไหล่',
      'ดึงดัมเบลขึ้นหาสะโพก ศอกชิดลำตัว บีบสะบักเข้าหากัน',
      'ค่อยๆ ลดลงจนแขนตึง ทำครบแล้วสลับข้าง',
    ],
    mistakes: ['บิดลำตัวเพื่อเหวี่ยงดัมเบลขึ้น', 'ยักไหล่ขึ้นหาหู', 'หลังงอค่อม'],
    cautions: ['ใช้ที่วางมือที่มั่นคง ไม่โยกหรือเลื่อน', BACK_PAIN, BREATHE],
    source: nsca('One-arm dumbbell row'),
  },
  {
    id: 'dumbbell-bent-over-row',
    name: 'โน้มตัวดึงดัมเบล',
    nameEn: 'Dumbbell bent-over row',
    group: 'back',
    equipment: 'dumbbell',
    level: 'intermediate',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'หลังส่วนบน ปีกหลัง หน้าแขน',
    steps: [
      'ยืนเท้ากว้างเท่าสะโพก ถือดัมเบลมือละข้าง งอเข่าเล็กน้อย',
      'พับสะโพกโน้มลำตัวไปข้างหน้าราว 45 องศา หลังตรง แขนห้อยใต้ไหล่',
      'ดึงดัมเบลขึ้นหาซี่โครงล่าง ศอกชี้ไปด้านหลัง บีบสะบักเข้าหากัน',
      'ค่อยๆ ลดลงจนแขนตึง โดยคงมุมลำตัวไว้',
    ],
    mistakes: ['หลังโก่งงอ', 'ยืดตัวขึ้นทุกครั้งที่ดึง', 'ใช้แรงเหวี่ยงแทนกล้ามเนื้อหลัง'],
    cautions: ['ผู้ที่มีปัญหาหลังส่วนล่างให้ใช้แบบแขนเดียวมีที่วางมือแทน', BACK_PAIN, BREATHE],
    source: nsca('Bent-over row'),
  },

  // ── ไหล่ ───────────────────────────────────────────────
  {
    id: 'prone-y-raise',
    name: 'นอนคว่ำยกแขนตัว Y',
    nameEn: 'Prone Y raise',
    group: 'shoulders',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 2, count: 10, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'ไหล่ด้านหลัง หลังส่วนบน กล้ามเนื้อรอบสะบัก',
    steps: [
      'นอนคว่ำบนเสื่อ หน้าผากวางบนผ้าพับ เหยียดแขนเฉียงขึ้นเหนือศีรษะเป็นรูปตัว Y นิ้วโป้งชี้ขึ้น',
      'ดึงสะบักลงและเข้าหากันเล็กน้อย',
      'ยกแขนทั้งสองขึ้นจากพื้นเล็กน้อยโดยไม่ยกอก ค้างไว้ 2 วินาที',
      'ค่อยๆ ลดแขนลง',
    ],
    mistakes: ['ยักไหล่ขึ้นหาหู', 'แอ่นหลังยกอกขึ้นแทนการยกแขน', 'เหวี่ยงแขนเร็วๆ'],
    cautions: ['ยกในช่วงที่ไม่เจ็บไหล่เท่านั้น', STOP_IF_PAIN, BREATHE],
    source: ace('Prone Y raise'),
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'ดันดัมเบลเหนือศีรษะ',
    nameEn: 'Seated dumbbell shoulder press',
    group: 'shoulders',
    equipment: 'dumbbell',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'ไหล่ หลังแขน',
    steps: [
      'นั่งบนเก้าอี้หลังตรง เท้าวางราบ ถือดัมเบลระดับไหล่ ฝ่ามือหันไปข้างหน้า',
      'เกร็งหน้าท้อง ไม่แอ่นหลัง',
      'ดันดัมเบลขึ้นเหนือศีรษะจนแขนเกือบตึง ดัมเบลเคลื่อนเข้าหากันเล็กน้อย',
      'ค่อยๆ ลดกลับลงมาระดับไหล่',
    ],
    mistakes: ['แอ่นหลังเพื่อช่วยดัน', 'ล็อกศอกแรงที่ด้านบน', 'ลดดัมเบลเร็วเกินไป'],
    cautions: ['ผู้ที่มีอาการบาดเจ็บไหล่หรือความดันโลหิตสูงที่ยังควบคุมไม่ได้ควรปรึกษาแพทย์ก่อน', 'เริ่มจากน้ำหนักเบา', BREATHE],
    source: ace('Seated overhead press'),
  },
  {
    id: 'dumbbell-lateral-raise',
    name: 'ยกดัมเบลด้านข้าง',
    nameEn: 'Dumbbell lateral raise',
    group: 'shoulders',
    equipment: 'dumbbell',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 12, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'ไหล่ด้านข้าง',
    steps: [
      'ยืนเท้ากว้างเท่าสะโพก ถือดัมเบลข้างลำตัว ฝ่ามือหันเข้าหาตัว ศอกงอเล็กน้อย',
      'เกร็งหน้าท้อง ไหล่ผ่อนลง',
      'ยกแขนออกด้านข้างจนถึงระดับไหล่ ไม่สูงกว่านั้น',
      'ค่อยๆ ลดลงข้างลำตัว',
    ],
    mistakes: ['ใช้ดัมเบลหนักจนต้องเหวี่ยงตัว', 'ยักไหล่ขึ้นหาหู', 'ยกสูงเกินระดับไหล่'],
    cautions: ['ใช้น้ำหนักเบา ท่านี้ไม่ต้องใช้ดัมเบลหนัก', STOP_IF_PAIN, BREATHE],
    source: ace('Lateral raise'),
  },

  // ── แขน ───────────────────────────────────────────────
  {
    id: 'dumbbell-biceps-curl',
    name: 'ม้วนดัมเบล (หน้าแขน)',
    nameEn: 'Dumbbell biceps curl',
    group: 'arms',
    equipment: 'dumbbell',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 12, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'หน้าแขน',
    steps: [
      'ยืนตรงหรือนั่งบนเก้าอี้ ถือดัมเบลข้างลำตัว ฝ่ามือหันไปข้างหน้า',
      'ศอกชิดลำตัวและอยู่นิ่งตลอดการเคลื่อนไหว',
      'งอศอกยกดัมเบลขึ้นหาไหล่',
      'ค่อยๆ ลดลงจนแขนเกือบตึง',
    ],
    mistakes: ['เหวี่ยงลำตัวหรือโยกหลังช่วยยก', 'ศอกเลื่อนไปข้างหน้า', 'ปล่อยดัมเบลตกลงเร็ว'],
    cautions: ['เลือกน้ำหนักที่ยกได้โดยไม่ต้องเหวี่ยงตัว', BREATHE],
    source: nhs('Strength exercises', NHS_STRENGTH, 'Bicep curl'),
  },
  {
    id: 'dumbbell-overhead-triceps-extension',
    name: 'เหยียดดัมเบลเหนือศีรษะ (หลังแขน)',
    nameEn: 'Overhead dumbbell triceps extension',
    group: 'arms',
    equipment: 'dumbbell',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 12, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'หลังแขน',
    steps: [
      'นั่งหลังตรงบนเก้าอี้ ใช้สองมือจับดัมเบลหนึ่งลูก ยกขึ้นเหนือศีรษะจนแขนเกือบตึง',
      'ต้นแขนชิดศีรษะและอยู่นิ่ง',
      'งอศอกค่อยๆ ลดดัมเบลลงด้านหลังศีรษะ',
      'เหยียดศอกยกดัมเบลกลับขึ้นด้านบน',
    ],
    mistakes: ['กางศอกออกข้าง', 'แอ่นหลังระหว่างยก', 'ลดดัมเบลลงเร็วจนเสียการควบคุม'],
    cautions: ['จับดัมเบลให้แน่นและระวังศีรษะ', 'ผู้ที่ยกแขนเหนือศีรษะแล้วเจ็บไหล่ไม่ควรทำท่านี้', BREATHE],
    source: ace('Overhead triceps extension'),
  },
  {
    id: 'chair-dip',
    name: 'ดิปกับเก้าอี้',
    nameEn: 'Chair dip',
    group: 'arms',
    equipment: 'bodyweight',
    level: 'intermediate',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'หลังแขน ไหล่ด้านหน้า อก',
    steps: [
      'นั่งบนขอบเก้าอี้ที่มั่นคงและไม่มีล้อ วางมือข้างสะโพก นิ้วชี้ไปข้างหน้า',
      'เลื่อนก้นออกจากเก้าอี้ ชันเข่า เท้าวางราบบนพื้น',
      'งอศอกลดตัวลงตรงๆ จนต้นแขนเกือบขนานพื้น ศอกชี้ไปด้านหลัง',
      'ดันกลับขึ้นจนแขนเกือบตึง',
    ],
    mistakes: ['ลดตัวต่ำเกินไปจนไหล่ยื่นไปข้างหน้า', 'กางศอกออกข้าง', 'ก้นอยู่ห่างจากเก้าอี้มากเกินไป'],
    cautions: ['ดันเก้าอี้ชิดผนังกันลื่น', 'ผู้ที่มีอาการบาดเจ็บไหล่ไม่ควรทำท่านี้', STOP_IF_PAIN],
    source: ace('Triceps dip (bench or chair)'),
  },

  // ── ขา/ก้น ────────────────────────────────────────────
  {
    id: 'sit-to-stand',
    name: 'ลุกนั่งจากเก้าอี้',
    nameEn: 'Sit-to-stand',
    group: 'legs',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 2, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'ต้นขาด้านหน้า ก้น',
    steps: [
      'นั่งบนขอบเก้าอี้ที่มั่นคง เท้าวางราบห่างกันเท่าสะโพก',
      'กอดอกหรือยื่นแขนไปข้างหน้า โน้มตัวมาข้างหน้าเล็กน้อย',
      'ลุกขึ้นยืนโดยไม่ใช้มือช่วย ดันผ่านส้นเท้า',
      'ค่อยๆ นั่งลงอย่างควบคุมจนก้นแตะเก้าอี้',
    ],
    mistakes: ['ทิ้งตัวลงนั่งแรงๆ', 'เข่าล้มเข้าด้านใน', 'ยกส้นเท้าขึ้นจากพื้น'],
    cautions: ['วางเก้าอี้ชิดผนังกันเลื่อน', 'หากทรงตัวไม่ดี ให้ใช้มือแตะพนักหรือโต๊ะช่วยได้', BREATHE],
    source: nhs('Strength exercises', NHS_STRENGTH, 'Sit-to-stand'),
  },
  {
    id: 'bodyweight-squat',
    name: 'สควอท',
    nameEn: 'Bodyweight squat',
    group: 'legs',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 12, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'ต้นขาด้านหน้า ก้น ต้นขาด้านหลัง',
    steps: [
      'ยืนเท้ากว้างเท่าไหล่หรือกว้างกว่าเล็กน้อย ปลายเท้าชี้ออกเล็กน้อย',
      'ยื่นแขนไปข้างหน้าเพื่อทรงตัว เกร็งหน้าท้อง',
      'พับสะโพกไปด้านหลังและงอเข่าเหมือนกำลังนั่งเก้าอี้ ลงจนต้นขาเกือบขนานพื้นหรือเท่าที่ทำได้โดยหลังตรง',
      'ดันผ่านส้นเท้ายืนขึ้นกลับสู่ท่าเริ่มต้น',
    ],
    mistakes: ['เข่าล้มเข้าด้านใน', 'ยกส้นเท้า น้ำหนักไปอยู่ปลายเท้า', 'หลังงอค่อมเมื่อลงต่ำ'],
    cautions: ['ลงเท่าที่ไม่เจ็บเข่า ไม่จำเป็นต้องลงลึก', 'ผู้ที่มีปัญหาข้อเข่าให้เริ่มจากลุกนั่งจากเก้าอี้', BREATHE],
    source: ace('Bodyweight squat'),
  },
  {
    id: 'glute-bridge',
    name: 'ยกสะโพก (บริดจ์)',
    nameEn: 'Glute bridge',
    group: 'legs',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 3, count: 12, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'ก้น ต้นขาด้านหลัง หลังส่วนล่าง',
    steps: [
      'นอนหงาย ชันเข่า เท้าวางราบห่างกันเท่าสะโพก แขนวางข้างลำตัว',
      'เกร็งหน้าท้องและบีบก้น',
      'ยกสะโพกขึ้นจนลำตัวเป็นแนวตรงจากไหล่ถึงเข่า',
      'ค้างไว้ 1–2 วินาที แล้วค่อยๆ ลดลง',
    ],
    mistakes: ['ยกสูงเกินจนหลังแอ่น', 'เข่ากางออกหรือหุบเข้า', 'ดันด้วยปลายเท้าแทนส้นเท้า'],
    cautions: [BACK_PAIN, 'ผู้ที่ตั้งครรภ์ช่วงหลังไม่ควรนอนหงายนาน ควรปรึกษาแพทย์', BREATHE],
    source: ace('Glute bridge'),
  },
  {
    id: 'calf-raise',
    name: 'เขย่งปลายเท้า',
    nameEn: 'Calf raise',
    group: 'legs',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 2, count: 15, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'น่อง',
    steps: [
      'ยืนตรง เท้าห่างกันเท่าสะโพก มือแตะพนักเก้าอี้หรือผนังเพื่อทรงตัว',
      'เขย่งส้นเท้าขึ้นให้สูงที่สุดเท่าที่ทำได้',
      'ค้างไว้ 1 วินาที',
      'ค่อยๆ ลดส้นเท้าลงแตะพื้น',
    ],
    mistakes: ['ทิ้งส้นเท้าลงเร็ว', 'น้ำหนักเทไปด้านนอกของเท้า', 'โยกลำตัวไปข้างหน้า'],
    cautions: ['ใช้ที่จับช่วยทรงตัวหากเสี่ยงล้ม', 'ผู้ที่มีปัญหาเอ็นร้อยหวายให้ลดช่วงการเคลื่อนไหว', BREATHE],
    source: nhs('Strength exercises', NHS_STRENGTH, 'Calf raises'),
  },
  {
    id: 'reverse-lunge',
    name: 'ลันจ์ถอยหลัง',
    nameEn: 'Reverse lunge',
    group: 'legs',
    equipment: 'bodyweight',
    level: 'intermediate',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'ต้นขาด้านหน้า ก้น การทรงตัว',
    steps: [
      'ยืนตรง เท้าห่างกันเท่าสะโพก มือเท้าเอว',
      'ก้าวขาข้างหนึ่งถอยหลังหนึ่งก้าวยาว ลงน้ำหนักที่ปลายเท้าหลัง',
      'ย่อตัวลงตรงๆ จนเข่าทั้งสองงอราว 90 องศา เข่าหลังเกือบแตะพื้น เข่าหน้าอยู่เหนือข้อเท้า',
      'ดันผ่านส้นเท้าหน้ากลับสู่ท่ายืน ทำสลับข้าง (นับข้างละ 1 ครั้ง)',
    ],
    mistakes: ['เข่าหน้าล้มเข้าด้านใน', 'โน้มลำตัวไปข้างหน้ามาก', 'ก้าวสั้นเกินไปจนเข่าหน้ายื่นเลยปลายเท้ามาก'],
    cautions: ['ทำใกล้ผนังหรือเก้าอี้เพื่อจับช่วยทรงตัว', 'ผู้ที่มีปัญหาข้อเข่าให้ย่อลงเพียงครึ่งทาง', BREATHE],
    source: ace('Reverse lunge'),
  },
  {
    id: 'goblet-squat',
    name: 'สควอทถือดัมเบล (กอบเล็ต)',
    nameEn: 'Goblet squat',
    group: 'legs',
    equipment: 'dumbbell',
    level: 'intermediate',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'ต้นขาด้านหน้า ก้น แกนกลาง',
    steps: [
      'ยืนเท้ากว้างกว่าไหล่เล็กน้อย ใช้สองมือถือดัมเบลแนวตั้งชิดอก ศอกชี้ลง',
      'เกร็งหน้าท้อง อกเปิด',
      'พับสะโพกและงอเข่าย่อตัวลงจนต้นขาเกือบขนานพื้น ศอกอยู่ระหว่างเข่า',
      'ดันผ่านส้นเท้ายืนขึ้นกลับสู่ท่าเริ่มต้น',
    ],
    mistakes: ['ปล่อยดัมเบลห่างจากอกจนลำตัวโน้มไปข้างหน้า', 'เข่าล้มเข้าด้านใน', 'ยกส้นเท้าขึ้น'],
    cautions: ['เริ่มจากน้ำหนักเบาจนท่าคงที่', 'ลงเท่าที่ไม่เจ็บเข่าหรือหลัง', BREATHE],
    source: nsca('Goblet squat'),
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'โรมาเนียนเดดลิฟต์ดัมเบล',
    nameEn: 'Dumbbell Romanian deadlift',
    group: 'legs',
    equipment: 'dumbbell',
    level: 'intermediate',
    countMode: 'reps',
    recommended: { sets: 3, count: 10, restSeconds: 60 },
    warmUp: false,
    coolDown: false,
    targets: 'ต้นขาด้านหลัง ก้น หลังส่วนล่าง',
    steps: [
      'ยืนเท้ากว้างเท่าสะโพก ถือดัมเบลหน้าต้นขา เข่างอเล็กน้อย',
      'พับสะโพกดันก้นไปด้านหลัง ให้ดัมเบลเลื่อนลงชิดขา หลังตรงตลอด',
      'ลดลงจนรู้สึกตึงต้นขาด้านหลัง (ประมาณใต้เข่า) โดยหลังยังไม่งอ',
      'บีบก้นดันสะโพกไปข้างหน้ากลับสู่ท่ายืน',
    ],
    mistakes: ['หลังโก่งงอเมื่อลดดัมเบล', 'งอเข่ามากจนกลายเป็นสควอท', 'ดัมเบลห่างจากขา'],
    cautions: ['ผู้ที่มีปัญหาหลังส่วนล่างควรปรึกษาผู้เชี่ยวชาญก่อน', BACK_PAIN, BREATHE],
    source: nsca('Romanian deadlift'),
  },

  // ── แกนกลาง ───────────────────────────────────────────
  {
    id: 'dead-bug',
    name: 'เดดบัก',
    nameEn: 'Dead bug',
    group: 'core',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 2, count: 10, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'หน้าท้องส่วนลึก แกนกลาง',
    steps: [
      'นอนหงาย ยกแขนชี้เพดาน ยกขางอเข่า 90 องศาให้เข่าอยู่เหนือสะโพก',
      'กดหลังส่วนล่างแนบพื้นเบาๆ เกร็งหน้าท้อง',
      'ค่อยๆ เหยียดแขนข้างหนึ่งไปเหนือศีรษะพร้อมเหยียดขาข้างตรงข้ามไปข้างหน้า โดยไม่แตะพื้น',
      'กลับสู่ท่าเริ่มต้น แล้วสลับข้าง (นับข้างละ 1 ครั้ง)',
    ],
    mistakes: ['หลังส่วนล่างยกขึ้นจากพื้น', 'เคลื่อนไหวเร็วเกินไป', 'กลั้นหายใจ'],
    cautions: ['ถ้าหลังแอ่นขึ้น ให้เหยียดขาไม่สุดหรือขยับเฉพาะขา', BACK_PAIN],
    source: ace('Dead bug'),
  },
  {
    id: 'bird-dog',
    name: 'เบิร์ดด็อก',
    nameEn: 'Bird dog',
    group: 'core',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 2, count: 10, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'แกนกลาง หลังส่วนล่าง ก้น',
    steps: [
      'คุกเข่าในท่าคลาน มืออยู่ใต้ไหล่ เข่าอยู่ใต้สะโพก หลังเป็นแนวตรง',
      'เกร็งหน้าท้องเพื่อไม่ให้หลังแอ่นหรือสะโพกบิด',
      'เหยียดแขนข้างหนึ่งไปข้างหน้าพร้อมเหยียดขาข้างตรงข้ามไปด้านหลังจนขนานพื้น',
      'ค้างไว้ 2 วินาที กลับสู่ท่าเริ่มต้น แล้วสลับข้าง (นับข้างละ 1 ครั้ง)',
    ],
    mistakes: ['ยกขาสูงเกินจนหลังแอ่น', 'สะโพกบิดเอียงไปด้านหนึ่ง', 'ก้มหรือเงยศีรษะ'],
    cautions: ['รองเข่าด้วยเสื่อ', 'ผู้ที่ปวดข้อมือให้ทำบนกำปั้นหรือแขนท่อนล่าง', BREATHE],
    source: ace('Bird dog'),
  },
  {
    id: 'forearm-plank',
    name: 'แพลงก์',
    nameEn: 'Forearm plank',
    group: 'core',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 3, count: 20, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'แกนกลาง หน้าท้อง ไหล่',
    steps: [
      'นอนคว่ำ วางแขนท่อนล่างบนพื้น ศอกอยู่ใต้ไหล่',
      'ยกลำตัวขึ้นบนแขนท่อนล่างและปลายเท้า (หรือเข่าสำหรับมือใหม่)',
      'เกร็งหน้าท้องและก้นให้ลำตัวตรงจากศีรษะถึงส้นเท้า สายตามองพื้น',
      'ค้างไว้ตามเวลาที่กำหนด แล้วค่อยๆ ลดตัวลง',
    ],
    mistakes: ['สะโพกตกจนหลังแอ่น', 'ก้นโด่งสูง', 'กลั้นหายใจ'],
    cautions: ['เริ่มจากคุกเข่าหากยังค้างไม่ได้ 20 วินาทีด้วยท่าที่ถูกต้อง', 'ผู้ที่มีความดันโลหิตสูงไม่ควรกลั้นหายใจ', BACK_PAIN],
    source: ace('Forearm plank'),
  },
  {
    id: 'side-plank',
    name: 'แพลงก์ด้านข้าง (คุกเข่า)',
    nameEn: 'Kneeling side plank',
    group: 'core',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 2, count: 20, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'หน้าท้องด้านข้าง สะโพก',
    steps: [
      'นอนตะแคง ศอกล่างอยู่ใต้ไหล่ งอเข่าทั้งสองไปด้านหลัง',
      'เกร็งหน้าท้อง ยกสะโพกขึ้นจนลำตัวเป็นแนวตรงจากศีรษะถึงเข่า',
      'ค้างไว้ตามเวลาที่กำหนด สะโพกไม่ตก',
      'ค่อยๆ ลดลง แล้วทำอีกข้าง (เวลาที่แนะนำคือต่อข้าง)',
    ],
    mistakes: ['สะโพกตกลงหาพื้น', 'ไหล่ยกขึ้นหาหู', 'ลำตัวหมุนไปข้างหน้าหรือข้างหลัง'],
    cautions: ['ผู้ที่เจ็บไหล่ควรหยุดและปรึกษาผู้เชี่ยวชาญ', 'เมื่อทำได้ง่าย ค่อยเหยียดขาตรงเป็นท่าเต็ม', BREATHE],
    source: ace('Side plank (modified)'),
  },
  {
    id: 'bicycle-crunch',
    name: 'ปั่นจักรยานกลางอากาศ',
    nameEn: 'Bicycle crunch',
    group: 'core',
    equipment: 'bodyweight',
    level: 'intermediate',
    countMode: 'reps',
    recommended: { sets: 3, count: 16, restSeconds: 45 },
    warmUp: false,
    coolDown: false,
    targets: 'หน้าท้อง หน้าท้องด้านข้าง',
    steps: [
      'นอนหงาย มือแตะข้างศีรษะเบาๆ ยกขางอเข่า 90 องศา',
      'เกร็งหน้าท้อง ยกสะบักขึ้นจากพื้นเล็กน้อย',
      'บิดลำตัวนำศอกข้างหนึ่งเข้าหาเข่าข้างตรงข้าม พร้อมเหยียดขาอีกข้างออก',
      'สลับข้างช้าๆ อย่างควบคุม (นับข้างละ 1 ครั้ง)',
    ],
    mistakes: ['ใช้มือดึงคอ', 'ทำเร็วเกินไปจนเป็นการเหวี่ยง', 'หลังส่วนล่างยกขึ้นจากพื้น'],
    cautions: ['ผู้ที่มีปัญหาคอหรือหลังส่วนล่างให้เลือกเดดบักแทน', BACK_PAIN, BREATHE],
    source: ace('Bicycle crunch'),
  },

  // ── คาร์ดิโอ ───────────────────────────────────────────
  {
    id: 'march-in-place',
    name: 'ย่ำเท้าอยู่กับที่ยกเข่า',
    nameEn: 'Marching on the spot',
    group: 'cardio',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 3, count: 45, restSeconds: 30 },
    warmUp: false,
    coolDown: false,
    targets: 'หัวใจและปอด ขา',
    steps: [
      'ยืนตรง เท้าห่างกันเท่าสะโพก',
      'ย่ำเท้าอยู่กับที่ ยกเข่าขึ้นสลับข้างให้สูงเท่าที่สบาย',
      'แกว่งแขนตามจังหวะ',
      'ค่อยๆ เพิ่มความเร็วหรือความสูงของเข่าเมื่อร่างกายอุ่นขึ้น',
    ],
    mistakes: ['ลำตัวเอนไปข้างหลัง', 'กระแทกเท้าลงพื้นแรง', 'ยักไหล่เกร็ง'],
    cautions: ['ใส่รองเท้าที่รองรับแรงกระแทก', 'หากหน้ามืดหรือเจ็บหน้าอกให้หยุดทันที'],
    source: nhs('How to warm up before exercising', NHS_WARM_UP, 'Marching on the spot'),
  },
  {
    id: 'step-jack',
    name: 'ก้าวกางแขนขา (แบบไม่กระโดด)',
    nameEn: 'Step jack',
    group: 'cardio',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 3, count: 30, restSeconds: 30 },
    warmUp: false,
    coolDown: false,
    targets: 'หัวใจและปอด ไหล่ ขา',
    steps: [
      'ยืนตรง แขนข้างลำตัว',
      'ก้าวขาขวาออกด้านข้างพร้อมยกแขนทั้งสองขึ้นเหนือศีรษะ',
      'ก้าวขากลับพร้อมลดแขนลง',
      'สลับเป็นขาซ้าย ทำต่อเนื่องเป็นจังหวะ',
    ],
    mistakes: ['ก้าวสั้นจนแทบไม่ได้เคลื่อนไหว', 'ยักไหล่ขึ้น', 'ก้มตัวขณะยกแขน'],
    cautions: ['เหมาะกับผู้ที่ไม่ควรกระโดด เช่น มีปัญหาข้อเข่า', 'หากหน้ามืดหรือเจ็บหน้าอกให้หยุดทันที'],
    source: ace('Jumping jack (low-impact step variation)'),
  },
  {
    id: 'side-step-touch',
    name: 'ก้าวแตะด้านข้าง',
    nameEn: 'Side step touch',
    group: 'cardio',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 3, count: 45, restSeconds: 30 },
    warmUp: false,
    coolDown: false,
    targets: 'หัวใจและปอด ขา สะโพก',
    steps: [
      'ยืนตรง เข่างอเล็กน้อย',
      'ก้าวเท้าขวาออกไปด้านข้าง แล้วนำเท้าซ้ายมาแตะข้างเท้าขวา',
      'ก้าวกลับไปทางซ้ายแบบเดียวกัน',
      'แกว่งแขนหรือตบมือตามจังหวะ เพิ่มความเร็วเมื่อร่างกายอุ่นขึ้น',
    ],
    mistakes: ['ยืนเข่าตึง', 'ก้าวไขว้เท้าจนเสียการทรงตัว', 'ลำตัวเอียงไปมา'],
    cautions: ['เคลียร์พื้นที่รอบตัวให้ปลอดภัย', 'หากหน้ามืดหรือเจ็บหน้าอกให้หยุดทันที'],
    source: ace('Lateral step touch'),
  },
  {
    id: 'shadow-boxing',
    name: 'ชกลม',
    nameEn: 'Shadow boxing',
    group: 'cardio',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 3, count: 30, restSeconds: 30 },
    warmUp: false,
    coolDown: false,
    targets: 'หัวใจและปอด ไหล่ แขน แกนกลาง',
    steps: [
      'ยืนเท้าห่างกันเท่าไหล่ เท้าหนึ่งก้าวนำเล็กน้อย เข่างอเล็กน้อย ยกกำปั้นระดับคาง',
      'ชกหมัดตรงสลับซ้ายขวา โดยหมุนลำตัวเล็กน้อยตามหมัด',
      'ดึงหมัดกลับมาป้องหน้าทุกครั้ง',
      'ขยับเท้าเบาๆ อยู่กับที่ตลอดเวลา',
    ],
    mistakes: ['เหยียดศอกสุดจนล็อก', 'ทิ้งการ์ดลงต่ำ', 'ยืนนิ่งเท้าตึง'],
    cautions: ['ชกไม่สุดแขนเพื่อลดแรงกระชากที่ข้อศอก', 'หากหน้ามืดหรือเจ็บหน้าอกให้หยุดทันที'],
    source: ace('Shadow boxing'),
  },
  {
    id: 'jumping-jack',
    name: 'กระโดดตบ',
    nameEn: 'Jumping jack',
    group: 'cardio',
    equipment: 'bodyweight',
    level: 'intermediate',
    countMode: 'seconds',
    recommended: { sets: 3, count: 30, restSeconds: 30 },
    warmUp: false,
    coolDown: false,
    targets: 'หัวใจและปอด ขา ไหล่',
    steps: [
      'ยืนตรง เท้าชิด แขนข้างลำตัว',
      'กระโดดกางขาออกกว้างกว่าไหล่ พร้อมยกแขนขึ้นเหนือศีรษะ',
      'กระโดดหุบขากลับพร้อมลดแขนลง',
      'ทำต่อเนื่องเป็นจังหวะ ลงน้ำหนักที่ปลายเท้าเบาๆ',
    ],
    mistakes: ['ลงส้นเท้ากระแทกพื้น', 'เข่าตึงตอนลงพื้น', 'ก้มตัว'],
    cautions: ['ผู้ที่มีปัญหาข้อเข่า ข้อเท้า หรืออุ้งเชิงกรานให้ใช้ก้าวกางแขนขาแทน', 'หากหน้ามืดหรือเจ็บหน้าอกให้หยุดทันที'],
    source: ace('Jumping jack'),
  },
  {
    id: 'mountain-climber',
    name: 'ปีนเขา (เมาเทนไคลม์เบอร์)',
    nameEn: 'Mountain climber',
    group: 'cardio',
    equipment: 'bodyweight',
    level: 'intermediate',
    countMode: 'seconds',
    recommended: { sets: 3, count: 30, restSeconds: 30 },
    warmUp: false,
    coolDown: false,
    targets: 'หัวใจและปอด แกนกลาง ไหล่ สะโพก',
    steps: [
      'เริ่มในท่าแพลงก์แขนตึง มืออยู่ใต้ไหล่ ลำตัวตรง',
      'ดึงเข่าขวาเข้าหาอก แล้วเหยียดกลับ',
      'สลับดึงเข่าซ้าย ทำต่อเนื่องเหมือนวิ่งอยู่กับที่ในท่าแพลงก์',
      'รักษาสะโพกให้อยู่ระดับเดียวกับไหล่ตลอด',
    ],
    mistakes: ['ก้นโด่งสูง', 'ไหล่เลื่อนไปหลังมือ', 'สะโพกเด้งขึ้นลง'],
    cautions: ['เริ่มช้าๆ ก่อนเพิ่มความเร็ว', 'ผู้ที่ปวดข้อมือหรือไหล่ให้ทำบนขอบโต๊ะหรือเก้าอี้ที่มั่นคง', 'หากหน้ามืดหรือเจ็บหน้าอกให้หยุดทันที'],
    source: ace('Mountain climber'),
  },

  // ── ยืดเหยียด/วอร์มอัพ ────────────────────────────────
  {
    id: 'arm-circles',
    name: 'หมุนแขน',
    nameEn: 'Arm circles',
    group: 'stretch',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 1, count: 30, restSeconds: 0 },
    warmUp: true,
    coolDown: false,
    targets: 'อุ่นเครื่องข้อไหล่',
    steps: [
      'ยืนตรง เท้าห่างกันเท่าไหล่ กางแขนออกด้านข้างระดับไหล่',
      'หมุนแขนเป็นวงเล็กไปข้างหน้า แล้วค่อยๆ ขยายวงให้ใหญ่ขึ้น',
      'ทำครึ่งเวลาแล้วเปลี่ยนเป็นหมุนไปด้านหลัง',
    ],
    mistakes: ['เหวี่ยงแขนแรงและเร็ว', 'ยักไหล่ขึ้นหาหู'],
    cautions: ['หมุนในช่วงที่ไม่เจ็บไหล่เท่านั้น'],
    source: nhs('How to warm up before exercising', NHS_WARM_UP, 'Arm circles'),
  },
  {
    id: 'leg-swings',
    name: 'แกว่งขา',
    nameEn: 'Leg swings',
    group: 'stretch',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 1, count: 30, restSeconds: 0 },
    warmUp: true,
    coolDown: false,
    targets: 'อุ่นเครื่องสะโพกและขา',
    steps: [
      'ยืนข้างผนังหรือเก้าอี้ ใช้มือข้างหนึ่งจับเพื่อทรงตัว',
      'แกว่งขาข้างที่อยู่ด้านนอกไปข้างหน้าและข้างหลังเบาๆ ลำตัวตั้งตรง',
      'ค่อยๆ เพิ่มช่วงการแกว่งเมื่อรู้สึกคล่องขึ้น',
      'ทำครึ่งเวลาแล้วหันกลับไปทำอีกข้าง',
    ],
    mistakes: ['เหวี่ยงขาสูงแรงตั้งแต่เริ่ม', 'ลำตัวโยกตามขา'],
    cautions: ['จับที่ยึดที่มั่นคงเสมอเพื่อกันล้ม', 'แกว่งในช่วงที่สบาย ไม่ฝืน'],
    source: ace('Leg swings (dynamic warm-up)'),
  },
  {
    id: 'cat-cow',
    name: 'แมว-วัว (ยืดหลัง)',
    nameEn: 'Cat-cow',
    group: 'stretch',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'reps',
    recommended: { sets: 1, count: 8, restSeconds: 0 },
    warmUp: true,
    coolDown: true,
    targets: 'ความยืดหยุ่นของกระดูกสันหลัง',
    steps: [
      'อยู่ในท่าคลาน มืออยู่ใต้ไหล่ เข่าอยู่ใต้สะโพก',
      'หายใจออก โก่งหลังขึ้นเหมือนแมว ก้มศีรษะลงมองสะดือ',
      'หายใจเข้า ค่อยๆ แอ่นหลังลง เงยหน้าเล็กน้อย เปิดอก',
      'สลับไปมาช้าๆ ตามลมหายใจ',
    ],
    mistakes: ['เคลื่อนไหวเร็วเกินไป', 'แอ่นหลังลงมากจนเจ็บหลังส่วนล่าง', 'งอศอก'],
    cautions: ['เคลื่อนไหวในช่วงที่สบายเท่านั้น', 'รองเข่าด้วยเสื่อ'],
    source: ace('Cat-cow'),
  },
  {
    id: 'standing-hamstring-stretch',
    name: 'ยืดต้นขาด้านหลัง',
    nameEn: 'Hamstring stretch',
    group: 'stretch',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 1, count: 30, restSeconds: 0 },
    warmUp: false,
    coolDown: true,
    targets: 'ต้นขาด้านหลัง',
    steps: [
      'ยืนตรง วางส้นเท้าข้างหนึ่งไปข้างหน้าเล็กน้อย ปลายเท้าชี้ขึ้น ขาหลังงอเข่าเล็กน้อย',
      'วางมือบนต้นขาข้างที่งอ',
      'พับสะโพกโน้มลำตัวไปข้างหน้าโดยหลังตรง จนรู้สึกตึงด้านหลังขาหน้า',
      'ค้างไว้ตามเวลาที่กำหนด แล้วสลับข้าง (เวลาที่แนะนำคือต่อข้าง)',
    ],
    mistakes: ['หลังงอค่อมเพื่อให้ก้มได้ลึก', 'เด้งตัวขึ้นลง', 'ล็อกเข่าขาหน้าแรง'],
    cautions: ['ยืดจนรู้สึกตึง ไม่ใช่เจ็บ', 'จับผนังหรือเก้าอี้หากทรงตัวไม่ดี'],
    source: nhs('Flexibility exercises', NHS_FLEXIBILITY, 'Hamstring stretch'),
  },
  {
    id: 'standing-quad-stretch',
    name: 'ยืดต้นขาด้านหน้า',
    nameEn: 'Thigh (quad) stretch',
    group: 'stretch',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 1, count: 30, restSeconds: 0 },
    warmUp: false,
    coolDown: true,
    targets: 'ต้นขาด้านหน้า สะโพกด้านหน้า',
    steps: [
      'ยืนข้างผนังหรือเก้าอี้ ใช้มือข้างหนึ่งจับเพื่อทรงตัว',
      'งอเข่าข้างที่อยู่ด้านนอก ใช้มือจับข้อเท้าหรือกางเกงดึงส้นเท้าเข้าหาก้น',
      'เข่าทั้งสองชิดกัน สะโพกดันไปข้างหน้าเล็กน้อยจนรู้สึกตึงต้นขาด้านหน้า',
      'ค้างไว้ตามเวลาที่กำหนด แล้วสลับข้าง (เวลาที่แนะนำคือต่อข้าง)',
    ],
    mistakes: ['เข่ากางออกไปด้านข้าง', 'แอ่นหลัง', 'ดึงข้อเท้าแรงจนเจ็บเข่า'],
    cautions: ['ผู้ที่มีปัญหาข้อเข่าให้ใช้ผ้าคล้องข้อเท้าแทนการดึงด้วยมือ', 'จับที่ยึดที่มั่นคงเสมอเพื่อกันล้ม'],
    source: nhs('Flexibility exercises', NHS_FLEXIBILITY, 'Thigh stretch'),
  },
  {
    id: 'chest-stretch',
    name: 'ยืดอก',
    nameEn: 'Chest stretch',
    group: 'stretch',
    equipment: 'bodyweight',
    level: 'beginner',
    countMode: 'seconds',
    recommended: { sets: 1, count: 30, restSeconds: 0 },
    warmUp: false,
    coolDown: true,
    targets: 'อก ไหล่ด้านหน้า',
    steps: [
      'ยืนตรง ประสานมือไว้ด้านหลังบริเวณก้น (หรือจับผ้าไว้ถ้ามือไม่ถึงกัน)',
      'ดึงสะบักเข้าหากันและลง เปิดอก',
      'ค่อยๆ ยกมือออกห่างจากก้นเล็กน้อยจนรู้สึกตึงที่อก',
      'ค้างไว้ตามเวลาที่กำหนด หายใจลึกๆ',
    ],
    mistakes: ['แอ่นหลังหรือยื่นศีรษะไปข้างหน้า', 'ยกมือสูงจนเจ็บไหล่'],
    cautions: ['ยืดจนรู้สึกตึง ไม่ใช่เจ็บ', 'ผู้ที่มีอาการบาดเจ็บไหล่ให้ยืดในช่วงที่สบาย'],
    source: nhs('Flexibility exercises', NHS_FLEXIBILITY, 'Chest stretch'),
  },
]

// ── Lookups ─────────────────────────────────────────────

const MOVES_BY_ID = new Map(MOVES.map((m) => [m.id, m]))
const LEVEL_RANK: Record<MoveLevel, number> = { beginner: 0, intermediate: 1 }

export function getMove(id: string): Move | undefined {
  return MOVES_BY_ID.get(id)
}

export interface MoveFilter {
  group?: MoveGroup
  equipment?: Equipment
  /** Exact level match (for browsing the library). */
  level?: MoveLevel
}

/** Moves matching every given filter, in library order. */
export function filterMoves(filter: MoveFilter): Move[] {
  return MOVES.filter(
    (m) =>
      (!filter.group || m.group === filter.group) &&
      (!filter.equipment || m.equipment === filter.equipment) &&
      (!filter.level || m.level === filter.level),
  )
}

/**
 * Main (non-stretch) Moves a plan for this focus may use: Moves at or below
 * the chosen level, needing only the available equipment. Library order.
 */
export function movesForFocus(
  focus: TrainingFocus,
  level: MoveLevel,
  equipment: Equipment[] = ['bodyweight', 'dumbbell'],
): Move[] {
  const groups = FOCUS_GROUPS[focus]
  return MOVES.filter(
    (m) =>
      groups.includes(m.group) &&
      LEVEL_RANK[m.level] <= LEVEL_RANK[level] &&
      (m.equipment === 'bodyweight' || equipment.includes(m.equipment)),
  )
}

export function warmUpMoves(): Move[] {
  return MOVES.filter((m) => m.warmUp)
}

export function coolDownMoves(): Move[] {
  return MOVES.filter((m) => m.coolDown)
}

// ── Labels ──────────────────────────────────────────────

export function groupLabel(group: MoveGroup): string {
  return MOVE_GROUPS.find((g) => g.value === group)?.label ?? group
}

export function equipmentLabel(equipment: Equipment): string {
  return EQUIPMENT.find((e) => e.value === equipment)?.label ?? equipment
}

export function levelLabel(level: MoveLevel): string {
  return MOVE_LEVELS.find((l) => l.value === level)?.label ?? level
}

/** "3 เซ็ต × 12 ครั้ง · พัก 60 วินาที" */
export function formatRecommendation(move: Pick<Move, 'countMode' | 'recommended'>): string {
  const { sets, count, restSeconds } = move.recommended
  const unit = move.countMode === 'reps' ? 'ครั้ง' : 'วินาที'
  const main = `${sets} เซ็ต × ${count} ${unit}`
  return restSeconds > 0 ? `${main} · พัก ${restSeconds} วินาที` : main
}
