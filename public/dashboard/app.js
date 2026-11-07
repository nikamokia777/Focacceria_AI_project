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
    monthly_chart: "თვეების დიაგრამა", by_month: "თვეების მიხედვით",
    monthly_margin_note: "თვის მარჟა: Syrve-ის მიერ გაყიდვის დროს ჩაწერილი თვითღირებულებით, დღგ-ს გარეშე.",
    avg_items_sold: "საშუალო გაყიდული ერთეული", avg_per_day: "დღეში · {n} დღე გაყიდვებით",
    all_groups: "ყველა ჯგუფი", only_sold: "მხოლოდ გაყიდული", sort_sold: "გაყიდვადობით", sort_revenue: "ნავაჭრით", sort_margin: "მარჟით",
    no_recipe: "რეცეპტი არ არის", recipe_tree: "🌳 რეცეპტი (ხე)", recipe_flat: "🧺 ნედლეული (ჯამი)", ingredient: "ინგრედიენტი", raw: "ნედლეული",
    qty: "რაოდენობა", unit_price: "ფასი / ერთ.", value: "ღირებულება", share: "წილი", semi: "ნახევარფაბრიკატი", total_cost: "სულ თვითღირებულება",
    price_vat: "ფასი (დღგ-ით)", margin_novat: "მარჟა (დღგ-ს გარეშე)", one_unit: "ერთი ერთეული", rank: "რეიტინგი", sold_when: "როდის გაიყიდა",
    missing_price: "⚠ Syrve-მ ზოგი ინგრედიენტის თვითღირებულება არ დააბრუნა — ეს სტრიქონები „—“-ით არის აღნიშნული.",
    prices_loading: "Syrve-დან თვითღირებულებები იტვირთება… დარჩა {n} კერძი. გვერდი თავისით განახლდება.",
    estimated_note: "* — მარაგში არ არის, ამიტომ ფასი შეფასებულია (ბოლო შესყიდვის ფასით ან ნახევარფაბრიკატის რეცეპტით), როგორც Syrve-ის რეცეპტში.",
    stock_priced: "მარაგის ფასით", food_cost_vat: "Food cost (ფასიდან დღგ-ით)",
    flat_differs: "ნედლეულის ჯამი {a} — განსხვავდება რეცეპტის თვითღირებულებისგან ({b}), რადგან Syrve ნახევარფაბრიკატს საკუთარი თვითღირებულებით ითვლის და არა მისი ინგრედიენტების ჯამით.",
    invoice_err: "მომწოდებლების ზედნადებებიდან ფასები ვერ წამოვიდა",
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
    by_hour_avg: "საათების მიხედვით · საშუალო დღეში", days_with_sales: "{n} დღე გაყიდვებით",
    peak1: "1-ლი პიკი", peak2: "მე-2 პიკი", lowest: "ყველაზე დაბალი",
    pick_today: "დღეს", pick_yesterday: "გუშინ", pick_week: "ეს კვირა", pick_month: "ეს თვე", pick_last_month: "წინა თვე", pick_6m: "6 თვე", pick_12m: "12 თვე",
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
    debts_sub: "rs.ge-ს ზედნადებები − დაბრუნებები − BOG / TBC გადარიცხვები. გადარიცხვა მომწოდებელს საიდენტიფიკაციო კოდით უკავშირდება; კოდის გარეშე გადარიცხვა — ზუსტი სახელით, მსგავსი სახელით კი მხოლოდ თქვენი დადასტურებით. ბანკის საკომისიოები არ ითვლება.", search: "ძებნა",
    no_debts: "ვალები არ არის",
    platform: "პლატფორმა", rating: "რეიტინგი", reviews: "შეფასებები", latest: "ბოლო",
    ratings_sub: "მიტანის აპლიკაციების რეიტინგები. შეიყვანეთ ციფრები აპლიკაციიდან.", history: "ისტორია",
    wolt: "Wolt", glovo: "Glovo", bolt: "Bolt Food", no_rating: "ჯერ არ არის", vs_prev: "წინასთან შედარებით",
    working_today: "დღეს მუშაობს", calendar: "კალენდარი", shift: "ცვლა", on_shift: "ცვლაზეა",
    finished: "დაასრულა", not_arrived: "ჯერ არ მოსულა", nobody_today: "დღეს ცვლები არ არის",
    employees_sub: "თანამშრომლები, გრაფიკი და ზეგანაკვეთური — ხელით.", prev: "‹", next: "›",
    employee: "თანამშრომელი", role: "როლი", pay_type: "ანაზღაურება", pay_hour: "საათობრივი", pay_shift: "ცვლაზე", pay_month: "თვიური",
    rate: "განაკვეთი", pid: "პირადი ნომერი", iban: "ანგარიში (IBAN)", count_from: "ითვლება", active: "აქტიური", inactive: "გათიშული",
    emp_list: "თანამშრომლები", add_emp: "+ თანამშრომელი", emp_deactivated: "ცვლები აქვს — გაითიშა, ისტორია რჩება",
    emp_hint: "ანაზღაურება: საათობრივი = საათები × განაკვეთი, ცვლაზე = სამუშაო დღეები × განაკვეთი, თვიური = სრული თანხა ყოველ თვეს. „ითვლება“ — თარიღი, საიდანაც ითვლება ხელფასი და გადარიცხვები (ცარიელი = პირველი ცვლიდან). პირადი ნომრით ან ანგარიშით ბანკის გადარიცხვები ავტომატურად უკავშირდება.",
    day_shifts: "ცვლები", add_shift: "+ ცვლა", from_t: "დან", to_t: "მდე", hours: "საათი", overtime: "ზეგანაკვეთური", note: "შენიშვნა",
    month_summary: "თვის ჯამი", shifts_n: "ცვლა", days_n: "დღე", click_day: "დააჭირეთ დღეს ცვლების ჩასაწერად", starts: "იწყება",
    add_emp_first: "ჯერ დაამატეთ თანამშრომელი ქვემოთ, სიაში.", bad_time: "დრო ჩაწერეთ ასე: 09:00",
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
    dv_main_hint: "ეს თანხა ჩანს მთავარ გვერდზე",
    wb_count: "ზედნადები", returns_col: "დაბრუნება",
    cat_other: "სხვა ხარჯი",
    who_q: "ვინ არის ეს?", comment_ph: "კომენტარი (მაგ. ქირა, რემონტი)…",
    rsge_not_connected: "rs.ge არ არის დაკავშირებული: Cloudflare-ში საჭიროა RSGE_SERVICE_USER და RSGE_SERVICE_PASSWORD.",
    rsge_need_start: "ქვემოთ, ბანკის პარამეტრებში მიუთითეთ თარიღი — ზედნადებებიც და გადარიცხვებიც ამ თარიღიდან ითვლება.",
    rsge_loading: "იტვირთება rs.ge-ს ზედნადებები… {a} / {b} თვე", rsge_no_returns: "rs.ge-ზე „უკან დაბრუნების“ ტიპი ვერ ვიპოვე — დაბრუნებები არ აკლდება.",
    paid_bank: "გადახდილი (ბანკი)", tax_id: "ს/კ",
    recipient: "მიმღები",
    last: "ბოლო",
    confirm: "დადასტურება",
    bank: "ბანკი", last_sync: "ბოლო სინქრ.",
    bank_settings: "ბანკის პარამეტრები", history_from: "ისტორია თარიღიდან", bog_accounts: "BOG ანგარიშები (IBAN, თითო ხაზზე)",
    save: "შენახვა", tbc_auto: "TBC-ის GEL ანგარიშები ავტომატურად იკითხება", payments_loaded: "გადახდა",
    ignored: "გამოტოვებული", bank_not_connected: "ბანკი არ არის დაკავშირებული",
    bank_secrets_hint: "Cloudflare-ში დაამატეთ Secret-ები: BOG_CLIENT_ID, BOG_CLIENT_SECRET და/ან TBC_CLIENT_ID, TBC_CLIENT_SECRET.",
    need_start: "ქვემოთ, ბანკის პარამეტრებში მიუთითეთ თარიღი, საიდანაც ითვლება ზედნადებები და გადარიცხვები, და BOG-ის ანგარიშები.",
    history_note: "rs.ge-ს ზედნადებებიც და ბანკის გადარიცხვებიც ამ თარიღიდან ითვლება. გადასახადები, საკუთარ ანგარიშებს შორის გადარიცხვები და საკომისიოები ავტომატურად გამოტოვებულია.",
    loading_history: "იტვირთება ბანკის ისტორია…",
    err_tbc_test_keys: "ეს TBC-ის სატესტო გასაღებებია (developers.tbcbank.ge-დან) — რეალურ ანგარიშებზე არ მუშაობს. საჭიროა გასაღებები TBC ბიზნეს ინტერნეტბანკიდან: API ინტეგრაცია → ახალი ინტეგრაცია → უფლება „ტრანზაქციების ისტორიის და ამონაწერების ნახვა“. Client ID → TBC_CLIENT_ID, Client Secret → TBC_CLIENT_SECRET.",
    err_tbc_unknown_id: "TBC ამ Client ID-ს არ იცნობს (არც სვაპით). შექმენით ახალი ინტეგრაცია TBC ბიზნეს ინტერნეტბანკში (API ინტეგრაცია, SMS დადასტურებით) და ჩასვით ახალი Client ID და Secret Cloudflare-ში.",
    err_tbc_bad_keys: "TBC გასაღებებს არ იღებს. შეამოწმეთ, რომ ინტეგრაცია აქტიურია და SMS-ით დადასტურებულია, დაკავშირებული მომხმარებელი აქტიურია და აქვს „ისტორიის ნახვის“ უფლება.",
    err_tbc_down: "TBC-ის სერვერი ახლა არ პასუხობს — მოგვიანებით თავად სცდის.",
    note_tbc_swapped: "Client ID და Secret Cloudflare-ში ადგილებშია არეული — აპი ავტომატურად ასწორებს, მაგრამ სასურველია გაასწოროთ.",
    dt_debts: "ვალები",
    dt_nowb: "ზედნადების გარეშე",
    dt_problems: "პრობლემები",
    dt_over: "ზედმეტი გადახდა",
    col_waybills: "ზედნადებები",
    transfers: "გადარიცხვები",
    paid_all: "გადახდილი",
    manual_paid: "ბანკის გარეშე",
    rs_confirmed: "დადასტ. rs.ge-ზე",
    undo: "გაუქმება",
    debt_ok: "გადარიცხვა არ არის — ვალი დადასტურებულია",
    how_code: "ს/კ-ით", how_name: "ზუსტი სახელით", not_this: "ეს არ არის ამ მომწოდებლის",
    how_dec: "თქვენი გადაწყვეტილებით",
    showing_tx: "ნაჩვენებია {a} / {b} გადარიცხვა",
    st_over: "ზედმეტი",
    st_problem: "პრობლემა",
    st_debt_ok: "ვალი დადასტ.",
    only_these: "მხოლოდ ეს გადარიცხვები",
    nw_open: "გადარიცხვები ზედნადების გარეშე",
    nw_open_hint: "მიმღების ს/კ არცერთ ზედნადებზე არ არის და სახელითაც არცერთ მომწოდებელს არ ჰგავს",
    nw_wait: "ველოდებით ზედნადებს",
    nw_wait_hint: "ზედნადები იქმნება — როცა ამ კოდით rs.ge-ზე გამოჩნდება, გადარიცხვები ავტომატურად ჩაითვლება",
    other_hint: "ზედნადები არ არის — მომწოდებლების ვალს არ ცვლის",
    code_ph: "საიდენტიფიკაციო კოდი",
    pr_name: "სახელი ემთხვევა, ს/კ — არა",
    pr_name_hint: "ითვლება მხოლოდ მას შემდეგ, რაც ვერსიას დაადასტურებთ",
    versions: "ვერსიები",
    no_version: "ვერსია არ არის — კოდი ხელით",
    none_of_these: "არცერთი არ არის",
    pr_none: "გადარიცხვა საერთოდ არ არის",
    pr_none_hint: "მომწოდებლები, რომლებსაც ზედნადებები აქვთ, მაგრამ არცერთი გადარიცხვა",
    looks_like: "ჰგავს:",
    see_above: "იხ. ზემოთ",
    type_manually: "ხელით შეყვანა",
    confirm_debt: "გადარიცხვა არ არის — ვალს ვადასტურებ",
    over_hint: "მომწოდებლები, რომლებსაც ზედნადებებზე მეტი გადაუხადეთ.",
    excess: "ზედმეტი",
    scope_q: "რომელ გადარიცხვებს ეხება „{name}“-ზე?",
    scope_all: "ამ მიმღების ყველა (მომავალიც)",
    scope_once: "მხოლოდ ეს {n} გადარიცხვა",
    code_q: "მომწოდებლის საიდენტიფიკაციო კოდი (როგორც ზედნადებზეა)",
    code_next: "შემდეგი",
    code_unknown: "კოდით {code} ზედნადები ჯერ არ არის. რა ხდება?",
    opt_wait: "ზედნადები იქმნება",
    opt_never: "ზედნადები არ იქნება → სხვა ხარჯი",
    opt_find: "ზედნადები მოიძებნება",
    opt_none: "ზედნადები არ არის → სხვა ხარჯი",
    manual_code: "მიმღების კოდი, თუ ბანკში სხვა კოდით უხდით",
    manual_pay: "გადახდა ბანკის გარეშე (მაგ. ნაღდი)",
    manual_need: "ჩაწერეთ კოდი ან თანხა", tx_n: "გადარიცხვა",
    dt_cards: "ბარათით", how_card: "ბარათით",
    cd_open: "დასადასტურებელი ბარათით გადახდები",
    cd_open_hint: "ითვლება მხოლოდ დადასტურების შემდეგ. შემოთავაზებულია იგივე თანხის ზედნადები (ნებისმიერი თარიღით, უახლოესი პირველი)",
    cd_confirmed: "დადასტურებული",
    cd_confirmed_hint: "დადასტურებული გადახდები ჩანს „ვალები“-ში, მომწოდებლის დეტალებში",
    cd_shop: "მაღაზია", cd_card: "ბარათი", cd_bought: "ყიდვის დღე", cd_payments: "გადახდები",
    cd_shop_n: "ამ მაღაზიაში {n} დაუდასტურებელი გადახდა",
    cd_pick: "— აირჩიეთ მომწოდებელი —", cd_pick_need: "აირჩიეთ მომწოდებელი",
    cd_by_amount: "იგივე თანხის ზედნადები", cd_by_name: "სახელით ჰგავს", cd_all_sellers: "ყველა მომწოდებელი",
    cd_no_wb: "იგივე თანხის ზედნადები ჯერ არ არის",
    cd_days: "{n} დღის სხვაობა", cd_same_day: "იმავე დღეს",
    cd_wb: "ზედნადები", cd_wait_wb: "ზედნადები ჯერ არ არის",
    cd_scope_all: "ამ მაღაზიის ყველა (მომავალიც)", cd_scope_once: "მხოლოდ ეს გადახდა",
    cd_scope_q: "რომელ გადახდებს ეხება „{name}“-ში?",
    cd_other: "სხვა ხარჯი (ბარათით)",
    cd_none_hint: "{n} ბარათით გადახდა შეიძლება ამ მომწოდებლის იყოს — იხ. „ბარათით“",
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
    monthly_chart: "Monthly chart", by_month: "By month",
    monthly_margin_note: "Margin per month uses the cost Syrve booked at the time of sale, excluding VAT.",
    avg_items_sold: "Average items sold", avg_per_day: "per day · {n} days with sales",
    all_groups: "All groups", only_sold: "Only sold", sort_sold: "By sales", sort_revenue: "By revenue", sort_margin: "By margin",
    no_recipe: "no recipe", recipe_tree: "🌳 Recipe (tree)", recipe_flat: "🧺 Raw ingredients (total)", ingredient: "Ingredient", raw: "Raw ingredient",
    qty: "Quantity", unit_price: "Price / unit", value: "Cost", share: "Share", semi: "semi-finished", total_cost: "Total cost",
    price_vat: "Price (incl. VAT)", margin_novat: "Margin (excl. VAT)", one_unit: "one unit", rank: "rank", sold_when: "When it sold",
    missing_price: "⚠ Syrve returned no cost price for some ingredients — those lines show “—”.",
    prices_loading: "Loading cost prices from Syrve… {n} dishes left. The page will update by itself.",
    estimated_note: "* — not in stock, so the price is estimated (last purchase price, or the semi-finished product's recipe), as on Syrve's recipe card.",
    stock_priced: "priced from stock", food_cost_vat: "Food cost (of price with VAT)",
    flat_differs: "Raw ingredients add up to {a} — different from the recipe cost ({b}) because Syrve prices a semi-finished product at its own cost price, not as the sum of its ingredients.",
    invoice_err: "Could not read prices from supplier invoices",
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
    by_hour_avg: "By hour · average per day", days_with_sales: "{n} days with sales",
    peak1: "1st peak", peak2: "2nd peak", lowest: "Lowest",
    pick_today: "Today", pick_yesterday: "Yesterday", pick_week: "This week", pick_month: "This month", pick_last_month: "Last month", pick_6m: "6 months", pick_12m: "12 months",
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
    debts_sub: "rs.ge waybills − returns − BOG / TBC transfers. A transfer goes to a supplier by identification code; one without a code by exact name, by a similar name only after you confirm. Bank fees don't count.", search: "Search",
    no_debts: "No debts",
    platform: "Platform", rating: "Rating", reviews: "Reviews", latest: "Latest",
    ratings_sub: "Delivery app ratings. Enter the numbers from each app.", history: "History",
    wolt: "Wolt", glovo: "Glovo", bolt: "Bolt Food", no_rating: "No rating yet", vs_prev: "vs previous",
    working_today: "Working today", calendar: "Calendar", shift: "Shift", on_shift: "On shift",
    finished: "Finished", not_arrived: "Not arrived yet", nobody_today: "No shifts today",
    employees_sub: "Employees, schedule and overtime — typed in by hand.", prev: "‹", next: "›",
    employee: "Employee", role: "Role", pay_type: "Pay", pay_hour: "Hourly", pay_shift: "Per shift", pay_month: "Monthly",
    rate: "Rate", pid: "Personal ID", iban: "Account (IBAN)", count_from: "Counted from", active: "Active", inactive: "Inactive",
    emp_list: "Employees", add_emp: "+ Employee", emp_deactivated: "Has shifts — switched off, history kept",
    emp_hint: "Pay: hourly = hours × rate, per shift = working days × rate, monthly = the full amount every month. \"Counted from\" is the date salary and transfers count from (empty = from the first shift). Bank transfers are matched by personal ID or account automatically.",
    day_shifts: "Shifts", add_shift: "+ Shift", from_t: "From", to_t: "To", hours: "Hours", overtime: "Overtime", note: "Note",
    month_summary: "Month total", shifts_n: "Shifts", days_n: "days", click_day: "Click a day to enter its shifts", starts: "Starts",
    add_emp_first: "First add an employee in the list below.", bad_time: "Type the time like 09:00",
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
    dv_main_hint: "This amount is shown on the Main page",
    wb_count: "waybills", returns_col: "Returns",
    cat_other: "Other expenses",
    who_q: "Who is this?", comment_ph: "Comment (e.g. rent, repairs)…",
    rsge_not_connected: "rs.ge isn't connected: Cloudflare needs RSGE_SERVICE_USER and RSGE_SERVICE_PASSWORD.",
    rsge_need_start: "In Bank settings below, set the start date — waybills and transfers are both counted from it.",
    rsge_loading: "Loading rs.ge waybills… {a} / {b} months", rsge_no_returns: "rs.ge has no “return” waybill type — returns aren't subtracted.",
    paid_bank: "Paid (bank)", tax_id: "Tax ID",
    recipient: "Recipient",
    last: "last",
    confirm: "Confirm",
    bank: "Bank", last_sync: "Last sync",
    bank_settings: "Bank settings", history_from: "History from", bog_accounts: "BOG accounts (IBAN, one per line)",
    save: "Save", tbc_auto: "TBC GEL accounts are read automatically", payments_loaded: "payments",
    ignored: "skipped", bank_not_connected: "Bank not connected",
    bank_secrets_hint: "Add these Secrets in Cloudflare: BOG_CLIENT_ID, BOG_CLIENT_SECRET and/or TBC_CLIENT_ID, TBC_CLIENT_SECRET.",
    need_start: "In Bank settings below, set the date waybills and transfers are counted from, and your BOG accounts.",
    history_note: "rs.ge waybills and bank transfers are both counted from this date. Taxes, transfers between your own accounts and bank fees are skipped automatically.",
    loading_history: "Loading bank history…",
    err_tbc_test_keys: "These are TBC test keys (from developers.tbcbank.ge) — they never work on real accounts. You need keys from TBC Business Internet Banking: API Integration → new integration → permission “View transaction history and statements”. Client ID → TBC_CLIENT_ID, Client Secret → TBC_CLIENT_SECRET.",
    err_tbc_unknown_id: "TBC doesn't recognise this Client ID (also tried swapped). Create a new integration in TBC Business Internet Banking (API Integration, confirmed by SMS) and paste the new Client ID and Secret in Cloudflare.",
    err_tbc_bad_keys: "TBC rejects these keys. Check that the integration is active and confirmed by SMS, and that the linked user is active and has the “view history” permission.",
    err_tbc_down: "TBC's server isn't answering right now — the app will try again by itself.",
    note_tbc_swapped: "The Client ID and Secret are swapped in Cloudflare — the app fixes this automatically, but it's better to swap them back.",
    dt_debts: "Debts",
    dt_nowb: "Without a waybill",
    dt_problems: "Problems",
    dt_over: "Overpaid",
    col_waybills: "Waybills",
    transfers: "Transfers",
    paid_all: "Paid",
    manual_paid: "Outside the bank",
    rs_confirmed: "confirmed on rs.ge",
    undo: "Undo",
    debt_ok: "No transfer — the debt is confirmed",
    how_code: "by code", how_name: "by exact name", not_this: "Not this supplier's",
    how_dec: "your decision",
    showing_tx: "Showing {a} of {b} transfers",
    st_over: "Overpaid",
    st_problem: "Problem",
    st_debt_ok: "Debt confirmed",
    only_these: "only these transfers",
    nw_open: "Transfers without a waybill",
    nw_open_hint: "The recipient's code is on no waybill and its name looks like no supplier",
    nw_wait: "Waiting for a waybill",
    nw_wait_hint: "The waybill is being created — once rs.ge has one with this code, the transfers count automatically",
    other_hint: "No waybill — doesn't change any supplier's debt",
    code_ph: "Identification code",
    pr_name: "Name matches, code doesn't",
    pr_name_hint: "Counts only after you confirm a version",
    versions: "Versions",
    no_version: "No version — type the code",
    none_of_these: "None of these",
    pr_none: "No transfer at all",
    pr_none_hint: "Suppliers with waybills but not a single transfer",
    looks_like: "Looks like:",
    see_above: "see above",
    type_manually: "Type it in",
    confirm_debt: "No transfer — I confirm the debt",
    over_hint: "Suppliers you paid more than their waybills.",
    excess: "Excess",
    scope_q: "Which transfers to “{name}” does this apply to?",
    scope_all: "All of this recipient's (future too)",
    scope_once: "Only these {n} transfers",
    code_q: "The supplier's identification code (as on the waybill)",
    code_next: "Next",
    code_unknown: "No waybill has code {code} yet. What is happening?",
    opt_wait: "The waybill is being created",
    opt_never: "There will be no waybill → other expense",
    opt_find: "Find the waybills",
    opt_none: "There is no waybill → other expense",
    manual_code: "Recipient code, if you pay them under another code",
    manual_pay: "Payment outside the bank (e.g. cash)",
    manual_need: "Type a code or an amount", tx_n: "transfers",
    dt_cards: "Card payments", how_card: "by card",
    cd_open: "Card payments to confirm",
    cd_open_hint: "Count only after you confirm. Suggested: a waybill with the same amount (any date, nearest first)",
    cd_confirmed: "Confirmed",
    cd_confirmed_hint: "confirmed payments are in “Debts”, in the supplier's details",
    cd_shop: "Shop", cd_card: "Card", cd_bought: "Purchase day", cd_payments: "Payments",
    cd_shop_n: "{n} unconfirmed payments at this shop",
    cd_pick: "— choose a supplier —", cd_pick_need: "Choose a supplier",
    cd_by_amount: "Waybill with the same amount", cd_by_name: "Name looks like", cd_all_sellers: "All suppliers",
    cd_no_wb: "No waybill with this amount yet",
    cd_days: "{n} days apart", cd_same_day: "same day",
    cd_wb: "Waybill", cd_wait_wb: "No waybill yet",
    cd_scope_all: "All from this shop (future too)", cd_scope_once: "Only this payment",
    cd_scope_q: "Which payments at “{name}” does this apply to?",
    cd_other: "Other expenses (card)",
    cd_none_hint: "{n} card payment(s) may belong to this supplier — see “Card payments”",
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
  empDay: "",                                      // Employees: the day whose shifts are being edited
  debtQuery: "",
  debtTab: store.get("dash_debt_tab") || "debts",  // debts | nowb | problems | over
  debtOpen: "",                                    // Debts: the open row ("s:<code>" supplier, "r:<recipient>" recipient)
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
  staff: () => ({ employees: [], shifts: [] }),
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
// Colours the highest bar green, the second highest yellow and the lowest red (point.cls);
// the point at index `skip` (today's unfinished hour) is left out.
function markPeaks(points, skip = -1) {
  const idx = points.map((_, i) => i).filter(i => i !== skip).sort((a, b) => points[b].value - points[a].value);
  if (idx.length < 2) return points;
  points[idx[0]].cls = "peak1";
  points[idx[idx.length - 1]].cls = "low";
  if (idx.length > 2) points[idx[1]].cls = "peak2";
  return points;
}
const peakLegend = () => `<div class="hl-legend">${["peak1", "peak2", "lowest"].map(k => `<span><i class="${k === "lowest" ? "low" : k}"></i>${esc(t(k))}</span>`).join("")}</div>`;

// points: [{label, value, tip, text, cls}]; with text on any point, every bar shows its text instead of the peak value
function barChart(points, { height = 220, highlightLast = false, width = 720 } = {}) {
  // many bars: texts sit in two fixed rows above the chart, neighbours alternating, so they never overlap
  const texts = points.some(p => p.text), stagger = texts && points.length > 6;
  const W = Math.max(280, Math.round(width)), H = height, padL = 44, padR = 8, padT = stagger ? 42 : 18, padB = 26;
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
    if (path) bars += `<path class="bar${dim}${p.cls ? " " + p.cls : ""}" data-i="${i}" d="${path}"/>`;
    if (i % every === 0) labels += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>`;
    if (p.text) {
      const max = Math.max(4, Math.floor(band * (stagger ? 1.9 : 1) / 8)), s = String(p.text);
      const shown = s.length > max ? s.slice(0, max - 1) + "…" : s, half = shown.length * 4; // ~8px a letter: keep it inside the chart
      bars += `<text class="val" pointer-events="none" x="${Math.min(Math.max(cx, half), W - half)}" y="${stagger ? (i % 2 ? 30 : 15) : y0 - 6}" text-anchor="middle">${esc(shown)}</text>`;
    }
  });
  // label only the highest bar
  let peak = "";
  if (points.length && !texts) {
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

// "who works today" list — used by the Employees tab and by Main (the shifts typed in the Employees tab)
function whoWorksToday(staff, day = todayISO()) {
  const now = new Date();
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const byId = Object.fromEntries((staff.employees || []).map(e => [e.id, e]));
  const list = (staff.shifts || []).filter(s => s.day === day && byId[s.emp]).sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  const statusOf = s => {
    if (nowHM < s.from) return `<span class="pill neutral">○ ${esc(t("starts"))} ${esc(s.from)}</span>`;
    if (s.to > s.from && nowHM >= s.to) return `<span class="pill neutral">✓ ${esc(t("finished"))} · ${esc(s.to)}</span>`;
    return `<span class="pill good">● ${esc(t("on_shift"))}</span>`;
  };
  const initials = name => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").replace(/[a-z]/g, c => c.toUpperCase()) || "?"; // Georgian letters stay as they are (no Mtavruli);
  const html = list.length ? `<div class="today-list">${list.map(s => { const e = byId[s.emp]; return `
    <div class="person"><div class="who"><span class="avatar">${esc(initials(e.name))}</span>
      <div><div><b>${esc(e.name || "?")}</b></div><div class="muted small">${esc(t("shift"))} ${esc(s.from)}–${esc(s.to)}${e.role ? " · " + esc(e.role) : ""}${s.note ? " · " + esc(s.note) : ""}</div></div></div>
      ${statusOf(s)}</div>`; }).join("")}</div>`
    : `<div class="empty">${esc(t("nobody_today"))}</div>`;
  return { html, count: list.length };
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
    loadData("staff"),
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
  const quick = [["pick_today", "today"], ["pick_yesterday", "yesterday"], ["pick_week", "week"], ["pick_month", "month"], ["pick_last_month", "lastmonth"], ["pick_6m", "6m"], ["pick_12m", "12m"]];
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
  if (kind === "6m" || kind === "12m") return { from: ymShift(today.slice(0, 7), kind === "6m" ? -5 : -11) + "-01", to: today }; // this month included
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
  // income per hour (divided by `days` for a range's average day), first hour sold to last
  const hourPoints = (days = 1) => {
    const pts = [];
    if (!r.byHour || !r.byHour.length) return pts;
    const lo = Math.min(...r.byHour.map(h => h.hour)), hi = Math.max(...r.byHour.map(h => h.hour));
    for (let h = lo; h <= hi; h++) {
      const v = ((r.byHour.find(x => x.hour === h) || {}).sum || 0) / days;
      pts.push({ hour: h, label: pad(h) + ":00", value: v, tip: `${pad(h)}:00–${pad(h + 1)}:00: ${money(v)}` });
    }
    return pts;
  };
  let chart = [], chartTitle = t("by_hour"), hourAvg = [];
  if (range.from === range.to) {
    chart = hourPoints();
    // today's hour still in progress isn't ranked
    markPeaks(chart, isToday ? chart.findIndex(p => p.hour === new Date().getHours()) : -1);
  } else {
    chartTitle = t("by_day");
    for (let d = range.from; d <= range.to; d = shiftDay(d, 1)) {
      const v = ((r.byDay || []).find(x => x.day === d) || {}).sum || 0;
      chart.push({ label: dm(d), value: v, tip: `${dmy(d)}: ${money(v)}` });
    }
    if (r.salesDays) hourAvg = markPeaks(hourPoints(r.salesDays));
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
      <div><div class="panel"><div class="panel-head"><h3>${esc(chartTitle)}</h3></div><div class="panel-body">
        ${chart.length ? barChart(chart, { height: 200, width: panelWidth(true) }) + (range.from === range.to ? peakLegend() : "") : `<div class="empty">${esc(t("no_entries"))}</div>`}
      </div></div>
      ${range.from !== range.to ? `<div class="panel"><div class="panel-head"><h3>${esc(t("by_hour_avg"))}</h3>${r.salesDays ? `<span class="muted small">${esc(t("days_with_sales").replace("{n}", r.salesDays))}</span>` : ""}</div><div class="panel-body">
        ${hourAvg.length ? barChart(hourAvg, { height: 200, width: panelWidth(true) }) + peakLegend() : `<div class="empty">${esc(t("no_entries"))}</div>`}
      </div></div>` : ""}</div>
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
// rounds half up like Syrve (1.335 → 1.34); 0.005 ₾ of salt isn't "0.00"
const m2 = v => { const x = n(v), d = x > 0 && x < 0.005 ? 3 : 2; return (Math.round((x + Number.EPSILON) * 10 ** d) / 10 ** d).toFixed(d) + " " + CURRENCY; };
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
  // the boxes (and the monthly diagram) follow the category, not the search
  const inGroup = r.dishes.filter(d => !M.group || d.group === M.group);
  const sold = inGroup.reduce((a, d) => a + d.sold, 0), revenue = inGroup.reduce((a, d) => a + d.revenue, 0);
  const withMargin = inGroup.filter(d => d.margin !== null && d.revenue > 0);
  const revM = withMargin.reduce((a, d) => a + d.revenue, 0);
  const avgMargin = revM ? withMargin.reduce((a, d) => a + d.margin * d.revenue, 0) / revM : null;
  const best = inGroup.filter(d => d.sold > 0).reduce((b, d) => (!b || d.sold > b.sold || (d.sold === b.sold && d.revenue > b.revenue) ? d : b), null);

  view.innerHTML = demo + head(t("tab_menu"), t("menu_sub"),
    `<div class="range-pick"><button class="btn range-btn" id="rangeBtn" type="button">📅 ${esc(rangeLabel(range))}</button><div class="rc-pop panel" id="calPop" hidden></div></div>
     <button class="btn" id="menuRefresh">${esc(t("refresh"))}</button><button class="btn" id="menuExport">${esc(t("export"))}</button>
     <button class="btn ${M.chart ? "primary" : ""}" id="menuChart">📊 ${esc(t("monthly_chart"))}</button>`) +
    (r.recipesError ? `<div class="notice bad">${esc(t("recipes_err"))}: ${esc(r.recipesError)}</div>` : "") +
    (r.costError ? `<div class="notice bad">${esc(t("cost_err"))}: ${esc(r.costError)}</div>` : "") +
    (r.pricesPending ? `<div class="notice">⏳ ${esc(t("prices_loading").replace("{n}", r.pricesPending))}</div>` : "") +
    `<div class="cards">
      ${card(t("items_sold"), qtyFmt(sold), esc(rangeLabel(range)) + (M.group ? " · " + esc(M.group) : ""), "hero")}
      ${range.from !== range.to ? card(t("avg_items_sold"), r.salesDays ? qtyFmt(Math.round(sold / r.salesDays * 10) / 10) : "—",
        esc(t("avg_per_day").replace("{n}", r.salesDays ?? "—")) + (M.group ? " · " + esc(M.group) : "")) : ""}
      ${card(t("revenue"), money(revenue), M.group ? esc(M.group) : "")}
      ${card(t("avg_margin"), avgMargin === null ? "—" : avgMargin.toFixed(1) + "%", esc(t("margin_novat")))}
      ${card(t("best_seller"), best ? esc(best.name) : "—", best ? `${qtyFmt(best.sold)} · ${money(best.revenue)}` : "")}
    </div>
    ${M.chart ? `<div class="panel" id="menuMonthly"><div class="loading">${esc(t("loading"))}</div></div>` : ""}
    <div class="panel"><div class="form-row menu-filters">
      <input type="text" id="menuSearch" placeholder="${esc(t("search"))}…" value="${esc(M.q)}">
      <select id="menuGroup"><option value="">${esc(t("all_groups"))}</option>${groups.map(g => `<option ${g === M.group ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>
      <select id="menuSort">${[["sold", "sort_sold"], ["revenue", "sort_revenue"], ["margin", "sort_margin"]].map(([v, k]) => `<option value="${v}" ${v === M.sort ? "selected" : ""}>${esc(t(k))}</option>`).join("")}</select>
      <label class="inline"><input type="checkbox" id="menuSold" ${M.soldOnly ? "checked" : ""}> ${esc(t("only_sold"))}</label>
    </div>
    <div class="table-wrap"><table class="menu-table">
      <thead><tr><th class="r">#</th><th>${esc(t("dish"))}</th><th class="r">${esc(t("sold"))}</th><th class="r">${esc(t("revenue"))}</th><th class="r">${esc(t("price"))}</th><th class="r">${esc(t("cost_short"))}</th><th class="r">${esc(t("margin"))}</th><th class="r" title="${esc(t("food_cost_vat"))}">${esc(t("food_cost_pct"))}</th></tr></thead>
      <tbody>${list.length ? list.map(d => `<tr class="dish-row ${M.open === d.id ? "open" : ""}" data-id="${esc(d.id)}">
        <td class="r num muted">${d.rank ?? ""}</td>
        <td><b>${esc(d.name)}</b>${d.group ? ` <span class="tag">${esc(d.group)}</span>` : ""}${!d.hasRecipe && d.type === "DISH" ? ` <span class="pill warn">${esc(t("no_recipe"))}</span>` : ""}</td>
        <td class="r num"><b>${qtyFmt(d.sold)}</b></td><td class="r num">${money(d.revenue)}</td>
        <td class="r num">${d.price ? m2(d.price) : "—"}</td><td class="r num">${d.cost !== null ? m2(d.cost) + (d.costEstimated ? "*" : "") + (d.costPartial ? " ⚠" : "") : "—"}</td>
        <td class="r"><span class="pill ${marginCls(d.margin)}">${d.margin !== null ? d.margin.toFixed(1) + "%" : "—"}</span></td>
        <td class="r num">${d.foodCostPct !== null ? d.foodCostPct.toFixed(2) + "%" : "—"}</td></tr>
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
  $("#menuChart", view).addEventListener("click", () => { M.chart = !M.chart; rerender(); });
  if (M.chart) renderMenuMonthly(view, fresh);
  if (M.open) renderDishDetail(view, M.open, range, fresh);
  // Syrve's cost prices arrive a batch per request: ask again until all are in (or 20 tries)
  clearTimeout(S.menuRetry);
  if (r.pricesPending && (S.menuTries = (S.menuTries || 0) + 1) <= 20) {
    S.menuRetry = setTimeout(() => { if (S.tab === "menu") { delete S.syrve["menu" + q]; renderMenu(view, demo).catch(() => {}); } }, 3000);
  } else if (!r.pricesPending) S.menuTries = 0;
}

// Month by month for the chosen category (6 or 12 months, this month included): items sold, revenue,
// average margin (on the cost Syrve booked at the time of sale) or the best seller (its units, name on the bar).
async function renderMenuMonthly(view, fresh = false) {
  const box = $("#menuMonthly", view);
  if (!box) return;
  const M = S.menu, months = M.chartMonths || 6, metric = M.chartMetric || "sold";
  let r;
  try { r = await loadSyrve("menu/monthly", `?months=${months}`, fresh); }
  catch (e) { box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; return; }
  if (!box.isConnected) return;

  const by = new Map(r.months.map(m => [m, { sold: 0, revenue: 0, mRev: 0, mCost: 0, dishes: new Map() }]));
  for (const x of r.rows) {
    const b = by.get(x.month);
    if (!b || (M.group && x.group !== M.group)) continue;
    b.sold += x.qty; b.revenue += x.revenue;
    if (x.revenue > 0 && x.cost > 0) { b.mRev += x.revenue; b.mCost += x.cost; } // like the box: only dishes with a cost
    const d = b.dishes.get(x.id) || { name: x.name, qty: 0, revenue: 0 };
    d.qty += x.qty; d.revenue += x.revenue;
    b.dishes.set(x.id, d);
  }
  const points = r.months.map(m => {
    const b = by.get(m), label = monthLabel(m, true), full = monthLabel(m);
    if (metric === "revenue") return { label, value: b.revenue, text: compact(b.revenue), tip: `${full}: ${money(b.revenue)}` };
    if (metric === "margin") {
      const nv = b.mRev / (1 + r.vat), v = nv ? (nv - b.mCost) / nv * 100 : null;
      return { label, value: Math.max(0, v ?? 0), text: v === null ? "—" : v.toFixed(1) + "%", tip: `${full}: ${v === null ? "—" : v.toFixed(1) + "%"}` };
    }
    if (metric === "best") {
      const top = [...b.dishes.values()].sort((a, c) => c.qty - a.qty || c.revenue - a.revenue)[0];
      return top && top.qty > 0
        ? { label, value: top.qty, text: top.name, tip: `${full}: ${top.name} — ${qtyFmt(top.qty)} · ${money(top.revenue)}` }
        : { label, value: 0, text: "—", tip: `${full}: —` };
    }
    return { label, value: b.sold, text: qtyFmt(b.sold), tip: `${full}: ${qtyFmt(b.sold)}` };
  });

  const seg = (attr, opts, cur) => `<div class="seg">${opts.map(([v, k]) => `<button type="button" data-${attr}="${v}" class="${String(cur) === v ? "on" : ""}">${esc(t(k))}</button>`).join("")}</div>`;
  box.innerHTML = `<div class="panel-head"><h3>${esc(t("by_month"))} · ${esc(M.group || t("all_groups"))}</h3>
      <div class="mm-ctl">${seg("metric", [["sold", "items_sold"], ["revenue", "revenue"], ["margin", "avg_margin"], ["best", "best_seller"]], metric)}
        ${seg("months", [["6", "pick_6m"], ["12", "pick_12m"]], months)}</div></div>
    <div class="panel-body">${barChart(points, { height: 240, width: panelWidth(false) })}</div>
    ${metric === "margin" ? `<div class="rcp-note">${esc(t("monthly_margin_note"))}</div>` : ""}`;
  wireChartHover(box);
  $$("[data-metric]", box).forEach(b => b.addEventListener("click", () => { M.chartMetric = b.dataset.metric; renderMenuMonthly(view); }));
  $$("[data-months]", box).forEach(b => b.addEventListener("click", () => { M.chartMonths = Number(b.dataset.months); renderMenuMonthly(view); }));
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
  const star = x => (x.estimated ? "*" : "");

  const treeRows = (nodes, level, parent) => nodes.map((x, i) => {
    const key = parent + "/" + i, open = !M.closed.has(key);
    return `<tr class="${x.semi ? "semi" : level ? "child" : ""}">
      <td style="padding-left:${12 + level * 22}px">${x.semi ? `<button type="button" class="tw" data-toggle="${key}">${open ? "▾" : "▸"}</button>` : `<span class="tw"></span>`}${esc(x.name)}${x.semi ? ` <span class="tag">${esc(t("semi"))}</span>` : ""}${x.semi && x.priced === "stock" ? ` <span class="muted small">· ${esc(t("stock_priced"))}</span>` : ""}</td>
      <td class="r num">${qtyFmt(x.qty)} ${esc(x.unit)}</td>
      <td class="r num">${x.unitCost !== null ? m2(x.unitCost) + star(x) + unitOf(x.unit) : "—"}</td>
      <td class="r num">${x.cost !== null ? m2(x.cost) + star(x) : `<span class="bad-text">—</span>`}</td></tr>` + (x.semi && open ? treeRows(x.children, level + 1, key) : "");
  }).join("");
  const total = n(d.tree.cost);
  const flatTotal = d.flat.reduce((a, x) => a + n(x.cost), 0);
  const treeHtml = () => `<table class="rcp"><thead><tr><th>${esc(t("ingredient"))}</th><th class="r">${esc(t("qty"))}</th><th class="r">${esc(t("unit_price"))}</th><th class="r">${esc(t("value"))}</th></tr></thead>
    <tbody>${treeRows(d.tree.children, 0, "")}</tbody><tfoot><tr><td colspan="3">${esc(t("total_cost"))}</td><td class="r num">${m2(total)}</td></tr></tfoot></table>
    <div class="rcp-note">${esc(t("tree_note"))}</div>`;
  const flatHtml = () => `<table class="rcp"><thead><tr><th>${esc(t("raw"))}</th><th class="r">${esc(t("qty"))}</th><th class="r">${esc(t("unit_price"))}</th><th class="r">${esc(t("value"))}</th><th>${esc(t("share"))}</th></tr></thead>
    <tbody>${d.flat.map(x => { const pct = total ? Math.round(n(x.cost) / total * 100) : 0; return `<tr><td>${esc(x.name)}</td><td class="r num">${qtyFmt(x.qty)} ${esc(x.unit)}</td>
      <td class="r num">${x.unitCost !== null ? m2(x.unitCost) + star(x) + unitOf(x.unit) : "—"}</td><td class="r num">${x.missing ? `<span class="bad-text">—</span>` : m2(x.cost) + star(x)}</td>
      <td><span class="share"><i style="width:${pct}%"></i></span><span class="muted small">${pct}%</span></td></tr>`; }).join("")}</tbody>
    <tfoot><tr><td colspan="3">${esc(t("total_cost"))}</td><td class="r num">${m2(flatTotal)}</td><td></td></tr></tfoot></table>
    <div class="rcp-note">${esc(t("flat_note"))}${Math.abs(flatTotal - total) > 0.005 ? "<br>" + esc(t("flat_differs").replace("{a}", m2(flatTotal)).replace("{b}", m2(total))) : ""}</div>`;

  const s = d.sales || {};
  const chart = (range.from === range.to ? (s.byHour || []).map(h => ({ label: pad(h.hour) + ":00", value: h.qty, tip: `${pad(h.hour)}:00 — ${qtyFmt(h.qty)} · ${money(h.revenue)}` }))
    : (() => { const pts = []; for (let day = range.from; day <= range.to; day = shiftDay(day, 1)) { const x = (s.byDay || []).find(v => v.day === day) || { qty: 0, revenue: 0 }; pts.push({ label: dm(day), value: x.qty, tip: `${dmy(day)} — ${qtyFmt(x.qty)} · ${money(x.revenue)}` }); } return pts; })());

  const draw = () => {
    box.innerHTML = `<div class="dish-head"><div><h3>${esc(d.name)}</h3>
        <div class="muted small">${esc(t("one_unit"))}${d.unit ? " (" + esc(d.unit) + ")" : ""} · ${esc(t("sold"))}: <b>${qtyFmt(d.sold)}</b>${d.rank ? ` · ${esc(t("rank"))} #${d.rank}` : ""}</div>
        <div class="seg">${["tree", "flat"].map(v => `<button type="button" data-view="${v}" class="${M.view === v ? "on" : ""}">${esc(t("recipe_" + v))}</button>`).join("")}</div></div>
      <div class="dish-kpis"><div><b>${d.price ? m2(d.price) : "—"}</b><span>${esc(t("price_vat"))}</span></div><div><b>${d.cost !== null ? m2(d.cost) + (d.costEstimated ? "*" : "") : "—"}</b><span>${esc(t("cost_short"))}</span></div>
        <div><b class="${marginCls(d.margin)}-text">${d.margin !== null ? d.margin.toFixed(1) + "%" : "—"}</b><span>${esc(t("margin_novat"))}</span></div><div><b>${d.foodCostPct !== null ? d.foodCostPct.toFixed(2) + "%" : "—"}</b><span>${esc(t("food_cost_vat"))}</span></div></div></div>
      ${anyMissing ? `<div class="notice">${esc(t("missing_price"))}</div>` : ""}
      ${d.tree.estimated || d.flat.some(x => x.estimated) ? `<div class="rcp-note">${esc(t("estimated_note"))}</div>` : ""}
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
// rs.ge waybills − our return waybills − BOG / TBC transfers, per supplier (debts.js). A transfer goes to a
// supplier by identification code first, by name only after the CEO confirms. Four subtabs:
// 1 debts per supplier · 2 transfers without a waybill („ვინ არის ეს?“) · 3 problems (recipients that match
// a supplier by name only, suppliers with no transfer at all) · 4 overpayments · 5 card payments (BOG card
// purchases: count for a supplier only after the CEO confirms). Answers go to /debts/decide.
const DEBT_TABS = ["debts", "nowb", "cards", "problems", "over"];

// a supplier's waybills, transfers and payments outside the bank (subtabs 1 and 4)
function debtDetailHtml(s) {
  const wbRows = s.waybills.map(([num, day, amount, st]) => `<tr><td class="num">${esc(num)}</td><td class="muted">${esc(day)}</td>
    <td class="r num">${money(amount)}</td><td class="muted small">${st === 1 ? "✓ " + esc(t("rs_confirmed")) : ""}</td></tr>`).join("");
  const txRows = s.transfers.map(([id, date, amount, who, purpose, how, scope, rk, , wbNum]) => `<tr><td class="muted">${esc(date)}</td><td class="r num">${money(amount)}</td>
    <td>${how === "card" ? "💳 " : ""}${esc(who)}<div class="muted small clip" title="${esc(purpose)}">${esc(purpose)}</div>
      ${how === "card" ? `<div class="small ${wbNum ? "muted" : "warn-text"}">${wbNum ? esc(t("cd_wb")) + " " + esc(wbNum) : "⏳ " + esc(t("cd_wait_wb"))}</div>` : ""}</td>
    <td><span class="pill ${how === "code" ? "good" : "neutral"}">${esc(t("how_" + how))}</span>${how === "card" && scope === "tx" ? ` <span class="muted small">${esc(t("cd_scope_once"))}</span>` : ""}
      ${how === "dec" || how === "card" ? `<button type="button" class="icon-btn dx-undo" data-rk="${esc(rk)}" data-scope="${esc(scope)}" data-id="${esc(id)}" title="${esc(t("undo"))}">↩</button>` : ""}
      ${how === "name" ? `<button type="button" class="icon-btn dx-notthis" data-rk="${esc(rk)}" data-tin="${esc(s.tin)}" title="${esc(t("not_this"))}">✕</button>` : ""}</td></tr>`).join("");
  const mRows = s.manualList.map(m => `<tr><td class="muted">${esc(m.date)}</td><td class="r num">${money(m.amount)}</td>
    <td>${esc(t("manual_paid"))}${m.comment ? `<div class="muted small">${esc(m.comment)}</div>` : ""}</td>
    <td><button type="button" class="icon-btn dx-mdel" data-id="${esc(m.id)}" title="${esc(t("delete"))}">✕</button></td></tr>`).join("");
  return `<div class="debt-detail">
    ${s.debtOk ? `<div class="notice">✓ ${esc(t("debt_ok"))} · ${esc(s.debtOk)} <button type="button" class="btn small dx-debt-off" data-tin="${esc(s.tin)}">${esc(t("undo"))}</button></div>` : ""}
    <div><h4>${esc(t("col_waybills"))} · ${s.waybills.length}</h4>
      <table class="mini"><tbody>${wbRows || `<tr><td class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody></table></div>
    <div><h4>${esc(t("transfers"))} · ${s.transfers.length + s.manualList.length}</h4>
      <table class="mini"><tbody>${txRows + mRows || `<tr><td class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody></table></div>
  </div>`;
}

async function renderDebts(view, demo, fresh = false, quiet = false) {
  if (!S.syrve.debts && !quiet) view.innerHTML = demo + `<div class="loading">${esc(t("loading"))}</div>`;
  const r = await loadSyrve("debts", "", fresh);
  const dt = DEBT_TABS.includes(S.debtTab) ? S.debtTab : "debts";
  const T = r.totals || {};
  const NW = r.noWaybill || { open: [], wait: [], other: [], otherTotal: 0 };
  const PR = r.problems || { name: [], none: [] };
  const OV = r.over || [];
  const CD = r.cards || { open: [], other: [], otherTotal: 0, openTotal: 0, paid: 0, paidTotal: 0, waiting: 0 };
  const sups = r.suppliers || [];
  const q = S.debtQuery.toLowerCase();
  const match = (...xs) => !q || xs.some(v => String(v ?? "").toLowerCase().includes(q));
  const wb = r.waybills || {};
  const bank = r.bank || { configured: {}, settings: {} };
  const connected = bank.configured.bog || bank.configured.tbc;
  const lastSync = bank.lastSyncAt ? new Date(bank.lastSyncAt) : null;
  const sellerName = new Map((r.sellers || []).map(s => [s.tin, s.name]));

  // notices about the bank and rs.ge
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
  if (wb.configured === false) notices += `<div class="notice bad">📄 ${esc(t("rsge_not_connected"))}</div>`;
  else if (wb.configured && !wb.from && !(connected && !bank.settings.historyFrom)) notices += `<div class="notice">📄 ${esc(t("rsge_need_start"))}</div>`;
  if (wb.error) notices += `<div class="notice bad">rs.ge: ${esc(wb.error)}</div>`;
  else if (wb.pending) notices += `<div class="notice">⏳ ${esc(t("rsge_loading").replace("{a}", wb.months).replace("{b}", wb.total))}</div>`;
  if (wb.configured && wb.from && wb.returnsKnown === false) notices += `<div class="notice">${esc(t("rsge_no_returns"))}</div>`;
  notices += `<div id="bankProgress"></div>`;

  const nProblems = PR.name.length + PR.none.length;
  const tabLabel = { debts: `${t("dt_debts")} · ${money(r.total || 0)}`, nowb: `${t("dt_nowb")} · ${NW.open.length}`,
    cards: `💳 ${t("dt_cards")} · ${CD.open.length}`, problems: `${t("dt_problems")} · ${nProblems}`, over: `${t("dt_over")} · ${OV.length}` };
  const cards = card(t("total_owed"), money(r.total || 0), esc(t("dv_main_hint")), r.total > 0 ? "hero bad" : "hero") +
    card(t("col_waybills"), money(T.waybillSum || 0), `${T.waybills || 0} ${esc(t("wb_count"))} · ${T.suppliers || 0} ${esc(t("suppliers").toLowerCase())}`) +
    card(t("paid_all"), money((T.paid || 0) + (T.manual || 0)), T.returns ? `${esc(t("returns_col"))} ${money(T.returns)}` : "") +
    card(t("bank"), connected ? "✓" : "—", lastSync ? `${esc(t("last_sync"))} ${pad(lastSync.getHours())}:${pad(lastSync.getMinutes())}` : esc(t("bank_not_connected")));

  const who = x => `<b>${esc(x.name || "—")}</b><div class="muted small">${x.tin ? esc(t("tax_id")) + " " + esc(x.tin) : esc(x.iban || "")}</div>
    <div class="muted small clip" title="${esc(x.purpose || "")}">${esc(x.bank || "")} · ${esc(t("last"))} ${esc(x.last || "")} · ${esc(x.purpose || "")}</div>`;
  const txList = x => `<table class="mini"><tbody>${x.tx.map(([, date, amount, purpose]) => `<tr><td class="muted">${esc(date)}</td><td class="r num">${money(amount)}</td><td class="small">${esc(purpose)}</td></tr>`).join("")}</tbody></table>
    ${x.count > x.tx.length ? `<div class="muted small">${esc(t("showing_tx").replace("{a}", x.tx.length).replace("{b}", x.count))}</div>` : ""}`;
  const rkAttrs = x => `data-rk="${esc(x.rk)}" data-count="${x.count}" data-name="${esc(x.name || x.tin || x.iban || "")}"`;
  const open = key => S.debtOpen === key;
  const supRow = (s, cols, colspan) => `<tr class="pick" data-open="s:${esc(s.tin)}">${cols}</tr>${open("s:" + s.tin) ? `<tr class="sub"><td colspan="${colspan}">${debtDetailHtml(s)}</td></tr>` : ""}`;

  let body = "";
  if (dt === "debts") {
    const list = sups.filter(s => s.n && match(s.name, s.tin));
    const owedCell = s => s.owed > 0 ? `<b>${money(s.owed)}</b>` : s.owed < 0 ? `<span class="pill neutral">${esc(t("st_over"))}</span> ${money(-s.owed)}` : "—";
    const status = s => [s.none || s.versions.length ? `<span class="pill warn">⚠ ${esc(t("st_problem"))}</span>` : "",
      s.debtOk ? `<span class="pill neutral">✓ ${esc(t("st_debt_ok"))}</span>` : "",
      s.cardWait ? `<span class="pill neutral" title="${esc(t("cd_wait_wb"))}">💳 ⏳ ${s.cardWait}</span>` : ""].join(" ");
    body = `<div class="panel"><div class="table-wrap"><table>
      <thead><tr><th>${esc(t("supplier"))}</th><th class="r">${esc(t("col_waybills"))}</th><th class="r">${esc(t("returns_col"))}</th><th class="r">${esc(t("paid_all"))}</th><th class="r">${esc(t("owed"))}</th><th></th></tr></thead>
      <tbody>${list.map(s => supRow(s, `<td><b>${esc(s.name)}</b><div class="muted small">${esc(t("tax_id"))} ${esc(s.tin)}</div></td>
        <td class="r num">${money(s.amount)}<div class="muted small">${s.n} ${esc(t("wb_count"))}${s.nConfirmed ? ` · ${s.nConfirmed} ${esc(t("rs_confirmed"))}` : ""}</div></td>
        <td class="r num">${s.returns ? money(s.returns) : "—"}</td>
        <td class="r num">${s.paid || s.manual ? money(s.paid + s.manual) : "—"}${s.manual ? `<div class="muted small">${esc(t("manual_paid"))} ${money(s.manual)}</div>` : ""}</td>
        <td class="r num nowrap">${owedCell(s)}</td>
        <td class="nowrap">${status(s)} <span class="muted">${open("s:" + s.tin) ? "▴" : "▾"}</span></td>`, 6)).join("")
        || `<tr><td colspan="6" class="empty">${esc(t("no_debts"))}</td></tr>`}</tbody>
      ${list.length ? `<tfoot><tr><td>${esc(t("total_owed"))}</td><td class="r num">${money(T.waybillSum || 0)}</td><td class="r num">${money(T.returns || 0)}</td><td class="r num">${money((T.paid || 0) + (T.manual || 0))}</td><td class="r num">${money(r.total || 0)}</td><td></td></tr></tfoot>` : ""}
    </table></div></div>`;
  } else if (dt === "nowb") {
    const openRows = NW.open.filter(x => match(x.name, x.tin, x.iban, x.purpose));
    const waitRows = NW.wait.filter(x => match(x.name, x.tin, x.iban, x.code));
    const otherRows = NW.other.filter(x => match(x.name, x.tin, x.iban, x.comment, x.purpose));
    const scopeTag = x => x.scope === "tx" ? ` <span class="pill neutral">${esc(t("only_these"))}</span>` : "";
    body = `<div class="panel">
        <div class="panel-head"><h3>${esc(t("nw_open"))} · ${openRows.length}</h3><span class="muted small">${esc(t("nw_open_hint"))}</span></div>
        <div class="table-wrap"><table class="edit review">
          <thead><tr><th>${esc(t("recipient"))}</th><th class="r">${esc(t("transfers"))}</th><th class="r">${esc(t("amount"))}</th><th></th></tr></thead>
          <tbody>${openRows.map(x => `<tr class="pick" data-open="r:${esc(x.rk)}" ${rkAttrs(x)}><td>${who(x)}</td><td class="r num">${x.count}</td>
            <td class="r num nowrap"><b>${money(x.amount)}</b></td>
            <td class="r nowrap rv-actions"><button type="button" class="btn small primary dw-who">${esc(t("who_q"))}</button></td></tr>
            ${open("r:" + x.rk) ? `<tr class="sub"><td colspan="4">${txList(x)}</td></tr>` : ""}`).join("")
            || `<tr><td colspan="4" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        </table></div></div>
      <div class="panel">
        <div class="panel-head"><h3>⏳ ${esc(t("nw_wait"))} · ${waitRows.length}</h3><span class="muted small">${esc(t("nw_wait_hint"))}</span></div>
        <div class="table-wrap"><table class="edit">
          <tbody>${waitRows.map(x => `<tr ${rkAttrs(x)} data-scope="${esc(x.scope)}" data-to="w:${esc(x.code)}"><td>${who(x)}</td>
            <td>${esc(t("code_ph"))}: <b class="num">${esc(x.code)}</b>${scopeTag(x)}</td><td class="r num">${x.count}</td>
            <td class="r num nowrap"><b>${money(x.amount)}</b></td>
            <td class="r"><button type="button" class="icon-btn dw-undo" title="${esc(t("undo"))}">↩</button></td></tr>`).join("")
            || `<tr><td class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        </table></div></div>
      <div class="panel">
        <div class="panel-head"><h3>${esc(t("cat_other"))} · ${otherRows.length} · ${money(NW.otherTotal || 0)}</h3><span class="muted small">${esc(t("other_hint"))}</span></div>
        <div class="table-wrap"><table class="edit">
          <thead><tr><th>${esc(t("recipient"))}</th><th class="r">${esc(t("transfers"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
          <tbody>${otherRows.map(x => `<tr ${rkAttrs(x)} data-scope="${esc(x.scope)}" data-to="x" data-comment="${esc(x.comment || "")}"><td>${who(x)}</td>
            <td class="r num">${x.count}</td><td class="r num nowrap"><b>${money(x.amount)}</b></td>
            <td class="small">${esc(x.comment || "")}${scopeTag(x)} <button type="button" class="icon-btn dw-note" title="${esc(t("comment"))}">✎</button></td>
            <td class="r"><button type="button" class="icon-btn dw-undo" title="${esc(t("undo"))}">↩</button></td></tr>`).join("")
            || `<tr><td colspan="5" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        </table></div></div>`;
  } else if (dt === "cards") {
    const openRows = CD.open.filter(c => match(c.shop, c.shopKa, c.last4, c.purpose, ...c.suggest.map(s => s.name + " " + s.tin + " " + s.num), ...c.names.map(s => s.name)));
    const otherRows = CD.other.filter(x => match(x.name, x.shopKa, x.comment));
    const gapLabel = g => g ? t("cd_days").replace("{n}", g) : t("cd_same_day");
    const shopCell = c => `<b>${esc(c.shop)}</b>${c.shopKa ? ` <span class="muted">${esc(c.shopKa)}</span>` : ""}
      <div class="muted small">${c.last4 ? `${esc(t("cd_card"))} ••${esc(c.last4)}` : ""}${c.mcc ? ` · MCC ${esc(c.mcc)}` : ""}${c.count > 1 ? ` · ${esc(t("cd_shop_n").replace("{n}", c.count))}` : ""}</div>`;
    const pick = c => `<select class="dc-sup" style="max-width:340px">
        ${c.suggest.length ? "" : `<option value="">${esc(t("cd_pick"))}</option>`}
        ${c.suggest.length ? `<optgroup label="${esc(t("cd_by_amount"))}">${c.suggest.map(s => `<option value="${esc(s.tin)}">${esc(s.name)} · ${esc(t("cd_wb"))} ${esc(s.num)} · ${esc(s.day)} (${esc(gapLabel(s.gap))})</option>`).join("")}</optgroup>` : ""}
        ${c.names.length ? `<optgroup label="${esc(t("cd_by_name"))}">${c.names.map(s => `<option value="${esc(s.tin)}">${esc(s.name)}</option>`).join("")}</optgroup>` : ""}
        <optgroup label="${esc(t("cd_all_sellers"))}">${(r.sellers || []).map(s => `<option value="${esc(s.tin)}">${esc(s.name)} · ${esc(s.tin)}</option>`).join("")}</optgroup>
      </select>${c.suggest.length
        ? `<div class="muted small">📄 ${esc(t("cd_wb"))} ${esc(c.suggest[0].num)} · ${esc(c.suggest[0].day)} · ${esc(gapLabel(c.suggest[0].gap))}${c.suggest.length > 1 ? ` · +${c.suggest.length - 1}` : ""}</div>`
        : `<div class="small warn-text">⚠ ${esc(t("cd_no_wb"))}</div>`}`;
    const scopeTag = x => x.scope === "tx" ? ` <span class="pill neutral">${esc(t("cd_scope_once"))}</span>` : "";
    body = `<div class="muted small" style="margin:-6px 0 14px">✓ ${esc(t("cd_confirmed"))}: ${CD.paid || 0} · ${money(CD.paidTotal || 0)}${CD.waiting ? ` · <span class="warn-text">⏳ ${esc(t("cd_wait_wb"))}: ${CD.waiting}</span>` : ""} — ${esc(t("cd_confirmed_hint"))}</div>
      <div class="panel">
        <div class="panel-head"><h3>💳 ${esc(t("cd_open"))} · ${openRows.length} · ${money(CD.openTotal || 0)}</h3><span class="muted small">${esc(t("cd_open_hint"))}</span></div>
        <div class="table-wrap"><table class="edit review">
          <thead><tr><th>${esc(t("cd_bought"))}</th><th>${esc(t("cd_shop"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("supplier"))}</th><th></th></tr></thead>
          <tbody>${openRows.map(c => `<tr data-id="${esc(c.id)}" data-rk="${esc(c.rk)}" data-name="${esc(c.shop)}" data-count="${c.count}">
            <td class="muted nowrap">${esc(c.buy)}</td><td>${shopCell(c)}</td>
            <td class="r num nowrap"><b>${money(c.amount)}</b></td>
            <td>${pick(c)}</td>
            <td class="r nowrap rv-actions"><button type="button" class="btn small primary dc-ok">✓ ${esc(t("confirm"))}</button>
              <button type="button" class="btn small dc-other">${esc(t("cat_other"))}</button></td></tr>`).join("")
            || `<tr><td colspan="5" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        </table></div></div>
      <div class="panel">
        <div class="panel-head"><h3>${esc(t("cd_other"))} · ${otherRows.length} · ${money(CD.otherTotal || 0)}</h3><span class="muted small">${esc(t("other_hint"))}</span></div>
        <div class="table-wrap"><table class="edit">
          <thead><tr><th>${esc(t("cd_shop"))}</th><th class="r">${esc(t("cd_payments"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("comment"))}</th><th></th></tr></thead>
          <tbody>${otherRows.map(x => `<tr data-rk="${esc(x.rk)}" data-scope="${esc(x.scope)}" data-to="x" data-comment="${esc(x.comment || "")}">
            <td>${shopCell({ shop: x.name, shopKa: x.shopKa, last4: x.last4 })}<div class="muted small">${esc(t("last"))} ${esc(x.last)}</div></td>
            <td class="r num">${x.count}</td><td class="r num nowrap"><b>${money(x.amount)}</b></td>
            <td class="small">${esc(x.comment || "")}${scopeTag(x)} <button type="button" class="icon-btn dw-note" title="${esc(t("comment"))}">✎</button></td>
            <td class="r"><button type="button" class="icon-btn dw-undo" title="${esc(t("undo"))}">↩</button></td></tr>`).join("")
            || `<tr><td colspan="5" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        </table></div></div>`;
  } else if (dt === "problems") {
    const nameRows = PR.name.filter(x => match(x.name, x.tin, x.iban, ...x.versions.map(v => v.name + " " + v.tin)));
    const noneRows = PR.none.filter(s => match(s.name, s.tin));
    const vLabel = v => `${v.name} · ${t("tax_id")} ${v.tin} · ${money(v.amount)}`;
    body = `<div class="panel">
        <div class="panel-head"><h3>⚠ ${esc(t("pr_name"))} · ${nameRows.length}</h3><span class="muted small">${esc(t("pr_name_hint"))}</span></div>
        <div class="table-wrap"><table class="edit review">
          <thead><tr><th>${esc(t("recipient"))}</th><th class="r">${esc(t("amount"))}</th><th>${esc(t("versions"))}</th><th></th></tr></thead>
          <tbody>${nameRows.map(x => `<tr class="pick" data-open="r:${esc(x.rk)}" ${rkAttrs(x)} data-tins="${esc(x.versions.map(v => v.tin).join(","))}"><td>${who(x)}</td>
            <td class="r num nowrap"><b>${money(x.amount)}</b><div class="muted small">${x.count} ${esc(t("tx_n"))}</div></td>
            <td><select class="dp-ver">${x.versions.map(v => `<option value="${esc(v.tin)}">${esc(vLabel(v))}</option>`).join("")}</select></td>
            <td class="r nowrap rv-actions"><button type="button" class="btn small primary dp-ok">${esc(t("confirm"))}</button>
              <button type="button" class="btn small dp-manual">${esc(t("no_version"))}</button>
              <button type="button" class="btn small ghost dp-reject">${esc(t("none_of_these"))}</button></td></tr>
            ${open("r:" + x.rk) ? `<tr class="sub"><td colspan="4">${txList(x)}</td></tr>` : ""}`).join("")
            || `<tr><td colspan="4" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        </table></div></div>
      <div class="panel">
        <div class="panel-head"><h3>⚠ ${esc(t("pr_none"))} · ${noneRows.length}</h3><span class="muted small">${esc(t("pr_none_hint"))}</span></div>
        <div class="table-wrap"><table class="edit review">
          <thead><tr><th>${esc(t("supplier"))}</th><th class="r">${esc(t("col_waybills"))}</th><th class="r">${esc(t("owed"))}</th><th></th></tr></thead>
          <tbody>${noneRows.map(s => `<tr data-tin="${esc(s.tin)}" data-name="${esc(s.name)}"><td><b>${esc(s.name)}</b><div class="muted small">${esc(t("tax_id"))} ${esc(s.tin)}</div>
              ${s.versions.length ? `<div class="muted small">${esc(t("looks_like"))} ${s.versions.map(v => `${esc(v.name)} (${esc(v.tin || "—")}, ${money(v.amount)})`).join(", ")} — ${esc(t("see_above"))}</div>` : ""}
              ${s.cards ? `<div class="small warn-text">💳 ${esc(t("cd_none_hint").replace("{n}", s.cards))}</div>` : ""}</td>
            <td class="r num">${money(s.amount)}<div class="muted small">${s.n} ${esc(t("wb_count"))}</div></td>
            <td class="r num nowrap"><b>${money(s.owed)}</b></td>
            <td class="r nowrap rv-actions"><button type="button" class="btn small dn-manual">${esc(t("type_manually"))}</button>
              <button type="button" class="btn small primary dn-debt">${esc(t("confirm_debt"))}</button></td></tr>`).join("")
            || `<tr><td colspan="4" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
        </table></div></div>`;
  } else {
    const list = OV.filter(s => match(s.name, s.tin));
    const full = new Map(sups.map(s => [s.tin, s]));
    body = `<div class="muted small" style="margin:-6px 0 14px">${esc(t("over_hint"))}</div>
      <div class="panel"><div class="table-wrap"><table>
      <thead><tr><th>${esc(t("supplier"))}</th><th class="r">${esc(t("col_waybills"))}</th><th class="r">${esc(t("returns_col"))}</th><th class="r">${esc(t("paid_all"))}</th><th class="r">${esc(t("excess"))}</th><th></th></tr></thead>
      <tbody>${list.map(o => supRow(full.get(o.tin) || { ...o, waybills: [], transfers: [], manualList: [] }, `<td><b>${esc(o.name)}</b><div class="muted small">${esc(t("tax_id"))} ${esc(o.tin)}</div></td>
        <td class="r num">${o.n ? money(o.amount) : "—"}${o.n ? `<div class="muted small">${o.n} ${esc(t("wb_count"))}</div>` : ""}</td>
        <td class="r num">${o.returns ? money(o.returns) : "—"}</td><td class="r num">${money(o.paid + o.manual)}</td>
        <td class="r num nowrap"><b>${money(o.excess)}</b></td><td class="muted">${open("s:" + o.tin) ? "▴" : "▾"}</td>`, 6)).join("")
        || `<tr><td colspan="6" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
      ${list.length ? `<tfoot><tr><td colspan="4">${esc(t("excess"))}</td><td class="r num">${money(list.reduce((a, o) => a + o.excess, 0))}</td><td></td></tr></tfoot>` : ""}
    </table></div></div>`;
  }

  const settingsHtml = `<details class="panel bank-settings" ${connected && !bank.settings.historyFrom ? "open" : ""}>
      <summary class="panel-head"><h3>🏦 ${esc(t("bank_settings"))}</h3><span class="muted small">${connected ? `${bank.payments || 0} ${esc(t("payments_loaded"))} · ${bank.skipped || 0} ${esc(t("ignored"))}` : esc(t("bank_not_connected"))}</span></summary>
      <form class="form-row" id="bankForm">
        <label class="w-s">${esc(t("history_from"))}<input type="date" name="historyFrom" value="${esc(bank.settings?.historyFrom || "")}"></label>
        <label class="w-l">${esc(t("bog_accounts"))}<textarea name="bogAccounts" rows="2" placeholder="GE00BG0000000000000000">${esc((bank.settings?.bogAccounts || []).join("\n"))}</textarea></label>
        <button class="btn primary" type="submit">${esc(t("save"))}</button>
      </form>
      <div class="panel-body small muted">
        <div>BOG: ${bank.configured.bog ? "✓" : "—"} · TBC: ${bank.configured.tbc ? "✓ " + esc(t("tbc_auto")) : "—"}</div>
        <div>${esc(t("history_note"))}</div>
      </div>
    </details>`;

  view.innerHTML = demo + head(t("tab_debts"), t("debts_sub"),
    `<input type="text" id="debtSearch" placeholder="${esc(t("search"))}…" value="${esc(S.debtQuery)}"><button class="btn" id="debtRefresh">${esc(t("refresh"))}</button><button class="btn" id="debtExport">${esc(t("export"))}</button>`) +
    notices +
    `<div class="seg debt-views">${DEBT_TABS.map(v => `<button type="button" data-dt="${v}" class="${v === dt ? "on" : ""}">${esc(tabLabel[v])}</button>`).join("")}</div>
    <div class="cards">${cards}</div>
    ${body}
    ${settingsHtml}`;

  const rerender = () => renderDebts(view, demo, false, true).catch(e => toast(e.message));
  const decide = async body => {
    try { await api("/debts/decide", { method: "POST", body }); toast(t("saved")); S.syrve.debts = null; await renderDebts(view, demo, false, true); }
    catch (e) { toast(e.message); }
  };
  $$("[data-dt]", view).forEach(b => b.addEventListener("click", () => { S.debtTab = b.dataset.dt; store.set("dash_debt_tab", S.debtTab); S.debtOpen = ""; rerender(); }));
  // a row opens its details; clicks on its buttons, selects and inputs don't
  $$("tr[data-open]", view).forEach(tr => tr.addEventListener("click", e => {
    if (e.target.closest("button, select, input, textarea, .remember")) return;
    S.debtOpen = S.debtOpen === tr.dataset.open ? "" : tr.dataset.open; rerender();
  }));
  // rs.ge months arrive a few per request: ask again until all are in (or 20 tries)
  clearTimeout(S.debtRetry);
  if (wb.pending && (S.debtTries = (S.debtTries || 0) + 1) <= 20) {
    S.debtRetry = setTimeout(() => { if (S.tab === "debts") { S.syrve.debts = null; renderDebts(view, demo, false, true).catch(() => {}); } }, 1500);
  } else if (!wb.pending) S.debtTries = 0;

  // search / refresh / export
  const sEl = $("#debtSearch", view);
  sEl.addEventListener("input", () => { S.debtQuery = sEl.value; renderDebts(view, demo).then(() => { const x = $("#debtSearch"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }); });
  $("#debtRefresh", view).addEventListener("click", () => renderDebts(view, demo, true).catch(e => toast(e.message)));
  $("#debtExport", view).addEventListener("click", () => {
    const out = [[t("dt_" + dt)]];
    if (dt === "debts") {
      out.push([t("supplier"), t("tax_id"), t("wb_count"), t("col_waybills"), t("returns_col"), t("paid_bank"), t("manual_paid"), t("owed")]);
      sups.filter(s => s.n).forEach(s => out.push([s.name, s.tin, s.n, s.amount, s.returns, s.paid, s.manual, s.owed]));
      out.push([t("total_owed"), "", T.waybills || 0, T.waybillSum || 0, T.returns || 0, T.paid || 0, T.manual || 0, r.total || 0]);
    } else if (dt === "nowb") {
      out.push([t("recipient"), t("tax_id"), t("transfers"), t("amount"), t("status"), t("comment")]);
      NW.open.forEach(x => out.push([x.name, x.tin || x.iban, x.count, x.amount, "", x.purpose]));
      NW.wait.forEach(x => out.push([x.name, x.tin || x.iban, x.count, x.amount, t("nw_wait") + " " + x.code, ""]));
      NW.other.forEach(x => out.push([x.name, x.tin || x.iban, x.count, x.amount, t("cat_other"), x.comment || ""]));
    } else if (dt === "cards") {
      out.push([t("cd_bought"), t("cd_shop"), t("cd_card"), t("amount"), t("status"), t("supplier"), t("comment")]);
      CD.open.forEach(c => out.push([c.buy, c.shop + (c.shopKa ? " / " + c.shopKa : ""), c.last4, c.amount, t("cd_open"),
        c.suggest.map(s => `${s.name} (${s.tin}) ${s.num} ${s.day}`).join("; "), ""]));
      CD.other.forEach(x => x.tx.forEach(([, day, amount]) => out.push([day, x.name + (x.shopKa ? " / " + x.shopKa : ""), x.last4, amount, t("cat_other"), "", x.comment || ""])));
      sups.forEach(s => s.transfers.filter(tr => tr[5] === "card").forEach(tr => out.push([tr[1], tr[3], tr[8], tr[2], t("cd_confirmed"), `${s.name} (${s.tin})`, tr[9] ? t("cd_wb") + " " + tr[9] : t("cd_wait_wb")])));
    } else if (dt === "problems") {
      out.push([t("pr_name")], [t("recipient"), t("tax_id"), t("transfers"), t("amount"), t("versions")]);
      PR.name.forEach(x => out.push([x.name, x.tin || x.iban, x.count, x.amount, x.versions.map(v => `${v.name} (${v.tin})`).join(", ")]));
      out.push([], [t("pr_none")], [t("supplier"), t("tax_id"), t("wb_count"), t("col_waybills"), t("owed")]);
      PR.none.forEach(s => out.push([s.name, s.tin, s.n, s.amount, s.owed]));
    } else {
      out.push([t("supplier"), t("tax_id"), t("col_waybills"), t("returns_col"), t("paid_all"), t("excess")]);
      OV.forEach(o => out.push([o.name, o.tin, o.amount, o.returns, o.paid + o.manual, o.excess]));
    }
    exportXlsx(`debts-${dt}-${todayISO()}.xlsx`, t("tab_debts"), out);
  });

  // details: undo a decision, delete a payment outside the bank, undo "the debt is right"
  $$(".dx-undo", view).forEach(b => b.addEventListener("click", () =>
    decide(b.dataset.scope === "tx" ? { kind: "undo", ids: [b.dataset.id] } : { kind: "undo", rk: b.dataset.rk, scope: "rcp" })));
  $$(".dx-mdel", view).forEach(b => b.addEventListener("click", () => { if (confirmDel()) decide({ kind: "manualDel", id: b.dataset.id }); }));
  $$(".dx-debt-off", view).forEach(b => b.addEventListener("click", () => decide({ kind: "debt", tin: b.dataset.tin, on: false })));
  // an automatic exact-name match that is wrong: "not this supplier" (its transfers go to subtab 2)
  $$(".dx-notthis", view).forEach(b => b.addEventListener("click", () => decide({ kind: "reject", rk: b.dataset.rk, tins: [b.dataset.tin] })));

  // "only these N transfers" or this recipient always (future transfers too)
  const askScope = (cell, tr, to, comment, back) => {
    cell.innerHTML = `<div class="remember"><div class="q">${esc(t("scope_q").replace("{name}", tr.dataset.name))}</div>
      <button type="button" class="btn small primary sc-all">${esc(t("scope_all"))}</button>
      <button type="button" class="btn small sc-once">${esc(t("scope_once").replace("{n}", tr.dataset.count))}</button>
      <button type="button" class="btn small ghost rm-cancel">✕</button></div>`;
    $(".sc-all", cell).addEventListener("click", () => decide({ kind: "assign", rk: tr.dataset.rk, to, comment }));
    $(".sc-once", cell).addEventListener("click", () => decide({ kind: "assign", rk: tr.dataset.rk, to, comment, once: true }));
    $(".rm-cancel", cell).addEventListener("click", back);
  };
  const commentStep = (cell, title, next, back, value = "") => {
    cell.innerHTML = `<div class="remember"><div class="q">${esc(title)}</div>
      <textarea class="x-note" rows="2" maxlength="300" placeholder="${esc(t("comment_ph"))}">${esc(value)}</textarea>
      <button type="button" class="btn small primary x-ok">${esc(t("save"))}</button>
      <button type="button" class="btn small ghost rm-cancel">✕</button></div>`;
    $(".x-note", cell).focus();
    $(".x-ok", cell).addEventListener("click", () => next($(".x-note", cell).value.trim()));
    $(".rm-cancel", cell).addEventListener("click", back);
  };
  // a typed identification code: a supplier with waybills → it counts; no waybill yet → being created, or never (other expense)
  const codeStep = (cell, tr, back) => {
    cell.innerHTML = `<div class="remember"><div class="q">${esc(t("code_q"))}</div>
      <input type="text" class="x-code" inputmode="numeric" maxlength="20" placeholder="${esc(t("code_ph"))}">
      <button type="button" class="btn small primary x-ok">${esc(t("code_next"))}</button>
      <button type="button" class="btn small ghost rm-cancel">✕</button></div>`;
    const inp = $(".x-code", cell);
    inp.focus();
    $(".rm-cancel", cell).addEventListener("click", back);
    $(".x-ok", cell).addEventListener("click", () => {
      const code = inp.value.replace(/\s+/g, "");
      if (!/^[0-9A-Za-z]{2,20}$/.test(code)) { toast(t("code_ph")); return; }
      if (sellerName.has(code)) return askScope(cell, tr, "s:" + code, "", back);
      cell.innerHTML = `<div class="remember"><div class="q">${esc(t("code_unknown").replace("{code}", code))}</div>
        <button type="button" class="btn small primary cu-wait">${esc(t("opt_wait"))}</button>
        <button type="button" class="btn small cu-never">${esc(t("opt_never"))}</button>
        <button type="button" class="btn small ghost rm-cancel">✕</button></div>`;
      $(".cu-wait", cell).addEventListener("click", () => askScope(cell, tr, "w:" + code, "", back));
      $(".cu-never", cell).addEventListener("click", () => commentStep(cell, t("cat_other"), c => askScope(cell, tr, "x", c, back), back));
      $(".rm-cancel", cell).addEventListener("click", back);
    });
  };

  // subtab 2: „ვინ არის ეს?“ → find waybills (type the code) / there is no waybill (other expense + comment)
  $$(".dw-who", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr"), cell = b.parentElement;
    const back = rerender;
    cell.innerHTML = `<div class="remember"><div class="q">${esc(t("who_q"))}</div>
      <button type="button" class="btn small primary wq-find">${esc(t("opt_find"))}</button>
      <button type="button" class="btn small wq-none">${esc(t("opt_none"))}</button>
      <button type="button" class="btn small ghost rm-cancel">✕</button></div>`;
    $(".wq-find", cell).addEventListener("click", () => codeStep(cell, tr, back));
    $(".wq-none", cell).addEventListener("click", () => commentStep(cell, t("cat_other"), c => askScope(cell, tr, "x", c, back), back));
    $(".rm-cancel", cell).addEventListener("click", back);
  }));
  $$(".dw-undo", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr");
    decide({ kind: "undo", rk: tr.dataset.rk, scope: tr.dataset.scope, to: tr.dataset.to });
  }));
  $$(".dw-note", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr"), cell = b.parentElement;
    commentStep(cell, t("comment"), c => decide({ kind: "comment", rk: tr.dataset.rk, scope: tr.dataset.scope, comment: c }), rerender, tr.dataset.comment);
  }));

  // subtab „ბარათით“: confirm the chosen supplier, or other expense (+ comment); then this shop always or only this payment
  const cardScope = (cell, tr, to, comment) => {
    cell.innerHTML = `<div class="remember"><div class="q">${esc(t("cd_scope_q").replace("{name}", tr.dataset.name))}</div>
      <button type="button" class="btn small primary sc-all">${esc(t("cd_scope_all"))}${Number(tr.dataset.count) > 1 ? ` · ${esc(tr.dataset.count)}` : ""}</button>
      <button type="button" class="btn small sc-once">${esc(t("cd_scope_once"))}</button>
      <button type="button" class="btn small ghost rm-cancel">✕</button></div>`;
    $(".sc-all", cell).addEventListener("click", () => decide({ kind: "assign", rk: tr.dataset.rk, to, comment }));
    $(".sc-once", cell).addEventListener("click", () => decide({ kind: "assign", rk: tr.dataset.rk, to, comment, id: tr.dataset.id }));
    $(".rm-cancel", cell).addEventListener("click", rerender);
  };
  $$(".dc-ok", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr"), tin = $(".dc-sup", tr).value;
    if (!tin) { toast(t("cd_pick_need")); return; }
    cardScope(b.parentElement, tr, "s:" + tin, "");
  }));
  $$(".dc-other", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr"), cell = b.parentElement;
    commentStep(cell, t("cat_other"), c => cardScope(cell, tr, "x", c), rerender);
  }));

  // subtab 3, name matches: pick a version / no version → type the code / none of these (→ subtab 2)
  $$(".dp-ok", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr");
    askScope(b.parentElement, tr, "s:" + $(".dp-ver", tr).value, "", rerender);
  }));
  $$(".dp-manual", view).forEach(b => b.addEventListener("click", () => codeStep(b.parentElement, b.closest("tr"), rerender)));
  $$(".dp-reject", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr");
    decide({ kind: "reject", rk: tr.dataset.rk, tins: tr.dataset.tins.split(",").filter(Boolean) });
  }));
  // subtab 3, no transfer at all: type it (a recipient code and/or a payment outside the bank) / confirm the debt
  $$(".dn-manual", view).forEach(b => b.addEventListener("click", () => {
    const tr = b.closest("tr"), cell = b.parentElement;
    cell.innerHTML = `<div class="remember"><div class="q">${esc(t("type_manually"))} · ${esc(tr.dataset.name)}</div>
      <label class="tiny">${esc(t("manual_code"))}</label><input type="text" class="m-code" inputmode="numeric" maxlength="20" placeholder="${esc(t("code_ph"))}">
      <label class="tiny">${esc(t("manual_pay"))}</label>
      <input type="number" class="m-amount" min="0" step="0.01" placeholder="${esc(t("amount"))}">
      <input type="date" class="m-date" value="${todayISO()}">
      <textarea class="m-note" rows="2" maxlength="300" placeholder="${esc(t("comment_ph"))}"></textarea>
      <button type="button" class="btn small primary x-ok">${esc(t("save"))}</button>
      <button type="button" class="btn small ghost rm-cancel">✕</button></div>`;
    $(".m-code", cell).focus();
    $(".rm-cancel", cell).addEventListener("click", rerender);
    $(".x-ok", cell).addEventListener("click", () => {
      const code = $(".m-code", cell).value.replace(/\s+/g, ""), amount = $(".m-amount", cell).value;
      if (!code && !(Number(amount) > 0)) { toast(t("manual_need")); return; }
      decide({ kind: "manual", tin: tr.dataset.tin, code, amount, date: $(".m-date", cell).value, comment: $(".m-note", cell).value.trim() });
    });
  }));
  $$(".dn-debt", view).forEach(b => b.addEventListener("click", () => decide({ kind: "debt", tin: b.closest("tr").dataset.tin, on: true })));

  // bank settings
  $("#bankForm", view).addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    try {
      await api("/bank/settings", { method: "PUT", body: { historyFrom: f.get("historyFrom"), bogAccounts: String(f.get("bogAccounts") || "") } });
      toast(t("saved")); S.syrve.debts = null; await renderDebts(view, demo, false, true);
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
// Everything here is typed in by hand (saved as data "staff"): the employees (role, pay, personal ID / bank
// account for matching salary transfers, the date their salary counts from) and the shifts in the calendar
// (any number per day, from–to, overtime ₾, note). Debts leaves transfers to these employees out.
const PAY_TYPES = ["hour", "shift", "month"];
const empHours = s => { // a shift that ends before it starts goes past midnight
  const mins = x => { const m = String(x || "").match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
  const a = mins(s.from), b = mins(s.to);
  return isNaN(a) || isNaN(b) || a === b ? 0 : (b > a ? b - a : b + 1440 - a) / 60;
};
const fmtHours = h => (Math.round(h * 100) / 100).toLocaleString(S.lang === "ka" ? "ka-GE" : "en-US");

async function renderEmployees(view, demo) {
  const d = await loadData("staff");
  d.employees = d.employees || []; d.shifts = d.shifts || [];
  const ym = S.empMonth;
  const today = todayISO();
  const byId = Object.fromEntries(d.employees.map(e => [e.id, e]));
  const active = d.employees.filter(e => e.active !== false);
  const { html: todayHtml, count: todayCount } = whoWorksToday(d);
  const save = () => { saveData("staff"); renderEmployees(view, demo); };

  // calendar: click a day to edit its shifts
  const [y, m] = ym.split("-").map(Number);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday first
  const daysIn = new Date(y, m, 0).getDate();
  const byDay = {};
  d.shifts.forEach(s => { if (byId[s.emp]) (byDay[s.day] = byDay[s.day] || []).push(s); });
  const sortShifts = list => list.sort((a, b) => (a.from || "").localeCompare(b.from || "") || (byId[a.emp]?.name || "").localeCompare(byId[b.emp]?.name || ""));
  let cells = t("days").map(dn => `<div class="cal-head">${esc(dn)}</div>`).join("");
  for (let i = 0; i < lead; i++) cells += `<div class="cal-day out"></div>`;
  for (let dd = 1; dd <= daysIn; dd++) {
    const k = `${ym}-${pad(dd)}`;
    const list = sortShifts(byDay[k] || []);
    const shown = list.slice(0, 5);
    cells += `<div class="cal-day pick ${k === today ? "today" : ""} ${k === S.empDay ? "sel" : ""}" data-day="${k}"><div class="d">${dd}</div>
      ${shown.map(s => `<div class="who" title="${esc(byId[s.emp].name)} ${esc(s.from)}–${esc(s.to)}${n(s.ot) ? " · +" + money(s.ot) : ""}">${esc(s.from)} ${esc(byId[s.emp].name)}${n(s.ot) ? " +" : ""}</div>`).join("")}
      ${list.length > shown.length ? `<div class="more">+${list.length - shown.length}</div>` : ""}</div>`;
  }
  const trail = (7 - ((lead + daysIn) % 7)) % 7;
  for (let i = 0; i < trail; i++) cells += `<div class="cal-day out"></div>`;

  // the chosen day's shifts
  const dayList = S.empDay ? sortShifts(d.shifts.filter(s => s.day === S.empDay && byId[s.emp])) : [];
  const empOptions = sel => d.employees.filter(e => e.active !== false || e.id === sel)
    .map(e => `<option value="${esc(e.id)}" ${e.id === sel ? "selected" : ""}>${esc(e.name || "?")}${e.role ? " · " + esc(e.role) : ""}</option>`).join("");
  const dayHtml = !S.empDay ? "" : `<div class="panel" id="dayPanel"><div class="panel-head"><h3>${esc(t("day_shifts"))} · ${esc(S.empDay)}</h3>
      <div class="actions"><button class="btn small primary" id="shiftAdd" ${active.length ? "" : "disabled"}>${esc(t("add_shift"))}</button><button class="btn small ghost" id="dayClose">✕</button></div></div>
      ${active.length ? "" : `<div class="notice">${esc(t("add_emp_first"))}</div>`}
      <div class="table-wrap"><table class="edit">
        <thead><tr><th>${esc(t("employee"))}</th><th>${esc(t("from_t"))}</th><th>${esc(t("to_t"))}</th><th class="r">${esc(t("hours"))}</th><th class="r">${esc(t("overtime"))} ₾</th><th>${esc(t("note"))}</th><th></th></tr></thead>
        <tbody>${dayList.length ? dayList.map(s => `<tr data-shift="${esc(s.id)}">
          <td><select data-f="emp">${empOptions(s.emp)}</select></td>
          <td><input type="time" data-f="from" value="${esc(s.from)}"></td>
          <td><input type="time" data-f="to" value="${esc(s.to)}"></td>
          <td class="r num">${fmtHours(empHours(s))}</td>
          <td><input type="number" min="0" step="0.01" class="num" data-f="ot" value="${n(s.ot) || ""}" placeholder="0"></td>
          <td><input type="text" data-f="note" value="${esc(s.note || "")}" maxlength="200"></td>
          <td class="r"><button class="icon-btn shift-del" title="${esc(t("delete"))}">✕</button></td></tr>`).join("")
          : `<tr><td colspan="7" class="empty">${esc(t("nobody_today"))}</td></tr>`}</tbody>
      </table></div></div>`;

  // this month per employee
  const monthShifts = d.shifts.filter(s => (s.day || "").slice(0, 7) === ym && byId[s.emp]);
  const sumRows = d.employees.map(e => {
    const mine = monthShifts.filter(s => s.emp === e.id);
    return { e, shifts: mine.length, days: new Set(mine.map(s => s.day)).size, hours: mine.reduce((a, s) => a + empHours(s), 0), ot: mine.reduce((a, s) => a + n(s.ot), 0) };
  }).filter(x => x.shifts);

  // employees list
  const empRows = d.employees.map(e => `<tr data-emp="${esc(e.id)}" class="${e.active === false ? "muted" : ""}">
      <td><input type="text" data-f="name" value="${esc(e.name || "")}" maxlength="80"></td>
      <td><input type="text" data-f="role" value="${esc(e.role || "")}" maxlength="60"></td>
      <td><select data-f="pay">${PAY_TYPES.map(p => `<option value="${p}" ${p === (e.pay || "month") ? "selected" : ""}>${esc(t("pay_" + p))}</option>`).join("")}</select></td>
      <td><input type="number" min="0" step="0.01" class="num" data-f="rate" value="${n(e.rate) || ""}" placeholder="0"></td>
      <td><input type="text" data-f="pid" value="${esc(e.pid || "")}" maxlength="20"></td>
      <td><input type="text" data-f="iban" value="${esc(e.iban || "")}" maxlength="34" placeholder="GE00…"></td>
      <td><input type="date" data-f="from" value="${esc(e.from || "")}"></td>
      <td><input type="checkbox" data-f="active" ${e.active !== false ? "checked" : ""}></td>
      <td class="r"><button class="icon-btn emp-del" title="${esc(t("delete"))}">✕</button></td></tr>`).join("");

  view.innerHTML = demo + head(t("tab_employees"), t("employees_sub"), "") +
    `<div class="panel"><div class="panel-head"><h3>${esc(t("working_today"))} · ${esc(today)}</h3><span class="muted small">${todayCount}</span></div>
      <div class="panel-body">${todayHtml}</div></div>
    <div class="panel"><div class="panel-head"><h3>${esc(t("calendar"))}</h3>
      <div class="actions"><span class="muted small">${esc(t("click_day"))}</span><button class="btn small" id="empPrev">${t("prev")}</button><b>${esc(monthLabel(ym))}</b><button class="btn small" id="empNext">${t("next")}</button></div></div>
      <div class="calendar">${cells}</div></div>
    ${dayHtml}
    <div class="panel"><div class="panel-head"><h3>${esc(t("month_summary"))} · ${esc(monthLabel(ym))}</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>${esc(t("employee"))}</th><th>${esc(t("role"))}</th><th class="r">${esc(t("shifts_n"))}</th><th class="r">${esc(t("hours"))}</th><th class="r">${esc(t("overtime"))}</th></tr></thead>
        <tbody>${sumRows.length ? sumRows.map(x => `<tr><td>${esc(x.e.name || "?")}</td><td class="muted">${esc(x.e.role || "")}</td>
          <td class="r num">${x.shifts}${x.days !== x.shifts ? ` <span class="muted small">(${x.days} ${esc(t("days_n"))})</span>` : ""}</td>
          <td class="r num">${fmtHours(x.hours)}</td><td class="r num">${x.ot ? money(x.ot) : "—"}</td></tr>`).join("")
          : `<tr><td colspan="5" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
      </table></div></div>
    <div class="panel"><div class="panel-head"><h3>${esc(t("emp_list"))} · ${d.employees.length}</h3>
      <div class="actions"><button class="btn small primary" id="empAdd">${esc(t("add_emp"))}</button></div></div>
      <div class="table-wrap"><table class="edit">
        <thead><tr><th>${esc(t("name"))}</th><th>${esc(t("role"))}</th><th>${esc(t("pay_type"))}</th><th>${esc(t("rate"))} ₾</th><th>${esc(t("pid"))}</th><th>${esc(t("iban"))}</th><th>${esc(t("count_from"))}</th><th>${esc(t("active"))}</th><th></th></tr></thead>
        <tbody>${empRows || `<tr><td colspan="9" class="empty">${esc(t("no_entries"))}</td></tr>`}</tbody>
      </table></div>
      <div class="panel-body muted small">${esc(t("emp_hint"))}</div></div>`;

  $("#empPrev", view).addEventListener("click", () => { S.empMonth = ymShift(ym, -1); S.empDay = ""; renderEmployees(view, demo); });
  $("#empNext", view).addEventListener("click", () => { S.empMonth = ymShift(ym, 1); S.empDay = ""; renderEmployees(view, demo); });
  $$("[data-day]", view).forEach(c => c.addEventListener("click", () => {
    S.empDay = c.dataset.day; renderEmployees(view, demo).then(() => $("#dayPanel")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }));
  if (S.empDay) {
    $("#dayClose", view).addEventListener("click", () => { S.empDay = ""; renderEmployees(view, demo); });
    $("#shiftAdd", view).addEventListener("click", () => {
      const last = dayList[dayList.length - 1];
      const busy = new Set(dayList.map(s => s.emp));
      const emp = (active.find(e => !busy.has(e.id)) || active[0]).id;
      d.shifts.push({ id: uid(), emp, day: S.empDay, from: last?.from || "10:00", to: last?.to || "18:00", ot: 0, note: "" });
      save();
    });
    $$("tr[data-shift]", view).forEach(tr => {
      const s = d.shifts.find(x => x.id === tr.dataset.shift);
      $$("[data-f]", tr).forEach(inp => inp.addEventListener("change", () => {
        const f = inp.dataset.f;
        if ((f === "from" || f === "to") && !/^\d{2}:\d{2}$/.test(inp.value)) { toast(t("bad_time")); inp.value = s[f]; return; }
        s[f] = f === "ot" ? Math.max(0, n(inp.value)) : inp.value.trim();
        save();
      }));
      $(".shift-del", tr).addEventListener("click", () => { d.shifts = d.shifts.filter(x => x !== s); save(); });
    });
  }
  $("#empAdd", view).addEventListener("click", () => {
    d.employees.push({ id: uid(), name: "", role: "", pay: "month", rate: 0, pid: "", iban: "", from: "", active: true });
    saveData("staff");
    renderEmployees(view, demo).then(() => { const rows = $$("tr[data-emp]", view); $("[data-f=name]", rows[rows.length - 1])?.focus(); });
  });
  $$("tr[data-emp]", view).forEach(tr => {
    const e = byId[tr.dataset.emp];
    $$("[data-f]", tr).forEach(inp => inp.addEventListener("change", () => {
      const f = inp.dataset.f;
      if (f === "active") e.active = inp.checked;
      else if (f === "rate") e.rate = Math.max(0, n(inp.value));
      else if (f === "iban") e.iban = inp.value.replace(/\s+/g, "").toUpperCase();
      else e[f] = inp.value.trim();
      save();
    }));
    $(".emp-del", tr).addEventListener("click", () => {
      // someone with shifts is switched off instead: their shifts and salary history stay
      if (d.shifts.some(s => s.emp === e.id)) { e.active = false; toast(t("emp_deactivated")); }
      else d.employees = d.employees.filter(x => x !== e);
      save();
    });
  });
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
      staff: { employees: [
        { id: "e1", name: "ნინო ბერიძე", role: "მზარეული", pay: "month", rate: 1800, pid: "01001012345", iban: "", from: ymShift(ymNow(), -1) + "-01", active: true },
        { id: "e2", name: "გიორგი კაპანაძე", role: "მიმტანი", pay: "hour", rate: 9, pid: "", iban: "GE11TB0000000000000222", from: "", active: true },
        { id: "e3", name: "ანა ლომიძე", role: "პიცაიოლო", pay: "shift", rate: 90, pid: "", iban: "", from: "", active: true },
      ], shifts: [
        ...[1, 2, 3, 4, 6, 8, 9].map(dd => ({ id: "s1" + dd, emp: "e1", day: `${ymNow()}-${pad(dd)}`, from: "09:00", to: "17:00", ot: 0, note: "" })),
        ...[1, 3, 4, 5, 7].map(dd => ({ id: "s2" + dd, emp: "e2", day: `${ymNow()}-${pad(dd)}`, from: "16:00", to: "00:30", ot: dd === 3 ? 25 : 0, note: dd === 3 ? "დაგვიანებული დახურვა" : "" })),
        ...[2, 4, 6].map(dd => ({ id: "s3" + dd, emp: "e3", day: `${ymNow()}-${pad(dd)}`, from: "11:00", to: "23:00", ot: 0, note: "" })),
        { id: "st", emp: "e2", day: todayISO(), from: "12:00", to: "20:00", ot: 0, note: "" },
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
    return { id: "d1", name: "ფოკაჩა მარგარიტა", unit: "ც", sold: 41, rank: 2, price: 18, cost: 4.6, margin: 69.8, foodCostPct: 25.6, tree, flat,
      sales: { byHour: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h, i) => ({ hour: h, qty: [1, 2, 3, 6, 7, 4, 2, 2, 3, 4, 5, 2][i], revenue: [1, 2, 3, 6, 7, 4, 2, 2, 3, 4, 5, 2][i] * 18 })), byDay: [] } };
  }
  if (path.startsWith("/syrve/menu/monthly")) {
    const count = path.includes("months=12") ? 12 : 6, list = Array.from({ length: count }, (_, i) => ymShift(ymNow(), i - count + 1));
    const dishes = [["d0", "ფოკაჩა კლასიკური", "ფოკაჩა", 12, 2.9], ["d1", "ფოკაჩა მარგარიტა", "ფოკაჩა", 18, 4.6], ["d4", "ლიმონათი", "სასმელი", 7, 1.4], ["d5", "ესპრესო", "ყავა", 5, 0.9]];
    const rows = list.flatMap((month, i) => dishes.map(([id, name, group, price, cost], k) => {
      const qty = 120 + ((i * 37 + k * 53) % 90) - k * 20;
      return { month, id, name, group, qty, revenue: qty * price, cost: Math.round(qty * cost * (1 + i * 0.02) * 100) / 100 };
    }));
    return { months: list, rows, vat: 0.18 };
  }
  if (path.startsWith("/syrve/menu")) {
    const rows = [["ფოკაჩა კლასიკური", "ფოკაჩა", 58, 12, 2.9], ["ფოკაჩა მარგარიტა", "ფოკაჩა", 41, 18, 4.6], ["ფოკაჩა როზმარინით", "ფოკაჩა", 33, 13, 3.1],
      ["ფოკაჩა პროშუტოთი", "ფოკაჩა", 21, 24, 8.9], ["ლიმონათი", "სასმელი", 19, 7, 1.4], ["ესპრესო", "ყავა", 16, 5, 0.9], ["ფოკაჩა ტრიუფელით", "ფოკაჩა", 6, 28, 13.5], ["ტირამისუ", "დესერტი", 0, 14, 4.2]];
    const dishes = rows.map(([name, group, sold, price, cost], i) => { const nv = price / 1.18; return { id: "d" + i, name, group, unit: "ც", type: "DISH", sold, revenue: sold * price, cost, costPartial: false, hasRecipe: i !== 4,
      price, priceNoVat: Math.round(nv * 100) / 100, margin: Math.round((nv - cost) / nv * 1000) / 10, foodCostPct: Math.round(cost / price * 1000) / 10, rank: sold ? i + 1 : null }; });
    const qs = new URLSearchParams(path.split("?")[1] || ""), from = qs.get("from") || todayISO(), to = qs.get("to") || from;
    const salesDays = Math.round((new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) / 864e5) + 1;
    return { dishes, salesDays, totals: { sold: dishes.reduce((a, d) => a + d.sold, 0), revenue: dishes.reduce((a, d) => a + d.revenue, 0) }, recipesError: "", costError: "" };
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
    const qs = new URLSearchParams(path.split("?")[1] || ""), from = qs.get("from") || todayISO(), to = qs.get("to") || from;
    const days = Math.round((new Date(to + "T12:00:00") - new Date(from + "T12:00:00")) / 864e5) + 1;
    const hrs = []; for (let h = 9; h <= (days > 1 ? 21 : Math.max(10, now.getHours())); h++) hrs.push({ hour: h, sum: days * Math.round(300 + Math.random() * 900 + (h >= 12 && h <= 14 ? 800 : 0) + (h >= 19 ? 900 : 0)) });
    const total = hrs.reduce((a, h) => a + h.sum, 0);
    return { date: todayISO(), total, orders: Math.round(total / 38), byPayType: [{ name: "Card", sum: Math.round(total * 0.6) }, { name: "Cash", sum: Math.round(total * 0.25) }, { name: "გადარიცხვები", sum: Math.round(total * 0.1) }, { name: "B2B", sum: total - Math.round(total * 0.6) - Math.round(total * 0.25) - Math.round(total * 0.1) }, { name: "მარკეტინგი", sum: 64, notIncome: true }], byHour: hrs,
      byDay: Array.from({ length: 27 }, (_, i) => ({ day: shiftDay(todayISO(), -i), sum: 1500 + Math.round(Math.sin(i) * 500 + 600) })), salesDays: days, _at: Date.now() };
  }
  if (path.startsWith("/syrve/monthly")) {
    const months = []; for (let i = 11; i >= 0; i--) { const m = ymShift(ymNow(), -i); const inc = 52000 + Math.round(Math.sin(i) * 9000 + (11 - i) * 900); months.push({ month: m, income: i === 0 ? Math.round(inc * now.getDate() / 30) : inc, cash: Math.round(inc * 0.3), card: Math.round(inc * 0.7), credit: 0, cost: Math.round((i === 0 ? inc * now.getDate() / 30 : inc) * 0.31) }); }
    return { months };
  }
  if (path.startsWith("/syrve/debts")) {
    const r2 = x => Math.round(x * 100) / 100, d = n => shiftDay(todayISO(), -n);
    const tx = (rk, who, list, how = "code") => list.map(([days, amount, purpose], i) => [`bog:${rk}:${i}`, d(days), amount, who, purpose, how, how === "dec" ? "rcp" : "", rk]);
    const wbs = (tin, list) => list.map(([days, amount], i) => [`0${tin.slice(0, 4)}${String(812 + i * 37)}`, d(days), amount, i % 4 === 0 ? 1 : 0]);
    // [code, name, waybills [daysAgo, amount], returns, transfers, payments outside the bank, debt confirmed]
    const spec = [
      ["204567891", "შპს ნიკორა", [[2, 2420.5], [9, 3100], [16, 3400], [23, 3500]], 0, [...tx("t:204567891", "შპს ნიკორა", [[5, 4000, "ზედნადები 0457812"], [19, 5000, "ოქტომბრის ზედნადებები"]]), ...tx("i:GE29TB0000000000000123", "შპს „ნიკორა“", [[12, 500, "ზედნადები"]], "name"),
        ["bog:c1", d(4), 120, "Nikora ••3094", "გადახდა - თანხა: GEL120.00; ობიექტი: Nikora, Tbilisi; MCC:5411", "card", "rcp", "c:NIKORA", "3094", ""],
        ["bog:c0", d(9), 3100, "Nikora ••3094", "გადახდა - თანხა: GEL3100.00; ობიექტი: Nikora, Tbilisi; MCC:5411", "card", "tx", "c:NIKORA", "3094", "02045849"]], [], ""],
      ["205123456", "შპს სანტე ჯი-ემ-თი პროდაქტს", [[3, 1780], [10, 2200], [17, 2200]], 60, tx("t:205123456", "Sante GMT Products", [[6, 2500, "invoice"], [20, 1500, "invoice"]]), [], ""],
      ["400112233", "შპს ორი ნაბიჯი", [[4, 1200], [12, 1260], [25, 1000]], 0, [], [], ""],
      ["211334455", "შპს მეტრო", [[8, 890.4]], 0, [], [], todayISO()],
      ["01001012345", "ი/მ ნინო ფერმერი", [[11, 300]], 0, tx("t:01001012345", "ნინო ფერმერი", [[11, 300, "ბოსტნეული"], [3, 150, "ბოსტნეული"]]), [{ id: "m1", amount: 50, date: d(2), comment: "ნაღდი" }], ""],
    ];
    const name = { rk: "t:204999888", name: "შპს ორი ნაბიჯი ტრეიდი", tin: "204999888", iban: "", bank: "BOG", count: 3, amount: 1450, last: d(1), purpose: "ზედნადები #1017058856",
      tx: [["bog:x1", d(1), 650, "ზედნადები #1017058856"], ["bog:x2", d(9), 500, "ზედნადები"], ["bog:x3", d(21), 300, "ზედნადები"]] };
    // card payments waiting for the CEO („ბარათით“)
    const card = (id, days, amount, shop, shopKa, suggest, names = []) => ({ id, rk: "c:" + shop.toUpperCase(), date: d(days), buy: d(days), amount, shop, shopKa, last4: "3094", mcc: "5411",
      purpose: `გადახდა - თანხა: GEL${amount}; ობიექტი: ${shop}, Tbilisi`, count: 1, suggest, names });
    const openCards = [
      card("bog:c2", 8, 890.4, "Metro", "მეტრო", [{ tin: "211334455", name: "შპს მეტრო", num: "02113812", day: d(8), amount: 890.4, gap: 0 }]),
      card("bog:c3", 23, 1000, "Ori Nabiji", "ორი ნაბიჯი", [{ tin: "400112233", name: "შპს ორი ნაბიჯი", num: "04001886", day: d(25), amount: 1000, gap: 2 }]),
      card("bog:c4", 3, 156.14, "WFP.IT1", "", []),
      card("bog:c5", 1, 42.5, "Sante", "სანტე", [], [{ tin: "205123456", name: "შპს სანტე ჯი-ემ-თი პროდაქტს" }]),
    ];
    const cardOther = [{ rk: "c:DOMENEBI", name: "Domenebi", shopKa: "", last4: "3094", scope: "rcp", comment: "საიტის დომენი", count: 2, amount: 175, last: d(10),
      tx: [["bog:c6", d(10), 105, "Domenebi"], ["bog:c7", d(40), 70, "Domenebi"]] }];
    const suppliers = spec.map(([tin, nm, w, returns, transfers, manualList, debtOk]) => {
      const amount = r2(w.reduce((a, x) => a + x[1], 0)), paid = r2(transfers.reduce((a, x) => a + x[2], 0)), manual = r2(manualList.reduce((a, m) => a + m.amount, 0));
      const owed = r2(amount - returns - paid - manual);
      const versions = tin === "400112233" ? [{ rk: name.rk, name: name.name, tin: name.tin, amount: name.amount, count: name.count }] : [];
      return { tin, name: nm, n: w.length, nConfirmed: Math.ceil(w.length / 4), amount, returns, nReturns: returns ? 1 : 0, paid, manual,
        waybills: wbs(tin, w), transfers, manualList, owed, debtOk, none: !paid && !manual && owed > 0 && !debtOk, versions,
        cardWait: transfers.filter(x => x[5] === "card" && !x[9]).length, cards: openCards.filter(c => c.suggest.some(s => s.tin === tin)).length };
    }).sort((a, b) => b.owed - a.owed);
    const sup = tin => suppliers.find(s => s.tin === tin);
    name.versions = [{ tin: "400112233", name: sup("400112233").name, amount: sup("400112233").amount, n: sup("400112233").n }];
    const sum = f => r2(suppliers.reduce((a, s) => a + f(s), 0));
    const group = (rk, nm, tin, iban, rows, extra = {}) => ({ rk, name: nm, tin, iban, bank: iban.includes("TB") ? "TBC" : "BOG", count: rows.length,
      amount: r2(rows.reduce((a, x) => a + x[1], 0)), last: d(rows[0][0]), purpose: rows[0][2], tx: rows.map(([days, amount, p], i) => [`${rk}:${i}`, d(days), amount, p]), ...extra });
    const other = [group("t:406111222", "შპს სახლი", "406111222", "", [[2, 1500, "ქირა ნოემბერი"], [32, 1500, "ქირა ოქტომბერი"]], { scope: "rcp", comment: "ქირა" })];
    return { total: sum(s => Math.max(0, s.owed)),
      totals: { waybills: sum(s => s.n), waybillSum: sum(s => s.amount), returns: sum(s => s.returns), paid: sum(s => s.paid), manual: sum(s => s.manual),
        suppliers: suppliers.length, owing: suppliers.filter(s => s.owed > 0).length },
      suppliers,
      noWaybill: { open: [group("i:GE33TB0000000000000003", "Giorgi Beridze", "", "GE33TB0000000000000003", [[6, 150, "transfer"], [14, 100, "transfer"]]),
          group("t:01017050319", "ი/მ ელენე რატიშვილი", "01017050319", "", [[1, 700, "მარკეტინგი"]])],
        wait: [group("t:405999111", "შპს ახალი პური", "405999111", "", [[2, 320, "პური"]], { scope: "rcp", code: "405999111" })],
        other, otherTotal: r2(other.reduce((a, g) => a + g.amount, 0)) },
      problems: { name: [name], none: suppliers.filter(s => s.none).map(s => ({ tin: s.tin, name: s.name, n: s.n, amount: s.amount, returns: s.returns, owed: s.owed, versions: s.versions, cards: s.cards })) },
      cards: { open: openCards, other: cardOther, otherTotal: 175, openTotal: r2(openCards.reduce((a, c) => a + c.amount, 0)), paid: 2, paidTotal: 3220, waiting: 1 },
      over: suppliers.filter(s => s.owed < 0).map(s => ({ tin: s.tin, name: s.name, n: s.n, amount: s.amount, returns: s.returns, paid: s.paid, manual: s.manual, excess: r2(-s.owed) })),
      sellers: suppliers.map(s => ({ tin: s.tin, name: s.name })),
      waybills: { configured: true, from: "2026-03-01", months: 9, total: 9, pending: false, error: "", returnsKnown: true },
      bank: { configured: { bog: true, tbc: true }, settings: { historyFrom: "2026-03-01", bogAccounts: ["GE00BG0000000000000001"] }, lastSyncAt: new Date().toISOString(), errors: {}, cursors: {}, payments: 412, skipped: 39 } };
  }
  if (path.startsWith("/bank/")) return { ok: true, done: true };
  if (path.startsWith("/debts/")) return { ok: true };
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
