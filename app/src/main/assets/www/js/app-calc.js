// app-calc.js - Windows 98 Calculator (calc.exe) for IdiotPhone

const AppCalc = {
  currentInput: "0",
  previousInput: null,
  operation: null,
  waitingForOperand: false,
  memory: 0,

  init() {
    this.updateDisplay();
  },

  updateDisplay() {
    const el = document.getElementById("calc-display");
    if (el) el.textContent = this.currentInput;
  },

  inputDigit(digit) {
    SoundManager.playClick();
    if (this.waitingForOperand) {
      this.currentInput = String(digit);
      this.waitingForOperand = false;
    } else {
      this.currentInput = this.currentInput === "0" ? String(digit) : this.currentInput + digit;
    }
    this.updateDisplay();
  },

  inputDecimal() {
    SoundManager.playClick();
    if (this.waitingForOperand) {
      this.currentInput = "0.";
      this.waitingForOperand = false;
    } else if (!this.currentInput.includes(".")) {
      this.currentInput += ".";
    }
    this.updateDisplay();
  },

  clearAll() {
    SoundManager.playClick();
    this.currentInput = "0";
    this.previousInput = null;
    this.operation = null;
    this.waitingForOperand = false;
    this.updateDisplay();
  },

  clearEntry() {
    SoundManager.playClick();
    this.currentInput = "0";
    this.updateDisplay();
  },

  backspace() {
    SoundManager.playClick();
    if (this.currentInput.length > 1) {
      this.currentInput = this.currentInput.slice(0, -1);
    } else {
      this.currentInput = "0";
    }
    this.updateDisplay();
  },

  toggleSign() {
    SoundManager.playClick();
    this.currentInput = String(-parseFloat(this.currentInput));
    this.updateDisplay();
  },

  setOperation(nextOp) {
    SoundManager.playClick();
    const inputValue = parseFloat(this.currentInput);

    if (this.previousInput == null) {
      this.previousInput = inputValue;
    } else if (this.operation) {
      const currentValue = this.previousInput || 0;
      const result = this.calculate(currentValue, inputValue, this.operation);
      this.currentInput = String(result);
      this.previousInput = result;
      this.updateDisplay();
    }

    this.waitingForOperand = true;
    this.operation = nextOp;
  },

  calculate(first, second, op) {
    switch (op) {
      case "+": return first + second;
      case "-": return first - second;
      case "*": return first * second;
      case "/": return second !== 0 ? first / second : "Error";
      default: return second;
    }
  },

  equals() {
    SoundManager.playClick();
    const inputValue = parseFloat(this.currentInput);
    if (this.operation && this.previousInput != null) {
      const result = this.calculate(this.previousInput, inputValue, this.operation);
      this.currentInput = String(result);
      this.previousInput = null;
      this.operation = null;
      this.waitingForOperand = true;
      this.updateDisplay();
    }
  },

  sqrt() {
    SoundManager.playClick();
    const val = parseFloat(this.currentInput);
    if (val >= 0) {
      this.currentInput = String(Math.sqrt(val));
    } else {
      this.currentInput = "Error";
    }
    this.waitingForOperand = true;
    this.updateDisplay();
  },

  percent() {
    SoundManager.playClick();
    this.currentInput = String(parseFloat(this.currentInput) / 100);
    this.updateDisplay();
  },

  reciprocal() {
    SoundManager.playClick();
    const val = parseFloat(this.currentInput);
    if (val !== 0) {
      this.currentInput = String(1 / val);
    } else {
      this.currentInput = "Error";
    }
    this.waitingForOperand = true;
    this.updateDisplay();
  }
};

window.AppCalc = AppCalc;
document.addEventListener("DOMContentLoaded", () => AppCalc.init());
