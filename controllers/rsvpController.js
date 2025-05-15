const admin = require('firebase-admin');

class RsvpController {
  /**
   * Submit RSVP data
   */
  async submitRsvp(req, res) {
    const { nama, pesan, kehadiran } = req.body;

    if (!nama) {
      return res.status(400).json({ success: false, message: "Nama harus diisi" });
    }

    try {
      const db = admin.firestore();

      // Jalankan transaksi untuk menyimpan data dan update counter
      const result = await db.runTransaction(async (t) => {
        const counterRef = db.collection("counter").doc("id_counter");
        const counterSnap = await t.get(counterRef);

        let currentCounter = 0;
        if (counterSnap.exists) {
          currentCounter = counterSnap.data().counter || 0;
        }

        const newCounter = currentCounter + 1;
        const idTamu = `${nama.replace(/\s+/g, "_")}-${String(newCounter).padStart(3, "0")}`;

        // Buat dokumen baru di koleksi ucapan
        const docRef = db.collection("ucapan").doc(); // Generate ID otomatis

        const newGuest = {
          nama,
          pesan: pesan || '',
          kehadiran: kehadiran || 'hadir',
          scanned: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          id_tamu: idTamu
        };

        t.set(docRef, newGuest);
        t.set(counterRef, { counter: newCounter }, { merge: true });

        return { idTamu, docId: docRef.id };
      });

      res.status(200).json({
        success: true,
        message: "Data berhasil disimpan",
        idTamu: result.idTamu,
        docId: result.docId
      });
    } catch (error) {
      console.error("Error saat menyimpan RSVP:", error);
      res.status(500).json({ success: false, message: "Gagal menyimpan data" });
    }
  }

  /**
   * Get all guest data
   */
  async getAllGuests(req, res) {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection("ucapan").orderBy("timestamp", "desc").get();

      const guests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        data: guests
      });
    } catch (error) {
      console.error("Error mengambil data tamu:", error);
      res.status(500).json({ success: false, message: "Gagal mengambil data" });
    }
  }

  /**
   * Update scan status based on id_tamu
   */
  async updateScanStatus(req, res) {
    const { idTamu } = req.body;

    if (!idTamu) {
      return res.status(400).json({ success: false, message: "ID tamu harus disediakan" });
    }

    try {
      const db = admin.firestore();

      const query = await db.collection("ucapan").where("id_tamu", "==", idTamu).limit(1).get();

      if (query.empty) {
        return res.status(404).json({ success: false, message: "Tamu tidak ditemukan" });
      }

      const doc = query.docs[0];

      if (doc.data().scanned === true) {
        return res.status(400).json({ success: false, message: "QR code sudah dipindai sebelumnya" });
      }

      await doc.ref.update({
        scanned: true,
        timestamp_scan: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({
        success: true,
        message: "Status scan berhasil diperbarui",
        guest: {
          id: doc.id,
          ...doc.data(),
          scanned: true
        }
      });
    } catch (error) {
      console.error("Error memperbarui status scan:", error);
      res.status(500).json({ success: false, message: "Gagal memperbarui status kehadiran" });
    }
  }

  /**
   * Delete guest data by ID
   */
  async deleteGuest(req, res) {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID tamu harus disediakan" });
    }

    try {
      const db = admin.firestore();
      const docRef = db.collection("ucapan").doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ success: false, message: "Tamu tidak ditemukan" });
      }

      // Periksa apakah tamu sudah dipindai
      if (!doc.data().scanned) {
        return res.status(400).json({ 
          success: false, 
          message: "Hanya data tamu yang sudah dipindai yang dapat dihapus" 
        });
      }

      await docRef.delete();

      res.status(200).json({
        success: true,
        message: "Data tamu berhasil dihapus"
      });
    } catch (error) {
      console.error("Error menghapus data tamu:", error);
      res.status(500).json({ success: false, message: "Gagal menghapus data tamu" });
    }
  }
}

module.exports = new RsvpController();
