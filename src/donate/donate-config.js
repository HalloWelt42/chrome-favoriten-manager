/**
 * FavGrid Spenden-Konfiguration
 * Basiert auf SPENDEN-KONZEPT.md v2.1
 * Ko-fi + Crypto (BTC, DOGE, ETH) – kein PayPal
 */
const DONATE_CONFIG = {
  kofi: "https://ko-fi.com/HalloWelt42",

  crypto: {
    btc: {
      label: "Bitcoin (BTC)",
      address: "bc1qnd599khdkv3v3npmj9ufxzf6h4fzanny2acwqr",
      qrFile: "../../assets/donate/btc-qr.svg"
    },
    doge: {
      label: "Dogecoin (DOGE)",
      address: "DL7tuiYCqm3xQjMDXChdxeQxqUGMACn1ZV",
      qrFile: "../../assets/donate/doge-qr.svg"
    },
    eth: {
      label: "Ethereum (ETH)",
      address: "0x8A28fc47bFFFA03C8f685fa0836E2dBe1CA14F27",
      qrFile: "../../assets/donate/eth-qr.svg"
    }
  },

  author: "HalloWelt42"
};
