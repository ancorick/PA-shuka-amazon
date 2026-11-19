// Seed data for Shuka. Prices are integer dram (AMD).
// `photo` is an Unsplash photo id (free to use under the Unsplash License). The images are
// downloaded once by `node seed/fetch-images.js` into seed/images/ and committed, so the
// server never needs the network at start-up. Missing photos fall back to a generated image.

export const PASSWORD = 'shuka123';

export const categories = [
  { name: 'Electronics', slug: 'electronics', color: '#2563eb' },
  { name: 'Phones & Accessories', slug: 'phones', color: '#7c3aed' },
  { name: 'Computers', slug: 'computers', color: '#0891b2' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', color: '#ea580c' },
  { name: 'Fashion', slug: 'fashion', color: '#db2777' },
  { name: 'Beauty', slug: 'beauty', color: '#e11d48' },
  { name: 'Sports & Outdoors', slug: 'sports', color: '#16a34a' },
  { name: 'Toys & Games', slug: 'toys', color: '#ca8a04' },
  { name: 'Books', slug: 'books', color: '#9333ea' },
  { name: 'Armenian Food & Drinks', slug: 'food', color: '#b45309' },
];

export const sellers = [
  { email: 'seller1@shuka.am', name: 'Aram Petrosyan', phone: '+374 91 111111', store: 'Yerevan Electronics' },
  { email: 'seller2@shuka.am', name: 'Ani Hakobyan', phone: '+374 93 222222', store: 'Ararat Home & Style' },
  { email: 'seller3@shuka.am', name: 'Davit Grigoryan', phone: '+374 94 333333', store: 'Gyumri Crafts & Food' },
];

export const buyers = [
  { email: 'buyer1@shuka.am', name: 'Lilit Sargsyan', phone: '+374 77 444444' },
  { email: 'buyer2@shuka.am', name: 'Narek Avetisyan', phone: '+374 98 555555' },
];

// [seller index, category slug, title, price, stock, photo id, description]
export const products = [
  [0, 'electronics', 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', 189000, 12, '1505740420928-5e560c06d30e',
    'Industry-leading noise cancelling with two processors and eight microphones. Up to 30 hours of battery life, quick charging (3 min = 3 hours), multipoint Bluetooth and crystal-clear hands-free calls. Lightweight design for all-day comfort.'],
  [0, 'electronics', 'JBL Flip 6 Portable Bluetooth Speaker, Waterproof', 59000, 3, '1608043152269-423dbba4e7e1',
    'Bold JBL Original Pro Sound with a racetrack-shaped woofer and separate tweeter. IP67 waterproof and dustproof, 12 hours of playtime, PartyBoost to pair two speakers. Perfect for Lake Sevan weekends.'],
  [0, 'electronics', 'Samsung 55" Crystal UHD 4K Smart TV', 289000, 5, '1593359677879-a4bb92f829d1',
    'Crystal Processor 4K delivers vivid colour and sharp detail. Smart TV with built-in apps, AirSlim design and HDR support. Wall-mountable. Delivery and setup across Yerevan.'],
  [0, 'electronics', 'Wireless Earbuds Pro with Active Noise Cancellation', 49000, 2, '1600294037681-c80b4cb5b434',
    'Compact in-ear earbuds with active noise cancellation, transparency mode and a wireless charging case. Up to 24 hours of total listening time. Sweat and water resistant.'],
  [0, 'electronics', 'Xiaomi Smart Band 8 Fitness Tracker', 19900, 25, '1575311373937-040b8e1fd5b6',
    '1.62" AMOLED display, heart rate and SpO2 monitoring, sleep tracking, 150+ workout modes and notifications from your phone. Battery lasts up to 16 days. Water resistant to 5 ATM.'],
  [0, 'electronics', 'Instant Film Camera, Retro Edition', 64000, 6, '1526170375885-4d8ecf77b99f',
    'Shoot and print in seconds. Automatic exposure, built-in flash and a selfie mirror. Uses standard instant film. A great gift for birthdays and weddings.'],

  [0, 'phones', 'Apple iPhone 15, 128 GB, Black', 449000, 4, '1511707171634-5f897ff02aa9',
    'Dynamic Island, 48 MP main camera with 2x telephoto, A16 Bionic chip and USB-C. Official warranty. Delivered in the original sealed box.'],
  [0, 'phones', 'Samsung Galaxy A55 5G, 256 GB', 189000, 8, '1610945415295-d9bbf067e59c',
    '6.6" Super AMOLED 120 Hz display, 50 MP OIS camera, 5000 mAh battery and IP67 protection. Dual SIM. Four years of OS updates.'],
  [0, 'phones', 'Xiaomi Redmi Note 13, 256 GB, Ocean Teal', 119000, 9, '1609091839311-d5365f9ff1c5',
    '6.67" AMOLED 120 Hz display, 108 MP camera, 5000 mAh battery with 33 W fast charging. Dual SIM, official warranty.'],
  [0, 'phones', 'Android Smartphone 6.5" AMOLED, 128 GB, Black', 89000, 1, '1601784551446-20c9e07cdbdb',
    'Edge-to-edge 6.5" AMOLED display, 64 MP triple camera, 8 GB RAM and 128 GB storage. Always-on display and fast face unlock. Last one in stock!'],
  [0, 'phones', 'Baseus 20000 mAh Power Bank with USB-C PD', 14900, 15, '1609592424825-fe2f7e3a1e35',
    'Charge a phone up to four times. 22.5 W fast charging, three outputs and a digital battery display. Airline-safe capacity.'],

  [0, 'computers', 'Lenovo IdeaPad Slim 5, 14", 16 GB RAM, 512 GB SSD', 389000, 3, '1496181133206-80ce9b88a853',
    'Thin and light 14" laptop with a 2.2K IPS display, AMD Ryzen 7 processor, 16 GB RAM and a fast 512 GB SSD. Backlit keyboard, Wi-Fi 6 and up to 12 hours of battery life.'],
  [0, 'computers', 'Logitech MX Master 3S Wireless Mouse', 45000, 10, '1527864550417-7fd91fc51a46',
    '8K DPI sensor that tracks on glass, quiet clicks, MagSpeed scroll wheel and USB-C quick charging. Connects to three devices.'],
  [0, 'computers', 'Mechanical Keyboard, Wireless, Brown Switches', 42000, 0, '1587829741301-dc798b83add3',
    'Compact 84-key layout, hot-swappable brown switches, white backlight and Bluetooth for Mac and Windows. Up to 72 hours of typing per charge.'],
  [0, 'computers', 'Apple iMac 24", M3, 8 GB RAM, 256 GB SSD', 699000, 2, '1527443224154-c4a3942d3acf',
    'Strikingly thin all-in-one with a 4.5K Retina display, Apple M3 chip, 1080p FaceTime camera and a six-speaker sound system. Includes Magic Keyboard and Mouse.'],

  [1, 'home-kitchen', 'Copper Jazzve Coffee Pot, Handmade, 300 ml', 8500, 30, '1514432324607-a09d9b4aefdd',
    'Traditional hand-hammered copper jazzve for real Armenian coffee. Tin-lined inside, wooden handle. Makes three small cups.'],
  [1, 'home-kitchen', 'Enamelled Cast Iron Casserole, 24 cm, Red', 32900, 12, '1556909114-f6e7ad7d3136',
    'Heavy cast iron with a glossy red enamel finish. Perfect for slow-cooked khashlama, stews and baking bread. Works on gas, electric and induction hobs and in the oven.'],
  [1, 'home-kitchen', 'Handmade Ceramic Plate Set, 6 pcs, Sky Blue', 18000, 14, '1578749556568-bc2c40e68b61',
    'Six stoneware dinner plates with a reactive sky-blue glaze, hand-made by a pottery workshop in Shirak. 26 cm diameter, dishwasher safe.'],
  [1, 'home-kitchen', 'Cotton Bed Linen Set, Double, White', 24900, 7, '1522771739844-6a9f6d5f14af',
    '100% cotton percale: duvet cover 200×220, fitted sheet 160×200 and two pillowcases 50×70. Breathable and soft after every wash.'],
  [1, 'home-kitchen', 'Ceramic Coffee Cup Set, 4 pcs', 9900, 20, '1495474472287-4d71bcdd2085',
    'Four stoneware cups, 250 ml each, in warm earthy glazes — made for lattes and cappuccinos. Microwave and dishwasher safe.'],

  [1, 'fashion', 'Unisex Cotton Hoodie, Heather Grey', 17900, 22, '1556821840-3a63f95609a7',
    'Midweight 80% cotton fleece hoodie with a kangaroo pocket and a lined hood. Sizes S–XXL. Machine washable.'],
  [1, 'fashion', 'Lightweight Running Shoes, Red', 34900, 9, '1542291026-7eec264c27ff',
    'Breathable knit upper, responsive foam cushioning and a flexible rubber outsole. Great for daily runs along Cascade. EU sizes 36–46.'],
  [1, 'fashion', 'Polarized Sunglasses, UV400', 11900, 18, '1572635196237-14b3f281503f',
    'Lightweight frame with polarized UV400 lenses that cut glare on sunny Yerevan days. Comes with a hard case and cleaning cloth.'],
  [2, 'fashion', 'Chunky Knit Wool Sweater, Charcoal', 24500, 10, '1520903920243-00d872a2d1c9',
    'Hand-knit from soft Armenian sheep wool. Relaxed fit, ribbed cuffs and a warm high neck for Gyumri winters. Sizes S–XL.'],
  [2, 'fashion', 'Quilted Leather Crossbody Bag, Black', 29900, 5, '1548036328-c9fa89d128fa',
    'Quilted genuine leather with a gold-tone chain strap, two inner pockets and a zip closure. Fits a phone, wallet and keys.'],

  [1, 'beauty', 'Apricot Kernel Oil Face Cream, 50 ml', 6900, 20, '1620916566398-39f1143ab7be',
    'Light daily cream with cold-pressed Armenian apricot kernel oil and vitamin E. Absorbs fast, softens and evens skin tone. For all skin types.'],
  [1, 'beauty', 'Chanel N°5 Eau de Parfum, 50 ml', 79000, 8, '1541643600914-78b084683601',
    'The timeless floral-aldehydic fragrance with notes of rose, jasmine, ylang-ylang and vanilla. Original, sealed box.'],
  [1, 'beauty', 'Handmade Natural Soap Set, 4 pcs', 5500, 2, '1600857544200-b2f666a9a2ec',
    'Cold-process soaps with mountain herbs, honey, apricot and rose. No synthetic fragrance. 4 × 100 g.'],

  [1, 'sports', 'Yoga Mat, 6 mm, Non-Slip', 9900, 16, '1601925260368-ae2f83cf8b7f',
    'Eco-friendly TPE mat with a non-slip texture on both sides. 183×61 cm, 6 mm thick, with a carrying strap.'],
  [1, 'sports', 'Adjustable Dumbbells, 2 × 10 kg', 39000, 4, '1583454110551-21f2fa2afe61',
    'Pair of adjustable dumbbells with chrome handles and secure collars. Change the weight in seconds from 2.5 to 10 kg each.'],
  [1, 'sports', 'Urban Backpack 25 L, Navy', 22500, 8, '1553062407-98eeb64c6a62',
    'Water-repellent everyday backpack with a padded 15" laptop sleeve, hidden back pocket and comfortable straps. Ready for the office or a day trip to Dilijan.'],
  [1, 'sports', 'Stainless Steel Water Bottle, 750 ml', 6500, 30, '1602143407151-7111542de6e8',
    'Double-wall vacuum insulation keeps drinks cold for 24 hours and hot for 12. Leak-proof lid, BPA free.'],

  [2, 'toys', 'Wooden Train Set with Railway, 40 pcs', 18900, 12, '1596461404969-9ae70f2830c1',
    'Natural beech-wood railway with a locomotive, wagons, a station and traffic lights. Painted with child-safe water-based colours. Ages 3+.'],
  [2, 'toys', 'Creative Building Bricks Box, 900 pcs', 21900, 6, '1587654780291-39c9404d746b',
    'Large box of colourful building bricks with wheels, windows and doors. Compatible with major brands. Ages 4+.'],
  [2, 'toys', 'Handmade Wooden Chess Set', 39000, 3, '1529699211952-734e80c4d42b',
    'Hand-carved walnut chess set with a folding board that stores all pieces. Board 40×40 cm. Made in Gyumri.'],

  [2, 'books', 'The Armenian Kitchen — Family Recipes', 11500, 9, '1466637574441-749b8f19452f',
    'Over 120 recipes from dolma and khorovats to gata and ghapama, with step-by-step photos. Hardcover, English edition.'],
  [2, 'books', 'Rupi Kaur — milk and honey (Paperback)', 9900, 7, '1544947950-fa07a98d237f',
    'The bestselling collection of poetry and prose about love, loss, trauma and healing. 208 pages, paperback, English.'],
  [2, 'books', 'Business Bestsellers Bundle, 6 Books', 39000, 14, '1512820790803-83ca734da794',
    'Six bestselling business books including Zero to One, The Startup Owner\'s Manual and Value Proposition Design. Paperback, English.'],

  [2, 'food', 'Blended Scotch Whisky, 12 Years, 0.7 L', 21900, 10, '1569529465841-dfecdab7503b',
    'Smooth, rich blend aged at least 12 years with notes of dark fruit, vanilla and smoke. 40% ABV. Adults 18+ only.'],
  [2, 'food', 'Areni Red Wine, Dry, 0.75 L', 7900, 12, '1510812431401-41d2bd2722f3',
    'Made from the ancient Areni grape of Vayots Dzor. Deep ruby colour with notes of cherry and spice. 13% ABV. Adults 18+ only.'],
  [2, 'food', 'Rustic Sourdough Bread, 800 g', 1800, 15, '1509440159596-0249088772ff',
    'Slow-fermented sourdough loaf baked every morning in a stone oven in Gyumri. Crunchy crust, soft crumb. Best within 3 days.'],
  [2, 'food', 'Iced Tea Syrup, Lemon & Mountain Thyme, 0.5 L', 3500, 1, '1556679343-c7306c1976bc',
    'Homemade syrup with lemon and wild thyme from Aragats. Mix 1:5 with cold water or soda for a refreshing iced tea.'],
  [2, 'food', 'Fresh Citrus Mix, 2 kg', 3900, 40, '1546548970-71785318a17b',
    'Oranges, grapefruits, lemons and limes, hand-picked and delivered fresh. Perfect for juice and winter vitamins.'],
];
