// chatbot/chatbot.js

// =============== 1. إعدادات الأسئلة ===============
const faqConfig = {
  default: {
    "كيف أتبرع؟": "للتبرع، اختر حملة واضغط 'تبرع الآن'، ثم اتبع خطوات الدفع.",
    "ما هي طرق الدفع؟": "نقبل البطاقات، PayPal، والمحفظة الإلكترونية.",
    "هل التبرع آمن؟": "نعم، جميع البيانات مشفرة ولا نخزن معلومات بطاقتك.",
    "كيف أتابع تبرعي؟": "ستصلك إشعارات وتقارير دورية.",
    "هل يمكن التبرع مجهولًا؟": "نعم، يمكنك إخفاء هويتك عند الدفع.",
  },
  sponsor: {
    "كيف أكفل حالة؟": "اختر حالة من القائمة واضغط 'اكفل الآن'، ثم أكمل الدفع.",
    "كم مدة الكفالة؟": "عادةً 6–12 شهرًا حسب الحالة.",
    "هل يمكن الكفالة مجهولة؟": "نعم، يمكنك إخفاء اسمك عن المستفيد.",
    "ماذا بعد انتهاء الكفالة؟": "يمكنك تجديدها أو كفالة حالة أخرى.",
    "هل أحصل على تقارير؟": "نعم، نرسل تحديثات شهرية عن الحالة.",
  },
  zakat: {
    "كيف أحسب زكاة الذهب؟":
      "لحساب زكاة الذهب، اختر العملة المناسبة في حاسبة الزكاة وأدخل القيمة الإجمالية لذهبك. إذا بلغت قيمته نصاب الزكاة (85 جرامًا من الذهب عيار 21 تقريبًا) وحال عليه حول هجري كامل، فستكون الزكاة المستحقة 2.5% من قيمته.",
    "كيف أحسب زكاة الفضة؟":
      "لحساب زكاة الفضة، اختر العملة المناسبة في حاسبة الزكاة وأدخل القيمة الإجمالية لفضتك. إذا بلغت قيمتها نصاب الزكاة (595 جرامًا من الفضة الخالصة) وحال عليها حول هجري كامل، فستكون الزكاة المستحقة 2.5% من قيمتها.",
    "كيف أحسب زكاة الأسهم؟":
      "لحساب زكاة الأسهم، أدخل القيمة السوقية الإجمالية لمحفظتك في نهاية كل حول هجري. إذا كانت الأسهم للاستثمار طويل الأجل، فزكاتها 2.5% من قيمتها السوقية. أما إذا كانت للتجارة، فتُزكّى كعروض تجارة أيضًا بنسبة 2.5%.",
    "كيف أحسب زكاتي؟": "استخدم حاسبة الزكاة على موقعنا لتحديد المبلغ بدقة.",
    "متى تجب الزكاة؟": "عند بلوغ النصاب شرعاً وحولان الحول (عام هجري كامل).",
    "هل تصل الزكاة فورًا؟": "نعم، نضمن وصولها بشكل آمن.",
  },
  terms: {
    "ما هي سياسة الخصوصية في GiveHope؟":
      "نلتزم بحماية بياناتك الشخصية ولا نشاركها مع أي طرف ثالث. تُستخدم البيانات فقط لأغراض التحقق من الحالات وضمان وصول الدعم للمستحقين.",
    "هل يتم مشاركة بياناتي مع جهات خارجية؟":
      "لا، جميع بياناتك تُخزن في خوادم مشفرة ولا تُباع أو تُؤجر أو تُشارك مع أي جهة خارجية.",
    "كيف يتم تأمين بياناتي؟":
      "نستخدم تقنيات تشفير حديثة (SSL/TLS) لحماية جميع البيانات أثناء النقل والتخزين.",
    "هل يمكنني حذف حسابي وبياناتي؟":
      "نعم، يمكنك طلب حذف جميع بياناتك نهائيًا من النظام في أي وقت عبر التواصل معنا.",
    "هل التبرع عبر المنصة آمن؟":
      "نعم، جميع عمليات الدفع تتم عبر بوابات دفع معتمدة ومشفرة، ولا نخزن أي بيانات بطاقتك.",
    "من يدير منصة GiveHope؟":
      "المنصة تدار من قبل جمعية زكاة عنبتا، وهي جهة خيرية مرخصة.",
    "كيف أتواصل في حال وجود شكوى؟":
      "يمكنك التواصل معنا عبر الهاتف: 0592900945 أو البريد: Zaka.anb@hotmail.com، وسنرد خلال 7 أيام عمل.",
    "هل يمكنني التبرع مجهولًا؟":
      "نعم، يمكنك التبرع دون الكشف عن هويتك — سيظهر تبرعك كـ 'متبرع كريم'.",
  },
  complaints: {
    "كيف أقدّم شكوى؟":
      "يمكنك تقديم شكوى عبر النموذج أعلاه، أو الاتصال بنا مباشرة على الرقم: 0592900945.",
    "ما هي مدة معالجة الشكوى؟":
      "نعمل على الرد على جميع الشكاوى خلال 7 أيام عمل من تاريخ الاستلام.",
    "هل يتم الرد على جميع الشكاوى؟":
      "نعم، نلتزم بالرد على كل شكوى نتلقاها، سواء عبر البريد أو الهاتف.",
    "هل يمكنني متابعة شكواي بعد إرسالها؟":
      "نعم، يمكنك التواصل معنا بعد 7 أيام عمل للاستفسار عن حالة شكواك باستخدام بريدك الإلكتروني.",
    "ما نوع الشكاوى التي تقبلونها؟":
      "نقبل جميع الشكاوى المتعلقة بخدمات المنصة: تأخير في التبرع، أخطاء في البيانات، مشكلات فنية، أو اقتراحات للتحسين.",
    "هل تُعالج الشكاوى بشكل سري؟":
      "نعم، جميع الشكاوى تُعالج بسرية تامة، ولا تُفصح عن هويتك دون موافقتك.",
    "ماذا لو لم أتلقَ ردًا خلال 7 أيام؟":
      "في حال التأخير، يُرجى التواصل معنا مباشرة على الرقم: 0592900945 لتسريع المتابعة.",
    "هل يمكنني إرسال شكوى مجهولة؟":
      "يفضل ان يكون مرسل الشكوى معروفاً للتواصل معه وحل مشكلته بشكل أفضل .",
  },
  about: {
    "ما هي منصة GiveHope؟":
      "GiveHope هي منصة خيرية رقمية تهدف إلى ربط المحسنين بالمستفيدين عبر تقديم مساعدات مالية وعينية بشكل آمن وشفاف.",
    "ما هو هدف المنصة؟":
      "هدفنا هو تمكين المجتمعات المحتاجة عبر دعم مستدام، ونشر ثقافة العطاء، وبناء جسور الثقة بين المتبرعين والمستفيدين.",
    "من يدير منصة GiveHope؟":
      "المنصة تُدار من قبل جمعية زكاة عنبتا، وهي جهة خيرية مرخصة وذات خبرة في العمل الإنساني.",
    "كيف يمكنني المساهمة معكم؟":
      "يمكنك المساهمة بالتبرع المالي، التطوع، مشاركة الحملات، أو حتى نشر الوعي عن أنشطتنا.",
    "هل تبرعاتي تصل فعليًا للمستحقين؟":
      "نعم، نضمن وصول 100% من تبرعاتك للمستحقين بعد تحقق إداري دقيق، ونرسل لك تقارير أثر دورية.",
    "هل المنصة موثوقة؟":
      "نعم، نلتزم بالشفافية الكاملة، ونخضع لمعايير أمنية صارمة، وجميع عملياتنا خاضعة لمراجعة داخلية وخارجية.",
    "ما الفرق بينكم وبين غيركم؟":
      "نحن ندمج بين التكنولوجيا والشفافية: تتبع مباشر للتبرع، تقارير أثر حية، ودعم ذكي عبر روبوتات محادثة.",
    "هل يمكنني زيارة المشاريع التي تمولونها؟":
      "نعم، ننظم زيارات ميدانية دورية للمتبرعين الراغبين في رؤية أثر تبرعهم على أرض الواقع.",
  },
};

// =============== 2. تهيئة الشات بوت ===============
function initializeChatbot() {
  const pageType = window.pageType || "default";
  window.faq = faqConfig[pageType] || faqConfig.default;
  renderQuickReplies();
}

// =============== 3. عرض الأزرار ===============
function renderQuickReplies() {
  const container = document.getElementById("quickRepliesContainer");
  if (!container) return;

  container.innerHTML = "";
  const questions = Object.keys(window.faq || {});

  questions.slice(0, 6).forEach((q) => {
    const btn = document.createElement("button");
    let icon = '<i class="fas fa-question-circle"></i>';
    if (q.includes("تبرع") || q.includes("كفالة") || q.includes("زكاة"))
      icon = '<i class="fas fa-hand-holding-heart"></i>';
    else if (q.includes("طرق") || q.includes("دفع"))
      icon = '<i class="fas fa-credit-card"></i>';
    else if (q.includes("آمن") || q.includes("أمان"))
      icon = '<i class="fas fa-shield-alt"></i>';

    btn.innerHTML = `${icon} ${q}`;
    btn.onclick = () => sendQuickReply(q);
    container.appendChild(btn);
  });
}

// =============== 4. وظائف الشات ===============
const welcomeMessages = [
  "مرحباً! كيف يمكنني مساعدتك اليوم؟ 😊",
  "أهلاً بك! أنا هنا للإجابة على استفساراتك. 🤗",
  "مساء الخير! ما الذي يمكنني مساعدتك به؟ 🌟",
];

function toggleChat() {
  const chatbotWindow = document.getElementById("chatbotWindow");
  if (!chatbotWindow) return;

  if (chatbotWindow.style.display === "flex") {
    chatbotWindow.classList.remove("active");
    setTimeout(() => {
      chatbotWindow.style.display = "none";
    }, 300);
  } else {
    chatbotWindow.style.display = "flex";
    setTimeout(() => {
      chatbotWindow.classList.add("active");
    }, 10);
    setTimeout(() => {
      const body = document.getElementById("chatbotBody");
      body.innerHTML = ""; // مسح أي محتوى سابق
      addBotMessage(
        welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)],
      );
      addBotMessage("اختر سؤالاً من القائمة أدناه:");
    }, 500);
  }
}

function sendQuickReply(question) {
  const typing = document.getElementById("typingIndicator");
  if (typing) typing.style.display = "block";

  addUserMessage(question);

  setTimeout(() => {
    if (typing) typing.style.display = "none";
    const response = (window.faq || {})[question] || "عذرًا، لم أفهم سؤالك. 🙏";
    addBotMessage(response);
  }, 1000);
}

function addUserMessage(msg) {
  const body = document.getElementById("chatbotBody");
  if (!body) return;
  const el = document.createElement("div");
  el.className = "chatbot-message user-message";
  el.textContent = msg;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

function addBotMessage(msg) {
  const body = document.getElementById("chatbotBody");
  if (!body) return;
  const el = document.createElement("div");
  el.className = "chatbot-message bot-message";
  el.textContent = msg;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

// =============== 5. إغلاق عند النقر خارج النافذة ===============
document.addEventListener("click", function (e) {
  const win = document.getElementById("chatbotWindow");
  const icon = document.querySelector(".chatbot-icon");
  if (
    win &&
    icon &&
    win.style.display === "flex" &&
    !win.contains(e.target) &&
    !icon.contains(e.target)
  ) {
    win.classList.remove("active");
    setTimeout(() => {
      win.style.display = "none";
    }, 300);
  }
});
