// Silnik offline: sylaby + rymy. Bez zależności od UI.
const U = ['','jeden','dwa','trzy','cztery','pięć','sześć','siedem','osiem','dziewięć','dziesięć','jedenaście','dwanaście','trzynaście','czternaście','piętnaście','szesnaście','siedemnaście','osiemnaście','dziewiętnaście']
const T = ['','','dwadzieścia','trzydzieści','czterdzieści','pięćdziesiąt','sześćdziesiąt','siedemdziesiąt','osiemdziesiąt','dziewięćdziesiąt']
const H = ['','sto','dwieście','trzysta','czterysta','pięćset','sześćset','siedemset','osiemset','dziewięćset']
const p3 = (x: number) => [H[Math.floor(x / 100)], x % 100 < 20 ? U[x % 100] : T[Math.floor((x % 100) / 10)] + ' ' + U[x % 10]].join(' ')
export function num(n: number): string {
  if (n === 0) return 'zero'
  if (n >= 1e6) return String(n).split('').map(d => (d === '0' ? 'zero' : U[+d])).join(' ')
  const th = Math.floor(n / 1000), r = n % 1000
  const t = th ? (th === 1 ? 'tysiąc' : p3(th) + ' ' + (th % 10 >= 2 && th % 10 <= 4 && (th % 100 < 10 || th % 100 > 20) ? 'tysiące' : 'tysięcy')) : ''
  return (t + ' ' + p3(r)).replace(/\s+/g, ' ').trim()
}
const isV = (c?: string) => !!c && 'aąeęioóuy'.includes(c)
export function vowels(w: string): string[] {
  const s = w.toLowerCase(), out: string[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (!isV(c)) continue
    if (c === 'i' && isV(s[i + 1])) continue // "ia, ie, io, iu" = jedna sylaba
    out.push(c === 'y' ? 'i' : c === 'ó' ? 'u' : c === 'ą' ? 'o' : c === 'ę' ? 'e' : c)
  }
  return out
}
export function syl(w: string): number {
  if (/^\d+$/.test(w)) return num(parseInt(w, 10)).split(' ').reduce((a, x) => a + vowels(x).length, 0)
  if (/^[A-ZĄĆĘŁŃÓŚŹŻ]{2,5}$/.test(w)) return w.length // PLN -> Pe eL eN
  return vowels(w).length
}
export function prep(text: string, fast: boolean) {
  if (!fast) return text
  return text.replace(/\bw ogóle\b/gi, 'wogle').replace(/\bto jest\b/gi, 'to je').replace(/\bjest\b/gi, 'je')
}
const WORD = /[\p{L}\p{N}]+/gu
const VERB = /(ać|ić|yć|eć|ąć|ować|ował|owała|ały|ała|ało|ali|ił|iła|iło|ili|ują|ujesz|ają|isz|ysz)$/i
export type Tok = { t: string; g: number; mid: boolean }
export type Line = { raw: string; syl: number; words: number; toks: Tok[]; pre: 0 | 1 | 2; verb: boolean; stanza: number }
function match(a: string[], b: string[], aw: string, bw: string): boolean {
  if (!a.length || !b.length) return false
  const la = a[a.length - 1], lb = b[b.length - 1]
  if (la !== lb) return false
  if (a.length === 1 && b.length === 1) return true
  if (a.length === 1 || b.length === 1) { const poly = a.length === 1 ? bw : aw; return !isV(poly.slice(-1).toLowerCase()) || /ć$/.test(poly) }
  return a[a.length - 2] === b[b.length - 2]
}
export function analyze(text: string, fast: boolean): Line[] {
  const raws = prep(text, fast).split('\n')
  let st = 0
  const lines: Line[] = raws.map(raw => {
    if (!raw.trim()) { st++ ; return { raw, syl: 0, words: 0, toks: [], pre: 0, verb: false, stanza: -1 } as Line }
    const toks: Tok[] = []
    const segEnds = new Set<number>()
    const re = new RegExp(WORD.source, 'gu')
    let m: RegExpExecArray | null
    while ((m = re.exec(raw))) {
      toks.push({ t: m[0], g: -1, mid: false })
      const after = raw.slice(m.index + m[0].length).match(/^\s*([,;|])/)
      if (after) segEnds.add(toks.length - 1)
    }
    segEnds.add(toks.length - 1)
    toks.forEach((k, i) => (k.mid = segEnds.has(i) && i !== toks.length - 1))
    return { raw, syl: toks.reduce((a, k) => a + syl(k.t), 0), words: toks.length, toks, pre: 0, verb: false, stanza: st }
  })
  const byStanza = new Map<number, Line[]>()
  lines.filter(l => l.stanza >= 0 && l.toks.length).forEach(l => byStanza.set(l.stanza, [...(byStanza.get(l.stanza) || []), l]))
  for (const ls of byStanza.values()) {
    const cand: { tok: Tok; v: string[]; line: Line; end: boolean }[] = []
    ls.forEach(l => l.toks.forEach((k, i) => {
      const end = i === l.toks.length - 1
      if ((end || k.mid) && !/^\d+$/.test(k.t) && !/^[A-ZĄĆĘŁŃÓŚŹŻ]{2,5}$/.test(k.t)) cand.push({ tok: k, v: vowels(k.t), line: l, end })
    }))
    const par = cand.map((_, i) => i)
    const f = (x: number): number => (par[x] === x ? x : (par[x] = f(par[x])))
    for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
      if (cand[i].line === cand[j].line && cand[i].end && cand[j].end) continue
      if (match(cand[i].v, cand[j].v, cand[i].tok.t, cand[j].tok.t)) par[f(i)] = f(j)
    }
    const groups = new Map<number, number[]>()
    cand.forEach((_, i) => groups.set(f(i), [...(groups.get(f(i)) || []), i]))
    let gi = 0
    for (const idx of groups.values()) if (idx.length >= 2) { idx.forEach(i => (cand[i].tok.g = gi)); gi++ }
    // rymy przedszkolne: ta sama końcówka (3 litery) w stanzie
    const ends = ls.map(l => l.toks[l.toks.length - 1].t.toLowerCase())
    const cnt = new Map<string, number>()
    ends.forEach(e => e.length >= 4 && cnt.set(e.slice(-3), (cnt.get(e.slice(-3)) || 0) + 1))
    const verbs = ends.filter(e => e.length >= 4 && VERB.test(e)).length
    ls.forEach((l, i) => {
      const c = cnt.get(ends[i].slice(-3)) || 0
      l.pre = ends[i].length < 4 ? 0 : c >= 3 ? 2 : c === 2 ? 1 : 0
      l.verb = verbs >= 3 && ends[i].length >= 4 && VERB.test(ends[i])
    })
  }
  return lines
}
