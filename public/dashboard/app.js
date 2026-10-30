/* Dashboard — 8 tabs: fixed cost, variable cost, live income, monthly income,
   debts, ratings, employees, tasks.  Georgian / English.
   Open with ?demo=1 to try it with sample data (nothing is saved to the server). */

(() => {
"use strict";

// ====================== settings ======================
const API = "/api/dash";
const DEMO = new URLSearchParams(location.search).get("demo") === "1";
const PAGE = document.body.dataset.page === "main" ? "main" : "dashboard"; // "/" shows the Main overview
const SUBITEMS_ENABLED = false;          // turn on later to show sub-items inside a fixed cost category
const LIVE_REFRESH_MS = 2 * 60 * 1000;   // live income auto-refresh
const CURRENCY = "₾";

const TABS = ["fixed", "variable", "live", "monthly", "menu", "debts", "ratings", "employees", "tasks"];
const FIXED_PRESETS = ["rent", "utilities", "internet", "salaries", "program", "cleaning", "outsourcing"];
const VAR_TYPES = ["goods", "jars", "packaging", "other"];
const PLATFORMS = ["wolt", "glovo", "bolt", "other"];

// ====================== translations ======================
const T = {
  ka: {
    dashboard: "დეშბორდი", home: "← მთავარი", password: "პაროლი", login: "შესვლა", logout: "გასვლა",
    wrong_password: "პაროლი არასწორია", too_many: "ძალიან ბევრი მცდელობა — სცადეთ 15 წუთში",
    not_set: "პაროლი ჯერ არ არის დაყენებული — გაგზავნეთ /password ბოტთან", saved: "შენახულია", save_failed: "ვერ შეინახა",
    tab_fixed: "ფიქსირებული ხარჯები", tab_variable: "ცვლადი ხარჯები", tab_live: "შემოსავალი ახლა",
    tab_monthly: "თვიური შემოსავალი", tab_debts: "ვალები", tab_ratings: "რეიტინგები",
    tab_employees: "თანამშრომლები", tab_tasks: "დავალებები", tab_menu: "მენიუ",
    menu_sub: "Syrve-დან: რა და რამდენი გაიყიდა, ფასი, რეცეპტის თვითღირებულება და მარჟა (დღგ-ს გარეშე). დააჭირეთ კერძს — გამოჩნდება რეცეპტი.",
    dish: "კერძი", sold: "გაიყიდა", revenue: "ნავაჭრი", price: "ფასი", cost_short: "თვითღირ.", margin: "მარჟა", food_cost_pct: "Food cost",
    items_sold: "გაყიდული ერთეული", avg_margin: "საშუალო მარჟა", best_seller: "ყველაზე გაყიდვადი",
    all_groups: "ყველა ჯგუფი", only_sold: "მხოლოდ გაყიდული", sort_sold: "გაყიდვადობით", sort_revenue: "ნავაჭრით", sort_margin: "მარჟით",
    no_recipe: "რეცეპტი არ არის", recipe_tree: "🌳 რეცეპტი (ხე)", recipe_flat: "🧺 ნედლეული (ჯამი)", ingredient: "ინგრედიენტი", raw: "ნედლეული",
    qty: "რაოდენობა", unit_price: "ფასი / ერთ.", value: "ღირებულება", share: "წილი", semi: "ნახევარფაბრიკატი", total_cost: "სულ თვითღირებულება",
    price_vat: "ფასი (დღგ-ით)", margin_novat: "მარჟა (დღგ-ს გარეშე)", one_unit: "ერთი ერთეული", rank: "რეიტინგი", sold_when: "როდის გაიყიდა",
    missing_price: "⚠ ზოგ ინგრედიენტს Syrve-ში ფასი არ აქვს (მარაგში არ არის) — თვითღირებულება შეიძლება რეალურზე ნაკლები იყოს.",
    recipes_err: "Syrve-დან რეცეპტები ვერ წამოვიდა", cost_err: "ინგრედიენტების ფასები ვერ წამოვიდა", no_dishes: "კერძები არ მოიძებნა",
    flat_note: "ყველაფერი დაყვანილია ნედლეულამდე და შეჯამებულია. ყველაზე ძვირი ინგრედიენტი ზემოთაა.", tree_note: "▸ / ▾ — ნახევარფაბრიკატის გახსნა / დახურვა. ფასები: Syrve-ს თვითღირებულება.",
    rent: "ქირა", utilities: "კომუნალური", internet: "ინტერნეტი", salaries: "ხელფასები",
    program: "პროგრამის მომსახურება", cleaning: "დასუფთავება", outsourcing: "აუთსორსინგი",
    category: "კატეგორია", amount: "თანხა", due_day: "გადახდის დღე", status: "სტატუსი", comment: "კომენტარი",
    paid: "გადახდილი", unpaid: "გადაუხდელი", total: "ჯამი", per_month: "თვეში",
    paid_this_month: "გადახდილი ამ თვეში", left_to_pay: "დარჩენილი გადასახდელი", next_due: "შემდეგი გადახდა",
    add_category: "კატეგორიის დამატება", add: "დამატება", export: "ექსპორტი Excel-ში", name: "დასახელება",
    delete: "წაშლა", confirm_delete: "წავშალო?", none: "—", day: "რიცხვი",
    fixed_sub: "ერთი სია ყველა თვისთვის. „გადახდილი“ ყოველი თვის დასაწყისში თავიდან იწყება.",
    every_month_on: "ყოველი თვის", overdue: "ვადაგადაცილებული",
    goods: "საქონელი", jars: "ქილები", packaging: "შეფუთვა", other: "სხვა", type: "ტიპი", date: "თარიღი",
    month: "თვე", var_sub: "საქონლის ღირებულება და დამატებითი ხარჯები (ქილები, შეფუთვა).",
    no_entries: "ჩანაწერები ჯერ არ არის", month_total: "თვის ჯამი",
    today_income: "დღევანდელი შემოსავალი", orders: "შეკვეთები", avg_check: "საშუალო ჩეკი",
    by_payment: "გადახდის ტიპის მიხედვით", by_hour: "საათების მიხედვით", refresh: "განახლება",
    updated: "განახლდა", live_sub: "მონაცემები Syrve-დან, ახლდება ყოველ 2 წუთში.",
    range_sub: "მონაცემები Syrve-დან არჩეული პერიოდისთვის.", income_range: "შემოსავალი", by_day: "დღეების მიხედვით",
    pick_today: "დღეს", pick_yesterday: "გუშინ", pick_week: "ეს კვირა", pick_month: "ეს თვე", pick_last_month: "წინა თვე",
    pick_end: "აირჩიეთ ბოლო დღე", wdays: ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვ"],
    pay_click: "დააჭირეთ ტიპს — ნახავთ ყველა გადახდას", order_no: "შეკვ. №", customer: "კლიენტი", cashier: "მოლარე",
    products: "პროდუქტები", waybill: "ზედნადები (rs.ge)", by_customer: "კლიენტების მიხედვით", close: "დახურვა",
    wb_found: "ზედნადები", wb_missing: "rs.ge-ზე ვერ მოიძებნა", wb_diff: "თანხა განსხვავდება", wb_none: "ზედნადები",
    wb_of: "{a} / {b} ზედნადებით", no_orders: "გადახდები არ არის", not_income: "შემოსავალში არ ითვლება · მენიუს ფასით",
    wb_uploaded: "ატვირთულია", wb_not_uploaded: "არ არის ატვირთული", time: "დრო", more_items: "კიდევ {n}",
    cash: "ნაღდი", card: "ბარათი", credit: "კრედიტი",
    income: "შემოსავალი", fixed: "ფიქსირებული", variable: "ცვლადი", profit: "მოგება",
    this_month: "ეს თვე", last_month: "წინა თვე", profit_this_month: "მოგება ამ თვეში",
    monthly_sub: "შემოსავალი Syrve-ს სალაროს ცვლებიდან. მოგება = შემოსავალი − ფიქსირებული − ცვლადი.",
    monthly_note: "მოგება = შემოსავალი − საკვების თვითღირებულება (Syrve) − ფიქსირებული − ცვლადი ხარჯები. ცვლადი ხარჯების „საქონელი“ აქ აღარ აკლდება — ის უკვე თვითღირებულებაშია. ფიქსირებული ხარჯი ყველა თვისთვის მიმდინარე სიიდან ითვლება.",
    food_cost: "საკვების თვითღირებულება", after_debts: "ყველა ვალის გადახდის შემდეგ",
    cost_fallback: "Syrve-ს თვითღირებულება მიუწვდომელია — ნაცვლად ცვლადი ხარჯების „საქონელი“ აკლდება.",
    income_by_month: "შემოსავალი თვეების მიხედვით",
    total_owed: "სულ გადასახდელი", suppliers: "მომწოდებლები", supplier: "მომწოდებელი", owed: "გადასახდელი",
    debts_sub: "რამდენი გვმართებს მომწოდებლებს, Syrve-ს ბალანსის მიხედვით.", search: "ძებნა",
    prepaid: "წინასწარ გადახდილი", no_debts: "ვალები არ არის",
    platform: "პლატფორმა", rating: "რეიტინგი", reviews: "შეფასებები", latest: "ბოლო",
    ratings_sub: "მიტანის აპლიკაციების რეიტინგები. შეიყვანეთ ციფრები აპლიკაციიდან.", history: "ისტორია",
    wolt: "Wolt", glovo: "Glovo", bolt: "Bolt Food", no_rating: "ჯერ არ არის", vs_prev: "წინასთან შედარებით",
    working_today: "დღეს მუშაობს", calendar: "კალენდარი", shift: "ცვლა", on_shift: "ცვლაზეა",
    finished: "დაასრულა", not_arrived: "ჯერ არ მოსულა", nobody_today: "დღეს ცვლები არ არის",
    employees_sub: "გრაფიკი და გამოცხადება Syrve-დან.", prev: "‹", next: "›",
    days: ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"],
    months: ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"],
    daily_tasks: "ყოველდღიური დავალებები", overall_tasks: "ზოგადი დავალებები", task: "დავალება",
    assignee: "პასუხისმგებელი", due: "ვადა", done_today: "შესრულებულია დღეს", tasks_sub: "ყოველდღიური სია ყოველ დღე თავიდან იწყება.",
    needs_check: "შესამოწმებელი", open_tasks: "ღია დავალებები", done: "შესრულებული", no_tasks: "დავალებები ჯერ არ არის",
    syrve_error: "Syrve-დან მონაცემები ვერ მივიღე", loading: "იტვირთება…",
    demo: "დემო რეჟიმი — ნიმუშის მონაცემები, არაფერი ინახება.",
    main: "მთავარი", app_name: "Focacceria", open: "გახსნა", profit_month: "მოგება ამ თვეში",
    expenses: "ხარჯები", left_to_pay_all: "სულ გადასასახდელი", debts_short: "ვალები", fixed_short: "ფიქს.",
    variable_short: "ცვლ.", avg_rating: "რეიტინგი", average: "საშუალო", vs_last_month: "წინა თვესთან",
    load_failed: "ვერ ჩაიტვირთა", unpaid_total: "გადაუხდელი", today: "დღეს",
    invoices: "ზედნადებები (Syrve)", paid_bank: "გადახდილი (ბანკი)", tax_id: "ს/კ", to_review: "გადასამოწმებელი",
    review_sub: "მიმღებები, რომელთა გადახდები ავტომატურად ვერ დავაკავშირე მომწოდებელს", recipient: "მიმღები", why: "მიზეზი",
    why_name_differs: "ს/კ ემთხვევა, სახელი განსხვავდება", why_several_matches: "რამდენიმე შესაძლო მომწოდებელი",
    why_not_in_syrve: "rs.ge-ზეა, Syrve-ში ვერ ვიპოვე", why_name_only: "მხოლოდ სახელი ემთხვევა", why_unknown: "უცნობი მიმღები", why_tin_differs: "სახელი ემთხვევა, ს/კ განსხვავდება",
    remember_q: "დავიმახსოვრო „{name}“-ის მომავალი გადახდებისთვისაც?", remember_yes: "კი, ყოველთვის", remember_these: "მხოლოდ ეს {n} გადახდა",
    payments_col: "გადახდები", last: "ბოლო",
    choose_supplier: "აირჩიეთ მომწოდებელი", all_with_tin: "ამ ს/კ-ის ყველა გადახდა", confirm: "დადასტურება",
    not_supplier: "არ არის მომწოდებელი", showing_of: "ნაჩვენებია {a} / {b} მიმღები", bank: "ბანკი", last_sync: "ბოლო სინქრ.",
    bank_settings: "ბანკის პარამეტრები", history_from: "ისტორია თარიღიდან", bog_accounts: "BOG ანგარიშები (IBAN, თითო ხაზზე)",
    save: "შენახვა", tbc_auto: "TBC-ის GEL ანგარიშები ავტომატურად იკითხება", payments_loaded: "გადახდა", matched: "დაკავშირებული",
    ignored: "გამოტოვებული", bank_not_connected: "ბანკი არ არის დაკავშირებული",
    bank_secrets_hint: "Cloudflare-ში დაამატეთ Secret-ები: BOG_CLIENT_ID, BOG_CLIENT_SECRET და/ან TBC_CLIENT_ID, TBC_CLIENT_SECRET.",
    need_start: "ქვემოთ, ბანკის პარამეტრებში მიუთითეთ თარიღი, საიდანაც იწყება Syrve-ის ისტორია, და BOG-ის ანგარიშები.",
    history_note: "Syrve-ში გადახდები არ ფიქსირდება, ამიტომ თარიღი უნდა იყოს Syrve-ის ზედნადებების დაწყების თარიღი. გადასახადები, საკუთარ ანგარიშებს შორის გადარიცხვები და საკომისიოები ავტომატურად გამოტოვებულია.",
    loading_history: "იტვირთება ბანკის ისტორია…",
    err_tbc_test_keys: "ეს TBC-ის სატესტო გასაღებებია (developers.tbcbank.ge-დან) — რეალურ ანგარიშებზე არ მუშაობს. საჭიროა გასაღებები TBC ბიზნეს ინტერნეტბანკიდან: API ინტეგრაცია → ახალი ინტეგრაცია → უფლება „ტრანზაქციების ისტორიის და ამონაწერების ნახვა“. Client ID → TBC_CLIENT_ID, Client Secret → TBC_CLIENT_SECRET.",
    err_tbc_unknown_id: "TBC ამ Client ID-ს არ იცნობს (არც სვაპით). შექმენით ახალი ინტეგრაცია TBC ბიზნეს ინტერნეტბანკში (API ინტეგრაცია, SMS დადასტურებით) და ჩასვით ახალი Client ID და Secret Cloudflare-ში.",
    err_tbc_bad_keys: "TBC გასაღებებს არ იღებს. შეამოწმეთ, რომ ინტეგრაცია აქტიურია და SMS-ით დადასტურებულია, დაკავშირებული მომხმარებელი აქტიურია და აქვს „ისტორიის ნახვის“ უფლება.",
    err_tbc_down: "TBC-ის სერვერი ახლა არ პასუხობს — მოგვიანებით თავად სცდის.",
    note_tbc_swapped: "Client ID და Secret Cloudflare-ში ადგილებშია არეული — აპი ავტომატურად ასწორებს, მაგრამ სასურველია გაასწოროთ.", linked: "დამახსოვრებული გადაწყვეტილებები",
  },
  en: {
    dashboard: "Dashboard", home: "← Home", password: "Password", login: "Log in", logout: "Log out",
    wrong_password: "Wrong password", too_many: "Too many attempts — try again in 15 minutes",
    not_set: "No password set yet — send /password to the bot", saved: "Saved", save_failed: "Could not save",
    tab_fixed: "Fixed costs", tab_variable: "Variable costs", tab_live: "Live income",
    tab_monthly: "Monthly income", tab_debts: "Debts", tab_ratings: "Ratings",
    tab_employees: "Employees", tab_tasks: "Tasks", tab_menu: "Menu",
    menu_sub: "From Syrve: what sold and how much, price, recipe cost and margin (without VAT). Click a dish to see its recipe.",
    dish: "Dish", sold: "Sold", revenue: "Revenue", price: "Price", cost_short: "Cost", margin: "Margin", food_cost_pct: "Food cost",
    items_sold: "Items sold", avg_margin: "Average margin", best_seller: "Best seller",
    all_groups: "All groups", only_sold: "Only sold", sort_sold: "By sales", sort_revenue: "By revenue", sort_margin: "By margin",
    no_recipe: "no recipe", recipe_tree: "🌳 Recipe (tree)", recipe_flat: "🧺 Raw ingredients (total)", ingredient: "Ingredient", raw: "Raw ingredient",
    qty: "Quantity", unit_price: "Price / unit", value: "Cost", share: "Share", semi: "semi-finished", total_cost: "Total cost",
    price_vat: "Price (incl. VAT)", margin_novat: "Margin (excl. VAT)", one_unit: "one unit", rank: "rank", sold_when: "When it sold",
    missing_price: "⚠ Some ingredients have no price in Syrve (none in stock) — the cost may be lower than it really is.",
    recipes_err: "Could not read recipes from Syrve", cost_err: "Could not read ingredient prices", no_dishes: "No dishes found",
    flat_note: "Everything reduced to raw ingredients and summed. The most expensive ingredient is on top.", tree_note: "▸ / ▾ — open / close a semi-finished product. Prices: Syrve cost price.",
    rent: "Rent", utilities: "Utilities", internet: "Internet", salaries: "Salaries",
    program: "Program service", cleaning: "Cleaning", outsourcing: "Outsourcing",
    category: "Category", amount: "Amount", due_day: "Due day", status: "Status", comment: "Comment",
    paid: "Paid", unpaid: "Unpaid", total: "Total", per_month: "per month",
    paid_this_month: "Paid this month", left_to_pay: "Left to pay", next_due: "Next payment",
    add_category: "Add category", add: "Add", export: "Export to Excel", name: "Name",
    delete: "Delete", confirm_delete: "Delete this?", none: "—", day: "Day",
    fixed_sub: "One list for every month. “Paid” starts over at the beginning of each month.",
    every_month_on: "every month on day", overdue: "Overdue",
    goods: "Goods", jars: "Jars", packaging: "Packaging", other: "Other", type: "Type", date: "Date",
    month: "Month", var_sub: "Cost of goods and extra costs (jars, packaging).",
    no_entries: "No entries yet", month_total: "Month total",
    today_income: "Today's income", orders: "Orders", avg_check: "Average check",
    by_payment: "By payment type", by_hour: "By hour", refresh: "Refresh",
    updated: "Updated", live_sub: "Data from Syrve, refreshes every 2 minutes.",
    range_sub: "Data from Syrve for the chosen dates.", income_range: "Income", by_day: "By day",
    pick_today: "Today", pick_yesterday: "Yesterday", pick_week: "This week", pick_month: "This month", pick_last_month: "Last month",
    pick_end: "Choose the last day", wdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    pay_click: "Click a type to see every payment", order_no: "Order #", customer: "Customer", cashier: "Cashier",
    products: "Products", waybill: "Waybill (rs.ge)", by_customer: "By customer", close: "Close",
    wb_found: "Waybill", wb_missing: "Not found on rs.ge", wb_diff: "amount differs", wb_none: "Waybill",
    wb_of: "{a} of {b} with a waybill", no_orders: "No payments", not_income: "Not counted in income · at menu price",
    wb_uploaded: "Uploaded", wb_not_uploaded: "Not uploaded", time: "Time", more_items: "{n} more",
    cash: "Cash", card: "Card", credit: "Credit",
    income: "Income", fixed: "Fixed", variable: "Variable", profit: "Profit",
    this_month: "This month", last_month: "Last month", profit_this_month: "Profit this month",
    monthly_sub: "Income from Syrve cash shifts. Profit = income − fixed − variable.",
    monthly_note: "Profit = income − food cost (Syrve cost price) − fixed − variable costs. 'Goods' in Variable costs is not subtracted again — it is already in the food cost. Fixed cost for every month uses the current fixed cost list.",
    food_cost: "Food cost", after_debts: "After paying all debts",
    cost_fallback: "Syrve's cost price isn't available — 'goods' from Variable costs is subtracted instead.",
    income_by_month: "Income by month",
    total_owed: "Total owed", suppliers: "Suppliers", supplier: "Supplier", owed: "Owed",
    debts_sub: "What we owe suppliers, from Syrve balances.", search: "Search",
    prepaid: "Prepaid", no_debts: "No debts",
    platform: "Platform", rating: "Rating", reviews: "Reviews", latest: "Latest",
    ratings_sub: "Delivery app ratings. Enter the numbers from each app.", history: "History",
    wolt: "Wolt", glovo: "Glovo", bolt: "Bolt Food", no_rating: "No rating yet", vs_prev: "vs previous",
    working_today: "Working today", calendar: "Calendar", shift: "Shift", on_shift: "On shift",
    finished: "Finished", not_arrived: "Not arrived yet", nobody_today: "No shifts today",
    employees_sub: "Schedule and attendance from Syrve.", prev: "‹", next: "›",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    daily_tasks: "Daily tasks", overall_tasks: "Overall tasks", task: "Task",
    assignee: "Assignee", due: "Due", done_today: "Done today", tasks_sub: "The daily list starts over every day.",
    needs_check: "Needs to check", open_tasks: "Open tasks", done: "Done", no_tasks: "No tasks yet",
    syrve_error: "Couldn't get data from Syrve", loading: "Loading…",
    demo: "Demo mode — sample data, nothing is saved.",
    main: "Main", app_name: "Focacceria", open: "Open", profit_month: "Profit this month",
    expenses: "expenses", left_to_pay_all: "Left to pay", debts_short: "debts", fixed_short: "fixed",
    variable_short: "variable", avg_rating: "Rating", average: "average", vs_last_month: "vs last month",
    load_failed: "Couldn't load", unpaid_total: "Unpaid", today: "Today",
    invoices: "Invoices (Syrve)", paid_bank: "Paid (bank)", tax_id: "Tax ID", to_review: "To review",
    review_sub: "Recipients whose payments the app couldn't match to a supplier on its own", recipient: "Recipient", why: "Why",
    why_name_differs: "Tax ID matches, name differs", why_several_matches: "Several possible suppliers",
    why_not_in_syrve: "On rs.ge, not found in Syrve", why_name_only: "Only the name matches", why_unknown: "Unknown recipient", why_tin_differs: "Name matches, tax ID differs",
    remember_q: "Remember this for future payments to “{name}” too?", remember_yes: "Yes, always", remember_these: "Only these {n} payments",
    payments_col: "Payments", last: "last",
    choose_supplier: "Choose supplier", all_with_tin: "All payments with this tax ID", confirm: "Confirm",
    not_supplier: "Not a supplier", showing_of: "Showing {a} of {b} recipients", bank: "Bank", last_sync: "Last sync",
    bank_settings: "Bank settings", history_from: "History from", bog_accounts: "BOG accounts (IBAN, one per line)",
    save: "Save", tbc_auto: "TBC GEL accounts are read automatically", payments_loaded: "payments", matched: "matched",
    ignored: "skipped", bank_not_connected: "Bank not connected",
    bank_secrets_hint: "Add these Secrets in Cloudflare: BOG_CLIENT_ID, BOG_CLIENT_SECRET and/or TBC_CLIENT_ID, TBC_CLIENT_SECRET.",
    need_start: "In Bank settings below, set the date your Syrve history starts and your BOG accounts.",
    history_note: "Payments aren't recorded in Syrve, so the date should be when Syrve invoices start. Taxes, transfers between your own accounts and bank fees are skipped automatically.",
    loading_history: "Loading bank history…",
    err_tbc_test_keys: "These are TBC test keys (from developers.tbcbank.ge) — they never work on real accounts. You need keys from TBC Business Internet Banking: API Integration → new integration → permission “View transaction history and statements”. Client ID → TBC_CLIENT_ID, Client Secret → TBC_CLIENT_SECRET.",
    err_tbc_unknown_id: "TBC doesn't recognise this Client ID (also tried swapped). Create a new integration in TBC Business Internet Banking (API Integration, confirmed by SMS) and paste the new Client ID and Secret in Cloudflare.",
    err_tbc_bad_keys: "TBC rejects these keys. Check that the integration is active and confirmed by SMS, and that the linked user is active and has the “view history” permission.",
    err_tbc_down: "TBC's server isn't answering right now — the app will try again by itself.",
    note_tbc_swapped: "The Client ID and Secret are swapped in Cloudflare — the app fixes this automatically, but it's better to swap them back.", linked: "Remembered decisions",
  },
};

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  del(k) { try { localStorage.removeItem(k); } catch (_) {} },
};

// ====================== state ======================
const S = {
  lang: store.get("dash_lang") || "ka",
  tab: null,
  data: {},          // fixed, variable, ratings, tasks
  dataAt: {},        // when each was loaded (browser time)
  loadedAt: {},      // … and the server time of that load (keeps bot-added tasks on save)
  syrve: {},         // live, monthly, debts, employees:<month>
  varMonth: ymNow(),
  empMonth: ymNow(),
  debtQuery: "",
  liveTimer: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const t = k => (T[S.lang][k] ?? T.en[k] ?? k);

// ====================== small helpers ======================

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function money(v, opts = {}) {
  const x = n(v);
  const s = Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace(/,/g, " ");
  return (x < 0 ? "−" : "") + s + (opts.noCur ? "" : " " + CURRENCY);
}
function compact(v) {
  const x = Math.abs(n(v));
  if (x >= 1e6) return (n(v) / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (x >= 1e3) return (n(v) / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n(v)));
}
function pad(x) { return String(x).padStart(2, "0"); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function ymNow() { return todayISO().slice(0, 7); }
function ymShift(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthLabel(ym, short = false) {
  const [y, m] = ym.split("-").map(Number);
  const name = t("months")[m - 1];
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`;
}
function hhmm(s) { return s && s.length >= 16 ? s.slice(11, 16) : ""; }
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), 1800);
}

// ====================== API ======================
// Uses the same login as PriceCheck (a cookie), so no token is kept here.
async function request(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}
async function api(path, opts = {}) {
  if (DEMO) return demoApi(path, opts);
  const { res, body } = await request(API + path, opts);
  if (res.status === 401) { showLogin(); throw new Error("unauthorized"); }
  if (!res.ok) throw new Error(body.error || ("HTTP " + res.status));
  return body;
}

const DEFAULTS = {
  fixed: () => ({ categories: FIXED_PRESETS.map(k => ({ id: uid(), key: k, name: "", amount: 0, dueDay: "", comment: "", paid: {}, items: [] })) }),
  variable: () => ({ entries: [] }),
  ratings: () => ({ entries: [] }),
  tasks: () => ({ daily: [], overall: [] }),
};

async function loadData(key) {
  // tasks also come from the Telegram bot, so re-read them when no edit is waiting to be saved
  const stale = key === "tasks" && !saveTimers[key] && Date.now() - (S.dataAt[key] || 0) > 30000;
  if (S.data[key] && !stale) return S.data[key];
  const r = await api("/data/" + key);
  S.data[key] = r.value || DEFAULTS[key]();
  S.dataAt[key] = Date.now();
  S.loadedAt[key] = r.at || "";
  return S.data[key];
}

const saveTimers = {};
function saveData(key) {
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(async () => {
    delete saveTimers[key];
    try { await api("/data/" + key, { method: "PUT", body: { value: S.data[key], loadedAt: S.loadedAt[key] || "" } }); toast(t("saved")); }
    catch (e) { toast(t("save_failed") + ": " + e.message); }
  }, 500);
}

async function loadSyrve(name, query = "", fresh = false) {
  const cacheKey = name + query;
  if (S.syrve[cacheKey] && !fresh) return S.syrve[cacheKey];
  const sep = query ? "&" : "?";
  const r = await api(`/syrve/${name}${query}${fresh ? sep + "fresh=1" : ""}`);
  S.syrve[cacheKey] = r;
  return r;
}

// ====================== export ======================
function exportXlsx(filename, sheetName, rows) {
  if (!window.XLSX) { toast("Excel library not loaded"); return; }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = rows[0].map((_, i) => ({ wch: Math.max(10, ...rows.map(r => String(r[i] ?? "").length + 2)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

// ====================== bar chart (single series) ======================
// points: [{label, value, tip}]
function barChart(points, { height = 220, highlightLast = false, width = 720 } = {}) {
  const W = Math.max(280, Math.round(width)), H = height, padL = 44, padR = 8, padT = 18, padB = 26;
  const max = Math.max(1, ...points.map(p => p.value));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const band = innerW / Math.max(1, points.length);
  const bw = Math.min(24, band * 0.6);
  const y = v => padT + innerH - (Math.max(0, v) / top) * innerH;

  let grid = "", axis = "";
  for (let v = 0; v <= top + 1e-9; v += step) {
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/>`;
    axis += `<text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`;
  }
  const every = Math.ceil(points.length / 12);
  let bars = "", labels = "";
  points.forEach((p, i) => {
    const cx = padL + band * i + band / 2;
    const h = Math.max(0, padT + innerH - y(p.value));
    const x0 = cx - bw / 2, y0 = y(p.value), r = Math.min(4, h, bw / 2);
    const dim = highlightLast && i < points.length - 1 ? " dim" : "";
    const path = h > 0
      ? `M${x0},${y0 + h} L${x0},${y0 + r} Q${x0},${y0} ${x0 + r},${y0} L${x0 + bw - r},${y0} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} L${x0 + bw},${y0 + h} Z`
      : "";
    bars += `<rect class="hit" x="${padL + band * i}" y="${padT}" width="${band}" height="${innerH}" data-tip="${esc(p.tip ?? (p.label + ": " + money(p.value)))}" data-i="${i}"/>`;
    if (path) bars += `<path class="bar${dim}" data-i="${i}" d="${path}"/>`;
    if (i % every === 0) labels += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>`;
  });
  // label only the highest bar
  let peak = "";
  if (points.length) {
    const pi = points.reduce((b, p, i) => (p.value > points[b].value ? i : b), 0);
    if (points[pi].value > 0) {
      const cx = padL + band * pi + band / 2;
      peak = `<text class="val" x="${cx}" y="${y(points[pi].value) - 6}" text-anchor="middle">${compact(points[pi].value)}</text>`;
    }
  }
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">
    <g class="grid">${grid}</g><g class="axis">${axis}${labels}</g>
    <line class="zero" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/>
    <g>${bars}</g>${peak}</svg></div>`;
}
// inner width of a panel body, so chart text stays the same size on every screen
function panelWidth(half) {
  const v = $("#view");
  const cs = getComputedStyle(v);
  const inner = v.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const w = half && inner > 860 ? (inner - 20) / 2 : inner;
  return w - 34; // panel border + body padding
}
function niceStep(raw) {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
function wireChartHover(root) {
  const tip = $("#tooltip");
  $$(".chart .hit", root).forEach(h => {
    const bar = $(`.chart .bar[data-i="${h.dataset.i}"]`, h.closest("svg"));
    h.addEventListener("mousemove", e => {
      tip.innerHTML = h.dataset.tip.replace(/: (.*)$/, ": <b>$1</b>");
      tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px"; tip.hidden = false;
      bar && bar.classList.add("hover");
    });
    h.addEventListener("mouseleave", () => { tip.hidden = true; bar && bar.classList.remove("hover"); });
  });
}

// ====================== shell ======================
function applyStatic() {
  document.documentElement.lang = S.lang;
  $$("[data-t]").forEach(el => (el.textContent = t(el.dataset.t)));
  $("#langBtn").textContent = S.lang === "ka" ? "EN" : "ქარ";
  document.title = PAGE === "main" ? t("app_name") : t("dashboard");
  if (!$("#tabs")) return;
  $("#tabs").innerHTML = TABS.map(k =>
    `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k === S.tab}">${esc(t("tab_" + k))}</button>`).join("");
  $$("#tabs .tab").forEach(b => b.addEventListener("click", () => { location.hash = b.dataset.tab; }));
}

function showLogin() { $("#app").hidden = true; $("#login").hidden = false; applyStatic(); $("#loginPass").focus(); }
function showApp() { $("#login").hidden = true; $("#app").hidden = false; route(); }
async function logout() {
  if (!DEMO) { try { await request("/api/logout", { method: "POST", body: {} }); } catch (_) {} }
  S.data = {}; S.syrve = {}; showLogin();
}

function route() {
  const tab = PAGE === "main" ? "main" : TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : TABS[0];
  S.tab = tab;
  clearInterval(S.liveTimer);
  applyStatic();
  render();
}

async function render() {
  const view = $("#view");
  const renderers = { main: renderMain, fixed: renderFixed, variable: renderVariable, live: renderLive, monthly: renderMonthly,
    menu: renderMenu, debts: renderDebts, ratings: renderRatings, employees: renderEmployees, tasks: renderTasks };
  const demo = DEMO ? `<div class="notice">${esc(t("demo"))}</div>` : "";
  try {
    await renderers[S.tab](view, demo);
  } catch (e) {
    view.innerHTML = demo + `<div class="notice bad">${esc(t("syrve_error"))}: ${esc(e.message)}</div>`;
  }
}

function head(title, sub, actions = "") {
  return `<div class="section-head"><div><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div><div class="actions">${actions}</div></div>`;
}
function card(label, value, hint = "", cls = "") {
  return `<div class="card ${cls}"><div class="label">${esc(label)}</div><div class="value num ${cls.includes("good") ? "good" : cls.includes("bad") ? "bad" : ""}">${value}</div>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
}
function confirmDel() { return confirm(t("confirm_delete")); }

// "who works today" list — used by the Employees tab and by Main
function whoWorksToday(tdata) {
  const today = tdata.today || todayISO();
  const now = new Date();
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const todayShifts = tdata.shifts.filter(s => (s.from || "").slice(0, 10) === today).sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  const att = tdata.attendance.filter(a => (a.from || "").slice(0, 10) === today);
  const statusOf = s => {
    const a = att.filter(x => x.employeeId === s.employeeId);
    if (!a.length) return `<span class="pill neutral">○ ${esc(t("not_arrived"))}</span>`;
    const open = a.find(x => !x.to || hhmm(x.to) > nowHM || (x.to || "").slice(0, 10) > today);
    return open
      ? `<span class="pill good">● ${esc(t("on_shift"))} · ${esc(hhmm(open.from))}</span>`
      : `<span class="pill neutral">✓ ${esc(t("finished"))} · ${esc(hhmm(a[a.length - 1].to))}</span>`;
  };
  const initials = name => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?";
  const html = todayShifts.length ? `<div class="today-list">${todayShifts.map(s => `
    <div class="person"><div class="who"><span class="avatar">${esc(initials(s.name))}</span>
      <div><div><b>${esc(s.name)}</b></div><div class="muted small">${esc(t("shift"))} ${esc(hhmm(s.from))}–${esc(hhmm(s.to))}${s.department ? " · " + esc(s.department) : ""}</div></div></div>
      ${statusOf(s)}</div>`).join("")}</div>`
    : `<div class="empty">${esc(t("nobody_today"))}</div>`;
  return { html, count: todayShifts.length };
}

// totals shared by the cost tabs and Main
function fixedTotals(fx, ym = ymNow()) {
  const total = fx.categories.reduce((a, c) => a + n(c.amount), 0);
  const unpaid = fx.categories.filter(c => !(c.paid && c.paid[ym])).reduce((a, c) => a + n(c.amount), 0);
  return { total, unpaid, paid: total - unpaid };
}
function variableTotals(vr, ym = ymNow()) {
  const month = vr.entries.filter(e => (e.date || "").startsWith(ym)).reduce((a, e) => a + n(e.amount), 0);
  const unpaid = vr.entries.filter(e => !e.paid).reduce((a, e) => a + n(e.amount), 0); // unpaid from any month
  return { month, unpaid };
}

// Profit for one month = income − food cost (Syrve's cost price of what was sold) − fixed − variable.
// Supplier goods typed into Variable costs are left out when Syrve's food cost is known:
// that food is already in the food cost and would otherwise count twice.
function monthProfit(m, fixedTotal, vr) {
  const inMonth = vr.entries.filter(e => (e.date || "").startsWith(m.month));
  const goods = inMonth.filter(e => e.type === "goods").reduce((a, e) => a + n(e.amount), 0);
  const other = inMonth.filter(e => e.type !== "goods").reduce((a, e) => a + n(e.amount), 0);
  const fromSyrve = m.cost !== null && m.cost !== undefined;
  const food = fromSyrve ? n(m.cost) : goods;
  return { food, fromSyrve, fixed: fixedTotal, variable: fromSyrve ? other : 0, profit: n(m.income) - food - fixedTotal - (fromSyrve ? other : 0) };
}

// ====================== MAIN (overview at "/") ======================
async function renderMain(view, demo, fresh = false) {
  if (!view.dataset.loaded) view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const ym = ymNow();
  // each source loads on its own, so one failing box doesn't break the page
  const [fx, vr, rt, tk, live, monthly, debts, emp] = await Promise.allSettled([
    loadData("fixed"), loadData("variable"), loadData("ratings"), loadData("tasks"),
    loadSyrve("live", "", fresh), loadSyrve("monthly", "", fresh), loadSyrve("debts", "", fresh),
    loadSyrve("employees", "?month=" + ym, fresh),
  ]);
  const ok = r => r.status === "fulfilled";
  const failed = r => `<div class="value muted">—</div><div class="hint bad-text">${esc(t("load_failed"))}${r.reason ? ": " + esc(r.reason.message) : ""}</div>`;
  const link = tab => `<a class="box-link" href="/dashboard/#${tab}" title="${esc(t("open"))}">→</a>`;
  const box = (cls, label, icon, tab, body) =>
    `<section class="card box ${cls}"><div class="box-head"><span class="label">${icon} ${esc(label)}</span>${tab ? link(tab) : ""}</div>${body}</section>`;

  const F = ok(fx) ? fixedTotals(fx.value, ym) : null;
  const V = ok(vr) ? variableTotals(vr.value, ym) : null;
  const D = ok(debts) ? n(debts.value.total) : null;
  const months = ok(monthly) ? monthly.value.months : [];
  const cur = months[months.length - 1], prev = months[months.length - 2];
  const income = cur ? n(cur.income) : null;

  // 1. Profit = income − food cost − fixed − variable (this month); then what is left after all supplier debts
  let profitBox;
  if (income !== null && F && ok(vr) && D !== null) {
    const P = monthProfit(cur, F.total, vr.value);
    const after = P.profit - D;
    profitBox = `<div class="value num ${P.profit >= 0 ? "good" : "bad"}">${money(P.profit)}</div>
      <div class="hint">${esc(t("income"))} ${money(income)} − ${esc(t("food_cost"))} ${money(P.food)} − ${esc(t("fixed_short"))} ${money(F.total)}${P.fromSyrve ? ` − ${esc(t("variable_short"))} ${money(P.variable)}` : ""}</div>
      ${P.fromSyrve ? "" : `<div class="hint">${esc(t("cost_fallback"))}</div>`}
      <div class="hint">${esc(t("after_debts"))}: <b class="${after >= 0 ? "good" : "bad"}-text">${money(after)}</b> <span class="muted">(${esc(t("debts_short"))} ${money(D)})</span></div>`;
  } else profitBox = failed([monthly, fx, vr, debts].find(r => !ok(r)) || {});

  // 2. Fixed costs
  const fixedBox = F ? `<div class="value num">${money(F.total)}</div><div class="hint">${esc(t("per_month"))} · ${esc(t("unpaid"))} ${money(F.unpaid)}</div>` : failed(fx);

  // 3. Left to pay = unpaid fixed + unpaid variable + supplier debts
  let leftBox;
  if (F && V && D !== null) {
    const left = F.unpaid + V.unpaid + D;
    leftBox = `<div class="value num ${left > 0 ? "bad" : ""}">${money(left)}</div>
      <div class="hint">${esc(t("debts_short"))} ${money(D)} · ${esc(t("fixed_short"))} ${money(F.unpaid)} · ${esc(t("variable_short"))} ${money(V.unpaid)}</div>`;
  } else leftBox = failed([fx, vr, debts].find(r => !ok(r)) || {});

  // 4. Today's income
  const liveBox = ok(live)
    ? `<div class="value num">${money(live.value.total)}</div><div class="hint">${live.value.orders ? live.value.orders + " " + esc(t("orders").toLowerCase()) : esc(t("today"))}</div>`
    : failed(live);

  // 5. Monthly income
  let monthBox = failed(monthly);
  if (cur) {
    const ch = prev && prev.income ? Math.round((cur.income - prev.income) / prev.income * 100) : null;
    monthBox = `<div class="value num">${money(cur.income)}</div><div class="hint">${esc(monthLabel(cur.month))}${ch !== null ? ` · ${ch >= 0 ? "+" : "−"}${Math.abs(ch)}% ${esc(t("vs_last_month"))}` : ""}</div>`;
  }

  // 6. Rating — average of each app's latest score
  let ratingBox = failed(rt);
  if (ok(rt)) {
    const latest = PLATFORMS.map(p => rt.value.entries.filter(e => e.platform === p).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0]).filter(Boolean);
    const avg = latest.length ? latest.reduce((a, e) => a + n(e.rating), 0) / latest.length : null;
    const per = PLATFORMS.filter(p => p !== "other" || latest.some(e => e.platform === "other"))
      .map(p => { const e = latest.find(x => x.platform === p); return `${esc(t(p))} ${e ? n(e.rating).toFixed(1) : "—"}`; }).join(" · ");
    ratingBox = `<div class="value num">${avg !== null ? avg.toFixed(2) : "—"} <span class="unit">${avg !== null ? esc(t("average")) : esc(t("no_rating"))}</span></div><div class="hint">${per}</div>`;
  }

  // 7. Employees today
  let empBox = failed(emp), empCount = "";
  if (ok(emp)) { const w = whoWorksToday(emp.value); empBox = w.html; empCount = ` · ${w.count}`; }

  // 8. Daily tasks (tick here)
  let taskBox = failed(tk), taskCount = "";
  const today = todayISO();
  if (ok(tk)) {
    const daily = tk.value.daily;
    const done = daily.filter(x => x.done && x.done[today]).length;
    taskCount = ` · ${done} / ${daily.length}`;
    taskBox = daily.length ? `<div class="progress main-progress"><div style="width:${daily.length ? Math.round(done / daily.length * 100) : 0}%"></div></div>
      <ul class="task-list">${daily.map(x => { const d = !!(x.done && x.done[today]); return `<li class="task ${d ? "done" : ""}">
        <input type="checkbox" data-id="${x.id}" ${d ? "checked" : ""}><span class="title">${esc(x.title)}</span><span class="meta">${esc(x.assignee || "")}</span><span></span></li>`; }).join("")}</ul>`
      : `<div class="empty">${esc(t("no_tasks"))}</div>`;
  }

  const upd = new Date();
  view.dataset.loaded = "1";
  view.innerHTML = demo + `<div class="main-meta muted small">${esc(t("updated"))} ${pad(upd.getHours())}:${pad(upd.getMinutes())} <button class="btn ghost small" id="mainRefresh">${esc(t("refresh"))}</button></div>
    <div class="main-grid">
      ${box("span2 hero", t("profit_month"), "📈", "monthly", profitBox)}
      ${box("", t("tab_fixed"), "🏠", "fixed", fixedBox)}
      ${box("", t("left_to_pay_all"), "🧾", "debts", leftBox)}
      ${box("", t("today_income"), "💵", "live", liveBox)}
      ${box("", t("tab_monthly"), "📅", "monthly", monthBox)}
      ${box("span2", t("avg_rating"), "⭐", "ratings", ratingBox)}
      ${box("span2 list", t("working_today") + empCount, "👥", "employees", empBox)}
      ${box("span2 list", t("daily_tasks") + taskCount, "✅", "tasks", taskBox)}
    </div>`;

  $("#mainRefresh", view).addEventListener("click", () => renderMain(view, demo, true).catch(e => toast(e.message)));
  if (ok(tk)) $$(".task input[type=checkbox]", view).forEach(cb => cb.addEventListener("change", () => {
    const x = tk.value.daily.find(v => v.id === cb.dataset.id); if (!x) return;
    x.done = x.done || {}; if (cb.checked) x.done[today] = true; else delete x.done[today];
    saveData("tasks"); renderMain(view, demo);
  }));
  clearInterval(S.liveTimer);
  S.liveTimer = setInterval(() => { if (S.tab === "main" && !document.hidden) renderMain(view, demo, true).catch(() => {}); }, LIVE_REFRESH_MS);
}

// ====================== 1. FIXED COSTS ======================
async function renderFixed(view, demo) {
  const d = await loadData("fixed");
  const ym = ymNow();
  const day = new Date().getDate();
  const cats = d.categories;
  const catName = c => c.name || (c.key ? t(c.key) : "");
  const catAmount = c => (SUBITEMS_ENABLED && c.items && c.items.length ? c.items.reduce((a, i) => a + n(i.amount), 0) : n(c.amount));
  const total = cats.reduce((a, c) => a + catAmount(c), 0);
  const paid = cats.filter(c => c.paid && c.paid[ym]).reduce((a, c) => a + catAmount(c), 0);
  const unpaid = cats.filter(c => !(c.paid && c.paid[ym]));
  const nextDue = unpaid.filter(c => c.dueDay).sort((a, b) => n(a.dueDay) - n(b.dueDay))
    .find(c => n(c.dueDay) >= day) || unpaid.filter(c => c.dueDay).sort((a, b) => n(a.dueDay) - n(b.dueDay))[0];

  const rows = cats.map(c => {
    const isPaid = !!(c.paid && c.paid[ym]);
    const late = !isPaid && c.dueDay && n(c.dueDay) < day;
    const pill = isPaid
      ? `<button class="pill good" data-act="toggle" data-id="${c.id}">✓ ${esc(t("paid"))}</button>`
      : `<button class="pill ${late ? "bad" : "neutral"}" data-act="toggle" data-id="${c.id}">${late ? "! " + esc(t("overdue")) : "○ " + esc(t("unpaid"))}</button>`;
    return `<tr>
      <td><input class="cell-input" data-f="name" data-id="${c.id}" value="${esc(catName(c))}"></td>
      <td class="r"><input class="cell-input amount" type="number" step="0.01" min="0" data-f="amount" data-id="${c.id}" value="${esc(c.amount)}"></td>
      <td><input class="cell-input day" type="number" min="1" max="31" data-f="dueDay" data-id="${c.id}" value="${esc(c.dueDay)}" placeholder="—"></td>
      <td>${pill}</td>
      <td><input class="cell-input" data-f="comment" data-id="${c.id}" value="${esc(c.comment)}" placeholder="…"></td>
      <td class="r"><button class="icon-btn" title="${esc(t("delete"))}" data-act="del" data-id="${c.id}">✕</button></td>
    </tr>`;
  }).join("");

  view.innerHTML = demo + head(t("tab_fixed"), t("fixed_sub"), `<button class="btn" id="fxExport">${esc(t("export"))}</button>`) +
    `<div class="cards">
      ${card(t("total") + " · " + t("per_month"), money(total), "", "hero")}
      ${card(t("paid_this_month"), money(paid), monthLabel(ym), "good")}
      ${card(t("left_to_pay"), money(total - paid), `${unpaid.length} ${esc(t("category").toLowerCase())}`, total - paid > 0 ? "bad" : "")}
      ${card(t("next_due"), nextDue ? esc(catName(nextDue)) : t("none"), nextDue ? `${esc(t("day"))} ${esc(nextDue.dueDay)} · ${money(catAmount(nextDue))}` : "")}
    </div>
    <div class="panel">
      <div class="table-wrap"><table class="edit">
        <thead><tr><th>${esc(t("category"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("due_day"))}</th><th>${esc(t("status"))} · ${esc(monthLabel(ym))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        <tfoot><tr><td>${esc(t("total"))}</td><td class="r num">${money(total)}</td><td colspan="4"></td></tr></tfoot>
      </table></div>
      <form class="form-row" id="fxAdd">
        <label class="w-l">${esc(t("name"))}<input type="text" name="name" required></label>
        <label class="w-s">${esc(t("amount"))}<input type="number" name="amount" step="0.01" min="0" required></label>
        <label class="w-s">${esc(t("due_day"))}<input type="number" name="dueDay" min="1" max="31"></label>
        <label>${esc(t("comment"))}<input type="text" name="comment"></label>
        <button class="btn primary" type="submit">${esc(t("add_category"))}</button>
      </form>
    </div>`;

  const find = id => cats.find(c => c.id === id);
  $$(".cell-input", view).forEach(inp => inp.addEventListener("change", () => {
    const c = find(inp.dataset.id); if (!c) return;
    const f = inp.dataset.f;
    if (f === "name") c.name = (c.key && inp.value.trim() === t(c.key)) ? "" : inp.value.trim();
    else if (f === "amount") c.amount = n(inp.value);
    else if (f === "dueDay") c.dueDay = inp.value ? Math.min(31, Math.max(1, n(inp.value))) : "";
    else c[f] = inp.value;
    saveData("fixed"); renderFixed(view, demo);
  }));
  $$("[data-act]", view).forEach(b => b.addEventListener("click", () => {
    const c = find(b.dataset.id); if (!c) return;
    if (b.dataset.act === "toggle") { c.paid = c.paid || {}; if (c.paid[ym]) delete c.paid[ym]; else c.paid[ym] = true; }
    if (b.dataset.act === "del") { if (!confirmDel()) return; d.categories = cats.filter(x => x.id !== c.id); }
    saveData("fixed"); renderFixed(view, demo);
  }));
  $("#fxAdd", view).addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    d.categories.push({ id: uid(), key: null, name: f.get("name").trim(), amount: n(f.get("amount")),
      dueDay: f.get("dueDay") ? n(f.get("dueDay")) : "", comment: f.get("comment") || "", paid: {}, items: [] });
    saveData("fixed"); renderFixed(view, demo);
  });
  $("#fxExport", view).addEventListener("click", () => {
    const rows = [[t("category"), t("amount"), t("due_day"), t("status") + " " + monthLabel(ym), t("comment")]];
    cats.forEach(c => rows.push([catName(c), catAmount(c), c.dueDay || "", c.paid && c.paid[ym] ? t("paid") : t("unpaid"), c.comment || ""]));
    rows.push([t("total"), total, "", "", ""]);
    exportXlsx(`fixed-costs-${ym}.xlsx`, t("tab_fixed"), rows);
  });
}

// ====================== 2. VARIABLE COSTS ======================
async function renderVariable(view, demo) {
  const d = await loadData("variable");
  const ym = S.varMonth;
  const list = d.entries.filter(e => (e.date || "").startsWith(ym)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const total = list.reduce((a, e) => a + n(e.amount), 0);
  const byType = Object.fromEntries(VAR_TYPES.map(k => [k, list.filter(e => e.type === k).reduce((a, e) => a + n(e.amount), 0)]));
  const unpaidMonth = list.filter(e => !e.paid).reduce((a, e) => a + n(e.amount), 0);

  const typeSelect = (val, attrs) => `<select ${attrs}>${VAR_TYPES.map(k => `<option value="${k}" ${k === val ? "selected" : ""}>${esc(t(k))}</option>`).join("")}</select>`;
  const rows = list.map(e => `<tr>
    <td><input class="cell-input" type="date" data-f="date" data-id="${e.id}" value="${esc(e.date)}"></td>
    <td>${typeSelect(e.type, `class="cell-input" data-f="type" data-id="${e.id}"`)}</td>
    <td><input class="cell-input" data-f="name" data-id="${e.id}" value="${esc(e.name)}"></td>
    <td class="r"><input class="cell-input amount" type="number" step="0.01" min="0" data-f="amount" data-id="${e.id}" value="${esc(e.amount)}"></td>
    <td>${e.paid
      ? `<button class="pill good" data-act="paid" data-id="${e.id}">✓ ${esc(t("paid"))}</button>`
      : `<button class="pill neutral" data-act="paid" data-id="${e.id}">○ ${esc(t("unpaid"))}</button>`}</td>
    <td><input class="cell-input" data-f="comment" data-id="${e.id}" value="${esc(e.comment)}" placeholder="…"></td>
    <td class="r"><button class="icon-btn" data-act="del" data-id="${e.id}" title="${esc(t("delete"))}">✕</button></td>
  </tr>`).join("");

  const defaultDate = ym === ymNow() ? todayISO() : ym + "-01";
  view.innerHTML = demo + head(t("tab_variable"), t("var_sub"),
    `<input type="month" id="varMonth" value="${ym}"><button class="btn" id="varExport">${esc(t("export"))}</button>`) +
    `<div class="cards">
      ${card(t("month_total"), money(total), esc(monthLabel(ym)), "hero")}
      ${card(t("unpaid_total"), money(unpaidMonth), esc(monthLabel(ym)), unpaidMonth > 0 ? "bad" : "")}
      ${VAR_TYPES.map(k => card(t(k), money(byType[k]))).join("")}
    </div>
    <div class="panel">
      <div class="table-wrap"><table class="edit">
        <thead><tr><th>${esc(t("date"))}</th><th>${esc(t("type"))}</th><th>${esc(t("name"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("status"))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        ${list.length ? `<tfoot><tr><td colspan="3">${esc(t("total"))}</td><td class="r num">${money(total)}</td><td colspan="3"></td></tr></tfoot>` : ""}
      </table></div>
      <form class="form-row" id="varAdd">
        <label class="w-s">${esc(t("date"))}<input type="date" name="date" value="${defaultDate}" required></label>
        <label class="w-s">${esc(t("type"))}${typeSelect("goods", 'name="type"')}</label>
        <label class="w-l">${esc(t("name"))}<input type="text" name="name" required></label>
        <label class="w-s">${esc(t("amount"))}<input type="number" name="amount" step="0.01" min="0" required></label>
        <label>${esc(t("comment"))}<input type="text" name="comment"></label>
        <button class="btn primary" type="submit">${esc(t("add"))}</button>
      </form>
    </div>`;

  $("#varMonth", view).addEventListener("change", e => { S.varMonth = e.target.value || ymNow(); renderVariable(view, demo); });
  const find = id => d.entries.find(x => x.id === id);
  $$(".cell-input", view).forEach(inp => inp.addEventListener("change", () => {
    const e = find(inp.dataset.id); if (!e) return;
    e[inp.dataset.f] = inp.dataset.f === "amount" ? n(inp.value) : inp.value;
    saveData("variable"); renderVariable(view, demo);
  }));
  $$("[data-act=del]", view).forEach(b => b.addEventListener("click", () => {
    if (!confirmDel()) return;
    d.entries = d.entries.filter(x => x.id !== b.dataset.id); saveData("variable"); renderVariable(view, demo);
  }));
  $$("[data-act=paid]", view).forEach(b => b.addEventListener("click", () => {
    const e = find(b.dataset.id); if (!e) return;
    e.paid = !e.paid; saveData("variable"); renderVariable(view, demo);
  }));
  $("#varAdd", view).addEventListener("submit", ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    d.entries.push({ id: uid(), date: f.get("date"), type: f.get("type"), name: f.get("name").trim(), amount: n(f.get("amount")), comment: f.get("comment") || "", paid: false });
    S.varMonth = String(f.get("date")).slice(0, 7);
    saveData("variable"); renderVariable(view, demo);
  });
  $("#varExport", view).addEventListener("click", () => {
    const rows = [[t("date"), t("type"), t("name"), t("amount"), t("status"), t("comment")]];
    list.forEach(e => rows.push([e.date, t(e.type), e.name, n(e.amount), e.paid ? t("paid") : t("unpaid"), e.comment || ""]));
    rows.push([t("total"), "", "", total, "", ""]);
    exportXlsx(`variable-costs-${ym}.xlsx`, t("tab_variable"), rows);
  });
}

// ====================== 3. LIVE INCOME ======================
// One day or a range of days. Today (the default) refreshes itself; any other range is fixed.
// Clicking a payment type opens every payment of that type: customer, products, and for B2B
// customers whether we issued them a waybill on rs.ge.
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shiftDay = (day, k) => { const d = new Date(day + "T12:00:00"); d.setDate(d.getDate() + k); return isoDay(d); };
const dm = day => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
const dmy = day => `${dm(day)}.${day.slice(0, 4)}`;
// date ranges per tab ("live", "menu"); today by default
function rangeOf(key) { const today = todayISO(), r = (S.ranges || {})[key]; return r && r.to <= today ? r : { from: today, to: today }; }
function liveRange() { return rangeOf("live"); }
const rangeQuery = r => `?from=${r.from}&to=${r.to}`;
const rangeLabel = r => (r.from === r.to ? dmy(r.from) : `${dmy(r.from)} – ${dmy(r.to)}`);

function calendarHtml(key) {
  const r = rangeOf(key), today = todayISO();
  const ym = S.calMonth || r.to.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = shiftDay(isoDay(first), -((first.getDay() + 6) % 7)); // back to Monday
  const pick = S.calPick; // first click of a new range
  const lo = pick || r.from, hi = pick || r.to;
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const day = shiftDay(start, i);
    const cls = ["rc-day",
      day.slice(0, 7) !== ym ? "out" : "",
      day >= lo && day <= hi ? "in" : "", day === lo ? "lo" : "", day === hi ? "hi" : "",
      day === today ? "today" : ""].filter(Boolean).join(" ");
    cells += `<button type="button" class="${cls}" data-day="${day}" ${day > today ? "disabled" : ""}>${Number(day.slice(8))}</button>`;
  }
  const quick = [["pick_today", "today"], ["pick_yesterday", "yesterday"], ["pick_week", "week"], ["pick_month", "month"], ["pick_last_month", "lastmonth"]];
  return `<div class="rc-head"><button type="button" class="btn small" data-cal="-1">‹</button>
      <b>${esc(monthLabel(ym))}</b><button type="button" class="btn small" data-cal="1" ${ym >= today.slice(0, 7) ? "disabled" : ""}>›</button></div>
    <div class="rc-grid">${t("wdays").map(w => `<span class="rc-wd">${esc(w)}</span>`).join("")}${cells}</div>
    ${pick ? `<div class="muted small rc-note">${esc(t("pick_end"))}</div>` : ""}
    <div class="rc-quick">${quick.map(([k, v]) => `<button type="button" class="btn small" data-quick="${v}">${esc(t(k))}</button>`).join("")}</div>`;
}

function quickRange(kind) {
  const today = todayISO();
  if (kind === "yesterday") { const y = shiftDay(today, -1); return { from: y, to: y }; }
  if (kind === "week") { const d = new Date(today + "T12:00:00"); return { from: shiftDay(today, -((d.getDay() + 6) % 7)), to: today }; }
  if (kind === "month") return { from: today.slice(0, 8) + "01", to: today };
  if (kind === "lastmonth") { const ym = ymShift(today.slice(0, 7), -1); return { from: ym + "-01", to: shiftDay(today.slice(0, 8) + "01", -1) }; }
  return { from: today, to: today };
}

function wireCalendar(view, key, onChange) {
  const pop = $("#calPop", view);
  const setRange = r => { S.ranges = { ...S.ranges, [key]: r }; S.calPick = null; S.calMonth = null; onChange(); };
  $("#rangeBtn", view).addEventListener("click", e => { e.stopPropagation(); pop.hidden = !pop.hidden; if (!pop.hidden) { pop.innerHTML = calendarHtml(key); } });
  pop.addEventListener("click", e => {
    e.stopPropagation();
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.cal) { S.calMonth = ymShift(S.calMonth || rangeOf(key).to.slice(0, 7), Number(b.dataset.cal)); pop.innerHTML = calendarHtml(key); return; }
    if (b.dataset.quick) return setRange(quickRange(b.dataset.quick));
    const day = b.dataset.day; if (!day) return;
    if (!S.calPick) { S.calPick = day; pop.innerHTML = calendarHtml(key); return; }
    setRange({ from: [S.calPick, day].sort()[0], to: [S.calPick, day].sort()[1] });
  });
  if (!S.calBound) { // once: a click anywhere else closes the calendar
    S.calBound = true;
    document.addEventListener("click", () => {
      const p = $("#calPop");
      if (p && !p.hidden) { p.hidden = true; S.calPick = null; S.calMonth = null; }
    });
  }
}

function payName(s) {
  const k = String(s || "").toLowerCase();
  if (/cash|нал|ნაღდ/.test(k)) return t("cash");
  if (/card|карт|ბარათ|visa|master/.test(k)) return t("card");
  if (/credit|кредит/.test(k)) return t("credit");
  return s;
}

async function renderLive(view, demo, fresh = false) {
  const range = liveRange();
  const isToday = range.from === todayISO() && range.to === range.from;
  const q = rangeQuery(range);
  if (!S.syrve["live" + q]) view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const r = await loadSyrve("live", q, fresh);
  const maxPay = Math.max(1, ...r.byPayType.map(p => p.sum));
  const payRows = r.byPayType.slice().sort((a, b) => (!!a.notIncome - !!b.notIncome) || b.sum - a.sum);
  const avg = r.orders ? r.total / r.orders : 0;
  let chart = [], chartTitle = t("by_hour");
  if (range.from === range.to && r.byHour && r.byHour.length) {
    const lo = Math.min(...r.byHour.map(h => h.hour)), hi = Math.max(...r.byHour.map(h => h.hour));
    for (let h = lo; h <= hi; h++) {
      const v = (r.byHour.find(x => x.hour === h) || {}).sum || 0;
      chart.push({ label: pad(h) + ":00", value: v, tip: `${pad(h)}:00–${pad(h + 1)}:00: ${money(v)}` });
    }
  } else if (range.from !== range.to) {
    chartTitle = t("by_day");
    for (let d = range.from; d <= range.to; d = shiftDay(d, 1)) {
      const v = ((r.byDay || []).find(x => x.day === d) || {}).sum || 0;
      chart.push({ label: dm(d), value: v, tip: `${dmy(d)}: ${money(v)}` });
    }
  }
  const upd = new Date(r._at || Date.now());
  if (S.livePay && !r.byPayType.some(p => p.name === S.livePay)) S.livePay = null;

  view.innerHTML = demo + head(t("tab_live"), isToday ? t("live_sub") : t("range_sub"),
    `<div class="range-pick"><button class="btn range-btn" id="rangeBtn" type="button">📅 ${esc(rangeLabel(range))}</button><div class="rc-pop panel" id="calPop" hidden></div></div>
     <span class="muted small">${esc(t("updated"))} ${pad(upd.getHours())}:${pad(upd.getMinutes())}</span><button class="btn" id="liveRefresh">${esc(t("refresh"))}</button>`) +
    `<div class="cards">
      ${card(isToday ? t("today_income") : t("income_range"), money(r.total), esc(rangeLabel(range)), "hero")}
      ${card(t("orders"), r.orders ? String(r.orders) : t("none"))}
      ${card(t("avg_check"), r.orders ? money(avg) : t("none"))}
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head"><h3>${esc(t("by_payment"))}</h3>${r.byPayType.length && r.source !== "cashshifts" ? `<span class="muted small">${esc(t("pay_click"))}</span>` : ""}</div><div class="panel-body">
        ${payRows.length ? `<div class="split">${payRows.map(p => `
          <button type="button" class="split-row pay-row ${p.notIncome ? "not-income" : ""} ${S.livePay === p.name ? "on" : ""}" data-pay="${esc(p.name)}" ${r.source === "cashshifts" ? "disabled" : ""}>
          <span>${esc(payName(p.name))} <span class="chev">›</span>${p.notIncome ? `<div class="muted small">${esc(t("not_income"))}</div>` : ""}</span>
          <span class="num"><b>${money(p.sum)}</b>${p.notIncome ? "" : ` <span class="muted small">${r.total ? Math.round(p.sum / r.total * 100) : 0}%</span>`}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(p.sum / maxPay * 100).toFixed(1)}%"></div></div></button>`).join("")}</div>`
        : `<div class="empty">${esc(t("no_entries"))}</div>`}
      </div></div>
      <div class="panel"><div class="panel-head"><h3>${esc(chartTitle)}</h3></div><div class="panel-body">
        ${chart.length ? barChart(chart, { height: 200, width: panelWidth(true) }) : `<div class="empty">${esc(t("no_entries"))}</div>`}
      </div></div>
    </div>
    <div id="payDetail"></div>`;
  wireChartHover(view);
  wireCalendar(view, "live", () => { S.livePay = null; renderLive(view, demo).catch(e => toast(e.message)); });
  $("#liveRefresh", view).addEventListener("click", () => renderLive(view, demo, true).catch(e => toast(e.message)));
  $$(".pay-row", view).forEach(b => b.addEventListener("click", () => {
    S.livePay = S.livePay === b.dataset.pay ? null : b.dataset.pay;
    $$(".pay-row", view).forEach(x => x.classList.toggle("on", x.dataset.pay === S.livePay));
    renderPayDetail(view, range, fresh);
  }));
  if (S.livePay) renderPayDetail(view, range, fresh);
  clearInterval(S.liveTimer);
  if (range.to === todayISO()) S.liveTimer = setInterval(() => { if (S.tab === "live" && !document.hidden && !S.calPick && $("#calPop")?.hidden !== false) renderLive(view, demo, true).catch(() => {}); }, LIVE_REFRESH_MS);
}

// B2B: only the orders and whether we uploaded a waybill for each on rs.ge.
function renderB2B(box, view, d, range) {
  const multiDay = range.from !== range.to;
  const status = o => {
    if (d.waybillError || !o.customer) return "";
    return o.waybill ? t("wb_uploaded") + " · № " + o.waybill.number : t("wb_not_uploaded");
  };
  const cell = o => {
    if (d.waybillError || !o.customer) return `<span class="muted">—</span>`;
    return o.waybill ? `<span class="pill good">✓ ${esc(t("wb_uploaded"))}</span> <span class="muted small num">№ ${esc(o.waybill.number)}</span>`
      : `<span class="pill bad">✗ ${esc(t("wb_not_uploaded"))}</span>`;
  };
  const withWb = d.orders.filter(o => o.waybill).length;
  box.innerHTML = `<div class="panel pay-detail">
    <div class="panel-head"><h3>${esc(d.name)} · ${esc(rangeLabel(range))}</h3>
      <div class="actions"><span class="num"><b>${money(d.total)}</b> · ${esc(t("wb_of").replace("{a}", withWb).replace("{b}", d.orders.length))}</span>
      <button class="btn small" id="payExport">${esc(t("export"))}</button><button class="btn small ghost" id="payClose">✕ ${esc(t("close"))}</button></div></div>
    ${d.waybillError ? `<div class="notice bad" style="margin:12px 16px 0">rs.ge: ${esc(d.waybillError)}</div>` : ""}
    <div class="table-wrap"><table>
      <thead><tr><th>${esc(multiDay ? t("date") : t("time"))}</th><th>${esc(t("order_no"))}</th><th>${esc(t("customer"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("waybill"))}</th></tr></thead>
      <tbody>${d.orders.length ? d.orders.map(o => `<tr>
        <td class="nowrap num">${multiDay ? esc(dm(o.day)) + " " : ""}${esc(o.time)}</td><td class="num">${esc(o.num)}</td>
        <td><b>${esc(o.customer || "—")}</b></td><td class="r num nowrap"><b>${money(o.sum)}</b></td><td class="nowrap">${cell(o)}</td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">${esc(t("no_orders"))}</td></tr>`}</tbody>
    </table></div></div>`;
  $("#payClose", box).addEventListener("click", () => { S.livePay = null; $$(".pay-row", view).forEach(x => x.classList.remove("on")); box.innerHTML = ""; });
  $("#payExport", box).addEventListener("click", () => {
    const out = [[t("date"), t("time"), t("order_no"), t("customer"), t("amount"), t("waybill")]];
    d.orders.forEach(o => out.push([o.day, o.time, o.num, o.customer, o.sum, status(o)]));
    exportXlsx(`${d.name}-${range.from}_${range.to}.xlsx`, String(d.name).slice(0, 30), out);
  });
}

async function renderPayDetail(view, range, fresh = false) {
  const box = $("#payDetail", view);
  if (!box) return;
  const name = S.livePay;
  if (!name) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="panel"><div class="loading">${esc(t("loading"))}</div></div>`;
  let d;
  try { d = await loadSyrve("paytype", `${rangeQuery(range)}&name=${encodeURIComponent(name)}`, fresh); }
  catch (e) { box.innerHTML = `<div class="notice bad">${esc(t("syrve_error"))}: ${esc(e.message)}</div>`; return; }
  if (S.livePay !== name) return; // another type was clicked meanwhile
  if (d.b2b) return renderB2B(box, view, d, range);

  const multiDay = range.from !== range.to;
  const withCustomer = d.orders.filter(o => o.customer);
  const showWb = /b2b/i.test(name) && withCustomer.length > 0; // waybills matter only for B2B sales
  const wbCell = o => {
    if (!o.customer) return "";
    if (d.waybillError) return `<span class="muted small">—</span>`;
    if (!o.waybill) return `<span class="pill bad">✗ ${esc(t("wb_missing"))}</span>`;
    const diff = Math.abs(o.waybill.amount - o.sum) > 1;
    return `<span class="pill ${diff ? "warn" : "good"}">✓ № ${esc(o.waybill.number)}</span>
      <div class="muted small">${money(o.waybill.amount)}${diff ? " · " + esc(t("wb_diff")) : ""}</div>`;
  };
  const itemsLine = o => {
    if (!o.items.length) return "";
    const shown = o.items.slice(0, 8).map(i => `${esc(i.name)} × ${i.qty % 1 ? i.qty.toFixed(2) : i.qty} <span class="muted">(${money(i.sum)})</span>`).join(" · ");
    return `<div class="items-line small">${shown}${o.items.length > 8 ? " · " + esc(t("more_items").replace("{n}", o.items.length - 8)) : ""}</div>`;
  };

  // per customer: what each buyer took in total
  let customersHtml = "";
  if (withCustomer.length) {
    const by = new Map();
    for (const o of withCustomer) {
      const c = by.get(o.customer) || { name: o.customer, orders: 0, sum: 0, wb: 0, items: new Map() };
      c.orders++; c.sum += o.sum; if (o.waybill) c.wb++;
      for (const i of o.items) { const x = c.items.get(i.name) || { qty: 0, sum: 0 }; x.qty += i.qty; x.sum += i.sum; c.items.set(i.name, x); }
      by.set(o.customer, c);
    }
    customersHtml = `<div class="panel-body"><h4 class="sub-h">${esc(t("by_customer"))}</h4><div class="table-wrap"><table>
      <thead><tr><th>${esc(t("customer"))}</th><th>${esc(t("products"))}</th><th class="r">${esc(t("orders"))}</th><th class="r">${esc(t("amount"))}</th>${showWb ? `<th>${esc(t("waybill"))}</th>` : ""}</tr></thead>
      <tbody>${[...by.values()].sort((a, b) => b.sum - a.sum).map(c => `<tr><td><b>${esc(c.name)}</b></td>
        <td class="small">${[...c.items].sort((a, b) => b[1].sum - a[1].sum).map(([nm, x]) => `${esc(nm)} × ${Math.round(x.qty * 100) / 100}`).join(" · ") || "—"}</td>
        <td class="r num">${c.orders}</td><td class="r num nowrap"><b>${money(c.sum)}</b></td>
        ${showWb ? `<td class="nowrap"><span class="pill ${d.waybillError ? "neutral" : c.wb === c.orders ? "good" : "bad"}">${esc(t("wb_of").replace("{a}", c.wb).replace("{b}", c.orders))}</span></td>` : ""}</tr>`).join("")}</tbody>
    </table></div></div>`;
  }

  box.innerHTML = `<div class="panel pay-detail">
    <div class="panel-head"><h3>${esc(payName(name))} · ${esc(rangeLabel(range))}</h3>
      <div class="actions"><span class="num"><b>${money(d.total)}</b> · ${d.orders.length} ${esc(t("orders").toLowerCase())}</span>
      <button class="btn small" id="payExport">${esc(t("export"))}</button><button class="btn small ghost" id="payClose">✕ ${esc(t("close"))}</button></div></div>
    ${d.waybillError ? `<div class="notice bad" style="margin:12px 16px 0">rs.ge: ${esc(d.waybillError)}</div>` : ""}
    ${d.itemsError ? `<div class="notice" style="margin:12px 16px 0">${esc(d.itemsError)}</div>` : ""}
    ${customersHtml}
    <div class="table-wrap"><table class="pay-orders">
      <thead><tr><th>${esc(multiDay ? t("date") : t("time"))}</th><th>${esc(t("order_no"))}</th><th>${esc(t("customer"))} / ${esc(t("products"))}</th><th>${esc(t("cashier"))}</th><th class="r">${esc(t("amount"))}</th>${showWb ? `<th>${esc(t("waybill"))}</th>` : ""}</tr></thead>
      <tbody>${d.orders.length ? d.orders.map(o => `<tr>
        <td class="nowrap num">${multiDay ? esc(dm(o.day)) + " " : ""}${esc(o.time)}</td><td class="num">${esc(o.num)}</td>
        <td>${o.customer ? `<b>${esc(o.customer)}</b>` : ""}${itemsLine(o)}</td>
        <td class="small">${esc(o.cashier)}</td><td class="r num nowrap"><b>${money(o.sum)}</b></td>
        ${showWb ? `<td class="nowrap">${wbCell(o)}</td>` : ""}</tr>`).join("")
      : `<tr><td colspan="6" class="empty">${esc(t("no_orders"))}</td></tr>`}</tbody>
    </table></div></div>`;
  $("#payClose", box).addEventListener("click", () => { S.livePay = null; $$(".pay-row", view).forEach(x => x.classList.remove("on")); box.innerHTML = ""; });
  $("#payExport", box).addEventListener("click", () => {
    const out = [[t("date"), t("time"), t("order_no"), t("customer"), t("cashier"), t("amount"), t("products"), t("waybill")]];
    d.orders.forEach(o => out.push([o.day, o.time, o.num, o.customer, o.cashier, o.sum,
      o.items.map(i => `${i.name} × ${i.qty}`).join("; "), !showWb ? "" : o.waybill ? o.waybill.number : o.customer && !d.waybillError ? t("wb_missing") : ""]));
    if (!showWb) out.forEach(row => row.pop());
    exportXlsx(`${name}-${range.from}_${range.to}.xlsx`, String(name).slice(0, 30), out);
  });
}

// ====================== 4. MONTHLY INCOME ======================
async function renderMonthly(view, demo) {
  view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const [r, fx, vr] = await Promise.all([loadSyrve("monthly"), loadData("fixed"), loadData("variable")]);
  const fixedTotal = fx.categories.reduce((a, c) => a + n(c.amount), 0);
  const rows = r.months.map(m => ({ ...m, ...monthProfit(m, fixedTotal, vr) }));
  const cur = rows[rows.length - 1] || { income: 0, profit: 0 };
  const prev = rows[rows.length - 2] || { income: 0 };
  const change = prev.income ? Math.round((cur.income - prev.income) / prev.income * 100) : null;

  view.innerHTML = demo + head(t("tab_monthly"), t("monthly_sub"), `<button class="btn" id="moExport">${esc(t("export"))}</button>`) +
    `<div class="cards">
      ${card(t("this_month"), money(cur.income), cur.month ? esc(monthLabel(cur.month)) : "", "hero")}
      ${card(t("last_month"), money(prev.income), prev.month ? esc(monthLabel(prev.month)) + (change !== null ? ` · ${change >= 0 ? "+" : "−"}${Math.abs(change)}%` : "") : "")}
      ${card(t("profit_this_month"), money(cur.profit), "", cur.profit >= 0 ? "good" : "bad")}
    </div>
    <div class="panel"><div class="panel-head"><h3>${esc(t("income_by_month"))}</h3></div><div class="panel-body">
      ${barChart(rows.map(m => ({ label: monthLabel(m.month, true), value: m.income, tip: `${monthLabel(m.month)}: ${money(m.income)}` })), { height: 240, width: panelWidth(false) })}
    </div></div>
    <div class="panel"><div class="table-wrap"><table class="edit">
      <thead><tr><th>${esc(t("month"))}</th><th class="r">${esc(t("income"))}</th><th class="r">${esc(t("cash"))}</th><th class="r">${esc(t("card"))}</th><th class="r">${esc(t("food_cost"))}</th><th class="r">${esc(t("fixed"))}</th><th class="r">${esc(t("variable"))}</th><th class="r">${esc(t("profit"))}</th></tr></thead>
      <tbody>${rows.slice().reverse().map(m => `<tr>
        <td>${esc(monthLabel(m.month))}</td><td class="r num"><b>${money(m.income)}</b></td><td class="r num">${money(m.cash)}</td><td class="r num">${money(m.card)}</td>
        <td class="r num">${money(m.food)}</td><td class="r num">${money(m.fixed)}</td><td class="r num">${money(m.variable)}</td>
        <td class="r num"><b style="color:var(${m.profit >= 0 ? "--good" : "--bad"})">${money(m.profit)}</b></td></tr>`).join("")}</tbody>
    </table></div></div>
    ${r.costError ? `<p class="notice">${esc(t("cost_fallback"))}</p>` : ""}
    <p class="muted small">${esc(t("monthly_note"))}</p>`;
  wireChartHover(view);
  $("#moExport", view).addEventListener("click", () => {
    const out = [[t("month"), t("income"), t("cash"), t("card"), t("food_cost"), t("fixed"), t("variable"), t("profit")]];
    rows.forEach(m => out.push([monthLabel(m.month), m.income, m.cash, m.card, m.food, m.fixed, m.variable, m.profit]));
    exportXlsx(`monthly-income.xlsx`, t("tab_monthly"), out);
  });
}

// ====================== MENU ======================
// What sold (ranked), price, recipe cost from Syrve and margin without VAT.
// Clicking a dish opens its recipe: a tree (semi-finished products can be opened) or a flat list
// of raw ingredients, plus a chart of when it sold.
const m2 = v => (n(v) > 0 && n(v) < 0.1 ? n(v).toFixed(3) : n(v).toFixed(2)) + " " + CURRENCY; // 0.005 ₾ of salt isn't "0.00"
const qtyFmt = v => String(Math.round(n(v) * 1000) / 1000);
const marginCls = m => (m === null ? "neutral" : m >= 65 ? "good" : m >= 50 ? "warn" : "bad");

async function renderMenu(view, demo, fresh = false) {
  const range = rangeOf("menu");
  const q = rangeQuery(range);
  if (!S.syrve["menu" + q]) view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const r = await loadSyrve("menu", q, fresh);
  const M = S.menu || (S.menu = { q: "", group: "", sort: "sold", soldOnly: false, open: null, view: "tree", closed: new Set() });

  const groups = [...new Set(r.dishes.map(d => d.group).filter(Boolean))].sort();
  const query = M.q.toLowerCase();
  const list = r.dishes
    .filter(d => (!query || d.name.toLowerCase().includes(query)) && (!M.group || d.group === M.group) && (!M.soldOnly || d.sold > 0))
    .sort(M.sort === "revenue" ? (a, b) => b.revenue - a.revenue : M.sort === "margin" ? (a, b) => (b.margin ?? -1e9) - (a.margin ?? -1e9) : () => 0);
  const withMargin = r.dishes.filter(d => d.margin !== null && d.revenue > 0);
  const revM = withMargin.reduce((a, d) => a + d.revenue, 0);
  const avgMargin = revM ? withMargin.reduce((a, d) => a + d.margin * d.revenue, 0) / revM : null;
  const best = r.dishes.find(d => d.rank === 1);

  view.innerHTML = demo + head(t("tab_menu"), t("menu_sub"),
    `<div class="range-pick"><button class="btn range-btn" id="rangeBtn" type="button">📅 ${esc(rangeLabel(range))}</button><div class="rc-pop panel" id="calPop" hidden></div></div>
     <button class="btn" id="menuRefresh">${esc(t("refresh"))}</button><button class="btn" id="menuExport">${esc(t("export"))}</button>`) +
    (r.recipesError ? `<div class="notice bad">${esc(t("recipes_err"))}: ${esc(r.recipesError)}</div>` : "") +
    (r.costError ? `<div class="notice bad">${esc(t("cost_err"))}: ${esc(r.costError)}</div>` : "") +
    `<div class="cards">
      ${card(t("items_sold"), qtyFmt(r.totals.sold), esc(rangeLabel(range)), "hero")}
      ${card(t("revenue"), money(r.totals.revenue))}
      ${card(t("avg_margin"), avgMargin === null ? "—" : avgMargin.toFixed(1) + "%", esc(t("margin_novat")))}
      ${card(t("best_seller"), best ? esc(best.name) : "—", best ? `${qtyFmt(best.sold)} · ${money(best.revenue)}` : "")}
    </div>
    <div class="panel"><div class="form-row menu-filters">
      <input type="text" id="menuSearch" placeholder="${esc(t("search"))}…" value="${esc(M.q)}">
      <select id="menuGroup"><option value="">${esc(t("all_groups"))}</option>${groups.map(g => `<option ${g === M.group ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>
      <select id="menuSort">${[["sold", "sort_sold"], ["revenue", "sort_revenue"], ["margin", "sort_margin"]].map(([v, k]) => `<option value="${v}" ${v === M.sort ? "selected" : ""}>${esc(t(k))}</option>`).join("")}</select>
      <label class="inline"><input type="checkbox" id="menuSold" ${M.soldOnly ? "checked" : ""}> ${esc(t("only_sold"))}</label>
    </div>
    <div class="table-wrap"><table class="menu-table">
      <thead><tr><th class="r">#</th><th>${esc(t("dish"))}</th><th class="r">${esc(t("sold"))}</th><th class="r">${esc(t("revenue"))}</th><th class="r">${esc(t("price"))}</th><th class="r">${esc(t("cost_short"))}</th><th class="r">${esc(t("margin"))}</th><th class="r">${esc(t("food_cost_pct"))}</th></tr></thead>
      <tbody>${list.length ? list.map(d => `<tr class="dish-row ${M.open === d.id ? "open" : ""}" data-id="${esc(d.id)}">
        <td class="r num muted">${d.rank ?? ""}</td>
        <td><b>${esc(d.name)}</b>${d.group ? ` <span class="tag">${esc(d.group)}</span>` : ""}${!d.hasRecipe && d.type === "DISH" ? ` <span class="pill warn">${esc(t("no_recipe"))}</span>` : ""}</td>
        <td class="r num"><b>${qtyFmt(d.sold)}</b></td><td class="r num">${money(d.revenue)}</td>
        <td class="r num">${d.price ? m2(d.price) : "—"}</td><td class="r num">${d.cost !== null ? m2(d.cost) + (d.costPartial ? " ⚠" : "") : "—"}</td>
        <td class="r"><span class="pill ${marginCls(d.margin)}">${d.margin !== null ? d.margin.toFixed(1) + "%" : "—"}</span></td>
        <td class="r num">${d.foodCostPct !== null ? d.foodCostPct.toFixed(1) + "%" : "—"}</td></tr>
        ${M.open === d.id ? `<tr class="dish-detail-row"><td colspan="8"><div id="dishDetail" class="dish-detail"><div class="loading">${esc(t("loading"))}</div></div></td></tr>` : ""}`).join("")
      : `<tr><td colspan="8" class="empty">${esc(t("no_dishes"))}</td></tr>`}</tbody>
    </table></div></div>`;

  wireCalendar(view, "menu", () => { M.open = null; renderMenu(view, demo).catch(e => toast(e.message)); });
  $("#menuRefresh", view).addEventListener("click", () => renderMenu(view, demo, true).catch(e => toast(e.message)));
  const rerender = () => renderMenu(view, demo).catch(e => toast(e.message));
  const sEl = $("#menuSearch", view);
  sEl.addEventListener("input", () => { M.q = sEl.value; rerender().then(() => { const x = $("#menuSearch"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }); });
  $("#menuGroup", view).addEventListener("change", e => { M.group = e.target.value; rerender(); });
  $("#menuSort", view).addEventListener("change", e => { M.sort = e.target.value; rerender(); });
  $("#menuSold", view).addEventListener("change", e => { M.soldOnly = e.target.checked; rerender(); });
  $$(".dish-row", view).forEach(tr => tr.addEventListener("click", () => { M.open = M.open === tr.dataset.id ? null : tr.dataset.id; M.closed = new Set(); rerender(); }));
  $("#menuExport", view).addEventListener("click", () => {
    const out = [["#", t("dish"), t("sold"), t("revenue"), t("price"), t("cost_short"), t("margin") + " %", t("food_cost_pct") + " %"]];
    list.forEach(d => out.push([d.rank ?? "", d.name, d.sold, d.revenue, d.price ?? "", d.cost ?? "", d.margin ?? "", d.foodCostPct ?? ""]));
    exportXlsx(`menu-${range.from}_${range.to}.xlsx`, t("tab_menu"), out);
  });
  if (M.open) renderDishDetail(view, M.open, range, fresh);
}

async function renderDishDetail(view, id, range, fresh) {
  const box = $("#dishDetail", view);
  if (!box) return;
  let d;
  try { d = await loadSyrve("menu/dish", `${rangeQuery(range)}&id=${encodeURIComponent(id)}`, fresh); }
  catch (e) { box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; return; }
  const M = S.menu;
  if (M.open !== id) return;
  const unitOf = u => (u ? "/" + esc(u) : "");
  const anyMissing = d.tree.missing || d.flat.some(x => x.missing);

  const treeRows = (nodes, level, parent) => nodes.map((x, i) => {
    const key = parent + "/" + i, open = !M.closed.has(key);
    return `<tr class="${x.semi ? "semi" : level ? "child" : ""}">
      <td style="padding-left:${12 + level * 22}px">${x.semi ? `<button type="button" class="tw" data-toggle="${key}">${open ? "▾" : "▸"}</button>` : `<span class="tw"></span>`}${esc(x.name)}${x.semi ? ` <span class="tag">${esc(t("semi"))}</span>` : ""}</td>
      <td class="r num">${qtyFmt(x.qty)} ${esc(x.unit)}</td>
      <td class="r num">${x.unitCost !== null ? m2(x.unitCost) + unitOf(x.unit) : "—"}</td>
      <td class="r num">${x.cost !== null ? m2(x.cost) : `<span class="bad-text">—</span>`}</td></tr>` + (x.semi && open ? treeRows(x.children, level + 1, key) : "");
  }).join("");
  const total = n(d.tree.cost);
  const treeHtml = () => `<table class="rcp"><thead><tr><th>${esc(t("ingredient"))}</th><th class="r">${esc(t("qty"))}</th><th class="r">${esc(t("unit_price"))}</th><th class="r">${esc(t("value"))}</th></tr></thead>
    <tbody>${treeRows(d.tree.children, 0, "")}</tbody><tfoot><tr><td colspan="3">${esc(t("total_cost"))}</td><td class="r num">${m2(total)}</td></tr></tfoot></table>
    <div class="rcp-note">${esc(t("tree_note"))}</div>`;
  const flatHtml = () => `<table class="rcp"><thead><tr><th>${esc(t("raw"))}</th><th class="r">${esc(t("qty"))}</th><th class="r">${esc(t("unit_price"))}</th><th class="r">${esc(t("value"))}</th><th>${esc(t("share"))}</th></tr></thead>
    <tbody>${d.flat.map(x => { const pct = total ? Math.round(n(x.cost) / total * 100) : 0; return `<tr><td>${esc(x.name)}</td><td class="r num">${qtyFmt(x.qty)} ${esc(x.unit)}</td>
      <td class="r num">${x.unitCost !== null ? m2(x.unitCost) + unitOf(x.unit) : "—"}</td><td class="r num">${x.missing ? `<span class="bad-text">—</span>` : m2(x.cost)}</td>
      <td><span class="share"><i style="width:${pct}%"></i></span><span class="muted small">${pct}%</span></td></tr>`; }).join("")}</tbody>
    <tfoot><tr><td colspan="3">${esc(t("total_cost"))}</td><td class="r num">${m2(total)}</td><td></td></tr></tfoot></table>
    <div class="rcp-note">${esc(t("flat_note"))}</div>`;

  const s = d.sales || {};
  const chart = (range.from === range.to ? (s.byHour || []).map(h => ({ label: pad(h.hour) + ":00", value: h.qty, tip: `${pad(h.hour)}:00 — ${qtyFmt(h.qty)} · ${money(h.revenue)}` }))
    : (() => { const pts = []; for (let day = range.from; day <= range.to; day = shiftDay(day, 1)) { const x = (s.byDay || []).find(v => v.day === day) || { qty: 0, revenue: 0 }; pts.push({ label: dm(day), value: x.qty, tip: `${dmy(day)} — ${qtyFmt(x.qty)} · ${money(x.revenue)}` }); } return pts; })());

  const draw = () => {
    box.innerHTML = `<div class="dish-head"><div><h3>${esc(d.name)}</h3>
        <div class="muted small">${esc(t("one_unit"))}${d.unit ? " (" + esc(d.unit) + ")" : ""} · ${esc(t("sold"))}: <b>${qtyFmt(d.sold)}</b>${d.rank ? ` · ${esc(t("rank"))} #${d.rank}` : ""}</div>
        <div class="seg">${["tree", "flat"].map(v => `<button type="button" data-view="${v}" class="${M.view === v ? "on" : ""}">${esc(t("recipe_" + v))}</button>`).join("")}</div></div>
      <div class="dish-kpis"><div><b>${d.price ? m2(d.price) : "—"}</b><span>${esc(t("price_vat"))}</span></div><div><b>${d.cost !== null ? m2(d.cost) : "—"}</b><span>${esc(t("cost_short"))}</span></div>
        <div><b class="${marginCls(d.margin)}-text">${d.margin !== null ? d.margin.toFixed(1) + "%" : "—"}</b><span>${esc(t("margin_novat"))}</span></div><div><b>${d.foodCostPct !== null ? d.foodCostPct.toFixed(1) + "%" : "—"}</b><span>${esc(t("food_cost_pct"))}</span></div></div></div>
      ${anyMissing ? `<div class="notice">${esc(t("missing_price"))}</div>` : ""}
      ${d.tree.children.length ? (M.view === "flat" ? flatHtml() : treeHtml()) : `<div class="empty">${esc(t("no_recipe"))}</div>`}
      <div class="dish-sales"><h4>${esc(t("sold_when"))} · ${esc(rangeLabel(range))}</h4>
        ${s.error ? `<div class="notice bad">${esc(s.error)}</div>` : chart.some(p => p.value) ? barChart(chart, { height: 170, width: Math.max(320, box.clientWidth - 32) }) : `<div class="empty">${esc(t("no_entries"))}</div>`}</div>`;
    wireChartHover(box);
    $$("[data-view]", box).forEach(b => b.addEventListener("click", e => { e.stopPropagation(); M.view = b.dataset.view; draw(); }));
    $$("[data-toggle]", box).forEach(b => b.addEventListener("click", e => { e.stopPropagation(); const k = b.dataset.toggle; if (M.closed.has(k)) M.closed.delete(k); else M.closed.add(k); draw(); }));
  };
  draw();
}

// ====================== 5. DEBTS ======================
// Debt per supplier = Syrve invoices − payments from BOG / TBC matched by tax ID.
// Payments the app can't match safely wait in "To review" until the CEO assigns them.
async function renderDebts(view, demo, fresh = false, quiet = false) {
  if (!S.syrve.debts && !quiet) view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const r = await loadSyrve("debts", "", fresh);
  const q = S.debtQuery.toLowerCase();
  const list = r.suppliers.filter(s => !q || String(s.name).toLowerCase().includes(q) || String(s.tin || "").includes(q));
  const owing = r.suppliers.filter(s => s.owed > 0);
  const bank = r.bank || { configured: {} };
  const connected = bank.configured.bog || bank.configured.tbc;
  const rev = r.review || { count: 0, amount: 0, items: [] };
  const optionName = id => (r.options || []).find(o => o.id === id)?.name || "";
  const lastSync = bank.lastSyncAt ? new Date(bank.lastSyncAt) : null;

  // notices about the bank connection
  let notices = "";
  if (!connected) notices += `<div class="notice">🏦 <b>${esc(t("bank_not_connected"))}.</b> ${esc(t("bank_secrets_hint"))}</div>`;
  else if (!bank.settings.historyFrom) notices += `<div class="notice">🏦 ${esc(t("need_start"))}</div>`;
  for (const [src, msg] of Object.entries(bank.errors || {})) {
    const [code, status, detail] = String(msg).split("|");
    const known = ["tbc_test_keys", "tbc_unknown_id", "tbc_bad_keys", "tbc_down"].includes(code);
    notices += known
      ? `<div class="notice bad"><b>TBC:</b> ${esc(t("err_" + code))}${detail ? `<div class="muted small">TBC: ${esc(status)} ${esc(detail)}</div>` : ""}</div>`
      : `<div class="notice bad">${esc(src.toUpperCase())}: ${esc(msg)}</div>`;
  }
  if ((bank.notes || {}).tbc === "tbc_swapped") notices += `<div class="notice">TBC: ${esc(t("note_tbc_swapped"))}</div>`;
  notices += `<div id="bankProgress"></div>`;

  const supplierSelect = (sel, attrs) => `<select ${attrs}><option value="">${esc(t("choose_supplier"))}</option>${(r.options || []).map(o => `<option value="${esc(o.id)}" ${o.id === sel ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select>`;

  const reviewHtml = rev.count ? `<div class="panel">
      <div class="panel-head"><h3>⚠ ${esc(t("to_review"))} · ${rev.count}</h3><span class="muted small">${esc(t("review_sub"))}</span></div>
      <div class="table-wrap"><table class="edit review">
        <thead><tr><th>${esc(t("recipient"))}</th><th class="r">${esc(t("payments_col"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("why"))}</th><th>${esc(t("supplier"))}</th><th></th></tr></thead>
        <tbody>${rev.items.map(x => `<tr data-rk="${esc(x.rk)}" data-tin="${esc(x.tin)}" data-iban="${esc(x.iban || "")}" data-name="${esc(x.name || x.tin || x.iban || "")}" data-count="${x.count}">
          <td><b>${esc(x.name || "—")}</b><div class="muted small">${x.tin ? esc(t("tax_id")) + " " + esc(x.tin) : esc(x.iban || "")}${x.rsName ? " · rs.ge: " + esc(x.rsName) : ""}</div>
            <div class="muted small clip" title="${esc(x.purpose)}">${esc(x.bank)} · ${esc(t("last"))} ${esc(x.last)} · ${esc(x.purpose)}</div></td>
          <td class="r num">${x.count}</td>
          <td class="r num nowrap"><b>${money(x.amount)}</b></td>
          <td><span class="pill ${["name_differs", "name_only", "tin_differs"].includes(x.reason) ? "warn" : "neutral"}">${esc(t("why_" + x.reason))}</span></td>
          <td>${supplierSelect(x.suggestion, 'class="rv-sup"')}</td>
          <td class="r nowrap rv-actions"><button class="btn small primary rv-ok">${esc(t("confirm"))}</button>
            <button class="btn small rv-ignore">${esc(t("not_supplier"))}</button></td>
        </tr>`).join("")}</tbody>
      </table></div>
      ${rev.count > rev.items.length ? `<div class="muted small" style="padding:10px 16px">${esc(t("showing_of").replace("{a}", rev.items.length).replace("{b}", rev.count))}</div>` : ""}
    </div>` : "";

  const settingsHtml = `<details class="panel bank-settings" ${connected && !bank.settings.historyFrom ? "open" : ""}>
      <summary class="panel-head"><h3>🏦 ${esc(t("bank_settings"))}</h3><span class="muted small">${connected ? `${bank.payments} ${esc(t("payments_loaded"))} · ${bank.matched} ${esc(t("matched"))} · ${bank.ignored} ${esc(t("ignored"))}` : esc(t("bank_not_connected"))}</span></summary>
      <form class="form-row" id="bankForm">
        <label class="w-s">${esc(t("history_from"))}<input type="date" name="historyFrom" value="${esc(bank.settings?.historyFrom || "")}"></label>
        <label class="w-l">${esc(t("bog_accounts"))}<textarea name="bogAccounts" rows="2" placeholder="GE00BG0000000000000000">${esc((bank.settings?.bogAccounts || []).join("\n"))}</textarea></label>
        <button class="btn primary" type="submit">${esc(t("save"))}</button>
      </form>
      <div class="panel-body small muted">
        <div>BOG: ${bank.configured.bog ? "✓" : "—"} · TBC: ${bank.configured.tbc ? "✓ " + esc(t("tbc_auto")) : "—"}</div>
        <div>${esc(t("history_note"))}</div>
        ${(bank.linkedTins || []).length ? `<div style="margin-top:10px"><b>${esc(t("linked"))}</b></div>
          ${bank.linkedTins.map(l => `<div class="linked">${esc(l.tin)} → ${l.to === "ignore" ? esc(t("not_supplier")) : esc(l.name)} <button class="icon-btn unlink" data-kind="${esc(l.kind || "tin")}" data-tin="${esc(l.tin)}" title="${esc(t("delete"))}">✕</button></div>`).join("")}` : ""}
      </div>
    </details>`;

  view.innerHTML = demo + head(t("tab_debts"), t("debts_sub"),
    `<input type="text" id="debtSearch" placeholder="${esc(t("search"))}…" value="${esc(S.debtQuery)}"><button class="btn" id="debtRefresh">${esc(t("refresh"))}</button><button class="btn" id="debtExport">${esc(t("export"))}</button>`) +
    notices +
    `<div class="cards">
      ${card(t("total_owed"), money(r.total), "", r.total > 0 ? "hero bad" : "hero")}
      ${card(t("suppliers"), String(owing.length))}
      ${card(t("to_review"), String(rev.count), rev.count ? `${rev.payments || rev.count} ${esc(t("payments_col").toLowerCase())} · ${money(rev.amount)}` : "", rev.count ? "bad" : "")}
      ${card(t("bank"), connected ? "✓" : "—", lastSync ? `${esc(t("last_sync"))} ${pad(lastSync.getHours())}:${pad(lastSync.getMinutes())}` : esc(t("bank_not_connected")))}
    </div>
    ${reviewHtml}
    <div class="panel"><div class="table-wrap"><table>
      <thead><tr><th>${esc(t("supplier"))}</th><th>${esc(t("tax_id"))}</th><th class="r">${esc(t("invoices"))}</th><th class="r">${esc(t("paid_bank"))}</th><th class="r">${esc(t("owed"))}</th></tr></thead>
      <tbody>${list.length ? list.map(s => `<tr><td>${esc(s.name)}</td><td class="muted num">${esc(s.tin || "")}</td>
        <td class="r num">${money(s.invoices ?? s.owed)}</td><td class="r num">${s.paid ? money(s.paid) : "—"}</td>
        <td class="r num">${s.owed >= 0 ? `<b>${money(s.owed)}</b>` : `<span class="pill neutral">${esc(t("prepaid"))}</span> ${money(-s.owed)}`}</td></tr>`).join("")
        : `<tr><td colspan="5" class="empty">${esc(t("no_debts"))}</td></tr>`}</tbody>
      ${list.length ? `<tfoot><tr><td colspan="4">${esc(t("total_owed"))}</td><td class="r num">${money(r.total)}</td></tr></tfoot>` : ""}
    </table></div></div>
    ${settingsHtml}`;

  // search / refresh / export
  const sEl = $("#debtSearch", view);
  sEl.addEventListener("input", () => { S.debtQuery = sEl.value; renderDebts(view, demo).then(() => { const x = $("#debtSearch"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }); });
  $("#debtRefresh", view).addEventListener("click", () => renderDebts(view, demo, true).catch(e => toast(e.message)));
  $("#debtExport", view).addEventListener("click", () => {
    const out = [[t("supplier"), t("tax_id"), t("invoices"), t("paid_bank"), t("owed")]];
    r.suppliers.forEach(x => out.push([x.name, x.tin || "", x.invoices ?? x.owed, x.paid || 0, x.owed]));
    out.push([t("total_owed"), "", "", "", r.total]);
    exportXlsx(`debts-${todayISO()}.xlsx`, t("tab_debts"), out);
  });

  const reload = async () => { S.syrve.debts = null; await renderDebts(view, demo, false, true); };

  // review actions
  // after Confirm / Not a supplier the row asks: remember for this recipient's future payments too, or only these?
  $$("tr[data-rk]", view).forEach(tr => {
    const cell = $(".rv-actions", tr);
    const original = cell.innerHTML;
    const save = async body => {
      try { await api("/bank/review", { method: "POST", body }); toast(t("saved")); await reload(); }
      catch (e) { toast(e.message); }
    };
    const ask = supplierId => {
      const { tin, iban, name, rk, count } = tr.dataset;
      const always = tin ? { scope: "tin", tin, supplierId } : iban ? { scope: "iban", iban, supplierId } : null;
      const once = { scope: "once", rk, supplierId };
      if (!always) return save(once);
      cell.innerHTML = `<div class="remember"><div class="q">${esc(t("remember_q").replace("{name}", name))}</div>
        <button class="btn small primary rm-yes">${esc(t("remember_yes"))}</button>
        <button class="btn small rm-once">${esc(t("remember_these").replace("{n}", count))}</button>
        <button class="btn small ghost rm-cancel">✕</button></div>`;
      $(".rm-yes", cell).addEventListener("click", () => save(always));
      $(".rm-once", cell).addEventListener("click", () => save(once));
      $(".rm-cancel", cell).addEventListener("click", () => { cell.innerHTML = original; wire(); });
    };
    const wire = () => {
      $(".rv-ok", cell).addEventListener("click", () => {
        const v = $(".rv-sup", tr).value;
        if (!v) { toast(t("choose_supplier")); return; }
        ask(v);
      });
      $(".rv-ignore", cell).addEventListener("click", () => ask("ignore"));
    };
    wire();
  });
  $$(".unlink", view).forEach(b => b.addEventListener("click", async () => {
    const body = b.dataset.kind === "iban" ? { scope: "iban", iban: b.dataset.tin, supplierId: null } : { scope: "tin", tin: b.dataset.tin, supplierId: null };
    try { await api("/bank/review", { method: "POST", body }); await reload(); } catch (e) { toast(e.message); }
  }));

  // bank settings
  $("#bankForm", view).addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    try {
      await api("/bank/settings", { method: "PUT", body: { historyFrom: f.get("historyFrom"), bogAccounts: String(f.get("bogAccounts") || "") } });
      toast(t("saved")); await reload();
    } catch (e) { toast(e.message); }
  });

  // first time / new start date: load the bank history in steps, then recalculate
  const behind = connected && bank.settings.historyFrom && !Object.keys(bank.errors || {}).length && (() => {
    const need = [...(bank.configured.tbc ? ["tbc"] : []), ...(bank.configured.bog ? (bank.settings.bogAccounts || []).map(i => "bog:" + i) : [])];
    const recent = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    return need.some(k => !(bank.cursors || {})[k] || bank.cursors[k] < recent);
  })();
  // The server syncs the bank every 15 minutes. The page only helps when that is clearly behind
  // (first load of a history, or no sync for 30 minutes) — and at most once every 10 minutes.
  const stale = connected && bank.settings.historyFrom && (!bank.lastSyncAt || Date.now() - Date.parse(bank.lastSyncAt) > 30 * 60 * 1000);
  const recentlyTried = S.bankAutoAt && Date.now() - S.bankAutoAt < 10 * 60 * 1000;
  if ((behind || stale) && !S.bankSyncing && !recentlyTried && !DEMO) { S.bankAutoAt = Date.now(); loadBankHistory(view, demo); }
}

async function loadBankHistory(view, demo) {
  S.bankSyncing = true;
  const show = msg => { const el = $("#bankProgress"); if (el) el.innerHTML = `<div class="notice">⏳ ${esc(msg)}</div>`; };
  try {
    for (let i = 0; i < 200; i++) {
      const r = await api("/bank/sync", { method: "POST", body: {} });
      const at = (r.behind || []).map(b => `${b.source.replace("bog:", "BOG ")} → ${b.at || ""}`).join(" · ");
      show(`${t("loading_history")} ${at}`);
      if (r.done) break;
    }
  } catch (e) { toast(e.message); }
  S.bankSyncing = false;
  S.syrve.debts = null;
  // refresh in place — the page stays visible instead of flashing "loading…"
  if (S.tab === "debts") renderDebts(view, demo, false, true).catch(() => {});
}

// ====================== 6. RATINGS ======================
async function renderRatings(view, demo) {
  const d = await loadData("ratings");
  const sorted = d.entries.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const stars = v => { const full = Math.round(n(v)); return "★".repeat(Math.max(0, Math.min(5, full))) + "☆".repeat(5 - Math.max(0, Math.min(5, full))); };
  const platName = p => t(p);

  const cards = PLATFORMS.filter(p => p !== "other" || sorted.some(e => e.platform === "other")).map(p => {
    const es = sorted.filter(e => e.platform === p);
    if (!es.length) return card(platName(p), t("none"), esc(t("no_rating")));
    const [last, prev] = es;
    let delta = "";
    if (prev) {
      const dv = Math.round((n(last.rating) - n(prev.rating)) * 100) / 100;
      if (dv !== 0) delta = ` <span class="delta ${dv > 0 ? "up" : "down"}">${dv > 0 ? "▲" : "▼"} ${Math.abs(dv)}</span>`;
    }
    return card(platName(p), `${n(last.rating).toFixed(1)}${delta}`,
      `<span class="stars">${stars(last.rating)}</span> · ${last.reviews ? esc(last.reviews) + " " + esc(t("reviews").toLowerCase()) + " · " : ""}${esc(last.date)}`);
  }).join("");

  const platSelect = `<select name="platform">${PLATFORMS.map(p => `<option value="${p}">${esc(platName(p))}</option>`).join("")}</select>`;
  view.innerHTML = demo + head(t("tab_ratings"), t("ratings_sub"), `<button class="btn" id="rtExport">${esc(t("export"))}</button>`) +
    `<div class="cards">${cards}</div>
    <div class="panel">
      <div class="panel-head"><h3>${esc(t("history"))}</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>${esc(t("date"))}</th><th>${esc(t("platform"))}</th><th class="r">${esc(t("rating"))}</th><th class="r">${esc(t("reviews"))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
        <tbody>${sorted.length ? sorted.map(e => `<tr><td>${esc(e.date)}</td><td>${esc(platName(e.platform))}</td>
          <td class="r num"><b>${n(e.rating).toFixed(1)}</b> <span class="stars">${stars(e.rating)}</span></td>
          <td class="r num">${esc(e.reviews || "")}</td><td>${esc(e.comment || "")}</td>
          <td class="r"><button class="icon-btn" data-act="del" data-id="${e.id}" title="${esc(t("delete"))}">✕</button></td></tr>`).join("")
          : `<tr><td colspan="6" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
      </table></div>
      <form class="form-row" id="rtAdd">
        <label class="w-s">${esc(t("date"))}<input type="date" name="date" value="${todayISO()}" required></label>
        <label class="w-s">${esc(t("platform"))}${platSelect}</label>
        <label class="w-s">${esc(t("rating"))}<input type="number" name="rating" min="0" max="5" step="0.1" required></label>
        <label class="w-s">${esc(t("reviews"))}<input type="number" name="reviews" min="0" step="1"></label>
        <label class="w-l">${esc(t("comment"))}<input type="text" name="comment"></label>
        <button class="btn primary" type="submit">${esc(t("add"))}</button>
      </form>
    </div>`;

  $$("[data-act=del]", view).forEach(b => b.addEventListener("click", () => {
    if (!confirmDel()) return;
    d.entries = d.entries.filter(x => x.id !== b.dataset.id); saveData("ratings"); renderRatings(view, demo);
  }));
  $("#rtAdd", view).addEventListener("submit", ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    d.entries.push({ id: uid(), date: f.get("date"), platform: f.get("platform"), rating: n(f.get("rating")),
      reviews: f.get("reviews") ? n(f.get("reviews")) : "", comment: f.get("comment") || "" });
    saveData("ratings"); renderRatings(view, demo);
  });
  $("#rtExport", view).addEventListener("click", () => {
    const out = [[t("date"), t("platform"), t("rating"), t("reviews"), t("comment")]];
    sorted.forEach(e => out.push([e.date, platName(e.platform), n(e.rating), e.reviews || "", e.comment || ""]));
    exportXlsx(`ratings.xlsx`, t("tab_ratings"), out);
  });
}

// ====================== 7. EMPLOYEES ======================
async function renderEmployees(view, demo, fresh = false) {
  const ym = S.empMonth;
  view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const q = "?month=" + ym;
  const [r, rToday] = await Promise.all([
    loadSyrve("employees", q, fresh),
    ym === ymNow() ? null : loadSyrve("employees", "?month=" + ymNow(), fresh),
  ]);
  const tdata = rToday || r;
  const today = tdata.today || todayISO();
  const { html: todayHtml, count: todayCount } = whoWorksToday(tdata);
  const todayShifts = { length: todayCount };

  // calendar
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(y, m, 0).getDate();
  const byDay = {};
  r.shifts.forEach(s => { const k = (s.from || "").slice(0, 10); (byDay[k] = byDay[k] || []).push(s); });
  let cells = t("days").map(dn => `<div class="cal-head">${esc(dn)}</div>`).join("");
  for (let i = 0; i < lead; i++) cells += `<div class="cal-day out"></div>`;
  for (let dd = 1; dd <= daysIn; dd++) {
    const k = `${ym}-${pad(dd)}`;
    const list = (byDay[k] || []).sort((a, b) => (a.from || "").localeCompare(b.from || ""));
    const shown = list.slice(0, 4);
    cells += `<div class="cal-day ${k === today ? "today" : ""}"><div class="d">${dd}</div>
      ${shown.map(s => `<div class="who" title="${esc(s.name)} ${esc(hhmm(s.from))}–${esc(hhmm(s.to))}">${esc(hhmm(s.from))} ${esc(s.name)}</div>`).join("")}
      ${list.length > shown.length ? `<div class="more">+${list.length - shown.length}</div>` : ""}</div>`;
  }
  const trail = (7 - ((lead + daysIn) % 7)) % 7;
  for (let i = 0; i < trail; i++) cells += `<div class="cal-day out"></div>`;

  view.innerHTML = demo + head(t("tab_employees"), t("employees_sub"), `<button class="btn" id="empRefresh">${esc(t("refresh"))}</button>`) +
    `<div class="panel"><div class="panel-head"><h3>${esc(t("working_today"))} · ${esc(today)}</h3><span class="muted small">${todayShifts.length}</span></div>
      <div class="panel-body">${todayHtml}</div></div>
    <div class="panel"><div class="panel-head"><h3>${esc(t("calendar"))}</h3>
      <div class="actions"><button class="btn small" id="empPrev">${t("prev")}</button><b>${esc(monthLabel(ym))}</b><button class="btn small" id="empNext">${t("next")}</button></div></div>
      <div class="calendar">${cells}</div></div>`;

  $("#empPrev", view).addEventListener("click", () => { S.empMonth = ymShift(ym, -1); renderEmployees(view, demo); });
  $("#empNext", view).addEventListener("click", () => { S.empMonth = ymShift(ym, 1); renderEmployees(view, demo); });
  $("#empRefresh", view).addEventListener("click", () => renderEmployees(view, demo, true).catch(e => toast(e.message)));
}

// ====================== 8. TASKS ======================
async function renderTasks(view, demo) {
  const d = await loadData("tasks");
  const today = todayISO();
  // keep daily history small: drop done-marks older than 60 days
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  d.daily.forEach(x => { x.done = Object.fromEntries(Object.entries(x.done || {}).filter(([k]) => k >= cutoff)); });

  const doneToday = d.daily.filter(x => x.done && x.done[today]).length;
  const pct = d.daily.length ? Math.round(doneToday / d.daily.length * 100) : 0;
  const overall = d.overall.slice().sort((a, b) => (a.done - b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
  const openCount = d.overall.filter(x => !x.done).length;

  const dailyHtml = d.daily.length ? `<ul class="task-list">${d.daily.map(x => {
    const done = !!(x.done && x.done[today]);
    return `<li class="task ${done ? "done" : ""}"><input type="checkbox" data-kind="daily" data-id="${x.id}" ${done ? "checked" : ""}>
      <span class="title">${esc(x.title)}</span><span class="meta">${esc(x.assignee || "")}</span>
      <button class="icon-btn" data-del="daily" data-id="${x.id}" title="${esc(t("delete"))}">✕</button></li>`;
  }).join("")}</ul>` : `<div class="empty">${esc(t("no_tasks"))}</div>`;

  const overallHtml = overall.length ? `<ul class="task-list">${overall.map(x => {
    const late = !x.done && x.due && x.due < today;
    return `<li class="task ${x.done ? "done" : ""}"><input type="checkbox" data-kind="overall" data-id="${x.id}" ${x.done ? "checked" : ""}>
      <span class="title">${x.label === "check" ? `<span class="pill warn">${esc(t("needs_check"))}</span> ` : ""}${esc(x.title)}${x.assignee ? ` <span class="muted small">· ${esc(x.assignee)}</span>` : ""}${x.note ? `<div class="muted small">${esc(x.note)}</div>` : ""}</span>
      <span class="meta ${late ? "late" : ""}">${x.due ? (late ? "! " : "") + esc(x.due) : ""}</span>
      <button class="icon-btn" data-del="overall" data-id="${x.id}" title="${esc(t("delete"))}">✕</button></li>`;
  }).join("")}</ul>` : `<div class="empty">${esc(t("no_tasks"))}</div>`;

  view.innerHTML = demo + head(t("tab_tasks"), t("tasks_sub")) +
    `<div class="cards">
      ${card(t("done_today"), `${doneToday} / ${d.daily.length}`, `<div class="progress"><div style="width:${pct}%"></div></div>`, "hero")}
      ${card(t("open_tasks"), String(openCount))}
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head"><h3>${esc(t("daily_tasks"))}</h3><span class="muted small">${esc(today)}</span></div>
        ${dailyHtml}
        <form class="form-row" id="addDaily">
          <label class="w-l">${esc(t("task"))}<input type="text" name="title" required></label>
          <label>${esc(t("assignee"))}<input type="text" name="assignee"></label>
          <button class="btn primary" type="submit">${esc(t("add"))}</button>
        </form></div>
      <div class="panel"><div class="panel-head"><h3>${esc(t("overall_tasks"))}</h3></div>
        ${overallHtml}
        <form class="form-row" id="addOverall">
          <label class="w-l">${esc(t("task"))}<input type="text" name="title" required></label>
          <label>${esc(t("assignee"))}<input type="text" name="assignee"></label>
          <label class="w-s">${esc(t("due"))}<input type="date" name="due"></label>
          <button class="btn primary" type="submit">${esc(t("add"))}</button>
        </form></div>
    </div>`;

  $$("input[type=checkbox]", view).forEach(cb => cb.addEventListener("change", () => {
    if (cb.dataset.kind === "daily") {
      const x = d.daily.find(v => v.id === cb.dataset.id); if (!x) return;
      x.done = x.done || {}; if (cb.checked) x.done[today] = true; else delete x.done[today];
    } else {
      const x = d.overall.find(v => v.id === cb.dataset.id); if (!x) return;
      x.done = cb.checked; x.doneAt = cb.checked ? today : null;
    }
    saveData("tasks"); renderTasks(view, demo);
  }));
  $$("[data-del]", view).forEach(b => b.addEventListener("click", () => {
    if (!confirmDel()) return;
    const k = b.dataset.del; d[k] = d[k].filter(v => v.id !== b.dataset.id); saveData("tasks"); renderTasks(view, demo);
  }));
  $("#addDaily", view).addEventListener("submit", ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    d.daily.push({ id: uid(), title: f.get("title").trim(), assignee: (f.get("assignee") || "").trim(), done: {} });
    saveData("tasks"); renderTasks(view, demo);
  });
  $("#addOverall", view).addEventListener("submit", ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    d.overall.push({ id: uid(), title: f.get("title").trim(), assignee: (f.get("assignee") || "").trim(), due: f.get("due") || "", done: false, createdAt: today });
    saveData("tasks"); renderTasks(view, demo);
  });
}

// ====================== demo data ======================
function demoApi(path, opts) {
  const now = new Date();
  if (path.startsWith("/data/")) {
    const key = path.split("/")[2];
    if (opts.method === "PUT") return { ok: true };
    const samples = {
      fixed: { categories: [
        ["rent", 4500, 1], ["utilities", 1200, 10], ["internet", 90, 15], ["salaries", 18500, 5],
        ["program", 350, 20], ["cleaning", 600, 28], ["outsourcing", 800, 25],
      ].map(([k, a, dd], i) => ({ id: "f" + i, key: k, name: "", amount: a, dueDay: dd, comment: "", paid: i < 3 ? { [ymNow()]: true } : {}, items: [] })) },
      variable: { entries: [
        { id: "v1", date: todayISO(), type: "goods", name: "Flour 00, 50kg", amount: 310, comment: "" },
        { id: "v2", date: todayISO(), type: "jars", name: "Pesto jars 250ml ×200", amount: 180, comment: "" },
        { id: "v3", date: ymNow() + "-03", type: "packaging", name: "Pizza boxes ×500", amount: 420, comment: "", paid: true },
        { id: "v4", date: ymNow() + "-02", type: "goods", name: "Mozzarella", amount: 1240, comment: "", paid: true },
      ] },
      ratings: { entries: [
        { id: "r1", date: ymShift(ymNow(), -1) + "-15", platform: "wolt", rating: 4.5, reviews: 812, comment: "" },
        { id: "r2", date: todayISO(), platform: "wolt", rating: 4.6, reviews: 845, comment: "" },
        { id: "r3", date: todayISO(), platform: "glovo", rating: 4.7, reviews: 214, comment: "" },
      ] },
      tasks: { daily: [
        { id: "d1", title: "Open checklist", assignee: "Nino", done: { [todayISO()]: true } },
        { id: "d2", title: "Check fridge temperatures", assignee: "Giorgi", done: {} },
        { id: "d3", title: "Count cash at close", assignee: "", done: {} },
      ], overall: [
        { id: "o1", title: "Renew Wolt menu photos", assignee: "Ana", due: ymNow() + "-30", done: false },
        { id: "o2", title: "Fix terrace lights", assignee: "", due: ymShift(ymNow(), -1) + "-20", done: false },
      ] },
    };
    return { value: samples[key] };
  }
  if (path.startsWith("/syrve/menu/dish")) {
    const leaf = (name, unit, qty, price) => ({ id: name, name, unit, qty, semi: false, unitCost: price, cost: Math.round(qty * price * 10000) / 10000, missing: false, children: [] });
    const semi = (name, unit, qty, children) => { const cost = children.reduce((a, c) => a + c.cost, 0); return { id: name, name, unit, qty, semi: true, unitCost: Math.round(cost / qty * 100) / 100, cost, missing: false, children }; };
    const tree = { children: [
      semi("ფოკაჩის ცომი", "კგ", 0.25, [leaf("ფქვილი 00", "კგ", 0.145, 2.8), leaf("წყალი", "ლ", 0.1, 0), leaf("ზეითუნის ზეთი", "ლ", 0.008, 18), leaf("საფუარი", "კგ", 0.002, 22), leaf("მარილი", "კგ", 0.004, 1.2)]),
      semi("ტომატის სოუსი", "კგ", 0.08, [leaf("პომიდორი (კონსერვი)", "კგ", 0.07, 6.5), leaf("ზეითუნის ზეთი", "ლ", 0.005, 18), leaf("რეჰანი", "კგ", 0.002, 40), leaf("მარილი", "კგ", 0.001, 1.2)]),
      leaf("მოცარელა", "კგ", 0.12, 20), leaf("რეჰანი", "კგ", 0.003, 40), leaf("ყუთი (შეფუთვა)", "ც", 1, 0.85)], missing: false };
    tree.cost = tree.children.reduce((a, c) => a + c.cost, 0);
    const by = new Map(); const walk = x => { if (x.semi) return x.children.forEach(walk); const y = by.get(x.name) || { name: x.name, unit: x.unit, qty: 0, cost: 0, missing: false }; y.qty += x.qty; y.cost += x.cost; by.set(x.name, y); }; tree.children.forEach(walk);
    const flat = [...by.values()].map(y => ({ ...y, unitCost: y.qty ? Math.round(y.cost / y.qty * 100) / 100 : null })).sort((a, b) => b.cost - a.cost);
    return { id: "d1", name: "ფოკაჩა მარგარიტა", unit: "ც", sold: 41, rank: 2, price: 18, cost: 4.6, margin: 69.8, foodCostPct: 30.2, tree, flat,
      sales: { byHour: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h, i) => ({ hour: h, qty: [1, 2, 3, 6, 7, 4, 2, 2, 3, 4, 5, 2][i], revenue: [1, 2, 3, 6, 7, 4, 2, 2, 3, 4, 5, 2][i] * 18 })), byDay: [] } };
  }
  if (path.startsWith("/syrve/menu")) {
    const rows = [["ფოკაჩა კლასიკური", "ფოკაჩა", 58, 12, 2.9], ["ფოკაჩა მარგარიტა", "ფოკაჩა", 41, 18, 4.6], ["ფოკაჩა როზმარინით", "ფოკაჩა", 33, 13, 3.1],
      ["ფოკაჩა პროშუტოთი", "ფოკაჩა", 21, 24, 8.9], ["ლიმონათი", "სასმელი", 19, 7, 1.4], ["ესპრესო", "ყავა", 16, 5, 0.9], ["ფოკაჩა ტრიუფელით", "ფოკაჩა", 6, 28, 13.5], ["ტირამისუ", "დესერტი", 0, 14, 4.2]];
    const dishes = rows.map(([name, group, sold, price, cost], i) => { const nv = price / 1.18; return { id: "d" + i, name, group, unit: "ც", type: "DISH", sold, revenue: sold * price, cost, costPartial: false, hasRecipe: i !== 4,
      price, priceNoVat: Math.round(nv * 100) / 100, margin: Math.round((nv - cost) / nv * 1000) / 10, foodCostPct: Math.round(cost / nv * 1000) / 10, rank: sold ? i + 1 : null }; });
    return { dishes, totals: { sold: dishes.reduce((a, d) => a + d.sold, 0), revenue: dishes.reduce((a, d) => a + d.revenue, 0) }, recipesError: "", costError: "" };
  }
  if (path.startsWith("/syrve/paytype")) {
    const name = decodeURIComponent((path.match(/name=([^&]*)/) || [])[1] || "");
    const b2b = name === "B2B";
    const orders = Array.from({ length: b2b ? 4 : 9 }, (_, i) => ({ day: todayISO(), num: String(120 - i), time: `${pad(20 - i)}:${pad((i * 13) % 60)}`,
      customer: b2b ? ["შპს კაფე ლილა", "შპს მზიური", "შპს კაფე ლილა", "შპს ბარი 12"][i] : "", cashier: ["ნინო", "გიორგი"][i % 2],
      sum: b2b ? [420, 186, 260, 95][i] : 20 + i * 7, items: b2b ? [{ name: "ფოკაჩა კლასიკური", qty: 12 - i * 2, sum: 120 }, { name: "ფოკაჩა როზმარინით", qty: 6, sum: 66 }] : [{ name: "ფოკაჩა", qty: 1, sum: 12 }],
      waybill: b2b ? [{ number: "0988938607", amount: 420 }, null, { number: "0988938655", amount: 250 }, { number: "0988938700", amount: 95 }][i] : undefined }));
    return { name, b2b, total: orders.reduce((a, o) => a + o.sum, 0), orders, waybillError: "", itemsError: "" };
  }
  if (path.startsWith("/syrve/live")) {
    const hrs = []; for (let h = 9; h <= Math.max(10, now.getHours()); h++) hrs.push({ hour: h, sum: Math.round(300 + Math.random() * 900 + (h >= 12 && h <= 14 ? 800 : 0) + (h >= 19 ? 900 : 0)) });
    const total = hrs.reduce((a, h) => a + h.sum, 0);
    return { date: todayISO(), total, orders: Math.round(total / 38), byPayType: [{ name: "Card", sum: Math.round(total * 0.6) }, { name: "Cash", sum: Math.round(total * 0.25) }, { name: "გადარიცხვები", sum: Math.round(total * 0.1) }, { name: "B2B", sum: total - Math.round(total * 0.6) - Math.round(total * 0.25) - Math.round(total * 0.1) }, { name: "მარკეტინგი", sum: 64, notIncome: true }], byHour: hrs,
      byDay: Array.from({ length: 27 }, (_, i) => ({ day: shiftDay(todayISO(), -i), sum: 1500 + Math.round(Math.sin(i) * 500 + 600) })), _at: Date.now() };
  }
  if (path.startsWith("/syrve/monthly")) {
    const months = []; for (let i = 11; i >= 0; i--) { const m = ymShift(ymNow(), -i); const inc = 52000 + Math.round(Math.sin(i) * 9000 + (11 - i) * 900); months.push({ month: m, income: i === 0 ? Math.round(inc * now.getDate() / 30) : inc, cash: Math.round(inc * 0.3), card: Math.round(inc * 0.7), credit: 0, cost: Math.round((i === 0 ? inc * now.getDate() / 30 : inc) * 0.31) }); }
    return { months };
  }
  if (path.startsWith("/syrve/debts")) {
    const rows = [["Nikora", "204567891", 12420.5, 9000], ["Sante GMT", "205123456", 6180, 4000], ["Ori Nabiji", "400112233", 3460, 2000], ["Metro Cash & Carry", "211334455", 890.4, 0], ["Local farm (veg)", "01001012345", 300, 500]];
    const suppliers = rows.map(([name, tin, inv, paid], i) => ({ id: "s" + i, name, tin, invoices: inv, paid, owed: Math.round((inv - paid) * 100) / 100 }));
    return { asOf: todayISO(), total: suppliers.filter(s => s.owed > 0).reduce((a, s) => a + s.owed, 0), suppliers,
      review: { count: 2, payments: 7, amount: 1700, items: [
        { rk: "t:204999888", name: "შპს ნიკორა ტრეიდი", tin: "204999888", iban: "", count: 5, amount: 1450, last: todayISO(), purpose: "ზედნადები #0457812", bank: "BOG", reason: "name_only", suggestion: "s0", rsName: "" },
        { rk: "t:01001055555", name: "Giorgi Beridze", tin: "01001055555", iban: "GE33TB0000000000000003", count: 2, amount: 250, last: ymNow() + "-12", purpose: "transfer", bank: "TBC", reason: "unknown", suggestion: null, rsName: "" },
      ] },
      options: suppliers.map(s => ({ id: s.id, name: s.name })),
      linkedTins: [{ tin: "206000111", to: "ignore", name: "" }],
      bank: { configured: { bog: true, tbc: true }, settings: { historyFrom: "2024-01-01", bogAccounts: ["GE00BG0000000000000001"] }, lastSyncAt: new Date().toISOString(), errors: {}, cursors: {}, payments: 412, matched: 371, ignored: 39 } };
  }
  if (path.startsWith("/bank/")) return { ok: true, done: true };
  if (path.startsWith("/syrve/employees")) {
    const month = (path.match(/month=(\d{4}-\d{2})/) || [])[1] || ymNow();
    const people = ["Nino Beridze", "Giorgi Kapanadze", "Ana Lomidze", "Luka Tsiklauri", "Mariam Gelashvili", "Saba Abashidze"];
    const [y, m] = month.split("-").map(Number); const days = new Date(y, m, 0).getDate();
    const shifts = [];
    for (let dd = 1; dd <= days; dd++) people.forEach((p, i) => {
      if ((dd + i) % 3 === 0) return;
      const start = i % 2 ? "15:00" : "09:00", end = i % 2 ? "23:00" : "17:00";
      shifts.push({ employeeId: "e" + i, name: p, from: `${month}-${pad(dd)}T${start}:00+04:00`, to: `${month}-${pad(dd)}T${end}:00+04:00`, department: "" });
    });
    const attendance = shifts.filter(s => s.from.slice(0, 10) === todayISO() && s.from.slice(11, 16) === "09:00")
      .map(s => ({ employeeId: s.employeeId, name: s.name, from: s.from.replace("09:00", "08:55"), to: "" }));
    return { month, today: todayISO(), shifts, attendance };
  }
  return {};
}

// ====================== boot ======================
function boot() {
  $("#langBtn").addEventListener("click", () => { S.lang = S.lang === "ka" ? "en" : "ka"; store.set("dash_lang", S.lang); route(); });
  $("#logoutBtn").addEventListener("click", logout);
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#loginErr"); err.hidden = true;
    if (DEMO) { showApp(); return; }
    const { res, body } = await request("/api/login", { method: "POST", body: { password: $("#loginPass").value } });
    if (res.ok) { $("#loginPass").value = ""; showApp(); return; }
    const code = body.error;
    err.textContent = code === "wrong" ? t("wrong_password") : code === "too_many" ? t("too_many") : code === "not_set" ? t("not_set") : (code || "HTTP " + res.status);
    err.hidden = false;
  });
  window.addEventListener("hashchange", route);
  if (DEMO) { showApp(); return; }
  request("/api/session").then(({ body }) => (body.authed ? showApp() : showLogin())).catch(() => showLogin());
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
