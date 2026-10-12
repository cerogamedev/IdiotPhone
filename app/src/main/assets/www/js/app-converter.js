// app-converter.js - Unit & Currency Converter 98 for IdiotPhone
// Categories: Length, Weight/Mass, Temperature, Data Storage, Currency

const AppConverter = {
  currentCategory: 'length',

  rates: {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    TRY: 34.2,
    JPY: 152.0
  },

  units: {
    length: {
      meters: 1,
      kilometers: 1000,
      centimeters: 0.01,
      millimeters: 0.001,
      inches: 0.0254,
      feet: 0.3048,
      miles: 1609.34
    },
    weight: {
      kilograms: 1,
      grams: 0.001,
      milligrams: 0.000001,
      pounds: 0.453592,
      ounces: 0.0283495
    },
    data: {
      bytes: 1,
      kilobytes: 1024,
      megabytes: 1024 * 1024,
      gigabytes: 1024 * 1024 * 1024,
      terabytes: 1024 * 1024 * 1024 * 1024
    }
  },

  init() {
    this.setCategory('length');
  },

  setCategory(cat) {
    this.currentCategory = cat;
    document.querySelectorAll('#converter-tabs .tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(`converter-tab-${cat}`);
    if (activeTab) activeTab.classList.add('active');

    this.populateUnits(cat);
    this.convert();
  },

  populateUnits(cat) {
    const fromSel = document.getElementById('converter-from-unit');
    const toSel = document.getElementById('converter-to-unit');
    if (!fromSel || !toSel) return;

    fromSel.innerHTML = '';
    toSel.innerHTML = '';

    if (cat === 'temperature') {
      const temps = ['Celsius (°C)', 'Fahrenheit (°F)', 'Kelvin (K)'];
      temps.forEach(t => {
        fromSel.add(new Option(t, t));
        toSel.add(new Option(t, t));
      });
      toSel.selectedIndex = 1;
      return;
    }

    if (cat === 'currency') {
      Object.keys(this.rates).forEach(c => {
        fromSel.add(new Option(c, c));
        toSel.add(new Option(c, c));
      });
      toSel.selectedIndex = 3; // default TRY
      return;
    }

    const unitKeys = Object.keys(this.units[cat] || {});
    unitKeys.forEach(u => {
      const label = u.charAt(0).toUpperCase() + u.slice(1);
      fromSel.add(new Option(label, u));
      toSel.add(new Option(label, u));
    });
    if (toSel.options.length > 1) {
      toSel.selectedIndex = 1;
    }
  },

  convert() {
    const inputEl = document.getElementById('converter-input-val');
    const outputEl = document.getElementById('converter-output-val');
    const fromSel = document.getElementById('converter-from-unit');
    const toSel = document.getElementById('converter-to-unit');

    if (!inputEl || !outputEl || !fromSel || !toSel) return;

    const val = parseFloat(inputEl.value);
    if (isNaN(val)) {
      outputEl.value = '';
      return;
    }

    const from = fromSel.value;
    const to = toSel.value;

    if (from === to) {
      outputEl.value = val;
      return;
    }

    let result = 0;

    if (this.currentCategory === 'temperature') {
      let celsius = 0;
      if (from.startsWith('Celsius')) celsius = val;
      else if (from.startsWith('Fahrenheit')) celsius = (val - 32) * (5 / 9);
      else if (from.startsWith('Kelvin')) celsius = val - 273.15;

      if (to.startsWith('Celsius')) result = celsius;
      else if (to.startsWith('Fahrenheit')) result = (celsius * (9 / 5)) + 32;
      else if (to.startsWith('Kelvin')) result = celsius + 273.15;
    } else if (this.currentCategory === 'currency') {
      // Convert via USD base
      const inUSD = val / this.rates[from];
      result = inUSD * this.rates[to];
    } else {
      const baseVal = val * this.units[this.currentCategory][from];
      result = baseVal / this.units[this.currentCategory][to];
    }

    outputEl.value = Number(result.toFixed(4));
  },

  swap() {
    const fromSel = document.getElementById('converter-from-unit');
    const toSel = document.getElementById('converter-to-unit');
    if (!fromSel || !toSel) return;

    const temp = fromSel.selectedIndex;
    fromSel.selectedIndex = toSel.selectedIndex;
    toSel.selectedIndex = temp;
    this.convert();
  }
};

window.AppConverter = AppConverter;
