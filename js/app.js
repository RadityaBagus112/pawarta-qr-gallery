// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { APP_CONFIG } from "./config.js";
import { compressWeddingPhoto } from "./compressor.js";

// 1. Inisialisasi Firebase
const app = initializeApp(APP_CONFIG.firebaseConfig);
const db = getDatabase(app);

// 2. Ambil Event Slug dari URL (?e=andi-sinta-2026)
const urlParams = new URLSearchParams(window.location.search);
const eventSlug = urlParams.get("e") || APP_CONFIG.defaultEventSlug;

// State Global Acara & Tamu
let currentEventConfig = {
  title: "The Wedding of Andi & Sinta",
  packageTier: "standard", // 'standard' (3), 'plus' (5), 'max' (10)
  driveFolderId: "",
  active: true
};
let preparedPhotos = null;

// Elemen DOM
const cameraFlash = document.getElementById("cameraFlash");
const btnCamera = document.getElementById("btnCamera");
const btnGalleryPicker = document.getElementById("btnGalleryPicker");
const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const uploadModal = document.getElementById("uploadModal");
const previewImg = document.getElementById("previewImg");
const compressionInfo = document.getElementById("compressionInfo");
const guestNameInput = document.getElementById("guestNameInput");
const guestCaptionInput = document.getElementById("guestCaptionInput");
const btnCancelUpload = document.getElementById("btnCancelUpload");
const btnCloseX = document.getElementById("btnCloseX");
const btnConfirmUpload = document.getElementById("btnConfirmUpload");
const galleryGrid = document.getElementById("galleryGrid");
const totalPhotosLabel = document.getElementById("totalPhotosLabel");
const quotaPill = document.getElementById("quotaPill");
const quotaHintText = document.getElementById("quotaHintText");
const eventBadgeTitle = document.getElementById("eventBadgeTitle");

// Elemen Lightbox
const lightboxModal = document.getElementById("lightboxModal");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxGuest = document.getElementById("lightboxGuest");
const lightboxCaption = document.getElementById("lightboxCaption");
const btnCloseLightbox = document.getElementById("btnCloseLightbox");

// 3. Animasi Kilatan Shutter Kamera
function triggerShutterFlash() {
  if (!cameraFlash) return;
  cameraFlash.classList.remove("active");
  void cameraFlash.offsetWidth;
  cameraFlash.classList.add("active");
}

// 4. Animasi Scroll Reveal
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".scroll-reveal").forEach((el) => revealObserver.observe(el));

// 5. Manajemen Kuota per Tamu (localStorage)
const storageKey = `pawarta_uploaded_${eventSlug}`;
function getUploadedCount() {
  return parseInt(localStorage.getItem(storageKey) || "0", 10);
}
function incrementUploadedCount() {
  localStorage.setItem(storageKey, String(getUploadedCount() + 1));
  updateQuotaUI(true);
}
function getPackageSpec() {
  return APP_CONFIG.packages[currentEventConfig.packageTier] || APP_CONFIG.packages.standard;
}

function updateQuotaUI(animatePop = false) {
  const spec = getPackageSpec();
  const used = getUploadedCount();
  const remaining = Math.max(0, spec.maxPhotos - used);

  quotaPill.textContent = `Kuota Kamu: ${used} / ${spec.maxPhotos} Foto (${spec.name})`;
  quotaHintText.textContent = remaining > 0
    ? `Sisa kuota: ${remaining} dari ${spec.maxPhotos} foto`
    : "Kuota unggahan kamu sudah penuh";

  if (animatePop) {
    quotaPill.classList.remove("pop");
    void quotaPill.offsetWidth;
    quotaPill.classList.add("pop");
  }

  const isLocked = remaining <= 0 || !currentEventConfig.active;
  btnCamera.disabled = isLocked;
  btnGalleryPicker.disabled = isLocked;
}

// 6. Dengarkan Konfigurasi Acara & Galeri Real-Time dari Firebase
const eventConfigRef = ref(db, `events/${eventSlug}/config`);
onValue(eventConfigRef, (snapshot) => {
  if (snapshot.exists()) {
    currentEventConfig = { ...currentEventConfig, ...snapshot.val() };
    eventBadgeTitle.textContent = currentEventConfig.title;
  }
  updateQuotaUI(false);
});

const photosRef = ref(db, `events/${eventSlug}/photos`);
onValue(photosRef, (snapshot) => {
  galleryGrid.innerHTML = "";
  if (!snapshot.exists()) {
    totalPhotosLabel.textContent = "Belum ada foto. Jadilah tamu pertama yang mengabadikan momen!";
    return;
  }

  const rawData = snapshot.val();
  const photoList = Object.entries(rawData)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  totalPhotosLabel.textContent = `${photoList.length} momen terabadikan secara real-time`;

  photoList.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "photo-card";
    card.style.animationDelay = `${Math.min(index * 65, 520)}ms`;

    card.innerHTML = `
      <div class="photo-img-wrap">
        <img src="${item.thumbUrl}" alt="Foto oleh ${escapeHtml(item.guestName)}" loading="lazy" />
      </div>
      <div class="photo-meta">
        <div class="photo-guest">${escapeHtml(item.guestName || "Tamu Undangan")}</div>
        ${item.caption ? `<div class="photo-caption">${escapeHtml(item.caption)}</div>` : ""}
      </div>
    `;

    card.addEventListener("click", () => openLightbox(item));
    galleryGrid.appendChild(card);
  });
});

// 7. Lightbox Preview Foto Penuh
function openLightbox(item) {
  lightboxImg.src = item.fullUrl;
  lightboxGuest.textContent = item.guestName || "Tamu Undangan";
  lightboxCaption.textContent = item.caption || "Diabadikan melalui Pawarta.Id";
  lightboxModal.classList.add("open");
}

btnCloseLightbox.addEventListener("click", () => lightboxModal.classList.remove("open"));
lightboxModal.addEventListener("click", (e) => {
  if (e.target === lightboxModal) lightboxModal.classList.remove("open");
});

// 8. Event Listener Kamera & Galeri HP
btnCamera.addEventListener("click", () => {
  triggerShutterFlash();
  cameraInput.click();
});

btnGalleryPicker.addEventListener("click", () => galleryInput.click());

cameraInput.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));
galleryInput.addEventListener("change", (e) => handleFileSelection(e.target.files[0]));

async function handleFileSelection(file) {
  if (!file) return;

  const spec = getPackageSpec();
  if (getUploadedCount() >= spec.maxPhotos) {
    alert(`Maaf, batas maksimal ${spec.maxPhotos} foto untuk paket ini telah tercapai.`);
    return;
  }

  guestNameInput.value = localStorage.getItem("pawarta_guest_name") || "";
  guestCaptionInput.value = "";
  compressionInfo.textContent = "Mengoptimalkan ketajaman gambar ke WebP HD...";
  uploadModal.classList.add("open");

  try {
    preparedPhotos = await compressWeddingPhoto(file, spec.maxDimension, spec.quality);
    previewImg.src = URL.createObjectURL(preparedPhotos.fullBlob);
    compressionInfo.textContent = `Siap diunggah! (${preparedPhotos.originalSizeKB} KB → ${preparedPhotos.compressedSizeKB} KB WebP HD)`;
  } catch (err) {
    alert("Gagal memproses gambar: " + err.message);
    uploadModal.classList.remove("open");
  } finally {
    cameraInput.value = "";
    galleryInput.value = "";
  }
}

function closeUploadModal() {
  uploadModal.classList.remove("open");
  preparedPhotos = null;
}

btnCancelUpload.addEventListener("click", closeUploadModal);
btnCloseX.addEventListener("click", closeUploadModal);

// 9. Proses Upload ke Cloudflare R2 -> Firebase -> Auto-Sync Google Drive
btnConfirmUpload.addEventListener("click", async () => {
  if (!preparedPhotos) return;

  const guestName = guestNameInput.value.trim() || "Tamu Undangan";
  const caption = guestCaptionInput.value.trim();
  localStorage.setItem("pawarta_guest_name", guestName);

  btnConfirmUpload.disabled = true;
  btnConfirmUpload.textContent = "Mengunggah...";

  try {
    // A. Upload ke Cloudflare R2 via Worker
    const formData = new FormData();
    formData.append("eventSlug", eventSlug);
    formData.append("fullFile", preparedPhotos.fullBlob, "full.webp");
    formData.append("thumbFile", preparedPhotos.thumbBlob, "thumb.webp");

    const r2Res = await fetch(APP_CONFIG.r2WorkerUrl, {
      method: "POST",
      body: formData
    });
    const r2Data = await r2Res.json();

    if (!r2Res.ok || !r2Data.success) {
      throw new Error(r2Data.error || "Gagal mengunggah ke storage R2");
    }

    // B. Simpan metadata ke Firebase Realtime Database
    const newPhotoRef = push(ref(db, `events/${eventSlug}/photos`));
    const photoRecord = {
      fullUrl: r2Data.fullUrl,
      thumbUrl: r2Data.thumbUrl,
      guestName,
      caption,
      createdAt: Date.now()
    };
    await set(newPhotoRef, photoRecord);

    // C. Picu Auto-Sync ke Google Drive Klien di belakang layar (Fire-and-Forget)
    if (currentEventConfig.driveFolderId && APP_CONFIG.googleDriveWebhookUrl.startsWith("http")) {
      const safeGuest = guestName.replace(/[^a-z0-9]/gi, "_");
      fetch(APP_CONFIG.googleDriveWebhookUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          folderId: currentEventConfig.driveFolderId,
          fileName: `${safeGuest}_${r2Data.photoId}.webp`,
          imageUrl: r2Data.fullUrl,
          guestName,
          caption
        })
      }).catch(() => {});
    }

    // D. Update kuota tamu & tutup modal
    triggerShutterFlash();
    incrementUploadedCount();
    closeUploadModal();
  } catch (err) {
    alert("Terjadi kesalahan saat mengunggah: " + err.message);
  } finally {
    btnConfirmUpload.disabled = false;
    btnConfirmUpload.innerHTML = "Publish Foto &rarr;";
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Inisialisasi tampilan kuota awal
updateQuotaUI(false);