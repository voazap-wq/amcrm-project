
"use client";

import { collection, doc, writeBatch, type Firestore, Timestamp, getDocs, deleteDoc, getDoc, setDoc } from "firebase/firestore";

const suppliersList = [
    { name: 'Автоальянс', login: 'Aleksandr305309', password: 'vZS9ssIW', url: 'https://www.autoopt.ru' },
    { name: 'Автоевро', login: 'mailjob', password: 'newbaz-xIkbuq-zohru7', url: 'https://autoeuro.ru/', apiEmail: 'api@autoeuro.ru', minOrderAmount: 100 },
    { name: 'Автоевро API', login: 'mailjob@icloud.com', password: 'sHwHDUvcGweQI37V4u2rH7Za', url: 'https://api.autoeuro.ru:' },
    { name: 'Автоконтинент', login: '020658', password: '20658', url: 'https://autokontinent.ru/contacts.php', minOrderAmount: 0 },
    { name: 'Автопартнер', login: '84955225211', password: '5211', url: 'https://zap-pro.ru', minOrderAmount: 0 },
    { name: 'Автопитер', login: '1253615', password: 'yRsfhcQdql', url: 'https://autopiter.ru/registration', minOrderAmount: 0 },
    { name: 'АвтоРусь', login: 'Zap-Z.Ru@Ya.Ru', password: 'Vk138322', notes: 'АвтоРусь', url: 'https://www.autorus.ru/', minOrderAmount: 1000 },
    { name: 'Авторусь быстрая доставка', login: 'mailjob@icloud.com', password: 'Sasha678678', url: 'https://www.autorus.ru/account' },
    { name: 'Автостелс', login: '35323', password: 'nawpaf-jizhYq-zenbi1', url: 'http://allautoparts.ru/asp-x/Search/SearchPage.aspx', notes: 'zap-z.ru@ya.ru', minOrderAmount: 1000 },
    { name: 'АвтоТрейд', login: 'zap-z.ru@ya.ru', password: '123456', url: 'sklad.autotrade.su', minOrderAmount: 0 },
    { name: 'Армтек', login: 'MAILJOB@ICLOUD.COM', password: 'zaHmav-dagrym-4hyvri', url: 'https://armtek.ru/', notes: 'Armtek. Открыты все адреса, только логин и пароль', minOrderAmount: 1000 },
    { name: 'БалтКам', login: 'mailjob@icloud.com', password: '714693', url: 'www.baltkam.ru' },
    { name: 'Берг', login: 'zap-z', password: '2nazerhgj0x4', url: 'https://berg.ru/?utm_referrer=https%3A%2F%2Fwww.google.com%2F', minOrderAmount: 1000 },
    { name: 'Вольтаж', login: 'zap-z.ru@ya.ru', password: 'JsH41423' },
    { name: 'ЕВРОАВТО', login: 'Zap678678', password: 'Zap678678', url: 'https://opt.euroauto.ru/firms/metaco/1030-004?view=1', minOrderAmount: 0 },
    { name: 'Инкар', login: 'zap-z.ru@ya.ru', password: '12345', url: 'http://www.incar.ru/' },
    { name: 'М-АВТО (беларусы)', login: 'E-053452', password: 'Zap678678', url: 'https://ml-auto.ru/account/' },
    { name: 'Микадо', login: '60095', password: 'zap-z60095', url: 'https://www.mikado-parts.ru/office/', minOrderAmount: 0 },
    { name: 'Москворечье', login: 'mailjob', password: 'i49USA2hS', url: 'https://www.m-zap.ru/', notes: 'Москворечье', minOrderAmount: 500 },
    { name: 'Мотех', login: '888175', password: '36553763', url: 'https://motexc.ru/search/Mahle%2FKnecht/OC1673', notes: 'планируется 1000', minOrderAmount: 0 },
    { name: 'ТИИС', login: 'ПЛ0044788', password: 'GEY?ewQt4', url: 'https://tmparts.ru/Home/Index#listDocBut', minOrderAmount: 0 },
    { name: 'ТИИС2', login: 'zap-z.ru@yandex.ru', password: 'GEY?ewQt4', url: 'https://my.tiss.ru' },
    { name: 'ТрактМоторс', login: 'zap-z.ru@ya.ru', password: 'Zap678678', url: 'https://online.tmtr.ru/login.aspx', notes: 'Грузовики' },
    { name: 'ФаворитParts', login: 'mailjob@icloud.com', password: 'sewpaD-dyghub-7tyvwi', url: 'https://favorit-parts.ru/', notes: 'Favorit-parts', minOrderAmount: 500 },
    { name: 'Форум-Авто', login: '529207_shubinal', password: '71bRX82h3Ftr', url: 'https://forum-auto.ru/', notes: 'ФорумАвто', minOrderAmount: 1000 },
    { name: 'Шате-М', login: 'MAILJOB', password: '89163707202', url: 'https://shate-m.com/', notes: 'Шате-М', minOrderAmount: 500 },
    { name: 'Шины черное', login: 'zap-z.ru@ya.ru', password: 'Sasha13-74', url: 'https://webmim.svrauto.ru/catalog?filterType=tyre&page=1&pageSize=50&minquantity=1' },
    { name: 'Шины4точкаи', login: 'mailjob@icloud.com', password: 'Sasha678678', url: 'b2b.4tochki.ru', notes: 'от 1 шины или 1 диска' },
    { name: 'ABSEL - absTD', login: '16715867', password: 'nKdpQtSc', url: 'https://abstd.ru/', minOrderAmount: 0 },
    { name: 'ArtAfto', login: 'zap-z.ru@yandex.ru', password: '150728', url: 'https://art-autoparts.ru/', notes: 'Бесплатно каждый вторник, среду и пятницу при сумме отгрузки от 5 000 руб.' },
    { name: 'automaster', login: 'zap-z.ru@ya.ru', password: 'Zap678678', url: 'https://automaster.ru/search/?catalog' },
    { name: 'froza', login: 'SAL9', password: 'tHXJ4Eg0', url: 'https://www.froza.ru/index.php', minOrderAmount: 0 },
    { name: 'IXORA', login: 'UAI6019305', password: '6wyu93py', url: 'https://b2b.ixora-auto.ru/Shop/Profile.html', notes: `Вам предоставлен доступ к веб-сервисам компании IXORA со следующими параметрами: E60342DCBB09BD46012891B813D66291
Адрес веб-сервиса: http://ws.ixora-auto.ru/soap/ApiService.asmx
Договор: Покупателя (Оферты)  № ОФ-1 от 03.08.2022 ООО ""ТОРГОВЫЙ ДОМ ИКСОРА"" (БЕЗНАЛ) (RUR)
Ключ безопасности: E60342DCBB09BD46012891B813D66291
Разрешенные IP адреса: 185.26.122.48
Инструкцию по работе с веб-сервисами компании IXORA Вы можете найти на стартовой странице ресурса по адресу: http://ws.ixora-auto.ru/soap/ApiService.asmx
Все вопросы по интеграции и работе веб-сервисов, просим направлять через форму обратной связи на сайте компании по адресу http://ixora-auto.ru/Info/Feedback.html с указанием темы «Веб-сервисы».`, minOrderAmount: 1000 },
    { name: 'MosTeknorot', login: 'zap-z.ru@ya.ru', password: '950726', url: 'http://mosteknorot.ru/', minOrderAmount: 0 },
    { name: 'MParts', login: 'zap-z.ru@ya.ru', password: 'Zap678678', url: 'https://v01.ru/' },
    { name: 'Part-kom', login: 'mailjob', password: 'SAsha678678', url: 'https://part-kom.ru/', notes: 'Part-kom', minOrderAmount: 0 },
    { name: 'Port3', login: '9163707202', password: '3707202', url: 'https://www.port3.ru' },
    { name: 'ROSSKO', login: 'mailjob@icloud.com', password: 'sewduc-tAwwep-puwxy8', url: 'https://rossko.ru/', notes: 'ROSSKO', minOrderAmount: 0 },
    { name: 'sellparts', login: 'zap-z.ru@ya.ru', password: '537168', url: 'https://sellparts.pro/search/Filtron/K1263' },
    { name: 'Trinity Parts', login: 'zapz', password: 'eb00ad5c', url: 'http://trinity-parts.ru' },
    { name: 'ZapPro', url: 'https://zap-pro.ru/' },
    { name: 'aspgarage', login: 'zap-z.ru@ya.ru (9258854)', password: '197435', url: 'https://aspgarage.ru' },
    { name: 'stparts', login: 'zap-z.ru@ya.ru', password: '7202', url: 'https://stparts.ru/' },
    { name: 'auto-cc', login: 'zap-z.ru@ya.ru', password: '430527', url: 'https://auto-cc.ru' },
    { name: 'Равенол', login: 'zap-z.ru@ya.ru', password: 'Zap678678', url: 'https://parts24.su/' },
];

const defaultCategories = [
    { name: 'Продажи', type: 'income', isDefault: true },
    { name: 'Закупка', type: 'expense', isDefault: true },
    { name: 'Аренда', type: 'expense', isDefault: true },
    { name: 'Зарплата', type: 'expense', isDefault: true },
    { name: 'Возврат клиенту', type: 'expense', isDefault: true },
    { name: 'Возврат от поставщика', type: 'income', isDefault: true },
];

export const seedData = async (firestore: Firestore) => {
  
  // Clear existing collections
  const clearCollection = async (collectionName: string) => {
    const collectionRef = collection(firestore, collectionName);
    const snapshot = await getDocs(collectionRef);
    const deleteBatch = writeBatch(firestore);
    snapshot.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log(`Collection "${collectionName}" cleared.`);
  };
  
  const seedDefaultCategories = async () => {
    const categoriesCollection = collection(firestore, "transactionCategories");
    const snapshot = await getDocs(categoriesCollection);
    
    if (snapshot.empty) {
        const batch = writeBatch(firestore);
        defaultCategories.forEach(category => {
            const docRef = doc(categoriesCollection);
            batch.set(docRef, category);
        });
        await batch.commit();
        console.log("Default transaction categories seeded.");
    } else {
        console.log("Transaction categories collection is not empty, skipping seed.");
    }
  };

  await clearCollection("orders");
  await clearCollection("clients");

  // --- Seed Suppliers ---
  const supplierBatch = writeBatch(firestore);
  const suppliersCollection = collection(firestore, "suppliers");
   // Clear suppliers to avoid duplicates on re-seed
  const supplierSnapshot = await getDocs(suppliersCollection);
  supplierSnapshot.docs.forEach(doc => {
    supplierBatch.delete(doc.ref);
  });

  for (const supplier of suppliersList) {
    const supplierRef = doc(suppliersCollection);
    supplierBatch.set(supplierRef, supplier);
  }
  await supplierBatch.commit();
  console.log("Suppliers seeded.");

  await seedDefaultCategories();
};
