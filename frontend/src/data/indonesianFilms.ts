export type IndonesianFilm = { id: string; title: string; source: string; channelId: string; durationSeconds: number; verifiedAt: string; year?: number | null; synopsis?: string; views?: number };

export function filterIndonesianFilms(query: string, source: string): readonly IndonesianFilm[] {
  const normalized = query.trim().toLocaleLowerCase('id');
  return indonesianFilms.filter(film => (!source || film.source === source)
    && film.title.toLocaleLowerCase('id').includes(normalized));
}

// Provider metadata reported OK and playableInEmbed at verifiedAt; availability can change.
export const indonesianFilms: readonly IndonesianFilm[] = [
  {
    "id": "sgeKNNn2Raw",
    "title": "Total Chaos",
    "source": "MD Entertainment",
    "channelId": "UC3e0KfJEE6s46nn6_N-DMaQ",
    "durationSeconds": 4797,
    "verifiedAt": "2026-11-25T02:11:41.539Z",
    "year": 2017,
    "synopsis": "Rully (Ricky harun), anak kota yang baru pindah ke desa kecil bersama ibunya (Yurike Prastika) dengan harapan bisa menjalani hidup baru meninggalkan masa lalu mereka.",
    "views": 30796612
  },
  {
    "id": "2AeQyTyAYuw",
    "title": "Sesuai Aplikasi",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5368,
    "verifiedAt": "2026-11-25T02:11:40.655Z",
    "year": 2018,
    "synopsis": "Ini adalah tayangan perdana ngabuburit bareng teman-teman setia penonton film RAPI Films, menemani waktu santai sambil menunggu maghrib selama bulan Ramadhan.",
    "views": 7195766
  },
  {
    "id": "TY6bEAXmZ18",
    "title": "Dilarang Menyanyi di Kamar Mandi",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 4802,
    "verifiedAt": "2026-11-25T02:11:39.074Z",
    "year": 2019,
    "synopsis": "Kali ini kami menghadirkan Dilarang Menyanyi di Kamar Mandi (2019) — film komedi satire Indonesia yang penuh humor, kritik sosial, dan twist cerita yang bikin nonton terus sampai habis! 🎉",
    "views": 5220661
  },
  {
    "id": "XLoTnpIw7pU",
    "title": "Si Buta vs Jaka Sembung",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5251,
    "verifiedAt": "2026-11-25T02:11:30.476Z",
    "year": 1983,
    "synopsis": "📽️ Saksikan pertarungan epik antara dua pendekar legendaris: Si Buta dari Gua Hantu dan Jaka Sembung, dalam sebuah kisah penuh aksi, idealisme, dan benturan kekuatan supranatural!",
    "views": 4430426
  },
  {
    "id": "qLrClBoAT6M",
    "title": "Hangout",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5815,
    "verifiedAt": "2026-11-25T02:11:35.410Z",
    "year": 2016,
    "synopsis": "Seorang aktor menerima undangan misterius untuk sebuah hangout eksklusif di rumah mewah yang terletak di pulau terpencil. Iming-imingnya? Uang dalam jumlah besar untuk menyelesaikan masalah keuangan.",
    "views": 3731410
  },
  {
    "id": "jG1k7yBxZOo",
    "title": "Anak-Anak Tak Beribu",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5104,
    "verifiedAt": "2026-11-25T02:11:33.696Z",
    "year": 1981,
    "synopsis": "⏳ Siap-siap untuk tayangan penuh emosi!\nAnak-Anak Tak Beribu, film drama klasik RAPI FILMS tahun 1981, kini hadir kembali dalam versi remaster HD—langsung di channel resmi kami!",
    "views": 3480158
  },
  {
    "id": "7BDaigF3yyE",
    "title": "Bukan Cinderella",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5290,
    "verifiedAt": "2026-11-25T02:11:26.397Z",
    "year": 2022,
    "synopsis": "BUKAN CINDERELLA adalah kisah tentang Amora Olivia, siswi SMA yang gigih dan punya mimpi besar. Setelah menabung lama, akhirnya ia berhasil membeli sepatu impiannya. Sepatu yang bukan sekadar alas kaki — tapi simbol kerja keras dan harga diri.",
    "views": 3407543
  },
  {
    "id": "5Q1f7a49-N8",
    "title": "Jaka Sembung",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5280,
    "verifiedAt": "2026-11-25T02:12:03.686Z",
    "year": 1981,
    "synopsis": "🎬 JAKA SEMBUNG (1981) – Legenda Pendekar Sakti Melawan Penjajah!\nSaksikan salah satu film laga klasik paling ikonik dari Indonesia!\nJAKA SEMBUNG, pendekar sakti dari tanah Sunda, bangkit melawan penjajah Belanda dan para antek-anteknya. Dibumbui dengan ilmu silat, kekuatan supranatural, dan semangat perjuangan, film ini adalah sajian wajib bagi para pencinta sinema Indonesia sejati!",
    "views": 3341220
  },
  {
    "id": "_II9lXfYGI8",
    "title": "Pedang Naga Pasa",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 4590,
    "verifiedAt": "2026-11-25T02:11:56.563Z",
    "year": 1991,
    "synopsis": "⚔ Kembali ke era magis film silat Indonesia!\n“Pedang Naga Pasa” adalah film fantasi laga dari RAPI FILMS yang dirilis sekitar 1991, disutradarai oleh Slamet Riyadi dan diproduseri oleh Gope T. Samtani",
    "views": 3317103
  },
  {
    "id": "ItDWr3xDNBs",
    "title": "Komando Samber Nyawa",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 4968,
    "verifiedAt": "2026-11-25T02:11:57.393Z",
    "year": 1986,
    "synopsis": "\"Komando Samber Nyawa\" menampilkan kisah pasukan khusus yang harus menjalankan misi berbahaya demi menumpas musuh bersenjata lengkap.\nAksi tembak-menembak, ledakan dahsyat, dan pertarungan tangan kosong akan memacu adrenalin penonton dari awal hingga akhir!",
    "views": 3275451
  },
  {
    "id": "EEyvk_MNyrg",
    "title": "Nyi Blorong",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5092,
    "verifiedAt": "2026-11-25T02:11:54.999Z",
    "year": 1985,
    "synopsis": "Selamat datang di tayangan resmi film klasik Indonesia produksi RAPI FILMS!\nKali ini kami menghadirkan legenda horor paling fenomenal: NYI BLORONG (1985) — film yang memperkuat gelar Suzzanna sebagai Ratu Horor Indonesia.\nDipenuhi ritual pesugihan, kutukan, hingga pertarungan spiritual, film ini terus dibicarakan lintas generasi! 👁️✨",
    "views": 2852666
  },
  {
    "id": "Y4KfEJd_0O0",
    "title": "Cubit-Cubitan",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5460,
    "verifiedAt": "2026-11-25T02:12:05.097Z",
    "year": 1980,
    "synopsis": "Film CUBIT-CUBITAN (1980) membawa kita ke masa keemasan dangdut klasik Indonesia — penuh lagu, air mata, dan harapan yang tak pernah padam. 🎶💃",
    "views": 2133470
  },
  {
    "id": "smS0wAFiaIA",
    "title": "Dear Nathan Hello Salma",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5904,
    "verifiedAt": "2026-11-25T02:11:50.630Z",
    "year": 2018,
    "synopsis": "Halo teman-teman setia RAPI Films 🤍\nGimana puasanya hari ini? Masih kuat dong sampai maghrib nanti?\nSemoga lancar, penuh berkah, dan nggak bolong-bolong ya 😄\nTenang… mimin bakal terus nemenin ngabuburit kamu dengan film-film asik setiap pekan.",
    "views": 1967168
  },
  {
    "id": "xYVAAjtlGxY",
    "title": "Ateng Sok Tau",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5463,
    "verifiedAt": "2026-11-25T02:11:32.793Z",
    "year": 1976,
    "synopsis": "📌 SINOPSIS:\nAteng adalah pria polos dan kocak yang sok tahu tentang segalanya! Saat dia mencoba terlibat dalam berbagai urusan yang bukan keahliannya, malah muncullah kekacauan demi kekacauan. Bersama sahabatnya, Iskak, Ateng terus membuat penonton tergelak dengan tingkah lugu dan keluguannya. Film ini menjadi salah satu komedi ikonik yang tidak lekang oleh waktu!",
    "views": 1752750
  },
  {
    "id": "gkHXCFCQxKg",
    "title": "Guntur Tengah Malam",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 4220,
    "verifiedAt": "2026-11-25T02:11:59.874Z",
    "year": 1990,
    "synopsis": "🎬 Sutradara: A. Rachman\n⭐ Pemeran Utama:\nAlba Fuad — ikon film horor-era 80–90an\nJohan Saimima — dikenal dengan karakter berwatak keras\nYenny Farida — spesialis drama keluarga\nDeasy Ramasari — bintang muda yang sering tampil di horor supranatural\nSally Marcelina — aktris dengan energi misterius\nJack Maland — wajah antagonis yang melegenda",
    "views": 1715405
  },
  {
    "id": "kZEfMjXST1U",
    "title": "Primitif",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5168,
    "verifiedAt": "2026-11-25T02:12:00.710Z",
    "year": 1980,
    "synopsis": "🎬 Karya kultus dari maestro Sisworo Gautama Putra. Petualangan ekstrem yang menelanjangi batas antara manusia beradab dan manusia rimba!",
    "views": 1489389
  },
  {
    "id": "aOQbDixQvtQ",
    "title": "Dear Imamku",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 6236,
    "verifiedAt": "2026-11-25T02:11:44.925Z",
    "year": 2021,
    "synopsis": "Menjelang waktu berbuka, biasanya hati jadi lebih tenang… tapi juga lebih jujur.\nHari ini sudah sejauh apa perjalanan puasanya? Masih kuat ya sampai adzan nanti 😊\nSemoga setiap lelahnya jadi pahala. Dan sore ini, kita temani dengan cerita yang hangat sekaligus mengaduk perasaan.",
    "views": 1384903
  },
  {
    "id": "J1sMBmW5kUk",
    "title": "Lebak Membara",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 6814,
    "verifiedAt": "2026-11-25T02:11:38.250Z",
    "year": 1984,
    "synopsis": "💥 *Lebak Membara* — film laga bersejarah bertema perjuangan PETA melawan penjajahan Jepang, hadir kembali dalam kualitas remaster hanya di channel resmi RAPI FILMS!",
    "views": 1276148
  },
  {
    "id": "T5syjpLRnek",
    "title": "Modus",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 4898,
    "verifiedAt": "2026-11-25T02:11:28.105Z",
    "year": 2016,
    "synopsis": "Ngabuburit kali ini kita ditemani drama komedi yang absurd, nekat, dan penuh taktik cinta tingkat dewa (atau malah zonk).",
    "views": 874204
  },
  {
    "id": "RDV5BNPPkzc",
    "title": "Kalam Kalam Langit",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 6057,
    "verifiedAt": "2026-11-25T02:11:52.581Z",
    "year": 2016,
    "synopsis": "Ngabuburit kali ini kita isi dengan cerita yang lebih teduh.\nGimana puasanya hari ini? Masih kuat sampai waktu berbuka nanti? Semoga setiap lelahnya jadi pahala 🤍",
    "views": 690321
  },
  {
    "id": "551qyz9EKq8",
    "title": "Melbourne Rewind",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5808,
    "verifiedAt": "2026-11-25T02:11:46.626Z",
    "year": 2016,
    "synopsis": "Ngabuburit hari ini kita temani dengan kisah yang tenang… tapi dalam.\nGimana puasanya? Masih kuat ya sampai waktu berbuka nanti? 🤍\nSore ini kita bahas soal satu hal yang sering susah dituntaskan: cinta pertama.",
    "views": 582588
  },
  {
    "id": "2RmME887Bto",
    "title": "Lamaran",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5775,
    "verifiedAt": "2026-11-25T02:11:24.576Z",
    "year": 2015,
    "synopsis": "Sore ini ngabuburitnya kita bikin lebih seru, lebih heboh, dan lebih ngakak 😄\nGimana puasanya? Masih kuat sampai maghrib nanti kan? Tenang, mimin siap nemenin kamu dengan rom-com yang bukan cuma soal cinta… tapi juga soal marga, keluarga, dan harga diri!",
    "views": 461556
  },
  {
    "id": "SZ8fRC4BHFg",
    "title": "Sang Kiai",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 8171,
    "verifiedAt": "2026-11-25T02:11:27.324Z",
    "year": 2013,
    "synopsis": "Di hari kemenangan ini, setelah sebulan penuh menahan diri, membersihkan hati, dan menguatkan iman…\nkita tutup rangkaian tayangan dengan kisah tentang ulama, keberanian, dan cinta tanah air.",
    "views": 449227
  },
  {
    "id": "tdfHCfGY4UU",
    "title": "Mandi Madu",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5342,
    "verifiedAt": "2026-11-25T02:12:02.126Z",
    "year": 1987,
    "synopsis": "📅 Tahun: 1987\n🎭 Genre: Drama\n🎥 Sutradara: A. Rachman\n⭐ Pemeran: Elvy Sukaesih, Asrul Zulmy, Rina Hasyim, Jihan Amir, Bung Salim",
    "views": 349645
  },
  {
    "id": "r4JbajxOcgk",
    "title": "Dang Ding Dong",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5342,
    "verifiedAt": "2026-11-25T02:11:53.375Z",
    "year": 1979,
    "synopsis": "📅 Tahun: 1979\n🎭 Genre: Komedi\n🎥 Sutradara: Hasmanan\n⭐ Pemeran: Ateng, Iskak, Sup Jusuf, Tatiek Suwarno, Pipit Sandra, Mat Bendot",
    "views": 206493
  },
  {
    "id": "3BXYGHQCwF0",
    "title": "Boleh-Boleh Saja",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 4545,
    "verifiedAt": "2026-11-25T02:11:44.062Z",
    "year": 1992,
    "synopsis": "🎬 Tahun: 1992\n🎭 Kategori: Drama Remaja\n🎥 Sutradara: Hadi Purnomo\n👥 Pemeran:\nParamitha Rusady, Reza Rachman, Sally Marcelina",
    "views": 139494
  },
  {
    "id": "61FVl-rWkxY",
    "title": "Marisa Haque & Ikang Fauzy dalam Drama Cinta Terlarang",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 6228,
    "verifiedAt": "2026-11-25T02:11:49.901Z",
    "year": 1988,
    "synopsis": "💔 Biarkan Bulan Itu (1988)\nSebuah drama klasik Indonesia karya Arifin C. Noor, dibintangi para legenda layar lebar: Marisa Haque, Ikang Fauzy, El Manik, dan Rima Melati. Film ini mengupas tentang cinta, kesepian, perselingkuhan, dan hancurnya rumah tangga karena ambisi karir.",
    "views": 133989
  },
  {
    "id": "ZNAdz_iKIAc",
    "title": "Aku Cinta Padamu",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 5450,
    "verifiedAt": "2026-11-25T02:11:45.715Z",
    "year": 1974,
    "synopsis": "Sebuah kisah cinta yang lembut, getir, dan penuh dilema dari era emas perfilman Indonesia. Dibintangi pasangan legendaris Sophan Sophiaan & Widyawati, film ini menghadirkan romansa yang memikat sekaligus menyayat hati — tentang cinta yang datang pada waktu yang salah, perjuangan hidup, dan harga sebuah perasaan yang tulus.",
    "views": 124130
  },
  {
    "id": "YNfW1HFyBhA",
    "title": "Mystics in Bali",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 4929,
    "verifiedAt": "2026-11-25T02:11:36.267Z",
    "year": 1981,
    "synopsis": "Selamat datang di kanal RAPI FILMS!\nKali ini kita hadirkan “MYSTICS IN BALI” (1981) — salah satu film horor Indonesia paling terkenal secara internasional!\nFilm ini meledak di luar negeri karena keunikannya, efek ngeri khas era 80-an, dan legenda Leak Bali yang bikin bulu kuduk berdiri. 😱🌙",
    "views": 82774
  },
  {
    "id": "nTO-6p1Dq-o",
    "title": "Harim Di Tanah Haram",
    "source": "Rapi Films",
    "channelId": "UCTi-irCm6xVzft7gh9ltRNQ",
    "durationSeconds": 6935,
    "verifiedAt": "2026-11-25T02:12:01.399Z",
    "year": 2015,
    "synopsis": "Sore menjelang berbuka adalah waktu paling hening untuk merenung.\nGimana puasanya hari ini? Semoga tetap kuat sampai adzan maghrib berkumandang 🤍\nKali ini, kita ditemani kisah tentang luka, ujian hidup, dan harapan yang tumbuh di tempat paling suci.",
    "views": 66958
  }
];
