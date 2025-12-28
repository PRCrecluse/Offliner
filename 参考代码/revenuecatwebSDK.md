Web SDK
Offer web subscriptions with Web Billing

AI
Ask AI
ChatGPT
Claude
Copy as markdown
⚠️Web SDK billing engine support
RevenueCat Web Billing: supported ✅
Stripe Billing: not supported ❌
Paddle Billing: not supported ❌
RevenueCat's Web SDK allow you to easily sell subscriptions and other purchases in your web app. It utilizes Stripe as the payment gateway, so you'll need a Stripe account to connect with your RevenueCat account.

Web Billing differs from external payment integrations in that it takes care of the purchase UI, the subscription management portal, and the recurring billing logic.

📘Stripe fees with Web Billing
When using Web Billing, Stripe will still charge a payment processing fee for transactions, but you will not have to pay Stripe Billing fees. See fee comparison

Installation
Start by installing the @revenuecat/purchases-js package using the package manager of your choice:

npm
yarn
npm install --save @revenuecat/purchases-js



When testing Web Billing with unpkg, add Purchases before all method names to access them. For example, use Purchases.Purchases.configure() instead of Purchases.configure().

General setup
Connect with Stripe
To get started, you first need to connect your Stripe account with RevenueCat, if you haven't already done so.

App configuration
To start using Web Billing, you will need to add a Web Billing platform to your project. To do that, go to Apps & providers and add a new Web Billing web config to your project.

New Web Billing Platform

In the following step, you can set up the most important information for the new App:

Stripe Account: The Stripe account to use. To use a different Stripe account not shown in the list, connect it to RevenueCat first.
Default Currency: The default currency to use for the prices of the products. Read more about multi-currency support in Web Billing.
App Name: The name of the app. This will also be shown in the purchase flow, in emails, and on invoices.
Support Email: An email address that customers can send support requests to. This will also be shown in the purchase flow, in emails, and on invoices.
Store URLs: Links to your native iOS and Android apps that are used in the checkout and emails, to enable customers to download them after purchasing.
Redemption Links settings: See Redemption Links for how to configure them.
Appearance: The Appearance tab allows customizing the look and feel of the purchase flow, including colors, button shapes and more. Read more about customizing the appearance.
New Web Billing App

After creating the app, some additional fields will be shown:

App icon: You can upload an app icon here that will be shown in the purchase flow, in emails, and on invoices.
Logo: You can additionally upload a full size logo or wordmark that will be shown instead of the App Icon when appropriate. We recommend transparent PNG images.
Public API Key: The API key to be used in your web application when initializing the SDK. This key is safe to be included in production code.
Sandbox API Key: The API key to be used for testing purposes. Do not share this API key or include it in your production web app, as it allows to make purchases and unlocking entitlements using test cards.
Product configuration
To get started with the Web SDK, you should follow the regular setup of entitlements, products, and offerings.

However, you can configure your product and its duration directly in the RevenueCat dashboard:

New product configuration page

SDK configuration
Configure the RevenueCat Web SDK by calling the static configure() method of the Purchases class:

Web (JS/TS)
    const appUserId = authentication.getAppUserId(); // Replace with your own authentication system
    const purchases = Purchases.configure({
        apiKey: WEB_BILLING_PUBLIC_API_KEY,
        appUserId: appUserId,
    });


⚠️Only configure once
You should configure the SDK only once in your code.

You can use the object returned from the configure() method to call any of the SDK methods, or use the static method getSharedInstance() of the Purchases class to returned the initialized Purchases object.

The method will throw an exception if the SDK has not yet been configured.

You can use both anonymous and identified app user ids when configuring the SDK, check out the next section to understand the differences.

Identifying Customers
The RevenueCat Web SDK supports both identified and anonymous customers, offering flexibility in how you manage user accounts and subscriptions. Both anonymous and identified customers are supported by the SDK and by the Web Purchase Links. Here’s how these options work:

Identified Customers
For identified customers, you provide a unique App User ID linked to the customer’s account. This is ideal for apps with authentication mechanisms or shared subscription access between platforms (e.g., web and mobile). To implement this approach:

Use a third-party authentication provider like Firebase / Supabase or a library like auth.js.
By sharing authentication across your web app and mobile apps, customers can seamlessly access subscriptions they purchased on any platform without additional configuration—just map products to the correct entitlements.
Here’s how you can configure purchases-js to use identified customers:

Web (JS/TS)
    const appUserId = authentication.getAppUserId(); // Replace with your own authentication system
    const purchases = Purchases.configure({
        apiKey: WEB_BILLING_PUBLIC_API_KEY,
        appUserId: appUserId,
    });


Anonymous Customers
With Redemption Links, anonymous customers can now purchase subscriptions on the web without being logged into an account. These customers can later redeem their purchases on mobile apps or other platforms. Redemption Links enable you to:

Share subscription access without requiring user authentication.
Ensure purchases remain accessible, even for anonymous users.
Here’s how you can configure purchases-js to use anonymous customers:

Web (JS/TS)
    // This function will generate a unique anonymous ID for the user.
    // Make sure to enable the Redemption Links feature in the RevenueCat dashboard and use the
    // redemption link to redeem the purchase in your mobile app.
    const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
    const purchases = Purchases.configure({
        apiKey: WEB_BILLING_PUBLIC_API_KEY,
        appUserId: appUserId,
    });


Find out more about Redemption Links and how to set them up here .

Getting customer information
You can access the customer information using the getCustomerInfo() method of the Purchases object:

Web (JS/TS)
    try {
        customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
        // access latest customerInfo
    } catch (e) {
        // Handle errors fetching customer info
    }


You can then use the entitlements property of the CustomerInfo object to check whether the customer has access to a specific entitlement:

Web (JS/TS)
    if ("gold_entitlement" in customerInfo.entitlements.active) {
        // Grant user access to the entitlement "gold_entitlement"
        grantEntitlementAccess();
    }


If your app has multiple entitlements, you might also want to check if the customer has any active entitlements:

Web (JS/TS)
    if (Object.keys(customerInfo.entitlements.active).length > 0) {
        // User has access to some entitlement, grant entitlement access
        grantEntitlementAccess();
    }


Building your paywall
Getting and displaying products
We recommend using Offerings to configure which products get presented to the customer. You can access the offerings for a given app user ID with the (asynchronous) method purchases.getOfferings(). The current offering for the customer is contained in the current property of the return value.

Web (JS/TS)
    try {
        const offerings = await Purchases.getSharedInstance().getOfferings();
        if (
            offerings.current !== null &&
            offerings.current.availablePackages.length !== 0
        ) {
            // Display packages for sale
            displayPackages(offerings.current.availablePackages);
        }
    } catch (e) {
        // Handle errors
    }


Show more
If you want to support multiple currencies and manually specify the currency, you can pass the currency code to the getOfferings() method. If you do not specify the currency, RevenueCat will attempt to geolocate the customer and use the currency of the customer's country if it's available, or fall back to the default currency of the app.

Web (JS/TS)
    try {
        // Specify the currency to get offerings for
        const offerings = await Purchases.getSharedInstance().getOfferings({
            currency: "EUR",
        });
        if (
            offerings.current !== null &&
            offerings.current.availablePackages.length !== 0
        ) {
            // Display packages for sale
            displayPackages(offerings.current.availablePackages);
        }
    } catch (e) {
        // Handle errors
    }


Show more
It's also possible to access other Offerings besides the Current Offering directly by its identifier.

Web (JS/TS)
    try {
        const offerings = await Purchases.getSharedInstance().getOfferings();
        if (offerings.all["experiment_group"].availablePackages.length !== 0) {
            // Display packages for sale
            displayPackages(offerings.all["experiment_group"].availablePackages);
        }
    } catch (e) {
        // Handle errors
    }


Each Offering contains a list of Packages. Packages can be accessed in a few different ways:

via the .availablePackages property on an Offering.
via the duration convenience property on an Offering
via the .packagesById property of an Offering, keyed by the package identifier
Web (JS/TS)
    const allPackages = offerings.all["experiment_group"].availablePackages;
    // --
    const monthlyPackage = offerings.all["experiment_group"].monthly;
    // --
    const customPackage =
        offerings.all["experiment_group"].packagesById["<package_id>"];


Each Package contains information about the product in the webBillingProduct property:

Web (JS/TS)
    // Accessing / displaying the monthly product
    try {
        const offerings = await Purchases.getSharedInstance().getOfferings({
            currency: "USD",
        });
        if (offerings.current && offerings.current.monthly) {
            const product = offerings.current.monthly.webBillingProduct;
            // Display the price and currency of the Web Billing Product
            displayProduct(product);
        }
    } catch (e) {
        // Handle errors
    }


Show more
Purchasing a package
To purchase a package, use the purchase() method of the Purchases object. It returns a Promise<{customerInfo: CustomerInfo}>. To handle errors, you should catch any exceptions that occur.

Web (JS/TS)
    try {
        const {customerInfo} = await Purchases.getSharedInstance().purchase({
            rcPackage: pkg,
        });
        if (Object.keys(customerInfo.entitlements.active).includes("pro")) {
            // Unlock that great "pro" content
        }
    } catch (e) {
        if (
            e instanceof PurchasesError &&
            e.errorCode == ErrorCode.UserCancelledError
        ) {
            // User cancelled the purchase process, don't do anything
        } else {
            // Handle errors
        }
    }


Show more
Presenting a RevenueCat Paywall with purchases-js
To render a paywall that RevenueCat manages for you, call presentPaywall(). This method displays the configured paywall, guides the customer through checkout, and resolves once the flow is complete. Provide the HTML element where the paywall should be injected. Optionally, pass an offering object retrieved from purchases.getOfferings() to select a specific paywall; otherwise the customer's current offering will be used.

Presenting a paywall
async function showPaywall() {
  const paywallContainer = document.getElementById("paywall-container");

  try {
    const purchaseResult = await purchases.presentPaywall({
      htmlTarget: paywallContainer,
      // no offering specified, the current offering will be used.
    });

    console.log("Paywall completed", purchaseResult);
  } catch (error) {
    console.error("Error presenting paywall", error);
  }
}

You can also specify the offering to use by passing it to presentPaywall().

Presenting a paywall
async function showPaywall() {
  const paywallContainer = document.getElementById("paywall-container");
  const offerings = await purchases.getOfferings();
  const offeringToUse = offerings.all["offering-id-to-use"];
  try {
    const purchaseResult = await purchases.presentPaywall({
      htmlTarget: paywallContainer,
      offering: offeringToUse,
    });

    console.log("Paywall completed", purchaseResult);
  } catch (error) {
    console.error("Error presenting paywall", error);
  }
}

Customizing the purchase flow
The purchase() method accepts a PurchaseParams object to set custom purchase options, including the following:

Send the customer's billing email address, skipping the email collection step (customerEmail)
Setting the selected and default locales (defaultLocale, selectedLocale) — see Localization
Setting the HTML target element for the purchase flow to be rendered in (htmlTarget)
Passing purchase metadata to be sent to the backend (metadata) — see Custom Metadata
Testing
See Testing Web Purchases

Edit this page
