/*
=========================================================
 Kidzy Shop Algeria Checkout
 Version 1.0
 Part 1/3
=========================================================
*/

(() => {
  "use strict";

  /*==========================================
    CONFIG
==========================================*/

  const CONFIG = {
    selectors: {
      wilaya: 'select[name="extra_fields[custom_field_xx8HUOg0yUo9dhXE]"]',

      commune: 'select[name="extra_fields[custom_field_wDvNqdDgWa9ADzP7]"]',

      price: ".value",
    },
  };

  /*==========================================
    STATE
==========================================*/

  const App = {
    wilaya: null,

    commune: null,

    delivery: "desk",

    shipping: 0,

    productPrice: 0,

    total: 0,

    choicesWilaya: null,

    choicesCommune: null,
  };

  /*==========================================
    HELPERS
==========================================*/

  const $ = (selector) => document.querySelector(selector);

  const create = (tag, cls = "") => {
    const el = document.createElement(tag);

    if (cls) el.className = cls;

    return el;
  };

  const formatDA = (value) => {
    return Number(value).toLocaleString("fr-FR") + " DA";
  };

  /*==========================================
    GET FIELDS
==========================================*/

  const wilayaSelect = $(CONFIG.selectors.wilaya);

  const communeSelect = $(CONFIG.selectors.commune);

  if (!wilayaSelect) {
    console.error("Wilaya field not found.");

    return;
  }

  if (!communeSelect) {
    console.error("Commune field not found.");

    return;
  }

  /*==========================================
    PRODUCT PRICE
==========================================*/

  function readProductPrice() {
    const el = $(CONFIG.selectors.price);

    if (!el) {
      console.warn("Price element not found.");

      return;
    }

    let value = el.textContent;

    value = value.replace(/\s/g, "");

    value = value.replace(/[^\d]/g, "");

    App.productPrice = parseInt(value) || 0;

    App.total = App.productPrice;
  }

  readProductPrice();

  /*==========================================
    POPULATE WILAYAS
==========================================*/

  function loadWilayas() {
    wilayaSelect.innerHTML = "";

    const first = document.createElement("option");

    first.value = "";

    first.textContent = "Choisissez votre wilaya";

    wilayaSelect.appendChild(first);

    ALGERIA_DATA.sort((a, b) => a.name.localeCompare(b.name)).forEach((w) => {
      const option = document.createElement("option");

      option.value = w.code;

      option.textContent = w.name;

      wilayaSelect.appendChild(option);
    });
  }

  /*==========================================
    POPULATE COMMUNES
==========================================*/

  function loadCommunes(code) {
    communeSelect.innerHTML = "";

    const first = document.createElement("option");

    first.value = "";

    first.textContent = "Choisissez votre commune";

    communeSelect.appendChild(first);

    if (!code) return;

    const wilaya = ALGERIA_DATA.find((x) => x.code === code);

    if (!wilaya) return;

    wilaya.communes
      .sort((a, b) => {
        const aa = typeof a === "string" ? a : a.name;

        const bb = typeof b === "string" ? b : b.name;

        return aa.localeCompare(bb);
      })
      .forEach((c) => {
        const option = document.createElement("option");

        option.value = typeof c === "string" ? c : c.name;

        option.textContent = typeof c === "string" ? c : c.name;

        communeSelect.appendChild(option);
      });
  }

  /*==========================================
    CHOICES.JS
==========================================*/

  function initChoices() {
    if (typeof Choices === "undefined") {
      console.warn("Choices.js not loaded.");

      return;
    }

    if (App.choicesWilaya) {
      App.choicesWilaya.destroy();
    }

    if (App.choicesCommune) {
      App.choicesCommune.destroy();
    }

    App.choicesWilaya = new Choices(wilayaSelect, {
      searchEnabled: true,

      itemSelectText: "",

      shouldSort: false,

      placeholder: true,

      placeholderValue: "Rechercher une wilaya",
    });

    App.choicesCommune = new Choices(communeSelect, {
      searchEnabled: true,

      itemSelectText: "",

      shouldSort: false,

      placeholder: true,

      placeholderValue: "Rechercher une commune",
    });
  }

  /*==========================================
    EVENTS
==========================================*/

  wilayaSelect.addEventListener("change", () => {
    App.wilaya = wilayaSelect.value;

    loadCommunes(App.wilaya);

    initChoices();
  });

  communeSelect.addEventListener("change", () => {
    App.commune = communeSelect.value;
  });

  /*==========================================
    START
==========================================*/

  document.addEventListener("DOMContentLoaded", () => {
    loadWilayas();

    initChoices();

    console.log("Kidzy Checkout loaded.");
  });

  /*=========================================================
    PART 2
    DELIVERY UI + SUMMARY
=========================================================*/

  function createCheckoutUI() {
    const communeContainer =
      communeSelect.closest(".form-group") || communeSelect.parentElement;

    if (!communeContainer) return;

    if (document.getElementById("kidzy-delivery")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "kidzy-delivery";
    wrapper.className = "kidzy-wrapper";

    wrapper.innerHTML = `

    <div class="kidzy-section">

        <h3 class="kidzy-title">
            🚚 Mode de livraison
        </h3>

        <div class="kidzy-cards">

            <div class="kidzy-card active"
                 data-type="desk">

                <div class="kidzy-icon">
                    📦
                </div>

                <div>

                    <strong>
                        Stop Desk
                    </strong>

                    <small>
                        Livraison en agence
                    </small>

                </div>

                <div class="kidzy-price"
                     id="deskPrice">

                    --

                </div>

            </div>

            <div class="kidzy-card"
                 data-type="domicile">

                <div class="kidzy-icon">
                    🏠
                </div>

                <div>

                    <strong>
                        Domicile
                    </strong>

                    <small>
                        Livraison à domicile
                    </small>

                </div>

                <div class="kidzy-price"
                     id="homePrice">

                    --

                </div>

            </div>

        </div>

    </div>

    <div class="kidzy-summary">

        <div class="row">

            <span>Sous-total</span>

            <span id="subtotal">

                ${formatDA(App.productPrice)}

            </span>

        </div>

        <div class="row">

            <span>Livraison</span>

            <span id="shippingPrice">

                --

            </span>

        </div>

        <hr>

        <div class="row total">

            <span>Total</span>

            <span id="totalPrice">

                ${formatDA(App.productPrice)}

            </span>

        </div>

    </div>

    `;

    communeContainer.after(wrapper);
  }

  /*==========================================
    SHIPPING
==========================================*/

  function updateShippingPrices() {
    if (!App.wilaya) return;

    const shipping = SHIPPING[App.wilaya];

    if (!shipping) return;

    document.getElementById("deskPrice").innerHTML = formatDA(shipping.desk);

    document.getElementById("homePrice").innerHTML = formatDA(
      shipping.domicile,
    );
  }

  /*==========================================
    TOTAL
==========================================*/

  function updateTotal() {
    if (!App.wilaya) return;

    const shipping = SHIPPING[App.wilaya];

    if (!shipping) return;

    App.shipping = App.delivery === "desk" ? shipping.desk : shipping.domicile;

    App.total = App.productPrice + App.shipping;

    document.getElementById("shippingPrice").innerHTML = formatDA(App.shipping);

    document.getElementById("totalPrice").innerHTML = formatDA(App.total);
  }

  /*==========================================
    DELIVERY EVENTS
==========================================*/

  function initDeliveryCards() {
    document.querySelectorAll(".kidzy-card").forEach((card) => {
      card.onclick = () => {
        document
          .querySelectorAll(".kidzy-card")
          .forEach((c) => c.classList.remove("active"));

        card.classList.add("active");

        App.delivery = card.dataset.type;

        updateTotal();
      };
    });
  }

  /*==========================================
    REFRESH AFTER WILAYA CHANGE
==========================================*/

  wilayaSelect.addEventListener("change", () => {
    setTimeout(() => {
      updateShippingPrices();

      updateTotal();
    }, 100);
  });

  /*==========================================
    START UI
==========================================*/

  document.addEventListener("DOMContentLoaded", () => {
    createCheckoutUI();

    initDeliveryCards();
  });

  /*=========================================================
    PART 3
    FINAL EVENTS + VALIDATION
=========================================================*/

  /*==========================================
    VALIDATION
==========================================*/

  function validateCheckout() {
    if (!App.wilaya) {
      alert("Veuillez choisir votre wilaya.");

      return false;
    }

    if (!App.commune) {
      alert("Veuillez choisir votre commune.");

      return false;
    }

    return true;
  }

  /*==========================================
    OBSERVE DOM
==========================================*/

  function observeChanges() {
    const observer = new MutationObserver(() => {
      const summary = document.getElementById("kidzy-delivery");

      if (!summary) {
        createCheckoutUI();

        initDeliveryCards();

        updateShippingPrices();

        updateTotal();
      }
    });

    observer.observe(document.body, {
      childList: true,

      subtree: true,
    });
  }

  /*==========================================
    BUTTON
==========================================*/

  function hookSubmitButton() {
    const buttons = document.querySelectorAll("button");

    buttons.forEach((btn) => {
      const txt = btn.innerText.toLowerCase();

      if (
        txt.includes("commander") ||
        txt.includes("acheter") ||
        txt.includes("order")
      ) {
        btn.addEventListener("click", (e) => {
          if (!validateCheckout()) {
            e.preventDefault();

            e.stopPropagation();
          }
        });
      }
    });
  }

  /*==========================================
    LIVE UPDATE
==========================================*/

  setInterval(() => {
    const currentPrice = document.querySelector(CONFIG.selectors.price);

    if (!currentPrice) return;

    let value = currentPrice.textContent
      .replace(/\s/g, "")
      .replace(/[^\d]/g, "");

    value = parseInt(value) || 0;

    if (value !== App.productPrice) {
      App.productPrice = value;

      updateTotal();

      const subtotal = document.getElementById("subtotal");

      if (subtotal) {
        subtotal.innerHTML = formatDA(value);
      }
    }
  }, 1000);

  /*==========================================
    INIT
==========================================*/

  window.addEventListener("load", () => {
    createCheckoutUI();

    initDeliveryCards();

    updateShippingPrices();

    updateTotal();

    observeChanges();

    hookSubmitButton();
  });

  /*==========================================
    EXTRA EVENTS
==========================================*/

  wilayaSelect.addEventListener("change", () => {
    updateShippingPrices();

    updateTotal();
  });

  communeSelect.addEventListener("change", () => {
    updateTotal();
  });

  /*==========================================
    END
==========================================*/
})();
