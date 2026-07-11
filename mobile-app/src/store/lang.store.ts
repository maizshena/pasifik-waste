import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type Lang = "en" | "id";

const en = {
  nav: {
    home: "Home",
    submit: "Submit",
    history: "History",
    wallet: "Wallet",
    profile: "Profile",
  },
  home: {
    greeting: "Good day",
    balance: "Your Balance",
    locked: "Locked",
    recentReports: "Recent Reports",
    quickActions: "Quick Actions",
    submitWaste: "Submit Waste",
    viewWallet: "View Wallet",
    noReports: "No reports yet. Submit your first!",
    earnPoints: "Earn points",
    withdrawPoints: "Withdraw points",
    seeAll: "See all",
  },
  submit: {
    title: "Submit Report",
    category: "Waste Category",
    selectCategory: "Select category…",
    weight: "Estimated Weight (kg)",
    location: "Location",
    detectGps: "Detect my location",
    address: "Address",
    pickupSchedule: "Pickup Schedule",
    pickupDate: "Pickup Date",
    pickupTime: "Pickup Time",
    photos: "Photos",
    notes: "Notes",
    submit: "Submit Report",
    success: "Report submitted!",
    confirmTitle: "Submit this report?",
    confirmBody: "Once submitted it cannot be undone.",
    confirmYes: "Yes, Submit",
  },
  history: {
    title: "My Reports",
    empty: "No reports found",
    all: "All",
    estWeight: "Est. Weight",
    actWeight: "Actual Weight",
    netPoints: "Net Points",
    fee: "Handling Fee",
    gross: "Gross Points",
    pointsEarned: "Points Earned",
    submitted: "Submitted",
    validated: "Validated",
    noComments: "No comments yet.",
    commentsTitle: "Comments with Admin",
    commentPlaceholder: "Ask the admin…",
  },
  wallet: {
    title: "My Wallet",
    available: "Available Balance",
    locked: "Locked (Pending)",
    withdraw: "Request Withdrawal",
    eWallet: "E-Wallet / Bank",
    accountNumber: "Account / Phone Number",
    accountHolder: "Account Holder",
    amount: "Amount (points)",
    myWithdrawals: "Withdrawal History",
    noWithdrawals: "No withdrawals yet",
    submitRequest: "Submit Request",
    submitted: "Withdrawal submitted!",
  },
  profile: {
    title: "Profile",
    personalInfo: "Personal Info",
    fullName: "Full Name",
    phone: "Phone",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    updatePassword: "Update Password",
    signOut: "Sign Out",
  },
  status: {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    success: "Success",
    all: "All",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    loading: "Loading…",
    error: "Something went wrong",
    back: "Back",
  },
  auth: {
    welcomeBack: "Welcome back",
    email: "Email",
    password: "Password",
    signIn: "Sign In",
    noAccount: "Don't have an account?",
    register: "Register",
    createAccount: "Create account",
    fullName: "Full Name",
    haveAccount: "Already have an account?",
  },
};

const id: typeof en = {
  nav: {
    home: "Beranda",
    submit: "Lapor",
    history: "Riwayat",
    wallet: "Dompet",
    profile: "Profil",
  },
  home: {
    greeting: "Selamat datang",
    balance: "Saldo Anda",
    locked: "Terkunci",
    recentReports: "Laporan Terbaru",
    quickActions: "Aksi Cepat",
    submitWaste: "Lapor Sampah",
    viewWallet: "Lihat Dompet",
    noReports: "Belum ada laporan. Kirim laporan pertama!",
    earnPoints: "Kumpulkan poin",
    withdrawPoints: "Tarik poin",
    seeAll: "Lihat semua",
  },
  submit: {
    title: "Kirim Laporan",
    category: "Kategori Sampah",
    selectCategory: "Pilih kategori…",
    weight: "Estimasi Berat (kg)",
    location: "Lokasi",
    detectGps: "Deteksi lokasi saya",
    address: "Alamat",
    pickupSchedule: "Jadwal Pengambilan",
    pickupDate: "Tanggal",
    pickupTime: "Waktu",
    photos: "Foto",
    notes: "Catatan",
    submit: "Kirim Laporan",
    success: "Laporan berhasil dikirim!",
    confirmTitle: "Kirim laporan ini?",
    confirmBody: "Setelah dikirim tidak dapat diubah.",
    confirmYes: "Ya, Kirim",
  },
  history: {
    title: "Laporan Saya",
    empty: "Belum ada laporan",
    all: "Semua",
    estWeight: "Est. Berat",
    actWeight: "Berat Aktual",
    netPoints: "Poin Bersih",
    fee: "Biaya Penanganan",
    gross: "Poin Kotor",
    pointsEarned: "Poin Diperoleh",
    submitted: "Dikirim",
    validated: "Divalidasi",
    noComments: "Belum ada komentar.",
    commentsTitle: "Komentar dengan Admin",
    commentPlaceholder: "Tanyakan ke admin…",
  },
  wallet: {
    title: "Dompet Saya",
    available: "Saldo Tersedia",
    locked: "Terkunci (Menunggu)",
    withdraw: "Ajukan Penarikan",
    eWallet: "E-Wallet / Bank",
    accountNumber: "No. Rekening / HP",
    accountHolder: "Nama Pemilik Rekening",
    amount: "Jumlah (poin)",
    myWithdrawals: "Riwayat Penarikan",
    noWithdrawals: "Belum ada penarikan",
    submitRequest: "Ajukan Permintaan",
    submitted: "Penarikan berhasil dikirim!",
  },
  profile: {
    title: "Profil",
    personalInfo: "Informasi Pribadi",
    fullName: "Nama Lengkap",
    phone: "Telepon",
    changePassword: "Ganti Kata Sandi",
    currentPassword: "Kata Sandi Saat Ini",
    newPassword: "Kata Sandi Baru",
    confirmPassword: "Konfirmasi Kata Sandi",
    updatePassword: "Perbarui Kata Sandi",
    signOut: "Keluar",
  },
  status: {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
    success: "Berhasil",
    all: "Semua",
  },
  common: {
    save: "Simpan",
    cancel: "Batal",
    loading: "Memuat…",
    error: "Terjadi kesalahan",
    back: "Kembali",
  },
  auth: {
    welcomeBack: "Selamat datang kembali",
    email: "Email",
    password: "Kata Sandi",
    signIn: "Masuk",
    noAccount: "Belum punya akun?",
    register: "Daftar",
    createAccount: "Buat akun",
    fullName: "Nama Lengkap",
    haveAccount: "Sudah punya akun?",
  },
};

interface LangState {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()((set, get) => ({
  lang: "id",

  t: (key: string) => {
    const keys = key.split(".");
    const dict = (get().lang === "en" ? en : id) as any;
    let result = dict;
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) return key;
    }
    return typeof result === "string" ? result : key;
  },

  setLang: async (lang) => {
    await AsyncStorage.setItem("pasifik-lang", lang);
    set({ lang });
  },
}));

AsyncStorage.getItem("pasifik-lang").then((stored) => {
  if (stored === "en" || stored === "id") {
    useLangStore.setState({ lang: stored });
  }
});