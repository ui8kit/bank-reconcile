<script lang="ts">
  import { onMount } from "svelte"
  import { Languages, Moon, Sun } from "lucide-svelte"
  import Button from "$lib/ui8kit/ui/button/Button.svelte"
  import Text from "$lib/ui8kit/ui/text/Text.svelte"
  import SiteFooter from "$lib/components/SiteFooter.svelte"
  import { getDict, nextLocale, type Locale } from "$lib/i18n"
  import {
    applyTheme,
    readStoredLocale,
    readStoredTheme,
    storeLocale,
    type ThemeMode,
  } from "$lib/prefs"

  let locale = $state<Locale>("en")
  let theme = $state<ThemeMode>("dark")
  const t = $derived(getDict(locale))

  onMount(() => {
    theme = readStoredTheme("dark")
    applyTheme(theme)
    locale = readStoredLocale()
    storeLocale(locale)
  })

  $effect(() => {
    document.title = t.docsTitle
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

  let copied = $state(false)
  let copyTimer: ReturnType<typeof setTimeout> | null = null

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(t.docsPrompt)
      copied = true
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => {
        copied = false
      }, 1600)
    } catch {
      copied = false
    }
  }
</script>

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

  <main class="page page--docs">
    <article class="page__stack docs">
      <header class="hero">
        <Text tag="h1" class="page__title">{t.docsTitle}</Text>
        <Text class="page__lead">{t.docsLead}</Text>
      </header>

      <section class="docs__section">
        <h2 class="docs__h">{t.docsHowTitle}</h2>
        <ol class="docs__list">
          <li>{t.docsStep1}</li>
          <li>{t.docsStep2}</li>
          <li>{t.docsStep3}</li>
          <li>{t.docsStep4}</li>
        </ol>
      </section>

      <section class="docs__section">
        <h2 class="docs__h">{t.docsMatchTitle}</h2>
        <p class="docs__p">{t.docsMatchBody}</p>
      </section>

      <section class="docs__section">
        <h2 class="docs__h">{t.docsSamplesTitle}</h2>
        <p class="docs__p">{t.docsSamplesBody}</p>
        <ul class="docs__links">
          <li>
            <a
              class="docs__link"
              href="https://github.com/ui8kit/bank-reconcile/tree/main/public/samples"
              target="_blank"
              rel="noopener noreferrer"
            >public/samples</a>
            <span class="docs__hint">{t.docsSamplesHint}</span>
          </li>
          <li>
            <a
              class="docs__link"
              href="https://github.com/ui8kit/bank-reconcile/tree/main/public/examples"
              target="_blank"
              rel="noopener noreferrer"
            >public/examples</a>
            <span class="docs__hint">{t.docsExamplesHint}</span>
          </li>
        </ul>
      </section>

      <section class="docs__section">
        <h2 class="docs__h">{t.docsPromptTitle}</h2>
        <p class="docs__p">{t.docsPromptBody}</p>
        <ul class="docs__list docs__list--tips">
          <li>{t.docsPromptTip1}</li>
          <li>{t.docsPromptTip2}</li>
          <li>{t.docsPromptTip3}</li>
        </ul>
        <div class="docs__prompt">
          <pre class="docs__prompt-code">{t.docsPrompt}</pre>
          <button
            type="button"
            class="docs__prompt-copy"
            onclick={copyPrompt}
          >
            {copied ? t.docsPromptCopied : t.docsPromptCopy}
          </button>
        </div>
      </section>

      <p class="docs__back">
        <a class="docs__link" href="/">{t.docsBack}</a>
      </p>
    </article>

    <SiteFooter
      privacyNote={t.privacyNote}
      madeWith={t.madeWith}
      madeIn={t.madeIn}
      docsLabel={t.docsLabel}
    />
  </main>
</div>
