<script setup lang="ts">
import { ref, computed } from 'vue'
import { analyze } from './engine'
const text = ref('przemierzam ulice gram ten syf dla moich ludzi\nna popękanym asfalcie który tak ciężko ostudzić\nciągle nie przestają patrzeć obserwują moje ruchy\nmijam twarze każdy na chodniku jak klony baz duszy\n')
const fast = ref(false), more = ref(false), gutter = ref<HTMLElement>(), ta = ref<HTMLTextAreaElement>()
const key = ref(localStorage.getItem('gemini_key') || ''), ai = ref(''), busy = ref(false), useAi = ref(false)
const lines = computed(() => analyze(text.value, fast.value))
const pal = ['#ef476f','#06d6a0','#ffd166','#118ab2','#c77dff','#ff9f1c','#2ec4b6','#f15bb5','#9bdeac','#8ecae6']
const col = (g: number) => (g < 0 ? 'transparent' : pal[g % pal.length])
const total = computed(() => ({ w: lines.value.reduce((a, l) => a + l.words, 0), s: lines.value.reduce((a, l) => a + l.syl, 0) }))
const stanzas = computed(() => { const m = new Map<number, number>(); lines.value.forEach(l => l.stanza >= 0 && m.set(l.stanza, (m.get(l.stanza) || 0) + l.syl)); return [...m.values()] })
const max = computed(() => Math.max(1, ...lines.value.map(l => l.syl)))
const warn = computed(() => lines.value.filter(l => l.pre === 2 || l.verb).length)
const sync = () => { if (gutter.value && ta.value) gutter.value.scrollTop = ta.value.scrollTop }
const saveKey = () => localStorage.setItem('gemini_key', key.value)
async function summarize() {
  busy.value = true; ai.value = ''
  try {
    const prompt = 'Oceń polski tekst rapowy jak Brudna Małpa (Chudy Dred): rymy wyższe (zgodne ostatnie 2 samogłoski) są dobre, przedszkolne (ta sama końcówka) i czasownikowe w 3+ linijkach są słabe, doceniaj rymy wielosylabowe i wewnętrzne. Daj: ocenę 1-10, % linijek z rymem wewnętrznym, gęstość rymów, co działa, co zgrzyta. Bez przepisywania tekstu za autora.\n\n' + text.value
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key.value), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) })
    const j = await r.json()
    ai.value = j.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(j.error || j)
  } catch (e) { ai.value = 'Błąd: ' + e } finally { busy.value = false }
}
</script>
<template>
<div class="app">
  <header><b>Rymownik</b>
    <label><input type="checkbox" v-model="fast"> Sylaby jak się mówi („w ogóle” → „wogle”)</label>
    <label><input type="checkbox" v-model="more"> Więcej</label>
    <label><input type="checkbox" v-model="useAi"> AI (Gemini)</label>
    <span class="hint">Rym w środku linijki zaznacz przecinkiem lub „|” po słowie. Warn.: {{ warn }}</span>
  </header>
  <main>
    <section class="ed">
      <div class="gut" ref="gutter"><div v-for="(l, i) in lines" :key="i" class="n">{{ l.syl || '' }}</div></div>
      <textarea ref="ta" v-model="text" wrap="off" spellcheck="false" @scroll="sync"></textarea>
    </section>
    <section class="pv">
      <div v-for="(l, i) in lines" :key="i" class="ln" :class="{ blank: !l.toks.length }">
        <span v-for="(k, j) in l.toks" :key="j" class="w" :style="{ background: col(k.g), color: k.g >= 0 ? '#111' : 'inherit' }">{{ k.t }}</span>
        <span v-if="l.pre" class="wave red" :style="{ opacity: l.pre === 2 ? 1 : .35 }" title="rym przedszkolny"></span>
        <span v-if="l.verb" class="wave org" title="rym czasownikowy"></span>
      </div>
    </section>
  </main>
  <section v-if="more" class="more">
    <p>Słowa: <b>{{ total.w }}</b> · Sylaby: <b>{{ total.s }}</b> · Sylaby/zwrotkę: <b>{{ stanzas.join(' / ') }}</b></p>
    <div class="chart"><div v-for="(l, i) in lines" :key="i" class="bar" :style="{ height: (l.syl / max) * 100 + '%' }" :title="l.syl + ' sylab'"></div></div>
    <small>Wykres gęstości: sylaby w kolejnych linijkach. Czerwona fala = przedszkolne (jaśniejsza: tylko 2), pomarańczowa = czasownikowe (3+).</small>
  </section>
  <section v-if="useAi" class="more">
    <input v-model="key" @change="saveKey" type="password" placeholder="Klucz Google AI Studio (zapis w localStorage)">
    <button :disabled="busy || !key" @click="summarize">{{ busy ? 'Analizuję…' : 'Wygeneruj podsumowanie' }}</button>
    <pre v-if="ai">{{ ai }}</pre>
  </section>
</div>
</template>
<style>
:root{color-scheme:dark}body{margin:0;background:#14141a;color:#eee;font:16px/28px system-ui,sans-serif}
.app{max-width:1200px;margin:auto;padding:12px}header{display:flex;gap:16px;flex-wrap:wrap;align-items:center;line-height:1.4;margin-bottom:12px}
.hint{opacity:.6;font-size:13px;margin-left:auto}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:800px){main{grid-template-columns:1fr}}
.ed{display:flex;background:#1d1d26;border-radius:8px;height:420px;overflow:hidden}
.gut{width:36px;overflow:hidden;padding:8px 0;text-align:right;color:#8a8aa0;font:13px/28px monospace;padding-right:6px;background:#191920}
textarea{flex:1;background:transparent;color:inherit;border:0;outline:0;resize:none;padding:8px;font:16px/28px system-ui;white-space:pre}
.pv{background:#1d1d26;border-radius:8px;padding:8px;height:420px;overflow:auto}.ln{position:relative;min-height:28px;padding-bottom:6px;white-space:nowrap}
.w{padding:2px 5px;border-radius:4px;margin-right:4px}.wave{position:absolute;left:0;right:0;bottom:0;height:6px;background-size:12px 6px}
.red{background-image:radial-gradient(circle at 6px 0,transparent 4px,#ef476f 4px,#ef476f 6px,transparent 6px);background-repeat:repeat-x}
.org{bottom:-6px;background-image:radial-gradient(circle at 6px 0,transparent 4px,#ff9f1c 4px,#ff9f1c 6px,transparent 6px);background-repeat:repeat-x}
.more{margin-top:12px;background:#1d1d26;border-radius:8px;padding:12px;line-height:1.5}.chart{display:flex;align-items:flex-end;gap:3px;height:100px}
.bar{flex:1;background:#118ab2;border-radius:2px 2px 0 0;min-height:2px}input[type=password]{width:60%;padding:6px}pre{white-space:pre-wrap}
</style>
