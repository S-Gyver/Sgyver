/**
 * =============================================================================
 * 🧠 Gyver Quiz Smart Evaluator (Hybrid: Thai Regex + Fuzzy + Gemini AI)
 * ระบบตรวจคำตอบอัจฉริยะสำหรับข้อสอบพิมพ์ตอบ / คำถามกวน / คำถามเชาวน์
 * =============================================================================
 */

(function () {
    const STORAGE_KEY_GEMINI = 'gyver_gemini_api_key';

    // Read Gemini API Key from localStorage or caller options
    function getGeminiApiKey() {
        try {
            return localStorage.getItem(STORAGE_KEY_GEMINI) || '';
        } catch (_) {
            return '';
        }
    }

    // 1. ล้างคำสร้อย คำเกริ่น คำลงท้ายภาษาไทย และสัญลักษณ์
    function cleanThai(str) {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .replace(/[\s\-_.,!?~\"'\(\)\[\]\{\}\/\\:;]/g, '')
            .replace(/^(ก็คือ|ก็เป็น|ก็น่าจะ|คือ|ตอบว่า|มันคือ|ข้อนี้คือ|น่าจะเป็น|ก็|เป็น|มี|คือว่า)/g, '')
            .replace(/(ไง|อ่ะ|อะ|สิ|นะ|ครับ|ค่ะ|จ้า|วะ|เนี่ย|มั้ง|หรอก|เลย|คับ|คร้าบ|จร้า)+$/g, '');
    }

    // 2. คำนวณความคล้ายของข้อความ (Levenshtein Distance)
    function calculateSimilarity(s1, s2) {
        if (s1 === s2) return 1.0;
        if (!s1 || !s2 || s1.length === 0 || s2.length === 0) return 0.0;
        const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1,
                    track[j - 1][i] + 1,
                    track[j - 1][i - 1] + indicator
                );
            }
        }
        const distance = track[s2.length][s1.length];
        return 1 - (distance / Math.max(s1.length, s2.length));
    }

    // 3. ตรวจแบบ Tier 1-3 รวดเร็วในเครื่อง (0 วินาที / ฟรี 100%)
    function checkSmartAnswerFast(given, target, minSim = 0.70) {
        if (!given || !target) return { match: false, reason: 'คำตอบว่างเปล่า' };

        const gClean = cleanThai(given);
        const gRawLower = String(given).toLowerCase().trim();
        const targets = String(target).split(/[|,]/).map(t => t.trim()).filter(Boolean);

        for (const t of targets) {
            const tClean = cleanThai(t);
            const tRawLower = t.toLowerCase();

            // Tier 1: ตรงเป๊ะ
            if (gRawLower === tRawLower || gClean === tClean) {
                return { match: true, reason: 'ตรงกับเฉลยเป๊ะ (Exact Match)', method: 'exact' };
            }

            // Tier 2: คำสำคัญ (Substring)
            if (gClean.includes(tClean)) {
                return { match: true, reason: `พบคำตอบหลัก "${t}" ในประโยค`, method: 'substring' };
            }
            if (tClean.includes(gClean) && gClean.length >= 2) {
                return { match: true, reason: `คำตอบ "${given}" ตรงกับส่วนหนึ่งของเฉลย`, method: 'substring_reverse' };
            }

            // Tier 3: คำพิมพ์ตก/พิมพ์เพี้ยน (Fuzzy Similarity)
            const sim = calculateSimilarity(gClean, tClean);
            if (sim >= minSim) {
                return {
                    match: true,
                    reason: `คำสะกดใกล้เคียงเฉลย ${Math.round(sim * 100)}% (Fuzzy Match)`,
                    method: 'fuzzy',
                    similarity: sim
                };
            }
        }

        return { match: false, reason: 'ไม่ตรงกับเฉลยในระบบ' };
    }

    // 4. ตรวจด้วย Gemini AI (Tier 4 Fallback เมื่อคำตอบแปลกหรือซับซ้อน)
    async function evaluateWithGemini(given, target, questionTitle, apiKey) {
        if (!apiKey) return null;

        const prompt = `คุณคือผู้ช่วยตรวจข้อสอบภาษาไทยแนวคำถามกวนๆ คำถามเชาวน์ และคำถามอัตนัยสั้น
โจทย์คำถาม: "${questionTitle || 'คำถาม'}"
แนวคำตอบเฉลย: "${target}"
คำตอบของผู้เล่น: "${given}"

เกณฑ์พิจารณา:
1. หากคำตอบของผู้เล่นสื่อถึง "มุกเดียวกัน", "ความหมายเดียวกัน", หรือ "เจตนาเดียวกัน" กับเฉลย ให้ถือว่าถูกต้อง (isCorrect: true)
2. ยอมรับคำสร้อย คำเกริ่น (เช่น ก็...ไง, สิ, นะ, ครับ/ค่ะ) หรือประโยคพูดอธิบายที่ใจความสำคัญตรงกับเฉลย
3. หากคำตอบผิดความหมาย ผิดมุก หรือตอบไม่ตรงประเด็น ให้ถือว่าผิด (isCorrect: false)

ตอบเฉพาะ JSON Object เท่านั้น ห้ามใส่ markdown หรือข้อความอื่น:
{"isCorrect": true, "reason": "เหตุผลสั้นๆ ไม่เกิน 15 คำ"}`;

        const candidateModels = [
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-1.5-flash',
            'gemini-2.5-flash-lite'
        ];

        for (const model of candidateModels) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 60,
                            responseMimeType: 'application/json'
                        }
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(cleanJson);
                }
            } catch (err) {
                console.warn(`[Gemini Evaluator] Model ${model} skipped:`, err);
            }
        }

        return null;
    }

    // 5. เมธอดรวม (Hybrid Master Evaluator)
    async function evaluateTextAnswer(given, target, options = {}) {
        if (!given || !target) {
            return { isCorrect: false, reason: 'ไม่มีคำตอบ', method: 'none' };
        }

        const minSim = options.minSimilarity !== undefined ? options.minSimilarity : 0.70;

        // ด่าน 1-3: ตรวจในเครื่องก่อนเสมอ (เร็ว 0ms ไม่เสียโควตา AI)
        const fastResult = checkSmartAnswerFast(given, target, minSim);
        if (fastResult.match) {
            return {
                isCorrect: true,
                reason: fastResult.reason,
                method: fastResult.method,
                similarity: fastResult.similarity
            };
        }

        // ด่าน 4: ถ้าตรวจในเครื่องไม่ผ่าน และเปิดใช้งาน AI
        if (options.useAI !== false) {
            const apiKey = options.apiKey || localStorage.getItem(STORAGE_KEY_GEMINI) || '';
            if (apiKey && apiKey.trim()) {
                try {
                    const aiResult = await evaluateWithGemini(given, target, options.questionTitle || '', apiKey.trim());
                    if (aiResult && typeof aiResult.isCorrect === 'boolean') {
                        return {
                            isCorrect: aiResult.isCorrect,
                            reason: `AI ประเมิน: ${aiResult.reason || (aiResult.isCorrect ? 'ความหมายตรงกัน' : 'ความหมายไม่ตรง')}`,
                            method: 'gemini_ai'
                        };
                    }
                } catch (aiErr) {
                    console.warn('[QuizEvaluator] AI check skipped:', aiErr);
                }
            }
        }

        return {
            isCorrect: false,
            reason: fastResult.reason || 'คำตอบไม่ตรงกับเฉลย',
            method: 'rule_failed'
        };
    }

    // Export สู่ window
    window.GyverQuizEvaluator = {
        cleanThai: cleanThai,
        calculateSimilarity: calculateSimilarity,
        checkSmartAnswerFast: checkSmartAnswerFast,
        evaluateWithGemini: evaluateWithGemini,
        evaluateTextAnswer: evaluateTextAnswer
    };
})();
