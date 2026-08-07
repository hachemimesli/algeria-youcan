/*
=========================================================
 Kidzy Shop Algeria Checkout
 Clean Version 3.0
 Corrected complete index.js
=========================================================
*/

(() => {
  "use strict";

  /* =====================================================
     CONFIGURATION
  ===================================================== */

  const CONFIG = {
    selectors: {
      wilaya: 'select[name="extra_fields[custom_field_xx8HUOg0yUo9dhXE]"]',

      commune: 'select[name="extra_fields[custom_field_wDvNqdDgWa9ADzP7]"]',

      price:".product-section.price-section .single-price .value",
    },

    timing: {
      fieldCheckInterval: 250,
      maxAttempts: 120,
    },

    ui: {
      wrapperId: "kidzy-algeria-checkout",
      stylesId: "kidzy-delivery-styles",
      validationId: "kidzy-validation-message",
    },
  };

  /* =====================================================
     APPLICATION STATE
  ===================================================== */

  const App = {
    initialized: false,
    initializing: false,

    wilayaSelect: null,
    communeSelect: null,

    productPrice: 0,
    selectedWilaya: "",
    selectedCommune: "",

    deliveryType: "desk",

    shippingPrice: 0,
    totalPrice: 0,

    choicesWilaya: null,
    choicesCommune: null,

    attempts: 0,

    observer: null,
    lastWilayaElement: null,
    lastCommuneElement: null,
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $all(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function formatDA(value) {
    return Number(value || 0).toLocaleString("fr-FR") + " DA";
  }

function getNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  let text = String(value).trim();

  text = text.replace(/[٠-٩]/g, (digit) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
  );

  text = text.replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
  );

  text = text
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "");

  if (text.includes(",") && text.includes(".")) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const number = parseFloat(text);

  return Number.isFinite(number) ? number : 0;
}

function log(...args) {
  console.log("[Kidzy Checkout]", ...args);
}

function warn(...args) {
  console.warn("[Kidzy Checkout]", ...args);
}

function error(...args) {
  console.error("[Kidzy Checkout]", ...args);
}

/* =====================================================
   PRODUCT PRICE
===================================================== */

function readProductPrice() {
  console.log("🔥 READ PRODUCT PRICE FUNCTION RUNNING");

  const priceElement = document.querySelector(
    ".product-section.price-section .single-price .value"
  );

  console.log("PRICE ELEMENT:", priceElement);

  if (!priceElement) {
    console.warn(
      "[Kidzy Checkout] Product price element NOT FOUND."
    );

    return false;
  }

  const rawPrice = priceElement.textContent.trim();

  console.log(
    "[Kidzy Checkout] RAW PRICE:",
    rawPrice
  );

  const price = Number(rawPrice);

  console.log(
    "[Kidzy Checkout] PARSED PRICE:",
    price
  );

  if (!Number.isFinite(price) || price <= 0) {
    console.warn(
      "[Kidzy Checkout] Invalid product price:",
      rawPrice
    );

    return false;
  }

  App.productPrice = price;

  App.totalPrice =
    App.productPrice + App.shippingPrice;

  console.log(
    "[Kidzy Checkout] PRODUCT PRICE SET:",
    App.productPrice
  );

  return true;
}

  /* =====================================================
     FIELD DETECTION
  ===================================================== */

  function findFields() {
    const wilaya = $(CONFIG.selectors.wilaya);
    const commune = $(CONFIG.selectors.commune);

    if (!wilaya || !commune) {
      return false;
    }

    App.wilayaSelect = wilaya;
    App.communeSelect = commune;

    return true;
  }

  /* =====================================================
     ALGERIA DATA
  ===================================================== */

  function getAlgeriaData() {
    if (typeof ALGERIA_DATA === "undefined") {
      return null;
    }

    if (!Array.isArray(ALGERIA_DATA)) {
      return null;
    }

    return ALGERIA_DATA;
  }

  function getWilayaData(code) {
    const data = getAlgeriaData();

    if (!data) {
      return null;
    }

    return data.find((wilaya) => String(wilaya.code) === String(code)) || null;
  }

  function getCommuneName(commune) {
    if (typeof commune === "string") {
      return commune;
    }

    if (commune && typeof commune.name === "string") {
      return commune.name;
    }

    return "";
  }

  function getCommunesForWilaya(code) {
    const wilaya = getWilayaData(code);

    if (!wilaya || !Array.isArray(wilaya.communes)) {
      return [];
    }

    return wilaya.communes
      .map(getCommuneName)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));
  }

  /* =====================================================
     SELECT HELPERS
  ===================================================== */

  function clearSelect(select) {
    if (!select) {
      return;
    }

    select.innerHTML = "";
  }

  function addOption(select, value, text, selected = false) {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = text;
    option.selected = selected;

    select.appendChild(option);

    return option;
  }

  function populateWilayas() {
    const select = App.wilayaSelect;
    const data = getAlgeriaData();

    if (!select) {
      return;
    }

    if (!data) {
      error("ALGERIA_DATA is not available.");
      return;
    }

    clearSelect(select);

    addOption(select, "", "Choisissez votre wilaya");

    const wilayas = [...data].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "fr"),
    );

    wilayas.forEach((wilaya) => {
      if (!wilaya) {
        return;
      }

      const code = String(wilaya.code ?? "");

      const name = String(wilaya.name ?? "");

      if (!code || !name) {
        return;
      }

      addOption(select, code, name);
    });

    select.value = "";

    log("Wilayas loaded:", wilayas.length);
  }

  function populateCommunes(code) {
    const select = App.communeSelect;

    if (!select) {
      return;
    }

    clearSelect(select);

    addOption(
      select,
      "",
      code ? "Choisissez votre commune" : "Choisissez d'abord votre wilaya",
    );

    if (!code) {
      select.disabled = true;
      return;
    }

    const communes = getCommunesForWilaya(code);

    communes.forEach((commune) => {
      addOption(select, commune, commune);
    });

    select.disabled = communes.length === 0;

    log("Communes loaded:", communes.length);
  }

  /* =====================================================
     CHOICES.JS
  ===================================================== */

  function destroyChoices(instance) {
    if (!instance) {
      return null;
    }

    try {
      instance.destroy();
    } catch (e) {
      warn("Could not destroy Choices instance.", e);
    }

    return null;
  }

  function initializeWilayaChoices() {
    if (typeof Choices === "undefined") {
      warn("Choices.js is not loaded. Native selects will be used.");
      return;
    }

    if (!App.wilayaSelect) {
      return;
    }

    App.choicesWilaya = destroyChoices(App.choicesWilaya);

    App.choicesWilaya = new Choices(App.wilayaSelect, {
      searchEnabled: true,

      searchPlaceholderValue: "Rechercher une wilaya...",

      placeholder: true,

      placeholderValue: "Choisissez votre wilaya",

      itemSelectText: "",

      shouldSort: false,

      allowHTML: false,

      noResultsText: "Aucune wilaya trouvée",

      noChoicesText: "Aucune wilaya disponible",

      searchResultLimit: 100,
    });
  }

  function initializeCommuneChoices() {
    if (typeof Choices === "undefined") {
      return;
    }

    if (!App.communeSelect) {
      return;
    }

    App.choicesCommune = destroyChoices(App.choicesCommune);

    App.choicesCommune = new Choices(App.communeSelect, {
      searchEnabled: true,

      searchPlaceholderValue: "Rechercher une commune...",

      placeholder: true,

      placeholderValue: "Choisissez votre commune",

      itemSelectText: "",

      shouldSort: false,

      allowHTML: false,

      noResultsText: "Aucune commune trouvée",

      noChoicesText: "Aucune commune disponible",

      searchResultLimit: 100,
    });
  }

  function initializeChoices() {
    initializeWilayaChoices();

    initializeCommuneChoices();
  }

  function refreshCommuneChoices() {
    if (!App.communeSelect) {
      return;
    }

    App.choicesCommune = destroyChoices(App.choicesCommune);

    populateCommunes(App.selectedWilaya);

    initializeCommuneChoices();
  }

  /* =====================================================
     SHIPPING DATA
  ===================================================== */

  function getShippingRoot() {
    if (typeof SHIPPING !== "undefined") {
      return SHIPPING;
    }

    if (typeof SHIPPING_DATA !== "undefined") {
      return SHIPPING_DATA;
    }

    if (typeof shippingData !== "undefined") {
      return shippingData;
    }

    return null;
  }

  function getShippingData() {
    const root = getShippingRoot();

    if (!root) {
      warn("Shipping data is not available.");

      return null;
    }

    const code = String(App.selectedWilaya || "");

    if (!code) {
      return null;
    }

    if (root[code] !== undefined) {
      return root[code];
    }

    const numericCode = String(parseInt(code, 10));

    if (root[numericCode] !== undefined) {
      return root[numericCode];
    }

    if (Array.isArray(root)) {
      const found = root.find(
        (item) => String(item.code ?? item.wilayaCode ?? item.id) === code,
      );

      return found || null;
    }

    return null;
  }

  function getShippingPrice() {
    const data = getShippingData();

    if (!data) {
      return 0;
    }

    if (App.deliveryType === "domicile") {
      return getNumber(
        data.domicile ??
          data.home ??
          data.homeDelivery ??
          data.home_delivery ??
          0,
      );
    }

    return getNumber(
      data.desk ?? data.stopDesk ?? data.stop_desk ?? data.stopdesk ?? 0,
    );
  }

  /* =====================================================
     DELIVERY UI
  ===================================================== */

  function createDeliveryUI() {
    if (document.getElementById(CONFIG.ui.wrapperId)) {
      return;
    }

    if (!App.communeSelect) {
      return;
    }

    const communeContainer =
      App.communeSelect.closest(".form-group") ||
      App.communeSelect.parentElement;

    if (!communeContainer) {
      warn("Could not find Commune container.");

      return;
    }

    const wrapper = document.createElement("div");

    wrapper.id = CONFIG.ui.wrapperId;

    wrapper.innerHTML = `
      <div class="kidzy-delivery-section">

        <div class="kidzy-section-title">
          <span class="kidzy-title-icon">🚚</span>
          <span>Mode de livraison</span>
        </div>

        <div class="kidzy-delivery-options">

          <button
            type="button"
            class="kidzy-delivery-card active"
            data-delivery="desk"
          >
            <div class="kidzy-delivery-icon">
              📦
            </div>

            <div class="kidzy-delivery-content">
              <div class="kidzy-delivery-name">
                Stop Desk
              </div>

              <div class="kidzy-delivery-description">
                Livraison vers un point relais
              </div>
            </div>

            <div
              class="kidzy-delivery-price"
              data-price="desk"
            >
              --
            </div>
          </button>

          <button
            type="button"
            class="kidzy-delivery-card"
            data-delivery="domicile"
          >
            <div class="kidzy-delivery-icon">
              🏠
            </div>

            <div class="kidzy-delivery-content">
              <div class="kidzy-delivery-name">
                Domicile
              </div>

              <div class="kidzy-delivery-description">
                Livraison directement à domicile
              </div>
            </div>

            <div
              class="kidzy-delivery-price"
              data-price="domicile"
            >
              --
            </div>
          </button>

        </div>

        <div class="kidzy-order-summary">

          <div class="kidzy-summary-row">
            <span>Sous-total</span>
            <strong data-summary="subtotal">
              --
            </strong>
          </div>

          <div class="kidzy-summary-row">
            <span>Livraison</span>
            <strong data-summary="shipping">
              --
            </strong>
          </div>

          <div class="kidzy-summary-divider"></div>

          <div class="kidzy-summary-row kidzy-total-row">
            <span>Total</span>
            <strong data-summary="total">
              --
            </strong>
          </div>

        </div>

      </div>
    `;

    communeContainer.after(wrapper);

    attachDeliveryEvents();

    injectDeliveryStyles();

    updateDeliveryCardPrices();

    updateSummary();
  }

  function attachDeliveryEvents() {
    const wrapper = document.getElementById(CONFIG.ui.wrapperId);

    if (!wrapper) {
      return;
    }

    const cards = $all(".kidzy-delivery-card", wrapper);

    cards.forEach((card) => {
      card.onclick = () => {
        const type = card.dataset.delivery;

        if (type !== "desk" && type !== "domicile") {
          return;
        }

        App.deliveryType = type;

        cards.forEach((item) => {
          item.classList.toggle("active", item === card);
        });

        updateShipping();

        log("Delivery type:", type);
      };
    });
  }

  function updateDeliveryCardPrices() {
    const wrapper = document.getElementById(CONFIG.ui.wrapperId);

    if (!wrapper) {
      return;
    }

    const data = getShippingData();

    const deskPrice = wrapper.querySelector('[data-price="desk"]');

    const domicilePrice = wrapper.querySelector('[data-price="domicile"]');

    if (!data) {
      if (deskPrice) {
        deskPrice.textContent = "--";
      }

      if (domicilePrice) {
        domicilePrice.textContent = "--";
      }

      return;
    }

    const desk = getNumber(
      data.desk ?? data.stopDesk ?? data.stop_desk ?? data.stopdesk ?? 0,
    );

    const domicile = getNumber(
      data.domicile ??
        data.home ??
        data.homeDelivery ??
        data.home_delivery ??
        0,
    );

    if (deskPrice) {
      deskPrice.textContent = formatDA(desk);
    }

    if (domicilePrice) {
      domicilePrice.textContent = formatDA(domicile);
    }
  }

  function updateShipping() {
    App.shippingPrice = getShippingPrice();

    App.totalPrice = App.productPrice + App.shippingPrice;

    updateDeliveryCardPrices();

    updateSummary();
  }

  function updateSummary() {
    const wrapper = document.getElementById(CONFIG.ui.wrapperId);

    if (!wrapper) {
      return;
    }

    const subtotal = wrapper.querySelector('[data-summary="subtotal"]');

    const shipping = wrapper.querySelector('[data-summary="shipping"]');

    const total = wrapper.querySelector('[data-summary="total"]');

    if (subtotal) {
      subtotal.textContent = formatDA(App.productPrice);
    }

    if (shipping) {
      shipping.textContent =
        App.selectedWilaya && App.shippingPrice > 0
          ? formatDA(App.shippingPrice)
          : "--";
    }

    if (total) {
      total.textContent = formatDA(App.totalPrice);
    }
  }

  /* =====================================================
     STYLES
  ===================================================== */

  function injectDeliveryStyles() {
    if (document.getElementById(CONFIG.ui.stylesId)) {
      return;
    }

    const style = document.createElement("style");

    style.id = CONFIG.ui.stylesId;

    style.textContent = `
      #kidzy-algeria-checkout {
        width: 100%;
        margin: 20px 0;
        box-sizing: border-box;
      }

      #kidzy-algeria-checkout *,
      #kidzy-algeria-checkout *::before,
      #kidzy-algeria-checkout *::after {
        box-sizing: border-box;
      }

      .kidzy-delivery-section {
        width: 100%;
      }

      .kidzy-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 16px;
        font-weight: 700;
      }

      .kidzy-title-icon {
        font-size: 18px;
      }

      .kidzy-delivery-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .kidzy-delivery-card {
        width: 100%;
        min-height: 82px;
        border: 1px solid #e2e2e2;
        border-radius: 12px;
        background: #fff;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
        cursor: pointer;
        transition:
          border-color .2s ease,
          box-shadow .2s ease,
          transform .15s ease;
        font-family: inherit;
      }

      .kidzy-delivery-card:hover {
        transform: translateY(-1px);
      }

      .kidzy-delivery-card.active {
        border-color: #111;
        box-shadow:
          0 0 0 1px #111;
      }

      .kidzy-delivery-icon {
        width: 38px;
        height: 38px;
        min-width: 38px;
        border-radius: 10px;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
      }

      .kidzy-delivery-content {
        flex: 1;
        min-width: 0;
      }

      .kidzy-delivery-name {
        font-size: 14px;
        font-weight: 700;
        color: #111;
      }

      .kidzy-delivery-description {
        margin-top: 3px;
        font-size: 11px;
        line-height: 1.3;
        color: #777;
      }

      .kidzy-delivery-price {
        white-space: nowrap;
        font-size: 13px;
        font-weight: 700;
        color: #111;
      }

      .kidzy-order-summary {
        margin-top: 14px;
        padding: 15px;
        border-radius: 12px;
        background: #f8f8f8;
      }

      .kidzy-summary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        font-size: 13px;
        line-height: 1.5;
      }

      .kidzy-summary-row + .kidzy-summary-row {
        margin-top: 8px;
      }

      .kidzy-summary-divider {
        height: 1px;
        background: #dedede;
        margin: 12px 0;
      }

      .kidzy-total-row {
        font-size: 17px;
      }

      #kidzy-validation-message {
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        background: #fff1f1;
        color: #c62828;
        font-size: 13px;
        font-weight: 600;
      }

      @media (max-width: 600px) {
        .kidzy-delivery-options {
          grid-template-columns: 1fr;
        }

        .kidzy-delivery-card {
          min-height: 72px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =====================================================
     FIELD EVENTS
  ===================================================== */

  function handleWilayaChange() {
    if (!App.wilayaSelect) {
      return;
    }

    App.selectedWilaya = App.wilayaSelect.value || "";

    App.selectedCommune = "";

    refreshCommuneChoices();

    updateShipping();
    updateSummary();

    hideValidationMessage();

    log("Wilaya:", App.selectedWilaya);
  }

  function handleCommuneChange() {
    if (!App.communeSelect) {
      return;
    }

    App.selectedCommune = App.communeSelect.value || "";

    updateShipping();
    updateSummary();

    hideValidationMessage();

    log("Commune:", App.selectedCommune);
  }

  function attachFieldEvents() {
    if (!App.wilayaSelect || !App.communeSelect) {
      return;
    }

    App.wilayaSelect.onchange = handleWilayaChange;

    App.communeSelect.onchange = handleCommuneChange;
  }

  /* =====================================================
     VALIDATION
  ===================================================== */

  function validateLocation() {
    if (!App.selectedWilaya) {
      return {
        valid: false,
        message: "Veuillez choisir votre wilaya.",
      };
    }

    if (!App.selectedCommune) {
      return {
        valid: false,
        message: "Veuillez choisir votre commune.",
      };
    }

    return {
      valid: true,
      message: "",
    };
  }

  function showValidationMessage(message) {
    let element = document.getElementById(CONFIG.ui.validationId);

    if (!element) {
      element = document.createElement("div");

      element.id = CONFIG.ui.validationId;

      const wrapper = document.getElementById(CONFIG.ui.wrapperId);

      if (wrapper) {
        wrapper.appendChild(element);
      }
    }

    if (!element) {
      return;
    }

    element.textContent = message;

    element.style.display = "block";
  }

  function hideValidationMessage() {
    const element = document.getElementById(CONFIG.ui.validationId);

    if (element) {
      element.style.display = "none";
    }
  }

  function validateBeforeSubmit(event) {
    const result = validateLocation();

    if (!result.valid) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      showValidationMessage(result.message);

      const wrapper = document.getElementById(CONFIG.ui.wrapperId);

      if (wrapper) {
        wrapper.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      return false;
    }

    hideValidationMessage();

    return true;
  }

  /* =====================================================
     SUBMIT VALIDATION
  ===================================================== */

  function findSubmitButtons() {
    const buttons = $all("button, input[type='submit']");

    return buttons.filter((button) => {
      const text = (button.innerText || button.value || "")
        .trim()
        .toLowerCase();

      return (
        text.includes("commander") ||
        text.includes("acheter") ||
        text.includes("order") ||
        text.includes("passer la commande")
      );
    });
  }

  function attachSubmitValidation() {
    findSubmitButtons().forEach((button) => {
      if (button.dataset.kidzyValidationAttached === "true") {
        return;
      }

      button.dataset.kidzyValidationAttached = "true";

      button.addEventListener(
        "click",
        (event) => {
          validateBeforeSubmit(event);
        },
        true,
      );
    });
  }

  function attachFormValidation() {
    $all("form").forEach((form) => {
      if (form.dataset.kidzyValidationAttached === "true") {
        return;
      }

      form.dataset.kidzyValidationAttached = "true";

      form.addEventListener(
        "submit",
        (event) => {
          validateBeforeSubmit(event);
        },
        true,
      );
    });
  }

  /* =====================================================
     INITIALIZE
  ===================================================== */

  function initialize() {
    if (App.initialized || App.initializing) {
      return;
    }

    if (!findFields()) {
      return;
    }

    App.initializing = true;

    log("Initializing checkout...");

    /*
      Read the product price
      before calculating totals.
    */

    readProductPrice();

    /*
      Default values.
    */

    App.selectedWilaya = "";
    App.selectedCommune = "";

    App.deliveryType = "desk";

    App.shippingPrice = 0;

    App.totalPrice = App.productPrice;

    /*
      Populate the original
      YouCan selects.
    */

    populateWilayas();

    populateCommunes("");

    /*
      Initialize Choices AFTER
      the options have been added.
    */

    initializeChoices();

    /*
      Attach Wilaya / Commune events.
    */

    attachFieldEvents();

    /*
      Create our delivery UI.
    */

    createDeliveryUI();

    /*
      Calculate initial values.
    */

    updateShipping();

    updateSummary();

    /*
      Make sure YouCan's submit
      elements are validated.
    */

    attachSubmitValidation();

    attachFormValidation();

    /*
      Save the exact elements
      currently being used.
    */

    App.lastWilayaElement = App.wilayaSelect;

    App.lastCommuneElement = App.communeSelect;

    App.initialized = true;

    App.initializing = false;

    App.attempts = 0;

    log("Checkout initialized successfully.");
  }

  /* =====================================================
     WAIT FOR YOUCAN FIELDS
  ===================================================== */

  function waitForFields() {
    if (App.initialized) {
      return;
    }

    if (App.initializing) {
      return;
    }

    if (findFields()) {
      initialize();
      return;
    }

    App.attempts++;

    if (App.attempts >= CONFIG.timing.maxAttempts) {
      error("Could not find YouCan Wilaya/Commune fields.");

      error("Wilaya selector:", CONFIG.selectors.wilaya);

      error("Commune selector:", CONFIG.selectors.commune);

      return;
    }

    setTimeout(waitForFields, CONFIG.timing.fieldCheckInterval);
  }

  /* =====================================================
     HANDLE YOUCAN RE-RENDERING
  ===================================================== */

  function handlePossibleRerender() {
    const currentWilaya = $(CONFIG.selectors.wilaya);

    const currentCommune = $(CONFIG.selectors.commune);

    /*
      Nothing to do if the fields
      are not currently on the page.
    */

    if (!currentWilaya || !currentCommune) {
      return;
    }

    /*
      YouCan may completely replace
      the select elements.

      Detect that situation and
      rebuild our system.
    */

    if (
      currentWilaya !== App.lastWilayaElement ||
      currentCommune !== App.lastCommuneElement
    ) {
      log("YouCan replaced checkout fields. Reinitializing...");

      /*
        Destroy old Choices instances.
      */

      App.choicesWilaya = destroyChoices(App.choicesWilaya);

      App.choicesCommune = destroyChoices(App.choicesCommune);

      /*
        Reset state.
      */

      App.wilayaSelect = currentWilaya;

      App.communeSelect = currentCommune;

      App.initialized = false;

      App.initializing = false;

      App.attempts = 0;

      /*
        Reinitialize using the
        newly-created fields.
      */

      initialize();

      return;
    }

    /*
      YouCan can create the
      submit button after the
      initial checkout load.

      Keep checking for it.
    */

    attachSubmitValidation();

    attachFormValidation();
  }

  /* =====================================================
     MUTATION OBSERVER
  ===================================================== */

  function startObserver() {
    if (App.observer) {
      return;
    }

    if (!document.body) {
      return;
    }

    App.observer = new MutationObserver(() => {
      handlePossibleRerender();
    });

    App.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /* =====================================================
     START
  ===================================================== */

  function start() {
    /*
      IMPORTANT:
      There is only ONE startup call.

      This fixes the problem from
      the previous version where
      initialization happened before
      all functions were ready.
    */

    waitForFields();

    startObserver();

    log("Kidzy Algeria Checkout script loaded.");
  }

  /* =====================================================
     DOM READY
  ===================================================== */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true,
    });
  } else {
    start();
  }
})();
