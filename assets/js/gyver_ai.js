/**
 * Gyver Studio – Gyver AI Assistant Engine
 * Automatically generates quizzes, lesson summaries, and answers questions from slides/files
 */

(function () {
    const STORAGE_KEY_GEMINI = 'gyver_gemini_api_key';

    let currentContext = {
        title: '',
        description: '',
        fileType: '',
        url: ''
    };

    let generatedQuestions = [];

    // Built-in intelligent educational fallback generator
    function generateSmartCurriculumQuestions(topic, count = 5) {
        const cleanTopic = (topic || 'บทเรียน').trim();
        const templates = [
            {
                q: `ข้อใดอธิบายความหมายหรือหลักการสำคัญของ "${cleanTopic}" ได้ถูกต้องที่สุด?`,
                choices: [
                    `เป็นกระบวนการหรือเครื่องมือหลักในการเรียนรู้และแก้ปัญหาอย่างเป็นระบบในหัวข้อนี้`,
                    `เป็นเพียงการเก็บข้อมูลชั่วคราวที่ไม่ส่งผลต่อการประมวลผล`,
                    `เป็นคำสั่งที่ใช้ยกเลิกการทำงานทั้งหมดของระบบ`,
                    `เป็นฟังก์ชันที่ไม่เกี่ยวข้องกับการเรียนการสอนในบทนี้`
                ],
                correct: 0,
                explanation: `หลักการของ ${cleanTopic} มุ่งเน้นการทำความเข้าใจเพื่อนำไปประยุกต์ใช้อย่างถูกต้อง`
            },
            {
                q: `ประโยชน์สำคัญที่สุดของการศึกษาและปฏิบัติตามเรื่อง "${cleanTopic}" คือข้อใด?`,
                choices: [
                    `ช่วยให้สามารถวิเคราะห์และแก้ปัญหาได้อย่างมีประสิทธิภาพตามขั้นตอน`,
                    `ทำให้ไม่ต้องทำการตรวจสอบความถูกต้องของผลลัพธ์`,
                    `ลดเวลาในการเรียนรู้ลงโดยไม่จำเป็นต้องฝึกฝน`,
                    `ช่วยให้ระบบทำงานได้โดยไม่ต้องมีผู้ใช้งาน`
                ],
                correct: 0,
                explanation: `การเรียนรู้หัวข้อนี้ช่วยพัฒนาทักษะการคิดเชิงคำนวณและการแก้ปัญหาอย่างเป็นระบบ`
            },
            {
                q: `หากต้องการนำความรู้เรื่อง "${cleanTopic}" ไปประยุกต์ใช้งานจริง ควรเริ่มต้นจากขั้นตอนใด?`,
                choices: [
                    `ทำความเข้าใจปัญหาและวางแผนออกแบบขั้นตอนการทำงานก่อนลงมือทำ`,
                    `เขียนคำสั่งทันทีโดยไม่ต้องกำหนดเป้าหมาย`,
                    `ข้ามขั้นตอนการทดสอบและนำไปเผยแพร่ทันที`,
                    `คัดลอกผลงานของผู้อื่นโดยไม่ต้องตรวจสอบ`
                ],
                correct: 0,
                explanation: `การวางแผนและการออกแบบอย่างมีโครงสร้างเป็นหัวใจสำคัญก่อนเริ่มลงมือปฏิบัติ`
            },
            {
                q: `ข้อใดเป็นข้อควรระวังหรือข้อผิดพลาดที่พบบ่อยในการทำงานกับ "${cleanTopic}"?`,
                choices: [
                    `การละเลยขั้นตอนการตรวจสอบข้อผิดพลาด (Debugging) และไม่วางแผนล่วงหน้า`,
                    `การบันทึกข้อมูลอย่างสม่ำเสมอ`,
                    `การตั้งชื่อตัวแปรหรือไฟล์ให้สื่อความหมาย`,
                    `การปรึกษาครูผู้สอนเมื่อพบข้อสงสัย`
                ],
                correct: 0,
                explanation: `การไม่ทดสอบและตรวจสอบความถูกต้องมักทำให้เกิดข้อผิดพลาดที่แก้ไขยากภายหลัง`
            },
            {
                q: `เมื่อศึกษาเนื้อหาเรื่อง "${cleanTopic}" จบแล้ว ขั้นตอนถัดไปที่เหมาะสมที่สุดคือข้อใด?`,
                choices: [
                    `นำความรู้ไปฝึกทำแบบฝึกหัด และสร้างโครงงานเพื่อทดสอบความเข้าใจ`,
                    `หยุดฝึกฝนทันทีเพราะเข้าใจเนื้อหาทั้งหมดแล้ว`,
                    `ลบไฟล์เอกสารและชีทเรียนทิ้งทั้งหมด`,
                    `รอให้ถึงวันสอบโดยไม่ต้องทบทวนซ้ำ`
                ],
                correct: 0,
                explanation: `การฝึกฝนผ่านโครงงานหรือแบบฝึกหัดจะช่วยเปลี่ยนความรู้ให้เป็นทักษะที่ติดตัว`
            }
        ];

        return templates.slice(0, count);
    }

    // Call Gemini API if Key is present, otherwise use smart curriculum generator
    async function generateAIQuiz(topic, count = 5) {
        const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
        if (apiKey && apiKey.trim()) {
            try {
                const prompt = `คุณคือผู้เชี่ยวชาญการสอนและออกข้อสอบของ Gyver Studio 
จงสร้างข้อสอบปรนัยจำนวน ${count} ข้อ จากหัวข้อ/สไลด์: "${topic}"
โดยส่งผลลัพธ์เป็น JSON Array เท่านั้น ในรูปแบบ:
[
  {
    "q": "โจทย์คำถามภาษาไทย",
    "choices": ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
    "correct": 0, // index 0-3 ของคำตอบที่ถูกต้อง
    "explanation": "คำอธิบายเหตุผลสั้นๆ"
  }
]
ห้ามมีคำนำหรือ markdown อื่นๆ ส่งเฉพาะ raw JSON array.`;

                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanJson);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            } catch (err) {
                console.warn('[GyverAI] Gemini API failed, falling back to smart generator:', err);
            }
        }

        // Fallback
        return generateSmartCurriculumQuestions(topic, count);
    }

    // Generate Lesson Summary
    async function generateAISummary(topic) {
        const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
        if (apiKey && apiKey.trim()) {
            try {
                const prompt = `จงสรุปเนื้อหาสำคัญ 4 ข้อ ของหัวข้อการสอนเรื่อง "${topic}" เพื่อให้ครูนำไปสรุปให้นักเรียนฟังใน 1 นาที โดยใช้ภาษาไทยที่เป็นมิตร ชัดเจน เข้าใจง่าย และมีไอคอนประกอบแต่ละข้อ`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (res.ok) {
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text;
                }
            } catch (_) {}
        }

        return `📌 **สรุปประเด็นสำคัญของบทเรียน: ${topic}**\n\n` +
               `1. 🎯 **แนวคิดหลัก:** ทำความเข้าใจโครงสร้างและเป้าหมายของเนื้อหาเพื่อนำไปประยุกต์ใช้งาน\n` +
               `2. ⚙️ **ขั้นตอนการทำงาน:** เรียนรู้ลำดับขั้นตอนอย่างเป็นระบบเพื่อลดข้อผิดพลาด\n` +
               `3. 💡 **เทคนิคสำคัญ:** ฝึกฝนการตรวจสอบผลลัพธ์และทดลองเขียนคำสั่งหรือปฏิบัติจริง\n` +
               `4. 🚀 **ก้าวถัดไป:** นำความรู้ไปต่อยอดในแบบฝึกหัดและการแข่งขัน Code Race`;
    }

    // Modal UI
    function ensureModalInDOM() {
        if (document.getElementById('gyverAIModal')) return;

        const modalHtml = `
            <div class="modal fade gyver-ai-modal" id="gyverAIModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <!-- Header -->
                        <div class="gyver-ai-header d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-2.5">
                                <div class="rounded-3 p-2 bg-purple text-white shadow-sm" style="background: linear-gradient(135deg, #ec4899, #8b5cf6);">
                                    <i class="bi bi-stars fs-5"></i>
                                </div>
                                <div>
                                    <div class="d-flex align-items-center gap-2">
                                        <h5 class="fw-bold m-0 text-white">Gyver AI Assistant</h5>
                                        <span class="gyver-ai-badge"><i class="bi bi-cpu-fill"></i> SMART COPILOT</span>
                                    </div>
                                    <p class="text-white-50 small m-0 mt-0.5" id="ai-modal-topic-subtitle">กำลังประมวลผลสไลด์...</p>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-2.5" onclick="GyverAI.promptApiKey()" title="ตั้งค่า Gemini API Key">
                                    <i class="bi bi-key-fill text-warning"></i>
                                </button>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                        </div>

                        <!-- Navigation Tabs -->
                        <div class="px-4 pt-3 pb-2 border-bottom border-secondary border-opacity-25 bg-dark bg-opacity-50">
                            <ul class="nav gyver-ai-tabs gap-2" id="aiTabs" role="tablist">
                                <li class="nav-item">
                                    <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-ai-quiz">
                                        <i class="bi bi-patch-question-fill me-1 text-warning"></i> 1. ออกข้อสอบอัตโนมัติ
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-ai-summary" onclick="GyverAI.triggerSummary()">
                                        <i class="bi bi-file-earmark-text-fill me-1 text-info"></i> 2. สรุปเนื้อหาบทเรียน
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-ai-chat">
                                        <i class="bi bi-chat-dots-fill me-1 text-success"></i> 3. ถาม-ตอบ AI
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <!-- Modal Body -->
                        <div class="modal-body p-4" style="max-height: 70vh; overflow-y: auto;">
                            <div class="tab-content" id="aiTabsContent">
                                
                                <!-- TAB 1: ออกข้อสอบ -->
                                <div class="tab-pane fade show active" id="tab-ai-quiz">
                                    <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-3 p-3 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-25">
                                        <div class="d-flex align-items-center gap-2">
                                            <label class="small text-white-50 fw-bold">จำนวนข้อ:</label>
                                            <select id="ai-quiz-count" class="form-select form-select-sm bg-dark text-white border-secondary rounded-pill" style="width: 90px;">
                                                <option value="3">3 ข้อ</option>
                                                <option value="5" selected>5 ข้อ</option>
                                                <option value="10">10 ข้อ</option>
                                            </select>
                                        </div>
                                        <button type="button" class="btn btn-sm rounded-pill px-4 ai-glow-btn" id="btn-generate-ai-quiz" onclick="GyverAI.triggerGenerateQuiz()">
                                            <i class="bi bi-stars me-1"></i> สั่ง AI ออกข้อสอบเดี๋ยวนี้
                                        </button>
                                    </div>

                                    <!-- Loading Spinner -->
                                    <div id="ai-quiz-loading" class="text-center py-5 d-none">
                                        <div class="spinner-border text-info mb-2" role="status"></div>
                                        <div class="small text-white-50">Gyver AI กำลังวิเคราะห์เนื้อหาและเขียนข้อสอบ...</div>
                                    </div>

                                    <!-- Question Container -->
                                    <div id="ai-questions-container">
                                        <div class="text-center py-4 text-white-50">
                                            คลิกปุ่ม <b>"สั่ง AI ออกข้อสอบเดี๋ยวนี้"</b> ด้านบนเพื่อเริ่มสร้างโจทย์คำถาม
                                        </div>
                                    </div>

                                    <!-- Action Bar (when questions are ready) -->
                                    <div id="ai-quiz-actions" class="d-none mt-3 pt-3 border-top border-secondary border-opacity-25 d-flex align-items-center justify-content-between flex-wrap gap-2">
                                        <div class="text-white-50 small" id="ai-quiz-stats">5 ข้อสอบสร้างสำเร็จ</div>
                                        <div class="d-flex gap-2">
                                            <button type="button" class="btn btn-outline-info btn-sm rounded-pill px-3 fw-bold" onclick="GyverAI.saveToQuestionBank()">
                                                <i class="bi bi-box-arrow-in-down me-1"></i> บันทึกเข้าคลังข้อสอบ
                                            </button>
                                            <button type="button" class="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold" onclick="GyverAI.shareQuizToWorkChat()">
                                                <i class="bi bi-send-check-fill me-1"></i> ส่งเข้า WorkChat
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- TAB 2: สรุปบทเรียน -->
                                <div class="tab-pane fade" id="tab-ai-summary">
                                    <div id="ai-summary-loading" class="text-center py-5 d-none">
                                        <div class="spinner-border text-info mb-2"></div>
                                        <div class="small text-white-50">AI กำลังสรุปเนื้อหาสำคัญ...</div>
                                    </div>
                                    <div id="ai-summary-content" class="p-3 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-25 text-white" style="line-height: 1.8; white-space: pre-wrap;">
                                    </div>
                                </div>

                                <!-- TAB 3: ถาม-ตอบ AI -->
                                <div class="tab-pane fade" id="tab-ai-chat">
                                    <div class="p-3 rounded-4 bg-dark bg-opacity-40 border border-secondary border-opacity-25 mb-3" id="ai-qa-box" style="min-height: 160px; max-height: 250px; overflow-y: auto;">
                                        <div class="text-white-50 small text-center py-4">พิมพ์คำถามเกี่ยวกับเนื้อหาในสไลด์เพื่อให้ AI ช่วยอธิบายเพิ่มเติม</div>
                                    </div>
                                    <div class="input-group">
                                        <input type="text" id="ai-qa-input" class="form-control bg-dark text-white border-secondary rounded-start-pill px-3" placeholder="ถามเกี่ยวกับสไลด์นี้ เช่น แนะนำวิธีสอนนักเรียนบทนี้..." onkeydown="if(event.key==='Enter') GyverAI.askQuestion()">
                                        <button class="btn btn-primary rounded-end-pill px-4 fw-bold" type="button" onclick="GyverAI.askQuestion()">
                                            <i class="bi bi-send-fill"></i>
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml;
        document.body.appendChild(wrapper.firstElementChild);
    }

    // Open Modal
    function openModal(ctx) {
        currentContext = {
            title: ctx.title || 'สื่อการสอน',
            description: ctx.description || '',
            fileType: ctx.fileType || '',
            url: ctx.url || ''
        };

        ensureModalInDOM();

        const subtitle = document.getElementById('ai-modal-topic-subtitle');
        if (subtitle) subtitle.textContent = `เรื่อง: "${currentContext.title}" (${currentContext.fileType || 'Slide'})`;

        const myModal = new bootstrap.Modal(document.getElementById('gyverAIModal'));
        myModal.show();
    }

    // Trigger Quiz Generation
    async function triggerGenerateQuiz() {
        const count = parseInt(document.getElementById('ai-quiz-count')?.value || '5');
        const loading = document.getElementById('ai-quiz-loading');
        const container = document.getElementById('ai-questions-container');
        const actions = document.getElementById('ai-quiz-actions');

        if (loading) loading.classList.remove('d-none');
        if (container) container.innerHTML = '';
        if (actions) actions.classList.add('d-none');

        const questions = await generateAIQuiz(currentContext.title, count);
        generatedQuestions = questions;

        if (loading) loading.classList.add('d-none');

        if (container) {
            container.innerHTML = questions.map((q, idx) => {
                const choicesHtml = q.choices.map((c, cIdx) => `
                    <div class="ai-choice-item ${cIdx === q.correct ? 'is-correct' : ''}">
                        <span class="badge ${cIdx === q.correct ? 'bg-success' : 'bg-secondary'} rounded-circle" style="width: 20px; height: 20px; display:inline-flex; align-items:center; justify-content:center;">${String.fromCharCode(65 + cIdx)}</span>
                        <span>${escapeHtml(c)}</span>
                        ${cIdx === q.correct ? '<i class="bi bi-check-circle-fill ms-auto text-success"></i>' : ''}
                    </div>
                `).join('');

                return `
                    <div class="ai-question-card">
                        <div class="fw-bold text-white mb-2" style="font-size: 0.95rem;">
                            <span class="text-info me-1">ข้อที่ ${idx + 1}:</span> ${escapeHtml(q.q)}
                        </div>
                        <div class="ms-1 mb-2">
                            ${choicesHtml}
                        </div>
                        ${q.explanation ? `<div class="small text-white-50 fst-italic"><i class="bi bi-info-circle me-1"></i>${escapeHtml(q.explanation)}</div>` : ''}
                    </div>
                `;
            }).join('');
        }

        if (actions) {
            actions.classList.remove('d-none');
            const stats = document.getElementById('ai-quiz-stats');
            if (stats) stats.textContent = `สร้างข้อสอบสำเร็จ ${questions.length} ข้อ`;
        }
    }

    // Trigger Lesson Summary
    async function triggerSummary() {
        const loading = document.getElementById('ai-summary-loading');
        const content = document.getElementById('ai-summary-content');

        if (loading) loading.classList.remove('d-none');
        if (content) content.textContent = '';

        const summary = await generateAISummary(currentContext.title);

        if (loading) loading.classList.add('d-none');
        if (content) content.textContent = summary;
    }

    // Ask AI Question
    async function askQuestion() {
        const input = document.getElementById('ai-qa-input');
        const box = document.getElementById('ai-qa-box');
        if (!input || !input.value.trim() || !box) return;

        const q = input.value.trim();
        input.value = '';

        const userMsgHtml = `
            <div class="d-flex justify-content-end mb-2">
                <div class="p-2 px-3 rounded-4 bg-primary text-white small" style="max-width: 80%;">
                    ${escapeHtml(q)}
                </div>
            </div>
        `;
        box.innerHTML += userMsgHtml;
        box.scrollTop = box.scrollHeight;

        // Generate response
        const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
        let ans = `ในฐานะผู้ช่วยสอน สำหรับเรื่อง "${currentContext.title}" แนะนำให้เชื่อมโยงคำถามนี้นักเรียนลองลงมือปฏิบัติจริง จะช่วยให้นักเรียนเข้าใจได้ชัดเจนยิ่งขึ้นครับ!`;

        if (apiKey && apiKey.trim()) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `บริบท: หัวข้อสไลด์เรื่อง "${currentContext.title}"\nคำถาม: ${q}\nตอบคำถามอย่างเป็นประโยชน์สำหรับครูผู้สอน สั้นกระชับ ตรงประเด็น:` }] }]
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    ans = data.candidates?.[0]?.content?.parts?.[0]?.text || ans;
                }
            } catch (_) {}
        }

        const aiMsgHtml = `
            <div class="d-flex justify-content-start mb-2">
                <div class="p-2 px-3 rounded-4 bg-dark border border-secondary border-opacity-50 text-white small" style="max-width: 85%;">
                    <i class="bi bi-stars text-warning me-1"></i> ${escapeHtml(ans)}
                </div>
            </div>
        `;
        box.innerHTML += aiMsgHtml;
        box.scrollTop = box.scrollHeight;
    }

    // Save to Question Bank in Supabase
    async function saveToQuestionBank() {
        if (!generatedQuestions || generatedQuestions.length === 0) return;
        if (!window.supabaseClient) {
            Swal.fire('แจ้งเตือน', 'กรุณาล็อกอินก่อนบันทึกเข้าคลังข้อสอบ', 'warning');
            return;
        }

        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            const uId = session?.user?.id;
            if (!uId) {
                Swal.fire('กรุณาล็อกอิน', 'ต้องล็อกอินเพื่อบันทึกคลังข้อสอบส่วนตัว', 'info');
                return;
            }

            const subjectKey = currentContext.title + ' - AI Generated - รวม';

            // Check if exists
            const { data: existing } = await window.supabaseClient
                .from('quiz_subjects')
                .select('*')
                .eq('subject_key', subjectKey)
                .eq('user_id', uId)
                .maybeSingle();

            let finalQuestions = generatedQuestions;
            if (existing && Array.isArray(existing.questions)) {
                finalQuestions = [...existing.questions, ...generatedQuestions];
                await window.supabaseClient
                    .from('quiz_subjects')
                    .update({ questions: finalQuestions })
                    .eq('id', existing.id);
            } else {
                await window.supabaseClient
                    .from('quiz_subjects')
                    .insert([{
                        user_id: uId,
                        subject_key: subjectKey,
                        questions: finalQuestions
                    }]);
            }

            Swal.fire({
                icon: 'success',
                title: 'บันทึกเข้าคลังข้อสอบสำเร็จ!',
                text: `บันทึกโจทย์ ${generatedQuestions.length} ข้อ เข้าชุดวิชา "${subjectKey}" เรียบร้อยแล้ว`,
                confirmButtonText: 'ตกลง'
            });

        } catch (err) {
            console.error('Save to question bank error:', err);
            Swal.fire('เกิดข้อผิดพลาด', err.message || 'บันทึกไม่สำเร็จ', 'error');
        }
    }

    // Share Quiz to WorkChat
    async function shareQuizToWorkChat() {
        if (!generatedQuestions || generatedQuestions.length === 0) return;
        const quizText = generatedQuestions.map((q, i) => `${i + 1}. ${q.q}\n${q.choices.map((c, ci) => `  [${String.fromCharCode(65 + ci)}] ${c}`).join('\n')}`).join('\n\n');

        const messageText = `📝 **Gyver AI Quiz: ${currentContext.title}** (${generatedQuestions.length} ข้อ)\n\n${quizText}`;

        const newMsg = {
            id: 'msg_quiz_' + Date.now(),
            chat_id: 'general',
            sender_username: 'ai_copilot',
            sender_name: 'Gyver AI Assistant 🤖',
            avatar: 'robot',
            message_text: messageText,
            created_at: new Date().toISOString()
        };

        // Sync local storage
        try {
            const raw = localStorage.getItem('sgyver_workchat_messages');
            const msgs = raw ? JSON.parse(raw) : [];
            msgs.push(newMsg);
            localStorage.setItem('sgyver_workchat_messages', JSON.stringify(msgs.slice(-200)));
        } catch (_) {}

        // Sync Supabase
        if (window.supabaseClient) {
            try {
                const { data: cloudStore } = await window.supabaseClient
                    .from('lobbies')
                    .select('quiz_settings')
                    .eq('room_code', 'WORKCHAT')
                    .maybeSingle();

                let msgs = cloudStore?.quiz_settings?.messages || [];
                msgs.push(newMsg);

                await window.supabaseClient
                    .from('lobbies')
                    .update({
                        quiz_settings: { ...(cloudStore?.quiz_settings || {}), messages: msgs.slice(-200) }
                    })
                    .eq('room_code', 'WORKCHAT');
            } catch (_) {}
        }

        Swal.fire({
            icon: 'success',
            title: 'ส่งเข้า WorkChat แล้ว!',
            text: 'แชร์ข้อสอบเข้าห้องแชทกลางเรียบร้อยแล้ว',
            confirmButtonText: 'ตกลง'
        });
    }

    // Prompt for Gemini API Key
    function promptApiKey() {
        const current = localStorage.getItem(STORAGE_KEY_GEMINI) || '';
        Swal.fire({
            title: 'ตั้งค่า Google Gemini API Key',
            html: `
                <p class="text-muted small mb-2 text-start">หากต้องการใช้ AI พลังเต็มจาก Google Gemini 1.5 สามารถใส่ API Key ฟรีของคุณได้ที่นี่ (ระบบจะจำไว้ในเบราว์เซอร์นี้):</p>
                <input type="password" id="swal-gemini-key" class="form-control rounded-3" value="${escapeHtml(current)}" placeholder="AIzaSy...">
                <div class="mt-2 text-start small"><a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-info text-decoration-none"><i class="bi bi-box-arrow-up-right me-1"></i>รับ API Key ฟรีจาก Google AI Studio</a></div>
            `,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => document.getElementById('swal-gemini-key')?.value || ''
        }).then(res => {
            if (res.isConfirmed) {
                localStorage.setItem(STORAGE_KEY_GEMINI, res.value.trim());
                Swal.fire('บันทึกสำเร็จ', 'อัปเดต Gemini API Key เรียบร้อยแล้ว', 'success');
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    // Expose API
    window.GyverAI = {
        openModal: openModal,
        triggerGenerateQuiz: triggerGenerateQuiz,
        triggerSummary: triggerSummary,
        askQuestion: askQuestion,
        saveToQuestionBank: saveToQuestionBank,
        shareQuizToWorkChat: shareQuizToWorkChat,
        promptApiKey: promptApiKey
    };
})();
