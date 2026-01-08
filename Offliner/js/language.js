// Pricing Data (Parsed from CSV)
const pricingData = {
    monthly: {
        "AL": { price: 6.99, currency: "USD" }, // Albania
        "DZ": { price: 6.99, currency: "USD" }, // Algeria
        "AF": { price: 4.99, currency: "USD" }, // Afghanistan
        "AR": { price: 12.99, currency: "USD" }, // Argentina
        "AE": { price: 59.99, currency: "AED" }, // UAE
        "EG": { price: 499.99, currency: "EGP" }, // Egypt
        "IE": { price: 14.99, currency: "EUR" }, // Ireland
        "AU": { price: 19.99, currency: "AUD" }, // Australia
        "BR": { price: 79.9, currency: "BRL" }, // Brazil
        "CN": { price: 38.0, currency: "CNY" }, // China
        "US": { price: 12.99, currency: "USD" }, // USA
        "JP": { price: 2000, currency: "JPY" }, // Japan
        "KR": { price: 19000, currency: "KRW" }, // Korea
        "GB": { price: 14.99, currency: "GBP" }, // UK
        "DE": { price: 14.99, currency: "EUR" }, // Germany
        "FR": { price: 14.99, currency: "EUR" }, // France
        "HK": { price: 128.0, currency: "HKD" }, // Hong Kong
        "TW": { price: 390, currency: "TWD" }, // Taiwan
        // Default fallback
        "default": { price: 4.99, currency: "USD" }
    },
    annual: {
        "AL": { price: 40.49, currency: "USD" },
        "DZ": { price: 130.99, currency: "USD" },
        "AF": { price: 30.49, currency: "USD" },
        "AR": { price: 50.0, currency: "USD" },
        "AE": { price: 500.0, currency: "AED" },
        "EG": { price: 3000.0, currency: "EGP" },
        "IE": { price: 120.99, currency: "EUR" },
        "AU": { price: 150.0, currency: "AUD" },
        "BR": { price: 799.9, currency: "BRL" },
        "CN": { price: 268.0, currency: "CNY" }, // China
        "US": { price: 150.99, currency: "USD" },
        "JP": { price: 160000, currency: "JPY" },
        "KR": { price: 179000, currency: "KRW" },
        "GB": { price: 129.99, currency: "GBP" },
        "DE": { price: 149.99, currency: "EUR" },
        "FR": { price: 149.99, currency: "EUR" },
        "HK": { price: 1100.0, currency: "HKD" },
        "TW": { price: 3990, currency: "TWD" },
        // Default fallback
        "default": { price: 14.99, currency: "USD" }
    }
};

// Translations
const translations = {
    en: {
        "nav.for_users": "For Users",
        "nav.for_hosts": "For Hosts",
        "nav.community": "Community",
        "nav.pricing": "Pricing",
        "nav.support": "Support",
        "nav.download": "Download app",
        "community.title": "The person you are looking for is right here",
        "community.subtitle": "Co-living - Co-learning - Co-creating talent network",
        "community.search_placeholder": "Search...",
        "community.join_btn": "Join or Invite",
        "hero.title": "On the map<br>meet interesting souls",
        "hero.subtitle": "Find nearby activities, meet friends, and enjoy authentic offline social interactions.",
        "pricing.title": "Pricing Plans",
        "pricing.monthly": "/Monthly",
        "pricing.monthly_desc": "Most Flexible, Perfect for Short trip",
        "pricing.annually": "/Annually",
        "pricing.best_value": "BEST VALUE",
        "pricing.lifetime": "/Lifetime",
        "pricing.lifetime_desc": "Unlock Forever, Pay Once",
        "features.title": "Feature Compare",
        "features.free": "Free",
        "features.f1": "Unlimited Discovery",
        "features.f2": "Unlock Who Likes Me",
        "features.f3": "Activity Analytics",
        "hosts.hero_title": "Create an event in a sec,<br>and invite friends",
        "hosts.hero_subtitle": "Launch an event in a tap, and your dedicated event page is ready to go!",
        "hosts.f1_title": "Clear Stats",
        "hosts.f1_desc": "Data stats that make sense at a glance.",
        "hosts.f2_title": "Instant Notifications",
        "hosts.f2_desc": "Wave goodbye to verification headaches—you’ll be notified the second someone signs up and gets approved.",
        "hosts.f3_title": "Easy Redemption",
        "hosts.f3_desc": "Even non-app users can redeem tickets easily with shared ticket images.",
        "nav.hosts_sec1": "Create Website",
        "nav.hosts_sec2": "Notifications",
        "nav.hosts_sec3": "Stats Tool",
        "nav.hosts_sec4": "Export Data",
        "hosts.sec1_title": "Create an Independent Event Website in Seconds",
        "hosts.sec1_desc": "No complex operations required. Just input key info like event name, time, and location. The system automatically generates a dedicated event website with beautiful templates (supports custom logos). No coding skills needed—get your event online instantly with an official portal.",
        "hosts.sec2_title": "One-Click Event Notifications & Updates",
        "hosts.sec2_desc": "Your event site comes with built-in notification features. Support multi-channel reach via SMS, in-app messages, and emails. Instantly broadcast time changes, schedule updates, or important reminders. Attendees receive updates in real-time, ensuring no info is missed, while also viewing dynamic updates on the site for a better experience.",
        "hosts.sec3_title": "Free Check-in & Stats Tool, Visualized Data",
        "hosts.sec3_desc": "Built-in free check-in function supporting both QR code and phone number verification for quick entry. The system automatically tallies attendees, absentees, and check-in rates, generating visual data reports. No manual counting needed—get a clear view of participation and efficient data review.",
        "hosts.sec4_title": "One-Click Contact Export, No Excel Hassle",
        "hosts.sec4_desc": "Attendee registration info is automatically synced and stored. No manual Excel organization required. Support one-click export of names, phone numbers, and notes in Word or Excel formats. Save 90% of data organization time, facilitating follow-up communication and relationship maintenance."
    },
    zh: {
        "nav.for_users": "我是用户",
        "nav.for_hosts": "我是主办方",
        "nav.community": "社区",
        "nav.pricing": "价格",
        "nav.support": "支持",
        "nav.download": "下载应用",
        "community.title": "你要找的人，就在这里",
        "community.subtitle": "共居-共学-共创人才网络",
        "community.search_placeholder": "搜索...",
        "community.join_btn": "加入或邀请",
        "hero.title": "在地图上<br>发现有趣灵魂",
        "hero.subtitle": "发现身边的活动，结识新朋友，享受真实的线下社交体验。",
        "pricing.title": "会员方案",
        "pricing.monthly": "/月",
        "pricing.monthly_desc": "灵活订阅，适合短期体验",
        "pricing.annually": "/年",
        "pricing.best_value": "超值推荐",
        "pricing.lifetime": "/终身",
        "pricing.lifetime_desc": "一次付费，永久解锁",
        "features.title": "功能对比",
        "features.free": "免费版",
        "features.f1": "无限制发现身边用户",
        "features.f2": "解锁喜欢我的用户",
        "features.f3": "活动数据统计",
        "hosts.hero_title": "一秒创建活动，<br>邀请好友",
        "hosts.hero_subtitle": "一键发布活动，专属活动页面即刻生成！",
        "hosts.f1_title": "清晰的数据统计",
        "hosts.f1_desc": "清晰的数据统计",
        "hosts.f2_title": "即时通知",
        "hosts.f2_desc": "别再为核销发愁了，谁报了名、通过了审批，都立刻有通知。",
        "hosts.f3_title": "便捷核销",
        "hosts.f3_desc": "即使他人没注册，也能通过分发票务图片进行核销。",
        "nav.hosts_sec1": "一秒建站",
        "nav.hosts_sec2": "一键通知",
        "nav.hosts_sec3": "核销统计",
        "nav.hosts_sec4": "导出数据",
        "hosts.sec1_title": "一秒创建独立活动网站",
        "hosts.sec1_desc": "无需复杂操作，输入活动名称、时间、地点等关键信息，系统自动生成专属独立活动网站，自带美观模板（支持自定义 logo），无需代码基础，零门槛实现活动线上展示，让活动快速拥有官方线上入口。",
        "hosts.sec2_title": "一键推送活动通知与进展",
        "hosts.sec2_desc": "独立活动网站同步搭载通知功能，支持短信、站内信、邮件多渠道触达，活动时间调整、流程更新、重要提醒等信息一键群发，参与者实时接收，避免信息遗漏，同时可在网站内查看活动动态，提升参与体验。",
        "hosts.sec3_title": "免费核销统计工具，数据直观可见",
        "hosts.sec3_desc": "内置免费核销功能，支持二维码、手机号双重核销方式，到场参与者快速验证入场；系统自动统计到场人数、缺席人数、核销率，生成可视化数据报表，无需人工核对，活动参与情况一目了然，高效完成数据复盘。",
        "hosts.sec4_title": "一键导出联系方式，省去制表麻烦",
        "hosts.sec4_desc": "参与者报名信息自动同步存储，无需手动整理 Excel 表格，支持一键导出姓名、电话、报名备注等关键信息，导出格式兼容 Word、Excel 等常用文档，节省 90% 信息整理时间，方便后续沟通与关系维护。"
    }
};

// Current Language State
let currentLang = 'en';

// Country Code Mapping (Simple version for demo, ideally would use a library)
const countryMapping = {
    "CN": "CN", "China": "CN",
    "US": "US", "United States": "US",
    "GB": "GB", "United Kingdom": "GB",
    "JP": "JP", "Japan": "JP",
    "KR": "KR", "South Korea": "KR",
    // Add more as needed
};

// Function to get user's country code
async function detectUserCountry() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return data.country_code;
    } catch (error) {
        console.error("Error detecting country:", error);
        return "US"; // Default to US
    }
}

// Function to update prices based on country
function updatePrices(countryCode) {
    const currencySymbols = {
        "USD": "$", "EUR": "€", "GBP": "£", "CNY": "¥", 
        "JPY": "¥", "KRW": "₩", "HKD": "HK$", "TWD": "NT$"
    };

    const monthlyData = pricingData.monthly[countryCode] || pricingData.monthly["default"];
    const annualData = pricingData.annual[countryCode] || pricingData.annual["default"];

    const monthlyPriceEl = document.getElementById('price-monthly');
    const annualPriceEl = document.getElementById('price-annual');
    const annualDescEl = document.getElementById('price-annual-desc');

    if (monthlyPriceEl) {
        const symbol = currencySymbols[monthlyData.currency] || monthlyData.currency;
        monthlyPriceEl.textContent = `${symbol}${monthlyData.price}`;
    }

    if (annualPriceEl) {
        const symbol = currencySymbols[annualData.currency] || annualData.currency;
        annualPriceEl.textContent = `${symbol}${annualData.price}`;
        
        // Calculate monthly equivalent for annual plan
        const monthlyEq = (annualData.price / 12).toFixed(2);
        const descText = currentLang === 'zh' 
            ? `超值推荐，仅需 ${symbol}${monthlyEq}/月`
            : `Best Value, Only ${symbol}${monthlyEq}/Month`;
        annualDescEl.textContent = descText;
    }
}

// Function to switch language
function changeLanguage(lang) {
    currentLang = lang;
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    // Update button text
    const langBtn = document.getElementById('current-lang');
    if (langBtn) {
        langBtn.textContent = lang === 'en' ? 'EN' : '中文';
    }

    // Update placeholder
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.placeholder = translations[lang]["community.search_placeholder"] || "";
    }

    // Re-render price description to match language
    // We re-detect or use stored country code. For now, let's just trigger a re-render if we had the country code.
    // In a real app, we'd store the detected country code globally.
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Detect Location
    const countryCode = await detectUserCountry();
    
    // 2. Set Language based on location (Simple logic: CN/TW/HK -> zh, others -> en)
    if (['CN', 'TW', 'HK', 'SG'].includes(countryCode)) {
        changeLanguage('zh');
    } else {
        changeLanguage('en');
    }

    // 3. Update Prices
    updatePrices(countryCode);
});
