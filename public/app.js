// Built from src/app.jsx — edit that file, not this one.
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} = React;
const T = {
  ka: {
    appSub: "PriceCheck",
    navMain: "მთავარი",
    navDashboard: "დეშბორდი",
    tabs: {
      products: "პროდუქტები",
      distributors: "დისტრიბუცია",
      bazaar: "ბაზარი",
      orders: "შეკვეთები",
      storage: "საწყობი",
      report: "რეპორტი",
      mistakes: "შეცდომები",
      debts: "ვალები",
      history: "ისტორია"
    },
    sync: {
      ok: "✓ სინქრ.",
      saving: "ინახება…",
      error: "⚠ კავშირი"
    },
    search: "ძებნა…",
    searchProduct: "პროდუქტის ძებნა…",
    allCats: "ყველა კატეგ.",
    allSuppliers: "ყველა მომწ.",
    allTypes: "ყველა ტიპი",
    all: "ყველა",
    typeDistributor: "დისტრიბუცია",
    typeBazaar: "ბაზარი",
    add: "+ დამატება",
    csv: "↓ CSV",
    edit: "რედაქტირება",
    col: {
      n: "#",
      cat: "კატ.",
      name: "დასახელება",
      code: "rs.ge კოდი",
      supplier: "მომწოდებელი",
      contact: "კონტაქტი",
      size: "ზომა",
      netSize: "ზომა (ნეტო)",
      price: "ფასი ₾",
      unitPrice: "ერთეულის ფასი",
      comment: "კომ."
    },
    kpi: {
      products: "პროდუქტი",
      suppliers: "მომწოდებელი",
      avgPrice: "საშ. ფასი",
      alternatives: "ალტერნატივა",
      priceKnown: "ფასი ცნობ.",
      priceUnknown: "ფასი უცნობ.",
      open: "ღია შეცდომა",
      sentToDistributor: "გაგზავნილი მომწ.",
      resolved: "მოგვარებული",
      openAmount: "ღია თანხა",
      total: "სულ ჩანაწერი",
      approved: "დადასტურებული",
      sentToAccountant: "ბუღალტერთან გაგზ.",
      ordersReceived: "მიღებული შეკვეთა"
    },
    noProducts: "პროდუქტები არ მოიძებნა",
    noProductsYet: "პროდუქტები ჯერ არ არის — დაამატეთ „+ დამატება“-თი.",
    noSuppliers: "მომწოდებლები ჯერ არ არის",
    bazaarEmpty: "ბაზრის მომწოდებლები ჯერ არ არის — დაამატეთ „+ დამატება“-თი.",
    alt: "ალტ.",
    bazaarTag: "ბაზარი",
    order: "შეკვეთა",
    clear: "გასუფთავება",
    clearConfirm: "გავასუფთავოთ მთელი შეკვეთა?",
    orderEmpty: "პროდუქტი არ არის დამატებული",
    orderHint: "დააჭირეთ „+“-ს პროდუქტის დასამატებლად, ან თანამშრომელმა დაწეროს სია Telegram-ის ჯგუფში.",
    positions: n => `${n} პოზ.`,
    qty: "რაოდ.",
    unit: "ერთ.",
    commentPh: "კომენტ…",
    whatsappTo: s => `WhatsApp — ${s}`,
    noPhone: "ნომერი არ არის — WhatsApp-ში კონტაქტს თავად აირჩევთ",
    received: "📦 მივიღე — ისტორიაში გადატანა",
    receivedConfirm: s => `${s}: პროდუქტები მიღებულია? ისინი ისტორიაში გადავა.`,
    sentAt: d => `✓ გაგზავნილია ${d}`,
    resend: "შეიცვალა — გააგზავნეთ ხელახლა",
    estTotal: "სავარაუდო ჯამი",
    fromTelegram: "Telegram",
    deleted: "წაშლილი პროდუქტი",
    waybillNo: n => `ზედნადები № ${n}`,
    checkedBy: "შეამოწმა",
    reason: "მიზეზი",
    noReason: "მიზეზი ჯერ არ არის დაწერილი",
    lines: n => `პოზიციები (${n})`,
    sendDistributor: "მომწოდებელთან გაგზავნა",
    sendAccountant: "ბუღალტერთან გაგზავნა",
    sendAgain: "ხელახლა გაგზავნა",
    markResolved: "✓ მოგვარებულია",
    reopen: "↩ ხელახლა გახსნა",
    resolveConfirm: "მოინიშნოს მოგვარებულად? გადავა ისტორიაში.",
    mistakesEmpty: "შეცდომები არ არის 🎉",
    historyEmpty: "ისტორია ცარიელია",
    status: {
      approved: "დადასტურებული",
      rejected: "ღია",
      resolved: "მოგვარებული შეცდომა",
      received: "მიღებული შეკვეთა"
    },
    allStatuses: "ყველა სტატუსი",
    orderReceivedTitle: s => `შეკვეთა მიღებულია — ${s}`,
    receivedFromOrder: "შეკვეთიდან მიღებული",
    distributorSent: d => `✓ მომწოდებელს გაეგზავნა ${d}`,
    accountantSent: d => `✓ ბუღალტერს გაეგზავნა ${d}`,
    lineStatus: {
      ok: "ემთხვევა",
      high: "ძვირი",
      low: "იაფი",
      unknown: "ბაზაში არ არის",
      noprice: "ფასი არ არის"
    },
    base: "ბაზა",
    debtsTitle: "ვალები",
    debtsSoon: "ეს განყოფილება მალე დაემატება.",
    newProduct: "ახალი პროდუქტი",
    editProduct: "პროდუქტის რედაქტირება",
    f: {
      type: "ტიპი",
      category: "კატეგორია",
      name: "დასახელება",
      nameRs: "დასახელება rs.ge-ზე",
      code: "rs.ge კოდი",
      supplier: "მომწოდებელი",
      contactName: "საკონტაქტო პირი",
      phone: "ტელეფონი (WhatsApp)",
      size: "ზომა",
      netSize: "ზომა (ნეტო)",
      price: "ფასი ₾",
      altSupplier: "ალტ. მომწოდებელი",
      comment: "კომენტარი"
    },
    nameRequired: "დასახელება აუცილებელია",
    delete: "წაშლა",
    deleteConfirm: n => `წავშალოთ „${n}“?`,
    cancel: "გაუქმება",
    save: "შენახვა",
    saved: "✓ შენახულია",
    saveFailed: "შენახვა ვერ მოხერხდა. სცადეთ თავიდან.",
    settings: "პარამეტრები",
    accountant: "ბუღალტერი",
    accountantPhone: "ბუღალტრის WhatsApp ნომერი",
    accountantHint: "დადასტურებული ზედნადები ამ ნომერზე იგზავნება ისტორიიდან.",
    language: "ენა",
    systemStatus: "სისტემის მდგომარეობა",
    statusLabels: {
      storage: "მონაცემთა საცავი",
      telegramBot: "Telegram ბოტი",
      rsgeLogin: "rs.ge კავშირი",
      gemini: "ფოტოს ამოკითხვა (Gemini)",
      ceoRegistered: "დირექტორი დარეგისტრირებულია",
      passwordSet: "პაროლი დაყენებულია"
    },
    botHelp: "Telegram ბოტის ბრძანებები",
    botHelpText: ["ჯგუფში: ზედნადების ფოტო ან ნომერი — შემოწმება", "ჯგუფში: სია, თითო პროდუქტი ცალკე ხაზზე (მაგ. „რუკოლა 2კგ“) — შეკვეთაში დამატება", "დირექტორის პირად ჩატში: /password ახალი_პაროლი — საიტის პაროლის შეცვლა", "ნებისმიერ ჯგუფში: /chatid — ჯგუფის ID"],
    logout: "გამოსვლა",
    close: "დახურვა",
    loginTitle: "შესვლა",
    password: "პაროლი",
    login: "შესვლა",
    wrongPassword: "პაროლი არასწორია",
    tooMany: "ძალიან ბევრი მცდელობა — სცადეთ 15 წუთში",
    notSet: "პაროლი ჯერ არ არის დაყენებული. დირექტორმა ბოტს პირად ჩატში უნდა გაუგზავნოს: /password ახალი_პაროლი",
    connError: "კავშირის შეცდომა — სცადეთ თავიდან",
    loading: "იტვირთება…",
    stock: {
      search: "პროდუქტის ძებნა…",
      all: "ყველა",
      low: "იწურება",
      withMin: "მინიმუმით",
      allStores: "ყველა საწყობი",
      prioNames: {
        red: "მაღალი პრიორიტეტი",
        yellow: "საშუალო პრიორიტეტი",
        cyan: "დაბალი პრიორიტეტი"
      },
      refresh: "↻ განახლება",
      col: {
        prio: "პრიორიტეტი",
        name: "პროდუქტი",
        syrve: "Syrve",
        live: "რეალური",
        min: "მინიმუმი",
        inv: "ინვენტ. სხვაობა",
        status: "სტატუსი"
      },
      kpi: {
        products: "პროდუქტი",
        low: "იწურება",
        lastInv: "ბოლო ინვენტარიზაცია",
        asOf: "Syrve განახლდა",
        endOfDay: "ნაშთი დღის ბოლოს"
      },
      today: "დღეს",
      yesterday: "გუშინ",
      date: "თარიღი",
      pastNote: "წარსული დღე: Syrve-ს ნაშთი ამ დღის ბოლოს (როგორც Syrve Office-ის „Stock balance“). რეალური, მინიმუმი და შეტყობინებები მხოლოდ დღევანდელზეა.",
      noInv: "2 თვეში არ ყოფილა",
      invDoc: (n, c) => `${n ? "№ " + n + " · " : ""}${c} პოზიციაში სხვაობა`,
      manual: "ხელით",
      resetCorr: "Syrve-ს რიცხვზე დაბრუნება",
      corrHint: "ხელით ცვლილება Syrve-ზე არ მოქმედებს და ახალი ინვენტარიზაციისას თავისით უქმდება.",
      minHint: "როცა რეალური რაოდენობა მინიმუმამდე ჩამოვა, ბოტი Telegram-ის ჯგუფში შეტყობინებას გაგზავნის.",
      alarm: {
        open: "🔔 გაგზავნილია",
        approved: "✅ შეკვეთილი",
        rejected: "❌ უარყოფილი",
        low: "იწურება"
      },
      linked: "შეკვეთაში:",
      autoLinked: "ავტომ.",
      noLink: "PriceCheck-თან არ არის დაკავშირებული",
      autoOpt: "— ავტომატურად —",
      unlinkOpt: "— არ დაკავშირდეს —",
      changeLink: "შეცვლა",
      noGroup: "Telegram-ის ჯგუფი ჯერ უცნობია — დაწერეთ ნებისმიერი შეტყობინება თანამშრომლების ჯგუფში, რომ ბოტმა დაიმახსოვროს.",
      invError: "ინვენტარიზაციის მონაცემი ვერ წავიკითხე: ",
      error: "Syrve-დან მონაცემი ვერ მივიღე: ",
      showing: (a, b) => `ნაჩვენებია ${a} / ${b} — დააზუსტეთ ძებნა`,
      empty: "პროდუქტები არ მოიძებნა",
      rs: {
        col: "საწყობი RS",
        diff: "სხვაობა",
        colHint: "ამ თვის rs.ge ზედნადებები (1-დან, ნულიდან) − დაბრუნება − რაც Syrve-მ გაიტანა (გაყიდვა, ჩამოწერა, ინვენტარიზაცია).",
        diffHint: "RS − Syrve (Syrve-იც 1-დან, ნულიდან). 0 = ყველა ზედნადები Syrve-შია იგივე რაოდენობით.",
        open: "ზედნადებები",
        errors: "rs.ge / Syrve-დან ყველაფერი ვერ წავიკითხე: ",
        off: "საწყობი RS მხოლოდ მიმდინარე თვისთვის ითვლება.",
        sum: (from, to) => `${from} – ${to}`,
        rsIn: "rs.ge ზედნადებები",
        rsRet: "დაბრუნება",
        usage: "Syrve-მ გაიტანა",
        rs: "საწყობი RS",
        start: "Syrve თვის დასაწყისში",
        now: "Syrve ახლა",
        delta: "Syrve ამ თვეში",
        syrveIn: "Syrve-ის ზედნადებები",
        syrveRet: "Syrve-ის დაბრუნება",
        diffLine: "სხვაობა = RS − Syrve ამ თვეში",
        warn: n => `⚠ ${n} ხაზი ერთეულში ვერ გადავიყვანე და არ ითვლება — შეავსეთ „ზომა (ნეტო)“ პროდუქტებში.`,
        col2: {
          n: "ზედნადები",
          day: "თარიღი",
          seller: "მომწოდებელი",
          name: "rs.ge დასახელება",
          qty: "რაოდ.",
          amt: "ერთეულში",
          syrve: "Syrve"
        },
        how: {
          size: "ზომით",
          learned: "Syrve-დან",
          pc: "1:1"
        },
        ret: "დაბრუნება",
        inSyrve: "✓",
        missing: "✗ Syrve-ში არ არის",
        notOnDoc: "⚠ Syrve-ის ზედნადებზე ეს პროდუქტი არ არის",
        noWb: "ამ თვეში ზედნადები არ არის.",
        prods: "პროდუქტები, რომელთა ზედნადებებიც ითვლება:",
        noProds: "პროდუქტი არ არის დაკავშირებული — RS არ ითვლება.",
        add: "+ პროდუქტი",
        remove: "მოხსნა",
        noCode: "კოდი არ აქვს"
      }
    },
    report: {
      title: "საქონლის ხარჯი",
      presets: {
        today: "დღეს",
        yesterday: "გუშინ",
        week: "ეს კვირა",
        month: "ეს თვე",
        lastMonth: "წინა თვე"
      },
      from: "დან",
      to: "მდე",
      kpi: {
        cost: "ხარჯი, თვითღირებულება",
        items: "პროდუქტი",
        days: "დღე გაყიდვებით",
        perDay: "საშუალოდ დღეში"
      },
      search: "პროდუქტის ძებნა…",
      allGroups: "ყველა ჯგუფი",
      type: "ტიპი",
      kinds: {
        all: "ყველა ტიპი",
        goods: "ნედლეული",
        semi: "ნახევარფაბრიკატი (ნ/ფ)",
        other: "სხვა"
      },
      sortBy: "დალაგება",
      sorts: {
        most: "ყველაზე მეტი ხარჯი",
        least: "ყველაზე ნაკლები ხარჯი",
        costMost: "ყველაზე ძვირი ხარჯი",
        costLeast: "ყველაზე იაფი ხარჯი"
      },
      col: {
        name: "პროდუქტი",
        group: "ჯგუფი",
        unit: "ერთ.",
        qty: "ხარჯი",
        cost: "თვითღირებულება",
        avg: "საშუალოდ დღეში",
        share: "წილი"
      },
      semiTag: "ნ/ფ",
      totalRow: n => `სულ · ${n} პროდუქტი`,
      empty: "ამ პერიოდში ხარჯი არ არის",
      error: "Syrve-დან მონაცემი ვერ მივიღე: ",
      note: "Syrve-ის „საქონლის ხარჯი“ (Product COST): რამდენი წაიღო გაყიდვებმა რეცეპტით. საშუალო დღეში = ხარჯი ÷ დღეები გაყიდვებით. სვეტის სათაურზე დაჭერით — დიდიდან პატარისკენ / პატარიდან დიდისკენ. პროდუქტზე დაჭერით — შევსებები და კერძები.",
      det: {
        restocks: "შევსება (მომწოდებლის ზედნადები)",
        dishes: "სად დაიხარჯა (კერძები)",
        col: {
          day: "თარიღი",
          num: "ზედნადები №",
          supplier: "მომწოდებელი",
          qty: "რაოდენობა",
          price: "ფასი",
          sum: "თანხა",
          dish: "კერძი",
          used: "ხარჯი",
          cost: "თვითღირებულება",
          share: "წილი"
        },
        restockTotal: (n, q) => `სულ ${n} შევსება · ${q}`,
        usedTotal: "სულ",
        noRestocks: "ამ პერიოდში შევსება არ ყოფილა",
        noDishes: "ამ პერიოდში ხარჯი არ არის",
        error: "ვერ წავიკითხე: ",
        close: "დახურვა"
      }
    }
  },
  en: {
    appSub: "PriceCheck",
    navMain: "Main",
    navDashboard: "Dashboard",
    tabs: {
      products: "Products",
      distributors: "Distributors",
      bazaar: "Bazaar",
      orders: "Orders",
      storage: "Storage",
      report: "Report",
      mistakes: "Mistakes",
      debts: "Debts",
      history: "History"
    },
    sync: {
      ok: "✓ Synced",
      saving: "Saving…",
      error: "⚠ Offline"
    },
    search: "Search…",
    searchProduct: "Search products…",
    allCats: "All categories",
    allSuppliers: "All suppliers",
    allTypes: "All types",
    all: "All",
    typeDistributor: "Distributor",
    typeBazaar: "Bazaar",
    add: "+ Add",
    csv: "↓ CSV",
    edit: "Edit",
    col: {
      n: "#",
      cat: "Cat.",
      name: "Name",
      code: "rs.ge code",
      supplier: "Supplier",
      contact: "Contact",
      size: "Size",
      netSize: "Net size",
      price: "Price ₾",
      unitPrice: "Unit price",
      comment: "Note"
    },
    kpi: {
      products: "Products",
      suppliers: "Suppliers",
      avgPrice: "Avg. price",
      alternatives: "Alternatives",
      priceKnown: "Price known",
      priceUnknown: "Price unknown",
      open: "Open mistakes",
      sentToDistributor: "Sent to supplier",
      resolved: "Resolved",
      openAmount: "Open amount",
      total: "Total records",
      approved: "Approved",
      sentToAccountant: "Sent to accountant",
      ordersReceived: "Orders received"
    },
    noProducts: "No products found",
    noProductsYet: "No products yet — add one with “+ Add”.",
    noSuppliers: "No suppliers yet",
    bazaarEmpty: "No bazaar suppliers yet — add one with “+ Add”.",
    alt: "Alt.",
    bazaarTag: "Bazaar",
    order: "Order",
    clear: "Clear",
    clearConfirm: "Clear the whole order?",
    orderEmpty: "No products added",
    orderHint: "Tap “+” to add a product, or let an employee write the list in the Telegram group.",
    positions: n => `${n} item${n === 1 ? "" : "s"}`,
    qty: "Qty",
    unit: "Unit",
    commentPh: "Note…",
    whatsappTo: s => `WhatsApp — ${s}`,
    noPhone: "No number saved — you will pick the contact in WhatsApp",
    received: "📦 Received — move to History",
    receivedConfirm: s => `${s}: goods received? They will move to History.`,
    sentAt: d => `✓ Sent ${d}`,
    resend: "Changed — send again",
    estTotal: "Estimated total",
    fromTelegram: "Telegram",
    deleted: "deleted product",
    waybillNo: n => `Waybill № ${n}`,
    checkedBy: "Checked by",
    reason: "Reason",
    noReason: "No reason written yet",
    lines: n => `Lines (${n})`,
    sendDistributor: "Send to distributor",
    sendAccountant: "Send to accountant",
    sendAgain: "Send again",
    markResolved: "✓ Resolved",
    reopen: "↩ Reopen",
    resolveConfirm: "Mark as resolved? It will move to History.",
    mistakesEmpty: "No mistakes 🎉",
    historyEmpty: "History is empty",
    status: {
      approved: "Approved",
      rejected: "Open",
      resolved: "Resolved mistake",
      received: "Order received"
    },
    allStatuses: "All statuses",
    orderReceivedTitle: s => `Order received — ${s}`,
    receivedFromOrder: "Received from order",
    distributorSent: d => `✓ Sent to supplier ${d}`,
    accountantSent: d => `✓ Sent to accountant ${d}`,
    lineStatus: {
      ok: "matches",
      high: "higher",
      low: "lower",
      unknown: "not in list",
      noprice: "no base price"
    },
    base: "base",
    debtsTitle: "Debts",
    debtsSoon: "This section is coming soon.",
    newProduct: "New product",
    editProduct: "Edit product",
    f: {
      type: "Type",
      category: "Category",
      name: "Name",
      nameRs: "Name on rs.ge",
      code: "rs.ge code",
      supplier: "Supplier",
      contactName: "Contact person",
      phone: "Phone (WhatsApp)",
      size: "Size",
      netSize: "Net size",
      price: "Price ₾",
      altSupplier: "Alt. supplier",
      comment: "Note"
    },
    nameRequired: "Name is required",
    delete: "Delete",
    deleteConfirm: n => `Delete “${n}”?`,
    cancel: "Cancel",
    save: "Save",
    saved: "✓ Saved",
    saveFailed: "Could not save. Please try again.",
    settings: "Settings",
    accountant: "Accountant",
    accountantPhone: "Accountant's WhatsApp number",
    accountantHint: "Approved waybills are sent to this number from History.",
    language: "Language",
    systemStatus: "System status",
    statusLabels: {
      storage: "Data storage",
      telegramBot: "Telegram bot",
      rsgeLogin: "rs.ge connection",
      gemini: "Photo reading (Gemini)",
      ceoRegistered: "CEO registered",
      passwordSet: "Password set"
    },
    botHelp: "Telegram bot commands",
    botHelpText: ["In the group: a waybill photo or number — price check", "In the group: a list, one product per line (e.g. “რუკოლა 2კგ”) — added to the order", "CEO's private chat: /password new_password — change the website password", "Any group: /chatid — the group's ID"],
    logout: "Log out",
    close: "Close",
    loginTitle: "Log in",
    password: "Password",
    login: "Log in",
    wrongPassword: "Wrong password",
    tooMany: "Too many attempts — try again in 15 minutes",
    notSet: "No password set yet. The CEO should send the bot (in a private chat): /password new_password",
    connError: "Connection error — please try again",
    loading: "Loading…",
    stock: {
      search: "Search products…",
      all: "All",
      low: "Running low",
      withMin: "With minimum",
      allStores: "All stores",
      prioNames: {
        red: "High priority",
        yellow: "Moderate priority",
        cyan: "Low priority"
      },
      refresh: "↻ Refresh",
      col: {
        prio: "Priority",
        name: "Product",
        syrve: "Syrve",
        live: "Real",
        min: "Minimum",
        inv: "Reconciliation Δ",
        status: "Status"
      },
      kpi: {
        products: "Products",
        low: "Running low",
        lastInv: "Last reconciliation",
        asOf: "Syrve updated",
        endOfDay: "Stock at end of day"
      },
      today: "Today",
      yesterday: "Yesterday",
      date: "Date",
      pastNote: "A past day: Syrve's stock at the end of that day (like Syrve Office's \"Stock balance\"). Real amounts, minimums and alarms are for today only.",
      noInv: "none in 2 months",
      invDoc: (n, c) => `${n ? "№ " + n + " · " : ""}${c} item(s) differed`,
      manual: "manual",
      resetCorr: "Back to the Syrve number",
      corrHint: "A manual change does not touch Syrve and is cleared automatically by the next reconciliation.",
      minHint: "When the real amount falls to the minimum, the bot posts an alarm in the Telegram group.",
      alarm: {
        open: "🔔 Sent",
        approved: "✅ Ordered",
        rejected: "❌ Not ordered",
        low: "Running low"
      },
      linked: "Orders as:",
      autoLinked: "auto",
      noLink: "Not linked to PriceCheck",
      autoOpt: "— automatic —",
      unlinkOpt: "— don't link —",
      changeLink: "change",
      noGroup: "The Telegram group is not known yet — write any message in the employees' group so the bot remembers it.",
      invError: "Could not read reconciliations: ",
      error: "Could not get data from Syrve: ",
      showing: (a, b) => `Showing ${a} of ${b} — narrow the search`,
      empty: "No products found",
      rs: {
        col: "Storage RS",
        diff: "Difference",
        colHint: "This month's rs.ge waybills (from the 1st, starting at zero) − returns − what Syrve took out (sales, write-offs, inventory).",
        diffHint: "RS − Syrve (Syrve also from the 1st, starting at zero). 0 = every waybill is in Syrve with the same amount.",
        open: "Waybills",
        errors: "Could not read everything from rs.ge / Syrve: ",
        off: "Storage RS is counted for the current month only.",
        sum: (from, to) => `${from} – ${to}`,
        rsIn: "rs.ge waybills",
        rsRet: "Returns",
        usage: "Taken out by Syrve",
        rs: "Storage RS",
        start: "Syrve at the start of the month",
        now: "Syrve now",
        delta: "Syrve this month",
        syrveIn: "Syrve invoices",
        syrveRet: "Syrve returns",
        diffLine: "Difference = RS − Syrve this month",
        warn: n => `⚠ ${n} line(s) could not be converted to the unit and don't count — fill in „ზომა (ნეტო)“ in Products.`,
        col2: {
          n: "Waybill",
          day: "Date",
          seller: "Supplier",
          name: "rs.ge name",
          qty: "Qty",
          amt: "In unit",
          syrve: "Syrve"
        },
        how: {
          size: "by size",
          learned: "from Syrve",
          pc: "1:1"
        },
        ret: "return",
        inSyrve: "✓",
        missing: "✗ not in Syrve",
        notOnDoc: "⚠ not on the Syrve invoice",
        noWb: "No waybills this month.",
        prods: "Products whose waybills count:",
        noProds: "No product linked — RS is not counted.",
        add: "+ product",
        remove: "Remove",
        noCode: "no code"
      }
    },
    report: {
      title: "Stock usage",
      presets: {
        today: "Today",
        yesterday: "Yesterday",
        week: "This week",
        month: "This month",
        lastMonth: "Last month"
      },
      from: "from",
      to: "to",
      kpi: {
        cost: "Usage, at cost",
        items: "Products",
        days: "Days with sales",
        perDay: "Average per day"
      },
      search: "Search products…",
      allGroups: "All groups",
      type: "Type",
      kinds: {
        all: "All types",
        goods: "Raw goods",
        semi: "Semi-finished",
        other: "Other"
      },
      sortBy: "Sort",
      sorts: {
        most: "Most used first",
        least: "Least used first",
        costMost: "Highest cost first",
        costLeast: "Lowest cost first"
      },
      col: {
        name: "Product",
        group: "Group",
        unit: "Unit",
        qty: "Used",
        cost: "Cost",
        avg: "Avg per day",
        share: "Share"
      },
      semiTag: "semi",
      totalRow: n => `Total · ${n} products`,
      empty: "No usage in this period",
      error: "Could not get data from Syrve: ",
      note: "Syrve's „Product COST“: what sales took out by recipe. Average per day = usage ÷ days with sales. Click a column header to sort highest first / lowest first. Click a product to see its restocks and dishes.",
      det: {
        restocks: "Restocks (supplier waybills)",
        dishes: "Where it was used (dishes)",
        col: {
          day: "Date",
          num: "Waybill №",
          supplier: "Supplier",
          qty: "Quantity",
          price: "Price",
          sum: "Sum",
          dish: "Dish",
          used: "Used",
          cost: "Cost",
          share: "Share"
        },
        restockTotal: (n, q) => `Total ${n} restock(s) · ${q}`,
        usedTotal: "Total",
        noRestocks: "No restocks in this period",
        noDishes: "No usage in this period",
        error: "Could not read: ",
        close: "Close"
      }
    }
  }
};
const TABS = ["products", "distributors", "bazaar", "orders", "storage", "report", "mistakes", "debts", "history"];
const CATEGORIES = ["ხორცეული", "ყველი", "ზეთი", "პასტა", "ბოსტნეული", "რძის პროდუქტი", "ყავა", "თხილეული", "გაყინული", "სხვა"];
const CAT_EN = {
  "ხორცეული": "Meat",
  "ყველი": "Cheese",
  "ზეთი": "Oil",
  "პასტა": "Pasta",
  "ბოსტნეული": "Vegetables",
  "რძის პროდუქტი": "Dairy",
  "ყავა": "Coffee",
  "თხილეული": "Nuts",
  "გაყინული": "Frozen",
  "სხვა": "Other"
};
const CAT_COLORS = {
  "ხორცეული": ["#fcd690", "#7a4a00"],
  "ყველი": ["#fdeaa7", "#6b5200"],
  "ზეთი": ["#d9ef8f", "#3f5a00"],
  "პასტა": ["#f9d3b4", "#7a3e10"],
  "ბოსტნეული": ["#b4ecd6", "#0d6046"],
  "რძის პროდუქტი": ["#dbe8ff", "#1d3f8a"],
  "ყავა": ["#e6d2bd", "#5a3416"],
  "თხილეული": ["#efdcc8", "#6b4422"],
  "გაყინული": ["#cdeefc", "#0b5875"],
  "სხვა": ["#e8e6e1", "#555"]
};
function catColor(cat) {
  if (CAT_COLORS[cat]) return CAT_COLORS[cat];
  let h = 0;
  for (const ch of String(cat)) h = (h * 31 + ch.codePointAt(0)) % 360;
  return [`hsl(${h} 70% 88%)`, `hsl(${h} 45% 28%)`];
}
const num = v => Number(v) || 0;
const money = n => num(n) > 0 ? `${num(n).toFixed(2)}₾` : "—";
const NET_UNITS = ["კგ", "ლ", "ც"];
const unitPrice = p => {
  const m = String(p.unit || "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*([^\d\s.,x×]*)/);
  const size = m ? Number(m[1]) : 0;
  return size > 0 && num(p.basePrice) > 0 ? `${(num(p.basePrice) / size).toFixed(2)}₾${m[2] ? "/" + m[2] : ""}` : "";
};
const qtyStr = n => String(Math.round(num(n) * 1000) / 1000);
const norm = s => String(s ?? "").toLowerCase().trim();
function fmtDate(iso, withYear = false) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 10);
  const p = x => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}${withYear ? "." + d.getFullYear() : ""} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function waNumber(phone) {
  let d = String(phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "995" + d;
  if (d.length === 10 && d.startsWith("0")) d = "995" + d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : "";
}
const waUrl = (phone, text) => `https://wa.me/${waNumber(phone)}${text ? "?text=" + encodeURIComponent(text) : ""}`;
function downloadCsv(filename, header, rows) {
  const esc = v => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [header, ...rows].map(r => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {
    type: "text/csv;charset=utf-8"
  }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
async function api(path, body, method) {
  const res = await fetch(path, {
    method: method || (body !== undefined ? "POST" : "GET"),
    headers: body !== undefined ? {
      "Content-Type": "application/json"
    } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin"
  });
  let data = null;
  try {
    data = JSON.parse(await res.text());
  } catch {}
  if (!res.ok) throw new ApiError(data?.error || `HTTP ${res.status}`, res.status);
  return data;
}
function readLang() {
  try {
    return localStorage.getItem("pc_lang") === "en" ? "en" : "ka";
  } catch {
    return "ka";
  }
}
function tabFromHash() {
  const h = (location.hash || "").replace("#", "");
  return TABS.includes(h) ? h : "products";
}
function WaIcon({
  size = 14
}) {
  return React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.79 14.06c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.79 1.92.86 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.13.16-.28.36-.4.48-.13.13-.27.28-.12.55.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.13.45.2.52.32.07.11.07.66-.17 1.34z"
  }));
}
function CatPill({
  cat,
  lang
}) {
  if (!cat) return React.createElement("span", {
    className: "muted"
  }, "—");
  const [bg, fg] = catColor(cat);
  return React.createElement("span", {
    className: "pill",
    style: {
      background: bg,
      color: fg
    }
  }, lang === "en" && CAT_EN[cat] ? CAT_EN[cat] : cat);
}
function Kpis({
  items
}) {
  return React.createElement("div", {
    className: "kpis"
  }, items.map(([label, value], i) => React.createElement("div", {
    className: "card kpi",
    key: i
  }, React.createElement("div", {
    className: "kpi-label"
  }, label), React.createElement("div", {
    className: "kpi-value"
  }, value))));
}
function Contact({
  name,
  phone
}) {
  if (!name && !phone) return React.createElement("span", {
    className: "muted"
  }, "—");
  const n = waNumber(phone);
  return React.createElement("span", {
    className: "contact"
  }, name ? name + " " : "", phone, n && React.createElement("a", {
    className: "dot",
    href: waUrl(phone),
    target: "_blank",
    rel: "noopener",
    title: "WhatsApp"
  }));
}
function Empty({
  children
}) {
  return React.createElement("div", {
    className: "empty"
  }, children);
}
function Login({
  t,
  lang,
  setLang,
  passwordSet,
  onDone
}) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(passwordSet ? "" : t.notSet);
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    setErr("");
    try {
      await api("/api/login", {
        password: pw
      });
      onDone();
    } catch (er) {
      setErr(er.message === "wrong" ? t.wrongPassword : er.message === "too_many" ? t.tooMany : er.message === "not_set" ? t.notSet : t.connError);
    } finally {
      setBusy(false);
    }
  };
  return React.createElement("div", {
    className: "login-wrap"
  }, React.createElement("form", {
    className: "card login",
    onSubmit: submit
  }, React.createElement("div", {
    className: "login-top"
  }, React.createElement("div", {
    className: "brand"
  }, "🫓 Focacceria ", React.createElement("span", {
    className: "muted"
  }, "— ", t.appSub)), React.createElement("button", {
    type: "button",
    className: "btn-ghost small",
    onClick: () => setLang(lang === "ka" ? "en" : "ka")
  }, lang === "ka" ? "EN" : "ქა")), React.createElement("label", {
    className: "field-label"
  }, t.password), React.createElement("input", {
    className: "input",
    type: "password",
    autoFocus: true,
    value: pw,
    onChange: e => setPw(e.target.value),
    autoComplete: "current-password"
  }), err && React.createElement("div", {
    className: "error-text"
  }, err), React.createElement("button", {
    className: "btn-dark wide",
    disabled: busy || !pw
  }, busy ? "…" : t.login)));
}
function ProductTable({
  t,
  lang,
  rows,
  onEdit,
  emptyText
}) {
  return React.createElement("div", {
    className: "card table-card"
  }, React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    className: "table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    className: "c-n"
  }, t.col.n), React.createElement("th", null, t.col.cat), React.createElement("th", null, t.col.name), React.createElement("th", null, t.col.code), React.createElement("th", null, t.col.supplier), React.createElement("th", null, t.col.contact), React.createElement("th", null, t.col.size), React.createElement("th", null, t.col.netSize), React.createElement("th", null, t.col.price), React.createElement("th", null, t.col.unitPrice), React.createElement("th", null, t.col.comment), React.createElement("th", null))), React.createElement("tbody", null, rows.map((p, i) => React.createElement("tr", {
    key: p.id
  }, React.createElement("td", {
    className: "c-n muted"
  }, i + 1), React.createElement("td", null, React.createElement(CatPill, {
    cat: p.category,
    lang: lang
  })), React.createElement("td", {
    className: "strong"
  }, p.name, p.type === "bazaar" && React.createElement("span", {
    className: "tag"
  }, t.bazaarTag), p.isAlt && React.createElement("span", {
    className: "tag"
  }, "ALT")), React.createElement("td", {
    className: "muted mono"
  }, p.code || "—"), React.createElement("td", null, p.supplier || React.createElement("span", {
    className: "muted"
  }, "—")), React.createElement("td", null, React.createElement(Contact, {
    name: p.contactName,
    phone: p.phone
  })), React.createElement("td", null, p.unit || React.createElement("span", {
    className: "muted"
  }, "—")), React.createElement("td", null, p.netSize > 0 ? `${p.netSize} ${p.netUnit || NET_UNITS[0]}` : React.createElement("span", {
    className: "muted"
  }, "—")), React.createElement("td", {
    className: "strong"
  }, money(p.basePrice)), React.createElement("td", null, unitPrice(p) || React.createElement("span", {
    className: "muted"
  }, "—")), React.createElement("td", {
    className: "muted small"
  }, p.comment, p.altSupplier && React.createElement("div", null, t.alt, " ", p.altSupplier)), React.createElement("td", {
    className: "c-act"
  }, React.createElement("button", {
    className: "icon-btn",
    title: t.edit,
    onClick: () => onEdit(p)
  }, "✎"))))))), !rows.length && React.createElement(Empty, null, emptyText));
}
function productCsv(list, name) {
  downloadCsv(name, ["type", "category", "name", "nameRs", "code", "supplier", "contactName", "phone", "size", "price", "altSupplier", "comment", "netSize", "unitPrice"], list.map(p => [p.type, p.category, p.name, p.nameRs, p.code, p.supplier, p.contactName, p.phone, p.unit, p.basePrice, p.altSupplier, p.comment, p.netSize > 0 ? `${p.netSize} ${p.netUnit || NET_UNITS[0]}` : "", unitPrice(p)]));
}
function matchesSearch(p, q) {
  if (!q) return true;
  return [p.name, p.nameRs, p.code, p.supplier, p.contactName, p.phone, p.category, p.comment].some(v => norm(v).includes(q));
}
function ProductsTab({
  t,
  lang,
  products,
  onEdit,
  onAdd
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sup, setSup] = useState("");
  const [type, setType] = useState("");
  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const sups = useMemo(() => [...new Set(products.map(p => p.supplier).filter(Boolean))].sort(), [products]);
  const rows = products.filter(p => matchesSearch(p, norm(q)) && (!cat || p.category === cat) && (!sup || p.supplier === sup) && (!type || p.type === type));
  const priced = products.filter(p => num(p.basePrice) > 0);
  const avg = priced.length ? priced.reduce((s, p) => s + num(p.basePrice), 0) / priced.length : 0;
  return React.createElement(React.Fragment, null, React.createElement(Kpis, {
    items: [[t.kpi.products, products.length], [t.kpi.suppliers, sups.length], [t.kpi.avgPrice, avg ? `${avg.toFixed(2)}₾` : "—"], [t.kpi.alternatives, products.filter(p => p.altSupplier || p.isAlt).length]]
  }), React.createElement("div", {
    className: "toolbar"
  }, React.createElement("input", {
    className: "input grow",
    placeholder: t.search,
    value: q,
    onChange: e => setQ(e.target.value)
  }), React.createElement("select", {
    className: "input",
    value: cat,
    onChange: e => setCat(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, t.allCats), cats.map(c => React.createElement("option", {
    key: c,
    value: c
  }, lang === "en" && CAT_EN[c] ? CAT_EN[c] : c))), React.createElement("select", {
    className: "input",
    value: sup,
    onChange: e => setSup(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, t.allSuppliers), sups.map(s => React.createElement("option", {
    key: s,
    value: s
  }, s))), React.createElement("select", {
    className: "input",
    value: type,
    onChange: e => setType(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, t.allTypes), React.createElement("option", {
    value: "distributor"
  }, t.typeDistributor), React.createElement("option", {
    value: "bazaar"
  }, t.typeBazaar)), React.createElement("button", {
    className: "btn-dark",
    onClick: () => onAdd("distributor")
  }, t.add), React.createElement("button", {
    className: "btn-outline",
    onClick: () => productCsv(rows, "products.csv")
  }, t.csv)), React.createElement(ProductTable, {
    t: t,
    lang: lang,
    rows: rows,
    onEdit: onEdit,
    emptyText: products.length ? t.noProducts : t.noProductsYet
  }));
}
function groupBySupplier(products) {
  const map = new Map();
  for (const p of products) {
    const key = p.supplier || "";
    if (!key) continue;
    if (!map.has(key)) map.set(key, {
      name: key,
      products: [],
      contactName: "",
      phone: ""
    });
    const g = map.get(key);
    g.products.push(p);
    if (!g.phone && p.phone) {
      g.phone = p.phone;
      g.contactName = p.contactName;
    }
    if (!g.contactName && p.contactName) g.contactName = p.contactName;
  }
  return [...map.values()].sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name));
}
function SupplierCards({
  groups
}) {
  return React.createElement("div", {
    className: "supplier-grid"
  }, groups.map(g => React.createElement("div", {
    className: "card supplier",
    key: g.name
  }, React.createElement("div", {
    className: "supplier-head"
  }, React.createElement("div", {
    className: "strong"
  }, g.name), waNumber(g.phone) && React.createElement("a", {
    className: "btn-wa small",
    href: waUrl(g.phone),
    target: "_blank",
    rel: "noopener"
  }, React.createElement(WaIcon, null), " WA")), (g.contactName || g.phone) && React.createElement("div", {
    className: "supplier-contact"
  }, [g.contactName, g.phone].filter(Boolean).join(" ")), React.createElement("div", {
    className: "supplier-products"
  }, g.products.map(p => p.name).join(", ")))));
}
function DistributorsTab({
  t,
  products
}) {
  const groups = groupBySupplier(products.filter(p => p.type !== "bazaar"));
  return React.createElement(React.Fragment, null, React.createElement(Kpis, {
    items: [[t.kpi.suppliers, groups.length], ...groups.slice(0, 3).map(g => [g.name, g.products.length])]
  }), groups.length ? React.createElement(SupplierCards, {
    groups: groups
  }) : React.createElement("div", {
    className: "card"
  }, React.createElement(Empty, null, t.noSuppliers)));
}
function BazaarTab({
  t,
  lang,
  products,
  onEdit,
  onAdd
}) {
  const [q, setQ] = useState("");
  const bazaar = products.filter(p => p.type === "bazaar");
  const groups = groupBySupplier(bazaar);
  const rows = bazaar.filter(p => matchesSearch(p, norm(q)));
  const known = bazaar.filter(p => num(p.basePrice) > 0).length;
  return React.createElement(React.Fragment, null, React.createElement(Kpis, {
    items: [[t.kpi.suppliers, groups.length], [t.kpi.products, bazaar.length], [t.kpi.priceKnown, known], [t.kpi.priceUnknown, bazaar.length - known]]
  }), React.createElement("div", {
    className: "toolbar"
  }, React.createElement("input", {
    className: "input grow",
    placeholder: t.search,
    value: q,
    onChange: e => setQ(e.target.value)
  }), React.createElement("button", {
    className: "btn-dark",
    onClick: () => onAdd("bazaar")
  }, t.add), React.createElement("button", {
    className: "btn-outline",
    onClick: () => productCsv(rows, "bazaar.csv")
  }, t.csv)), groups.length > 0 && React.createElement(SupplierCards, {
    groups: groups
  }), React.createElement(ProductTable, {
    t: t,
    lang: lang,
    rows: rows,
    onEdit: onEdit,
    emptyText: bazaar.length ? t.noProducts : t.bazaarEmpty
  }));
}
function orderMessage(lines) {
  return "გამარჯობა! Focacceria-ს შეკვეთა:\n" + lines.map(l => `• ${l.name} — ${qtyStr(l.qty)}${l.unit ? " " + l.unit : ""}${l.comment ? ` (${l.comment})` : ""}`).join("\n") + "\nგმადლობთ!";
}
function OrderLine({
  t,
  item,
  product,
  onChange,
  onRemove
}) {
  const [local, setLocal] = useState({
    qty: String(item.qty),
    unit: item.unit || "",
    comment: item.comment || ""
  });
  const focused = useRef(false);
  const timer = useRef(null);
  useEffect(() => {
    if (!focused.current) setLocal({
      qty: String(item.qty),
      unit: item.unit || "",
      comment: item.comment || ""
    });
  }, [item.qty, item.unit, item.comment]);
  const update = (field, value) => {
    const next = {
      ...local,
      [field]: value
    };
    setLocal(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 700);
  };
  const flush = () => {
    focused.current = false;
    clearTimeout(timer.current);
    if (local.qty !== String(item.qty) || local.unit !== (item.unit || "") || local.comment !== (item.comment || "")) onChange(local);
  };
  const inputProps = {
    onFocus: () => {
      focused.current = true;
    },
    onBlur: flush
  };
  return React.createElement("div", {
    className: "order-line"
  }, React.createElement("div", {
    className: "order-line-top"
  }, React.createElement("div", null, React.createElement("div", {
    className: "strong"
  }, product?.name || `#${item.productId} (${t.deleted})`), React.createElement("div", {
    className: "order-line-meta"
  }, React.createElement("span", {
    className: "small muted"
  }, money(product?.basePrice)), product?.unit && React.createElement("span", {
    className: "chip"
  }, product.unit), item.source === "telegram" && React.createElement("span", {
    className: "chip tg",
    title: item.by
  }, "✈ ", t.fromTelegram))), React.createElement("button", {
    className: "x-btn",
    onClick: onRemove,
    title: "✕"
  }, "×")), React.createElement("div", {
    className: "order-line-inputs"
  }, React.createElement("input", {
    className: "input qty",
    inputMode: "decimal",
    value: local.qty,
    onChange: e => update("qty", e.target.value),
    ...inputProps,
    "aria-label": t.qty
  }), React.createElement("input", {
    className: "input unit",
    value: local.unit,
    onChange: e => update("unit", e.target.value),
    placeholder: "კგ",
    ...inputProps,
    "aria-label": t.unit
  }), React.createElement("input", {
    className: "input grow",
    value: local.comment,
    onChange: e => update("comment", e.target.value),
    placeholder: t.commentPh,
    ...inputProps
  })));
}
function OrdersTab({
  t,
  lang,
  products,
  order,
  orderOps
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const inOrder = useMemo(() => new Set(order.items.map(i => i.productId)), [order]);
  const list = products.filter(p => matchesSearch(p, norm(q)) && (!type || p.type === type));
  const groups = useMemo(() => {
    const map = new Map();
    for (const it of order.items) {
      const p = byId.get(it.productId);
      const key = p?.supplier || "—";
      if (!map.has(key)) map.set(key, {
        supplier: key,
        items: [],
        phone: "",
        contactName: ""
      });
      const g = map.get(key);
      g.items.push(it);
      if (!g.phone && p?.phone) {
        g.phone = p.phone;
        g.contactName = p.contactName;
      }
    }
    return [...map.values()];
  }, [order, byId]);
  const total = order.items.reduce((s, it) => s + num(byId.get(it.productId)?.basePrice) * num(it.qty), 0);
  const toggle = p => orderOps(inOrder.has(p.id) ? [{
    op: "remove",
    productId: p.id
  }] : [{
    op: "set",
    productId: p.id,
    qty: 1,
    unit: ""
  }]);
  return React.createElement("div", {
    className: "orders"
  }, React.createElement("div", {
    className: "card orders-list"
  }, React.createElement("div", {
    className: "toolbar inner"
  }, React.createElement("input", {
    className: "input grow",
    placeholder: t.searchProduct,
    value: q,
    onChange: e => setQ(e.target.value)
  }), React.createElement("select", {
    className: "input",
    value: type,
    onChange: e => setType(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, t.all), React.createElement("option", {
    value: "distributor"
  }, t.typeDistributor), React.createElement("option", {
    value: "bazaar"
  }, t.typeBazaar))), React.createElement("div", {
    className: "orders-scroll"
  }, list.map(p => {
    const on = inOrder.has(p.id);
    return React.createElement("div", {
      className: "order-row" + (on ? " on" : ""),
      key: p.id
    }, React.createElement("div", {
      className: "order-row-main"
    }, React.createElement("div", {
      className: "strong"
    }, p.name), React.createElement("div", {
      className: "small muted"
    }, [p.supplier, lang === "en" && CAT_EN[p.category] ? CAT_EN[p.category] : p.category].filter(Boolean).map(x => "· " + x).join(" "))), React.createElement("div", {
      className: "order-row-price"
    }, React.createElement("div", {
      className: "strong"
    }, money(p.basePrice)), p.unit && React.createElement("div", {
      className: "small muted"
    }, p.unit)), React.createElement("button", {
      className: "round-btn" + (on ? " on" : ""),
      onClick: () => toggle(p),
      "aria-label": on ? "remove" : "add"
    }, on ? "✓" : "+"));
  }), !list.length && React.createElement(Empty, null, products.length ? t.noProducts : t.noProductsYet))), React.createElement("div", {
    className: "card order-panel"
  }, React.createElement("div", {
    className: "order-panel-head"
  }, React.createElement("div", {
    className: "strong big"
  }, t.order), order.items.length > 0 && React.createElement("button", {
    className: "btn-danger-outline",
    onClick: () => confirm(t.clearConfirm) && orderOps([{
      op: "clear"
    }])
  }, t.clear)), !order.items.length && React.createElement(Empty, null, t.orderEmpty, React.createElement("div", {
    className: "small muted hint"
  }, t.orderHint)), groups.map(g => {
    const lines = g.items.map(it => ({
      ...it,
      name: byId.get(it.productId)?.name || `#${it.productId}`
    }));
    const allSent = g.items.every(it => it.status === "sent");
    const someSent = g.items.some(it => it.status === "sent");
    const lastSent = g.items.map(it => it.sentAt).filter(Boolean).sort().pop();
    const ids = g.items.map(it => it.productId);
    return React.createElement("div", {
      className: "order-group",
      key: g.supplier
    }, React.createElement("div", {
      className: "order-group-head"
    }, React.createElement("div", null, React.createElement("div", {
      className: "strong"
    }, g.supplier), React.createElement("div", {
      className: "small muted"
    }, [g.contactName, g.phone].filter(Boolean).join(" "))), React.createElement("div", {
      className: "small muted"
    }, t.positions(g.items.length))), g.items.map(it => React.createElement(OrderLine, {
      key: it.productId,
      t: t,
      item: it,
      product: byId.get(it.productId),
      onChange: v => orderOps([{
        op: "set",
        productId: it.productId,
        qty: v.qty,
        unit: v.unit,
        comment: v.comment
      }]),
      onRemove: () => orderOps([{
        op: "remove",
        productId: it.productId
      }])
    })), React.createElement("div", {
      className: "order-group-actions"
    }, allSent && lastSent && React.createElement("div", {
      className: "sent-note"
    }, t.sentAt(fmtDate(lastSent))), !allSent && someSent && React.createElement("div", {
      className: "warn-note"
    }, t.resend), !waNumber(g.phone) && React.createElement("div", {
      className: "small muted"
    }, t.noPhone), React.createElement("a", {
      className: "btn-wa",
      href: waUrl(g.phone, orderMessage(lines)),
      target: "_blank",
      rel: "noopener",
      onClick: () => orderOps([{
        op: "sent",
        productIds: ids
      }])
    }, React.createElement(WaIcon, {
      size: 16
    }), " ", t.whatsappTo(g.supplier)), React.createElement("button", {
      className: "btn-green-outline",
      onClick: () => confirm(t.receivedConfirm(g.supplier)) && orderOps([{
        op: "received",
        productIds: ids
      }])
    }, t.received)));
  }), order.items.length > 0 && React.createElement("div", {
    className: "order-total"
  }, React.createElement("span", {
    className: "muted"
  }, t.estTotal), React.createElement("span", {
    className: "strong big"
  }, total.toFixed(2), "₾"))));
}
function LinesTable({
  t,
  rows
}) {
  return React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    className: "table mini"
  }, React.createElement("tbody", null, rows.map((r, i) => React.createElement("tr", {
    key: i,
    className: "line-" + r.s
  }, React.createElement("td", null, r.n), React.createElement("td", {
    className: "nowrap"
  }, qtyStr(r.q), " ", r.u), React.createElement("td", {
    className: "nowrap strong"
  }, num(r.p).toFixed(2), "₾"), React.createElement("td", {
    className: "nowrap muted"
  }, r.b != null ? `${t.base}: ${num(r.b).toFixed(2)}₾` : ""), React.createElement("td", {
    className: "nowrap"
  }, React.createElement("span", {
    className: "status-dot s-" + r.s
  }, t.lineStatus[r.s] || r.s)))))));
}
function RecordCard({
  t,
  rec,
  children
}) {
  const [open, setOpen] = useState(false);
  const isOrder = rec.kind === "order";
  const bad = (rec.rows || []).filter(r => r.s === "high" || r.s === "low").length;
  return React.createElement("div", {
    className: "card record"
  }, React.createElement("div", {
    className: "record-head"
  }, React.createElement("div", null, React.createElement("div", {
    className: "strong"
  }, isOrder ? t.orderReceivedTitle(rec.supplier) : t.waybillNo(rec.number)), React.createElement("div", {
    className: "small muted"
  }, [!isOrder && rec.seller, rec.total && `${rec.total}₾`, rec.by && `${t.checkedBy}: ${rec.by}`, fmtDate(rec.decidedAt || rec.createdAt)].filter(Boolean).join(" · "))), React.createElement("span", {
    className: "status-pill st-" + rec.status
  }, t.status[rec.status] || rec.status)), (rec.status === "rejected" || rec.status === "resolved") && React.createElement("div", {
    className: "reason" + (rec.comment ? "" : " empty-reason")
  }, rec.comment ? React.createElement(React.Fragment, null, React.createElement("b", null, t.reason, ":"), " ", rec.comment) : t.noReason), rec.receivedItems?.length > 0 && React.createElement("div", {
    className: "small received-line"
  }, "🛒 ", t.receivedFromOrder, ": ", rec.receivedItems.map(x => `${x.name} ${qtyStr(x.qty)}${x.unit ? " " + x.unit : ""}`).join(", ")), isOrder && React.createElement("div", {
    className: "small"
  }, rec.items.map(x => `${x.name} — ${qtyStr(x.qty)}${x.unit ? " " + x.unit : ""}${x.comment ? ` (${x.comment})` : ""}`).join(" · ")), !isOrder && rec.rows?.length > 0 && React.createElement("button", {
    className: "link-btn",
    onClick: () => setOpen(!open)
  }, t.lines(rec.rows.length), " ", bad > 0 && React.createElement("span", {
    className: "bad-count"
  }, "⚠ ", bad), " ", open ? "▴" : "▾"), open && React.createElement(LinesTable, {
    t: t,
    rows: rec.rows
  }), children && React.createElement("div", {
    className: "record-actions"
  }, children));
}
function recordSearch(rec, q) {
  if (!q) return true;
  return [rec.number, rec.seller, rec.supplier, rec.by, rec.comment, ...(rec.rows || []).map(r => r.n), ...(rec.items || []).map(x => x.name)].some(v => norm(v).includes(q));
}
function MistakesTab({
  t,
  log,
  logAction,
  refresh
}) {
  const [q, setQ] = useState("");
  const open = log.filter(r => r.kind !== "order" && r.status === "rejected");
  const resolved = log.filter(r => r.status === "resolved");
  const rows = open.filter(r => recordSearch(r, norm(q)));
  const amount = open.reduce((s, r) => s + num(r.total), 0);
  return React.createElement(React.Fragment, null, React.createElement(Kpis, {
    items: [[t.kpi.open, open.length], [t.kpi.sentToDistributor, open.filter(r => r.distributorSentAt).length], [t.kpi.resolved, resolved.length], [t.kpi.openAmount, amount ? `${amount.toFixed(2)}₾` : "—"]]
  }), React.createElement("div", {
    className: "toolbar"
  }, React.createElement("input", {
    className: "input grow",
    placeholder: t.search,
    value: q,
    onChange: e => setQ(e.target.value)
  })), React.createElement("div", {
    className: "records"
  }, rows.map(rec => React.createElement(RecordCard, {
    key: rec.token,
    t: t,
    rec: rec
  }, rec.distributorSentAt && React.createElement("span", {
    className: "sent-note"
  }, t.distributorSent(fmtDate(rec.distributorSentAt))), React.createElement("a", {
    className: "btn-wa",
    href: `/wa/${rec.token}/d`,
    target: "_blank",
    rel: "noopener",
    onClick: () => setTimeout(refresh, 1500)
  }, React.createElement(WaIcon, {
    size: 16
  }), " ", rec.distributorSentAt ? t.sendAgain : t.sendDistributor), React.createElement("button", {
    className: "btn-dark",
    onClick: () => confirm(t.resolveConfirm) && logAction(rec.token, "resolve")
  }, t.markResolved))), !rows.length && React.createElement("div", {
    className: "card"
  }, React.createElement(Empty, null, open.length ? t.noProducts : t.mistakesEmpty))));
}
function HistoryTab({
  t,
  log,
  logAction,
  refresh
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const items = log.filter(r => r.status === "approved" || r.status === "resolved" || r.status === "received");
  const rows = items.filter(r => (!status || r.status === status) && recordSearch(r, norm(q)));
  const approved = items.filter(r => r.status === "approved");
  return React.createElement(React.Fragment, null, React.createElement(Kpis, {
    items: [[t.kpi.total, items.length], [t.kpi.approved, approved.length], [t.kpi.sentToAccountant, approved.filter(r => r.accountantSentAt).length], [t.kpi.ordersReceived, items.filter(r => r.status === "received").length]]
  }), React.createElement("div", {
    className: "toolbar"
  }, React.createElement("input", {
    className: "input grow",
    placeholder: t.search,
    value: q,
    onChange: e => setQ(e.target.value)
  }), React.createElement("select", {
    className: "input grow",
    value: status,
    onChange: e => setStatus(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, t.allStatuses), React.createElement("option", {
    value: "approved"
  }, t.status.approved), React.createElement("option", {
    value: "resolved"
  }, t.status.resolved), React.createElement("option", {
    value: "received"
  }, t.status.received))), React.createElement("div", {
    className: "records"
  }, rows.map(rec => React.createElement(RecordCard, {
    key: rec.token,
    t: t,
    rec: rec
  }, rec.status === "approved" && React.createElement(React.Fragment, null, rec.accountantSentAt && React.createElement("span", {
    className: "sent-note"
  }, t.accountantSent(fmtDate(rec.accountantSentAt))), React.createElement("a", {
    className: rec.accountantSentAt ? "btn-outline" : "btn-wa",
    href: `/wa/${rec.token}/a`,
    target: "_blank",
    rel: "noopener",
    onClick: () => setTimeout(refresh, 1500)
  }, React.createElement(WaIcon, {
    size: 16
  }), " ", rec.accountantSentAt ? t.sendAgain : t.sendAccountant)), rec.status === "resolved" && React.createElement(React.Fragment, null, rec.distributorSentAt && React.createElement("span", {
    className: "sent-note"
  }, t.distributorSent(fmtDate(rec.distributorSentAt))), React.createElement("button", {
    className: "btn-outline",
    onClick: () => logAction(rec.token, "reopen")
  }, t.reopen)))), !rows.length && React.createElement("div", {
    className: "card"
  }, React.createElement(Empty, null, t.historyEmpty))));
}
function DebtsTab({
  t
}) {
  return React.createElement("div", {
    className: "card soon"
  }, React.createElement("div", {
    className: "soon-icon"
  }, "💳"), React.createElement("div", {
    className: "strong big"
  }, t.debtsTitle), React.createElement("div", {
    className: "muted"
  }, t.debtsSoon));
}
const pad2 = n => String(n).padStart(2, "0");
const isoDay = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function reportPresets(today) {
  const d = new Date(today + "T12:00:00");
  const wd = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - wd);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const prevFirst = new Date(d.getFullYear(), d.getMonth() - 1, 1),
    prevLast = new Date(d.getFullYear(), d.getMonth(), 0);
  const yest = new Date(d);
  yest.setDate(d.getDate() - 1);
  return {
    today: [today, today],
    yesterday: [isoDay(yest), isoDay(yest)],
    week: [isoDay(monday), today],
    month: [isoDay(first), today],
    lastMonth: [isoDay(prevFirst), isoDay(prevLast)]
  };
}
const TYPE_KIND = type => type === "PREPARED" ? "semi" : type === "GOODS" ? "goods" : "other";
function UsageDetail({
  t,
  guard,
  item,
  range
}) {
  const d = t.report.det;
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setErr("");
    const qs = new URLSearchParams({
      id: item.id,
      from: range[0],
      to: range[1]
    });
    guard(() => api("/api/report/usage/item?" + qs)).then(r => {
      if (live) setData(r);
    }).catch(e => {
      if (live) setErr(e.message);
    });
    return () => {
      live = false;
    };
  }, [guard, item.id, range[0], range[1]]);
  if (err) return React.createElement("div", {
    className: "usage-detail error-text"
  }, d.error, err);
  if (!data) return React.createElement("div", {
    className: "usage-detail muted small"
  }, t.loading);
  const u = data.unit || item.unit;
  const fmtDay = day => day.split("-").reverse().join(".");
  const restockQty = data.restocks.reduce((a, x) => a + x.qty, 0);
  return React.createElement("div", {
    className: "usage-detail"
  }, React.createElement("div", {
    className: "usage-block"
  }, React.createElement("div", {
    className: "section-title"
  }, d.restocks), data.errors?.restocks && React.createElement("div", {
    className: "error-text small"
  }, d.error, data.errors.restocks), data.restocks.length ? React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    className: "table mini"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, d.col.day), React.createElement("th", null, d.col.num), React.createElement("th", null, d.col.supplier), React.createElement("th", {
    className: "r"
  }, d.col.qty), React.createElement("th", {
    className: "r"
  }, d.col.price), React.createElement("th", {
    className: "r"
  }, d.col.sum))), React.createElement("tbody", null, data.restocks.map((x, i) => React.createElement("tr", {
    key: x.num + ":" + i
  }, React.createElement("td", {
    className: "nowrap mono"
  }, fmtDay(x.day)), React.createElement("td", {
    className: "mono"
  }, x.num || "—"), React.createElement("td", null, x.supplier || "—"), React.createElement("td", {
    className: "r mono nowrap strong"
  }, qtyStr(x.qty), " ", u), React.createElement("td", {
    className: "r mono nowrap"
  }, money(x.price)), React.createElement("td", {
    className: "r mono nowrap"
  }, money(x.sum))))), React.createElement("tfoot", null, React.createElement("tr", null, React.createElement("td", {
    colSpan: 3,
    className: "strong"
  }, d.restockTotal(data.restocks.length, qtyStr(restockQty) + " " + u)), React.createElement("td", null), React.createElement("td", null), React.createElement("td", {
    className: "r mono nowrap strong"
  }, money(data.restocks.reduce((a, x) => a + x.sum, 0))))))) : React.createElement("div", {
    className: "muted small"
  }, d.noRestocks)), React.createElement("div", {
    className: "usage-block"
  }, React.createElement("div", {
    className: "section-title"
  }, d.dishes), data.errors?.dishes && React.createElement("div", {
    className: "error-text small"
  }, d.error, data.errors.dishes), data.dishes.length ? React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    className: "table mini"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, d.col.dish), React.createElement("th", {
    className: "r"
  }, d.col.used), React.createElement("th", {
    className: "r"
  }, d.col.cost), React.createElement("th", {
    className: "r"
  }, d.col.share))), React.createElement("tbody", null, data.dishes.map(x => React.createElement("tr", {
    key: x.name
  }, React.createElement("td", null, x.name), React.createElement("td", {
    className: "r mono nowrap strong"
  }, qtyStr(x.qty), " ", u), React.createElement("td", {
    className: "r mono nowrap"
  }, money(x.cost)), React.createElement("td", {
    className: "r mono nowrap"
  }, data.used.qty ? (x.qty / data.used.qty * 100).toFixed(1) + "%" : "—")))), React.createElement("tfoot", null, React.createElement("tr", null, React.createElement("td", {
    className: "strong"
  }, d.usedTotal), React.createElement("td", {
    className: "r mono nowrap strong"
  }, qtyStr(data.used.qty), " ", u), React.createElement("td", {
    className: "r mono nowrap strong"
  }, money(data.used.cost)), React.createElement("td", null))))) : React.createElement("div", {
    className: "muted small"
  }, d.noDishes)));
}
function ReportTab({
  t,
  guard
}) {
  const r = t.report;
  const todayStr = isoDay(new Date());
  const presets = reportPresets(todayStr);
  const [range, setRange] = useState(presets.month);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState({
    key: "qty",
    dir: -1
  });
  const [open, setOpen] = useState("");
  const seq = useRef(0);
  const load = useCallback(async fresh => {
    const n = ++seq.current;
    setBusy(true);
    const qs = new URLSearchParams({
      from: range[0],
      to: range[1]
    });
    if (fresh) qs.set("fresh", "1");
    try {
      const res = await guard(() => api("/api/report/usage?" + qs));
      if (n === seq.current) {
        setData(res);
        setErr("");
      }
    } catch (e) {
      if (n === seq.current) setErr(e.message);
    }
    if (n === seq.current) setBusy(false);
  }, [guard, range[0], range[1]]);
  useEffect(() => {
    load(false);
  }, [load]);
  const preset = Object.keys(presets).find(k => presets[k][0] === range[0] && presets[k][1] === range[1]) || "";
  const setFrom = v => v && setRange([v, v > range[1] ? v : range[1]]);
  const setTo = v => v && setRange([v < range[0] ? v : range[0], v > todayStr ? todayStr : v]);
  const toolbar = React.createElement("div", {
    className: "toolbar stock-days report-days"
  }, React.createElement("div", {
    className: "segmented"
  }, ["today", "yesterday", "week", "month", "lastMonth"].map(k => React.createElement("button", {
    key: k,
    className: preset === k ? "on" : "",
    onClick: () => setRange(presets[k])
  }, r.presets[k]))), React.createElement("input", {
    type: "date",
    className: "input",
    "aria-label": r.from,
    title: r.from,
    max: todayStr,
    value: range[0],
    onChange: e => setFrom(e.target.value)
  }), React.createElement("span", {
    className: "muted"
  }, "–"), React.createElement("input", {
    type: "date",
    className: "input",
    "aria-label": r.to,
    title: r.to,
    max: todayStr,
    value: range[1],
    onChange: e => setTo(e.target.value)
  }), busy && React.createElement("span", {
    className: "muted small"
  }, t.loading));
  if (!data) {
    return React.createElement(React.Fragment, null, toolbar, React.createElement("div", {
      className: "card"
    }, err ? React.createElement("div", {
      className: "empty error-text"
    }, r.error, err) : React.createElement(Empty, null, t.loading)));
  }
  const days = data.days || 0;
  const total = data.total || 0;
  const groups = [...new Set(data.items.map(i => i.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const qn = norm(q);
  const value = (i, key) => key === "avg" ? days ? i.qty / days : 0 : key === "share" ? total ? i.cost / total : 0 : i[key];
  const rows = data.items.filter(i => !qn || norm(i.name).includes(qn) || norm(i.group).includes(qn)).filter(i => !group || i.group === group).filter(i => !kind || TYPE_KIND(i.type) === kind).sort((a, b) => {
    const x = value(a, sort.key),
      y = value(b, sort.key);
    const c = typeof x === "string" ? String(x).localeCompare(String(y)) : x - y;
    return c * sort.dir || a.name.localeCompare(b.name);
  });
  const shownCost = rows.reduce((a, i) => a + i.cost, 0);
  const head = (key, label, right) => React.createElement("th", {
    className: (right ? "r " : "") + "sortable" + (sort.key === key ? " on" : ""),
    "aria-sort": sort.key === key ? sort.dir < 0 ? "descending" : "ascending" : "none",
    onClick: () => setSort(sort.key === key ? {
      key,
      dir: -sort.dir
    } : {
      key,
      dir: typeof value(data.items[0] || {}, key) === "string" ? 1 : -1
    })
  }, label, React.createElement("span", {
    className: "sort-mark"
  }, sort.key === key ? sort.dir < 0 ? " ▼" : " ▲" : ""));
  const exportCsv = () => downloadCsv(`usage-${range[0]}_${range[1]}.csv`, [r.col.name, r.col.group, r.col.unit, r.col.qty, r.col.cost, r.col.avg, r.col.share], rows.map(i => [i.name, i.group, i.unit, i.qty, i.cost, days ? Math.round(i.qty / days * 1000) / 1000 : "", total ? Math.round(i.cost / total * 10000) / 100 : ""]));
  return React.createElement(React.Fragment, null, toolbar, React.createElement("div", {
    className: "kpis"
  }, React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, r.kpi.cost), React.createElement("div", {
    className: "kpi-value"
  }, money(total))), React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, r.kpi.items), React.createElement("div", {
    className: "kpi-value"
  }, data.items.length)), React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, r.kpi.days), React.createElement("div", {
    className: "kpi-value"
  }, days)), React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, r.kpi.perDay), React.createElement("div", {
    className: "kpi-value"
  }, days ? money(total / days) : "—"))), err && React.createElement("div", {
    className: "card notice error-text"
  }, r.error, err), React.createElement("div", {
    className: "card table-card"
  }, React.createElement("div", {
    className: "toolbar inner"
  }, React.createElement("input", {
    className: "input grow",
    placeholder: r.search,
    value: q,
    onChange: e => setQ(e.target.value)
  }), React.createElement("select", {
    className: "input",
    value: group,
    onChange: e => setGroup(e.target.value),
    "aria-label": r.col.group
  }, React.createElement("option", {
    value: ""
  }, r.allGroups), groups.map(g => React.createElement("option", {
    key: g,
    value: g
  }, g))), React.createElement("select", {
    className: "input",
    value: kind,
    onChange: e => setKind(e.target.value),
    "aria-label": r.type
  }, React.createElement("option", {
    value: ""
  }, r.kinds.all), React.createElement("option", {
    value: "goods"
  }, r.kinds.goods), React.createElement("option", {
    value: "semi"
  }, r.kinds.semi), React.createElement("option", {
    value: "other"
  }, r.kinds.other)), React.createElement("select", {
    className: "input",
    value: sort.key + ":" + sort.dir,
    "aria-label": r.sortBy,
    onChange: e => {
      const [key, dir] = e.target.value.split(":");
      setSort({
        key,
        dir: Number(dir)
      });
    }
  }, React.createElement("option", {
    value: "qty:-1"
  }, r.sorts.most), React.createElement("option", {
    value: "qty:1"
  }, r.sorts.least), React.createElement("option", {
    value: "cost:-1"
  }, r.sorts.costMost), React.createElement("option", {
    value: "cost:1"
  }, r.sorts.costLeast)), React.createElement("button", {
    className: "btn-outline",
    onClick: exportCsv
  }, t.csv), React.createElement("button", {
    className: "btn-outline",
    disabled: busy,
    onClick: () => load(true)
  }, t.stock.refresh)), React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    className: "table usage-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", {
    className: "r"
  }, "#"), head("name", r.col.name), head("group", r.col.group), React.createElement("th", null, r.col.unit), head("qty", r.col.qty, true), head("cost", r.col.cost, true), head("avg", r.col.avg, true), head("share", r.col.share, true))), React.createElement("tbody", null, rows.flatMap((i, k) => [React.createElement("tr", {
    key: i.id,
    className: "usage-row" + (open === i.id ? " row-open" : ""),
    onClick: () => setOpen(open === i.id ? "" : i.id)
  }, React.createElement("td", {
    className: "r muted mono"
  }, k + 1), React.createElement("td", {
    className: "strong"
  }, React.createElement("span", {
    className: "caret"
  }, open === i.id ? "▾" : "▸"), i.name, TYPE_KIND(i.type) === "semi" && React.createElement("span", {
    className: "tag"
  }, r.semiTag)), React.createElement("td", {
    className: "muted"
  }, i.group || "—"), React.createElement("td", {
    className: "muted"
  }, i.unit), React.createElement("td", {
    className: "r mono nowrap strong"
  }, qtyStr(i.qty)), React.createElement("td", {
    className: "r mono nowrap"
  }, money(i.cost)), React.createElement("td", {
    className: "r mono nowrap"
  }, days ? qtyStr(i.qty / days) : "—"), React.createElement("td", {
    className: "r mono nowrap"
  }, total ? (i.cost / total * 100).toFixed(1) + "%" : "—")), open === i.id && React.createElement("tr", {
    key: i.id + ":d",
    className: "sub"
  }, React.createElement("td", {
    colSpan: 8
  }, React.createElement(UsageDetail, {
    t: t,
    guard: guard,
    item: i,
    range: range
  })))])), rows.length > 0 && React.createElement("tfoot", null, React.createElement("tr", null, React.createElement("td", null), React.createElement("td", {
    className: "strong"
  }, r.totalRow(rows.length)), React.createElement("td", null), React.createElement("td", null), React.createElement("td", null), React.createElement("td", {
    className: "r mono nowrap strong"
  }, money(shownCost)), React.createElement("td", null), React.createElement("td", {
    className: "r mono nowrap"
  }, total ? (shownCost / total * 100).toFixed(1) + "%" : "—"))))), !rows.length && React.createElement(Empty, null, r.empty), React.createElement("div", {
    className: "muted small table-foot"
  }, r.note)));
}
const PRIORITIES = ["red", "yellow", "cyan"];
const PRIO_RANK = {
  red: 0,
  yellow: 1,
  cyan: 2
};
const MAX_STOCK_ROWS = 300;
const isLow = it => it.min !== null && it.live <= it.min;
function PrioPicker({
  t,
  value,
  onChange,
  readOnly
}) {
  return React.createElement("div", {
    className: "prio-pick"
  }, PRIORITIES.map(p => React.createElement("button", {
    key: p,
    className: "prio-dot p-" + p + (value === p ? " on" : ""),
    title: t.stock.prioNames[p],
    disabled: readOnly,
    "aria-label": t.stock.prioNames[p],
    "aria-pressed": value === p,
    onClick: () => onChange(value === p ? "" : p)
  })));
}
function NumInput({
  value,
  placeholder,
  title,
  onSave
}) {
  const shown = value === null || value === undefined ? "" : qtyStr(value);
  const [v, setV] = useState(shown);
  useEffect(() => setV(shown), [shown]);
  const commit = () => {
    if (v.trim() !== shown) onSave(v.trim());
  };
  return React.createElement("input", {
    className: "input num-input mono",
    inputMode: "decimal",
    value: v,
    placeholder: placeholder,
    title: title,
    onChange: e => setV(e.target.value),
    onBlur: commit,
    onKeyDown: e => {
      if (e.key === "Enter") e.target.blur();
      if (e.key === "Escape") {
        setV(shown);
      }
    }
  });
}
function StockLink({
  t,
  item,
  products,
  onSave,
  readOnly
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    const value = item.noLink ? "none" : item.link && !item.link.auto ? String(item.link.id) : "";
    return React.createElement("select", {
      className: "input link-select",
      autoFocus: true,
      value: value,
      onBlur: () => setEditing(false),
      onChange: e => {
        setEditing(false);
        onSave(e.target.value);
      }
    }, React.createElement("option", {
      value: ""
    }, t.stock.autoOpt), React.createElement("option", {
      value: "none"
    }, t.stock.unlinkOpt), products.map(p => React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.name)));
  }
  return React.createElement("div", {
    className: "muted small"
  }, item.link ? React.createElement(React.Fragment, null, t.stock.linked, " ", item.link.name, item.link.auto && React.createElement("span", {
    className: "tag"
  }, t.stock.autoLinked)) : t.stock.noLink, !readOnly && React.createElement(React.Fragment, null, " ", React.createElement("button", {
    className: "link-btn",
    onClick: () => setEditing(true)
  }, t.stock.changeLink)));
}
const signed = n => (n > 0 ? "+" : "") + qtyStr(n);
const isZero = n => Math.abs(num(n)) < 0.0005;
function RsDetail({
  t,
  item,
  products,
  readOnly,
  off,
  onSave
}) {
  const r = t.stock.rs;
  const rs = item.rs;
  const [adding, setAdding] = useState(false);
  if (off) return React.createElement("div", {
    className: "rs-detail muted small"
  }, r.off);
  const linked = rs ? rs.prods : [];
  const pById = new Map(products.map(p => [p.id, p]));
  const u = item.unit;
  const setProds = list => onSave({
    id: item.id,
    prods: list
  });
  return React.createElement("div", {
    className: "rs-detail"
  }, rs && React.createElement("div", {
    className: "rs-sum"
  }, React.createElement("div", null, React.createElement("div", {
    className: "rs-line"
  }, React.createElement("span", null, r.rsIn), React.createElement("span", {
    className: "mono"
  }, "+", qtyStr(rs.rsIn), " ", u)), rs.rsRet !== 0 && React.createElement("div", {
    className: "rs-line"
  }, React.createElement("span", null, r.rsRet), React.createElement("span", {
    className: "mono"
  }, "−", qtyStr(rs.rsRet), " ", u)), React.createElement("div", {
    className: "rs-line"
  }, React.createElement("span", null, r.usage), React.createElement("span", {
    className: "mono"
  }, signed(-rs.usage), " ", u)), React.createElement("div", {
    className: "rs-line strong"
  }, React.createElement("span", null, r.rs), React.createElement("span", {
    className: "mono"
  }, qtyStr(rs.amount), " ", u))), React.createElement("div", null, React.createElement("div", {
    className: "rs-line"
  }, React.createElement("span", null, r.start), React.createElement("span", {
    className: "mono"
  }, qtyStr(rs.start), " ", u)), React.createElement("div", {
    className: "rs-line"
  }, React.createElement("span", null, r.syrveIn), React.createElement("span", {
    className: "mono"
  }, "+", qtyStr(rs.syrveIn), " ", u)), rs.syrveRet !== 0 && React.createElement("div", {
    className: "rs-line"
  }, React.createElement("span", null, r.syrveRet), React.createElement("span", {
    className: "mono"
  }, "−", qtyStr(rs.syrveRet), " ", u)), React.createElement("div", {
    className: "rs-line"
  }, React.createElement("span", null, r.now), React.createElement("span", {
    className: "mono"
  }, qtyStr(item.syrve), " ", u)), React.createElement("div", {
    className: "rs-line strong"
  }, React.createElement("span", null, r.delta), React.createElement("span", {
    className: "mono"
  }, signed(rs.delta), " ", u))), React.createElement("div", {
    className: "rs-diff"
  }, React.createElement("div", {
    className: "muted small"
  }, r.diffLine), React.createElement("div", {
    className: "rs-diff-value mono " + (isZero(rs.diff) ? "s-ok" : "red-text")
  }, signed(rs.diff), " ", u))), rs && rs.warn > 0 && React.createElement("div", {
    className: "warn-line small"
  }, r.warn(rs.warn)), rs && (rs.wbs.length ? React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    className: "table mini rs-wbs"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, r.col2.n), React.createElement("th", null, r.col2.day), React.createElement("th", null, r.col2.seller), React.createElement("th", null, r.col2.name), React.createElement("th", {
    className: "r"
  }, r.col2.qty), React.createElement("th", {
    className: "r"
  }, r.col2.amt), React.createElement("th", null, r.col2.syrve))), React.createElement("tbody", null, rs.wbs.flatMap(wb => wb.lines.map((l, i) => React.createElement("tr", {
    key: wb.n + (wb.ret ? "r" : "") + i,
    className: wb.ret ? "rs-ret" : ""
  }, React.createElement("td", {
    className: "mono nowrap"
  }, i === 0 ? wb.n : "", i === 0 && wb.ret && React.createElement("span", {
    className: "tag"
  }, r.ret)), React.createElement("td", {
    className: "nowrap"
  }, i === 0 ? fmtDate(wb.day + "T00:00", true).slice(0, 10) : ""), React.createElement("td", null, i === 0 ? wb.seller : ""), React.createElement("td", null, l.name, l.code && React.createElement("span", {
    className: "muted small"
  }, " · ", l.code)), React.createElement("td", {
    className: "r mono nowrap"
  }, qtyStr(l.qty), " ", l.unit), React.createElement("td", {
    className: "r mono nowrap"
  }, l.amt === null ? React.createElement("span", {
    className: "red-text"
  }, "⚠") : React.createElement(React.Fragment, null, wb.ret ? "−" : "", qtyStr(l.amt), " ", u), l.how && r.how[l.how] && React.createElement("span", {
    className: "tag"
  }, r.how[l.how])), React.createElement("td", {
    className: "nowrap"
  }, i !== 0 || wb.ret ? "" : !wb.inSyrve ? React.createElement("span", {
    className: "red-text"
  }, r.missing) : wb.syrve === 0 ? React.createElement("span", {
    className: "warn-text"
  }, r.notOnDoc) : React.createElement("span", {
    className: "s-ok"
  }, r.inSyrve, " ", qtyStr(wb.syrve), " ", u)))))))) : React.createElement("div", {
    className: "muted small rs-empty"
  }, r.noWb)), React.createElement("div", {
    className: "rs-prods"
  }, React.createElement("span", {
    className: "muted small"
  }, linked.length ? r.prods : r.noProds), linked.map(id => {
    const p = pById.get(id);
    return React.createElement("span", {
      key: id,
      className: "chip"
    }, p ? p.name : "#" + id, p && React.createElement("span", {
      className: "muted"
    }, " · ", p.supplier || "—", " · ", p.code || r.noCode), !readOnly && React.createElement("button", {
      className: "chip-x",
      title: r.remove,
      "aria-label": r.remove,
      onClick: () => setProds(linked.filter(x => x !== id))
    }, "✕"));
  }), !readOnly && (adding ? React.createElement("select", {
    className: "input link-select",
    autoFocus: true,
    value: "",
    onBlur: () => setAdding(false),
    onChange: e => {
      setAdding(false);
      if (e.target.value) setProds([...linked, Number(e.target.value)]);
    }
  }, React.createElement("option", {
    value: ""
  }, "—"), products.filter(p => !linked.includes(p.id)).map(p => React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name, p.supplier ? " · " + p.supplier : ""))) : React.createElement("button", {
    className: "link-btn",
    onClick: () => setAdding(true)
  }, r.add))));
}
const shiftDay = (day, n) => new Date(Date.parse(day + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
function StorageTab({
  t,
  guard
}) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState("");
  const [open, setOpen] = useState("");
  const seq = useRef(0);
  const load = useCallback(async fresh => {
    const n = ++seq.current;
    setBusy(true);
    const qs = new URLSearchParams();
    if (day) qs.set("date", day);
    if (fresh) qs.set("fresh", "1");
    try {
      const r = await guard(() => api("/api/stock" + (qs.toString() ? "?" + qs : "")));
      if (n === seq.current) {
        setData(r);
        setErr("");
      }
    } catch (e) {
      if (n === seq.current) setErr(e.message);
    }
    if (n === seq.current) setBusy(false);
  }, [guard, day]);
  useEffect(() => {
    load(false);
    if (day) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(false);
    }, 60000);
    return () => clearInterval(id);
  }, [load, day]);
  const save = async body => {
    try {
      const r = await guard(() => api("/api/stock", body));
      if (day) await load(false);else {
        seq.current++;
        setData(r);
        setErr("");
        setBusy(false);
      }
    } catch (e) {
      setErr(e.message);
    }
  };
  if (!data) {
    return React.createElement("div", {
      className: "card"
    }, err ? React.createElement("div", {
      className: "empty error-text"
    }, t.stock.error, err) : React.createElement(Empty, null, t.loading));
  }
  const live = data.live !== false;
  const today = data.today || new Date().toISOString().slice(0, 10);
  const yesterday = shiftDay(today, -1);
  const pickDay = v => setDay(!v || v >= today ? "" : v);
  const f = !live && (filter === "low" || filter === "min") ? "" : filter;
  const qn = norm(q);
  const rows = data.items.filter(it => !qn || norm(it.name).includes(qn) || norm(it.group).includes(qn) || norm(it.link?.name).includes(qn)).filter(it => !f || (f === "low" ? isLow(it) : f === "min" ? it.min !== null : it.prio === f)).sort((a, b) => isLow(b) - isLow(a) || (PRIO_RANK[a.prio] ?? 3) - (PRIO_RANK[b.prio] ?? 3) || a.name.localeCompare(b.name));
  const lowCount = data.items.filter(isLow).length;
  const inv = data.inventory;
  const rsOff = !data.rs || !!data.rs.off;
  const rsErrors = data.rs && (data.rs.error || Object.values(data.rs.errors || {}).filter(Boolean).join(" · "));
  const cols = live ? 9 : 6;
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "toolbar stock-days"
  }, React.createElement("div", {
    className: "segmented"
  }, React.createElement("button", {
    className: !day ? "on" : "",
    onClick: () => setDay("")
  }, t.stock.today), React.createElement("button", {
    className: day === yesterday ? "on" : "",
    onClick: () => setDay(yesterday)
  }, t.stock.yesterday)), React.createElement("input", {
    type: "date",
    className: "input",
    title: t.stock.date,
    "aria-label": t.stock.date,
    max: today,
    value: day || today,
    onChange: e => pickDay(e.target.value)
  }), busy && React.createElement("span", {
    className: "muted small"
  }, t.loading)), React.createElement("div", {
    className: "kpis"
  }, React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, t.stock.kpi.products), React.createElement("div", {
    className: "kpi-value"
  }, data.items.length)), live && React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, t.stock.kpi.low), React.createElement("div", {
    className: "kpi-value" + (lowCount ? " red-text" : "")
  }, lowCount)), React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, t.stock.kpi.lastInv), React.createElement("div", {
    className: "kpi-value"
  }, inv ? fmtDate(inv.date, true).slice(0, 10) : "—"), React.createElement("div", {
    className: "muted small"
  }, inv ? t.stock.invDoc(inv.num, inv.count) : t.stock.noInv)), live ? React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, t.stock.kpi.asOf), React.createElement("div", {
    className: "kpi-value"
  }, fmtDate(data.asOf).slice(6))) : React.createElement("div", {
    className: "card kpi"
  }, React.createElement("div", {
    className: "kpi-label"
  }, t.stock.kpi.endOfDay), React.createElement("div", {
    className: "kpi-value"
  }, fmtDate(data.day + "T00:00", true).slice(0, 10)))), !live && React.createElement("div", {
    className: "card notice muted small"
  }, t.stock.pastNote), err && React.createElement("div", {
    className: "card notice error-text"
  }, t.stock.error, err), data.alarmProblem === "no_group" && React.createElement("div", {
    className: "card notice"
  }, t.stock.noGroup), data.inventoryError && React.createElement("div", {
    className: "card notice muted small"
  }, t.stock.invError, data.inventoryError), rsErrors && React.createElement("div", {
    className: "card notice muted small"
  }, t.stock.rs.errors, rsErrors), React.createElement("div", {
    className: "card table-card"
  }, React.createElement("div", {
    className: "toolbar inner"
  }, React.createElement("input", {
    className: "input grow",
    placeholder: t.stock.search,
    value: q,
    onChange: e => setQ(e.target.value)
  }), React.createElement("select", {
    className: "input",
    value: f,
    onChange: e => setFilter(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, t.stock.all), live && React.createElement("option", {
    value: "low"
  }, t.stock.low), live && React.createElement("option", {
    value: "min"
  }, t.stock.withMin), PRIORITIES.map(p => React.createElement("option", {
    key: p,
    value: p
  }, t.stock.prioNames[p]))), data.stores.length > 1 && React.createElement("select", {
    className: "input",
    value: data.store,
    onChange: e => save({
      store: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, t.stock.allStores), data.stores.map(s => React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))), React.createElement("button", {
    className: "btn-outline",
    disabled: busy,
    onClick: () => load(true)
  }, t.stock.refresh)), React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", {
    className: "table stock-table" + (live ? "" : " past")
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, t.stock.col.prio), React.createElement("th", null, t.stock.col.name), React.createElement("th", {
    className: "r"
  }, t.stock.col.syrve), React.createElement("th", {
    className: "r",
    title: t.stock.rs.colHint
  }, t.stock.rs.col), React.createElement("th", {
    className: "r",
    title: t.stock.rs.diffHint
  }, t.stock.rs.diff), live && React.createElement("th", {
    className: "r",
    title: t.stock.corrHint
  }, t.stock.col.live), live && React.createElement("th", {
    className: "r",
    title: t.stock.minHint
  }, t.stock.col.min), React.createElement("th", {
    className: "r"
  }, t.stock.col.inv), live && React.createElement("th", null, t.stock.col.status))), React.createElement("tbody", null, rows.slice(0, MAX_STOCK_ROWS).flatMap(it => {
    const low = isLow(it);
    const isOpen = open === it.id;
    const rs = rsOff ? null : it.rs;
    return [React.createElement("tr", {
      key: it.id,
      className: (low ? "row-low" : "") + (isOpen ? " row-open" : "")
    }, React.createElement("td", null, React.createElement(PrioPicker, {
      t: t,
      value: it.prio,
      readOnly: !live,
      onChange: prio => save({
        id: it.id,
        prio
      })
    })), React.createElement("td", null, React.createElement("button", {
      className: "name-btn strong",
      "aria-expanded": isOpen,
      title: t.stock.rs.open,
      onClick: () => setOpen(isOpen ? "" : it.id)
    }, React.createElement("span", {
      className: "caret"
    }, isOpen ? "▾" : "▸"), it.name), it.group && React.createElement("span", {
      className: "tag"
    }, it.group), React.createElement(StockLink, {
      t: t,
      item: it,
      products: data.products,
      readOnly: !live,
      onSave: link => save({
        id: it.id,
        link
      })
    })), React.createElement("td", {
      className: "r mono nowrap" + (live ? " muted" : "")
    }, qtyStr(it.syrve), " ", it.unit), React.createElement("td", {
      className: "r mono nowrap"
    }, rs ? React.createElement(React.Fragment, null, qtyStr(rs.amount), " ", it.unit, rs.warn > 0 && React.createElement("span", {
      className: "red-text",
      title: t.stock.rs.warn(rs.warn)
    }, " ⚠")) : React.createElement("span", {
      className: "muted"
    }, "—")), React.createElement("td", {
      className: "r mono nowrap"
    }, rs ? React.createElement("span", {
      className: isZero(rs.diff) ? "s-ok" : "red-text"
    }, signed(rs.diff)) : React.createElement("span", {
      className: "muted"
    }, "—")), live && React.createElement("td", {
      className: "r nowrap"
    }, React.createElement(NumInput, {
      value: it.live,
      title: t.stock.corrHint,
      onSave: live => save({
        id: it.id,
        live
      })
    }), React.createElement("span", {
      className: "unit-label"
    }, it.unit), it.corr !== 0 && React.createElement("div", {
      className: "small corr-note",
      title: t.stock.corrHint
    }, "✎ ", t.stock.manual, " ", it.corr > 0 ? "+" : "", qtyStr(it.corr), " ", React.createElement("button", {
      className: "link-btn",
      title: t.stock.resetCorr,
      onClick: () => save({
        id: it.id,
        clearCorr: true
      })
    }, "↺"))), live && React.createElement("td", {
      className: "r nowrap"
    }, React.createElement(NumInput, {
      value: it.min,
      placeholder: "—",
      title: t.stock.minHint,
      onSave: min => save({
        id: it.id,
        min
      })
    }), React.createElement("span", {
      className: "unit-label"
    }, it.unit)), React.createElement("td", {
      className: "r mono nowrap"
    }, it.inv === null ? React.createElement("span", {
      className: "muted"
    }, "—") : React.createElement("span", {
      className: it.inv < 0 ? "red-text" : ""
    }, it.inv > 0 ? "+" : "", qtyStr(it.inv))), live && React.createElement("td", {
      className: "nowrap"
    }, it.alarm ? React.createElement("span", {
      className: "pill alarm-" + it.alarm
    }, t.stock.alarm[it.alarm]) : low ? React.createElement("span", {
      className: "pill alarm-low"
    }, t.stock.alarm.low) : null)), isOpen && React.createElement("tr", {
      key: it.id + ":rs",
      className: "sub"
    }, React.createElement("td", {
      colSpan: cols
    }, React.createElement(RsDetail, {
      t: t,
      item: {
        ...it,
        rs
      },
      products: data.products,
      readOnly: !live,
      off: rsOff,
      onSave: save
    })))];
  })))), !rows.length && React.createElement(Empty, null, t.stock.empty), rows.length > MAX_STOCK_ROWS && React.createElement("div", {
    className: "muted small table-foot"
  }, t.stock.showing(MAX_STOCK_ROWS, rows.length))));
}
function ProductModal({
  t,
  lang,
  draft,
  products,
  onSave,
  onDelete,
  onClose
}) {
  const [p, setP] = useState(draft);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isNew = !draft.id;
  const set = k => e => setP(v => ({
    ...v,
    [k]: e.target.value
  }));
  const cats = [...new Set([...CATEGORIES, ...products.map(x => x.category).filter(Boolean)])];
  const sups = [...new Set(products.filter(x => x.type === p.type).map(x => x.supplier).filter(Boolean))].sort();
  const pickSupplier = e => {
    const name = e.target.value;
    const known = products.find(x => x.supplier === name && (x.phone || x.contactName));
    setP(v => ({
      ...v,
      supplier: name,
      contactName: v.contactName || known?.contactName || "",
      phone: v.phone || known?.phone || ""
    }));
  };
  const save = async () => {
    if (!String(p.name || "").trim()) {
      setErr(t.nameRequired);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await onSave({
        ...p,
        basePrice: num(String(p.basePrice).replace(",", ".")),
        netSize: num(String(p.netSize ?? "").replace(",", "."))
      });
    } catch {
      setErr(t.saveFailed);
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm(t.deleteConfirm(p.name))) return;
    setBusy(true);
    try {
      await onDelete(p);
    } catch {
      setErr(t.saveFailed);
      setBusy(false);
    }
  };
  const field = (k, label, props = {}) => React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "field-label"
  }, label), React.createElement("input", {
    className: "input",
    value: p[k] ?? "",
    onChange: set(k),
    ...props
  }));
  return React.createElement("div", {
    className: "modal-back",
    onMouseDown: e => e.target === e.currentTarget && onClose()
  }, React.createElement("div", {
    className: "card modal"
  }, React.createElement("div", {
    className: "modal-head"
  }, React.createElement("div", {
    className: "strong big"
  }, isNew ? t.newProduct : t.editProduct), React.createElement("button", {
    className: "x-plain",
    onClick: onClose
  }, "×")), React.createElement("div", {
    className: "segmented"
  }, ["distributor", "bazaar"].map(ty => React.createElement("button", {
    key: ty,
    className: p.type === ty ? "on" : "",
    onClick: () => setP(v => ({
      ...v,
      type: ty
    }))
  }, ty === "bazaar" ? t.typeBazaar : t.typeDistributor))), React.createElement("div", {
    className: "form-grid"
  }, React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "field-label"
  }, t.f.category), React.createElement("input", {
    className: "input",
    list: "cat-list",
    value: p.category ?? "",
    onChange: set("category")
  }), React.createElement("datalist", {
    id: "cat-list"
  }, cats.map(c => React.createElement("option", {
    key: c,
    value: c
  }, lang === "en" && CAT_EN[c] ? CAT_EN[c] : "")))), field("name", t.f.name + " *", {
    autoFocus: isNew
  }), field("code", t.f.code), field("nameRs", t.f.nameRs), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "field-label"
  }, t.f.supplier), React.createElement("input", {
    className: "input",
    list: "sup-list",
    value: p.supplier ?? "",
    onChange: pickSupplier
  }), React.createElement("datalist", {
    id: "sup-list"
  }, sups.map(s => React.createElement("option", {
    key: s,
    value: s
  })))), field("contactName", t.f.contactName), field("phone", t.f.phone, {
    type: "tel",
    placeholder: "5XX XX XX XX"
  }), field("unit", t.f.size, {
    placeholder: "1 კგ"
  }), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "field-label"
  }, t.f.netSize), React.createElement("div", {
    className: "row"
  }, React.createElement("input", {
    className: "input",
    inputMode: "decimal",
    placeholder: "1.5",
    value: p.netSize === 0 ? "" : p.netSize ?? "",
    onChange: set("netSize")
  }), React.createElement("select", {
    className: "input",
    style: {
      width: 80
    },
    value: p.netUnit || NET_UNITS[0],
    onChange: set("netUnit")
  }, NET_UNITS.map(u => React.createElement("option", {
    key: u
  }, u))))), field("basePrice", t.f.price, {
    inputMode: "decimal"
  }), field("altSupplier", t.f.altSupplier), React.createElement("label", {
    className: "field span2"
  }, React.createElement("span", {
    className: "field-label"
  }, t.f.comment), React.createElement("input", {
    className: "input",
    value: p.comment ?? "",
    onChange: set("comment")
  }))), err && React.createElement("div", {
    className: "error-text"
  }, err), React.createElement("div", {
    className: "modal-actions"
  }, !isNew && React.createElement("button", {
    className: "btn-danger-outline",
    disabled: busy,
    onClick: remove
  }, t.delete), React.createElement("div", {
    className: "grow"
  }), React.createElement("button", {
    className: "btn-outline",
    onClick: onClose
  }, t.cancel), React.createElement("button", {
    className: "btn-dark",
    disabled: busy,
    onClick: save
  }, busy ? "…" : t.save))));
}
function SettingsModal({
  t,
  lang,
  setLang,
  settings,
  saveSettings,
  onLogout,
  onClose
}) {
  const [phone, setPhone] = useState(settings.accountantPhone || "");
  const [state, setState] = useState("");
  const [status, setStatus] = useState(null);
  useEffect(() => {
    api("/api/status").then(setStatus).catch(() => setStatus({}));
  }, []);
  const save = async () => {
    setState("saving");
    try {
      await saveSettings({
        accountantPhone: phone
      });
      setState("saved");
    } catch {
      setState("error");
    }
  };
  return React.createElement("div", {
    className: "modal-back",
    onMouseDown: e => e.target === e.currentTarget && onClose()
  }, React.createElement("div", {
    className: "card modal"
  }, React.createElement("div", {
    className: "modal-head"
  }, React.createElement("div", {
    className: "strong big"
  }, "⚙ ", t.settings), React.createElement("button", {
    className: "x-plain",
    onClick: onClose
  }, "×")), React.createElement("div", {
    className: "section-title"
  }, t.accountant), React.createElement("label", {
    className: "field-label"
  }, t.accountantPhone), React.createElement("div", {
    className: "row"
  }, React.createElement("input", {
    className: "input grow",
    type: "tel",
    placeholder: "5XX XX XX XX",
    value: phone,
    onChange: e => {
      setPhone(e.target.value);
      setState("");
    }
  }), React.createElement("button", {
    className: "btn-dark",
    onClick: save,
    disabled: state === "saving"
  }, t.save)), state === "saved" && React.createElement("div", {
    className: "ok-text"
  }, t.saved), state === "error" && React.createElement("div", {
    className: "error-text"
  }, t.saveFailed), React.createElement("div", {
    className: "small muted hint"
  }, t.accountantHint), React.createElement("div", {
    className: "section-title"
  }, t.language), React.createElement("div", {
    className: "segmented"
  }, React.createElement("button", {
    className: lang === "ka" ? "on" : "",
    onClick: () => setLang("ka")
  }, "ქართული"), React.createElement("button", {
    className: lang === "en" ? "on" : "",
    onClick: () => setLang("en")
  }, "English")), React.createElement("div", {
    className: "section-title"
  }, t.systemStatus), !status ? React.createElement("div", {
    className: "small muted"
  }, t.loading) : React.createElement("div", {
    className: "status-list"
  }, Object.entries(t.statusLabels).map(([k, label]) => React.createElement("div", {
    key: k,
    className: "status-row"
  }, React.createElement("span", null, label), React.createElement("span", {
    className: status[k] ? "ok-text" : "error-text"
  }, status[k] ? "✓" : "✗")))), React.createElement("div", {
    className: "section-title"
  }, t.botHelp), React.createElement("ul", {
    className: "help-list small"
  }, t.botHelpText.map((x, i) => React.createElement("li", {
    key: i
  }, x))), React.createElement("div", {
    className: "modal-actions"
  }, React.createElement("button", {
    className: "btn-danger-outline",
    onClick: onLogout
  }, t.logout), React.createElement("div", {
    className: "grow"
  }), React.createElement("button", {
    className: "btn-outline",
    onClick: onClose
  }, t.close))));
}
function App() {
  const [lang, setLangState] = useState(readLang);
  const t = T[lang];
  const setLang = l => {
    setLangState(l);
    try {
      localStorage.setItem("pc_lang", l);
    } catch {}
  };
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const [session, setSession] = useState({
    loading: true,
    authed: false,
    passwordSet: true
  });
  const [tab, setTab] = useState(tabFromHash);
  const [products, setProducts] = useState([]);
  const [order, setOrder] = useState({
    items: []
  });
  const [log, setLog] = useState([]);
  const [settings, setSettings] = useState({
    accountantPhone: ""
  });
  const [sync, setSync] = useState("ok");
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const checkSession = useCallback(async () => {
    try {
      const s = await api("/api/session");
      setSession({
        loading: false,
        authed: !!s.authed,
        passwordSet: !!s.passwordSet
      });
    } catch {
      setSession({
        loading: false,
        authed: false,
        passwordSet: true
      });
    }
  }, []);
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  const guard = useCallback(async fn => {
    setSync("saving");
    try {
      const r = await fn();
      setSync("ok");
      return r;
    } catch (err) {
      if (err.status === 401) setSession(s => ({
        ...s,
        authed: false
      }));
      setSync("error");
      throw err;
    }
  }, []);
  const loadAll = useCallback(async () => {
    const [p, o, l, s] = await guard(() => Promise.all([api("/api/base-prices"), api("/api/order"), api("/api/log"), api("/api/settings")]));
    setProducts(p.items || []);
    setOrder(o.order || {
      items: []
    });
    setLog(l.items || []);
    setSettings(s.settings || {});
    setLoaded(true);
  }, [guard]);
  const refresh = useCallback(async () => {
    try {
      const [o, l] = await Promise.all([api("/api/order"), api("/api/log")]);
      setOrder(o.order || {
        items: []
      });
      setLog(l.items || []);
      setSync("ok");
    } catch (err) {
      if (err.status === 401) setSession(s => ({
        ...s,
        authed: false
      }));else setSync("error");
    }
  }, []);
  useEffect(() => {
    if (!session.authed) return;
    loadAll().catch(() => {});
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 20000);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [session.authed, loadAll, refresh]);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = id => {
    setTab(id);
    history.replaceState(null, "", "#" + id);
    window.scrollTo(0, 0);
    if (id === "orders" || id === "mistakes" || id === "history") refresh();
  };
  const saveProducts = async list => {
    const r = await guard(() => api("/api/base-prices", {
      items: list
    }));
    setProducts(r.items || []);
  };
  const saveProduct = async p => {
    let list;
    if (p.id) list = products.map(x => x.id === p.id ? p : x);else list = [...products, {
      ...p,
      id: products.reduce((m, x) => Math.max(m, x.id), 0) + 1
    }];
    await saveProducts(list);
    setModal(null);
  };
  const deleteProduct = async p => {
    await saveProducts(products.filter(x => x.id !== p.id));
    setModal(null);
  };
  const orderOps = async ops => {
    try {
      const r = await guard(() => api("/api/order", {
        ops
      }));
      setOrder(r.order);
      if (ops.some(o => o.op === "received")) refresh();
    } catch {}
  };
  const logAction = async (token, action) => {
    try {
      const r = await guard(() => api("/api/log/action", {
        token,
        action
      }));
      setLog(l => l.map(x => x.token === token ? r.item : x));
    } catch {}
  };
  const saveSettings = async s => {
    const r = await guard(() => api("/api/settings", {
      settings: s
    }));
    setSettings(r.settings);
  };
  const logout = async () => {
    try {
      await api("/api/logout", {});
    } catch {}
    setShowSettings(false);
    setSession(s => ({
      ...s,
      authed: false
    }));
  };
  const newProduct = type => setModal({
    type,
    category: "",
    name: "",
    nameRs: "",
    code: "",
    supplier: "",
    contactName: "",
    phone: "",
    unit: "",
    basePrice: "",
    altSupplier: "",
    comment: ""
  });
  if (session.loading) return React.createElement("div", {
    className: "login-wrap"
  }, React.createElement("div", {
    className: "muted"
  }, t.loading));
  if (!session.authed) {
    return React.createElement(Login, {
      t: t,
      lang: lang,
      setLang: setLang,
      passwordSet: session.passwordSet,
      onDone: () => setSession({
        loading: false,
        authed: true,
        passwordSet: true
      })
    });
  }
  const openMistakes = log.filter(r => r.status === "rejected").length;
  const badges = {
    orders: order.items.length,
    mistakes: openMistakes
  };
  return React.createElement(React.Fragment, null, React.createElement("header", {
    className: "topbar"
  }, React.createElement("div", {
    className: "topbar-left"
  }, React.createElement("a", {
    className: "btn-ghost small",
    href: "/"
  }, "← ", t.navMain), React.createElement("a", {
    className: "btn-ghost small",
    href: "/dashboard/"
  }, t.navDashboard), React.createElement("div", {
    className: "brand"
  }, "🫓 Focacceria ", React.createElement("span", {
    className: "muted"
  }, "— ", t.appSub))), React.createElement("div", {
    className: "topbar-right"
  }, React.createElement("span", {
    className: "sync sync-" + sync
  }, t.sync[sync]), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setLang(lang === "ka" ? "en" : "ka")
  }, lang === "ka" ? "EN" : "ქა"), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setShowSettings(true),
    title: t.settings
  }, "⚙"))), React.createElement("main", {
    className: "main"
  }, React.createElement("nav", {
    className: "tabs"
  }, TABS.map(id => React.createElement("button", {
    key: id,
    className: "tab" + (tab === id ? " on" : ""),
    onClick: () => go(id)
  }, t.tabs[id], badges[id] > 0 && React.createElement("span", {
    className: "badge"
  }, badges[id])))), !loaded ? React.createElement("div", {
    className: "card"
  }, React.createElement(Empty, null, t.loading)) : React.createElement(React.Fragment, null, tab === "products" && React.createElement(ProductsTab, {
    t: t,
    lang: lang,
    products: products,
    onEdit: p => setModal({
      ...p
    }),
    onAdd: newProduct
  }), tab === "distributors" && React.createElement(DistributorsTab, {
    t: t,
    products: products
  }), tab === "bazaar" && React.createElement(BazaarTab, {
    t: t,
    lang: lang,
    products: products,
    onEdit: p => setModal({
      ...p
    }),
    onAdd: newProduct
  }), tab === "orders" && React.createElement(OrdersTab, {
    t: t,
    lang: lang,
    products: products,
    order: order,
    orderOps: orderOps
  }), tab === "storage" && React.createElement(StorageTab, {
    t: t,
    guard: guard
  }), tab === "report" && React.createElement(ReportTab, {
    t: t,
    guard: guard
  }), tab === "mistakes" && React.createElement(MistakesTab, {
    t: t,
    log: log,
    logAction: logAction,
    refresh: refresh
  }), tab === "debts" && React.createElement(DebtsTab, {
    t: t
  }), tab === "history" && React.createElement(HistoryTab, {
    t: t,
    log: log,
    logAction: logAction,
    refresh: refresh
  }))), modal && React.createElement(ProductModal, {
    t: t,
    lang: lang,
    draft: modal,
    products: products,
    onSave: saveProduct,
    onDelete: deleteProduct,
    onClose: () => setModal(null)
  }), showSettings && React.createElement(SettingsModal, {
    t: t,
    lang: lang,
    setLang: setLang,
    settings: settings,
    saveSettings: saveSettings,
    onLogout: logout,
    onClose: () => setShowSettings(false)
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));