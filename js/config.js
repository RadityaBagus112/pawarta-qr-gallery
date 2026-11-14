// js/config.js
export const APP_CONFIG = {
  // 1. Konfigurasi Firebase Realtime Database (Nanti tinggal tempel dari Firebase Console)
  firebaseConfig: {
    apiKey: "AIzaSyC0mE9VRPgYvtf3GQd5sO3cWrioL6UTrhc",
    authDomain: "pawarta-gallery.firebaseapp.com",
    databaseURL: "https://pawarta-gallery-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pawarta-gallery",
    storageBucket: "pawarta-gallery.firebasestorage.app",
    messagingSenderId: "490686223017",
    appId: "1:490686223017:web:5b7446fb5049cdf4da0fb8"
  },

  // 2. Endpoint Cloudflare Worker untuk upload ke R2 (Sudah terisi URL milikmu)
  r2WorkerUrl: "https://pawarta-upload.businessraditya.workers.dev",

  // 3. Endpoint Google Apps Script untuk Auto-Sync ke Google Drive (Sudah terisi URL milikmu)
  googleDriveWebhookUrl: "https://script.google.com/macros/s/AKfycbzEX4rro6kYMnpMMO5yQb4FYOyGWVNoBUgBUfo1NKEG9-n6Gm2Vpn7hs8ySiBdMPbs/exec",

  // 4. Aturan Paket Kuota Foto per Tamu
  packages: {
    standard: { name: "Paket Standar", maxPhotos: 3, maxDimension: 1440, quality: 0.80 },
    plus:     { name: "Paket Plus",    maxPhotos: 5, maxDimension: 1600, quality: 0.84 },
    max:      { name: "Paket Max",     maxPhotos: 10, maxDimension: 1920, quality: 0.88 }
  },

  // Default acara (jika dibuka tanpa parameter URL ?e=nama-acara)
  defaultEventSlug: "andi-sinta-2026"
};