<script lang="ts">
  import { t } from '../i18n';
  import Segmented from '../ui/Segmented.svelte';
  import { CRYPTO, KOFI_URL, type CryptoOption } from './config';

  let selected = $state<CryptoOption['id']>('btc');
  let copied = $state(false);
  const coin = $derived(CRYPTO.find((c) => c.id === selected)!);

  document.title = t('donatePageTitle');

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(coin.address);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<main class="donate">
  <header>
    <img src="../assets/icons/icon-128.png" alt="" />
    <h1>{t('donateTitle')}</h1>
    <p>{t('donateDesc')}</p>
  </header>

  <a class="kofi" href={KOFI_URL} target="_blank" rel="noopener">
    <i class="fa-solid fa-mug-hot" aria-hidden="true"></i>
    <span>{t('kofiButton')}</span>
  </a>

  <p class="label">{t('orCrypto')}</p>
  <Segmented label={t('orCrypto')} value={selected} options={CRYPTO.map((c) => ({ value: c.id, label: `${c.symbol} ${c.label}` }))} onchange={(v) => (selected = v)} />

  <div class="crypto">
    <img class="qr" src={coin.qr} alt={coin.label} />
    <div class="details">
      <p class="name">{coin.label}</p>
      <p class="address">{coin.address}</p>
      <button class="copy" onclick={copy}>
        <i class={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} aria-hidden="true"></i>
        {copied ? t('copied') : t('copyAddress')}
      </button>
    </div>
  </div>

  <p class="footer">{t('donateFooter')}</p>
</main>

<style>
  :global(body) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .donate {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(520px, 100%);
    margin: 24px;
    padding: 28px;
    border-radius: var(--radius-l);
    background: var(--surface-solid);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
  }

  header {
    text-align: center;
  }

  header img {
    width: 64px;
    height: 64px;
  }

  h1 {
    margin: 10px 0 6px;
    font-size: var(--fs-title);
  }

  header p {
    margin: 0;
    color: var(--text-muted);
  }

  .kofi {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px;
    border-radius: var(--radius-m);
    background: #ff5e5b;
    color: #fff;
    font-weight: 600;
    text-decoration: none;
  }

  .kofi:hover {
    background: #ff4442;
  }

  .label {
    margin: 4px 0 0;
    color: var(--text-muted);
  }

  .crypto {
    display: flex;
    gap: 18px;
    align-items: center;
  }

  .qr {
    width: 140px;
    height: 140px;
    padding: 8px;
    border-radius: var(--radius-m);
    background: #fff;
  }

  .details {
    min-width: 0;
  }

  .name {
    margin: 0 0 6px;
    font-weight: 600;
  }

  .address {
    margin: 0 0 10px;
    word-break: break-all;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
    font-size: var(--fs-small);
  }

  .copy {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line-strong);
    background: var(--surface-raised);
  }

  .footer {
    margin: 0;
    text-align: center;
    color: var(--text-muted);
  }
</style>
