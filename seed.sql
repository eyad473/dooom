-- مكتبة فيديوهات مصنّفة A1-C2
-- ملاحظة: search_query هي عبارة بحث يوتيوب (رابط بحث دائم) بدل رابط فيديو محدد،
-- عشان ما ينكسر الرابط لو انحذف الفيديو الأصلي، وبيعطيك دايمًا نتائج مشابهة حديثة.

-- ===== A1 =====
INSERT INTO content (level, category, title_ar, note_ar, search_query) VALUES
('A1', 'channel', 'BBC Learning English - أساسيات', 'دروس بسيطة جدًا للمبتدئين، بريطاني وواضح', 'BBC Learning English basics for beginners'),
('A1', 'cartoon', 'Peppa Pig', 'رسوم متحركة بجمل قصيرة وتكرار كتير، ممتاز لأذن المبتدئ', 'Peppa Pig full episodes English'),
('A1', 'channel', 'Simple English Videos', 'محادثات حقيقية ببطء ووضوح لمستوى مبتدئ', 'Simple English Videos beginner conversation'),
('A1', 'clips', 'VOA Learning English', 'أخبار بسرعة بطيئة ومفردات سهلة', 'VOA Learning English slow news');

-- ===== A2 =====
INSERT INTO content (level, category, title_ar, note_ar, search_query) VALUES
('A2', 'channel', 'English with Lucy - قواعد للمبتدئين', 'شرح واضح بلكنة بريطانية', 'English with Lucy beginner grammar lesson'),
('A2', 'channel', 'JenniferESL - نطق', 'تركيز على النطق والصوتيات', 'JenniferESL pronunciation lesson'),
('A2', 'series', 'Extra English', 'مسلسل كوميدي قصير مصمم خصيصًا لمتعلمي الإنجليزي', 'Extra English episode 1 full'),
('A2', 'conversation', 'Easy English - مقابلات شارع', 'أسئلة بسيطة لناس عاديين بالشارع', 'Easy English street interview beginner');

-- ===== B1 =====
INSERT INTO content (level, category, title_ar, note_ar, search_query) VALUES
('B1', 'channel', 'lingoni ENGLISH', 'دروس منظمة من A1 لـ B2', 'lingoni ENGLISH lesson'),
('B1', 'channel', 'Anglo-Link', 'قواعد ومفردات بلكنتين بريطاني وأمريكي', 'Anglo-Link grammar lesson'),
('B1', 'series', 'Friends (مسلسل)', 'مشاهد قصيرة بترجمة إنجليزي، لغة يومية عفوية', 'Friends sitcom scene English subtitles'),
('B1', 'conversation', 'Easy English - مقابلات متوسطة', 'محادثات أطول شوي من مستوى A2', 'Easy English interview intermediate'),
('B1', 'clips', 'TED-Ed', 'مقاطع قصيرة تشرح أفكار علمية ببساطة', 'TED-Ed short animated lesson');

-- ===== B2 =====
INSERT INTO content (level, category, title_ar, note_ar, search_query) VALUES
('B2', 'channel', 'English with Lucy - متقدم', 'مفردات ومصطلحات لمستوى أعلى', 'English with Lucy advanced vocabulary idioms'),
('B2', 'series', 'The Office (US)', 'كوميديا مكتبية، لغة يومية وعامية أمريكية', 'The Office US sitcom scene'),
('B2', 'clips', 'TED Talks', 'محاضرات قصيرة بمواضيع متنوعة وسرعة طبيعية شوي أبطأ', 'TED Talk full video'),
('B2', 'conversation', 'مقابلات بودكاست مقتطعة', 'حوارات حقيقية غير مُعدّة بالكامل', 'English podcast interview clip'),
('B2', 'clips', 'BBC Earth - وثائقي', 'وثائقيات طبيعة بلغة واضحة نسبيًا', 'BBC Earth documentary clip');

-- ===== C1 =====
INSERT INTO content (level, category, title_ar, note_ar, search_query) VALUES
('C1', 'clips', 'TED Talk كامل', 'محاضرة كاملة بسرعة طبيعية', 'TED Talk full length native speed'),
('C1', 'series', 'Sherlock (BBC)', 'حوار سريع ولهجة بريطانية غنية بالمفردات', 'Sherlock BBC scene'),
('C1', 'clips', 'Kurzgesagt', 'شرح علمي عميق بسرعة طبيعية ومفردات متخصصة', 'Kurzgesagt video'),
('C1', 'conversation', 'بودكاست غير مُعد', 'حوار عفوي بدون سكريبت، تحدي حقيقي للفهم', 'unscripted podcast interview conversation'),
('C1', 'clips', 'Wendover Productions', 'تحليل معمّق بمفردات اقتصادية وسياسية', 'Wendover Productions video');

-- ===== C2 =====
INSERT INTO content (level, category, title_ar, note_ar, search_query) VALUES
('C2', 'clips', 'Veritasium', 'علمي متقدم بسرعة أصلية كاملة', 'Veritasium video'),
('C2', 'series', 'ستاند أب كوميدي', 'فكاهة، تلاعب بالألفاظ، ثقافة أصلية - اختبار حقيقي للفهم', 'stand up comedy special full'),
('C2', 'conversation', 'حوار جماعي (Panel/Roundtable)', 'أكتر من متحدث بيقاطعوا بعض، لهجات مختلفة', 'podcast panel roundtable discussion'),
('C2', 'clips', 'نقاش سياسي/إخباري أصلي', 'تحليل إخباري بمفردات متخصصة وسرعة أصلية', 'BBC Newsnight discussion panel'),
('C2', 'series', 'سكيتشات ساخرة (SNL)', 'سخرية وهجاء، يعتمد فهم السياق الثقافي', 'Saturday Night Live sketch');
