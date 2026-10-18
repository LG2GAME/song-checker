<script setup lang="ts">
import { ref, computed } from 'vue'
import { analyze } from './engine'
const text = ref(''), fast = ref(false), more = ref(false), useAi = ref(false)
const bd = ref<HTMLElement>(), gut = ref<HTMLElement>(), ta = ref<HTMLTextAreaElement>()
const key = ref(localStorage.getItem('gemini_key') || ''), ai = ref(''), busy = ref(false)
const lines = computed(() => analyze(text.value, fast.value))
const hue = (g: number) => `hsla(${(g * 137) % 360},85%,58%,.42)`
const view = computed(() => lines.value.map(l => {
  const out: { t: string; g: number; w: string }[] = []
  let p = 0
  l.toks.forEach((k, i) => {
    if (k.s > p) out.push({ t: l.raw.slice(p, k.s), g: -1, w: '' })
    const last = i === l.toks.length - 1
    out.push({ t: k.t, g: k.g, w: last && l.pre ? (l.pre === 2 ? '#ef476f' : 'rgba(239,71,111,.35)') : last && l.verb ? '#ff9f1c' : '' })
    p = k.e
  })
  if (p < l.raw.length) out.push({ t: l.raw.slice(p), g: -1, w: '' })
  return out
}))
const total = computed(() => ({ w: lines.value.reduce((a, l) => a + l.words, 0), s: lines.value.reduce((a, l) => a + l.syl, 0) }))
const stanzas = computed(() => { const m = new Map<number, number>(); lines.value.forEach(l => l.stanza >= 0 && m.set(l.stanza, (m.get(l.stanza) || 0) + l.syl)); return [...m.values()] })
const max = computed(() => Math.max(1, ...lines.value.map(l => l.syl)))
const sync = () => { const t = ta.value!; if (bd.value) { bd.value.scrollTop = t.scrollTop; bd.value.scrollLeft = t.scrollLeft } if (gut.value) gut.value.scrollTop = t.scrollTop }
async function summarize() {
  busy.value = true; ai.value = ''; localStorage.setItem('gemini_key', key.value)
  try {
    const prompt = 'Oceń polski tekst rapowy jak Brudna Małpa (Chudy Dred): rymy wyższe (zgodne ostatnie 2 samogłoski) są dobre, przedszkolne (ta sama końcówka) i czasownikowe w 3+ linijkach są słabe, doceniaj rymy wielosylabowe i wewnętrzne. Daj: ocenę 1-10, % linijek z rymem wewnętrznym, gęstość rymów, co działa, co zgrzyta. Nie przepisuj tekstu za autora.\n\n' + text.value
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key.value), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) })
    const j = await r.json()
    ai.value = j.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(j.error || j)
  } catch (e) { ai.value = 'Błąd: ' + e } finally { busy.value = false }
}
</script>
<template>
<div class="app">
  <header>
    <h1>Rymownik</h1>
    <div class="pills">
      <button :class="{ on: fast }" @click="fast = !fast">Sylaby jak się mówi</button>
      <button :class="{ on: more }" @click="more = !more">Statystyki</button>
      <button :class="{ on: useAi }" @click="useAi = !useAi">AI</button>
    </div>
  </header>
  <div class="card">
    <div class="gut" ref="gut"><div v-for="(l, i) in lines" :key="i" class="n">{{ l.syl || '' }}</div></div>
    <div class="stack">
      <div class="bd" ref="bd" aria-hidden="true">
        <div v-for="(l, i) in view" :key="i" class="l"><template v-for="(p, j) in l" :key="j"><span v-if="p.g >= 0 || p.w" class="m" :style="{ background: p.g >= 0 ? hue(p.g) : 'none', textDecoration: p.w ? 'underline wavy ' + p.w : 'none' }">{{ p.t }}</span><template v-else>{{ p.t }}</template></template></div>
      </div>
      <textarea ref="ta" v-model="text" wrap="off" spellcheck="false" autofocus @scroll="sync"></textarea>
    </div>
  </div>
  <div v-if="more" class="panel">
    <div class="stats"><div><b>{{ total.w }}</b>słów</div><div><b>{{ total.s }}</b>sylab</div><div><b>{{ stanzas.join(' · ') || '–' }}</b>sylab / zwrotkę</div></div>
    <div class="chart"><div v-for="(l, i) in lines" :key="i" class="bar" :style="{ height: (l.syl / max) * 100 + '%' }" :title="l.syl + ' sylab'"></div></div>
    <div class="leg"><i class="r"></i> przedszkolne (jasne: 2 linijki) <i class="o"></i> czasownikowe 3+</div>
  </div>
  <div v-if="useAi" class="panel">
    <div class="row"><input v-model="key" type="password" placeholder="Klucz Google AI Studio (tylko w tej przeglądarce)"><button class="go" :disabled="busy || !key || !text" @click="summarize">{{ busy ? 'Analizuję…' : 'Wygeneruj podsumowanie' }}</button></div>
    <pre v-if="ai">{{ ai }}</pre>
  </div>
</div>
</template>
<style>
:root{color-scheme:dark;--lh:32px}*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(1200px 600px at 20% -10%,#2a1f4d,transparent),#0f0f17;color:#ececf4;font:18px/var(--lh) 'Inter',system-ui,sans-serif}
.app{max-width:1000px;margin:auto;padding:28px 16px}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
h1{margin:0;font-size:26px;letter-spacing:.5px;background:linear-gradient(90deg,#c77dff,#ef476f);-webkit-background-clip:text;color:transparent}
.pills{display:flex;gap:8px}.pills button{font:14px system-ui;color:#b8b8d0;background:#1b1b2a;border:1px solid #2c2c44;border-radius:999px;padding:6px 14px;cursor:pointer}
.pills button.on{background:#c77dff;color:#16121f;border-color:#c77dff}
.card{display:flex;height:62vh;min-height:360px;background:#171724;border:1px solid #2a2a40;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px #0008}
.gut{width:44px;flex:none;overflow:hidden;padding:16px 0;background:#13131e;border-right:1px solid #24243a;text-align:right;padding-right:10px;color:#7d7da0;font:13px var(--lh) ui-monospace,monospace}
.n{height:var(--lh)}.stack{position:relative;flex:1}
.bd,textarea{position:absolute;inset:0;margin:0;padding:16px 18px;font:18px/var(--lh) 'Inter',system-ui,sans-serif;white-space:pre;overflow:auto;letter-spacing:0;tab-size:4}
.bd{color:transparent;pointer-events:none;overflow:hidden}.l{height:var(--lh)}
.m{border-radius:4px;text-decoration-thickness:2px;text-underline-offset:5px;color:#ececf4}
textarea{background:transparent;color:#ececf4;caret-color:#fff;border:0;outline:0;resize:none;z-index:1;-webkit-text-fill-color:transparent}
.bd .l{color:#ececf4}
.panel{margin-top:14px;background:#171724;border:1px solid #2a2a40;border-radius:16px;padding:16px;line-height:1.5}
.stats{display:flex;gap:28px;margin-bottom:12px}.stats div{font-size:13px;color:#9a9ab8}.stats b{display:block;font-size:22px;color:#fff}
.chart{display:flex;align-items:flex-end;gap:4px;height:90px}.bar{flex:1;background:linear-gradient(#c77dff,#6a4cff);border-radius:3px 3px 0 0;min-height:2px}
.leg{margin-top:10px;font-size:13px;color:#9a9ab8}.leg i{display:inline-block;width:18px;height:3px;margin:0 4px 3px 12px}.r{background:#ef476f}.o{background:#ff9f1c}
.row{display:flex;gap:10px}input{flex:1;background:#0f0f17;border:1px solid #2c2c44;color:#fff;border-radius:10px;padding:8px 12px}
.go{background:#c77dff;border:0;border-radius:10px;padding:8px 16px;font-weight:600;cursor:pointer}.go:disabled{opacity:.4}pre{white-space:pre-wrap;font:15px/1.5 system-ui}
</style>
