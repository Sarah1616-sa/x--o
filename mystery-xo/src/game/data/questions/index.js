/* ============================================================
   Question bank — organized by category.
   Pure ES module (no deps) shared by the client (lobby picker)
   and the server (validation + pool building for the engine).

   Question shape is the engine's shape — do NOT rename these fields:
     { question: string, options: string[4], correctAnswerIndex: number }
   QuestionSystem reads `options` + `correctAnswerIndex`; the engine
   snapshot reads `question` (the prompt) + `options`.

   Each category: { id, label (Arabic), emoji, questions[] }.
   `id` is the stable key used everywhere (lobby chips, snapshot,
   validation, pool build) — labels/emojis are display-only.
   ============================================================ */

export const CATEGORIES = [
  {
    id: 'geography',
    label: 'جغرافيا',
    emoji: '🌍',
    questions: [
      { question: 'ما عاصمة المملكة العربية السعودية؟', options: ['جدة', 'الرياض', 'مكة', 'الدمام'], correctAnswerIndex: 1 },
      { question: 'ما أكبر قارة في العالم؟', options: ['أفريقيا', 'آسيا', 'أوروبا', 'أمريكا الجنوبية'], correctAnswerIndex: 1 },
      { question: 'ما أطول نهر في العالم غالبا؟', options: ['النيل', 'الأمازون', 'الفرات', 'الدانوب'], correctAnswerIndex: 0 },
      { question: 'ما المحيط الأكبر مساحة؟', options: ['الأطلسي', 'الهندي', 'الهادئ', 'المتجمد الشمالي'], correctAnswerIndex: 2 },
      { question: 'ما عاصمة اليابان؟', options: ['سيول', 'طوكيو', 'بكين', 'بانكوك'], correctAnswerIndex: 1 },
      { question: 'في أي قارة تقع البرازيل؟', options: ['أوروبا', 'آسيا', 'أمريكا الجنوبية', 'أفريقيا'], correctAnswerIndex: 2 },
      { question: 'ما الدولة التي تضم مدينتي مكة والمدينة؟', options: ['الإمارات', 'السعودية', 'مصر', 'الأردن'], correctAnswerIndex: 1 },
      { question: 'في أي مدينة تقع الأهرامات؟', options: ['الإسكندرية', 'القاهرة', 'الجيزة', 'الأقصر'], correctAnswerIndex: 2 },
      { question: 'ما عاصمة فرنسا؟', options: ['لندن', 'باريس', 'روما', 'مدريد'], correctAnswerIndex: 1 },
      { question: 'ما أكبر دولة في العالم من حيث المساحة؟', options: ['كندا', 'الصين', 'روسيا', 'الولايات المتحدة'], correctAnswerIndex: 2 },
    ],
  },
  {
    id: 'science',
    label: 'علوم',
    emoji: '🔬',
    questions: [
      { question: 'ما الكوكب المعروف بالكوكب الأحمر؟', options: ['الزهرة', 'المريخ', 'المشتري', 'عطارد'], correctAnswerIndex: 1 },
      { question: 'كم عدد ألوان قوس قزح؟', options: ['5', '6', '7', '8'], correctAnswerIndex: 2 },
      { question: 'ما الغاز الذي نتنفسه للبقاء على قيد الحياة؟', options: ['الأكسجين', 'الهيدروجين', 'النيتروجين', 'ثاني أكسيد الكربون'], correctAnswerIndex: 0 },
      { question: 'ما الحيوان الذي يلقب بسفينة الصحراء؟', options: ['الحصان', 'الجمل', 'الفيل', 'الغزال'], correctAnswerIndex: 1 },
      { question: 'ما اللون الناتج من خلط الأحمر والأزرق؟', options: ['الأخضر', 'البرتقالي', 'البنفسجي', 'الأصفر'], correctAnswerIndex: 2 },
      { question: 'ما أقرب كوكب إلى الشمس؟', options: ['الأرض', 'عطارد', 'الزهرة', 'المريخ'], correctAnswerIndex: 1 },
      { question: 'كم عدد أرجل الحشرة؟', options: ['4', '6', '8', '10'], correctAnswerIndex: 1 },
      { question: 'ما العضو المسؤول عن ضخ الدم في جسم الإنسان؟', options: ['الرئة', 'الكبد', 'القلب', 'الكلية'], correctAnswerIndex: 2 },
      { question: 'ما أكبر كوكب في المجموعة الشمسية؟', options: ['الأرض', 'المشتري', 'زحل', 'المريخ'], correctAnswerIndex: 1 },
      { question: 'ما الحاسة المرتبطة بالعين؟', options: ['السمع', 'البصر', 'الشم', 'اللمس'], correctAnswerIndex: 1 },
    ],
  },
  {
    id: 'sports',
    label: 'رياضة',
    emoji: '⚽',
    questions: [
      { question: 'كم عدد اللاعبين في فريق كرة القدم داخل الملعب؟', options: ['9', '10', '11', '12'], correctAnswerIndex: 2 },
      { question: 'كم عدد أشواط مباراة كرة القدم؟', options: ['شوط واحد', 'شوطان', 'ثلاثة أشواط', 'أربعة أشواط'], correctAnswerIndex: 1 },
      { question: 'في أي رياضة يستخدم المضرب والكرة الصفراء؟', options: ['كرة السلة', 'التنس', 'السباحة', 'الملاكمة'], correctAnswerIndex: 1 },
      { question: 'كم عدد الحلقات في شعار الألعاب الأولمبية؟', options: ['4', '5', '6', '7'], correctAnswerIndex: 1 },
      { question: 'ما الرياضة التي يشتهر فيها مصطلح الضربة الساحقة؟', options: ['الكرة الطائرة', 'الجولف', 'الرماية', 'الشطرنج'], correctAnswerIndex: 0 },
      { question: 'أي رياضة تقام عادة في حوض مائي؟', options: ['التزلج', 'السباحة', 'كرة اليد', 'ركوب الدراجات'], correctAnswerIndex: 1 },
      { question: 'كم عدد لاعبي فريق كرة السلة داخل الملعب؟', options: ['4', '5', '6', '7'], correctAnswerIndex: 1 },
      { question: 'كل كم سنة تقام بطولة كأس العالم لكرة القدم؟', options: ['سنتان', 'ثلاث سنوات', 'أربع سنوات', 'خمس سنوات'], correctAnswerIndex: 2 },
      { question: 'ما الرياضة التي تُلعب على طاولة بمضارب صغيرة وكرة خفيفة؟', options: ['تنس الطاولة', 'الهوكي', 'الكريكيت', 'البيسبول'], correctAnswerIndex: 0 },
    ],
  },
  {
    id: 'history',
    label: 'تاريخ',
    emoji: '🏛️',
    questions: [
      { question: 'من هو أول الخلفاء الراشدين؟', options: ['عمر بن الخطاب', 'أبو بكر الصديق', 'عثمان بن عفان', 'علي بن أبي طالب'], correctAnswerIndex: 1 },
      { question: 'في أي عام تأسست المملكة العربية السعودية الحديثة؟', options: ['1902', '1927', '1932', '1953'], correctAnswerIndex: 2 },
      { question: 'ما الحضارة القديمة التي بنت الأهرامات؟', options: ['الرومانية', 'المصرية', 'الفارسية', 'الإغريقية'], correctAnswerIndex: 1 },
      { question: 'من القائد الذي فتح القسطنطينية عام 1453؟', options: ['صلاح الدين الأيوبي', 'محمد الفاتح', 'هارون الرشيد', 'طارق بن زياد'], correctAnswerIndex: 1 },
      { question: 'ما اسم الطريق التجاري القديم الذي ربط الشرق بالغرب؟', options: ['طريق الحرير', 'طريق البخور', 'طريق الأطلسي', 'طريق القوافل'], correctAnswerIndex: 0 },
      { question: 'من القائد المسلم الذي فتح الأندلس؟', options: ['طارق بن زياد', 'خالد بن الوليد', 'صلاح الدين الأيوبي', 'عمرو بن العاص'], correctAnswerIndex: 0 },
      { question: 'كم عدد الخلفاء الراشدين؟', options: ['ثلاثة', 'أربعة', 'خمسة', 'ستة'], correctAnswerIndex: 1 },
      { question: 'في أي قرن وقعت الحرب العالمية الأولى؟', options: ['القرن الثامن عشر', 'القرن التاسع عشر', 'القرن العشرون', 'القرن الحادي والعشرون'], correctAnswerIndex: 2 },
      { question: 'من بنى سور الصين العظيم؟', options: ['الرومان', 'الصينيون', 'المصريون', 'الفرس'], correctAnswerIndex: 1 },
      { question: 'ما أول عاصمة للدولة الإسلامية في عهد الرسول صلى الله عليه وسلم؟', options: ['مكة', 'المدينة المنورة', 'دمشق', 'الكوفة'], correctAnswerIndex: 1 },
    ],
  },
  {
    id: 'entertainment',
    label: 'ترفيه',
    emoji: '🎬',
    questions: [
      { question: 'من الشخصية الكرتونية المعروفة بارتداء قفازات بيضاء وأذنين دائريتين؟', options: ['سبونج بوب', 'ميكي ماوس', 'توم', 'باغز باني'], correctAnswerIndex: 1 },
      { question: 'ما الآلة الموسيقية التي تحتوي على مفاتيح بيضاء وسوداء؟', options: ['العود', 'البيانو', 'الناي', 'الطبلة'], correctAnswerIndex: 1 },
      { question: 'ما نوع العمل الفني الذي يعرض على خشبة أمام الجمهور؟', options: ['مسرحية', 'رواية', 'لوحة', 'بودكاست'], correctAnswerIndex: 0 },
      { question: 'ما اسم الجوائز السينمائية العالمية الشهيرة التي تمنح في هوليوود؟', options: ['الأوسكار', 'نوبل', 'غرامي', 'إيمي'], correctAnswerIndex: 0 },
      { question: 'أي منصة اشتهرت بمقاطع الفيديو القصيرة؟', options: ['تيك توك', 'ويكيبيديا', 'لينكدإن', 'خرائط جوجل'], correctAnswerIndex: 0 },
      { question: 'ما الشخصية الكرتونية الإسفنجية التي تعيش في قاع المحيط؟', options: ['سبونج بوب', 'باتريك', 'ميكي ماوس', 'شريك'], correctAnswerIndex: 0 },
      { question: 'ما الآلة الموسيقية الوترية الشهيرة في الموسيقى العربية؟', options: ['العود', 'البيانو', 'الترومبيت', 'الأكورديون'], correctAnswerIndex: 0 },
      { question: 'ما اللعبة الذهنية التي تُلعب على رقعة من 64 مربعا؟', options: ['الشطرنج', 'الدومينو', 'الطاولة', 'الأونو'], correctAnswerIndex: 0 },
      { question: 'من كتب مسرحية روميو وجولييت؟', options: ['شكسبير', 'نجيب محفوظ', 'تولستوي', 'ديكنز'], correctAnswerIndex: 0 },
      { question: 'ما اسم الفأر الخصم لـ توم في الرسوم المتحركة؟', options: ['جيري', 'سيلفستر', 'بلوتو', 'جوفي'], correctAnswerIndex: 0 },
    ],
  },
  {
    id: 'general',
    label: 'منوعات',
    emoji: '🎲',
    questions: [
      { question: 'كم عدد أيام السنة الميلادية العادية؟', options: ['360', '365', '366', '364'], correctAnswerIndex: 1 },
      { question: 'كم عدد أيام الأسبوع؟', options: ['5', '6', '7', '8'], correctAnswerIndex: 2 },
      { question: 'كم عدد دقائق الساعة الواحدة؟', options: ['30', '45', '60', '90'], correctAnswerIndex: 2 },
      { question: 'ما الحاسة المرتبطة بالأذن؟', options: ['البصر', 'السمع', 'الشم', 'التذوق'], correctAnswerIndex: 1 },
      { question: 'كم عدد حروف اللغة العربية؟', options: ['26', '28', '29', '30'], correctAnswerIndex: 1 },
      { question: 'ما العدد الناتج من ضرب 7 في 8؟', options: ['54', '56', '63', '48'], correctAnswerIndex: 1 },
      { question: 'كم عدد أركان الإسلام؟', options: ['أربعة', 'خمسة', 'ستة', 'سبعة'], correctAnswerIndex: 1 },
      { question: 'كم عدد قارات العالم؟', options: ['خمس', 'ست', 'سبع', 'ثمان'], correctAnswerIndex: 2 },
      { question: 'ما لون السماء في يوم صافٍ؟', options: ['أخضر', 'أزرق', 'رمادي', 'أصفر'], correctAnswerIndex: 1 },
      { question: 'كم عدد ألوان علم المملكة العربية السعودية؟', options: ['لون واحد', 'لونان', 'ثلاثة ألوان', 'أربعة ألوان'], correctAnswerIndex: 1 },
    ],
  },
]

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]))

// Stable list of valid category ids — used by the lobby picker and server validation.
export const CATEGORY_IDS = CATEGORIES.map((category) => category.id)

/**
 * Union of the questions belonging to the given category ids.
 * Unknown ids are ignored; an empty/invalid selection falls back to ALL questions,
 * so the engine always receives a non-empty bank.
 */
export function buildQuestionPool(ids = []) {
  const valid = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => CATEGORY_BY_ID.has(id)))]
  const chosen = valid.length ? valid : CATEGORY_IDS
  return chosen.flatMap((id) => CATEGORY_BY_ID.get(id).questions)
}

// Backward-compatible flat bank — every category flattened (the engine's default).
export const QUESTION_BANK = CATEGORIES.flatMap((category) => category.questions)
