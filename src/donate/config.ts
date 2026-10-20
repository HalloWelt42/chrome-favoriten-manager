/** Spendenwege. Einzige Stelle für Adressen und Verweise. */

export interface CryptoOption {
  id: 'btc' | 'doge' | 'eth';
  label: string;
  symbol: string;
  address: string;
  qr: string;
}

export const KOFI_URL = 'https://ko-fi.com/HalloWelt42';

export const CRYPTO: readonly CryptoOption[] = [
  { id: 'btc', label: 'Bitcoin (BTC)', symbol: '₿', address: 'bc1qnd599khdkv3v3npmj9ufxzf6h4fzanny2acwqr', qr: '../assets/donate/btc-qr.svg' },
  { id: 'doge', label: 'Dogecoin (DOGE)', symbol: 'Ð', address: 'DL7tuiYCqm3xQjMDXChdxeQxqUGMACn1ZV', qr: '../assets/donate/doge-qr.svg' },
  { id: 'eth', label: 'Ethereum (ETH)', symbol: 'Ξ', address: '0x8A28fc47bFFFA03C8f685fa0836E2dBe1CA14F27', qr: '../assets/donate/eth-qr.svg' }
];
