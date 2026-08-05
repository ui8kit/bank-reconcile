<script lang="ts">
  import { onMount } from "svelte"
  import { CheckCircle2, Languages, Moon, Sun } from "lucide-svelte"
  import Badge from "$lib/ui8kit/ui/badge/Badge.svelte"
  import Button from "$lib/ui8kit/ui/button/Button.svelte"
  import Text from "$lib/ui8kit/ui/text/Text.svelte"
  import SiteFooter from "$lib/components/SiteFooter.svelte"
  import {
    downloadUnmatchedCsv,
    listAdapters,
    runReconcile,
    type LedgerRow,
    type ReconcileResult,
  } from "$lib/reconcile"
  import { amountLocale, getDict, nextLocale, type Locale } from "$lib/i18n"
  import {
    applyTheme,
    readStoredAdapter,
    readStoredLocale,
    readStoredTheme,
    storeAdapter,
    storeLocale,
    type StoredAdapterChoice,
    type ThemeMode,
  } from "$lib/prefs"

  let locale = $state<Locale>("en")
  let theme = $state<ThemeMode>("dark")
  let adapterChoice = $state<StoredAdapterChoice>("auto")
  let bankFile = $state<File | null>(null)
  let incomeFile = $state<File | null>(null)
  let expenseFile = $state<File | null>(null)
  let busy = $state(false)
  let error = $state<string | null>(null)
  let result = $state<ReconcileResult | null>(null)
  let counts = $state<Record<string, number> | null>(null)
  let adapterUsed = $state<string | null>(null)

  const t = $derived(getDict(locale))
  const adapterOptions = $derived([
    { value: "auto", label: t.adapterAuto },
    ...listAdapters().map((a) => ({
      value: a.id,
      label:
        a.id === "psb"
          ? t.adapterPsb
          : a.id === "alexs"
            ? t.adapterAlexs
            : a.id === "generic"
              ? t.adapterGeneric
              : a.label,
    })),
  ])
  const canRun = $derived(
    Boolean(bankFile && incomeFile && expenseFile) && !busy,
  )
  const hasResults = $derived(Boolean(counts && result))

  onMount(() => {
    theme = readStoredTheme("dark")
    applyTheme(theme)
    locale = readStoredLocale()
    storeLocale(locale)
    adapterChoice = readStoredAdapter()
  })

  $effect(() => {
    document.title = t.appTitle
  })

  $effect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0a0e14" : "#001f3d")
  })

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark"
    applyTheme(theme)
  }

  function toggleLocale() {
    locale = nextLocale(locale)
    storeLocale(locale)
  }

  function pick(kind: "bank" | "income" | "expense", files: FileList | null) {
    const file = files?.[0] ?? null
    if (kind === "bank") bankFile = file
    if (kind === "income") incomeFile = file
    if (kind === "expense") expenseFile = file
    result = null
    counts = null
    adapterUsed = null
    error = null
  }

  function onAdapterChange(value: string) {
    adapterChoice = value
    storeAdapter(value)
    result = null
    counts = null
    adapterUsed = null
    error = null
  }

  function fmtAmount(n: number): string {
    return n.toLocaleString(amountLocale(locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  async function onMatch() {
    if (!bankFile || !incomeFile || !expenseFile) return
    busy = true
    error = null
    result = null
    counts = null
    adapterUsed = null
    try {
      const out = await runReconcile(
        {
          bank: bankFile,
          income: incomeFile,
          expense: expenseFile,
        },
        { adapter: adapterChoice },
      )
      result = out.result
      counts = out.counts
      adapterUsed = out.adapterId
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    } finally {
      busy = false
    }
  }

  function onCsv() {
    if (!result) return
    downloadUnmatchedCsv(result)
  }

  function clearBrowser() {
    bankFile = null
    incomeFile = null
    expenseFile = null
    result = null
    counts = null
    adapterUsed = null
    error = null
    busy = false
    for (const id of ["bank-file", "income-file", "expense-file"]) {
      const input = document.getElementById(id)
      if (input instanceof HTMLInputElement) input.value = ""
    }
  }

  function adapterLabel(id: string | null): string {
    if (!id) return ""
    if (id === "psb") return t.adapterPsb
    if (id === "alexs") return t.adapterAlexs
    if (id === "generic") return t.adapterGeneric
    return listAdapters().find((a) => a.id === id)?.label ?? id
  }
</script>

{#snippet uploadCard(
  id: string,
  step: number,
  label: string,
  kind: "bank" | "income" | "expense",
  file: File | null,
)}
  <li class="step" class:step--ready={Boolean(file)}>
    <div class="step__rail" aria-hidden="true">
      <span class="step__node">{step}</span>
    </div>
    <label class="step__card" for={id}>
      <input
        id={id}
        class="step__input"
        type="file"
        accept=".pdf,.csv,.tsv,.txt,.ods,application/pdf,text/csv,text/plain,application/vnd.oasis.opendocument.spreadsheet"
        onchange={(e) => pick(kind, (e.currentTarget as HTMLInputElement).files)}
      />
      <div class="step__meta">
        <span class="step__label">{label}</span>
        {#if file}
          <span class="step__name" title={file.name}>{file.name}</span>
        {:else}
          <span class="step__hint">
            {t.uploadEmpty}<span class="step__sep">·</span>{t.uploadHint}
          </span>
        {/if}
      </div>
      <div class="step__status" aria-hidden="true">
        {#if file}
          <CheckCircle2 class="step__check" size={16} strokeWidth={2.25} />
          <span class="step__ready">{t.uploadReady}</span>
        {:else}
          <span class="step__dot"></span>
        {/if}
      </div>
    </label>
  </li>
{/snippet}

{#snippet rowsTable(title: string, rows: LedgerRow[])}
  <section class="results">
    <h2>{title} ({rows.length})</h2>
    {#if rows.length === 0}
      <p class="empty">{t.empty}</p>
    {:else}
      <div class="table-wrap">
        <table class="ledger">
          <thead>
            <tr>
              <th>{t.colDate}</th>
              <th>{t.colAmount}</th>
              <th>{t.colPurpose}</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row (row.id)}
              <tr>
                <td class="num">{row.date}</td>
                <td class="num">{fmtAmount(row.amount)}</td>
                <td>{row.purpose}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
{/snippet}

<div class="shell">
  <header class="chrome">
    <div class="chrome__actions">
      <Button
        variant="ghost"
        size="icon"
        class="chrome__btn"
        type="button"
        aria-label={t.toggleLocale}
        title={t.toggleLocale}
        onclick={toggleLocale}
      >
        <Languages size={18} strokeWidth={2} />
        <span class="chrome__locale">{t.localeLabel}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="chrome__btn"
        type="button"
        aria-label={theme === "dark" ? t.toggleThemeLight : t.toggleThemeDark}
        title={theme === "dark" ? t.toggleThemeLight : t.toggleThemeDark}
        onclick={toggleTheme}
      >
        {#if theme === "dark"}
          <Sun size={18} strokeWidth={2} />
        {:else}
          <Moon size={18} strokeWidth={2} />
        {/if}
      </Button>
    </div>
  </header>

  <main class="page" class:page--results={hasResults}>
    <div class="page__stack">
      <header class="hero">
        <Text tag="h1" class="page__title">{t.appTitle}</Text>
        <Text class="page__lead">{t.appLead}</Text>
      </header>

      <label class="adapter">
        <span class="adapter__label">{t.adapterLabel}</span>
        <select
          class="adapter__select"
          value={adapterChoice}
          onchange={(e) => onAdapterChange((e.currentTarget as HTMLSelectElement).value)}
        >
          {#each adapterOptions as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </label>

      <ol class="steps">
        {@render uploadCard("bank-file", 1, t.uploadBank, "bank", bankFile)}
        {@render uploadCard("income-file", 2, t.uploadIncome, "income", incomeFile)}
        {@render uploadCard("expense-file", 3, t.uploadExpense, "expense", expenseFile)}
      </ol>

      <div class="actions">
        {#if hasResults}
          <Button variant="destructive" size="default" onclick={clearBrowser}>
            {t.clear}
          </Button>
        {:else}
          <Button variant="default" size="default" disabled={!canRun} onclick={onMatch}>
            {busy ? t.matching : t.match}
          </Button>
        {/if}
        <Button
          variant="outline"
          size="default"
          disabled={!result}
          onclick={onCsv}
        >
          {t.downloadCsv}
        </Button>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      {#if counts && result}
        <div class="stats">
          {#if adapterUsed}
            <Badge variant="outline">{t.adapterUsed}: {adapterLabel(adapterUsed)}</Badge>
          {/if}
          <Badge variant="secondary">{t.statBank} {counts.bank}</Badge>
          <Badge variant="secondary">{t.statIncome} {counts.income}</Badge>
          <Badge variant="secondary">{t.statExpense} {counts.expense}</Badge>
          <Badge variant="default">{t.statMatched} {counts.matched}</Badge>
          <Badge variant="destructive">{t.statUnmatchedBank} {counts.unmatchedBank}</Badge>
          <Badge variant="outline">{t.statUnmatchedIncome} {counts.unmatchedIncome}</Badge>
          <Badge variant="outline">{t.statUnmatchedExpense} {counts.unmatchedExpense}</Badge>
        </div>

        {@render rowsTable(t.unmatchedBank, result.unmatchedBank)}
        {@render rowsTable(t.unmatchedIncome, result.unmatchedIncome)}
        {@render rowsTable(t.unmatchedExpense, result.unmatchedExpense)}

        {#if result.matched.length > 0}
          <section class="results">
            <h2>{t.matched} ({result.matched.length})</h2>
            <div class="table-wrap">
              <table class="ledger">
                <thead>
                  <tr>
                    <th>{t.colBankDate}</th>
                    <th>{t.colBankAmount}</th>
                    <th>{t.colReport}</th>
                    <th>{t.colScore}</th>
                    <th>{t.colWhy}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each result.matched as pair (`${pair.bank.id}-${pair.report.id}`)}
                    <tr>
                      <td class="num">{pair.bank.date}</td>
                      <td class="num">{fmtAmount(pair.bank.amount)}</td>
                      <td>{pair.report.side}: {pair.report.purpose}</td>
                      <td class="num">{pair.score}</td>
                      <td>{pair.reasons.join(" · ")}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </section>
        {/if}
      {/if}
    </div>

    <SiteFooter
      privacyNote={t.privacyNote}
      madeWith={t.madeWith}
      madeIn={t.madeIn}
      docsLabel={t.docsLabel}
    />
  </main>
</div>
