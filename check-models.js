import axios from 'axios';
import dotenv from 'dotenv';

// Memuat variabel environment dari file .env
dotenv.config();

const API_KEY = process.env.GEMINI_KEY;

async function checkModels() {
    if (!API_KEY) {
        console.error("❌ ERROR: API Key tidak ditemukan di .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    console.log("🔍 Menghubungi Google AI Studio...");
    
    try {
        const response = await axios.get(url);
        const models = response.data.models;

        console.log("\n✅ Daftar Model yang Tersedia untuk API Key Anda:");
        console.log("--------------------------------------------------");

        models.forEach((m, index) => {
            const shortName = m.name.replace('models/', '');
            const methods = m.supportedGenerationMethods.join(', ');
            
            console.log(`${index + 1}. [${shortName}]`);
            console.log(`   Metode: ${methods}`);
            console.log(`   Deskripsi: ${m.description}\n`);
        });

        // Cek spesifik apakah ada Imagen
        const hasImagen = models.some(m => m.name.includes('imagen'));
        if (hasImagen) {
            console.log("✨ KABAR BAIK: Model Imagen (Image Gen) terdeteksi!");
        } else {
            console.log("⚠️ PERINGATAN: Tidak ada model Imagen yang ditemukan. Anda mungkin belum memiliki akses Image Generation di region/akun ini.");
        }

    } catch (error) {
        console.error("❌ Terjadi kesalahan saat mengambil data:");
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Pesan: ${error.response.data.error.message}`);
        } else {
            console.error(`   Pesan: ${error.message}`);
        }
    }
}

checkModels();