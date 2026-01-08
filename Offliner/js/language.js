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
        "hosts.f3_desc": "Even non-app users can redeem tickets easily with shared ticket images."
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
        "hosts.f3_desc": "即使他人没注册，也能通过分发票务图片进行核销。"
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
