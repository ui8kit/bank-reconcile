<script lang="ts">
  import { Heart } from "lucide-svelte"

  type Props = {
    privacyNote: string
    madeWith: string
    madeIn: string
    docsLabel: string
  }

  let { privacyNote, madeWith, madeIn, docsLabel }: Props = $props()
</script>

<footer class="site-footer">
  <p class="site-footer__note">{privacyNote}</p>
  <p class="site-footer__made">
    {madeWith}
    <Heart class="site-footer__heart" size={12} strokeWidth={2} fill="currentColor" aria-hidden="true" />
    {madeIn}
    <a
      class="site-footer__link"
      href="https://github.com/ui8kit/bank-reconcile"
      target="_blank"
      rel="noopener noreferrer"
    >UI8Kit</a>
    <span class="site-footer__sep" aria-hidden="true">|</span>
    <a class="site-footer__link" href="/docs/">{docsLabel}</a>
  </p>
</footer>
