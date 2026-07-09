/** @jsx jsx */
/** @jsxFrag React.Fragment */
import {
  React,
  jsx,
  css,
  DataSourceComponent,
  DataSourceStatus,
  type DataRecord,
  type DataSource,
  DataSourceManager,
  SessionManager,
} from "jimu-core";

import { Loading } from "jimu-ui";
import type { AllWidgetProps } from "jimu-core";
import type { IMConfig, ColumnDef } from "../config";
import { defaultConfig, DEFAULT_COLUMNS } from "../config";

type Props = AllWidgetProps<IMConfig>;

type OggettoLegendInfo = {
  label: string;
  description: string;
  color: string;
  x: number;
  y: number;
};

function getOriginePraticaPrefix(d: any, rec?: DataRecord): "TR" | "TI" {
  const op = pickField(d, "origine_pratica");
  if (op === 2 || op === "2") return "TI";
  if (op === 1 || op === "1") return "TR";

  // Fallback prudente per vecchi record/configurazioni prive di origine_pratica.
  const dsId = String((rec as any)?.dataSource?.id || "").toLowerCase();
  if (
    dsId.includes("gii_pratiche") ||
    dsId.includes("schema") ||
    dsId.includes("ti")
  )
    return "TI";
  return "TR";
}

function pickOfficialRapportoNumber(d: any): string {
  return String(
    getFirstValue(d, [
      "numero_rapporto",
      "numero_rapporto_tecnico",
      "num_rapporto",
      "codice_rapporto",
      "n_rapporto",
    ]) || "",
  ).trim();
}

function pickVerbaleNumber(d: any): string {
  return String(
    getFirstValue(d, ["accertamento_numero"]) || "",
  ).trim();
}

function getRilevazioneDisplay(rec: DataRecord): string {
  const a: any = rec?.getData?.() || {};
  const oid = a?.OBJECTID ?? a?.ObjectId ?? a?.objectid ?? a?.objectId;
  const prefix = getOriginePraticaPrefix(a, rec);
  const settore = getSettoreCodeFromRecord(a);
  const base = oid != null ? `${oid}-${prefix}` : `?-${prefix}`;
  return settore ? `${base}-${settore}` : base;
}

function getTipoPraticaDisplay(rec: DataRecord): string {
  const d: any = rec?.getData?.() || {};
  return pickOfficialRapportoNumber(d) ? "Rapporto tecnico" : "Rilevazione";
}

function getNumeroPraticaDisplay(rec: DataRecord): string {
  const d: any = rec?.getData?.() || {};
  return pickOfficialRapportoNumber(d) || getRilevazioneDisplay(rec);
}

function getNumeroRapportoDisplay(rec: DataRecord): string {
  const d: any = rec?.getData?.() || {};
  return pickOfficialRapportoNumber(d) || "—";
}

function getNumeroVerbaleDisplay(rec: DataRecord): string {
  const d: any = rec?.getData?.() || {};
  return pickVerbaleNumber(d) || "—";
}

function getCodPraticaDisplay(rec: DataRecord): string {
  return getNumeroPraticaDisplay(rec);
}

type SortDir = "ASC" | "DESC";
type SortItem = { field: string; dir: SortDir };

// Campi virtuali (ordinamento su campi calcolati)
const V_STATO = "__stato_sint__";
const V_FASE = "__fase_istruttoria__";
const V_TIPO_PRATICA = "__tipo_pratica__";
const V_NUMERO_RILEVAZIONE = "__numero_rilevazione__";
const V_NUMERO_PRATICA = "__numero_pratica__";
const V_NUMERO_VERBALE = "__accertamento_numero_display__";
const V_NUMERO_VERBALE_LEGACY = "__numero_atto_accertamento_display__";
function isNumeroAttoVirtualField (field: string): boolean { return field === V_NUMERO_VERBALE || field === V_NUMERO_VERBALE_LEGACY }
const V_ULTIMO = "__ultimo_agg__";
const V_PROSSIMA = "__prossima__";
const V_MITTENTE = "__mittente__";
const V_CAUSALE = "__causale__";
const V_DATA_MSG = "__data_msg__";

/** Normalizza un GlobalID: lowercase, senza graffe, trimmed */
function normGid(v: any): string {
  return String(v ?? "")
    .trim()
    .replace(/^\{|\}$/g, "")
    .toLowerCase();
}

/** Legge un campo dati in modo case-insensitive */
function pickField(d: any, name: string): any {
  if (d == null) return undefined;
  if (d[name] !== undefined) return d[name];
  const lc = name.toLowerCase();
  for (const k of Object.keys(d)) {
    if (k.toLowerCase() === lc) return d[k];
  }
  return undefined;
}

/** Normalizza label ruolo: RI_AMM → RI-AMM, TI_AMM → TI-AMM */
function labelNorm(s: string): string {
  return String(s || "")
    .replace(/RI_AMM/g, "RI-AMM")
    .replace(/TI_AMM/g, "TI-AMM");
}

function normalizeMioStatoLabel(label: any): string {
  const raw = labelNorm(String(label || "")).trim();
  const l = raw.toLowerCase().replace(/\s+/g, " ");
  if (!l || l === "—") return "—";

  if (l === "da prendere in carico" || l.startsWith("da prendere"))
    return "Da prendere in carico";
  if (
    l === "in carico" ||
    l.startsWith("presa in carico") ||
    l.startsWith("preso in carico")
  )
    return "In carico";
  if (l === "rimandato" || l.startsWith("rimandat")) return "Rimandato";
  if (
    l === "trasmesso" ||
    l.startsWith("trasmess") ||
    l === "approvato" ||
    l === "approvata" ||
    l === "sanzione approvata"
  )
    return "Trasmesso";
  if (l === "assegnato a ti-amm" || l === "assegnato a ti amm")
    return "Assegnato a TI-AMM";
  if (l === "assegnato a ti" || l.startsWith("assegnato"))
    return "Assegnato a TI";
  if (l === "respinto" || l.startsWith("respint")) return "Respinto";

  // Nessun fallback descrittivo: lo schema Excel ammette solo gli stati sopra.
  return "—";
}

function normalizeMioStatoView<T extends { label: string }>(view: T): T {
  return { ...view, label: normalizeMioStatoLabel(view.label) };
}

const ALLOWED_OGGETTI = new Set([
  "NUOVA RILEVAZIONE",
  "ASSEGNAZIONE ISTRUTTORIA",
  "TRASMISSIONE ISTRUTTORIA",
  "TRASMISSIONE BOZZA DETERMINAZIONE",
  "TRASMISSIONE PRATICA CON BOZZA DETERMINAZIONE",
  "BOZZA DI DETERMINAZIONE TRASMESSA",
  "ATTESTAZIONE DI CONFORMITÀ",
  "ISTRUTTORIA AMMINISTRATIVA APPROVATA",
  "RICHIESTA DI INTEGRAZIONE",
  "TRASMISSIONE INTEGRAZIONE",
  "RILEVAZIONE RESPINTA",
  "ISTRUTTORIA TECNICA RESPINTA",
  "ISTRUTTORIA TECNICA APPROVATA",
  "SANZIONE APPROVATA",
  "SANZIONE RESPINTA",
  "SANZIONE NOTIFICATA",
]);

const ALLOWED_LOG_EVENTI = new Set([
  "CREAZIONE",
  "NUOVA_ASSEGNAZIONE",
  "INTEGRAZIONE_TRASMESSA",
  "INTEGRAZIONE_RICHIESTA",
  "ISTRUTTORIA_TRASMESSA",
  "RAPPORTO_APPROVATO",
  "SANZIONE_APPROVATA",
  "SANZIONE_NOTIFICATA",
  "VERBALE_NOTIFICATO",
  "RESTITUZIONE_A_TI_AMM",
  "BOZZA_DETERMINAZIONE_TRASMESSA",
  "BOZZA_DETERMINAZIONE_TRASMESSA_DA",
  "RESPINTA",
  "RIMANDA_A_DT",
  "ATTESTAZIONE_CONFORMITA",
  "PROPOSTA_CONTESTAZIONE_APPROVATA",
]);

function normalizeOggettoLabel(label: any): string {
  const v = String(label || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  if (!v) return "—";
  if (v === "TRASMESSIONE ISTRUTTORIA") return "TRASMISSIONE ISTRUTTORIA";
  if (v === "TRASMESSIONE INTEGRAZIONE") return "TRASMISSIONE INTEGRAZIONE";
  if (ALLOWED_OGGETTI.has(v)) return v;
  return "—";
}

function isOggettoLogEvent(evento: any): boolean {
  const e = String(evento || "")
    .trim()
    .toUpperCase();
  return ALLOWED_LOG_EVENTI.has(e);
}

function normalizeLogRole(role: any): string {
  const r = String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (r === "RI_AMM" || r === "TI_AMM") return r;
  if (r === "DA_AMM") return "DA";
  if (r.startsWith("DT")) return "DT";
  if (r.startsWith("RI") && r !== "RI_AMM") return "RI";
  if (r.startsWith("RZ")) return "RZ";
  if (r.startsWith("TI") && r !== "TI_AMM") return "TI";
  if (r.startsWith("TR")) return "TR";
  if (r.startsWith("DA")) return "DA";
  return r;
}

/** Formatta la causale dal codice LOG in etichetta leggibile.
 *  Restituisce solo oggetti previsti dallo schema Excel; gli eventi tecnici
 *  come PRESA_IN_CARICO/ARCHIVIAZIONE non devono comparire nella colonna Oggetto.
 */
function formatCausale(evento: string): string {
  const e = String(evento || "")
    .trim()
    .toUpperCase();
  if (!e) return "—";
  if (e === "CREAZIONE") return "NUOVA RILEVAZIONE";
  if (e === "NUOVA_ASSEGNAZIONE") return "ASSEGNAZIONE ISTRUTTORIA";
  if (e === "INTEGRAZIONE_TRASMESSA") return "TRASMISSIONE INTEGRAZIONE";
  if (e === "INTEGRAZIONE_RICHIESTA") return "RICHIESTA DI INTEGRAZIONE";
  if (e === "ISTRUTTORIA_TRASMESSA") return "TRASMISSIONE ISTRUTTORIA";
  if (e === "ATTESTAZIONE_CONFORMITA") return "ATTESTAZIONE DI CONFORMITÀ";
  if (e === "PROPOSTA_CONTESTAZIONE_APPROVATA") return "ISTRUTTORIA AMMINISTRATIVA APPROVATA";
  if (e === "BOZZA_DETERMINAZIONE_TRASMESSA") return "TRASMISSIONE PRATICA CON BOZZA DETERMINAZIONE";
  if (e === "BOZZA_DETERMINAZIONE_TRASMESSA_DA") return "BOZZA DI DETERMINAZIONE TRASMESSA";
  if (e === "RAPPORTO_APPROVATO") return "ISTRUTTORIA TECNICA APPROVATA";
  if (e === "SANZIONE_APPROVATA") return "SANZIONE APPROVATA";
  if (e === "SANZIONE_NOTIFICATA" || e === "VERBALE_NOTIFICATO")
    return "SANZIONE NOTIFICATA";
  if (e === "RESTITUZIONE_A_TI_AMM") return "TRASMISSIONE INTEGRAZIONE";
  if (e === "RESPINTA") return "ISTRUTTORIA TECNICA RESPINTA";
  if (e === "RIMANDA_A_DT") return "TRASMISSIONE INTEGRAZIONE";
  return "—";
}

function isTransmissionReturnEvent(evento: any): boolean {
  const e = String(evento || "")
    .trim()
    .toUpperCase();
  return (
    e === "ISTRUTTORIA_TRASMESSA" ||
    e === "BOZZA_DETERMINAZIONE_TRASMESSA" ||
    e === "BOZZA_DETERMINAZIONE_TRASMESSA_DA" ||
    e === "INTEGRAZIONE_TRASMESSA" ||
    e === "RAPPORTO_APPROVATO" ||
    e === "SANZIONE_APPROVATA" ||
    e === "RESTITUZIONE_A_TI_AMM" ||
    e === "RIMANDA_A_DT" ||
    e === "ATTESTAZIONE_CONFORMITA" ||
    e === "PROPOSTA_CONTESTAZIONE_APPROVATA"
  );
}

type OpenIntegrationRequest = {
  requester: string;
  target: string;
};

function transmissionAnswersIntegration(log: LogEntry): boolean {
  const currentEvent = String(log.evento || "")
    .trim()
    .toUpperCase();
  if (!isTransmissionReturnEvent(currentEvent)) return false;

  // Ricostruisce le richieste di integrazione aperte come stack cronologico.
  // Le richieste possono essere annidate: ad esempio DT -> RI resta aperta
  // anche se RI -> TI e poi RZ -> TI aprono ulteriori richieste sotto di essa.
  // Una trasmissione di ritorno è integrazione finché almeno una richiesta resta
  // aperta; ogni richiesta si chiude solo quando la pratica rientra al ruolo che
  // l'aveva aperta.
  const chronological: LogHistoryItem[] = [
    ...(log.history || []).slice().reverse(),
    { evento: log.evento, ruolo: log.ruolo, ruoloDest: log.ruoloDest },
  ];
  const open: OpenIntegrationRequest[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const item = chronological[i];
    const event = String(item.evento || "")
      .trim()
      .toUpperCase();
    const sender = normalizeLogRole(item.ruolo);
    const receiver = normalizeLogRole(item.ruoloDest);
    const isCurrent = i === chronological.length - 1;

    if (event === "INTEGRAZIONE_RICHIESTA") {
      if (sender && receiver)
        open.push({ requester: sender, target: receiver });
      continue;
    }

    if (!isTransmissionReturnEvent(event)) continue;

    const isIntegrationReturn = open.length > 0;
    if (isCurrent) return isIntegrationReturn;

    if (isIntegrationReturn && receiver) {
      const closeIndex = open.map((req) => req.requester).lastIndexOf(receiver);
      if (closeIndex >= 0) open.splice(closeIndex);
    }
  }

  return false;
}

function num(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function txt(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function asJs<T = any>(v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v;
}

function parseToMs(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  const s = String(v);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function formatDateIt(v: any): string {
  if (v === null || v === undefined || v === "") return "";
  let d: Date | null = null;
  if (typeof v === "number") d = new Date(v);
  else if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) d = new Date(t);
  } else if (v instanceof Date) d = v;
  if (!d || Number.isNaN(d.getTime())) return txt(v);
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDateOnlyIt(v: any): string {
  if (v === null || v === undefined || v === "") return "";
  let d: Date | null = null;
  if (typeof v === "number") d = new Date(v);
  else if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) d = new Date(t);
  } else if (v instanceof Date) d = v;
  if (!d || Number.isNaN(d.getTime())) return txt(v);
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function isSurveyOriginRecord(d: any): boolean {
  const op = pickField(d, "origine_pratica");
  return op === 1 || op === "1";
}

function isMidnightUtcDateValue(v: any): boolean {
  const ms = parseToMs(v);
  if (ms === null) return false;
  const d = new Date(ms);
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

function sameLocalDate(a: any, b: any): boolean {
  const ma = parseToMs(a);
  const mb = parseToMs(b);
  if (ma === null || mb === null) return false;
  const da = new Date(ma);
  const db = new Date(mb);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function pickSurveyRuntimeDateMs(d: any, dateOnlyValue: any): number | null {
  const candidates = [
    "end",
    "End",
    "END",
    "start",
    "Start",
    "START",
    "CreationDate",
    "creationDate",
    "creationdate",
    "CREATIONDATE",
  ];
  for (const name of candidates) {
    const raw = pickField(d, name);
    const ms = parseToMs(raw);
    if (ms !== null && sameLocalDate(dateOnlyValue, ms)) return ms;
  }
  return null;
}

function pickRilevazioneDateMs(
  d: any,
  configuredField?: string,
): number | null {
  const field = configuredField || "data_rilevazione";
  const primary = pickField(d, field);
  const primaryMs = parseToMs(primary);

  // Per le rilevazioni Survey il campo data_rilevazione può arrivare come sola data
  // a mezzanotte UTC: in Italia viene visualizzato come 01:00/02:00. In quel caso
  // l'elenco deve usare l'orario reale di compilazione/invio del Survey.
  if (primaryMs !== null) {
    if (isSurveyOriginRecord(d) && isMidnightUtcDateValue(primary)) {
      const surveyMs = pickSurveyRuntimeDateMs(d, primary);
      if (surveyMs !== null) return surveyMs;
    }
    return primaryMs;
  }

  const fallbackFields = [
    "data_rilevazione",
    "dt_rilevazione",
    "end",
    "start",
    "CreationDate",
    "creationDate",
    "creationdate",
    "CREATIONDATE",
  ];
  for (const name of fallbackFields) {
    const ms = parseToMs(pickField(d, name));
    if (ms !== null) return ms;
  }
  return null;
}

type SelectedFeatureCacheEntry = {
  layerUrl: string;
  oid: number;
  idFieldName: string;
  data: any;
  ts: number;
  source: "edit" | "list" | "detail" | "azioni";
};

function getSelectedFeatureCacheBucket(): Record<
  string,
  SelectedFeatureCacheEntry
> {
  try {
    const w: any = window as any;
    w.__giiSelectedFeatureCache = w.__giiSelectedFeatureCache || {};
    return w.__giiSelectedFeatureCache;
  } catch {
    return {};
  }
}

function getSelectedFeatureCacheKey(layerUrl: string, oid: any): string {
  return `${String(layerUrl || "").trim()}::${Number(oid)}`;
}

function readSelectedFeatureCache(
  layerUrl: string,
  oid: any,
): SelectedFeatureCacheEntry | null {
  try {
    const key = getSelectedFeatureCacheKey(layerUrl, oid);
    const bucket = getSelectedFeatureCacheBucket();
    const e: any = bucket[key];
    if (!e || !e.layerUrl || !Number.isFinite(Number(e.oid))) return null;
    return e as SelectedFeatureCacheEntry;
  } catch {
    return null;
  }
}

function writeSelectedFeatureCache(
  layerUrl: string,
  oid: any,
  idFieldName: string,
  data: any,
  source: "edit" | "list" | "detail" | "azioni",
): SelectedFeatureCacheEntry | null {
  try {
    const oidNum = Number(oid);
    const url = String(layerUrl || "").trim();
    if (!url || !Number.isFinite(oidNum) || !data || typeof data !== "object")
      return null;
    const key = getSelectedFeatureCacheKey(url, oidNum);
    const bucket = getSelectedFeatureCacheBucket();
    const prev: any = bucket[key];
    const now = Date.now();
    const holdMs = 15000;
    let nextData = { ...(data || {}) };
    let nextSource: "edit" | "list" | "detail" | "azioni" = source;
    let nextTs = now;
    if (
      prev &&
      prev.source === "edit" &&
      source !== "edit" &&
      now - Number(prev.ts || 0) < holdMs
    ) {
      nextData = { ...(data || {}), ...(prev.data || {}) };
      nextSource = "edit";
      nextTs = Number(prev.ts || now);
    }
    const next: SelectedFeatureCacheEntry = {
      layerUrl: url,
      oid: oidNum,
      idFieldName:
        String(idFieldName || prev?.idFieldName || "OBJECTID") || "OBJECTID",
      data: nextData,
      ts: nextTs,
      source: nextSource,
    };
    bucket[key] = next;
    return next;
  } catch {
    return null;
  }
}

function invalidateRuntimeProxyCache(layerUrl?: string | null) {
  try {
    const url = String(layerUrl || "").trim();
    if (!url) {
      try {
        delete (window as any).__giiRuntimeDsProxyCache;
      } catch {}
      return;
    }
    try {
      const bucket = (window as any).__giiRuntimeDsProxyCache;
      if (bucket && typeof bucket === "object") delete bucket[url];
    } catch {}
  } catch {}
}
function getDsLabel(useDs: any, fallback: string): string {
  const localLabel = String(useDs?.__label || useDs?.label || "").trim();
  if (localLabel) return localLabel;
  try {
    const ds = DataSourceManager.getInstance().getDataSource(
      useDs?.dataSourceId,
    );
    const label = ds?.getLabel?.();
    return label && String(label).trim() ? String(label) : fallback;
  } catch {
    return fallback;
  }
}

function trySelectRecord(ds: any, record: DataRecord, recordId: string) {
  try {
    ds.selectRecordsByIds?.([recordId]);
  } catch {}
  try {
    ds.selectRecordById?.(recordId);
  } catch {}
  try {
    ds.setSelectedRecords?.([record]);
  } catch {}
}

function tryClearSelection(ds: any) {
  try {
    ds.selectRecordsByIds?.([]);
  } catch {}
  try {
    ds.clearSelection?.();
  } catch {}
  try {
    ds.setSelectedRecords?.([]);
  } catch {}
}

function notifySelectionCleared() {
  try {
    sessionStorage.removeItem("GII_SELECTED_OID");
    sessionStorage.removeItem("GII_SELECTED_LAYER_URL");
    sessionStorage.removeItem("GII_SELECTED_SERVICE_URL");
    sessionStorage.removeItem("GII_SELECTED_IDFIELD");
    sessionStorage.removeItem("GII_SELECTED_VIEW_NAME");
    sessionStorage.removeItem("GII_SELECTED_DATA");
    try {
      delete (window as any).__giiSelection;
    } catch {}
    window.dispatchEvent(
      new CustomEvent("gii-selection-changed", { detail: null }),
    );
  } catch {}
}

function readRestoreSelectionAfterEdit(): {
  oid: number;
  layerUrl: string;
  idFieldName: string;
} | null {
  try {
    const raw = sessionStorage.getItem("GII_RESTORE_SELECTION_AFTER_EDIT");
    if (!raw) return null;
    const j: any = JSON.parse(raw);
    const oidNum = j?.oid != null && j?.oid !== "" ? Number(j.oid) : NaN;
    if (!Number.isFinite(oidNum)) return null;
    const ts = Number(j?.ts || 0);
    const ageMs = Math.abs(Date.now() - (Number.isFinite(ts) ? ts : 0));
    if (!Number.isFinite(ts) || ageMs > 10 * 60 * 1000) {
      try {
        sessionStorage.removeItem("GII_RESTORE_SELECTION_AFTER_EDIT");
      } catch {}
      return null;
    }
    return {
      oid: Number(oidNum),
      layerUrl: String(j?.layerUrl || "").trim(),
      idFieldName: String(j?.idFieldName || "OBJECTID").trim() || "OBJECTID",
    };
  } catch {
    return null;
  }
}

function clearRestoreSelectionAfterEdit() {
  try {
    sessionStorage.removeItem("GII_RESTORE_SELECTION_AFTER_EDIT");
  } catch {}
}

type GiiAfterWorkflowNav = {
  oid: number;
  source?: string;
  targetRoleTab?: string;
  ts?: number;
};

function readAfterWorkflowNav(): GiiAfterWorkflowNav | null {
  try {
    const raw = sessionStorage.getItem("GII_AFTER_WORKFLOW_NAV");
    if (!raw) return null;
    const j: any = JSON.parse(raw);
    const oidNum = Number(j?.oid);
    if (!Number.isFinite(oidNum)) return null;
    const ts = Number(j?.ts || 0);
    const ageMs = Math.abs(Date.now() - (Number.isFinite(ts) ? ts : 0));
    if (!Number.isFinite(ts) || ageMs > 5 * 60 * 1000) {
      try {
        sessionStorage.removeItem("GII_AFTER_WORKFLOW_NAV");
      } catch {}
      return null;
    }
    return {
      oid: oidNum,
      source: String(j?.source || ""),
      targetRoleTab: String(j?.targetRoleTab || "attesa_altri"),
      ts,
    };
  } catch {
    return null;
  }
}

function clearAfterWorkflowNav() {
  try {
    sessionStorage.removeItem("GII_AFTER_WORKFLOW_NAV");
  } catch {}
}

type GiiOpenPracticeIntent = {
  oid: number | null;
  parentObjectId?: number | null;
  parentGlobalId?: string;
  reportCode?: string;
  layerUrl?: string;
  idFieldName?: string;
  ts?: number;
  requestedByUsername?: string;
  requestedByRole?: string;
  requestedByArea?: string;
  requestedBySettore?: string;
  requestedByUfficio?: string;
};

function normalizeOpenPracticeScopeValue(value: any): string {
  const s = String(value ?? "")
    .trim()
    .toUpperCase();
  return s === "NULL" || s === "UNDEFINED" ? "" : s;
}

function normalizeOpenPracticeScopeUsername(value: any): string {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "null" || s === "undefined" ? "" : s;
}

function buildOpenPracticeScopeFromUser(user: any): {
  username: string;
  role: string;
  area: string;
  settore: string;
  ufficio: string;
} {
  const role = getEffectiveRole(
    String(user?.ruoloCod || user?.ruoloLabel || "").trim(),
    user?.area,
  );
  return {
    username: normalizeOpenPracticeScopeUsername(user?.username),
    role: normalizeOpenPracticeScopeValue(
      role || user?.ruoloCod || user?.ruoloLabel,
    ),
    area: normalizeOpenPracticeScopeValue(
      user?.areaCod || normalizeAreaCode(user?.area),
    ),
    settore: normalizeOpenPracticeScopeValue(
      user?.settoreCod || normalizeSettoreCode(user?.settore),
    ),
    ufficio:
      user?.ufficio != null && user?.ufficio !== ""
        ? String(user.ufficio).trim()
        : "",
  };
}

function clearOpenPracticeIntentIfStaleForUser(
  intentRaw: any,
  currentUser: any,
): boolean {
  const requested = {
    username: normalizeOpenPracticeScopeUsername(
      intentRaw?.requestedByUsername,
    ),
    role: normalizeOpenPracticeScopeValue(intentRaw?.requestedByRole),
    area: normalizeOpenPracticeScopeValue(intentRaw?.requestedByArea),
    settore: normalizeOpenPracticeScopeValue(intentRaw?.requestedBySettore),
    ufficio:
      intentRaw?.requestedByUfficio != null &&
      intentRaw?.requestedByUfficio !== ""
        ? String(intentRaw.requestedByUfficio).trim()
        : "",
  };

  // Gli intenti vecchi, privi della firma utente, non devono più produrre
  // selezioni automatiche dopo cambio login/ruolo. Verranno ricreati dallo
  // header solo al prossimo clic esplicito su "Apri pratica".
  if (!requested.username || !requested.role) {
    clearOpenPracticeIntent();
    return true;
  }

  const current = buildOpenPracticeScopeFromUser(currentUser);
  if (!current.username || !current.role) return true;

  const mismatch =
    requested.username !== current.username ||
    requested.role !== current.role ||
    requested.area !== current.area ||
    requested.settore !== current.settore ||
    requested.ufficio !== current.ufficio;

  if (mismatch) {
    clearOpenPracticeIntent();
    return true;
  }

  return false;
}

function readOpenPracticeIntent(
  currentUser?: any,
): GiiOpenPracticeIntent | null {
  try {
    // Deve reagire solo al clic esplicito su "Apri pratica" dalla campanella.
    // Il flag evita selezioni automatiche entrando normalmente nell'elenco,
    // anche se qualche dato residuo fosse rimasto in sessionStorage.
    const requested =
      sessionStorage.getItem("GII_OPEN_PRACTICE_REQUESTED") === "1";
    if (!requested) return null;
    const raw = sessionStorage.getItem("GII_OPEN_PRACTICE_INTENT");
    if (!raw) return null;
    const j: any = JSON.parse(raw);
    if (clearOpenPracticeIntentIfStaleForUser(j, currentUser)) return null;

    const ts = Number(j?.ts || 0);
    const ageMs = Math.abs(Date.now() - (Number.isFinite(ts) ? ts : 0));
    if (!Number.isFinite(ts) || ageMs > 10 * 60 * 1000) {
      try {
        sessionStorage.removeItem("GII_OPEN_PRACTICE_INTENT");
      } catch {}
      return null;
    }
    const oidRaw = j?.parentObjectId ?? j?.oid;
    const oidNum = oidRaw != null && oidRaw !== "" ? Number(oidRaw) : NaN;
    return {
      oid: Number.isFinite(oidNum) ? oidNum : null,
      parentObjectId: Number.isFinite(oidNum) ? oidNum : null,
      parentGlobalId: String(j?.parentGlobalId || j?.globalId || "").trim(),
      reportCode: String(j?.reportCode || "").trim(),
      layerUrl: String(j?.layerUrl || "").trim(),
      idFieldName: String(j?.idFieldName || "OBJECTID").trim() || "OBJECTID",
      ts,
      requestedByUsername: String(j?.requestedByUsername || "").trim(),
      requestedByRole: String(j?.requestedByRole || "").trim(),
      requestedByArea: String(j?.requestedByArea || "").trim(),
      requestedBySettore: String(j?.requestedBySettore || "").trim(),
      requestedByUfficio: String(j?.requestedByUfficio || "").trim(),
    };
  } catch {
    return null;
  }
}

function clearOpenPracticeIntent() {
  try {
    sessionStorage.removeItem("GII_OPEN_PRACTICE_INTENT");
  } catch {}
  try {
    sessionStorage.removeItem("GII_OPEN_PRACTICE_REQUESTED");
  } catch {}
}

function normalizeReportCodeForMatch(value: any): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^RAPPORTO\s+/i, "")
    .replace(/^N\.\s*/i, "")
    .replace(/\s+/g, "");
}

function recordMatchesOpenPracticeIntent(
  recordData: any,
  rid: string,
  idFieldName: string,
  intent: GiiOpenPracticeIntent,
): boolean {
  const d = recordData || {};

  const oidWanted = Number(intent?.parentObjectId ?? intent?.oid);
  if (Number.isFinite(oidWanted)) {
    const oidHere = Number(
      d?.[idFieldName] ??
        d?.OBJECTID ??
        d?.objectid ??
        d?.ObjectId ??
        d?.objectId ??
        rid,
    );
    if (Number.isFinite(oidHere) && oidHere === oidWanted) return true;
  }

  const gidWanted = normGid(intent?.parentGlobalId);
  if (gidWanted) {
    const gidHere = normGid(
      d?.GlobalID ?? d?.globalid ?? d?.globalId ?? d?.GLOBALID,
    );
    if (gidHere && gidHere === gidWanted) return true;
  }

  const reportWanted = normalizeReportCodeForMatch(intent?.reportCode);
  if (reportWanted) {
    const candidates = [
      d?.n_rapporto,
      d?.numero_rapporto,
      d?.codice_rapporto,
      d?.cod_pratica,
      d?.rapporto,
      d?.num_rapporto,
    ]
      .map(normalizeReportCodeForMatch)
      .filter(Boolean);
    if (candidates.some((v) => v === reportWanted)) return true;
  }

  return false;
}

function compareValues(a: any, b: any): number {
  const aNull = a === null || a === undefined || a === "";
  const bNull = b === null || b === undefined || b === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;

  const aStr = String(a);
  const bStr = String(b);

  // date?
  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;

  return aStr.localeCompare(bStr, "it", { numeric: true, sensitivity: "base" });
}

function sortSig(s: SortItem[]): string {
  return (s || []).map((x) => `${x.field}:${x.dir}`).join("|");
}

function migrateColumns(cfg: any): ColumnDef[] {
  const raw = cfg?.columns;
  const src: any[] =
    Array.isArray(asJs(raw)) && asJs(raw).length > 0
      ? asJs(raw)
      : DEFAULT_COLUMNS;

  const normalized = src
    .map((c: any) => ({
      id: String(c.id || ""),
      label: String(c.label || ""),
      field: String(c.field || ""),
      width: num(c.width, 150),
    }))
    .filter((c: ColumnDef) => !!c.field);

  const used = new Set<string>();
  const findByField = (field: string): ColumnDef | null => {
    const target = String(field || "").toLowerCase();
    return (
      normalized.find((c) => String(c.field || "").toLowerCase() === target) ||
      null
    );
  };
  const findPratica = (): ColumnDef | null => {
    return (
      normalized.find((c) => {
        const f = String(c.field || "").toLowerCase();
        return f === "objectid" || f === "oid" || f === "object_id";
      }) || null
    );
  };
  const take = (
    fallback: ColumnDef,
    existing?: ColumnDef | null,
  ): ColumnDef => {
    const base = existing || findByField(fallback.field);
    const field = String(base?.field || fallback.field);
    used.add(field.toLowerCase());
    return {
      id: String(base?.id || fallback.id),
      label: fallback.label,
      field,
      width: num(base?.width, fallback.width),
    };
  };
  const takeFixedField = (
    fallback: ColumnDef,
    existing?: ColumnDef | null,
  ): ColumnDef => {
    const base = existing || findByField(fallback.field);
    const baseField = String(base?.field || "");
    if (baseField) used.add(baseField.toLowerCase());
    used.add(String(fallback.field || "").toLowerCase());
    return {
      id: fallback.id,
      label: fallback.label,
      field: fallback.field,
      width: num(base?.width, fallback.width),
    };
  };

  const fieldUfficio = String(cfg?.fieldUfficio || "ufficio_zona");

  // Ordine operativo: prima identificazione/origine del rapporto, poi lettura
  // operativa per il ruolo corrente. Le colonne procedimentali sono raggruppate
  // visivamente nell'header: stato istruttoria + mittente + destinatario + ultimo agg.
  const out: ColumnDef[] = [
    takeFixedField(
      {
        id: "col_numero_rilevazione",
        label: "N. rilevazione",
        field: V_NUMERO_RILEVAZIONE,
        width: 150,
      },
      findByField(V_NUMERO_RILEVAZIONE) || findByField(V_TIPO_PRATICA),
    ),
    takeFixedField(
      {
        id: "col_numero",
        label: "N. rapporto",
        field: V_NUMERO_PRATICA,
        width: 140,
      },
      findByField(V_NUMERO_PRATICA),
    ),
    take({
      id: "col_accertamento_numero",
      label: "N. atto",
      field: V_NUMERO_VERBALE,
      width: 120,
    }),
    take({
      id: "col_data",
      label: "Data rilevazione",
      field: "data_rilevazione",
      width: 140,
    }),
    take({
      id: "col_ufficio",
      label: "Ufficio origine",
      field: fieldUfficio,
      width: 190,
    }),
    take({
      id: "col_stato",
      label: "Il mio stato",
      field: V_STATO,
      width: 170,
    }),
    take({
      id: "col_fase",
      label: "Fase istruttoria",
      field: V_FASE,
      width: 150,
    }),
    take({ id: "col_causale", label: "Stato", field: V_CAUSALE, width: 250 }),
    take({
      id: "col_mittente",
      label: "Mittente",
      field: V_MITTENTE,
      width: 210,
    }),
    take({
      id: "col_prossima",
      label: "Destinatario",
      field: V_PROSSIMA,
      width: 210,
    }),
  ];

  // Mantieni eventuali altre colonne configurate, ma dopo quelle operative.
  for (const c of normalized) {
    const f = String(c.field || "").toLowerCase();
    if (!f || used.has(f)) continue;
    if (f === "objectid" || f === "oid" || f === "object_id") continue;
    if (f === V_TIPO_PRATICA) continue;
    if (f === V_ULTIMO || f === V_DATA_MSG) continue;
    out.push(c);
    used.add(f);
  }

  const dataMsg = findByField(V_DATA_MSG);
  out.push({
    id: String(dataMsg?.id || "col_data_msg"),
    label: "Ultimo agg.",
    field: V_DATA_MSG,
    width: num(dataMsg?.width, 150),
  });

  return out;
}

/**
 * Componente figlio di DataSourceComponent — raccoglie i record e li segnala al parent.
 * Usa useEffect con signature stabile per evitare loop infiniti.
 */
function RecordTracker(p: {
  ds: DataSource;
  dsId: string;
  info: any;
  onUpdate: (
    dsId: string,
    recs: DataRecord[],
    ds: DataSource,
    loading: boolean,
  ) => void;
}): null {
  const recs: DataRecord[] = (p.ds?.getRecords?.() ?? []) as DataRecord[];
  const status =
    p.info?.status ?? p.ds?.getStatus?.() ?? DataSourceStatus.NotReady;
  const isLoading = status === DataSourceStatus.Loading;

  // Signature completa: status + conteggio + JSON di tutti i valori del primo record.
  // Cattura il lazy-loading dei campi (quando i valori passano da undefined a valorizzati).
  let dataSig = "";
  if (recs.length > 0) {
    try {
      dataSig = JSON.stringify(recs[0].getData?.() || {});
    } catch {
      dataSig = String(recs.length);
    }
  }
  const sig = `${status}:${recs.length}:${dataSig}`;

  const prevSig = React.useRef("");
  React.useEffect(() => {
    if (sig !== prevSig.current) {
      prevSig.current = sig;
      p.onUpdate(p.dsId, recs, p.ds, isLoading);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return null;
}

const GII_PORTAL = "https://cbsm-hub.maps.arcgis.com";

type RuntimeDsView = {
  key: string;
  viewName: string;
  itemId: string;
  serviceUrl: string;
  layerUrl: string;
  roles: string[];
  areaCode: "AMM" | "AGR" | "TEC" | "";
  settoreCode: string;
};

const GII_RUNTIME_VIEWS: RuntimeDsView[] = [
  {
    key: "ADMIN",
    // ADMIN usa l'item/vista dedicata GII_VIEW_EB_ADMIN.
    // Nota: l'endpoint REST storico dell'item espone ancora il servizio con nome GII_VIEW_EB_BASE.
    // Non è la vista AMM_ALL e non va sostituito con GII_VIEW_EB_AMM_ALL.
    viewName: "GII_VIEW_EB_ADMIN",
    itemId: "c05409cf4a86471194d6406e9b4d1c65",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_BASE/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_BASE/FeatureServer/0",
    roles: ["ADMIN"],
    areaCode: "",
    settoreCode: "",
  },
  {
    key: "AGR_ALL",
    viewName: "GII_VIEW_EB_AGR",
    itemId: "777c4456f6104e779e6a02e5875f67c1",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR/FeatureServer/0",
    roles: ["RI", "DT"],
    areaCode: "AGR",
    settoreCode: "",
  },
  {
    key: "AGR_D1",
    viewName: "GII_VIEW_EB_AGR_D1",
    itemId: "3d0899eb7f684698862c1bc590c19d7f",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D1/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D1/FeatureServer/0",
    roles: ["TI", "RZ"],
    areaCode: "AGR",
    settoreCode: "D1",
  },
  {
    key: "AGR_D2",
    viewName: "GII_VIEW_EB_AGR_D2",
    itemId: "f428036dac9e41458f67c1da32efddd5",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D2/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D2/FeatureServer/0",
    roles: ["TI", "RZ"],
    areaCode: "AGR",
    settoreCode: "D2",
  },
  {
    key: "AGR_D3",
    viewName: "GII_VIEW_EB_AGR_D3",
    itemId: "efc0f9aa9d0e4862a87152cd482c2722",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D3/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D3/FeatureServer/0",
    roles: ["TI", "RZ"],
    areaCode: "AGR",
    settoreCode: "D3",
  },
  {
    key: "AGR_D4",
    viewName: "GII_VIEW_EB_AGR_D4",
    itemId: "c724a0cd50b14743a4595313c2afd39a",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D4/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D4/FeatureServer/0",
    roles: ["TI", "RZ"],
    areaCode: "AGR",
    settoreCode: "D4",
  },
  {
    key: "AGR_D5",
    viewName: "GII_VIEW_EB_AGR_D5",
    itemId: "b3405424a8f841648cca63a429991c03",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D5/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D5/FeatureServer/0",
    roles: ["TI", "RZ"],
    areaCode: "AGR",
    settoreCode: "D5",
  },
  {
    key: "AGR_D6",
    viewName: "GII_VIEW_EB_AGR_D6",
    itemId: "f8671e4e6d804735a5a8c0279b7396be",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D6/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D6/FeatureServer/0",
    roles: ["TI", "RZ"],
    areaCode: "AGR",
    settoreCode: "D6",
  },
  {
    key: "AMM_ALL",
    viewName: "GII_VIEW_EB_AMM_ALL",
    itemId: "6ffe45dac0e04905ba677e9fcd703238",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AMM_ALL/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AMM_ALL/FeatureServer/0",
    roles: ["RI", "TI", "DA", "RI_AMM", "TI_AMM"],
    areaCode: "AMM",
    settoreCode: "",
  },
  {
    key: "TEC_ALL",
    viewName: "GII_VIEW_EB_TEC",
    itemId: "8687bad031ef4de6bd3c8151de8f8cc6",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC/FeatureServer/0",
    roles: ["RI", "DT"],
    areaCode: "TEC",
    settoreCode: "",
  },
  {
    key: "TEC_DS",
    viewName: "GII_VIEW_EB_TEC_DS",
    itemId: "32b0d7b27c154a969eff411826a473af",
    serviceUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC_DS/FeatureServer",
    layerUrl:
      "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC_DS/FeatureServer/0",
    roles: ["TI", "RZ"],
    areaCode: "TEC",
    settoreCode: "DS",
  },
];

// ── LOG + Utenti: tabelle per colonne virtuali Mittente/Causale/Data msg ────
const LOG_TABLE_URL =
  "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0";
const UTENTI_TABLE_URL =
  "https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0";

type LogHistoryItem = {
  evento: string;
  ruolo: string;
  ruoloDest: string;
};

type LogEntry = {
  utente: string; // utente_operatore (mittente)
  ruolo: string; // ruolo_competente (es. "RZ") (mittente)
  area: string; // area (es. "AGR")
  settore: string; // settore (es. "D1")
  evento: string; // evento_chiusura (causale)
  dt: number | null; // dt_chiusura (epoch ms)
  ruoloDest: string; // ruolo_destinatario (es. "RI")
  utenteDest: string; // utente_destinatario (username)
  history?: LogHistoryItem[]; // eventi utili precedenti, ordinati dal più recente al più vecchio
};
type UtentiEntry = {
  username: string;
  full_name: string;
  nome: string;
  cognome: string;
  ruolo: number | null;
  ruoloCod: string;
  area: number | null;
  areaCod: string;
  settore: number | null;
  settoreCod: string;
};

const AREA_FROM_CODE: Record<number, string> = { 1: "AMM", 2: "AGR", 3: "TEC" };
const SETTORE_FROM_CODE: Record<number, string> = {
  1: "CR",
  2: "GI",
  3: "D1",
  4: "D2",
  5: "D3",
  6: "D4",
  7: "D5",
  8: "D6",
  9: "DS",
};
const AREA_LABELS: Record<string, string> = {
  AMM: "Amministrativa",
  AGR: "Agraria",
  TEC: "Tecnica",
};
const SETTORE_LABELS: Record<string, string> = {
  CR: "Catasto, Ruoli e Servizi Territoriali",
  GI: "Gestione irrigua",
  D1: "Distretto 1 – San Sperate",
  D2: "Distretto 2 – Serramanna/Pimpisu",
  D3: "Distretto 3 – San Gavino/Villacidro",
  D4: "Distretto 4 – Basso Sulcis",
  D5: "Distretto 5 – Senorbì",
  D6: "Distretto 6 – Cixerri",
  DS: "Manutenzione opere di dreno e di scolo",
};

const AREA_FROM_TEXT_CODE: Record<string, "AMM" | "AGR" | "TEC"> = {
  AMM: "AMM",
  AGR: "AGR",
  TEC: "TEC",
};
const SETTORE_TEXT_CODES = new Set([
  "CR",
  "GI",
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "DS",
]);

type DomainLabelGroup = "area" | "settore" | "ruolo";
type DomainLabelMaps = Record<DomainLabelGroup, Record<string, string>>;

const EMPTY_DOMAIN_LABELS: DomainLabelMaps = {
  area: {},
  settore: {},
  ruolo: {},
};

function normalizeTextCode(v: any): string {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

function cloneEmptyDomainLabels(): DomainLabelMaps {
  return { area: {}, settore: {}, ruolo: {} };
}

function getDomainGroupFromFieldName(
  fieldName: string,
): DomainLabelGroup | null {
  const f = String(fieldName || "")
    .trim()
    .toLowerCase();
  if (f === "area" || f === "area_cod" || f === "areacod") return "area";
  if (
    f === "settore" ||
    f === "settore_cod" ||
    f === "settorecod" ||
    f === "id_settore"
  )
    return "settore";
  if (f === "ruolo" || f === "ruolo_cod" || f === "ruolocod") return "ruolo";
  return null;
}

function normalizeDomainLookupKey(group: DomainLabelGroup, value: any): string {
  const text = normalizeTextCode(value);
  if (!text) return "";
  if (group === "area") {
    if (AREA_FROM_TEXT_CODE[text]) return AREA_FROM_TEXT_CODE[text];
    const n = Number(value);
    return Number.isFinite(n) ? normalizeAreaCode(n) : text;
  }
  if (group === "settore") {
    if (text === "CS") return "DS";
    if (SETTORE_TEXT_CODES.has(text)) return text;
    const n = Number(value);
    return Number.isFinite(n) ? normalizeSettoreCode(n) : text;
  }
  if (group === "ruolo") {
    if (text === "RI AMM" || text === "RI-AMM") return "RI_AMM";
    if (text === "TI AMM" || text === "TI-AMM") return "TI_AMM";
    const n = Number(value);
    return Number.isFinite(n) && RUOLO_LABEL[n] ? RUOLO_LABEL[n] : text;
  }
  return text;
}

function buildDomainLabelMapsFromFields(fields: any[]): DomainLabelMaps {
  const maps = cloneEmptyDomainLabels();
  for (const f of Array.isArray(fields) ? fields : []) {
    const group = getDomainGroupFromFieldName(String(f?.name || ""));
    const codedValues = f?.domain?.codedValues;
    if (!group || !Array.isArray(codedValues)) continue;
    for (const cv of codedValues) {
      const label = String(cv?.name ?? "").trim();
      if (!label) continue;
      const normalizedKey = normalizeDomainLookupKey(group, cv?.code);
      const rawKey = normalizeTextCode(cv?.code);
      if (normalizedKey) maps[group][normalizedKey] = label;
      if (rawKey) maps[group][rawKey] = label;
    }
  }
  return maps;
}

async function loadDomainLabelMaps(layerUrl: string): Promise<DomainLabelMaps> {
  const layer = await getLoadedFeatureLayer(layerUrl, ["*"]);
  return buildDomainLabelMapsFromFields(
    Array.isArray(layer?.fields) ? layer.fields : [],
  );
}

function getDomainLabel(
  domainLabels: DomainLabelMaps | null | undefined,
  group: DomainLabelGroup,
  code: any,
): string | null {
  const key = normalizeDomainLookupKey(group, code);
  if (!key) return null;
  const direct = domainLabels?.[group]?.[key];
  if (direct) return direct;
  const raw = normalizeTextCode(code);
  return raw ? domainLabels?.[group]?.[raw] || null : null;
}

function fallbackAreaLabel(code: any): string {
  const key = normalizeDomainLookupKey("area", code);
  return AREA_LABELS[key] || key || "—";
}

function fallbackSettoreLabel(code: any): string {
  const key = normalizeDomainLookupKey("settore", code);
  return SETTORE_LABELS[key] || key || "—";
}

function getAreaLabelFromCode(
  code: any,
  domainLabels?: DomainLabelMaps | null,
): string {
  return getDomainLabel(domainLabels, "area", code) || fallbackAreaLabel(code);
}

function getSettoreLabelFromCode(
  code: any,
  domainLabels?: DomainLabelMaps | null,
): string {
  return (
    getDomainLabel(domainLabels, "settore", code) || fallbackSettoreLabel(code)
  );
}

function resolveAreaCode(
  area: number | null | undefined,
  areaCod?: any,
): "AMM" | "AGR" | "TEC" | "" {
  const code = normalizeTextCode(areaCod);
  if (code && AREA_FROM_TEXT_CODE[code]) return AREA_FROM_TEXT_CODE[code];
  return normalizeAreaCode(area);
}

function resolveSettoreCode(
  settore: number | null | undefined,
  settoreCod?: any,
): string {
  const code = normalizeTextCode(settoreCod);
  if (code === "CS") return "DS";
  if (code && SETTORE_TEXT_CODES.has(code)) return code;
  return normalizeSettoreCode(settore);
}

function resolveRoleCode(
  ruolo: number | null | undefined,
  ruoloCod?: any,
  ruoloLabel?: any,
  isAdmin?: boolean,
): string {
  const code = normalizeTextCode(ruoloCod || ruoloLabel);
  if (code) return code;
  if (ruolo != null && RUOLO_LABEL[Number(ruolo)])
    return RUOLO_LABEL[Number(ruolo)];
  return isAdmin ? "ADMIN" : "";
}

function normalizeRoleDisplayCode(role: any): string {
  const raw = String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (raw === "RI_AMM" || raw === "RIAMM") return "RI_AMM";
  if (raw === "TI_AMM" || raw === "TIAMM") return "TI_AMM";
  if (raw.startsWith("RZ")) return "RZ";
  if (raw.startsWith("TR")) return "TR";
  if (raw.startsWith("TI") && raw !== "TI_AMM") return "TI";
  if (raw.startsWith("RI") && raw !== "RI_AMM") return "RI";
  if (raw.startsWith("DT") || raw.startsWith("DIR")) return "DT";
  if (raw.startsWith("DA")) return "DA";
  if (raw.startsWith("ADMIN")) return "ADMIN";
  return raw;
}

function getQualificaLabel(role: any): string {
  switch (normalizeRoleDisplayCode(role)) {
    case "TR":
      return "Tecnico rilevatore";
    case "TI":
      return "Tecnico istruttore";
    case "RZ":
      return "Capo Settore";
    case "RI":
      return "Responsabile istruttoria";
    case "DT":
      return "Direttore d’Area";
    case "TI_AMM":
      return "Tecnico istruttore amministrativo";
    case "RI_AMM":
      return "Responsabile istruttoria amministrativa";
    case "DA":
      return "Direttore Area AA. GG. e P.F.";
    case "ADMIN":
      return "Amministratore";
    default:
      return "";
  }
}

function cleanNomeCognome(value: any): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getUtenteNomeCognome(utente?: UtentiEntry | null): string {
  const nome = cleanNomeCognome(utente?.nome || "");
  const cognome = cleanNomeCognome(utente?.cognome || "");
  const composed = cleanNomeCognome(`${nome} ${cognome}`.trim());
  if (composed) return composed;
  return cleanNomeCognome(utente?.full_name || "");
}

function normalizePersonaRoleForMatch(role: any): string {
  const r = normalizeRoleDisplayCode(role);
  if (r === "RI_AMM") return "RI";
  if (r === "TI_AMM") return "TI";
  return r;
}

function normalizePersonaAreaForMatch(area: any, role?: any): string {
  const roleCode = normalizeRoleDisplayCode(role);
  if (roleCode === "RI_AMM" || roleCode === "TI_AMM" || roleCode === "DA")
    return "AMM";

  const text = normalizeTextCode(area);
  if (AREA_FROM_TEXT_CODE[text]) return AREA_FROM_TEXT_CODE[text];

  const n = Number(area);
  return Number.isFinite(n) ? normalizeAreaCode(n) : "";
}

function normalizePersonaSettoreForMatch(settore: any): string {
  const text = normalizeTextCode(settore);
  if (text === "CS") return "DS";
  if (SETTORE_TEXT_CODES.has(text)) return text;

  const n = Number(settore);
  return Number.isFinite(n) ? normalizeSettoreCode(n) : "";
}

function getUtenteEntryRoleCode(utente?: UtentiEntry | null): string {
  if (!utente) return "";
  return normalizePersonaRoleForMatch(
    utente.ruoloCod ||
      (utente.ruolo != null && RUOLO_LABEL[Number(utente.ruolo)]
        ? RUOLO_LABEL[Number(utente.ruolo)]
        : ""),
  );
}

function getUtenteEntryAreaCode(utente?: UtentiEntry | null): string {
  if (!utente) return "";
  return resolveAreaCode(utente.area, utente.areaCod);
}

function getUtenteEntrySettoreCode(utente?: UtentiEntry | null): string {
  if (!utente) return "";
  return resolveSettoreCode(utente.settore, utente.settoreCod);
}

function getDisplayRoleFromUtente(
  utente: UtentiEntry | null | undefined,
  fallbackRole: any,
): string {
  const role = normalizeRoleDisplayCode(
    utente?.ruoloCod ||
      (utente?.ruolo != null && RUOLO_LABEL[Number(utente.ruolo)]
        ? RUOLO_LABEL[Number(utente.ruolo)]
        : fallbackRole),
  );
  const area = getUtenteEntryAreaCode(utente) || normalizePersonaAreaForMatch("", fallbackRole);
  if (role === "RI" && area === "AMM") return "RI_AMM";
  if (role === "TI" && area === "AMM") return "TI_AMM";
  return role || normalizeRoleDisplayCode(fallbackRole);
}

function resolveUtenteForPersona(
  utentiMap: Map<string, UtentiEntry> | null,
  ruolo: string,
  area: string,
  settore: string,
  usernameOrName?: string,
): UtentiEntry | null {
  if (!utentiMap) return null;

  const rawUser = String(usernameOrName || "").trim();
  const uname = rawUser.toLowerCase();
  const direct = uname ? utentiMap.get(uname) : null;
  if (direct) return direct;

  const cleanCandidate = cleanNomeCognome(rawUser).toLowerCase();
  if (cleanCandidate && cleanCandidate !== "—") {
    for (const entry of utentiMap.values()) {
      const entryName = getUtenteNomeCognome(entry).toLowerCase();
      if (entryName && entryName === cleanCandidate) return entry;
    }
  }

  const targetRole = normalizePersonaRoleForMatch(ruolo);
  if (!targetRole) return null;

  const targetArea = normalizePersonaAreaForMatch(area, ruolo);
  const targetSettore = normalizePersonaSettoreForMatch(settore);
  const needsSettore =
    (targetRole === "TR" || targetRole === "TI" || targetRole === "RZ") &&
    targetArea !== "AMM";

  for (const entry of utentiMap.values()) {
    const entryRole = getUtenteEntryRoleCode(entry);
    const entryArea = getUtenteEntryAreaCode(entry);
    const entrySettore = getUtenteEntrySettoreCode(entry);

    if (entryRole !== targetRole) continue;
    if (targetArea && entryArea !== targetArea) continue;
    if (needsSettore && targetSettore && entrySettore !== targetSettore) continue;
    return entry;
  }

  return null;
}

function formatPersonaDisplay(nomeCognome: string, qualifica: string): string {
  const name = cleanNomeCognome(nomeCognome) || "—";
  const role = String(qualifica || "").trim();
  return role ? `${name}\n(${role})` : name;
}

function getPersonaDisplayParts(value: any): { name: string; role: string } {
  const raw = String(value || "").trim();
  if (!raw || raw === "—") return { name: "—", role: "" };
  const lines = raw
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const name = lines[0] || "—";
  const role = (lines[1] || "").replace(/^\((.*)\)$/u, "$1").trim();
  return { name, role };
}

function getPersonaDisplayTitle(value: any): string {
  const p = getPersonaDisplayParts(value);
  return p.role ? `${p.name} (${p.role})` : p.name;
}

function PersonaCell(props: { value: string }) {
  const p = getPersonaDisplayParts(props.value);
  return (
    <div className="personaCell">
      <div className="personaName">{p.name}</div>
      {p.role && <div className="personaRole">({p.role})</div>}
    </div>
  );
}

/**
 * Formatta una persona (mittente) nel formato visuale richiesto:
 *   Nome Cognome
 *   (Qualifica)
 */
function formatPersona(
  ruolo: string,
  area: string,
  settore: string,
  username: string,
  utentiMap: Map<string, UtentiEntry> | null,
): string {
  const utente = resolveUtenteForPersona(
    utentiMap,
    ruolo,
    area,
    settore,
    username,
  );
  return formatPersonaDisplay(
    getUtenteNomeCognome(utente),
    getQualificaLabel(getDisplayRoleFromUtente(utente, ruolo)),
  );
}

/**
 * Formatta il destinatario dal LOG nel formato visuale richiesto.
 * Usa il profilo del destinatario in GII_utenti per risolvere nome/cognome
 * e ruolo effettivo.
 */
function formatPersonaDest(
  ruoloDest: string,
  logArea: string,
  logSettore: string,
  usernameDest: string,
  utentiMap: Map<string, UtentiEntry> | null,
): string {
  const destEntry = resolveUtenteForPersona(
    utentiMap,
    ruoloDest,
    logArea,
    logSettore,
    usernameDest,
  );
  return formatPersonaDisplay(
    getUtenteNomeCognome(destEntry),
    getQualificaLabel(getDisplayRoleFromUtente(destEntry, ruoloDest)),
  );
}

// Cache globale utenti (sopravvive a re-render ma non a refresh pagina)
let _utentiMapCache: Map<string, UtentiEntry> | null = null;
let _utentiMapLoading = false;

// Cache dei FeatureLayer caricati: evita di ricreare/caricare lo stesso layer
// a ogni refresh dell'elenco o delle colonne virtuali.
const _loadedFeatureLayerCache: Record<string, Promise<any>> = {};

async function getLoadedFeatureLayer(
  url: string,
  outFields?: string[],
): Promise<any> {
  const key = String(url || "").trim();
  if (!key) throw new Error("FeatureLayer URL non valorizzato");
  if (!_loadedFeatureLayerCache[key]) {
    _loadedFeatureLayerCache[key] = (async () => {
      const FL = await loadEsriModule<any>("esri/layers/FeatureLayer");
      const layer = new FL({
        url: key,
        outFields: (outFields && outFields.length ? outFields : ["*"]) as any,
      });
      if (typeof layer.load === "function") {
        try {
          await layer.load();
        } catch {}
      }
      return layer;
    })();
  }
  return _loadedFeatureLayerCache[key];
}

/**
 * Formatta il prefisso ruolo nel formato standard.
 * Es: "RZ-D1", "RI-AGR", "DIR-TEC", "DIR-AMM", "TI-D1", "TI-AMM"
 */
function formatRolePrefix(
  roleLabel: string,
  areaLabel: string,
  settoreLabel: string,
): string {
  const r = roleLabel.toUpperCase();
  const a = areaLabel.toUpperCase();
  const s = settoreLabel.toUpperCase();
  switch (r) {
    case "TR":
    case "RZ":
      return s ? `${r}-${s}` : r;
    case "TI":
      return a === "AMM" ? "TI-AMM" : s ? `TI-${s}` : "TI";
    case "RI":
      return a ? `RI-${a}` : "RI";
    case "RI_AMM":
      return "RI-AMM";
    case "DT":
      return a ? `DIR-${a}` : "DIR";
    case "DA":
      return "DIR-AMM";
    case "TI_AMM":
      return "TI-AMM";
    default:
      return r || "?";
  }
}

function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require;
    if (!req) {
      reject(new Error("AMD require non disponibile"));
      return;
    }
    try {
      req(
        [path],
        (mod: T) => resolve(mod),
        (err: any) => reject(err),
      );
    } catch (e) {
      reject(e);
    }
  });
}

function normalizeAreaCode(
  area: number | null | undefined,
): "AMM" | "AGR" | "TEC" | "" {
  if (area === 1) return "AMM";
  if (area === 2) return "AGR";
  if (area === 3) return "TEC";
  return "";
}

/** RI con area=AMM → RI_AMM, TI con area=AMM → TI_AMM, altrimenti invariato */
function getEffectiveRole(
  ruoloLabel: string,
  area: number | null | undefined,
): string {
  const r = String(ruoloLabel || "").toUpperCase();
  if (r === "RI" && area === 1) return "RI_AMM";
  if (r === "TI" && area === 1) return "TI_AMM";
  return r;
}

function normalizeSettoreCode(settore: number | null | undefined): string {
  const map: Record<number, string> = {
    1: "CR",
    2: "GI",
    3: "D1",
    4: "D2",
    5: "D3",
    6: "D4",
    7: "D5",
    8: "D6",
    9: "DS",
  };
  return settore != null ? map[Number(settore)] || "" : "";
}

function normalizeSearchText(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getFirstValue(d: any, names: string[]): any {
  for (const name of names) {
    const v = pickField(d, name);
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return "";
}

function getAreaCodeFromRecord(
  d: any,
  fallbackArea?: any,
): "AMM" | "AGR" | "TEC" | "" {
  const raw = getFirstValue(d, [
    "area_cod",
    "Area_cod",
    "AREA_COD",
    "area",
    "Area",
  ]);
  const code = normalizeTextCode(raw || fallbackArea);
  if (AREA_FROM_TEXT_CODE[code]) return AREA_FROM_TEXT_CODE[code];
  const n = Number(raw || fallbackArea);
  return Number.isFinite(n) ? normalizeAreaCode(n) : "";
}

function getAreaDisplayFromRecord(
  d: any,
  fallbackArea?: any,
  domainLabels?: DomainLabelMaps | null,
): string {
  const code = getAreaCodeFromRecord(d, fallbackArea);
  return getAreaLabelFromCode(code, domainLabels);
}

function getSettoreCodeFromRecord(d: any, fallbackSettore?: any): string {
  const raw = getFirstValue(d, [
    "settore_cod",
    "Settore_cod",
    "SETTORE_COD",
    "settore",
    "Settore",
    "id_settore",
  ]);
  const text = normalizeTextCode(raw || fallbackSettore);
  if (text === "CS") return "DS";
  if (SETTORE_TEXT_CODES.has(text)) return text;
  const n = Number(raw || fallbackSettore);
  return Number.isFinite(n) ? normalizeSettoreCode(n) : "";
}

function getSettoreDisplayFromRecord(
  d: any,
  fallbackSettore?: any,
  domainLabels?: DomainLabelMaps | null,
): string {
  const code = getSettoreCodeFromRecord(d, fallbackSettore);
  return getSettoreLabelFromCode(code, domainLabels);
}

function getDateOnlyMsFromInput(
  value: string,
  endOfDay = false,
): number | null {
  if (!value) return null;
  const t = Date.parse(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(t) ? null : t;
}

function pickReportDateMs(d: any, configuredField?: string): number | null {
  const rilMs = pickRilevazioneDateMs(d, configuredField);
  if (rilMs !== null) return rilMs;
  const candidates = [
    "data_rapporto",
    "dt_rapporto",
    "CreationDate",
    "creationDate",
    "creationdate",
    "CREATIONDATE",
  ];
  for (const name of candidates) {
    const ms = parseToMs(pickField(d, name));
    if (ms !== null) return ms;
  }
  return null;
}

function pickTecnicoIstruttore(d: any): string {
  return String(
    getFirstValue(d, [
      "ti_assegnato_nome",
      "ti_assegnato_name",
      "tecnico_istruttore",
      "Tecnico_istruttore",
      "istruttore",
      "Istruttore",
      "ti_assegnato_username",
      "ti_assegnato_user",
      "ti_assegnato",
    ]) || "",
  );
}

function pickTecnicoRilevatore(d: any): string {
  return String(
    getFirstValue(d, [
      "tecnico_rilevatore",
      "Tecnico_rilevatore",
      "TECNICO_RILEVATORE",
      "tr_nome",
      "TR_nome",
      "tecnico_rilevatore_nome",
      "nome_tecnico_rilevatore",
      "utente_loggato",
      "created_user",
      "Creator",
      "creator",
    ]) || "",
  );
}

function pickPraticaSearchText(r: DataRecord, fieldPratica: string): string {
  const d = r.getData?.() || {};
  const parts = [
    getCodPraticaDisplay(r),
    getRilevazioneDisplay(r),
    pickOfficialRapportoNumber(d),
    pickVerbaleNumber(d),
    pickField(d, fieldPratica),
    pickField(d, "OBJECTID"),
    pickField(d, "objectid"),
    pickField(d, "objectId"),
    pickField(d, "numero_rapporto"),
    pickField(d, "num_rapporto"),
  ];
  return normalizeSearchText(
    parts.filter((v) => v !== null && v !== undefined && v !== "").join(" "),
  );
}

function pickTextSearchExtra(
  d: any,
  fallbackArea?: any,
  fallbackSettore?: any,
  domainLabels?: DomainLabelMaps | null,
): string {
  const parts = [
    pickTecnicoRilevatore(d),
    pickTecnicoIstruttore(d),
    getAreaDisplayFromRecord(d, fallbackArea, domainLabels),
    getSettoreDisplayFromRecord(d, fallbackSettore, domainLabels),
    getAreaCodeFromRecord(d, fallbackArea),
    getSettoreCodeFromRecord(d, fallbackSettore),
    pickField(d, "ufficio_zona"),
  ];
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

function pickComparableDisplayValue(
  d: any,
  field: string,
  fallbackArea?: any,
  fallbackSettore?: any,
  domainLabels?: DomainLabelMaps | null,
): any {
  const f = String(field || "").toLowerCase();
  if (f === "area" || f === "area_cod")
    return getAreaDisplayFromRecord(d, fallbackArea, domainLabels);
  if (f === "settore" || f === "settore_cod" || f === "id_settore")
    return getSettoreDisplayFromRecord(d, fallbackSettore, domainLabels);
  return pickField(d, field);
}

function pickRuntimeViewForUser(
  user: GiiUserInfo | null,
): RuntimeDsView | null {
  if (!user) return null;
  const role = resolveRoleCode(
    user.ruolo,
    user.ruoloCod,
    user.ruoloLabel,
    user.isAdmin,
  );
  const areaCode = resolveAreaCode(user.area, user.areaCod);
  const settoreCode = resolveSettoreCode(user.settore, user.settoreCod);
  if (user.isAdmin || role === "ADMIN") {
    return GII_RUNTIME_VIEWS.find((v) => v.key === "ADMIN") || null;
  }
  const strict = GII_RUNTIME_VIEWS.find(
    (v) =>
      v.roles.includes(role) &&
      v.areaCode === areaCode &&
      (v.settoreCode ? v.settoreCode === settoreCode : true),
  );
  if (strict) return strict;
  return (
    GII_RUNTIME_VIEWS.find(
      (v) =>
        v.roles.includes(role) && v.areaCode === areaCode && !v.settoreCode,
    ) || null
  );
}

function makeRuntimeRecord(
  attrs: any,
  idFieldName: string,
  sourceKey: string,
): DataRecord {
  const id = String(
    attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid ?? "",
  );
  return {
    getData: () => attrs,
    getId: () => id,
    dataSource: { id: sourceKey },
  } as any;
}

async function createRuntimeFeatureLayerProxy(
  view: RuntimeDsView,
  recordsRef: { current: DataRecord[] },
): Promise<any> {
  const layer = await getLoadedFeatureLayer(view.layerUrl, ["*"]);
  const idFieldName = String(layer?.objectIdField || "OBJECTID");
  const schemaFields: Record<string, any> = {};
  const fields = Array.isArray(layer?.fields) ? layer.fields : [];
  for (const f of fields) {
    if (!f?.name) continue;
    schemaFields[String(f.name)] = {
      alias: String(f.alias || f.name),
      type: String(f.type || ""),
    };
  }
  const query = async (q: any) => {
    const res = await layer.queryFeatures({
      where: q?.where || "1=1",
      outFields: (Array.isArray(q?.outFields) && q.outFields.length
        ? q.outFields
        : ["*"]) as any,
      returnGeometry: !!q?.returnGeometry,
      num: q?.pageSize || q?.num || undefined,
    });
    const recs = (res?.features || []).map((f: any) => {
      const attrs = f?.attributes || {};
      const oidVal = Number(
        attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid,
      );
      let recordAttrs = attrs;
      if (Number.isFinite(oidVal)) {
        try {
          const cached = writeSelectedFeatureCache(
            view.layerUrl,
            oidVal,
            idFieldName,
            attrs,
            "list",
          );
          // Se un cw operativo ha appena salvato il record, ArcGIS puo' restituire
          // per pochi istanti attributi ancora vecchi. In quel caso usiamo la cache
          // ottimistica prodotta dall'azione, cosi' chip/stato elenco si aggiornano
          // subito e non restano su "Da prendere in carico" dopo la presa.
          if (cached?.data && cached.source === "edit")
            recordAttrs = cached.data;
        } catch {}
      }
      return makeRuntimeRecord(recordAttrs, idFieldName, view.layerUrl);
    });
    recordsRef.current = recs;
    return { records: recs };
  };
  return {
    id: `runtime:${view.key}`,
    getIdField: () => idFieldName,
    getSchema: () => ({ fields: schemaFields, idField: idFieldName }),
    getLabel: () => view.viewName,
    getRecords: () => recordsRef.current,
    getLayer: () => layer,
    getJSAPILayer: () => layer,
    getJsApiLayer: () => layer,
    layer,
    query,
    getDataSourceJson: () => ({ url: view.layerUrl }),
  };
}

function publishRuntimeSelection(p: {
  oid: number;
  layerUrl: string;
  serviceUrl: string;
  idFieldName: string;
  viewName: string;
  data?: any;
}) {
  try {
    sessionStorage.setItem("GII_SELECTED_OID", String(p.oid));
    sessionStorage.setItem("GII_SELECTED_LAYER_URL", p.layerUrl);
    sessionStorage.setItem("GII_SELECTED_SERVICE_URL", p.serviceUrl);
    sessionStorage.setItem("GII_SELECTED_IDFIELD", p.idFieldName);
    sessionStorage.setItem("GII_SELECTED_VIEW_NAME", p.viewName);
    try {
      sessionStorage.removeItem("GII_SELECTED_DATA");
    } catch {}
    if (p.data && typeof p.data === "object") {
      try {
        writeSelectedFeatureCache(
          p.layerUrl,
          p.oid,
          p.idFieldName,
          p.data,
          "list",
        );
      } catch {}
    }
    const nextSel: any = {
      oid: p.oid,
      layerUrl: p.layerUrl,
      serviceUrl: p.serviceUrl,
      idFieldName: p.idFieldName,
      viewName: p.viewName,
      ts: Date.now(),
    };
    try {
      (window as any).__giiSelection = nextSel;
    } catch {}
    window.dispatchEvent(
      new CustomEvent("gii-selection-changed", { detail: nextSel }),
    );
  } catch {}
}

// Best-effort: prova a capire se l'utente è amministratore AGOL (org_admin),
// anche quando l'Header non valorizza isAdmin.
function inferIsOrgAdminFromSession(): boolean {
  try {
    const sm = SessionManager.getInstance();
    const session: any =
      sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL);
    const role =
      session?.user?.role ??
      session?.userInfo?.role ??
      session?.portalUser?.role ??
      session?.portal?.user?.role ??
      session?.portal?.userInfo?.role ??
      session?.portalSelf?.user?.role ??
      session?.portalSelf?.user?.userRole ??
      session?.userRole;

    if (role) {
      const r = String(role).toLowerCase();
      if (r.includes("admin")) return true;
    }

    const priv =
      session?.user?.privileges ??
      session?.userInfo?.privileges ??
      session?.portalUser?.privileges ??
      session?.portal?.user?.privileges ??
      session?.portal?.userInfo?.privileges;

    if (Array.isArray(priv)) {
      const p = priv.map((x) => String(x).toLowerCase());
      if (
        p.some(
          (x) =>
            x.includes("portal:admin") ||
            x.includes("portal:administrator") ||
            x.includes("orgadmin") ||
            x.includes("administrator"),
        )
      ) {
        return true;
      }
    }

    if (session?.isAdmin === true) return true;
  } catch {}
  return false;
}

function computeDsMetaSig(useDsList: any[]): string {
  try {
    return (useDsList || [])
      .map((u: any) => {
        const dsId = String(u?.dataSourceId || "");
        const ds = DataSourceManager.getInstance().getDataSource(dsId);
        const label = String(ds?.getLabel?.() || "");
        const j: any = ds?.getDataSourceJson?.() || (ds as any)?.dataSourceJson;
        const url = String(j?.url || "");
        return `${dsId}|${label}|${url}`;
      })
      .join("||");
  } catch {
    return "";
  }
}

function getServiceKeyFromDataSourceId(dsId: string): string {
  try {
    const ds = DataSourceManager.getInstance().getDataSource(dsId);
    const j: any = ds?.getDataSourceJson?.() || (ds as any)?.dataSourceJson;
    const url = String(j?.url || "");
    const part = url.split("/rest/services/")[1] || "";
    const name = (part.split("/FeatureServer")[0] || "").trim();
    if (name) return name.toUpperCase();
    const lbl = String(ds?.getLabel?.() || "").trim();
    return lbl ? lbl.toUpperCase() : dsId;
  } catch {
    return dsId;
  }
}

function getRecordUniqKey(
  rec: DataRecord,
  dsId: string,
  svcCache: Map<string, string>,
): string {
  const svc =
    svcCache.get(dsId) ||
    (svcCache.set(dsId, getServiceKeyFromDataSourceId(dsId)),
    svcCache.get(dsId)!);
  const d: any = rec?.getData?.() || {};
  const gid = d?.GlobalID ?? d?.globalid ?? d?.globalId ?? d?.GLOBALID ?? null;
  if (gid !== null && gid !== undefined && String(gid).trim() !== "")
    return `GID|${String(gid).trim()}`;
  const oid = d?.OBJECTID ?? d?.ObjectId ?? d?.objectid ?? d?.objectId ?? null;
  if (oid !== null && oid !== undefined && String(oid).trim() !== "")
    return `${svc}|OID|${String(oid).trim()}`;
  const rid = (rec as any)?.getId?.() || (rec as any)?.id || "";
  return `${svc}|RID|${String(rid)}`;
}

function getRecordObjectIdValue(
  rec: DataRecord | null | undefined,
  idFieldName?: string,
  fallbackRid?: string,
): number | null {
  try {
    const d: any = rec?.getData?.() || {};
    const raw =
      (idFieldName ? d?.[idFieldName] : undefined) ??
      d?.OBJECTID ??
      d?.ObjectId ??
      d?.objectid ??
      d?.objectId ??
      fallbackRid;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    const n = Number(fallbackRid);
    return Number.isFinite(n) ? n : null;
  }
}

// Mappa codice ruolo numerico → label (dal widget gestione utenti)
const RUOLO_LABEL: Record<number, string> = {
  1: "TR",
  2: "TI",
  3: "RZ",
  4: "RI",
  5: "DT",
  6: "DA",
  7: "ADMIN",
};

// Gerarchia priorità per utenti con gruppi multipli (es. admin)
const RUOLO_PRIORITY: Record<number, number> = {
  6: 100, // DA  (massima priorità)
  5: 90, // DT
  4: 80, // RI
  3: 70, // RZ
  2: 60, // TI
  1: 10, // TR
};

// ── Mappa ruolo/area/settore → dataSourceId consentito ─────────────────────
// Codici domini (numerici):
//   AREA: AMM=1, AGR=2, TEC=3
//   SETTORE: CR=1,GI=2,D1=3,D2=4,D3=5,D4=6,D5=7,D6=8,DS=9
//   RUOLO: TR=1,TI=2,RZ=3,RI=4,DT=5,DA=6
function getAllowedDataSourceIds(
  user: {
    ruolo: number | null;
    ruoloCod?: string;
    ruoloLabel?: string;
    area: number | null;
    areaCod?: string;
    settore: number | null;
    settoreCod?: string;
    isAdmin: boolean;
  } | null,
  useDsList: any[],
): string[] | null {
  if (!user) return null;

  // Helper: label (titolo) del datasource, normalizzato
  const getLabel = (useDs: any): string => {
    try {
      const ds = DataSourceManager.getInstance().getDataSource(
        String(useDs?.dataSourceId || ""),
      );
      const label = ds?.getLabel?.();
      return String(label || "");
    } catch {
      return "";
    }
  };
  const norm = (s: string) => String(s || "").toUpperCase();

  const AREA_CODE: Record<number, string> = { 1: "AMM", 2: "AGR", 3: "TEC" };
  const SETTORE_CODE: Record<number, string> = {
    1: "CR",
    2: "GI",
    3: "D1",
    4: "D2",
    5: "D3",
    6: "D4",
    7: "D5",
    8: "D6",
    9: "DS",
  };

  const areaCode =
    resolveAreaCode(user.area, (user as any).areaCod) ||
    (user.area != null ? AREA_CODE[user.area] : "") ||
    "";
  const settoreCode =
    resolveSettoreCode(user.settore, (user as any).settoreCod) ||
    (user.settore != null ? SETTORE_CODE[user.settore] : "") ||
    "";
  const ruolo = user.ruolo;

  const roots = (arr: any[]) =>
    Array.from(
      new Set(
        arr
          .map((u) => String(u?.rootDataSourceId || u?.dataSourceId || ""))
          .filter(Boolean),
      ),
    );

  // Admin: preferisci la vista EB_ADMIN (se presente), altrimenti non filtrare
  if (user.isAdmin) {
    const adminMatches = useDsList.filter((u) => {
      const L = norm(getLabel(u));
      return (
        L.includes("GII_VIEW_EB_ADMIN") ||
        L.includes("VIEW_EB_ADMIN") ||
        L.includes("_EB_ADMIN") ||
        L.includes("EB_ADMIN")
      );
    });
    const r = roots(adminMatches);
    return r.length ? r : null;
  }

  const isEB = (L: string) =>
    L.includes("GII_VIEW_EB_") || L.includes("VIEW_EB_") || L.includes("_EB_");

  // Match "strict" (settore per AGR per TR/TI/RZ, e "tutte" per RI/DT/DA)
  const matchesStrict = useDsList.filter((u) => {
    const L = norm(getLabel(u));
    if (!isEB(L)) return false;
    if (L.includes("EB_ADMIN")) return false;
    if (areaCode && !L.includes(`EB_${areaCode}`)) return false;

    if (ruolo != null && ruolo >= 1 && ruolo <= 3) {
      if (areaCode === "AGR")
        return settoreCode ? L.includes(`_${settoreCode}`) : true;
      return true;
    }

    if (ruolo != null && ruolo >= 4 && ruolo <= 6) {
      if (areaCode === "AGR")
        return (
          L.includes("TUTTE") ||
          L.includes("TUTTI") ||
          (!L.includes("_D1") &&
            !L.includes("_D2") &&
            !L.includes("_D3") &&
            !L.includes("_D4") &&
            !L.includes("_D5") &&
            !L.includes("_D6"))
        );
      return true;
    }
    return true;
  });

  // Loose fallback: qualunque vista EB della stessa area (escluso ADMIN)
  const matchesLoose = matchesStrict.length
    ? matchesStrict
    : useDsList.filter((u) => {
        const L = norm(getLabel(u));
        if (!isEB(L)) return false;
        if (L.includes("EB_ADMIN")) return false;
        return areaCode ? L.includes(`EB_${areaCode}`) : true;
      });

  const ids = roots(matchesLoose);
  // Se non riusciamo a determinare alcuna vista coerente (label non ancora pronta / nomi non standard),
  // NON filtriamo: lasciamo che sia la condivisione AGOL a fare da guardia.
  return ids.length ? ids : null;
}

// ── Selezione DS “singolo” (evita duplicati e mismatch) ───────────────────
// Sceglie UNA vista tra quelle collegate, basandosi sul nome servizio nella URL
// (più stabile del label e degli id interni dataSource_XX).
function pickBestUseDataSourceId(
  user: {
    ruolo: number | null;
    ruoloCod?: string;
    ruoloLabel?: string;
    area: number | null;
    areaCod?: string;
    settore: number | null;
    settoreCod?: string;
    gruppo?: string;
    isAdmin: boolean;
  } | null,
  useDsList: any[],
): string | null {
  if (!user || !Array.isArray(useDsList) || useDsList.length === 0) return null;

  const up = (s: any) => String(s || "").toUpperCase();
  const AREA_CODE: Record<number, string> = { 1: "AMM", 2: "AGR", 3: "TEC" };
  const SETTORE_CODE: Record<number, string> = {
    1: "CR",
    2: "GI",
    3: "D1",
    4: "D2",
    5: "D3",
    6: "D4",
    7: "D5",
    8: "D6",
    9: "DS",
  };

  const areaCode =
    resolveAreaCode(user.area, (user as any).areaCod) ||
    (user.area != null ? AREA_CODE[user.area] : "") ||
    "";
  const settoreCode =
    resolveSettoreCode(user.settore, (user as any).settoreCod) ||
    (user.settore != null ? SETTORE_CODE[user.settore] : "") ||
    "";
  const ruolo = user.ruolo;
  const ruoloLabel = up((user as any)?.ruoloCod || (user as any)?.ruoloLabel);
  const gruppo = up((user as any)?.gruppo);

  const getServiceName = (useDs: any): string => {
    try {
      const ds = DataSourceManager.getInstance().getDataSource(
        String(useDs?.dataSourceId || ""),
      );
      const j: any =
        (ds as any)?.getDataSourceJson?.() || (ds as any)?.dataSourceJson;
      const url = String(j?.url || "");
      const part = url.split("/rest/services/")[1] || "";
      const name = part.split("/FeatureServer")[0] || "";
      return up(name);
    } catch {
      return "";
    }
  };

  // Fallback su label del DataSource (utile in preview/prime render quando la URL non è ancora pronta)
  const getLabelUp = (useDs: any): string => up(getDsLabel(useDs, ""));

  const items = useDsList.map((u) => ({
    dsId: String(u?.dataSourceId || ""),
    name: getServiceName(u),
  }));
  const findBy = (pred: (n: string) => boolean) => {
    const hit = items.find((x) => x.dsId && x.name && pred(x.name));
    return hit?.dsId || null;
  };

  // “Admin applicativo”: org_admin oppure ruolo DA/DT/RI oppure gruppo contiene ADMIN.
  const isAppAdmin =
    user.isAdmin ||
    ruolo === 7 ||
    ruoloLabel === "ADMIN" ||
    ruoloLabel === "DA" ||
    ruoloLabel === "DT" ||
    ruoloLabel === "RI" ||
    ruoloLabel === "RI_AMM" ||
    gruppo.includes("ADMIN");
  if (isAppAdmin) {
    const dsAdmin = findBy(
      (n) =>
        n.includes("EB_ADMIN") ||
        n.includes("GII_VIEW_EB_ADMIN") ||
        n.includes("VIEW_EB_ADMIN"),
    );
    if (dsAdmin) return dsAdmin;

    // Fallback: se il serviceName non è ancora disponibile (preview/prime render),
    // prova a riconoscere la vista ADMIN dal *label* del DataSource.
    const hitByLabel = useDsList.find((u) => {
      const L = getLabelUp(u);
      return (
        L.includes("EB_ADMIN") ||
        L.includes("GII_VIEW_EB_ADMIN") ||
        L.includes("VIEW_EB_ADMIN") ||
        L.includes("_EB_ADMIN")
      );
    });
    if (hitByLabel?.dataSourceId) return String(hitByLabel.dataSourceId);
  }

  // area+settore
  if (areaCode) {
    if (settoreCode) {
      const dsAreaSett = findBy(
        (n) =>
          n.includes(`EB_${areaCode}_${settoreCode}`) ||
          n.includes(`_${areaCode}_${settoreCode}`),
      );
      if (dsAreaSett) return dsAreaSett;
    }
    // viste "TUTTE" per ruoli superiori
    if (ruolo != null && ruolo >= 4 && ruolo <= 6) {
      const dsTutte = findBy(
        (n) =>
          n.includes(`EB_${areaCode}_TUTTE`) ||
          n.includes(`EB_${areaCode}_TUTTI`),
      );
      if (dsTutte) return dsTutte;
    }
    const dsArea = findBy(
      (n) => n.includes(`EB_${areaCode}`) || n.includes(`_${areaCode}`),
    );
    if (dsArea) return dsArea;
  }

  // fallback admin view
  if (isAppAdmin) {
    const dsAdminFallback = findBy(
      (n) =>
        n.includes("EB_ADMIN") ||
        n.includes("GII_VIEW_EB_ADMIN") ||
        n.includes("VIEW_EB_ADMIN"),
    );
    if (dsAdminFallback) return dsAdminFallback;

    const hitByLabel = useDsList.find((u) => {
      const L = getLabelUp(u);
      return (
        L.includes("EB_ADMIN") ||
        L.includes("GII_VIEW_EB_ADMIN") ||
        L.includes("VIEW_EB_ADMIN") ||
        L.includes("_EB_ADMIN")
      );
    });
    if (hitByLabel?.dataSourceId) return String(hitByLabel.dataSourceId);
  }

  // Se non troviamo match affidabili, evitiamo di forzare un singolo DS “a caso”.
  // Lasciamo al widget la gestione multi-DS (tabs) o i filtri allowedDsIds.
  return items.length === 1 ? items[0]?.dsId || null : null;
}

interface GiiUserInfo {
  username: string;
  ruolo: number | null; // codice numerico legacy (1-7)
  ruoloCod: string; // codice testuale ufficiale: TR/TI/RZ/RI/DT/DA/ADMIN
  ruoloLabel: string; // compatibilità: coincide col codice ruolo
  area: number | null; // codice numerico legacy
  areaCod: "AMM" | "AGR" | "TEC" | "";
  settore: number | null; // codice numerico legacy
  settoreCod: string;
  ufficio: number | null;
  gruppo: string;
  isAdmin: boolean; // org_admin AGOL o admin workflow
}

// Legge il profilo utente caricato dall'Header (unica fonte).
function readGiiUserFromHeader(): GiiUserInfo | null {
  const cached: any = (window as any).__giiUserRole;
  if (!cached?.username) return null;

  const ruolo = cached.ruolo != null ? Number(cached.ruolo) : null;
  const gruppo = String(cached.gruppo || "");
  const inferredAdmin = inferIsOrgAdminFromSession();
  const inferredAppAdmin = gruppo.toUpperCase().includes("ADMIN");
  const isWorkflowAdmin =
    ruolo === 7 ||
    String(cached.ruoloLabel || "").toUpperCase() === "ADMIN" ||
    !!cached.isWorkflowAdmin;
  const isAdmin =
    !!cached.isAdmin || inferredAdmin || inferredAppAdmin || isWorkflowAdmin;

  const area = cached.area != null ? Number(cached.area) : null;
  const settore = cached.settore != null ? Number(cached.settore) : null;
  const areaCod = resolveAreaCode(area, cached.areaCod ?? cached.area_cod);
  const settoreCod = resolveSettoreCode(
    settore,
    cached.settoreCod ?? cached.settore_cod,
  );
  const ruoloCod = resolveRoleCode(
    ruolo,
    cached.ruoloCod ?? cached.ruolo_cod,
    cached.ruoloLabel,
    isAdmin,
  );
  let ruoloLabel = ruoloCod || String(cached.ruoloLabel || "");

  // Non forziamo più 'AMM': il ruolo workflow resta quello reale.
  // Se è un admin (org_admin o workflow admin) senza ruolo esplicito, mostriamo 'ADMIN'.
  if ((!ruoloLabel || !ruoloLabel.trim()) && isAdmin) ruoloLabel = "ADMIN";

  return {
    username: String(cached.username),
    ruolo,
    ruoloCod: ruoloCod || ruoloLabel,
    ruoloLabel,
    area,
    areaCod,
    settore,
    settoreCod,
    ufficio: cached.ufficio != null ? Number(cached.ufficio) : null,
    gruppo,
    isAdmin,
  };
}

// Verifica rapida: esiste un utente autenticato (senza chiamate di rete)
function isSignedInNow(): boolean {
  try {
    const sm = SessionManager.getInstance();
    const session: any =
      sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL);
    const u = session?.username || session?.userId || "";
    return !!u;
  } catch {
    return false;
  }
}

type GiiSidebarHit = {
  layout: HTMLElement;
  normal: HTMLElement;
  collapsable: HTMLElement;
  divider: HTMLElement;
};

function giiFindNearestLayoutSidebar(
  host: HTMLElement | null,
): GiiSidebarHit | null {
  if (!host) return null;
  try {
    let cur: HTMLElement | null = host.parentElement;
    while (cur && cur !== document.body) {
      if (String(cur.className || "").includes("widget-sidebar-layout")) {
        const inner = cur.children[0] as HTMLElement | undefined;
        if (!inner) {
          cur = cur.parentElement;
          continue;
        }
        const normal = Array.from(inner.children || []).find((c) =>
          String((c as HTMLElement).className || "").includes("side-normal"),
        ) as HTMLElement | undefined;
        const collapsable = Array.from(inner.children || []).find((c) =>
          String((c as HTMLElement).className || "").includes(
            "side-collapsable",
          ),
        ) as HTMLElement | undefined;
        const divider = inner.children[1] as HTMLElement | undefined;

        // Nella pagina Elenco pratiche il pannello sinistro è il lato FIRST
        // della Sidebar ExB (collapseSide FIRST) e quindi può risultare
        // "side-collapsable", non "side-normal". Nel cw editing, invece,
        // il widget è nel lato normal. La funzionalità è la stessa: bisogna
        // agganciare la Sidebar più vicina che contiene questo widget in uno
        // dei due pannelli, poi comandare il suo divisore reale con eventi
        // sintetici. Non usare portal/fixed e non agganciare Sidebar esterne.
        if (divider && normal && collapsable && (normal.contains(host) || collapsable.contains(host))) {
          return { layout: cur, normal, collapsable, divider };
        }
      }
      cur = cur.parentElement;
    }
  } catch {}
  return null;
}

function giiReadNearestLayoutSidebarBoundaryX(
  host: HTMLElement | null,
): number | null {
  const hit = giiFindNearestLayoutSidebar(host);
  if (!hit) return null;
  try {
    const dr = hit.divider.getBoundingClientRect();
    const x = dr.left + dr.width / 2;
    if (!Number.isFinite(x)) return null;
    return x;
  } catch {}
  return null;
}

const GII_ELENCO_SIDEBAR_DEFAULT_RATIO = 0.68;

function giiReadNearestLayoutSidebarDefaultBoundaryX(
  host: HTMLElement | null,
): number | null {
  const hit = giiFindNearestLayoutSidebar(host);
  if (!hit) return null;
  try {
    const r = hit.layout.getBoundingClientRect();
    if (!Number.isFinite(r.left) || !Number.isFinite(r.width) || r.width <= 0) {
      return null;
    }
    return r.left + r.width * GII_ELENCO_SIDEBAR_DEFAULT_RATIO;
  } catch {}
  return null;
}

function giiMoveNearestLayoutSidebarToX(
  host: HTMLElement | null,
  targetX: number | null,
): void {
  if (!host || targetX == null || !Number.isFinite(Number(targetX))) return;
  const hit = giiFindNearestLayoutSidebar(host);
  if (!hit) return;
  try {
    const dr = hit.divider.getBoundingClientRect();
    const startX = dr.left + dr.width / 2;
    const y = dr.top + dr.height / 2;
    const fire = (
      target: EventTarget,
      type: string,
      x: number,
      buttons: number,
    ) => {
      const opts = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y,
        button: 0,
        buttons,
      };
      try {
        target.dispatchEvent(
          new PointerEvent(type, {
            ...opts,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
      } catch {}
      try {
        target.dispatchEvent(
          new MouseEvent(type.replace("pointer", "mouse"), opts),
        );
      } catch {}
    };
    fire(hit.divider, "pointerdown", startX, 1);
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const x = startX + ((Number(targetX) - startX) * i) / steps;
      fire(document, "pointermove", x, 1);
    }
    fire(document, "pointerup", Number(targetX), 0);
  } catch {}
}

// Determina il campo stato del ruolo corrente
function getStatoFieldForRuolo(ruoloLabel: string): string {
  const r = ruoloLabel.toUpperCase();
  if (r === "TR") return "stato_TR";
  if (r === "TI") return "stato_TI";
  if (r === "RZ") return "stato_RZ";
  if (r === "RI") return "stato_RI";
  if (r === "DT") return "stato_DT";
  if (r === "DA") return "determinazione_stato";
  if (r === "RI_AMM") return "stato_RI_AMM";
  if (r === "TI_AMM") return "stato_TI_AMM";
  return "stato_DT"; // fallback
}

// Priorità ordinamento operativo: prima ciò che devo prendere/lavorare,
// poi ciò che ho già rimandato/trasmesso ad altri, infine chiusi/non attivi.
function getPriorityForStato(statoVal: number | null): number {
  if (statoVal === 1) return 0; // Da prendere in carico
  if (statoVal === 2) return 1; // In carico
  if (statoVal === 3 || statoVal === 4) return 2; // Rimandato / Trasmesso
  if (statoVal === 5) return 3; // Respinto
  return 4; // null / altri
}

export default function Widget(props: Props) {
  const cfg: any = (props.config ?? defaultConfig) as any;

  const useDsImm: any = props.useDataSources ?? [];
  const useDsJs: any[] = asJs(useDsImm);

  // ── Rilevamento ruolo utente loggato ──────────────────────────────────────
  const [giiUser, setGiiUser] = React.useState<GiiUserInfo | null>(null);
  const [userLoading, setUserLoading] = React.useState(true);
  // notLogged: true quando non c'è utente autenticato → overlay bloccante
  const [notLogged, setNotLogged] = React.useState(false);
  const [domainLabels, setDomainLabels] =
    React.useState<DomainLabelMaps>(EMPTY_DOMAIN_LABELS);
  const elencoSidebarHostRef = React.useRef<HTMLDivElement | null>(null);
  const elencoSidebarDividerRef = React.useRef<HTMLElement | null>(null);
  const elencoSidebarAutoResettingRef = React.useRef(false);
  const elencoSidebarUserDraggingRef = React.useRef(false);
  const [elencoSidebarDirty, setElencoSidebarDirty] = React.useState(false);
  const [elencoSidebarReady, setElencoSidebarReady] = React.useState(false);
  const [oggettoLegendInfo, setOggettoLegendInfo] =
    React.useState<OggettoLegendInfo | null>(null);
  const oggettoLegendTouchTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!oggettoLegendInfo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOggettoLegendInfo(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [oggettoLegendInfo]);

  React.useEffect(() => {
    return () => {
      if (oggettoLegendTouchTimerRef.current != null) {
        window.clearTimeout(oggettoLegendTouchTimerRef.current);
      }
    };
  }, []);

  // Stesso accorgimento usato nel cw editing: l’overlay è locale al widget,
  // però il ramo ExB che lo contiene deve poter mostrare elementi fuori bordo.
  // Senza questo, il pulsante/riga restano sotto o tagliati dai contenitori
  // della colonna/sidebar, soprattutto quando il divisore nativo è invisibile.
  React.useEffect(() => {
    const touched: Array<{
      el: HTMLElement;
      zIndex: string;
      overflow: string;
      overflowX: string;
      overflowY: string;
      position: string;
    }> = [];

    const touch = (el: HTMLElement) => {
      try {
        const st = window.getComputedStyle(el);
        touched.push({
          el,
          zIndex: el.style.zIndex,
          overflow: el.style.overflow,
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
          position: el.style.position,
        });
        if (st.position === "static") el.style.position = "relative";
        el.style.setProperty("z-index", "2147483000", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("overflow-x", "visible", "important");
        el.style.setProperty("overflow-y", "visible", "important");
      } catch {}
    };

    try {
      let cur = elencoSidebarHostRef.current?.parentElement ?? null;
      while (cur && cur !== document.body) {
        const cls = String(cur.className || "");
        if (cls.includes("widget-sidebar-layout")) break;
        touch(cur);
        cur = cur.parentElement;
      }
    } catch {}

    return () => {
      for (const item of touched.reverse()) {
        try {
          item.el.style.zIndex = item.zIndex;
          item.el.style.overflow = item.overflow;
          item.el.style.overflowX = item.overflowX;
          item.el.style.overflowY = item.overflowY;
          item.el.style.position = item.position;
        } catch {}
      }
    };
  }, []);

  // Firma metadata datasource (label/url) per ricalcolare bestDsId quando ExB popola i datasource
  const [dsMetaSig, setDsMetaSig] = React.useState("");

  // --- Selection bridge boot reset ---
  // La selezione NON deve persistere tra refresh/riapertura pagina.
  // Facciamo il reset UNA sola volta per page-load qui nell'Elenco (source of truth),
  // cosi Azioni non mostra mai il record precedente quando l'Elenco non ha selezione.
  React.useEffect(() => {
    try {
      const w: any = window as any;
      if (w.__giiSelBootCleared) return;
      w.__giiSelBootCleared = true;
    } catch {}
    notifySelectionCleared();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let dividerEl: HTMLElement | null = null;
    let oldDividerZ = "";
    let oldDividerPosition = "";
    let oldDividerPointerEvents = "";
    let oldDividerCursor = "";

    const install = () => {
      if (cancelled) return false;
      const hit = giiFindNearestLayoutSidebar(elencoSidebarHostRef.current);
      if (!hit) {
        elencoSidebarDividerRef.current = null;
        setElencoSidebarReady(false);
        return false;
      }
      dividerEl = hit.divider;
      elencoSidebarDividerRef.current = hit.divider;
      oldDividerZ = hit.divider.style.zIndex;
      oldDividerPosition = hit.divider.style.position;
      oldDividerPointerEvents = hit.divider.style.pointerEvents;
      oldDividerCursor = hit.divider.style.cursor;
      hit.divider.style.setProperty("z-index", "2147483646", "important");
      hit.divider.style.setProperty("position", "relative", "important");
      // Come nel cw editing: il divisore nativo ExB resta il destinatario
      // degli eventi sintetici, ma non intercetta più il mouse né copre
      // il pulsante reset quando il divisore del Builder non è visibile.
      hit.divider.style.setProperty("pointer-events", "none", "important");
      hit.divider.style.setProperty("cursor", "default", "important");
      setElencoSidebarReady(true);

      // All'apertura della pagina l'Elenco deve partire dal default reale
      // del layout (68%). Se il browser/Builder conserva una larghezza
      // precedente, la riallineo subito senza mostrare il reset giallo.
      window.setTimeout(() => {
        if (cancelled || elencoSidebarUserDraggingRef.current) return;
        const host = elencoSidebarHostRef.current;
        const target = giiReadNearestLayoutSidebarDefaultBoundaryX(host);
        const x = giiReadNearestLayoutSidebarBoundaryX(host);
        if (target == null || x == null) return;
        if (Math.abs(Number(x) - Number(target)) > 2) {
          elencoSidebarAutoResettingRef.current = true;
          giiMoveNearestLayoutSidebarToX(host, target);
          window.setTimeout(() => {
            elencoSidebarAutoResettingRef.current = false;
            setElencoSidebarDirty(false);
          }, 450);
        } else {
          setElencoSidebarDirty(false);
        }
      }, 180);

      return true;
    };

    const installed = install();
    const t1 = installed ? 0 : window.setTimeout(install, 300);
    const t2 = installed ? 0 : window.setTimeout(install, 1000);

    return () => {
      cancelled = true;
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      try {
        if (dividerEl) {
          dividerEl.style.zIndex = oldDividerZ;
          dividerEl.style.position = oldDividerPosition;
          dividerEl.style.pointerEvents = oldDividerPointerEvents;
          dividerEl.style.cursor = oldDividerCursor;
        }
      } catch {}
      elencoSidebarDividerRef.current = null;
      setElencoSidebarReady(false);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const syncDirty = () => {
      if (cancelled || elencoSidebarAutoResettingRef.current) return;
      const host = elencoSidebarHostRef.current;
      const target = giiReadNearestLayoutSidebarDefaultBoundaryX(host);
      const x = giiReadNearestLayoutSidebarBoundaryX(host);
      if (target == null || x == null) return;
      setElencoSidebarDirty(Math.abs(Number(x) - Number(target)) > 2);
    };

    const t = window.setTimeout(syncDirty, 250);
    const id = window.setInterval(syncDirty, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.clearInterval(id);
      setElencoSidebarDirty(false);
    };
  }, []);

  // ── Bootstrap contesto utente (solo dall'Header) ─────────────────────────
  React.useEffect(() => {
    let cancelled = false;

    const apply = () => {
      if (cancelled) return;

      const u = readGiiUserFromHeader();
      if (u) {
        setGiiUser(u);
        setNotLogged(false);
        setUserLoading(false);
        return;
      }

      // Nessun profilo dall'Header:
      // - non autenticato → overlay "Accesso richiesto"
      // - autenticato ma profilo non ancora pronto → resta in loading
      if (!isSignedInNow()) {
        setGiiUser(null);
        setNotLogged(true);
        setUserLoading(false);
      } else {
        setGiiUser(null);
        setNotLogged(false);
        setUserLoading(true);
      }
    };

    apply();
    window.addEventListener("gii:userLoaded", apply);
    return () => {
      cancelled = true;
      window.removeEventListener("gii:userLoaded", apply);
    };
  }, []);

  // Vista runtime effettiva per la sessione corrente
  const resolvedView = React.useMemo(
    () => (giiUser ? pickRuntimeViewForUser(giiUser) : null),
    [
      giiUser?.username,
      giiUser?.ruoloLabel,
      giiUser?.area,
      giiUser?.settore,
      giiUser?.isAdmin,
    ],
  );

  const filteredUseDsJs: any[] = React.useMemo(() => {
    if (!resolvedView) return [];
    return [
      {
        dataSourceId: resolvedView.layerUrl,
        mainDataSourceId: resolvedView.layerUrl,
        rootDataSourceId: resolvedView.serviceUrl,
        __label: resolvedView.viewName,
      },
    ];
  }, [
    resolvedView?.layerUrl,
    resolvedView?.serviceUrl,
    resolvedView?.viewName,
  ]);

  // Domini ufficiali AGOL del layer/vista runtime: fonte primaria per label Area/Settore.
  // I record continuano a determinare quali opzioni mostrare; i domini determinano come chiamarle.
  React.useEffect(() => {
    let cancelled = false;
    const layerUrl = String(resolvedView?.layerUrl || "").trim();
    if (!layerUrl) {
      setDomainLabels(EMPTY_DOMAIN_LABELS);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const labels = await loadDomainLabelMaps(layerUrl);
        if (!cancelled) setDomainLabels(labels);
      } catch (ex) {
        console.warn(
          "[GII-Elenco] Domini AGOL non disponibili, uso fallback locale:",
          ex,
        );
        if (!cancelled) setDomainLabels(EMPTY_DOMAIN_LABELS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedView?.layerUrl]);

  const statoRuoloField = giiUser?.isAdmin
    ? null
    : giiUser?.ruoloLabel
      ? getStatoFieldForRuolo(
          getEffectiveRole(giiUser.ruoloLabel, giiUser.area),
        )
      : null;

  // ── Enrichment: GII_LOG_EVENTI_CICLI + GII_utenti (colonne virtuali Mittente/Causale/Data) ──
  const logMapRef = React.useRef<Map<string, LogEntry>>(new Map());
  const [logVer, setLogVer] = React.useState(0);
  const utentiMapRef = React.useRef<Map<string, UtentiEntry> | null>(
    _utentiMapCache,
  );
  const lastLogGidSigRef = React.useRef("");
  const logLoadedRef = React.useRef(false);

  // ── Tab ruolo: In attesa mia / In attesa di altri / Tutte ────────────────────
  const ROLE_TABS = [
    { id: "attesa_mia", label: "In attesa mia" },
    { id: "attesa_altri", label: "In attesa di altri" },
    { id: "tutte", label: "Tutte le pratiche" },
  ];
  const [activeRoleTab, setActiveRoleTab] =
    React.useState<string>("attesa_mia");

  // Funzione filtro per tab ruolo
  const passesRoleTab = React.useCallback(
    (r: DataRecord, tabId: string): boolean => {
      if (!statoRuoloField || tabId === "tutte") return true;

      const d = r.getData?.() || {};
      const stato = computeDisplaySintetico(d);
      const label = labelNorm(txt(stato.label)).trim().toLowerCase();

      // La tab "In attesa mia" contiene solo pratiche su cui il ruolo
      // corrente deve agire adesso. La tab "In attesa di altri" contiene
      // le pratiche ancora operative presso altri ruoli; le pratiche respinte
      // sono chiuse e restano consultabili solo in "Tutte le pratiche".
      const isAttesaMia =
        label === "da prendere in carico" || label === "in carico";
      const isRespinto =
        isRapportoRespintoChiuso(d) ||
        label === "respinto" ||
        label.startsWith("respint");

      if (tabId === "attesa_mia") return isAttesaMia;
      if (tabId === "attesa_altri") return !isAttesaMia && !isRespinto;
      return true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      statoRuoloField,
      giiUser?.ruoloLabel,
      giiUser?.area,
      giiUser?.username,
      logVer,
    ],
  );

  const equalsUser = React.useCallback((a: any, b: any): boolean => {
    const sa = String(a ?? "")
      .trim()
      .toLowerCase();
    const sb = String(b ?? "")
      .trim()
      .toLowerCase();
    return !!sa && !!sb && sa == sb;
  }, []);

  const isRecordVisibleForCurrentUser = React.useCallback(
    (r: DataRecord): boolean => {
      if (giiUser?.isAdmin) return true;
      const role = getEffectiveRole(giiUser?.ruoloLabel || "", giiUser?.area);
      if (!role) return true;

      const d: any = r.getData?.() || {};

      // Rapporti archiviati (GII_arch = 1) non visibili negli elenchi ordinari
      const archVal = d["GII_arch"] ?? d["gii_arch"] ?? d["GII_ARCH"];
      if (
        archVal !== null &&
        archVal !== undefined &&
        archVal !== "" &&
        Number(archVal) === 1
      )
        return false;

      // DA e ruoli AMM (RI AMM, TI AMM): vedono solo i Rapporti entrati in fase sanzionatoria.
      // area=1 → AMM
      const areaNum = giiUser?.area ?? null;
      const isAmmArea = areaNum === 1;
      // DA, RI_AMM, TI_AMM: vedono solo i Rapporti entrati in fase sanzionatoria.
      if (
        role === "DA" ||
        role === "RI_AMM" ||
        role === "TI_AMM" ||
        (isAmmArea && (role === "RI" || role === "TI"))
      ) {
        if (!isInFaseSanzionatoria(d)) return false;
        // TI_AMM: vede solo le pratiche a lui assegnate (come TI vede solo le sue)
        if (role === "TI_AMM") {
          const meUser = String(giiUser?.username || "").trim();
          const tiAmmUser = String(d["ti_amm_assegnato_username"] ?? "").trim();
          const tiAmmName = String(d["ti_amm_assegnato_nome"] ?? "").trim();
          if (!tiAmmUser && !tiAmmName) return false; // non ancora assegnata
          return equalsUser(tiAmmUser, meUser) || equalsUser(tiAmmName, meUser);
        }
        return true;
      }

      if (role === "TI") {
        const meUser = String(giiUser?.username || "").trim();
        const meName = String(
          (giiUser as any)?.fullName ??
            (giiUser as any)?.nome ??
            (giiUser as any)?.displayName ??
            "",
        ).trim();
        const opRaw = d["origine_pratica"];
        const opNum =
          opRaw !== null && opRaw !== undefined && opRaw !== ""
            ? Number(opRaw)
            : null;

        const tiUser = String(
          d["ti_assegnato_username"] ??
            d["ti_assegnato_user"] ??
            d["ti_assegnato"] ??
            "",
        ).trim();
        const tiName = String(
          d["ti_assegnato_nome"] ?? d["ti_assegnato_name"] ?? "",
        ).trim();
        const assignedToMe =
          equalsUser(tiUser, meUser) ||
          equalsUser(tiName, meUser) ||
          (meName ? equalsUser(tiName, meName) : false);

        const creatorVals = [
          d["created_user"],
          d["Creator"],
          d["creator"],
          d["username"],
          d["user_name"],
          d["utente"],
          d["utente_ins"],
          d["created_by"],
          d["submitter"],
          d["owner"],
        ];
        const createdByMe = creatorVals.some(
          (v) =>
            equalsUser(v, meUser) || (meName ? equalsUser(v, meName) : false),
        );

        const hasTiWorkflow = hasRuoloData(d, "TI");

        // Origine TR: i TI non devono vedere la pratica finché RZ non assegna.
        // E dopo l'assegnazione la vede solo il TI assegnatario.
        if (opNum === 1) {
          if (!tiUser && !tiName && !hasTiWorkflow) return false;
          if (tiUser || tiName) return assignedToMe;
          return false;
        }

        // Origine TI: la vede il TI originatore; se poi viene esplicitamente assegnata,
        // prevale comunque l'assegnazione nominativa.
        if (opNum === 2) {
          if (tiUser || tiName) return assignedToMe;
          if (createdByMe) return true;
          return hasTiWorkflow;
        }
      }

      return true;
    },
    [giiUser, equalsUser],
  );

  const filterByRoleTab = React.useCallback(
    (recs: DataRecord[]): DataRecord[] => {
      // La classificazione "In attesa mia / In attesa di altri / Tutte" dipende
      // anche dall'ultimo evento di workflow. Prima che il LOG sia stato caricato
      // non mostriamo classificazioni provvisorie, altrimenti la pratica può
      // comparire per un istante nella scheda sbagliata e poi spostarsi.
      if (statoRuoloField && !logLoadedRef.current) return [];
      if (!statoRuoloField || activeRoleTab === "tutte") return recs;
      return recs.filter((r) => passesRoleTab(r, activeRoleTab));
    },
    [statoRuoloField, activeRoleTab, passesRoleTab, logVer],
  );

  // Ordinamento priorità ruolo: prima ciò che devo lavorare, poi ciò che ho inviato ad altri.
  const sortByRolePriority = React.useCallback(
    (recs: DataRecord[]): DataRecord[] => {
      if (!statoRuoloField) return recs;
      const rank = (r: DataRecord): number => {
        const d = r.getData?.() || {};
        const label = labelNorm(txt(computeDisplaySintetico(d).label))
          .trim()
          .toLowerCase();
        if (label === "da prendere in carico") return 0;
        if (label === "in carico") return 1;
        if (
          label === "rimandato" ||
          label === "trasmesso" ||
          label.startsWith("assegnato")
        )
          return 2;
        if (label === "respinto") return 3;
        return 4;
      };
      return [...recs].sort((ra, rb) => rank(ra) - rank(rb));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      statoRuoloField,
      giiUser?.ruoloLabel,
      giiUser?.area,
      giiUser?.isAdmin,
      logVer,
    ],
  );

  // ── Un solo tab effettivo per sessione: la vista runtime scelta dal contesto utente ──
  const tabGroups = React.useMemo(() => {
    if (!resolvedView) return [] as { label: string; dsIndices: number[] }[];
    return [{ label: resolvedView.viewName, dsIndices: [0] }];
  }, [resolvedView?.viewName]);

  const hasTabs = false;
  const [activeTab, setActiveTab] = React.useState<number>(0);

  // ── Raccolta record dalla sola vista runtime di sessione ──
  const [localSelectedByDs, setLocalSelectedByDs] = React.useState<
    Record<string, string>
  >({});
  const [localSelectedOid, setLocalSelectedOid] = React.useState<number | null>(null);
  const dsDataRef = React.useRef<
    Record<
      string,
      { recs: DataRecord[]; ds: DataSource | null; loading: boolean }
    >
  >({});
  const runtimeRecordsRef = React.useRef<DataRecord[]>([]);
  const prevUserRef = React.useRef<string>("");
  const [dsDataVer, setDsDataVer] = React.useState(0);

  React.useEffect(() => {
    const cur = giiUser?.username || "";
    const prev = prevUserRef.current;
    if (cur === prev) return;
    prevUserRef.current = cur;
    runtimeRecordsRef.current = [];
    dsDataRef.current = {};
    setLocalSelectedByDs({});
    setLocalSelectedOid(null);
    notifySelectionCleared();
  }, [giiUser?.username]);

  const whereClause = txt(cfg.whereClause || "1=1");
  const pageSize = num(cfg.pageSize, 200);
  const isReady = !notLogged && !userLoading && !!giiUser?.username;

  const [listRefreshNonce, setListRefreshNonce] = React.useState(0);
  const [lastListRefreshAt, setLastListRefreshAt] = React.useState<
    number | null
  >(null);
  const preserveSelectionRefreshUntilRef = React.useRef<number>(0);

  const forceListRefresh = React.useCallback(
    (options?: { refreshAlerts?: boolean; preserveSelection?: boolean }) => {
      if (options?.preserveSelection) {
        preserveSelectionRefreshUntilRef.current = Date.now() + 10000;
      }
      // Forza anche il ricaricamento del LOG: il set dei GlobalID puo' restare
      // identico dopo un'azione (es. RZ assegna a TI), ma l'ultimo evento cambia.
      // Senza azzerare questa firma l'elenco continua a mostrare l'oggetto vecchio
      // fino al refresh manuale della pagina/lista.
      lastLogGidSigRef.current = "";
      logLoadedRef.current = false;
      Object.keys(dsDataRef.current || {}).forEach((key) => {
        const entry = dsDataRef.current[key];
        if (entry) dsDataRef.current[key] = { ...entry, loading: true };
      });
      setDsDataVer((v) => v + 1);
      setListRefreshNonce((n) => n + 1);

      // Il pulsante "Aggiorna elenco" deve allineare anche la campanella:
      // elenco e allarmi sono due viste dello stesso stato operativo.
      if (options?.refreshAlerts) {
        try {
          window.dispatchEvent(
            new CustomEvent("gii-alerts-refresh", {
              detail: { source: "elenco-refresh" },
            }),
          );
        } catch {}
      }
    },
    [],
  );

  React.useEffect(() => {
    const h = (evt?: any) => {
      const source = String(evt?.detail?.source || "");
      const restoreInfo = readRestoreSelectionAfterEdit();
      const evtOid = evt?.detail?.oid;
      const sameRestoreOid =
        !!restoreInfo &&
        (evtOid == null || Number(evtOid) === Number(restoreInfo.oid));
      forceListRefresh({
        preserveSelection:
          source.startsWith("azioni-presa-in-carico") ||
          (source === "gii-azioni" && sameRestoreOid),
      });
    };
    const hSelectionCleared = (evt?: any) => {
      const source = String(evt?.detail?.source || "");
      // Dopo un'azione procedimentale il cw azioni azzera la selezione; l'elenco
      // deve ricaricare record e LOG, altrimenti puo' restare visualizzato lo
      // snapshot precedente della pratica appena presa in carico/trasmessa/ecc.
      if (source === "azioni-post-applyedits") forceListRefresh();
    };
    window.addEventListener("gii-force-refresh-selection", h as any);
    window.addEventListener("gii:record-updated", h as any);
    window.addEventListener("gii-log-eventi-cicli-changed", h as any);
    window.addEventListener("gii-selection-cleared", hSelectionCleared as any);
    return () => {
      window.removeEventListener("gii-force-refresh-selection", h as any);
      window.removeEventListener("gii:record-updated", h as any);
      window.removeEventListener("gii-log-eventi-cicli-changed", h as any);
      window.removeEventListener(
        "gii-selection-cleared",
        hSelectionCleared as any,
      );
    };
  }, [forceListRefresh]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const key = resolvedView?.layerUrl || "__none__";
      if (!resolvedView || !isReady) {
        runtimeRecordsRef.current = [];
        dsDataRef.current[key] = { recs: [], ds: null as any, loading: false };
        setDsDataVer((v) => v + 1);
        return;
      }

      dsDataRef.current[key] = { recs: [], ds: null as any, loading: true };
      // La query runtime e il LOG devono avanzare insieme: durante la
      // rilettura del Feature Layer non va riutilizzato il LOG dello stato
      // precedente, altrimenti la pratica puo' comparire per un frame nella
      // scheda operativa sbagliata prima della nuova query LOG.
      logLoadedRef.current = false;
      setDsDataVer((v) => v + 1);

      try {
        const proxy = await createRuntimeFeatureLayerProxy(
          resolvedView,
          runtimeRecordsRef as any,
        );
        const res: any = await proxy.query({
          where: whereClause,
          outFields: ["*"],
          returnGeometry: false,
          pageSize,
        });
        if (cancelled) return;
        const recs: DataRecord[] = (res?.records || []) as DataRecord[];
        dsDataRef.current[key] = { recs, ds: proxy, loading: false };
        // Se sono arrivati record, la classificazione per ruolo resta sospesa
        // fino al completamento della query su GII_LOG_EVENTI_CICLI relativa a
        // quei record. Se invece non ci sono record, il caricamento log puo'
        // considerarsi concluso e i contatori restano a zero senza flicker.
        const loadedGids = recs
          .map((r) => {
            const d: any = r.getData?.() || {};
            return d.GlobalID ?? d.globalid ?? d.globalId ?? d.GLOBALID;
          })
          .filter((gid) => !!gid)
          .map((gid) => normGid(gid));
        const nextLogSig = `${loadedGids.sort().join(",")}::${listRefreshNonce}`;
        logLoadedRef.current = !loadedGids.length || nextLogSig === lastLogGidSigRef.current;
        setLastListRefreshAt(Date.now());
        try {
          const w = window as any;
          w.__giiRuntimeDsProxyCache = w.__giiRuntimeDsProxyCache || {};
          w.__giiRuntimeDsProxyCache[resolvedView.layerUrl] = proxy;
        } catch {}
      } catch {
        if (cancelled) return;
        dsDataRef.current[key] = { recs: [], ds: null as any, loading: false };
        logLoadedRef.current = true;
        setLastListRefreshAt(Date.now());
      }
      if (!cancelled) setDsDataVer((v) => v + 1);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    resolvedView?.layerUrl,
    resolvedView?.viewName,
    isReady,
    whereClause,
    pageSize,
    listRefreshNonce,
  ]);

  // ── Enrichment: carica GII_LOG_EVENTI_CICLI + GII_utenti ──

  // Carica GII_utenti UNA volta (cache globale)
  React.useEffect(() => {
    if (_utentiMapCache) {
      utentiMapRef.current = _utentiMapCache;
      return;
    }
    if (_utentiMapLoading) return;
    _utentiMapLoading = true;
    (async () => {
      try {
        const layer = await getLoadedFeatureLayer(UTENTI_TABLE_URL);
        const res = await layer.queryFeatures({
          where: "1=1",
          outFields: ["*"],
          returnGeometry: false,
        });
        const map = new Map<string, UtentiEntry>();
        for (const f of res?.features || []) {
          const a = f?.attributes || {};
          const username = String(pickField(a, "username") || "").trim();
          if (username) {
            const nome = cleanNomeCognome(pickField(a, "nome"));
            const cognome = cleanNomeCognome(pickField(a, "cognome"));
            const fullName =
              cleanNomeCognome(`${nome} ${cognome}`.trim()) ||
              cleanNomeCognome(pickField(a, "full_name")) ||
              cleanNomeCognome(pickField(a, "nome_cognome")) ||
              cleanNomeCognome(pickField(a, "nominativo"));
            map.set(username.toLowerCase(), {
              username,
              full_name: fullName,
              nome,
              cognome,
              ruolo: pickField(a, "ruolo") ?? null,
              ruoloCod: resolveRoleCode(
                pickField(a, "ruolo") ?? null,
                pickField(a, "ruolo_cod"),
              ),
              area: pickField(a, "area") ?? null,
              areaCod: resolveAreaCode(
                pickField(a, "area") ?? null,
                pickField(a, "area_cod"),
              ),
              settore: pickField(a, "settore") ?? null,
              settoreCod: resolveSettoreCode(
                pickField(a, "settore") ?? null,
                pickField(a, "settore_cod"),
              ),
            });
          }
        }
        _utentiMapCache = map;
        utentiMapRef.current = map;
        // Ri-trigger render per aggiornare mittente con nomi
        setLogVer((v) => v + 1);
      } catch (ex) {
        console.warn("[GII-Elenco] Errore caricamento GII_utenti:", ex);
      } finally {
        _utentiMapLoading = false;
      }
    })();
  }, []);

  // Carica GII_LOG_EVENTI_CICLI quando cambia il set di record (dsDataVer)
  React.useEffect(() => {
    // Raccogli tutti i GlobalID dai record caricati
    const gids: string[] = [];
    for (const key of Object.keys(dsDataRef.current)) {
      const entry = dsDataRef.current[key];
      if (!entry?.recs) continue;
      for (const r of entry.recs) {
        const d = r.getData?.() || ({} as any);
        const gid = d.GlobalID ?? d.globalid ?? d.globalId ?? d.GLOBALID;
        if (gid) gids.push(normGid(gid));
      }
    }
    // La firma include anche il nonce di refresh elenco: dopo una modifica
    // workflow il set dei record/GlobalID puo' essere identico, ma l'ultimo
    // evento di GII_LOG_EVENTI_CICLI deve comunque essere riletto.
    const sig = `${gids.sort().join(",")}::${listRefreshNonce}`;
    if (sig === lastLogGidSigRef.current) return;
    lastLogGidSigRef.current = sig;
    logLoadedRef.current = false;

    if (!gids.length) {
      // Non svuotare logMap se i dati stanno ancora caricando (transizione refresh)
      const anyLoading = Object.values(dsDataRef.current).some(
        (e: any) => e?.loading,
      );
      if (!anyLoading) {
        logMapRef.current = new Map();
        logLoadedRef.current = true;
        setLogVer((v) => v + 1);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const layer = await getLoadedFeatureLayer(LOG_TABLE_URL);

        const map = new Map<string, LogEntry>();
        const chunks: string[][] = [];
        // Chunk in gruppi da 50 GlobalID per evitare limiti URL
        for (let i = 0; i < gids.length; i += 50)
          chunks.push(gids.slice(i, i + 50));

        const results = await Promise.all(
          chunks.map(async (chunk) => {
            if (cancelled) return [] as any[];
            const inClause = chunk
              .map((g) => `'${g.replace(/'/g, "''")}'`)
              .join(",");
            const res = await layer.queryFeatures({
              where: `parent_globalid IN (${inClause}) AND stato_record = 'CHIUSO'`,
              outFields: [
                "parent_globalid",
                "utente_operatore",
                "ruolo_competente",
                "area",
                "settore",
                "evento_chiusura",
                "dt_chiusura",
                "ruolo_destinatario",
                "utente_destinatario",
              ],
              orderByFields: ["dt_chiusura DESC"],
              returnGeometry: false,
            });
            return (res?.features || []) as any[];
          }),
        );

        if (cancelled) return;
        for (const features of results) {
          for (const f of features) {
            const a = f?.attributes;
            const pgid = normGid(a?.parent_globalid);
            // Primo messaggio utile per ogni parent_globalid (ordinato DESC = più recente).
            // La colonna Oggetto/Da/A deve rappresentare una trasmissione,
            // non eventi tecnici come presa in carico o archiviazione.
            const eventoLog = String(a?.evento_chiusura || "");
            if (pgid && isOggettoLogEvent(eventoLog)) {
              const dtRaw = a?.dt_chiusura;
              const dtMs = dtRaw
                ? typeof dtRaw === "number"
                  ? dtRaw
                  : Date.parse(String(dtRaw))
                : null;
              const eventInfo: LogHistoryItem = {
                evento: String(a?.evento_chiusura || ""),
                ruolo: String(a?.ruolo_competente || ""),
                ruoloDest: String(a?.ruolo_destinatario || ""),
              };

              if (!map.has(pgid)) {
                map.set(pgid, {
                  utente: String(a?.utente_operatore || ""),
                  ruolo: eventInfo.ruolo,
                  area: String(a?.area || ""),
                  settore: String(a?.settore || ""),
                  evento: eventInfo.evento,
                  dt: dtMs && Number.isFinite(dtMs) ? dtMs : null,
                  ruoloDest: eventInfo.ruoloDest,
                  utenteDest: String(a?.utente_destinatario || ""),
                  history: [],
                });
              } else {
                const current = map.get(pgid);
                if (current) {
                  const history = current.history || [];
                  if (history.length < 50) history.push(eventInfo);
                  current.history = history;
                }
              }
            }
          }
        }
        if (!cancelled) {
          logMapRef.current = map;
          logLoadedRef.current = true;
          setLogVer((v) => v + 1);
        }
      } catch (ex) {
        console.warn(
          "[GII-Elenco] Errore caricamento GII_LOG_EVENTI_CICLI:",
          ex,
        );
        logLoadedRef.current = true;
        setLogVer((v) => v + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsDataVer, listRefreshNonce]);

  // Helper: leggi log entry per un record.
  // Durante il refresh del LOG non restituiamo il vecchio valore in cache:
  // meglio mostrare temporaneamente un trattino che un Oggetto provvisorio/superato
  // (es. NUOVA RILEVAZIONE o ASSEGNAZIONE ISTRUTTORIA) destinato a cambiare
  // dopo pochi istanti.
  const getLogForRecord = React.useCallback(
    (d: any): LogEntry | null => {
      if (!logLoadedRef.current) return null;
      const gid = d?.GlobalID ?? d?.globalid ?? d?.globalId ?? d?.GLOBALID;
      if (!gid) return null;
      return logMapRef.current.get(normGid(gid)) || null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [logVer],
  );

  // Sort: array (ordinamento multiplo con clic sulle intestazioni)
  const defaultSort: SortItem[] = React.useMemo(() => {
    const f = txt(cfg.orderByField || V_DATA_MSG);
    const d = (
      txt(cfg.orderByDir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC"
    ) as SortDir;
    return [{ field: f, dir: d }];
  }, [cfg.orderByField, cfg.orderByDir]);

  const [sortState, setSortState] = React.useState<SortItem[]>(defaultSort);

  // ── Filtri integrati nell'elenco ─────────────────────────────────────────────
  const [searchFilter, setSearchFilter] = React.useState("");
  const [areaFilter, setAreaFilter] = React.useState("tutte");
  const [settoreFilter, setSettoreFilter] = React.useState("tutte");
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [statoFilter, setStatoFilter] = React.useState("tutte");

  // Se cambia il sort default da settings, riallineo SOLO se l'utente non ha un custom sort
  React.useEffect(() => {
    const isCustom = sortSig(sortState) !== sortSig(defaultSort);
    if (!isCustom) setSortState(defaultSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortSig(defaultSort)]);

  // ── Record fusi per il tab attivo ──
  const clampedTab = Math.min(activeTab, Math.max(0, tabGroups.length - 1));
  const activeGroup = tabGroups[clampedTab] || tabGroups[0];

  // Campi base
  const fieldPratica = txt(cfg.fieldPratica || "objectid");
  const fieldDataRil = txt(cfg.fieldDataRilevazione || "data_rilevazione");
  const fieldUfficio = txt(cfg.fieldUfficio || "ufficio_zona");

  // Nota: per DT/DA la presa in carico è derivata da stato_* e dt_presa_in_carico_*.
  // I vecchi campi presa_in_carico_DT/DA non sono più usati.

  const presaDaPrendere = num(cfg.presaDaPrendereVal, 1);
  const presaPresa = num(cfg.presaPresaVal, 2);

  const statoDaPrendere = num(cfg.statoDaPrendereVal, 1);
  const statoPresa = num(cfg.statoPresaVal, 2);
  const statoIntegrazione = num(cfg.statoIntegrazioneVal, 3);
  const statoApprovata = num(cfg.statoApprovataVal, 4);
  const statoRespinta = num(cfg.statoRespintaVal, 5);

  const esitoIntegrazione = num(cfg.esitoIntegrazioneVal, 1);
  const esitoApprovata = num(cfg.esitoApprovataVal, 2);
  const esitoRespinta = num(cfg.esitoRespintaVal, 3);

  const labelStato = (v: any): string => {
    const n = Number(v);
    if (!Number.isFinite(n)) return normalizeMioStatoLabel(txt(v));
    if (n === statoDaPrendere) return "Da prendere in carico";
    if (n === statoPresa) return "In carico";
    if (n === statoIntegrazione) return "Rimandato";
    if (n === statoApprovata) return "Trasmesso";
    if (n === statoRespinta) return "Respinto";
    return "—";
  };

  const labelEsito = (v: any): string => {
    const n = Number(v);
    if (!Number.isFinite(n)) return normalizeMioStatoLabel(txt(v));
    if (n === esitoIntegrazione) return "Rimandato";
    if (n === esitoApprovata) return "Trasmesso";
    if (n === esitoRespinta) return "Respinto";
    return "—";
  };

  // ── Chip colors — label-driven, colori da config ─────────────────────────
  const CHIP_YELLOW = {
    background: txt(cfg.chipBgGiallo || "#feeb22"),
    color: txt(cfg.chipTextGiallo || "#5a4000"),
    borderColor: txt(cfg.chipBorderGiallo || "#c9b800"),
  };
  const CHIP_BLUE = {
    background: txt(cfg.chipBgAzzurro || "#2f6fed"),
    color: txt(cfg.chipTextAzzurro || "#ffffff"),
    borderColor: txt(cfg.chipBorderAzzurro || "#1d4ed8"),
  };
  const CHIP_GREEN = {
    background: txt(cfg.chipBgVerde || "#009246"),
    color: txt(cfg.chipTextVerde || "#ffffff"),
    borderColor: txt(cfg.chipBorderVerde || "#006b33"),
  };
  const CHIP_CELESTE = {
    background: txt(cfg.chipBgCeleste || "#7dd3fc"),
    color: txt(cfg.chipTextCeleste || "#0c4a6e"),
    borderColor: txt(cfg.chipBorderCeleste || "#38bdf8"),
  };
  const CHIP_ORANGE = {
    background: txt(cfg.chipBgArancione || "#ff6400"),
    color: txt(cfg.chipTextArancione || "#ffffff"),
    borderColor: txt(cfg.chipBorderArancione || "#cc5000"),
  };
  const CHIP_RED = {
    background: txt(cfg.chipBgRosso || "#dc2626"),
    color: txt(cfg.chipTextRosso || "#ffffff"),
    borderColor: txt(cfg.chipBorderRosso || "#991b1b"),
  };
  const CHIP_LILAC = {
    background: txt(cfg.chipBgLilla || "#faf5ff"),
    color: txt(cfg.chipTextLilla || "#6b21a8"),
    borderColor: txt(cfg.chipBorderLilla || "#d8b4fe"),
  };
  const CHIP_PURPLE = {
    background: txt(cfg.chipBgViola || "#ede9fe"),
    color: txt(cfg.chipTextViola || "#4c1d95"),
    borderColor: txt(cfg.chipBorderViola || "#a78bfa"),
  };
  const CHIP_NEUTRAL = {
    background: txt(cfg.chipBgNeutro || "#f2f2f2"),
    color: txt(cfg.chipTextNeutro || "#333333"),
    borderColor: txt(cfg.chipBorderNeutro || "#d0d0d0"),
  };

  const getChipStyleByLabel = (label: string) => {
    const l = String(label || "").toLowerCase();
    // La chip deve rappresentare solo lo stato operativo corrente.
    // L'eventuale approvazione resta informazione dell'Oggetto: non deve
    // cambiare colore dopo il caricamento asincrono del log, altrimenti
    // l'utente vede prima "Trasmesso" blu e poi verde.
    if (l.startsWith("da prendere")) return CHIP_YELLOW;
    if (l.startsWith("in carico")) return CHIP_CELESTE;
    if (l.startsWith("rimandato")) return CHIP_ORANGE;
    if (l.startsWith("trasmesso")) return CHIP_BLUE;
    if (l.startsWith("assegnato")) return CHIP_BLUE;
    if (l.startsWith("respint")) return CHIP_RED;
    return CHIP_NEUTRAL;
  };

  const getOggettoAccentColor = (oggetto: string): string => {
    const o = normalizeOggettoLabel(oggetto);
    if (!oggettoBadgeEnabled || !o || o === "—") return "transparent";
    if (o.includes("RESPINTA"))
      return txt(cfg.oggettoBadgeColorRespingimento || CHIP_RED.background);
    if (o.includes("NOTIFIC"))
      return txt(
        cfg.oggettoBadgeColorNotifica ||
          cfg.oggettoBadgeColorApprovazione ||
          CHIP_GREEN.background,
      );
    if (o.includes("ISTRUTTORIA TECNICA APPROVATA"))
      return txt(
        cfg.oggettoBadgeColorApprovazioneTecnica ||
          cfg.oggettoBadgeColorApprovazione ||
          CHIP_GREEN.background,
      );
    if (
      o.includes("SANZIONE APPROVATA") ||
      o.includes("ISTRUTTORIA AMMINISTRATIVA APPROVATA")
    )
      return txt(
        cfg.oggettoBadgeColorApprovazioneAmministrativa ||
          cfg.oggettoBadgeColorApprovazione ||
          CHIP_GREEN.background,
      );
    if (o.includes("APPROVATA"))
      return txt(
        cfg.oggettoBadgeColorApprovazioneAmministrativa ||
          cfg.oggettoBadgeColorApprovazione ||
          CHIP_GREEN.background,
      );
    if (o.includes("INTEGRAZIONE"))
      return txt(cfg.oggettoBadgeColorIntegrazione || CHIP_ORANGE.background);
    if (o === "ASSEGNAZIONE ISTRUTTORIA")
      return txt(cfg.oggettoBadgeColorAssegnazione || CHIP_BLUE.background);
    if (o === "TRASMISSIONE ISTRUTTORIA" || o === "TRASMISSIONE BOZZA DETERMINAZIONE" || o === "TRASMISSIONE PRATICA CON BOZZA DETERMINAZIONE" || o === "BOZZA DI DETERMINAZIONE TRASMESSA" || o === "ATTESTAZIONE DI CONFORMITÀ")
      return txt(cfg.oggettoBadgeColorTrasmissione || CHIP_PURPLE.background);
    if (o === "NUOVA RILEVAZIONE")
      return txt(
        cfg.oggettoBadgeColorNuovaRilevazione || CHIP_CELESTE.background,
      );
    return txt(
      cfg.oggettoBadgeColorNeutro || CHIP_NEUTRAL.borderColor || "#d0d0d0",
    );
  };

  const getOggettoLegendDescription = (oggetto: string): string => {
    const o = normalizeOggettoLabel(oggetto);
    if (o === "NUOVA RILEVAZIONE")
      return "Il colore identifica una nuova rilevazione, creata dal Tecnico istruttore o inviata dal Tecnico rilevatore, non ancora trasformata in rapporto tecnico ufficiale.";
    if (o === "ASSEGNAZIONE ISTRUTTORIA")
      return "Il colore identifica l’assegnazione della pratica al Tecnico istruttore incaricato della compilazione.";
    if (o === "TRASMISSIONE ISTRUTTORIA")
      return "Il colore identifica la trasmissione dell’istruttoria al ruolo successivo del procedimento.";
    if (o === "TRASMISSIONE BOZZA DETERMINAZIONE" || o === "TRASMISSIONE PRATICA CON BOZZA DETERMINAZIONE")
      return "Il colore identifica la trasmissione della pratica, contenente la bozza Word della determinazione, al Responsabile dell’istruttoria amministrativa per la verifica.";
    if (o === "BOZZA DI DETERMINAZIONE TRASMESSA")
      return "Il colore identifica la trasmissione della bozza di determinazione al Direttore Area AA. GG. e P.F. fuori dal flusso interno del gestionale.";
    if (o === "ATTESTAZIONE DI CONFORMITÀ")
      return "Il colore identifica l’apposizione del visto di conformità da parte del Tecnico istruttore amministrativo e la trasmissione della pratica al Responsabile dell’istruttoria amministrativa.";
    if (o === "ISTRUTTORIA AMMINISTRATIVA APPROVATA")
      return "Il colore identifica l’approvazione dell’istruttoria amministrativa da parte del Responsabile dell’istruttoria amministrativa e la restituzione della pratica al Tecnico istruttore amministrativo per protocollazione e predisposizione della bozza di determinazione.";
    if (o === "RICHIESTA DI INTEGRAZIONE")
      return "Il colore identifica una richiesta di integrazione rivolta al ruolo che deve completare o correggere la pratica.";
    if (o === "TRASMISSIONE INTEGRAZIONE")
      return "Il colore identifica la ritrasmissione della pratica dopo il completamento dell’integrazione richiesta.";
    if (o.includes("ISTRUTTORIA TECNICA APPROVATA"))
      return "Il colore identifica l’approvazione dell’istruttoria tecnica da parte del Direttore dell’Area tecnica competente.";
    if (o.includes("SANZIONE APPROVATA") || o.includes("ISTRUTTORIA AMMINISTRATIVA APPROVATA"))
      return "Il colore identifica l’approvazione della fase amministrativa o della sanzione.";
    if (o.includes("NOTIFIC"))
      return "Il colore identifica l’avvenuta notifica dell’atto amministrativo.";
    if (o.includes("RESPINTA"))
      return "Il colore identifica una rilevazione, un’istruttoria o una sanzione respinta.";
    return "Il colore identifica l’oggetto dell’ultimo evento registrato per la pratica.";
  };

  const showOggettoLegend = (
    target: HTMLElement,
    oggetto: string,
    color: string,
    autoClose = false,
  ) => {
    if (oggettoLegendTouchTimerRef.current != null) {
      window.clearTimeout(oggettoLegendTouchTimerRef.current);
      oggettoLegendTouchTimerRef.current = null;
    }
    const rect = target.getBoundingClientRect();
    setOggettoLegendInfo({
      label: normalizeOggettoLabel(oggetto),
      description: getOggettoLegendDescription(oggetto),
      color,
      x: rect.right + 10,
      y: rect.top,
    });
    if (autoClose) {
      oggettoLegendTouchTimerRef.current = window.setTimeout(() => {
        setOggettoLegendInfo(null);
        oggettoLegendTouchTimerRef.current = null;
      }, 4000);
    }
  };

  const hideOggettoLegend = () => {
    if (oggettoLegendTouchTimerRef.current != null) {
      window.clearTimeout(oggettoLegendTouchTimerRef.current);
      oggettoLegendTouchTimerRef.current = null;
    }
    setOggettoLegendInfo(null);
  };

  const getOggettoAccentStyle = (oggetto: string): any => ({
    "--gii-object-accent": getOggettoAccentColor(oggetto),
    "--gii-object-accent-width": `${oggettoBadgeEnabled ? oggettoBadgeWidth : 0}px`,
    "--gii-object-accent-opacity": oggettoBadgeOpacity,
  });

  // Mantenuta per compatibilità con eventuali usi interni residui
  const getChipStyle = (statoNum: number | null) => {
    if (statoNum === statoDaPrendere) return CHIP_YELLOW;
    if (statoNum === statoPresa) return CHIP_CELESTE;
    if (statoNum === statoIntegrazione) return CHIP_ORANGE;
    if (statoNum === statoApprovata) return CHIP_GREEN;
    if (statoNum === statoRespinta) return CHIP_RED;
    return CHIP_NEUTRAL;
  };

  // converte esito (1..3) in "stato visuale" per chip (3/4/5)
  const statoNumFromEsito = (esito: number): number => {
    if (esito === esitoIntegrazione) return statoIntegrazione;
    if (esito === esitoApprovata) return statoApprovata;
    if (esito === esitoRespinta) return statoRespinta;
    return statoApprovata;
  };

  // Verifica se un ruolo ha dati workflow realmente attivi.
  // Attenzione: nei campi stato_* il valore 0 significa "Non attivo" e non deve
  // far considerare quel ruolo come nodo corrente. Questo era il motivo per cui,
  // dopo la presa in carico di RI_AMM, un vecchio stato_TI_AMM = 0 veniva comunque
  // letto come presenza del nodo TI_AMM e mostrava "In attesa di istruttoria".
  const hasWorkflowValue = (v: any): boolean => {
    if (v === null || v === undefined || v === "") return false;
    if (v === 0 || v === "0") return false;
    return true;
  };

  const hasRuoloData = (d: any, role: string): boolean => {
    const p = d[`presa_in_carico_${role}`];
    const s = d[`stato_${role}`];
    const e = d[`esito_${role}`];
    return hasWorkflowValue(p) || hasWorkflowValue(s) || hasWorkflowValue(e);
  };

  const hasTransmissionProgressWithoutLog = (d: any): boolean => {
    const fields = [
      "ti_assegnato_username",
      "ti_assegnato_user",
      "ti_assegnato",
      "ti_amm_assegnato_username",
      "ti_amm_assegnato_user",
      "ti_amm_assegnato",
      "esito_TI",
      "esito_RZ",
      "esito_RI",
      "esito_DT",
      "esito_RI_AMM",
      "esito_TI_AMM",
      "determinazione_numero",
      "stato_TI",
      "stato_RI",
      "stato_DT",
      "stato_RI_AMM",
      "stato_TI_AMM",
      "determinazione_stato",
    ];
    return fields.some((f) => hasWorkflowValue(pickField(d, f)));
  };

  const shouldUseInitialOggettoFallback = (d: any): boolean => {
    // L'oggetto iniziale e' ammesso solo per pratiche realmente appena nate,
    // cioe' senza log e senza indicatori di trasmissioni/assegnazioni successive.
    // Se la pratica ha gia' avanzato nel workflow ma il LOG non e' ancora
    // disponibile, non inventiamo un oggetto provvisorio: mostriamo '—' finche'
    // arriva il log corretto.
    return !hasTransmissionProgressWithoutLog(d);
  };

  const getRoleLastTouchMs = (d: any, role: string): number | null => {
    const vals = [
      parseToMs(d[`dt_presa_in_carico_${role}`]),
      parseToMs(d[`dt_stato_${role}`]),
      parseToMs(d[`dt_esito_${role}`]),
    ].filter((v): v is number => v !== null);
    return vals.length ? Math.max(...vals) : null;
  };

  // ── Determina se il Rapporto è entrato in fase sanzionatoria ─────────────
  // Indicatore: DT ha approvato e rimandato a RI (esito_DT = ESITO_APPROVATA),
  // oppure il DA ha già ricevuto il verbale.
  // NB: questo threshold è l'unico rilevabile in modo affidabile nel modello dati
  // corrente, dove RI_AMM e TI_AMM condividono i campi nominali con RI e TI.
  const isInFaseSanzionatoria = (d: any): boolean => {
    const meaningful = (v: any) =>
      v !== null && v !== undefined && v !== "" && v !== 0 && v !== "0";
    // Fase sanzionatoria = qualsiasi campo AMM valorizzato
    return (
      meaningful(d["stato_RI_AMM"]) ||
      meaningful(d["esito_RI_AMM"]) ||
      meaningful(d["stato_TI_AMM"]) ||
      meaningful(d["esito_TI_AMM"]) ||
      meaningful(d["determinazione_stato"]) ||
      meaningful(d["determinazione_numero"])
    );
  };

  const isBozzaDeterminazioneTrasmessaRiAmm = (d: any): boolean => {
    const stato = String(pickField(d, "determinazione_stato") ?? "")
      .trim()
      .toUpperCase();
    if (stato === "TRASMESSA_RI_AMM" || stato === "BOZZA_TRASMESSA_RI_AMM") return true;

    // Fallback necessario per le viste elenco che non espongono determinazione_stato:
    // dopo "Trasmetti bozza al Responsabile" il record porta comunque lo stato
    // operativo RI_AMM a 1/2 e chiude il nodo TI_AMM. Il solo visto di conformità,
    // invece, lascia RI_AMM a 4/null e non deve aprire l'attesa del Responsabile.
    const statoRiAmm = readRoleNumber(d, "RI_AMM", "stato");
    const presaRiAmm = readRoleNumber(d, "RI_AMM", "presa");
    const statoTiAmm = readRoleNumber(d, "TI_AMM", "stato");
    const esitoTiAmm = readRoleNumber(d, "TI_AMM", "esito");
    const riAmmOpen =
      statoRiAmm === statoDaPrendere ||
      statoRiAmm === statoPresa ||
      presaRiAmm === presaDaPrendere ||
      presaRiAmm === presaPresa;
    return !!riAmmOpen && esitoTiAmm === esitoApprovata && statoTiAmm === statoApprovata;
  };

  const isDeterminazioneAdottata = (d: any): boolean => {
    const stato = String(pickField(d, "determinazione_stato") ?? "")
      .trim()
      .toUpperCase();
    if (stato === "ADOTTATA") return true;
    const numDet = pickField(d, "determinazione_numero");
    const dataDet = pickField(d, "determinazione_data");
    const hasVal = (v: any) =>
      v !== null && v !== undefined && String(v).trim() !== "" && String(v).trim() !== "0";
    return hasVal(numDet) && hasVal(dataDet);
  };

  const isTiAmmAwaitingRetakeFromRiAmm = (d: any): boolean => {
    if (!d || isDeterminazioneAdottata(d)) return false;

    const esitoRiAmm = readRoleNumber(d, "RI_AMM", "esito");
    const statoRiAmm = readRoleNumber(d, "RI_AMM", "stato");
    const riAmmReturnedToTiAmm =
      esitoRiAmm === esitoApprovata ||
      esitoRiAmm === esitoIntegrazione ||
      statoRiAmm === statoApprovata ||
      statoRiAmm === statoIntegrazione;
    if (!riAmmReturnedToTiAmm) return false;

    const riAmmTimes = [
      parseToMs(pickField(d, "dt_esito_RI_AMM")),
      parseToMs(pickField(d, "dt_stato_RI_AMM")),
    ].filter((v): v is number => v !== null);
    if (!riAmmTimes.length) return false;

    const lastRiAmmMs = Math.max(...riAmmTimes);
    const tiAmmPresaMs = parseToMs(pickField(d, "dt_presa_in_carico_TI_AMM"));
    return tiAmmPresaMs === null || tiAmmPresaMs < lastRiAmmMs;
  };

  const getBozzaDeterminazioneTrasmissionDisplay = (d: any) => {
    const tiAmmUser = String(
      pickField(d, "bozza_determinazione_da") ??
      pickField(d, "ti_amm_assegnato_username") ??
      pickField(d, "ti_amm_assegnato_user") ??
      pickField(d, "ti_amm_assegnato") ??
      "",
    ).trim();
    const riAmmUser = String(
      pickField(d, "ri_amm_assegnato_username") ??
      pickField(d, "RI_AMM_assegnato_username") ??
      pickField(d, "ri_amm_username") ??
      pickField(d, "RI_AMM_username") ??
      "",
    ).trim();
    const dt =
      parseToMs(pickField(d, "dt_stato_RI_AMM")) ??
      parseToMs(pickField(d, "dt_stato_TI_AMM")) ??
      parseToMs(pickField(d, "dt_bozza_determinazione")) ??
      computeUltimoAggMs(d);
    return {
      mittente: formatPersona("TI_AMM", "AMM", "CR", tiAmmUser, utentiMapRef.current),
      destinatario: formatPersonaDest("RI_AMM", "AMM", "CR", riAmmUser, utentiMapRef.current),
      causale: "TRASMISSIONE PRATICA CON BOZZA DETERMINAZIONE",
      dataMs: dt,
      data: dt ? formatDateIt(dt) : "—",
    };
  };

  const computeFaseIstruttoria = (d: any): "Tecnica" | "Amministrativa" => {
    // La fase deve rappresentare il nodo operativo CORRENTE, non il punto piu' avanzato
    // raggiunto storicamente dalla pratica. Quindi, se un rapporto gia' passato dalla
    // fase amministrativa viene rimandato all'area tecnica, deve tornare a risultare
    // in fase Tecnica finche' e' in carico a TI/RZ/RI/DT AGR/TEC.
    const log = getLogForRecord(d);
    const destRole = normalizeWorkflowRole(log?.ruoloDest);
    if (destRole) {
      const destUser = String(log?.utenteDest || "")
        .trim()
        .toLowerCase();
      const destEntry = destUser ? utentiMapRef.current?.get(destUser) : null;
      const destArea = normalizeTextCode(
        destEntry?.areaCod ||
          normalizeAreaCode(destEntry?.area ?? null) ||
          log?.area ||
          "",
      );

      if (
        destRole === "TI_AMM" ||
        destRole === "RI_AMM" ||
        destRole === "DA" ||
        destArea === "AMM"
      ) {
        return "Amministrativa";
      }
      if (
        destRole === "TR" ||
        destRole === "TI" ||
        destRole === "RZ" ||
        destRole === "RI" ||
        destRole === "DT"
      ) {
        return "Tecnica";
      }
    }

    const currentRole = normalizeWorkflowRole(computeSintetico(d)?.ruolo);
    return currentRole === "TI_AMM" ||
      currentRole === "RI_AMM" ||
      currentRole === "DA"
      ? "Amministrativa"
      : "Tecnica";
  };

  // Destinatario di trasmissione positiva per ruolo — dipende dal contesto del record.
  // DT approva e trasmette direttamente a RI_AMM (attiva fase sanzionatoria).
  // RI_AMM punta a TI_AMM in prima assegnazione, a DA dopo che TI_AMM ha restituito.
  // DT approva e trasmette direttamente a RI_AMM (avvia fase sanzionatoria).
  // DA approva e trasmette a TI_AMM (per verbale/PEC).
  const getFwdDest = (role: string, d: any): string => {
    switch (role) {
      case "TI":
        return "RZ";
      case "RZ":
        return "RI";
      case "RI":
        return "DT";
      case "DT":
        return "RI_AMM";
      case "RI_AMM":
        return isBozzaDeterminazioneTrasmessaRiAmm(d) ? "TI_AMM" : "";
      case "TI_AMM":
        return isBozzaDeterminazioneTrasmessaRiAmm(d) ? "RI_AMM" : "";
      case "DA":
        return "TI_AMM";
      default:
        return "";
    }
  };

  // Destinatario di richiesta integrazioni per ruolo
  const getIntegDest = (role: string): string => {
    switch (role) {
      case "RZ":
        return "TI";
      case "RI":
        return "TI";
      case "DT":
        return "RI";
      case "RI_AMM":
        return "RI";
      case "TI_AMM":
        return "RI_AMM";
      case "DA":
        return "RI_AMM";
      default:
        return "";
    }
  };

  // Calcola lo stato storico di un ruolo specifico su questo record.
  // Restituisce null se il ruolo non ha ancora dati (non è ancora stato coinvolto).
  const computeStatoStorico = (
    d: any,
    ruolo: string,
  ): { label: string; statoForChip: number | null } | null => {
    if (!hasRuoloData(d, ruolo)) return null;
    const presaRaw = d[`presa_in_carico_${ruolo}`];
    const statoRaw = d[`stato_${ruolo}`];
    const esitoRaw = d[`esito_${ruolo}`];
    const presaNum =
      presaRaw !== null && presaRaw !== undefined && presaRaw !== ""
        ? Number(presaRaw)
        : null;
    const statoNum =
      statoRaw !== null && statoRaw !== undefined && statoRaw !== ""
        ? Number(statoRaw)
        : null;
    const esitoNum =
      esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== ""
        ? Number(esitoRaw)
        : null;

    if (esitoNum !== null && Number.isFinite(esitoNum)) {
      if (esitoNum === esitoApprovata) {
        if (ruolo === "DT")
          return { label: "Trasmesso", statoForChip: statoApprovata };
        if (ruolo === "DA")
          return { label: "Trasmesso", statoForChip: statoApprovata };
        if (ruolo === "TI_AMM" && !isBozzaDeterminazioneTrasmessaRiAmm(d)) {
          return { label: "In carico", statoForChip: statoPresa };
        }
        const dest = getFwdDest(ruolo, d);
        if (dest) return { label: "Trasmesso", statoForChip: statoApprovata };
      }
      if (esitoNum === esitoIntegrazione) {
        const dest = getIntegDest(ruolo);
        return { label: "Rimandato", statoForChip: statoIntegrazione };
      }
      if (esitoNum === esitoRespinta) {
        return { label: "Respinto", statoForChip: statoRespinta };
      }
      return { label: "—", statoForChip: null };
    }
    if (statoNum !== null && Number.isFinite(statoNum)) {
      if (statoNum === statoDaPrendere)
        return { label: "Trasmesso", statoForChip: statoDaPrendere };
      if (statoNum === statoPresa)
        return { label: "In carico", statoForChip: statoPresa };
      if (statoNum === statoApprovata) {
        if (ruolo === "DT")
          return { label: "Trasmesso", statoForChip: statoApprovata };
        if (ruolo === "DA")
          return { label: "Trasmesso", statoForChip: statoApprovata };
        const dest = getFwdDest(ruolo, d);
        if (dest) return { label: "Trasmesso", statoForChip: statoApprovata };
        return { label: "Trasmesso", statoForChip: statoApprovata };
      }
      if (statoNum === statoIntegrazione)
        return { label: "Rimandato", statoForChip: statoIntegrazione };
      if (statoNum === statoRespinta)
        return { label: "Respinto", statoForChip: statoRespinta };
      return { label: "—", statoForChip: null };
    }
    if (presaNum !== null && Number.isFinite(presaNum)) {
      if (presaNum === presaDaPrendere)
        return { label: "Trasmesso", statoForChip: statoDaPrendere };
      if (presaNum === presaPresa)
        return { label: "In carico", statoForChip: statoPresa };
    }
    return { label: "In carico", statoForChip: null };
  };

  const getTiIstruttoriaInfo = (d: any) => {
    const tiUser = String(
      d["ti_assegnato_username"] ??
        d["ti_assegnato_user"] ??
        d["ti_assegnato"] ??
        "",
    ).trim();
    const higherTouched =
      hasRuoloData(d, "RI") || hasRuoloData(d, "DT") || hasRuoloData(d, "DA");

    const statoTiRaw = d["stato_TI"] ?? d["stato_ti"];
    const presaTiRaw = d["presa_in_carico_TI"] ?? d["presa_in_carico_ti"];
    const esitoTiRaw = d["esito_TI"] ?? d["esito_ti"];

    const statoTiNum =
      statoTiRaw !== null && statoTiRaw !== undefined && statoTiRaw !== ""
        ? Number(statoTiRaw)
        : null;
    const presaTiNum =
      presaTiRaw !== null && presaTiRaw !== undefined && presaTiRaw !== ""
        ? Number(presaTiRaw)
        : null;
    const esitoTiNum =
      esitoTiRaw !== null && esitoTiRaw !== undefined && esitoTiRaw !== ""
        ? Number(esitoTiRaw)
        : null;

    const tiReturned =
      (esitoTiNum !== null && Number.isFinite(esitoTiNum)) ||
      statoTiNum === statoApprovata ||
      statoTiNum === statoRespinta;

    const tiLastTouchMs = getRoleLastTouchMs(d, "TI");
    const rzLastTouchMs = getRoleLastTouchMs(d, "RZ");
    const awaitingRetakeByRz =
      !!tiUser &&
      tiReturned &&
      !higherTouched &&
      tiLastTouchMs !== null &&
      (rzLastTouchMs === null || rzLastTouchMs <= tiLastTouchMs);

    return {
      hasAssignedTi: !!tiUser,
      tiUser,
      higherTouched,
      statoTiNum,
      presaTiNum,
      esitoTiNum,
      tiReturned,
      tiLastTouchMs,
      rzLastTouchMs,
      awaitingRetakeByRz,
      isInTiIstruttoria: !!tiUser && !higherTouched && !tiReturned,
    };
  };

  // ── computeSintetico: workflow-aware su tutti i ruoli ──────────────────────
  //
  // Logica:
  //   - Scansiona i ruoli dal più avanzato (DA) al meno avanzato (TR)
  //   - Il primo ruolo con dati valorizzati è il "nodo corrente"
  //   - presa=1 (DA PRENDERE) → il Rapporto è stato trasmesso ma non ancora preso in carico
  //     → "Trasmesso a [ruolo]"  chip arancio
  //   - presa=2 (PRESA) o stato=presa → il ruolo ci sta lavorando
  //     → "Preso in carico [ruolo]"  chip verde
  //
  // Rapporti senza nessun campo workflow:
  //   origine=1 (TR) → implicitamente trasmesso a RZ → "Da prendere in carico RZ"  chip arancio
  //   origine=2 (TI) → TI l'ha creato, non ancora trasmesso → "Da trasmettere a RZ"  chip verde

  const computeSintetico = (
    d: any,
  ): { ruolo: string; label: string; statoForChip: number | null } => {
    const bozzaTrasmessaRiAmm = isBozzaDeterminazioneTrasmessaRiAmm(d);
    const statoRiAmm = readRoleNumber(d, "RI_AMM", "stato");
    const presaRiAmm = readRoleNumber(d, "RI_AMM", "presa");
    if (bozzaTrasmessaRiAmm && (statoRiAmm === null || statoRiAmm === statoDaPrendere || presaRiAmm === presaDaPrendere)) {
      return { ruolo: "RI_AMM", label: "Da prendere in carico", statoForChip: statoDaPrendere };
    }
    if (bozzaTrasmessaRiAmm && (statoRiAmm === statoPresa || presaRiAmm === presaPresa)) {
      return { ruolo: "RI_AMM", label: "In carico", statoForChip: statoPresa };
    }

    const scanOrder = ["DA", "TI_AMM", "RI_AMM", "DT", "RI", "RZ", "TI", "TR"];

    // Caso speciale: assegnazione RZ -> TI.
    // Finche' TI non "restituisce" la pratica, lo stato sintetico segue
    // le voci del file xlsx sul tratto RZ -> TI.
    const tiInfo = getTiIstruttoriaInfo(d);
    if (tiInfo.awaitingRetakeByRz) {
      return { ruolo: "RZ", label: "Trasmesso", statoForChip: statoDaPrendere };
    }
    if (tiInfo.hasAssignedTi && tiInfo.isInTiIstruttoria) {
      // TI origine=2 che non ha ancora trasmesso a RZ → "Da trasmettere"
      const opRaw = d["origine_pratica"];
      const isOrigineTi = opRaw === 2 || opRaw === "2";
      const rzNeverTouched = !hasRuoloData(d, "RZ");
      if (isOrigineTi && rzNeverTouched) {
        return { ruolo: "TI", label: "In carico", statoForChip: statoPresa };
      }
      if (tiInfo.statoTiNum !== null && Number.isFinite(tiInfo.statoTiNum)) {
        if (tiInfo.statoTiNum === statoDaPrendere) {
          return {
            ruolo: "TI",
            label: "Da prendere in carico",
            statoForChip: statoDaPrendere,
          };
        }
        if (tiInfo.statoTiNum === statoPresa) {
          return { ruolo: "TI", label: "In carico", statoForChip: statoPresa };
        }
        return { ruolo: "TI", label: "In carico", statoForChip: null };
      }
      if (tiInfo.presaTiNum !== null && Number.isFinite(tiInfo.presaTiNum)) {
        if (tiInfo.presaTiNum === presaDaPrendere) {
          return {
            ruolo: "TI",
            label: "Da prendere in carico",
            statoForChip: statoDaPrendere,
          };
        }
        if (tiInfo.presaTiNum === presaPresa) {
          return { ruolo: "TI", label: "In carico", statoForChip: statoPresa };
        }
      }
      return { ruolo: "TI", label: "Trasmesso", statoForChip: statoDaPrendere };
    }

    // fwdDest e integDest sono ora funzioni dinamiche (dipendono dal record d)

    for (const role of scanOrder) {
      if (!hasRuoloData(d, role)) continue;

      const presaRaw = d[`presa_in_carico_${role}`];
      const statoRaw = d[`stato_${role}`];
      const esitoRaw = d[`esito_${role}`];

      const presaNum =
        presaRaw !== null && presaRaw !== undefined && presaRaw !== ""
          ? Number(presaRaw)
          : null;
      const statoNum =
        statoRaw !== null && statoRaw !== undefined && statoRaw !== ""
          ? Number(statoRaw)
          : null;
      const esitoNum =
        esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== ""
          ? Number(esitoRaw)
          : null;

      if (esitoNum !== null && Number.isFinite(esitoNum)) {
        if (esitoNum === esitoApprovata) {
          // Fix F: DT approval → "Approvato" (generic label; displaySintetico overrides per-role)
          if (role === "DT")
            return {
              ruolo: "DT",
              label: "Trasmesso",
              statoForChip: statoApprovata,
            };
          if (role === "DA")
            return {
              ruolo: "DA",
              label: "Trasmesso",
              statoForChip: statoApprovata,
            };
          if (role === "TI_AMM" && !isBozzaDeterminazioneTrasmessaRiAmm(d)) {
            // Il visto TI_AMM da solo resta sul TI_AMM. Se però la vista non
            // espone determinazione_stato ma espone già il nodo RI_AMM aperto,
            // non oscurare il passaggio reale "bozza trasmessa al Responsabile".
            const riAmmStato = readRoleNumber(d, "RI_AMM", "stato");
            const riAmmPresa = readRoleNumber(d, "RI_AMM", "presa");
            if (riAmmStato === statoDaPrendere || riAmmPresa === presaDaPrendere) {
              return { ruolo: "RI_AMM", label: "Da prendere in carico", statoForChip: statoDaPrendere };
            }
            if (riAmmStato === statoPresa || riAmmPresa === presaPresa) {
              return { ruolo: "RI_AMM", label: "In carico", statoForChip: statoPresa };
            }
            return { ruolo: "TI_AMM", label: "In carico", statoForChip: statoPresa };
          }
          const dest = getFwdDest(role, d);
          if (dest) {
            if (hasRuoloData(d, dest)) {
              // Fix E: se il ruolo corrente è stato riattivato (stato=DA_PRENDERE/PRESA),
              // significa un nuovo ciclo — esito è vecchio, non fare continue
              if (statoNum === statoDaPrendere)
                return {
                  ruolo: role,
                  label: "Trasmesso",
                  statoForChip: statoDaPrendere,
                };
              if (statoNum === statoPresa)
                return {
                  ruolo: role,
                  label: "In carico",
                  statoForChip: statoPresa,
                };
              continue;
            }
            return {
              ruolo: dest,
              label: "Trasmesso",
              statoForChip: statoDaPrendere,
            };
          }
        }
        if (esitoNum === esitoIntegrazione) {
          const dest = getIntegDest(role);
          if (dest) {
            const destEsitoRaw = d[`esito_${dest}`];
            const destEsitoNum =
              destEsitoRaw !== null &&
              destEsitoRaw !== undefined &&
              destEsitoRaw !== ""
                ? Number(destEsitoRaw)
                : null;
            if (destEsitoNum == null) {
              if (hasRuoloData(d, dest)) {
                const destStatoRaw = d[`stato_${dest}`];
                const destStatoNum =
                  destStatoRaw !== null &&
                  destStatoRaw !== undefined &&
                  destStatoRaw !== ""
                    ? Number(destStatoRaw)
                    : null;
                if (destStatoNum === statoDaPrendere)
                  return {
                    ruolo: dest,
                    label: "Trasmesso",
                    statoForChip: statoDaPrendere,
                  };
                if (destStatoNum === statoPresa)
                  return {
                    ruolo: dest,
                    label: "In carico",
                    statoForChip: statoPresa,
                  };
              }
              return {
                ruolo: dest,
                label: "Trasmesso",
                statoForChip: statoDaPrendere,
              };
            }
            // Fix E: dest ha risposto, ma se il ruolo corrente è stato riattivato, non continuare
            if (statoNum === statoDaPrendere)
              return {
                ruolo: role,
                label: "Trasmesso",
                statoForChip: statoDaPrendere,
              };
            if (statoNum === statoPresa)
              return {
                ruolo: role,
                label: "In carico",
                statoForChip: statoPresa,
              };
            continue;
          }
        }
        return { ruolo: role, label: "—", statoForChip: null };
      }

      if (statoNum !== null && Number.isFinite(statoNum)) {
        if (statoNum === statoDaPrendere) {
          return {
            ruolo: role,
            label: "Trasmesso",
            statoForChip: statoDaPrendere,
          };
        }
        if (statoNum === statoPresa) {
          return { ruolo: role, label: "In carico", statoForChip: statoPresa };
        }
        if (statoNum === statoApprovata) {
          const dest = getFwdDest(role, d);
          if (dest) {
            if (hasRuoloData(d, dest)) continue;
            return {
              ruolo: dest,
              label: "Trasmesso",
              statoForChip: statoDaPrendere,
            };
          }
        }
        if (statoNum === statoIntegrazione) {
          return {
            ruolo: role,
            label: "Rimandato",
            statoForChip: statoIntegrazione,
          };
        }
        if (statoNum === statoRespinta) {
          return {
            ruolo: role,
            label: "Respinto",
            statoForChip: statoRespinta,
          };
        }
        return { ruolo: role, label: "—", statoForChip: null };
      }

      if (presaNum !== null && Number.isFinite(presaNum)) {
        if (presaNum === presaDaPrendere) {
          return {
            ruolo: role,
            label: "Trasmesso",
            statoForChip: statoDaPrendere,
          };
        }
        if (presaNum === presaPresa) {
          return { ruolo: role, label: "In carico", statoForChip: statoPresa };
        }
      }

      // Ha dati ma valore non riconosciuto
      return { ruolo: role, label: "In carico", statoForChip: null };
    }

    // Nessun campo workflow → Rapporto appena creato
    const op = d["origine_pratica"];
    const opNum =
      op !== null && op !== undefined && op !== "" ? Number(op) : null;
    if (opNum === 2) {
      // TI ha creato il Rapporto, non ancora trasmesso a RZ
      return { ruolo: "TI", label: "In carico", statoForChip: statoPresa };
    }
    // origine=1 (TR) o non valorizzato: implicitamente trasmesso a RZ
    return {
      ruolo: "RZ",
      label: "Da prendere in carico",
      statoForChip: statoDaPrendere,
    };
  };

  function normalizeWorkflowRole(role: any): string {
    const r = String(role || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    if (r === "RI_AMM" || r === "TI_AMM") return r;
    if (r === "DA_AMM") return "DA";
    if (r.startsWith("DT")) return "DT";
    if (r.startsWith("RI") && r !== "RI_AMM") return "RI";
    if (r.startsWith("RZ")) return "RZ";
    if (r.startsWith("TI") && r !== "TI_AMM") return "TI";
    if (r.startsWith("TR")) return "TR";
    if (r.startsWith("DA")) return "DA";
    return r;
  }

  function readRoleNumber(
    d: any,
    role: string,
    kind: "presa" | "stato" | "esito",
  ): number | null {
    const field =
      kind === "presa" ? `presa_in_carico_${role}` : `${kind}_${role}`;
    const v = pickField(d, field);
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function isRapportoRespintoChiuso(d: any): boolean {
    const logEvent = String(getLogForRecord(d)?.evento || "")
      .trim()
      .toUpperCase();
    if (logEvent === "RESPINTA") return true;

    const roles = ["RZ", "DT", "RI", "DA", "RI_AMM", "TI_AMM", "TI", "TR"];
    return roles.some((role) => {
      const statoNum = readRoleNumber(d, role, "stato");
      const esitoNum = readRoleNumber(d, role, "esito");
      return statoNum === statoRespinta || esitoNum === esitoRespinta;
    });
  }

  function isPrimoInvioRilevazioneAlRz(log: LogEntry | null, d: any): boolean {
    if (!log) return false;

    const evento = String(log.evento || "")
      .trim()
      .toUpperCase();
    if (evento !== "ISTRUTTORIA_TRASMESSA") return false;

    const ruolo = normalizeWorkflowRole(log.ruolo);
    const ruoloDest = normalizeWorkflowRole(log.ruoloDest);
    if (ruolo !== "TI" || ruoloDest !== "RZ") return false;

    // Se esiste già il numero ufficiale, la pratica non è più una rilevazione
    // provvisoria e l'invio TI -> RZ va trattato come trasmissione istruttoria.
    if (pickOfficialRapportoNumber(d)) return false;

    // Se l'invio chiude una richiesta di integrazione, deve restare
    // "TRASMISSIONE INTEGRAZIONE", non diventare una nuova rilevazione.
    if (transmissionAnswersIntegration(log)) return false;

    // Il primo invio di una rilevazione creata da TI può avere in storico solo
    // l'eventuale ciclo di CREAZIONE. Se sono presenti assegnazioni, richieste
    // di integrazione o precedenti trasmissioni, non è più il primo arrivo al RZ.
    const history = log.history || [];
    return !history.some((h) => {
      const e = String(h?.evento || "")
        .trim()
        .toUpperCase();
      return e && e !== "CREAZIONE";
    });
  }

  function formatCausaleForLog(log: LogEntry | null, d: any): string {
    if (!log) return "—";
    const evento = String(log.evento || "")
      .trim()
      .toUpperCase();
    let label = "";
    if (evento === "RESPINTA") {
      const ruolo = normalizeWorkflowRole(log.ruolo);
      if (ruolo === "DA") label = "SANZIONE RESPINTA";
      else if (ruolo === "DT") label = "ISTRUTTORIA TECNICA RESPINTA";
      else if (ruolo === "RZ") {
        const tiAssigned = String(
          pickField(d, "ti_assegnato_username") ??
            pickField(d, "ti_assegnato_user") ??
            pickField(d, "ti_assegnato") ??
            "",
        ).trim();
        const tiEsito = readRoleNumber(d, "TI", "esito");
        // RZ può respingere sia una nuova rilevazione sia una istruttoria già
        // rientrata da TI. L'oggetto deve distinguere i due casi: non usare
        // mai la causale grezza "RESPINTA".
        label =
          tiAssigned || tiEsito !== null
            ? "ISTRUTTORIA TECNICA RESPINTA"
            : "RILEVAZIONE RESPINTA";
      } else {
        label = "ISTRUTTORIA TECNICA RESPINTA";
      }
    } else if (
      evento === "ISTRUTTORIA_TRASMESSA" &&
      transmissionAnswersIntegration(log)
    ) {
      label = "TRASMISSIONE INTEGRAZIONE";
    } else if (isPrimoInvioRilevazioneAlRz(log, d)) {
      label = "NUOVA RILEVAZIONE";
    } else {
      label = formatCausale(evento);
    }
    return normalizeOggettoLabel(label);
  }

  function getStateView(
    role: string,
    label: string,
    statoForChip: number | null,
  ): { ruolo: string; label: string; statoForChip: number | null } {
    return { ruolo: role, label, statoForChip };
  }

  function mapOperationalState(
    role: string,
    statoNum: number | null,
    presaNum: number | null,
    esitoNum: number | null,
  ): { ruolo: string; label: string; statoForChip: number | null } | null {
    // stato_* è il campo portante: se valorizzato a 3/4/5 non deve essere
    // oscurato da una vecchia presa_in_carico_* = 2 rimasta storicamente attiva.
    if (statoNum === statoDaPrendere)
      return getStateView(role, "Da prendere in carico", statoDaPrendere);
    if (statoNum === statoPresa)
      return getStateView(role, "In carico", statoPresa);
    if (statoNum === statoIntegrazione)
      return getStateView(role, "Rimandato", statoIntegrazione);
    if (statoNum === statoApprovata)
      return getStateView(role, "Trasmesso", statoApprovata);
    if (statoNum === statoRespinta)
      return getStateView(role, "Respinto", statoRespinta);

    if (esitoNum === esitoIntegrazione)
      return getStateView(role, "Rimandato", statoIntegrazione);
    if (esitoNum === esitoApprovata)
      return getStateView(role, "Trasmesso", statoApprovata);
    if (esitoNum === esitoRespinta)
      return getStateView(role, "Respinto", statoRespinta);

    if (presaNum === presaDaPrendere)
      return getStateView(role, "Da prendere in carico", statoDaPrendere);
    if (presaNum === presaPresa)
      return getStateView(role, "In carico", statoPresa);
    return null;
  }

  function computeMioStato(
    d: any,
    roleRaw: string,
  ): { ruolo: string; label: string; statoForChip: number | null } {
    const role = normalizeWorkflowRole(roleRaw);
    if (!role) return computeSintetico(d);

    const log = getLogForRecord(d);
    const logRole = normalizeWorkflowRole(log?.ruolo);
    const logDest = normalizeWorkflowRole(log?.ruoloDest);
    const logEvent = String(log?.evento || "")
      .trim()
      .toUpperCase();

    const statoNum = readRoleNumber(d, role, "stato");
    const presaNum = readRoleNumber(d, role, "presa");
    const esitoNum = readRoleNumber(d, role, "esito");

    const bozzaTrasmessaRiAmm = isBozzaDeterminazioneTrasmessaRiAmm(d);
    if (role === "TI_AMM" && isTiAmmAwaitingRetakeFromRiAmm(d)) {
      return getStateView(role, "Da prendere in carico", statoDaPrendere);
    }
    if (role === "RI_AMM" && (statoNum === statoDaPrendere || presaNum === statoDaPrendere)) {
      return getStateView(role, "Da prendere in carico", statoDaPrendere);
    }
    if (role === "RI_AMM" && (statoNum === statoPresa || presaNum === statoPresa)) {
      return getStateView(role, "In carico", statoPresa);
    }
    const vistoTiAmmSenzaBozzaTrasmessa =
      !bozzaTrasmessaRiAmm &&
      role === "RI_AMM" &&
      readRoleNumber(d, "TI_AMM", "esito") === esitoApprovata;
    if (vistoTiAmmSenzaBozzaTrasmessa) {
      return getStateView(role, "Trasmesso", statoApprovata);
    }
    if (bozzaTrasmessaRiAmm && role === "RI_AMM" && (statoNum === null || statoNum === statoDaPrendere)) {
      return getStateView(role, "Da prendere in carico", statoDaPrendere);
    }
    // La bozza trasmessa al Responsabile dell'istruttoria amministrativa vale come
    // stato storico del TI_AMM solo finché il nodo TI_AMM non viene riaperto.
    // Dopo un rimando RI_AMM → TI_AMM, infatti, stato_TI_AMM torna a 1/2 e deve
    // prevalere sul determinazione_stato rimasto TRASMESSA_RI_AMM.
    if (bozzaTrasmessaRiAmm && role === "TI_AMM" && statoNum !== statoDaPrendere && statoNum !== statoPresa) {
      return getStateView(role, "Trasmesso", statoApprovata);
    }
    // Il visto TI_AMM è un passaggio interno alla scheda amministrativa:
    // non trasferisce la pratica al RI_AMM finché non viene trasmessa anche la bozza.
    if (!bozzaTrasmessaRiAmm && role === "TI_AMM" && esitoNum === esitoApprovata) {
      return getStateView(role, "In carico", statoPresa);
    }

    // Ultima trasmissione partita dal mio ruolo: lo stato è mio, l'oggetto
    // racconta la causale e Da/A raccontano il percorso.
    if (log && logRole === role && logDest && logDest !== role) {
      if (
        logEvent === "NUOVA_ASSEGNAZIONE" &&
        (logDest === "TI" || logDest === "TI_AMM")
      ) {
        return getStateView(
          role,
          logDest === "TI_AMM" ? "Assegnato a TI-AMM" : "Assegnato a TI",
          statoApprovata,
        );
      }
      if (logEvent === "INTEGRAZIONE_RICHIESTA")
        return getStateView(role, "Rimandato", statoIntegrazione);
      if (
        logEvent === "ISTRUTTORIA_TRASMESSA" ||
        logEvent === "INTEGRAZIONE_TRASMESSA" ||
        logEvent === "RAPPORTO_APPROVATO" ||
        logEvent === "SANZIONE_APPROVATA" ||
        logEvent === "RESTITUZIONE_A_TI_AMM" ||
        logEvent === "RIMANDA_A_DT" ||
        logEvent === "ATTESTAZIONE_CONFORMITA" ||
        logEvent === "PROPOSTA_CONTESTAZIONE_APPROVATA"
      ) {
        return getStateView(role, "Trasmesso", statoApprovata);
      }
      if (logEvent === "RESPINTA")
        return getStateView(role, "Respinto", statoRespinta);
    }

    // Casi di assegnazione RZ → TI senza esito_RZ: il nodo TI è attivo ma
    // per RZ deve leggersi come "Assegnato a TI", non come "In carico".
    if (role === "RZ") {
      const tiInfo = getTiIstruttoriaInfo(d);
      if (
        tiInfo.hasAssignedTi &&
        tiInfo.isInTiIstruttoria &&
        !hasRuoloData(d, "RI") &&
        !hasRuoloData(d, "DT") &&
        !hasRuoloData(d, "DA")
      ) {
        return getStateView("RZ", "Assegnato a TI", statoApprovata);
      }
    }

    const mapped = mapOperationalState(role, statoNum, presaNum, esitoNum);
    if (mapped) return mapped;

    // Se l'ultimo messaggio è diretto al mio ruolo ma i campi stato/presa non
    // sono ancora leggibili, la vista operativa deve comunque indicare che la
    // pratica è da prendere in carico, non ricadere in vecchi fallback generici.
    if (log && logDest === role && logRole !== role) {
      return getStateView(role, "Da prendere in carico", statoDaPrendere);
    }

    const sint = computeSintetico(d);
    if (normalizeWorkflowRole(sint.ruolo) === role) {
      if (sint.statoForChip === statoDaPrendere)
        return getStateView(role, "Da prendere in carico", statoDaPrendere);
      if (sint.statoForChip === statoPresa)
        return getStateView(role, "In carico", statoPresa);
      if (sint.statoForChip === statoIntegrazione)
        return getStateView(role, "Rimandato", statoIntegrazione);
      if (sint.statoForChip === statoApprovata)
        return getStateView(role, "Trasmesso", statoApprovata);
      if (sint.statoForChip === statoRespinta)
        return getStateView(role, "Respinto", statoRespinta);
      return { ...sint, ruolo: role };
    }

    const storico = computeStatoStorico(d, role);
    if (storico) {
      if (storico.statoForChip === statoDaPrendere)
        return getStateView(role, "Da prendere in carico", statoDaPrendere);
      if (storico.statoForChip === statoPresa)
        return getStateView(role, "In carico", statoPresa);
      if (storico.statoForChip === statoIntegrazione)
        return getStateView(role, "Rimandato", statoIntegrazione);
      if (storico.statoForChip === statoApprovata)
        return getStateView(role, "Trasmesso", statoApprovata);
      if (storico.statoForChip === statoRespinta)
        return getStateView(role, "Respinto", statoRespinta);
      return { ruolo: role, ...storico };
    }

    return {
      ruolo: sint.ruolo,
      label: "—",
      statoForChip: null,
    };
  }

  function computeDisplaySintetico(d: any): {
    ruolo: string;
    label: string;
    statoForChip: number | null;
  } {
    const view =
      !giiUser || giiUser.isAdmin
        ? computeSintetico(d)
        : (() => {
            const myRole = getEffectiveRole(
              giiUser.ruoloLabel || "",
              giiUser.area,
            );
            return myRole ? computeMioStato(d, myRole) : computeSintetico(d);
          })();
    return normalizeMioStatoView(view);
  }

  // ── computeUltimoAggMs: considera timestamp workflow/log e, per le nuove rilevazioni, la data di invio ──────────────
  const computeUltimoAggMs = (d: any): number | null => {
    const roles = ["TR", "TI", "RZ", "RI", "DT", "DA", "RI_AMM", "TI_AMM"];
    const candidates: number[] = [];
    for (const role of roles) {
      const p = parseToMs(pickField(d, `dt_presa_in_carico_${role}`));
      const s = parseToMs(pickField(d, `dt_stato_${role}`));
      const e = parseToMs(pickField(d, `dt_esito_${role}`));
      if (p !== null) candidates.push(p);
      if (s !== null) candidates.push(s);
      if (e !== null) candidates.push(e);
    }

    const logDt = getLogForRecord(d)?.dt;
    if (logDt != null && Number.isFinite(Number(logDt)))
      candidates.push(Number(logDt));

    // Le rilevazioni appena inviate da Survey/TR possono non avere ancora un log
    // e, a seconda della vista, possono non esporre i timestamp di stato. In quel
    // caso l'ultimo aggiornamento deve comunque coincidere con la rilevazione/invio,
    // altrimenti la colonna resta vuota e l'ordinamento cronologico le porta in fondo.
    if (candidates.length === 0) {
      const rilMs = pickRilevazioneDateMs(d, fieldDataRil);
      if (rilMs !== null) candidates.push(rilMs);
    }

    if (candidates.length === 0) {
      const fallbackFields = [
        "EditDate",
        "editDate",
        "editdate",
        "EDITDATE",
        "CreationDate",
        "creationDate",
        "creationdate",
        "CREATIONDATE",
        "end",
        "End",
        "END",
        "start",
        "Start",
        "START",
      ];
      for (const name of fallbackFields) {
        const ms = parseToMs(pickField(d, name));
        if (ms !== null) candidates.push(ms);
      }
    }

    if (candidates.length === 0) return null;
    return Math.max(...candidates);
  };

  const getSortValue = (r: DataRecord, field: string): any => {
    const d = r.getData?.() || {};
    if (field === V_STATO) return computeDisplaySintetico(d).label;
    if (field === V_FASE) return computeFaseIstruttoria(d);
    if (field === V_TIPO_PRATICA) return getTipoPraticaDisplay(r);
    if (field === V_NUMERO_RILEVAZIONE) return getRilevazioneDisplay(r);
    if (field === V_NUMERO_PRATICA) return getNumeroRapportoDisplay(r);
    if (isNumeroAttoVirtualField(field)) return getNumeroVerbaleDisplay(r);
    if (field === V_ULTIMO) return computeUltimoAggMs(d);
    if (field === V_PROSSIMA) {
      if (isBozzaDeterminazioneTrasmessaRiAmm(d)) return getBozzaDeterminazioneTrasmissionDisplay(d).destinatario;
      const log = getLogForRecord(d);
      return log?.ruoloDest
        ? formatPersonaDest(
            log.ruoloDest,
            log.area,
            log.settore,
            log.utenteDest,
            utentiMapRef.current,
          )
        : "";
    }
    if (field === V_MITTENTE) {
      if (isBozzaDeterminazioneTrasmessaRiAmm(d)) return getBozzaDeterminazioneTrasmissionDisplay(d).mittente;
      const log = getLogForRecord(d);
      return log
        ? formatPersona(
            log.ruolo,
            log.area,
            log.settore,
            log.utente,
            utentiMapRef.current,
          )
        : "";
    }
    if (field === V_CAUSALE) {
      if (isBozzaDeterminazioneTrasmessaRiAmm(d)) return getBozzaDeterminazioneTrasmissionDisplay(d).causale;
      const log = getLogForRecord(d);
      return log ? formatCausaleForLog(log, d) : "";
    }
    if (field === V_DATA_MSG) {
      // "Ultimo agg." deve rappresentare l'ultimo movimento effettivo della pratica
      // (presa in carico, rimando, trasmissione, esito), non solo la data del LOG
      // usato per le colonne Stato/Mittente/Destinatario. Altrimenti, se il LOG
      // informativo resta quello di un ciclo precedente, l'ordinamento rimane congelato.
      if (isBozzaDeterminazioneTrasmessaRiAmm(d)) return getBozzaDeterminazioneTrasmissionDisplay(d).dataMs ?? computeUltimoAggMs(d) ?? 0;
      return computeUltimoAggMs(d) ?? 0;
    }
    return d[field];
  };

  const sortRecords = (recs: DataRecord[], sort: SortItem[]): DataRecord[] => {
    if (!sort || sort.length === 0) return recs;
    const copy = [...recs];
    copy.sort((ra, rb) => {
      for (const s of sort) {
        const da = ra.getData?.() || {};
        const db = rb.getData?.() || {};
        const sortFieldLc = String(s.field || "").toLowerCase();
        const rilFieldLc = String(
          fieldDataRil || "data_rilevazione",
        ).toLowerCase();
        const isRilevazioneDateSort =
          sortFieldLc === rilFieldLc || sortFieldLc === "data_rilevazione";
        const a = isRilevazioneDateSort
          ? pickRilevazioneDateMs(da, fieldDataRil)
          : (pickComparableDisplayValue(
              da,
              s.field,
              giiUser?.areaCod || giiUser?.area,
              giiUser?.settoreCod || giiUser?.settore,
              domainLabels,
            ) ?? getSortValue(ra, s.field));
        const b = isRilevazioneDateSort
          ? pickRilevazioneDateMs(db, fieldDataRil)
          : (pickComparableDisplayValue(
              db,
              s.field,
              giiUser?.areaCod || giiUser?.area,
              giiUser?.settoreCod || giiUser?.settore,
              domainLabels,
            ) ?? getSortValue(rb, s.field));
        const cmp = compareValues(a, b);
        if (cmp !== 0) return s.dir === "ASC" ? cmp : -cmp;
      }
      return 0;
    });
    return copy;
  };

  const passesIntegratedFilters = React.useCallback(
    (r: DataRecord): boolean => {
      const d = r.getData?.() || {};
      const q = normalizeSearchText(searchFilter);
      const areaCode = getAreaCodeFromRecord(
        d,
        giiUser?.areaCod || giiUser?.area,
      );
      const settoreCode = getSettoreCodeFromRecord(
        d,
        giiUser?.settoreCod || giiUser?.settore,
      );
      const dateMs = pickReportDateMs(d, fieldDataRil);
      const fromMs = getDateOnlyMsFromInput(fromDateFilter);
      const toMs = getDateOnlyMsFromInput(toDateFilter, true);
      const statoLabel = computeDisplaySintetico(d).label;

      if (q) {
        const searchText = `${pickPraticaSearchText(r, fieldPratica)} ${pickTextSearchExtra(d, giiUser?.areaCod || giiUser?.area, giiUser?.settoreCod || giiUser?.settore, domainLabels)}`;
        if (!searchText.includes(q)) return false;
      }
      if (areaFilter !== "tutte" && areaCode !== areaFilter) return false;
      if (settoreFilter !== "tutte" && settoreCode !== settoreFilter)
        return false;
      if (fromMs !== null && (dateMs === null || dateMs < fromMs)) return false;
      if (toMs !== null && (dateMs === null || dateMs > toMs)) return false;
      if (statoFilter !== "tutte" && statoLabel !== statoFilter) return false;
      return true;
    },
    [
      searchFilter,
      areaFilter,
      settoreFilter,
      fromDateFilter,
      toDateFilter,
      statoFilter,
      giiUser?.areaCod,
      giiUser?.area,
      giiUser?.settoreCod,
      giiUser?.settore,
      fieldPratica,
      fieldDataRil,
      domainLabels,
      logVer,
    ],
  );

  const toggleSort = (field: string) => {
    setSortState((prev) => {
      const hasOnlyDefault = sortSig(prev) === sortSig(defaultSort);
      const defaultField = defaultSort[0]?.field;
      const defaultDir = defaultSort[0]?.dir;

      // Se l'elenco è ancora sull'ordinamento predefinito e l'utente clicca
      // un'altra intestazione, il default non deve restare come primo criterio:
      // la colonna cliccata diventa il nuovo criterio principale.
      const base = hasOnlyDefault && field !== defaultField ? [] : [...prev];
      const idx = base.findIndex((x) => x.field === field);

      // Ordinamento multiplo:
      // 1° clic = crescente, 2° clic = decrescente, 3° clic = rimuove la colonna dal sort.
      // Caso speciale: se il default è già sulla stessa colonna in DESC, il primo
      // clic deve produrre un cambio visibile passando ad ASC, non tornare al default.
      if (idx >= 0) {
        const cur = base[idx];
        if (
          hasOnlyDefault &&
          field === defaultField &&
          defaultDir === "DESC" &&
          cur.dir === "DESC"
        ) {
          return [{ field, dir: "ASC" }];
        }
        if (cur.dir === "ASC") {
          base[idx] = { field, dir: "DESC" };
          return base;
        }
        base.splice(idx, 1);
        return base.length ? base : defaultSort;
      }

      return [...base, { field, dir: "ASC" }];
    });
  };

  const isCustomSort = sortSig(sortState) !== sortSig(defaultSort);

  const resetIntegratedFilters = React.useCallback(() => {
    setSearchFilter("");
    setAreaFilter("tutte");
    setSettoreFilter("tutte");
    setFromDateFilter("");
    setToDateFilter("");
    setStatoFilter("tutte");
  }, []);

  const hasIntegratedFilters = !!(
    searchFilter.trim() ||
    areaFilter !== "tutte" ||
    settoreFilter !== "tutte" ||
    fromDateFilter ||
    toDateFilter ||
    statoFilter !== "tutte"
  );

  const clearAllSelections = React.useCallback(() => {
    setLocalSelectedByDs({});
    setLocalSelectedOid(null);
    Object.keys(dsDataRef.current).forEach((id) => {
      const e = dsDataRef.current[id];
      if (e?.ds) tryClearSelection(e.ds);
    });
    filteredUseDsJs.forEach((u: any) => {
      const dsId = String(u?.dataSourceId || "");
      try {
        const mainDs = DataSourceManager.getInstance().getDataSource(dsId);
        if (mainDs) tryClearSelection(mainDs);
        const parentId =
          (mainDs as any)?.parentDataSource?.id ||
          (mainDs as any)?.getMainDataSource?.()?.id;
        if (parentId) {
          const parentDs =
            DataSourceManager.getInstance().getDataSource(parentId);
          if (parentDs) tryClearSelection(parentDs);
        }
      } catch {}
    });
    notifySelectionCleared();
  }, [filteredUseDsJs]);

  // ── Record fusi per il tab attivo, prima dei filtri integrati ─────────────
  const roleTabRecs = React.useMemo(() => {
    if (!activeGroup) return [] as DataRecord[];
    // Evita il rendering di righe e contatori basati su uno stato ancora
    // provvisorio: prima si carica il LOG, poi si stabilisce la scheda corretta.
    if (statoRuoloField && !logLoadedRef.current) return [] as DataRecord[];
    const svcCache = new Map<string, string>();
    const uniq = new Map<string, DataRecord>();
    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || "");
      const entry = dsDataRef.current[dsId];
      if (entry?.recs) {
        for (const r of entry.recs) {
          const k = getRecordUniqKey(r, dsId, svcCache);
          if (!uniq.has(k)) uniq.set(k, r);
        }
      }
    }
    const allUniq: DataRecord[] = Array.from(uniq.values());
    const visibleForUser = allUniq.filter((r) =>
      isRecordVisibleForCurrentUser(r),
    );
    return filterByRoleTab(visibleForUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeGroup,
    dsDataVer,
    activeRoleTab,
    statoRuoloField,
    isRecordVisibleForCurrentUser,
    logVer,
  ]);

  const filteredRecs = React.useMemo(() => {
    return roleTabRecs.filter((r) => passesIntegratedFilters(r));
  }, [roleTabRecs, passesIntegratedFilters]);

  const areeDisponibili = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roleTabRecs) {
      const d = r.getData?.() || {};
      const settoreCode = getSettoreCodeFromRecord(
        d,
        giiUser?.settoreCod || giiUser?.settore,
      );
      if (settoreFilter !== "tutte" && settoreCode !== settoreFilter) continue;
      const code = getAreaCodeFromRecord(d, giiUser?.areaCod || giiUser?.area);
      if (code) map.set(code, getAreaLabelFromCode(code, domainLabels));
    }
    const order = ["AMM", "AGR", "TEC"];
    return Array.from(map.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a[1].localeCompare(b[1], "it");
    });
  }, [
    roleTabRecs,
    settoreFilter,
    giiUser?.areaCod,
    giiUser?.area,
    giiUser?.settoreCod,
    giiUser?.settore,
    domainLabels,
  ]);

  const settoriDisponibili = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roleTabRecs) {
      const d = r.getData?.() || {};
      const areaCode = getAreaCodeFromRecord(
        d,
        giiUser?.areaCod || giiUser?.area,
      );
      if (areaFilter !== "tutte" && areaCode !== areaFilter) continue;
      const code = getSettoreCodeFromRecord(
        d,
        giiUser?.settoreCod || giiUser?.settore,
      );
      if (code) map.set(code, getSettoreLabelFromCode(code, domainLabels));
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "it", { numeric: true, sensitivity: "base" }),
    );
  }, [
    roleTabRecs,
    areaFilter,
    giiUser?.areaCod,
    giiUser?.area,
    giiUser?.settoreCod,
    giiUser?.settore,
    domainLabels,
  ]);

  React.useEffect(() => {
    if (areaFilter === "tutte" || areeDisponibili.length === 0) return;
    if (!areeDisponibili.some(([code]) => code === areaFilter))
      setAreaFilter("tutte");
  }, [areaFilter, areeDisponibili]);

  React.useEffect(() => {
    if (
      settoreFilter === "tutte" ||
      areaFilter !== "tutte" ||
      areeDisponibili.length !== 1
    )
      return;
    setAreaFilter(areeDisponibili[0][0]);
  }, [settoreFilter, areaFilter, areeDisponibili]);

  React.useEffect(() => {
    if (settoreFilter === "tutte" || settoriDisponibili.length === 0) return;
    if (!settoriDisponibili.some(([code]) => code === settoreFilter))
      setSettoreFilter("tutte");
  }, [settoreFilter, settoriDisponibili]);

  const statiDisponibili = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of roleTabRecs) {
      const d = r.getData?.() || {};
      const lbl = computeDisplaySintetico(d).label;
      if (lbl) set.add(lbl);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "it", { numeric: true, sensitivity: "base" }),
    );
  }, [
    roleTabRecs,
    giiUser?.ruoloLabel,
    giiUser?.area,
    giiUser?.isAdmin,
    logVer,
  ]);

  // ── Record fusi, filtrati e ordinati per il tab attivo ──────────────────────
  const mergedRecs = React.useMemo(() => {
    const withPriority = sortByRolePriority(filteredRecs);
    return sortRecords(withPriority, sortState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRecs, sortState, sortByRolePriority, logVer, domainLabels]);

  // Lookup: record → dsId (via WeakMap su identità oggetto, sopravvive al sort)
  const recDsLookup = React.useMemo(() => {
    const map = new WeakMap<DataRecord, string>();
    if (!activeGroup) return map;
    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || "");
      const entry = dsDataRef.current[dsId];
      if (entry?.recs) {
        for (const r of entry.recs) map.set(r, dsId);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, dsDataVer]);

  React.useEffect(() => {
    const selectedPairs = Object.entries(localSelectedByDs || {});
    const selectedOid =
      localSelectedOid != null && Number.isFinite(Number(localSelectedOid))
        ? Number(localSelectedOid)
        : null;
    if (!selectedPairs.length && selectedOid == null) return;

    // Durante il completamento di una trasmissione/rimando, la pratica può uscire
    // da "In attesa mia" e ricomparire in "In attesa di altri" dopo il refresh.
    // Non cancelliamo la selezione in quel brevissimo intervallo: un effetto dedicato
    // la riposiziona nella scheda corretta.
    if (readAfterWorkflowNav()) return;

    const stillVisible = mergedRecs.some((r) => {
      const dsId = recDsLookup.get(r) || "";
      const rid = String(r.getId?.() ?? "");
      if (selectedPairs.some(([selDsId, selRid]) => dsId === selDsId && rid === String(selRid)))
        return true;
      if (selectedOid != null) {
        const entry = dsDataRef.current[dsId];
        const idFieldName =
          String(entry?.ds?.getIdField?.() || "OBJECTID").trim() || "OBJECTID";
        return getRecordObjectIdValue(r, idFieldName, rid) === selectedOid;
      }
      return false;
    });

    if (!stillVisible) {
      const restoreInfo = readRestoreSelectionAfterEdit();
      const preserveUntil = preserveSelectionRefreshUntilRef.current || 0;
      // Durante una presa in carico il record resta nella disponibilita' del ruolo.
      // Se il refresh FL/LOG genera un intervallo vuoto o una doppia notifica,
      // non azzeriamo il focus: la selezione viene confermata appena il record
      // rientra nella lista aggiornata.
      if (restoreInfo && Date.now() <= preserveUntil) return;
      clearAllSelections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedRecs, recDsLookup, localSelectedByDs, localSelectedOid]);

  React.useEffect(() => {
    const pending = readAfterWorkflowNav();
    if (!pending) return;

    // Il marker post-workflow rimane valido anche dopo il primo cambio scheda:
    // prima possiamo dover passare da "In attesa mia" a "In attesa di altri",
    // poi, nel render successivo, dobbiamo ancora selezionare la stessa pratica.

    const anyLoading = Object.values(dsDataRef.current || {}).some(
      (e: any) => !!e?.loading,
    );
    if (anyLoading) return;
    // La scheda di destinazione dopo una trasmissione/rimando dipende anche
    // dall'ultimo LOG chiuso. Se il LOG non è ancora ricaricato, attendiamo:
    // altrimenti la selezione può essere spostata/azzerata sulla scheda sbagliata.
    if (statoRuoloField && !logLoadedRef.current) return;
    if (!activeGroup) return;

    let found: {
      dsId: string;
      rid: string;
      rec: DataRecord;
      idFieldName: string;
    } | null = null;

    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || "");
      const entry = dsDataRef.current[dsId];
      if (!entry?.recs?.length) continue;
      const idFieldName =
        String(entry?.ds?.getIdField?.() || "OBJECTID").trim() || "OBJECTID";

      for (const r of entry.recs) {
        if (!isRecordVisibleForCurrentUser(r)) continue;
        const d = r.getData?.() || {};
        const rid = String(r.getId?.() ?? "");
        const recOid = Number(
          d?.[idFieldName] ??
            d?.OBJECTID ??
            d?.objectid ??
            d?.ObjectId ??
            d?.objectId ??
            rid,
        );
        if (Number.isFinite(recOid) && recOid === Number(pending.oid)) {
          found = {
            dsId,
            rid: rid || String(pending.oid),
            rec: r,
            idFieldName,
          };
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      clearAfterWorkflowNav();
      clearAllSelections();
      return;
    }

    const targetRoleTab = statoRuoloField
      ? passesRoleTab(found.rec, "attesa_altri")
        ? "attesa_altri"
        : "tutte"
      : activeRoleTab;

    if (statoRuoloField && activeRoleTab !== targetRoleTab) {
      setActiveRoleTab(targetRoleTab);
      return;
    }

    Object.keys(dsDataRef.current).forEach((id) => {
      const e = dsDataRef.current[id];
      if (e?.ds) tryClearSelection(e.ds);
    });
    notifySelectionCleared();

    setLocalSelectedByDs({ [found.dsId]: found.rid });
    setLocalSelectedOid(Number(pending.oid));
    const entry = dsDataRef.current[found.dsId];
    if (entry?.ds) trySelectRecord(entry.ds, found.rec, found.rid);

    if (activeGroup) {
      activeGroup.dsIndices.forEach((di) => {
        const otherId = String(filteredUseDsJs[di]?.dataSourceId || "");
        if (otherId === found?.dsId) return;
        const otherEntry = dsDataRef.current[otherId];
        if (otherEntry?.ds) {
          try {
            (otherEntry.ds as any).setSelectedRecords?.([found?.rec]);
          } catch {}
          try {
            (otherEntry.ds as any).selectRecordsByIds?.([found?.rid]);
          } catch {}
        }
      });
    }

    const selectedData = found.rec.getData?.() || {};
    publishRuntimeSelection({
      oid: Number(pending.oid),
      layerUrl:
        resolvedView?.layerUrl ||
        sessionStorage.getItem("GII_SELECTED_LAYER_URL") ||
        found.dsId,
      serviceUrl:
        resolvedView?.serviceUrl ||
        sessionStorage.getItem("GII_SELECTED_SERVICE_URL") ||
        found.dsId,
      idFieldName: found.idFieldName,
      viewName:
        resolvedView?.viewName ||
        sessionStorage.getItem("GII_SELECTED_VIEW_NAME") ||
        getDsLabel({ __label: "" }, "Vista runtime"),
      data: selectedData,
    });

    clearAfterWorkflowNav();

    window.setTimeout(() => {
      try {
        const el = document.querySelector(
          `[data-gii-oid="${Number(pending.oid)}"]`,
        ) as HTMLElement | null;
        el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      } catch {}
    }, 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeGroup,
    filteredUseDsJs,
    dsDataVer,
    logVer,
    activeRoleTab,
    statoRuoloField,
    passesRoleTab,
    isRecordVisibleForCurrentUser,
    resolvedView,
  ]);

  // Quando si rientra nell'elenco dopo la modifica di un rapporto, ripristina
  // la selezione del record appena salvato/chiuso. Usiamo un marker separato
  // dai normali GII_SELECTED_* per evitare che una pulizia transitoria della
  // selezione runtime lo cancelli durante il cambio pagina.
  React.useEffect(() => {
    const restoreInfo = readRestoreSelectionAfterEdit();
    if (!restoreInfo) return;
    const preserveUntil = preserveSelectionRefreshUntilRef.current || 0;
    const anyLoading = Object.values(dsDataRef.current || {}).some(
      (e: any) => !!e?.loading,
    );
    if (anyLoading || (statoRuoloField && !logLoadedRef.current)) return;
    const selectedPairs = Object.entries(localSelectedByDs || {});
    if (selectedPairs.length > 0 || localSelectedOid != null) {
      const stillSelectedVisible = mergedRecs.some((r) => {
        const dsId = recDsLookup.get(r) || "";
        const rid = String(r.getId?.() ?? "");
        if (selectedPairs.some(([selDsId, selRid]) => dsId === selDsId && rid === String(selRid)))
          return true;
        if (localSelectedOid != null) {
          const entry = dsDataRef.current[dsId];
          const idFieldName =
            String(entry?.ds?.getIdField?.() || "OBJECTID").trim() || "OBJECTID";
          return getRecordObjectIdValue(r, idFieldName, rid) === Number(localSelectedOid);
        }
        return false;
      });
      // Se la selezione locale è ancora agganciata a una riga reale, non serve
      // ripristinarla. Se invece il refresh ha ricreato record con id runtime
      // diverso, proseguiamo e la riagganciamo per OBJECTID.
      if (stillSelectedVisible) {
        if (Date.now() > preserveUntil) clearRestoreSelectionAfterEdit();
        return;
      }
    }
    if (!mergedRecs.length) return;

    const oidNum = Number(restoreInfo.oid);
    if (!Number.isFinite(oidNum)) return;

    let found: {
      dsId: string;
      rid: string;
      rec: DataRecord;
      idFieldName: string;
    } | null = null;
    for (const r of mergedRecs) {
      const dsId = recDsLookup.get(r) || "";
      if (!dsId) continue;
      const entry = dsDataRef.current[dsId];
      const idFieldName =
        String(
          restoreInfo?.idFieldName || entry?.ds?.getIdField?.() || "OBJECTID",
        ).trim() || "OBJECTID";
      const d = r.getData?.() || {};
      const rid = String(r.getId?.() ?? "");
      const recOid = Number(
        d?.[idFieldName] ??
          d?.OBJECTID ??
          d?.objectid ??
          d?.ObjectId ??
          d?.objectId ??
          rid,
      );
      if (Number.isFinite(recOid) && recOid === oidNum) {
        found = { dsId, rid: rid || String(oidNum), rec: r, idFieldName };
        break;
      }
    }
    if (!found) {
      // Il record non è più presente nella scheda corrente: non va forzata
      // alcuna selezione e il marker non deve riattivarsi cambiando tab.
      // Durante una presa in carico, però, può trattarsi solo di un transitorio
      // del doppio refresh FL/LOG: attendiamo la stabilizzazione prima di perdere
      // il focus.
      if (Date.now() <= preserveUntil) return;
      clearRestoreSelectionAfterEdit();
      return;
    }

    setLocalSelectedByDs({ [found.dsId]: found.rid });
    setLocalSelectedOid(Number(oidNum));
    const entry = dsDataRef.current[found.dsId];
    if (entry?.ds) trySelectRecord(entry.ds, found.rec, found.rid);

    if (activeGroup) {
      activeGroup.dsIndices.forEach((di) => {
        const otherId = String(filteredUseDsJs[di]?.dataSourceId || "");
        if (otherId === found?.dsId) return;
        const otherEntry = dsDataRef.current[otherId];
        if (otherEntry?.ds) {
          try {
            (otherEntry.ds as any).setSelectedRecords?.([found?.rec]);
          } catch {}
          try {
            (otherEntry.ds as any).selectRecordsByIds?.([found?.rid]);
          } catch {}
        }
      });
    }

    const restoredData = found.rec.getData?.() || {};
    publishRuntimeSelection({
      oid: Number(oidNum),
      layerUrl:
        resolvedView?.layerUrl ||
        restoreInfo.layerUrl ||
        sessionStorage.getItem("GII_SELECTED_LAYER_URL") ||
        found.dsId,
      serviceUrl:
        resolvedView?.serviceUrl ||
        sessionStorage.getItem("GII_SELECTED_SERVICE_URL") ||
        found.dsId,
      idFieldName: found.idFieldName,
      viewName:
        resolvedView?.viewName ||
        sessionStorage.getItem("GII_SELECTED_VIEW_NAME") ||
        getDsLabel({ __label: "" }, "Vista runtime"),
      data: restoredData,
    });
    clearRestoreSelectionAfterEdit();
    preserveSelectionRefreshUntilRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mergedRecs,
    recDsLookup,
    activeGroup,
    filteredUseDsJs,
    localSelectedByDs,
    localSelectedOid,
    resolvedView,
  ]);

  // Cambio tab manuale (non un'azione): se il record già selezionato è ancora
  // presente tra le righe della tab corrente, ripubblica la selezione così i
  // pulsanti in gii-azioni si riattivano — indipendentemente da un eventuale
  // intento di ripristino post-azione (gestito dall'effect sopra).
  const lastTabSelectionCheckedRef = React.useRef<any>(null);
  const lastTabMergedRecsLengthRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastTabSelectionCheckedRef.current === activeRoleTab) return;
    const selectedPairs = Object.entries(localSelectedByDs || {});
    if (selectedPairs.length === 0 && localSelectedOid == null) {
      lastTabSelectionCheckedRef.current = activeRoleTab;
      lastTabMergedRecsLengthRef.current = null;
      return;
    }

    let found: { dsId: string; rid: string; rec: DataRecord; idFieldName: string } | null = null;
    for (const r of mergedRecs) {
      if (!passesRoleTab(r, activeRoleTab)) continue;
      const dsId = recDsLookup.get(r) || "";
      if (!dsId) continue;
      const entry = dsDataRef.current[dsId];
      const idFieldName =
        String(entry?.ds?.getIdField?.() || "OBJECTID").trim() || "OBJECTID";
      const rid = String(r.getId?.() ?? "");
      const isSelectedPair = selectedPairs.some(
        ([selDsId, selRid]) => dsId === selDsId && rid === String(selRid),
      );
      const oidMatch =
        localSelectedOid != null &&
        getRecordObjectIdValue(r, idFieldName, rid) === Number(localSelectedOid);
      if (isSelectedPair || oidMatch) {
        found = { dsId, rid, rec: r, idFieldName };
        break;
      }
    }

    if (!found) {
      // mergedRecs potrebbe ancora riflettere dati transitori del refresh in corso
      // (non ancora sostituiti da quelli veri): ci fidiamo solo se la lunghezza è
      // rimasta stabile rispetto all'ultimo controllo per questo stesso cambio di
      // tab — altrimenti aspettiamo il prossimo aggiornamento.
      if (lastTabMergedRecsLengthRef.current !== mergedRecs.length) {
        lastTabMergedRecsLengthRef.current = mergedRecs.length;
        return;
      }
      lastTabSelectionCheckedRef.current = activeRoleTab;
      lastTabMergedRecsLengthRef.current = null;
      return;
    }

    lastTabSelectionCheckedRef.current = activeRoleTab;
    lastTabMergedRecsLengthRef.current = null;

    const data = found.rec.getData?.() || {};
    const oidVal = Number(
      data?.[found.idFieldName] ??
        data?.OBJECTID ??
        data?.objectid ??
        data?.ObjectId ??
        data?.objectId ??
        found.rid,
    );
    if (!Number.isFinite(oidVal)) return;

    publishRuntimeSelection({
      oid: oidVal,
      layerUrl:
        resolvedView?.layerUrl ||
        sessionStorage.getItem("GII_SELECTED_LAYER_URL") ||
        found.dsId,
      serviceUrl:
        resolvedView?.serviceUrl ||
        sessionStorage.getItem("GII_SELECTED_SERVICE_URL") ||
        found.dsId,
      idFieldName: found.idFieldName,
      viewName:
        resolvedView?.viewName ||
        sessionStorage.getItem("GII_SELECTED_VIEW_NAME") ||
        getDsLabel({ __label: "" }, "Vista runtime"),
      data,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoleTab, mergedRecs, recDsLookup, localSelectedByDs, localSelectedOid, resolvedView, passesRoleTab]);

  const [openPracticeIntentTick, setOpenPracticeIntentTick] = React.useState(0);
  const openPracticeIntentRefreshKeyRef = React.useRef("");

  React.useEffect(() => {
    const h = () => setOpenPracticeIntentTick((v) => v + 1);
    window.addEventListener("gii-open-practice-intent", h as EventListener);
    return () =>
      window.removeEventListener(
        "gii-open-practice-intent",
        h as EventListener,
      );
  }, []);

  // Quando lo header apre la pagina Elenco pratiche da un allarme, seleziona
  // automaticamente la pratica corrispondente appena i record sono disponibili.
  React.useLayoutEffect(() => {
    const intent = readOpenPracticeIntent(giiUser);
    if (!intent) {
      openPracticeIntentRefreshKeyRef.current = "";
      return;
    }

    // Il clic su "Apri pratica" dalla campanella deve prima riallineare l'elenco.
    // Se l'allarme è appena stato creato, la pratica può non essere ancora nella
    // snapshot locale: forziamo una rilettura del FL/LOG e poi selezioniamo.
    const intentRefreshKey = [
      intent.parentObjectId ?? intent.oid ?? "",
      intent.parentGlobalId || "",
      intent.reportCode || "",
      intent.ts || "",
    ].join("|");

    if (openPracticeIntentRefreshKeyRef.current !== intentRefreshKey) {
      openPracticeIntentRefreshKeyRef.current = intentRefreshKey;
      // Ogni clic su un messaggio di allarme sostituisce integralmente
      // l'eventuale navigazione pendente precedente: niente scheda/record
      // ereditati dal clic precedente.
      clearAllSelections();
      // Non forziamo preventivamente "In attesa mia": la scheda corretta viene
      // stabilita dopo il refresh, sui dati e sul LOG aggiornati. Così il record
      // non compare per un istante nella scheda sbagliata.
      forceListRefresh();
      return;
    }

    const anyLoading = Object.values(dsDataRef.current).some(
      (e: any) => !!e?.loading,
    );
    if (anyLoading) return;
    if (statoRuoloField && !logLoadedRef.current) return;
    if (!activeGroup) return;

    // Cerca su tutti i record visibili del gruppo, non solo nella scheda ruolo attiva:
    // se l'utente era in "In attesa di altri", una pratica da prendere in carico
    // sarebbe filtrata fuori e non verrebbe mai selezionata.
    const svcCache = new Map<string, string>();
    const candidates: Array<{ dsId: string; rec: DataRecord }> = [];
    const seen = new Set<string>();

    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || "");
      const entry = dsDataRef.current[dsId];
      if (!entry?.recs?.length) continue;

      for (const r of entry.recs) {
        const key = getRecordUniqKey(r, dsId, svcCache);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!isRecordVisibleForCurrentUser(r)) continue;
        candidates.push({ dsId, rec: r });
      }
    }

    if (!candidates.length) return;

    let found: {
      dsId: string;
      rid: string;
      rec: DataRecord;
      idFieldName: string;
    } | null = null;

    for (const item of candidates) {
      const entry = dsDataRef.current[item.dsId];
      const idFieldName =
        String(
          intent.idFieldName || entry?.ds?.getIdField?.() || "OBJECTID",
        ).trim() || "OBJECTID";
      const rid = String(item.rec.getId?.() ?? "");
      const d = item.rec.getData?.() || {};
      if (recordMatchesOpenPracticeIntent(d, rid, idFieldName, intent)) {
        found = {
          dsId: item.dsId,
          rid: rid || String(intent.parentObjectId || intent.oid || ""),
          rec: item.rec,
          idFieldName,
        };
        break;
      }
    }

    if (!found) return;

    // La scheda di destinazione non viene mai presa dal messaggio: viene
    // calcolata solo dopo FL + LOG, sulla classificazione reale della pratica.
    if (statoRuoloField) {
      const targetRoleTab = passesRoleTab(found.rec, "attesa_mia")
        ? "attesa_mia"
        : passesRoleTab(found.rec, "attesa_altri")
          ? "attesa_altri"
          : "tutte";
      if (activeRoleTab !== targetRoleTab) {
        setActiveRoleTab(targetRoleTab);
        return;
      }
    }

    // Se filtri integrati la nasconderebbero, li resettiamo e attendiamo il
    // render successivo: la selezione viene eseguita solo quando la riga è
    // davvero presente nella lista filtrata corrente.
    if (!passesIntegratedFilters(found.rec)) {
      resetIntegratedFilters();
      return;
    }

    if (!mergedRecs.includes(found.rec)) return;

    // Pulisce tutte le selezioni precedenti su tutti i DS del gruppo.
    Object.keys(dsDataRef.current).forEach((id) => {
      const e = dsDataRef.current[id];
      if (e?.ds) tryClearSelection(e.ds);
    });
    notifySelectionCleared();

    setLocalSelectedByDs({ [found.dsId]: found.rid });
    const entry = dsDataRef.current[found.dsId];
    if (entry?.ds) trySelectRecord(entry.ds, found.rec, found.rid);

    if (activeGroup) {
      activeGroup.dsIndices.forEach((di) => {
        const otherId = String(filteredUseDsJs[di]?.dataSourceId || "");
        if (otherId === found?.dsId) return;
        const otherEntry = dsDataRef.current[otherId];
        if (otherEntry?.ds) {
          try {
            (otherEntry.ds as any).setSelectedRecords?.([found?.rec]);
          } catch {}
          try {
            (otherEntry.ds as any).selectRecordsByIds?.([found?.rid]);
          } catch {}
        }
      });
    }

    const selectedData = found.rec.getData?.() || {};
    const oidVal = Number(
      selectedData?.[found.idFieldName] ??
        selectedData?.OBJECTID ??
        selectedData?.objectid ??
        selectedData?.ObjectId ??
        selectedData?.objectId ??
        found.rid,
    );

    setLocalSelectedOid(
      Number.isFinite(oidVal)
        ? Number(oidVal)
        : Number(intent.parentObjectId || intent.oid || 0),
    );

    publishRuntimeSelection({
      oid: Number.isFinite(oidVal)
        ? oidVal
        : Number(intent.parentObjectId || intent.oid || 0),
      layerUrl:
        resolvedView?.layerUrl ||
        intent.layerUrl ||
        sessionStorage.getItem("GII_SELECTED_LAYER_URL") ||
        found.dsId,
      serviceUrl:
        resolvedView?.serviceUrl ||
        sessionStorage.getItem("GII_SELECTED_SERVICE_URL") ||
        found.dsId,
      idFieldName: found.idFieldName,
      viewName:
        resolvedView?.viewName ||
        sessionStorage.getItem("GII_SELECTED_VIEW_NAME") ||
        getDsLabel({ __label: "" }, "Vista runtime"),
      data: selectedData,
    });

    clearOpenPracticeIntent();
    openPracticeIntentRefreshKeyRef.current = "";

    window.setTimeout(() => {
      try {
        const el = document.querySelector(
          `[data-gii-oid="${Number.isFinite(oidVal) ? oidVal : ""}"]`,
        ) as HTMLElement | null;
        el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      } catch {}
    }, 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeGroup,
    filteredUseDsJs,
    dsDataVer,
    logVer,
    activeRoleTab,
    statoRuoloField,
    resolvedView,
    passesRoleTab,
    passesIntegratedFilters,
    resetIntegratedFilters,
    isRecordVisibleForCurrentUser,
    clearAllSelections,
    mergedRecs,
    openPracticeIntentTick,
    giiUser?.username,
    giiUser?.ruoloLabel,
    giiUser?.ruoloCod,
    giiUser?.area,
    giiUser?.areaCod,
    giiUser?.settore,
    giiUser?.settoreCod,
    giiUser?.ufficio,
    forceListRefresh,
  ]);

  const ultimoIngressoCodaMs = React.useMemo(() => {
    let best: number | null = null;
    for (const r of mergedRecs) {
      try {
        const d =
          typeof (r as any)?.getData === "function"
            ? (r as any).getData()
            : (r as any)?.feature?.attributes || {};
        const sint = computeSintetico(d);
        const ms = getRoleLastTouchMs(d, sint.ruolo) ?? computeUltimoAggMs(d);
        if (ms != null && (best == null || ms > best)) best = ms;
      } catch {}
    }
    return best;
  }, [mergedRecs]);

  // Loading: true solo se TUTTI i DS del tab attivo stanno ancora caricando
  // (non se solo uno manca dall'entry — potrebbe essere che non ha ancora risposto)
  const roleTabStateLoading = !!statoRuoloField && !logLoadedRef.current;

  const anyLoading =
    roleTabStateLoading ||
    (activeGroup?.dsIndices.every((di) => {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || "");
      const entry = dsDataRef.current[dsId];
      if (!entry) return true; // mai aggiornato → stiamo aspettando
      return entry.loading;
    }) ?? false);

  // layout
  const gap = num(cfg.gap, 12);
  const padFirst = num(cfg.paddingLeftFirstCol, 0);

  // ── Colonne dinamiche da config ──
  const columns = migrateColumns(asJs(cfg));

  const gridCols = columns.map((c) => `${c.width}px`).join(" ");
  const minWidth =
    columns.reduce((sum, c) => sum + c.width, 0) +
    gap * Math.max(0, columns.length - 1) +
    24;
  const procGroupFields = new Set([
    V_FASE,
    V_CAUSALE,
    V_MITTENTE,
    V_PROSSIMA,
    V_DATA_MSG,
  ]);
  const procGroupIndexes = columns
    .map((c, i) =>
      procGroupFields.has(String(c.field || "").toLowerCase()) ? i : -1,
    )
    .filter((i) => i >= 0);
  const procGroupStart = procGroupIndexes.length
    ? Math.min(...procGroupIndexes)
    : -1;
  const procGroupEnd = procGroupIndexes.length
    ? Math.max(...procGroupIndexes)
    : -1;
  const procGroupSpan =
    procGroupStart >= 0 ? procGroupEnd - procGroupStart + 1 : 0;

  const rowGap = num(cfg.rowGap, 8);
  const rowPaddingX = num(cfg.rowPaddingX, 12);
  const rowPaddingY = num(cfg.rowPaddingY, 10);
  const rowMinHeight = num(cfg.rowMinHeight, 44);
  const rowRadius = num(cfg.rowRadius, 12);
  const rowBorderWidth = num(cfg.rowBorderWidth, 1);
  const rowBorderColor = txt(cfg.rowBorderColor || "rgba(0,0,0,0.08)");

  const oggettoBadgeEnabled = cfg.oggettoBadgeEnabled !== false;
  const oggettoBadgeWidth = Math.max(0, num(cfg.oggettoBadgeWidth, 8));
  const oggettoBadgeContentOffset = Math.max(
    0,
    num(cfg.oggettoBadgeContentOffset, 10),
  );
  const oggettoBadgeOpacity = Math.max(
    0,
    Math.min(1, num(cfg.oggettoBadgeOpacity, 1)),
  );

  const chipRadius = num(cfg.statoChipRadius, 999);
  const chipPadX = num(cfg.statoChipPadX, 10);
  const chipPadY = num(cfg.statoChipPadY, 4);
  const chipBorderW = num(cfg.statoChipBorderW, 1);
  const chipFontWeight = num(cfg.statoChipFontWeight, 600);
  const chipFontSize = num(cfg.statoChipFontSize, 12);
  const chipFontStyle = (
    cfg.statoChipFontStyle === "italic" ? "italic" : "normal"
  ) as any;
  const chipTextTransform = (
    ["none", "uppercase", "lowercase", "capitalize"].includes(
      cfg.statoChipTextTransform,
    )
      ? cfg.statoChipTextTransform
      : "none"
  ) as any;
  const chipLetterSpacing = num(cfg.statoChipLetterSpacing, 0);

  const styles = css`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .tabBar {
      display: ${hasTabs ? "flex" : "none"};
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: var(--bs-body-bg, #fff);
    }
    .tabBtn {
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: rgba(0, 0, 0, 0.02);
      color: #111827;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    .tabBtn.active {
      background: #eaf2ff;
      border-color: #2f6fed;
      color: #1d4ed8;
    }

    .integratedFilters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      align-items: end;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: rgba(0, 0, 0, 0.015);
    }
    .filterLabel {
      display: block;
      margin-bottom: 5px;
      font-size: 10.5px;
      font-weight: 800;
      line-height: 1;
      color: rgba(0, 0, 0, 0.56);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .filterInput,
    .filterSelect {
      width: 100%;
      height: 34px;
      border: 1px solid rgba(0, 0, 0, 0.14);
      border-radius: 10px;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
    }
    .filterInput:focus,
    .filterSelect:focus {
      border-color: rgba(47, 111, 237, 0.75);
      box-shadow: 0 0 0 2px rgba(47, 111, 237, 0.12);
    }
    .clearFiltersBtn {
      width: 100%;
      height: 34px;
      border: 1px solid rgba(0, 0, 0, 0.14);
      border-radius: 10px;
      background: ${hasIntegratedFilters ? "#fff" : "rgba(0,0,0,0.03)"};
      color: ${hasIntegratedFilters ? "#111827" : "rgba(0,0,0,0.38)"};
      font-size: 12px;
      font-weight: 800;
      cursor: ${hasIntegratedFilters ? "pointer" : "not-allowed"};
    }
    .filtersSummary {
      padding: 4px 12px 8px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      font-size: 11px;
      color: rgba(0, 0, 0, 0.56);
      background: rgba(0, 0, 0, 0.015);
    }

    .viewport {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    .content {
      min-width: ${minWidth}px;
      padding: 0 12px 10px;
    }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding: 6px 0;
      margin: 0 0 8px 0;
    }

    .gridGroupHeader {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: end;
      min-height: 26px;
      padding: 2px ${rowPaddingX + rowBorderWidth}px 4px
        ${rowPaddingX + rowBorderWidth}px;
      box-sizing: border-box;
    }

    .groupHeaderCell {
      position: relative;
      min-width: 0;
      height: 22px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      color: rgba(17, 24, 39, 0.68);
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.035em;
      text-align: center;
      white-space: nowrap;
      overflow: visible;
      text-overflow: ellipsis;
      --group-left-extra: 14px;
      --group-right-shrink: 22px;
    }

    .groupHeaderCell::before {
      content: "";
      position: absolute;
      left: calc(-1 * var(--group-left-extra));
      right: var(--group-right-shrink);
      top: 11px;
      border-top: 1px solid rgba(15, 23, 42, 0.2);
    }

    .groupHeaderCell::after {
      content: "";
      position: absolute;
      left: calc(-1 * var(--group-left-extra));
      right: var(--group-right-shrink);
      top: 11px;
      height: 12px;
      border-left: 1px solid rgba(15, 23, 42, 0.2);
      border-right: 1px solid rgba(15, 23, 42, 0.2);
      pointer-events: none;
    }

    .groupHeaderLabel {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: calc(100% - 16px);
      padding: 0 8px;
      background: var(--bs-body-bg, #fff);
      color: rgba(17, 24, 39, 0.68);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .gridHeader {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      min-height: 28px;
      padding: 0 ${rowPaddingX + rowBorderWidth}px;
      box-sizing: border-box;
    }

    .headerCell {
      display: flex;
      align-items: center;
      min-width: 0;
      font-weight: 700;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.65);
    }

    .hdrBtn {
      width: 100%;
      border: none;
      background: transparent;
      padding: 0;
      margin: 0;
      text-align: left;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      font: inherit;
      line-height: 1;
    }
    .hdrBtn:hover {
      color: rgba(0, 0, 0, 0.9);
    }

    .sortBadge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      opacity: 0.9;
      flex: 0 0 auto;
    }
    .sortTri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      line-height: 1;
    }
    .sortPri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.07);
      font-weight: 800;
    }

    .resetSortTabBtn {
      width: 28px;
      height: 28px;
      min-width: 28px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: rgba(0, 0, 0, 0.06);
      color: #374151;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      line-height: 1;
      padding: 0;
      flex: 0 0 auto;
      transition:
        background 120ms ease,
        border-color 120ms ease,
        color 120ms ease,
        transform 120ms ease;
    }
    .resetSortTabBtn:hover {
      background: rgba(47, 111, 237, 0.12);
      border-color: rgba(47, 111, 237, 0.35);
      color: #1d4ed8;
    }
    .resetSortTabBtn:active {
      transform: scale(0.97);
    }

    .first {
      padding-left: ${padFirst +
      (oggettoBadgeEnabled ? oggettoBadgeContentOffset : 0)}px;
    }

    .list {
      display: flex;
      flex-direction: column;
    }

    .rowCard {
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;

      padding: ${rowPaddingY}px ${rowPaddingX}px;
      min-height: ${rowMinHeight}px;

      border-radius: ${rowRadius}px;
      border: ${rowBorderWidth}px solid ${rowBorderColor};

      margin-bottom: ${rowGap}px;
      cursor: pointer;
    }
    .rowCard::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--gii-object-accent-width, 0px);
      background: var(--gii-object-accent, transparent);
      opacity: var(--gii-object-accent-opacity, 1);
      pointer-events: none;
    }
    .objectAccentBtn {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--gii-object-accent-width, 0px);
      min-width: var(--gii-object-accent-width, 0px);
      border: 0;
      padding: 0;
      margin: 0;
      background: transparent;
      cursor: pointer;
      z-index: 3;
    }
    .objectAccentBtn:hover {
      background: rgba(255, 255, 255, 0.22);
    }
    .objectAccentBtn:focus-visible {
      outline: 2px solid rgba(17, 24, 39, 0.9);
      outline-offset: -2px;
    }
    .rowCard.even {
      background: ${txt(cfg.zebraEvenBg || "#ffffff")};
    }
    .rowCard.odd {
      background: ${txt(cfg.zebraOddBg || "#fbfbfb")};
    }
    .rowCard:hover {
      background: ${txt(cfg.hoverBg || "#f2f6ff")};
    }

    .rowCard.selected {
      border-color: ${txt(cfg.selectedBorderColor || "#2f6fed")};
      box-shadow: 0 0 0 ${num(cfg.selectedBorderWidth, 2)}px
        rgba(47, 111, 237, 0.18);
      background: ${txt(cfg.selectedBg || "#eaf2ff")};
    }

    .cell {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      position: relative;
      z-index: 1;
    }

    .personaCell {
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      line-height: 1.06;
    }
    .personaName {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.08;
    }
    .personaRole {
      min-width: 0;
      margin-top: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      line-height: 1.05;
      color: rgba(17, 24, 39, 0.68);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: ${chipPadY}px ${chipPadX}px;
      border-radius: ${chipRadius}px;
      border: ${chipBorderW}px solid rgba(0, 0, 0, 0.12);
      font-weight: ${chipFontWeight};
      font-size: ${chipFontSize}px;
      font-style: ${chipFontStyle};
      text-transform: ${chipTextTransform};
      letter-spacing: ${chipLetterSpacing}px;
      line-height: 1;
      white-space: nowrap;
      max-width: 100%;
    }

    .empty {
      padding: 14px;
      color: rgba(0, 0, 0, 0.65);
    }
  `;

  const Header = (p: { label: string; field: string; first?: boolean }) => {
    const idx = sortState.findIndex((x) => x.field === p.field);
    const item = idx >= 0 ? sortState[idx] : null;
    const dir = item?.dir;

    const badge = item ? (
      <span className="sortBadge" aria-hidden>
        <span className="sortTri">{dir === "ASC" ? "▲" : "▼"}</span>
        <span className="sortPri">{idx + 1}</span>
      </span>
    ) : null;

    return (
      <div className={`headerCell ${p.first ? "first" : ""}`}>
        <button
          type="button"
          className="hdrBtn"
          onClick={() => toggleSort(p.field)}
          title="Click: ordina in modalità multipla. Terzo clic: rimuove ordinamento."
        >
          <span>{p.label}</span>
          {badge}
        </button>
      </div>
    );
  };

  const maskOuterOffset = Number.isFinite(Number(cfg.maskOuterOffset))
    ? Number(cfg.maskOuterOffset)
    : 12;
  const maskInnerPadding = Number.isFinite(Number(cfg.maskInnerPadding))
    ? Number(cfg.maskInnerPadding)
    : 8;
  const maskBg = String(cfg.maskBg ?? "#ffffff");
  const maskBorderColor = String(cfg.maskBorderColor ?? "rgba(0,0,0,0.12)");
  const maskBorderWidth = Number.isFinite(Number(cfg.maskBorderWidth))
    ? Number(cfg.maskBorderWidth)
    : 1;
  const maskRadius = Number.isFinite(Number(cfg.maskRadius))
    ? Number(cfg.maskRadius)
    : 12;

  if (!userLoading && !notLogged && !!giiUser?.username && !resolvedView) {
    return (
      <div style={{ padding: 12 }}>
        Nessuna vista AGOL associata a ruolo, area e settore dell’utente.
      </div>
    );
  }

  // Titolo elenco
  const listTitleText = txt(cfg.listTitleText || "Elenco pratiche");
  const listTitleHeight = num(cfg.listTitleHeight, 28);
  const listTitlePaddingBottom = num(cfg.listTitlePaddingBottom, 10);
  const listTitlePaddingLeft = num(cfg.listTitlePaddingLeft, 0);
  const listTitleFontSize = num(cfg.listTitleFontSize, 14);
  const listTitleFontWeight = num(cfg.listTitleFontWeight, 600);
  const listTitleColor = txt(cfg.listTitleColor || "rgba(0,0,0,0.85)");

  return (
    <div
      ref={elencoSidebarHostRef}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: maskOuterOffset,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        position: "relative",
        overflow: "visible",
        zIndex: 2147483000,
      }}
    >
      {/* Titolo elenco - sopra l'area bianca */}
      {listTitleText && (
        <div
          style={{
            height: listTitleHeight,
            paddingBottom: listTitlePaddingBottom,
            paddingLeft: listTitlePaddingLeft,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            boxSizing: "border-box",
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: listTitleFontSize,
                fontWeight: listTitleFontWeight,
                color: listTitleColor,
              }}
            >
              {listTitleText}
            </span>
            <span
              style={{
                fontSize: Math.max(11, listTitleFontSize - 2),
                color: "rgba(0,0,0,0.58)",
              }}
            >
              Ultimo aggiornamento:{" "}
              {lastListRefreshAt ? formatDateIt(lastListRefreshAt) : "—"}
            </span>
            <button
              type="button"
              onClick={() => {
                // Deseleziona prima di aggiornare per evitare disallineamento con azioni
                setLocalSelectedByDs({});
                Object.keys(dsDataRef.current).forEach((id) => {
                  const e = dsDataRef.current[id];
                  if (e?.ds) tryClearSelection(e.ds);
                });
                notifySelectionCleared();
                forceListRefresh({ refreshAlerts: true });
              }}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid #2f6fed",
                background: "#fff",
                color: "#1d4ed8",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              Aggiorna elenco
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          width: "100%",
          flex: "1 1 auto",
          minHeight: 0,
          boxSizing: "border-box",
          border: `${maskBorderWidth}px solid ${maskBorderColor}`,
          borderRadius: maskRadius,
          background: maskBg,
          padding: maskInnerPadding,
          overflow: "hidden",
        }}
      >
        <div css={styles} style={{ width: "100%", height: "100%" }}>
          {/* ── Overlay bloccante: copre i dati finche' non c'e' login ── */}
          {(notLogged || userLoading) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 100,
                background: "rgba(255,255,255,0.97)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 32,
                textAlign: "center",
                borderRadius: maskRadius,
                pointerEvents: "all",
              }}
            >
              {userLoading ? (
                <>
                  <Loading />
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Verifica accesso in corso…
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32 }}>🔒</div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}
                  >
                    Accesso richiesto
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      maxWidth: 300,
                      lineHeight: 1.5,
                    }}
                  >
                    Utilizza il pulsante di accesso in alto a destra per entrare
                    con le credenziali CBSM.
                  </div>
                </>
              )}
            </div>
          )}

          {/* Filtri integrati: sostituiscono il vecchio CW ricerca-e-filtri */}
          {!userLoading && !notLogged && (
            <>
              <div className="integratedFilters">
                <div>
                  <label className="filterLabel">Cerca</label>
                  <input
                    className="filterInput"
                    value={searchFilter}
                    onChange={(e: any) =>
                      setSearchFilter(e?.target?.value || "")
                    }
                    placeholder="Cerca n. pratica…"
                  />
                </div>
                <div>
                  <label className="filterLabel">Area</label>
                  <select
                    className="filterSelect"
                    value={areaFilter}
                    onChange={(e: any) => {
                      setAreaFilter(e?.target?.value || "tutte");
                      setSettoreFilter("tutte");
                    }}
                  >
                    <option value="tutte">Tutte</option>
                    {areeDisponibili.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="filterLabel">Settore</label>
                  <select
                    className="filterSelect"
                    value={settoreFilter}
                    onChange={(e: any) =>
                      setSettoreFilter(e?.target?.value || "tutte")
                    }
                  >
                    <option value="tutte">Tutti</option>
                    {settoriDisponibili.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="filterLabel">Dal</label>
                  <input
                    className="filterInput"
                    type="date"
                    value={fromDateFilter}
                    onChange={(e: any) =>
                      setFromDateFilter(e?.target?.value || "")
                    }
                  />
                </div>
                <div>
                  <label className="filterLabel">Al</label>
                  <input
                    className="filterInput"
                    type="date"
                    value={toDateFilter}
                    onChange={(e: any) =>
                      setToDateFilter(e?.target?.value || "")
                    }
                  />
                </div>
                <div>
                  <label className="filterLabel">Stato</label>
                  <select
                    className="filterSelect"
                    value={statoFilter}
                    onChange={(e: any) =>
                      setStatoFilter(e?.target?.value || "tutte")
                    }
                  >
                    <option value="tutte">Tutti</option>
                    {statiDisponibili.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="filterLabel">&nbsp;</label>
                  <button
                    type="button"
                    className="clearFiltersBtn"
                    disabled={!hasIntegratedFilters}
                    onClick={() => {
                      if (!hasIntegratedFilters) return;
                      resetIntegratedFilters();
                    }}
                  >
                    Pulisci filtri
                  </button>
                </div>
              </div>
              <div className="filtersSummary">
                Mostrate {mergedRecs.length} pratiche su {roleTabRecs.length}{" "}
                della scheda corrente.
              </div>
            </>
          )}

          {/* ── Tab ruolo: In attesa mia / In attesa di altri / Tutte ── */}
          {!userLoading && statoRuoloField && (
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "8px 12px",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                alignItems: "center",
                flexWrap: "nowrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  minWidth: 0,
                  flex: "1 1 auto",
                }}
              >
                {ROLE_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tabBtn ${activeRoleTab === t.id ? "active" : ""}`}
                    onClick={() => {
                      setLocalSelectedByDs({});
                      Object.keys(dsDataRef.current).forEach((id) => {
                        const e = dsDataRef.current[id];
                        if (e?.ds) tryClearSelection(e.ds);
                      });
                      filteredUseDsJs.forEach((u: any) => {
                        const dsId = String(u?.dataSourceId || "");
                        try {
                          const mainDs =
                            DataSourceManager.getInstance().getDataSource(dsId);
                          if (mainDs) tryClearSelection(mainDs);
                          const parentId =
                            (mainDs as any)?.parentDataSource?.id ||
                            (mainDs as any)?.getMainDataSource?.()?.id;
                          if (parentId) {
                            const parentDs =
                              DataSourceManager.getInstance().getDataSource(
                                parentId,
                              );
                            if (parentDs) tryClearSelection(parentDs);
                          }
                        } catch {}
                      });
                      notifySelectionCleared();
                      setActiveRoleTab(t.id);
                    }}
                  >
                    {t.label}
                    {(() => {
                      if (!activeGroup) return null;
                      if (statoRuoloField && !logLoadedRef.current) return null;
                      const svcCache = new Map<string, string>();
                      const uniq = new Map<string, DataRecord>();
                      for (const di of activeGroup.dsIndices) {
                        const dsId = String(
                          filteredUseDsJs[di]?.dataSourceId || "",
                        );
                        const entry = dsDataRef.current[dsId];
                        if (entry?.recs) {
                          for (const r of entry.recs) {
                            const k = getRecordUniqKey(r, dsId, svcCache);
                            if (!uniq.has(k)) uniq.set(k, r);
                          }
                        }
                      }
                      const all: DataRecord[] = Array.from(uniq.values());
                      const visibleForUser = all.filter((r) =>
                        isRecordVisibleForCurrentUser(r),
                      );
                      const count =
                        t.id === "tutte"
                          ? visibleForUser.length
                          : visibleForUser.filter((r) => passesRoleTab(r, t.id))
                              .length;
                      return count > 0 ? (
                        <span
                          style={{
                            marginLeft: 6,
                            background:
                              activeRoleTab === t.id
                                ? "#2f6fed"
                                : "rgba(0,0,0,0.1)",
                            color: activeRoleTab === t.id ? "#fff" : "#374151",
                            borderRadius: 999,
                            padding: "1px 7px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {count}
                        </span>
                      ) : null;
                    })()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="resetSortTabBtn"
                onClick={() => {
                  if (isCustomSort) setSortState(defaultSort);
                }}
                disabled={!isCustomSort}
                title="Ripristina ordinamento predefinito"
                aria-label="Ripristina ordinamento predefinito"
                style={{
                  width: 38,
                  minWidth: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: `1px solid ${isCustomSort ? "#2f6fed" : "rgba(0,0,0,0.14)"}`,
                  background: isCustomSort ? "#2f6fed" : "#fff",
                  color: isCustomSort ? "#fff" : "rgba(0,0,0,0.32)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1,
                  cursor: isCustomSort ? "pointer" : "not-allowed",
                  pointerEvents: isCustomSort ? "auto" : "none",
                  boxShadow: "none",
                  flex: "0 0 auto",
                  marginLeft: "auto",
                }}
              >
                ↺
              </button>
            </div>
          )}

          {/* Indicatore admin: vede tutto senza filtri */}
          {!userLoading && giiUser?.isAdmin && (
            <div
              style={{
                padding: "6px 12px",
                fontSize: 11,
                color: "#6b7280",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                background: "#fafafa",
              }}
            >
              👤 ADMIN — visualizzazione completa senza filtri ruolo
            </div>
          )}

          {/* Indicatore caricamento ruolo (visibile solo quando loggato ma ancora caricando) */}
          {userLoading && !notLogged && (
            <div
              style={{ padding: "6px 12px", fontSize: 11, color: "#6b7280" }}
            >
              Rilevamento ruolo utente…
            </div>
          )}

          {/* ── Tab bar datasource (raggruppati per etichetta) — solo se ci sono tab multiple E non ci sono tab ruolo ── */}
          {hasTabs && !statoRuoloField && (
            <div className="tabBar">
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  minWidth: 0,
                  flex: "1 1 auto",
                }}
              >
                {tabGroups.map((g, i) => (
                  <button
                    key={g.label}
                    type="button"
                    className={`tabBtn ${i === activeTab ? "active" : ""}`}
                    onClick={() => {
                      const curGroup = tabGroups[activeTab];
                      if (curGroup) {
                        curGroup.dsIndices.forEach((di) => {
                          const dsId = String(
                            filteredUseDsJs[di]?.dataSourceId || "",
                          );
                          const entry = dsDataRef.current[dsId];
                          if (entry?.ds) tryClearSelection(entry.ds);
                        });
                        notifySelectionCleared();
                        setLocalSelectedByDs((prev) => {
                          const updated = { ...prev };
                          curGroup.dsIndices.forEach((di) => {
                            delete updated[
                              String(filteredUseDsJs[di]?.dataSourceId || "")
                            ];
                          });
                          return updated;
                        });
                      }
                      setActiveTab(i);
                    }}
                    title={g.label}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Contenuto: record fusi da tutti i DS del tab attivo ── */}
          <div className="viewport">
            <div className="content">
              {anyLoading && <Loading />}

              {!anyLoading && mergedRecs.length === 0 && (
                <div className="empty">
                  {txt(cfg.emptyMessage || "Nessun record trovato.")}
                </div>
              )}

              {mergedRecs.length > 0 && (
                <>
                  {cfg.showHeader !== false && (
                    <div className="headerWrap">
                      {procGroupSpan > 0 && (
                        <div className="gridGroupHeader">
                          <div
                            className="groupHeaderCell"
                            style={{
                              gridColumn: `${procGroupStart + 1} / span ${procGroupSpan}`,
                            }}
                          >
                            <span className="groupHeaderLabel">
                              Stato e trasmissione del procedimento
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="gridHeader">
                        {columns.map((col, ci) => (
                          <Header
                            key={col.id}
                            first={ci === 0}
                            label={col.label}
                            field={col.field}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="list">
                    {mergedRecs.map((r, idx) => {
                      const d = r.getData?.() || {};
                      const recDsId = recDsLookup.get(r) || "";
                      const entryForRow = dsDataRef.current[recDsId];
                      const rowIdFieldName =
                        String(entryForRow?.ds?.getIdField?.() || "OBJECTID").trim() ||
                        "OBJECTID";
                      const oid = getRecordObjectIdValue(r, rowIdFieldName) ?? Number(d.OBJECTID);
                      const rid = String(r.getId?.() ?? oid);

                      const fp = String(fieldPratica || "").toLowerCase();
                      const pratica =
                        fp === "objectid" || fp === "oid" || fp === "object_id"
                          ? getCodPraticaDisplay(r)
                          : txt(d[fieldPratica]);
                      const dataRil = formatDateOnlyIt(
                        pickRilevazioneDateMs(d, fieldDataRil),
                      );
                      const ufficio = txt(d[fieldUfficio]);

                      const displaySintetico = computeDisplaySintetico(d);
                      const faseIstruttoria = computeFaseIstruttoria(d);
                      const originePraticaRaw =
                        d.origine_pratica ?? d.ORIGINE_PRATICA;
                      const originePraticaNum =
                        originePraticaRaw != null && originePraticaRaw !== ""
                          ? Number(originePraticaRaw)
                          : null;
                      const statoInizialeTi = normalizeMioStatoLabel(
                        txt(displaySintetico.label),
                      ).toLowerCase();
                      const isNewTiDetection =
                        originePraticaNum === 2 &&
                        !pickOfficialRapportoNumber(d) &&
                        normalizeWorkflowRole(displaySintetico.ruolo) === "TI" &&
                        (statoInizialeTi.startsWith("in carico") ||
                          statoInizialeTi.startsWith("da prendere"));

                      const statoLabel = labelNorm(txt(displaySintetico.label));
                      const statoChipNum = displaySintetico.statoForChip;

                      const ultimoMs = computeUltimoAggMs(d);
                      const ultimo = ultimoMs ? formatDateIt(ultimoMs) : "—";

                      // Colonne virtuali da LOG
                      const _logEntry = getLogForRecord(d);
                      let mittenteVal: string;
                      let destinatario: string;
                      let causaleVal: string;
                      let dataMsgVal: string;
                      if (isBozzaDeterminazioneTrasmessaRiAmm(d)) {
                        const bozzaDisplay = getBozzaDeterminazioneTrasmissionDisplay(d);
                        mittenteVal = bozzaDisplay.mittente;
                        destinatario = bozzaDisplay.destinatario;
                        causaleVal = bozzaDisplay.causale;
                        dataMsgVal = bozzaDisplay.data;
                      } else if (_logEntry) {
                        mittenteVal = formatPersona(
                          _logEntry.ruolo,
                          _logEntry.area,
                          _logEntry.settore,
                          _logEntry.utente,
                          utentiMapRef.current,
                        );
                        destinatario = _logEntry.ruoloDest
                          ? formatPersonaDest(
                              _logEntry.ruoloDest,
                              _logEntry.area,
                              _logEntry.settore,
                              _logEntry.utenteDest,
                              utentiMapRef.current,
                            )
                          : "—";
                        causaleVal = formatCausaleForLog(_logEntry, d);
                        // La data visualizzata in "Ultimo agg." segue l'ultimo
                        // movimento effettivo della pratica. Il LOG resta la fonte per
                        // Stato/Mittente/Destinatario, ma non deve bloccare la data se
                        // dopo quel LOG ci sono state prese in carico o nuove trasmissioni.
                        dataMsgVal = ultimoMs ? formatDateIt(ultimoMs) : "—";
                      } else if (!logLoadedRef.current) {
                        // Per una rilevazione appena creata dal TI il significato è già
                        // certo anche prima del caricamento del LOG: mostra subito il
                        // badge giallo, evitando una riga temporaneamente priva di colore.
                        const fallbackMs = computeUltimoAggMs(d);
                        mittenteVal = "—";
                        destinatario = "—";
                        causaleVal = isNewTiDetection
                          ? "NUOVA RILEVAZIONE"
                          : "—";
                        dataMsgVal = fallbackMs
                          ? formatDateIt(fallbackMs)
                          : "—";
                      } else if (
                        shouldUseInitialOggettoFallback(d) ||
                        isNewTiDetection
                      ) {
                        // Nessun record LOG e pratica realmente iniziale: TI auto-assegnato o TR da survey.
                        causaleVal = "NUOVA RILEVAZIONE";
                        const creator = String(
                          d.Creator ?? d.creator ?? d.CREATOR ?? "",
                        ).trim();
                        const creatorLc = creator.toLowerCase();
                        const creatorEntry =
                          utentiMapRef.current?.get(creatorLc);
                        if (creatorEntry) {
                          const aLbl =
                            creatorEntry.areaCod ||
                            (
                              { 1: "AMM", 2: "AGR", 3: "TEC" } as Record<
                                number,
                                string
                              >
                            )[creatorEntry.area ?? 0] ||
                            "";
                          const sLbl =
                            creatorEntry.settoreCod ||
                            (
                              {
                                1: "CR",
                                2: "GI",
                                3: "D1",
                                4: "D2",
                                5: "D3",
                                6: "D4",
                                7: "D5",
                                8: "D6",
                                9: "DS",
                              } as Record<number, string>
                            )[creatorEntry.settore ?? 0] ||
                            "";
                          const rLbl =
                            creatorEntry.ruoloCod ||
                            (
                              {
                                1: "TR",
                                2: "TI",
                                3: "RZ",
                                4: "RI",
                                5: "DT",
                                6: "DA",
                                7: "ADMIN",
                              } as Record<number, string>
                            )[creatorEntry.ruolo ?? 0] ||
                            "";
                          mittenteVal = formatPersona(
                            rLbl,
                            aLbl,
                            sLbl,
                            creator,
                            utentiMapRef.current,
                          );
                        } else {
                          mittenteVal = formatPersonaDisplay("", "");
                        }
                        const initialMs = computeUltimoAggMs(d);
                        dataMsgVal = initialMs ? formatDateIt(initialMs) : "—";
                        // Destinatario: TR (origine=1) → RZ del settore con nome.
                        // TI (origine=2) appena creato e non ancora trasmesso → resta presso il TI.
                        const opRaw = d.origine_pratica ?? d.ORIGINE_PRATICA;
                        const opN =
                          opRaw != null && opRaw !== "" ? Number(opRaw) : null;
                        if (
                          opN === 1 &&
                          creatorEntry &&
                          creatorEntry.area != null
                        ) {
                          const aLbl =
                            creatorEntry.areaCod ||
                            (
                              { 1: "AMM", 2: "AGR", 3: "TEC" } as Record<
                                number,
                                string
                              >
                            )[creatorEntry.area ?? 0] ||
                            "";
                          const sLbl =
                            creatorEntry.settoreCod ||
                            (
                              {
                                1: "CR",
                                2: "GI",
                                3: "D1",
                                4: "D2",
                                5: "D3",
                                6: "D4",
                                7: "D5",
                                8: "D6",
                                9: "DS",
                              } as Record<number, string>
                            )[creatorEntry.settore ?? 0] ||
                            "";
                          let rzUsername = "";
                          if (utentiMapRef.current) {
                            for (const [uname, ue] of utentiMapRef.current) {
                              if (
                                ue.ruolo === 3 &&
                                ue.area === creatorEntry.area &&
                                ue.settore === creatorEntry.settore
                              ) {
                                rzUsername = uname;
                                break;
                              }
                            }
                          }
                          destinatario = formatPersona(
                            "RZ",
                            aLbl,
                            sLbl,
                            rzUsername,
                            utentiMapRef.current,
                          );
                        } else if (opN === 2) {
                          destinatario = mittenteVal || "—";
                        } else {
                          destinatario = "—";
                        }
                      } else {
                        // Nessun LOG disponibile ma il record mostra gia' avanzamenti: evita
                        // oggetti iniziali provvisori destinati a essere sostituiti dopo il refresh.
                        mittenteVal = "—";
                        destinatario = "—";
                        causaleVal = "—";
                        dataMsgVal = "—";
                      }

                      const isSel =
                        localSelectedByDs[recDsId] === rid ||
                        (localSelectedOid != null &&
                          Number.isFinite(Number(oid)) &&
                          Number(localSelectedOid) === Number(oid));
                      const even = idx % 2 === 0;
                      const rowOggettoStyle = getOggettoAccentStyle(causaleVal);
                      const rowOggettoColor =
                        getOggettoAccentColor(causaleVal);
                      const hasOggettoBadge =
                        oggettoBadgeEnabled &&
                        causaleVal !== "—" &&
                        rowOggettoColor !== "transparent";

                      return (
                        <div
                          key={`${recDsId}_${rid}`}
                          className={`rowCard ${even ? "even" : "odd"} ${isSel ? "selected" : ""}`}
                          style={rowOggettoStyle}
                          onClick={() => {
                            setOggettoLegendInfo(null);
                            clearRestoreSelectionAfterEdit();
                            if (isSel) {
                              // Deseleziona su TUTTI i DS
                              setLocalSelectedByDs({});
                              setLocalSelectedOid(null);
                              Object.keys(dsDataRef.current).forEach((id) => {
                                const e = dsDataRef.current[id];
                                if (e?.ds) tryClearSelection(e.ds);
                              });
                              // Deseleziona anche su tutti i DS parent via DataSourceManager
                              filteredUseDsJs.forEach((u: any) => {
                                const dsId = String(u?.dataSourceId || "");
                                try {
                                  const mainDs =
                                    DataSourceManager.getInstance().getDataSource(
                                      dsId,
                                    );
                                  if (mainDs) tryClearSelection(mainDs);
                                  const parentId =
                                    (mainDs as any)?.parentDataSource?.id ||
                                    (mainDs as any)?.getMainDataSource?.()?.id;
                                  if (parentId) {
                                    const parentDs =
                                      DataSourceManager.getInstance().getDataSource(
                                        parentId,
                                      );
                                    if (parentDs) tryClearSelection(parentDs);
                                  }
                                } catch {}
                              });
                              notifySelectionCleared();
                            } else {
                              // Pulisci tutte le selezioni precedenti su tutti i DS
                              Object.keys(dsDataRef.current).forEach((id) => {
                                const e = dsDataRef.current[id];
                                if (e?.ds) tryClearSelection(e.ds);
                              });
                              notifySelectionCleared();
                              // Seleziona questo record sul suo DS nativo
                              setLocalSelectedByDs({ [recDsId]: rid });
                              setLocalSelectedOid(Number.isFinite(Number(oid)) ? Number(oid) : null);
                              const entry = dsDataRef.current[recDsId];
                              if (entry?.ds) trySelectRecord(entry.ds, r, rid);
                              // Notifica azioni del record selezionato
                              try {
                                const idFieldName = String(
                                  entry?.ds?.getIdField?.() || "OBJECTID",
                                );
                                const oidVal = Number(
                                  getRecordObjectIdValue(r, idFieldName, rid) ?? rid,
                                );
                                if (Number.isFinite(oidVal)) {
                                  publishRuntimeSelection({
                                    oid: oidVal,
                                    layerUrl: resolvedView?.layerUrl || recDsId,
                                    serviceUrl:
                                      resolvedView?.serviceUrl || recDsId,
                                    idFieldName,
                                    viewName:
                                      resolvedView?.viewName ||
                                      getDsLabel(
                                        { __label: "" },
                                        "Vista runtime",
                                      ),
                                    data: r.getData?.() || {},
                                  });
                                } else {
                                  notifySelectionCleared();
                                }
                              } catch {
                                notifySelectionCleared();
                              }

                              // Propaga: forza setSelectedRecords con lo stesso record
                              // su TUTTI i DS del gruppo (ExB usa l'interfaccia DataRecord)
                              if (activeGroup) {
                                activeGroup.dsIndices.forEach((di) => {
                                  const otherId = String(
                                    filteredUseDsJs[di]?.dataSourceId || "",
                                  );
                                  if (otherId === recDsId) return;
                                  const otherEntry = dsDataRef.current[otherId];
                                  if (otherEntry?.ds) {
                                    try {
                                      (
                                        otherEntry.ds as any
                                      ).setSelectedRecords?.([r]);
                                    } catch {}
                                    try {
                                      (
                                        otherEntry.ds as any
                                      ).selectRecordsByIds?.([rid]);
                                    } catch {}
                                  }
                                  // Anche sul parent DS (il feature layer principale)
                                  try {
                                    const mainDs =
                                      DataSourceManager.getInstance().getDataSource(
                                        otherId,
                                      );
                                    const parentDs =
                                      (mainDs as any)?.parentDataSource ||
                                      (mainDs as any)?.getMainDataSource?.();
                                    if (parentDs) {
                                      try {
                                        parentDs.setSelectedRecords?.([r]);
                                      } catch {}
                                    }
                                  } catch {}
                                });
                              }
                            }
                          }}
                        >
                          {hasOggettoBadge && (
                            <button
                              type="button"
                              className="objectAccentBtn"
                              aria-label={`Significato del colore: ${normalizeOggettoLabel(causaleVal)}`}
                              onMouseEnter={(event) => {
                                showOggettoLegend(
                                  event.currentTarget,
                                  causaleVal,
                                  rowOggettoColor,
                                );
                              }}
                              onMouseLeave={hideOggettoLegend}
                              onFocus={(event) => {
                                showOggettoLegend(
                                  event.currentTarget,
                                  causaleVal,
                                  rowOggettoColor,
                                );
                              }}
                              onBlur={hideOggettoLegend}
                              onTouchStart={(event) => {
                                event.stopPropagation();
                                showOggettoLegend(
                                  event.currentTarget,
                                  causaleVal,
                                  rowOggettoColor,
                                  true,
                                );
                              }}
                              onMouseDown={(event) => {
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            />
                          )}
                          {columns.map((col, ci) => {
                            const f = col.field;
                            if (f === V_STATO) {
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={statoLabel}
                                >
                                  <span
                                    className="chip"
                                    style={getChipStyleByLabel(statoLabel)}
                                  >
                                    {statoLabel}
                                  </span>
                                </div>
                              );
                            }
                            if (f === V_FASE) {
                              const faseLabel = String(
                                faseIstruttoria || "",
                              ).toUpperCase();
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={faseLabel}
                                >
                                  {faseLabel}
                                </div>
                              );
                            }
                            if (f === V_TIPO_PRATICA) {
                              const val = getTipoPraticaDisplay(r);
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={val}
                                >
                                  {val}
                                </div>
                              );
                            }
                            if (f === V_NUMERO_RILEVAZIONE) {
                              const val = getRilevazioneDisplay(r);
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={val}
                                >
                                  {val}
                                </div>
                              );
                            }
                            if (f === V_NUMERO_PRATICA) {
                              const val = getNumeroRapportoDisplay(r);
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={val}
                                >
                                  {val}
                                </div>
                              );
                            }
                            if (isNumeroAttoVirtualField(f)) {
                              const val = getNumeroVerbaleDisplay(r);
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={val}
                                >
                                  {val}
                                </div>
                              );
                            }
                            if (f === V_ULTIMO) {
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={ultimo}
                                >
                                  {ultimo}
                                </div>
                              );
                            }
                            if (f === V_PROSSIMA) {
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={getPersonaDisplayTitle(destinatario)}
                                >
                                  <PersonaCell value={destinatario} />
                                </div>
                              );
                            }
                            if (f === V_MITTENTE) {
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={getPersonaDisplayTitle(mittenteVal)}
                                >
                                  <PersonaCell value={mittenteVal} />
                                </div>
                              );
                            }
                            if (f === V_CAUSALE) {
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={causaleVal}
                                >
                                  {causaleVal}
                                </div>
                              );
                            }
                            if (f === V_DATA_MSG) {
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={dataMsgVal}
                                >
                                  {dataMsgVal}
                                </div>
                              );
                            }
                            const fl = f.toLowerCase();
                            if (
                              fl === "objectid" ||
                              fl === "oid" ||
                              fl === "object_id"
                            ) {
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={pratica}
                                >
                                  {pratica}
                                </div>
                              );
                            }
                            if (fl === "area" || fl === "area_cod") {
                              const val = getAreaDisplayFromRecord(
                                d,
                                giiUser?.areaCod || giiUser?.area,
                                domainLabels,
                              );
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={val}
                                >
                                  {val}
                                </div>
                              );
                            }
                            if (
                              fl === "settore" ||
                              fl === "settore_cod" ||
                              fl === "id_settore"
                            ) {
                              const val = getSettoreDisplayFromRecord(
                                d,
                                giiUser?.settoreCod || giiUser?.settore,
                                domainLabels,
                              );
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={val}
                                >
                                  {val}
                                </div>
                              );
                            }
                            if (
                              fl.startsWith("data_") ||
                              fl.startsWith("dt_")
                            ) {
                              const isRilDate =
                                fl ===
                                  String(
                                    fieldDataRil || "data_rilevazione",
                                  ).toLowerCase() || fl === "data_rilevazione";
                              const val = isRilDate
                                ? formatDateOnlyIt(
                                    pickRilevazioneDateMs(d, fieldDataRil),
                                  )
                                : formatDateIt(d[f]);
                              return (
                                <div
                                  key={col.id}
                                  className={ci === 0 ? "cell first" : "cell"}
                                  title={val}
                                >
                                  {val}
                                </div>
                              );
                            }
                            const val = txt(d[f]);
                            return (
                              <div
                                key={col.id}
                                className={ci === 0 ? "cell first" : "cell"}
                                title={val}
                              >
                                {val}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {oggettoLegendInfo &&
        (() => {
          const tooltipWidth = 360;
          const tooltipHeight = 150;
          const viewportWidth =
            typeof window !== "undefined" ? window.innerWidth : 1280;
          const viewportHeight =
            typeof window !== "undefined" ? window.innerHeight : 720;
          const left = Math.max(
            12,
            Math.min(
              oggettoLegendInfo.x,
              viewportWidth - tooltipWidth - 12,
            ),
          );
          const top = Math.max(
            12,
            Math.min(
              oggettoLegendInfo.y,
              viewportHeight - tooltipHeight - 12,
            ),
          );
          return (
            <div
              role="tooltip"
              aria-live="polite"
              style={{
                position: "fixed",
                left,
                top,
                width: tooltipWidth,
                maxWidth: "calc(100vw - 24px)",
                padding: "12px 14px",
                borderRadius: 9,
                border: "1px solid rgba(17, 24, 39, 0.18)",
                background: "#ffffff",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.22)",
                color: "#111827",
                zIndex: 2147483647,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 11,
                    height: 34,
                    borderRadius: 4,
                    background: oggettoLegendInfo.color,
                    border: "1px solid rgba(17, 24, 39, 0.16)",
                    flex: "0 0 auto",
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      marginBottom: 2,
                    }}
                  >
                    STATO DEL PROCEDIMENTO ISTRUTTORIO
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      marginBottom: 6,
                    }}
                  >
                    {oggettoLegendInfo.label}
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.45 }}>
                    {oggettoLegendInfo.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      {elencoSidebarReady &&
        (() => {
          const splitterW = 14;
          const splitterLineStyle: React.CSSProperties = {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 2,
            borderRadius: 999,
            background: "#3d77c9",
            zIndex: 2147483646,
          };
          const resetBtnStyle: React.CSSProperties = {
            position: "absolute",
            top: 6,
            right: -25,
            width: 28,
            height: 28,
            borderRadius: 999,
            border: `1px solid ${elencoSidebarDirty ? "#ffd700" : "#aac4e0"}`,
            background: elencoSidebarDirty ? "#ffd700" : "#fff",
            color: elencoSidebarDirty ? "#000" : "#8aa4bf",
            cursor: elencoSidebarDirty ? "pointer" : "default",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            lineHeight: 1,
            padding: 0,
            opacity: elencoSidebarDirty ? 1 : 0.75,
            zIndex: 2147483647,
            boxShadow: elencoSidebarDirty ? "0 1px 4px rgba(0,0,0,0.20)" : "none",
          };
          const fire = (
            target: EventTarget,
            type: string,
            x: number,
            y: number,
            buttons: number,
          ) => {
            const opts = {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              screenX: x,
              screenY: y,
              button: 0,
              buttons,
            };
            try {
              target.dispatchEvent(
                new PointerEvent(type, {
                  ...opts,
                  pointerId: 1,
                  pointerType: "mouse",
                  isPrimary: true,
                }),
              );
            } catch {}
            try {
              target.dispatchEvent(
                new MouseEvent(type.replace("pointer", "mouse"), opts),
              );
            } catch {}
          };
          const handleElencoSidebarReset = (e: React.SyntheticEvent): void => {
            e.preventDefault();
            e.stopPropagation();
            if (!elencoSidebarDirty || elencoSidebarAutoResettingRef.current) return;
            const target = giiReadNearestLayoutSidebarDefaultBoundaryX(
              elencoSidebarHostRef.current,
            );
            if (target == null) return;
            elencoSidebarAutoResettingRef.current = true;
            giiMoveNearestLayoutSidebarToX(
              elencoSidebarHostRef.current,
              target,
            );
            window.setTimeout(() => {
              elencoSidebarAutoResettingRef.current = false;
              setElencoSidebarDirty(false);
            }, 450);
          };
          const stopElencoSidebarResetEvent = (e: React.SyntheticEvent): void => {
            e.preventDefault();
            e.stopPropagation();
          };
          return (
            <>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: -18,
                  width: splitterW,
                  cursor: "col-resize",
                  userSelect: "none",
                  touchAction: "none",
                  zIndex: 2147483646,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const divider = elencoSidebarDividerRef.current;
                  if (!divider) return;
                  elencoSidebarUserDraggingRef.current = true;
                  document.body.style.cursor = "col-resize";
                  fire(divider, "pointerdown", e.clientX, e.clientY, 1);
                  const onMove = (me: MouseEvent) => {
                    fire(document, "pointermove", me.clientX, me.clientY, 1);
                  };
                  const onUp = (me: MouseEvent) => {
                    fire(document, "pointerup", me.clientX, me.clientY, 0);
                    elencoSidebarUserDraggingRef.current = false;
                    document.body.style.cursor = "";
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                    window.setTimeout(() => {
                      const host = elencoSidebarHostRef.current;
                      const target =
                        giiReadNearestLayoutSidebarDefaultBoundaryX(host);
                      const x = giiReadNearestLayoutSidebarBoundaryX(host);
                      if (target != null && x != null) {
                        setElencoSidebarDirty(
                          Math.abs(Number(x) - Number(target)) > 2,
                        );
                      }
                    }, 120);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
                title="Ridimensiona pannelli"
              >
                <div style={splitterLineStyle} />
              </div>
              <button
                type="button"
                style={resetBtnStyle}
                onPointerDown={handleElencoSidebarReset}
                onMouseDown={stopElencoSidebarResetEvent}
                onClick={handleElencoSidebarReset}
                aria-disabled={!elencoSidebarDirty}
                title="Ripristina larghezza pannelli"
                aria-label="Ripristina larghezza pannelli"
              >
                ↔
              </button>
            </>
          );
        })()}
    </div>
  );
}
