// 生成一个「全部闯关已完成」的 demo HTML，用于演示/截图。
// 数据只存在这个文件里，不影响主站或用户的真实存档。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 1) 读取题库
const bankSrc = read('js/bank.js');
const assign = 'window.QUESTLY_BANK_DATA = ';
const jsonStart = bankSrc.indexOf(assign);
if (jsonStart === -1) throw new Error('bank.js 格式不符');
let jsonStr = bankSrc.slice(jsonStart + assign.length).trim().replace(/;\s*$/, '');
const bank = JSON.parse(jsonStr);
const questions = bank.questions || [];

// 2) 构造全部完成的记录
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);
const recs = {};
questions.forEach((q) => {
  recs[q.idx] = [1, 1, 1, 0, 0, 0, 5, 1, 0, now, '', 0];
  // [answered, firstCorrect, attempts, errors, fav, inWrong, consecutiveCorrect, mastered, wrongStage, lastAnswered, note, flag]
});

// 3) 构造 meta
// 备考成就：全部点亮（id 取自 js/exam.js 的 ACH）
const EXAM_ACH_IDS = [
  'ex_first', 'ex_d10', 'ex_d50', 'ex_d100', 'ex_judge', 'ex_multi',
  'ex_wrong20', 'ex_combo10', 'ex_all404', 'ex_star3', 'ex_boss1', 'ex_boss90'
];
const unlocked = {};
EXAM_ACH_IDS.forEach((id) => { unlocked[id] = now; });

const meta = {
  k: 'main',
  combo: 404,
  comboBest: 404,
  examXp: 0,
  studyStreak: 1,
  lastStudyDate: today,
  history: { [today]: { answered: questions.length, correct: questions.length, minutes: 120 } },
  unlocked,
  bossDone: true,
  bossBestRate: 100,
  star3: true
};

// 4) settings（给合理的默认值，避免 NaN）
const settings = {
  examDate: '2026-08-05',
  dailyMinutes: 60,
  groupSize: 10,
  includeCorrect: false,
  prioritizeWrong: true,
  sound: false
};

const payload = { meta, recs, settings, exportedAt: now };
const state = JSON.stringify(payload).replace(/</g, '\\u003c');
const tag = '<script>window.QUESTLY_SAVED_STATE=' + state + ';<\/script>';

// 5) 基于 questly-offline.html 注入快照
let html = read('questly-offline.html');
html = html.replace(/<script>\s*window\.QUESTLY_SAVED_STATE[\s\S]*?<\/script>/i, '');
html = html.replace(/<head[^>]*>/i, (m) => m + '\n' + tag);

const out = path.join(ROOT, 'questly-demo.html');
fs.writeFileSync(out, html, 'utf8');
const kb = (fs.statSync(out).size / 1024).toFixed(1);
console.log(`✓ built ${out} (${kb} KB) — demo with ${questions.length} questions all completed`);
