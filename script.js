// script.js

// Global variables to store calculated values
let currentBMR = 0;
let currentTDEE = 0;

// Get references to DOM elements
const genderFemale = document.getElementById('genderFemale');
const genderMale = document.getElementById('genderMale');
const weightInput = document.getElementById('weight');
const heightInput = document.getElementById('height');
const ageInput = document.getElementById('age');
const calculateAllBtn = document.getElementById('calculateAllBtn'); // Updated button ID
const bmrResultSpan = document.getElementById('bmrResult');
const tdeeResultSpan = document.getElementById('tdeeResult');
const finalCalorieResultSpan = document.getElementById('finalCalorieResult');

// Error message elements
const genderError = document.getElementById('genderError');
const weightError = document.getElementById('weightError');
const heightError = document.getElementById('heightError');
const ageError = document.getElementById('ageError');
const activityError = document.getElementById('activityError');
const goalError = document.getElementById('goalError');
const messageBox = document.getElementById('messageBox');
const messageBoxText = document.getElementById('messageBoxText');
const closeMessageBox = document.getElementById('closeMessageBox');

// Activity level radio buttons
const activityRadios = document.querySelectorAll('input[name="activityLevel"]');
// Goal radio buttons
const goalRadios = document.querySelectorAll('input[name="goal"]');


// --- Helper Functions for UI and Validation ---

/**
 * Displays an error message for a given input field.
 * @param {HTMLElement} element - The input element to apply error styles to.
 * @param {HTMLElement} errorSpan - The span element to display the error text in.
 * @param {string} message - The error message text.
 */
function displayInputError(element, errorSpan, message) {
    // For radio buttons, the 'element' might be the first radio, but we want to apply class to its parent label for visual feedback.
    // However, the error message span is what we directly control.
    // Adding 'error-input' to an input makes its border red.
    element.classList.add('error-input');
    errorSpan.textContent = message;
    errorSpan.style.display = 'block'; // Show error message
}

/**
 * Clears the error message for a given input field.
 * @param {HTMLElement} element - The input element to remove error styles from.
 * @param {HTMLElement} errorSpan - The span element to hide the error text from.
 */
function clearInputError(element, errorSpan) {
    element.classList.remove('error-input'); // Remove red border
    errorSpan.style.display = 'none'; // Hide error message
    errorSpan.textContent = '';
}

/**
 * Displays a global message in the message box.
 * @param {string} message - The message to display.
 * @param {string} type - 'error' or 'info'.
 */
function showMessageBox(message, type = 'error') {
    messageBoxText.textContent = message;
    messageBox.classList.remove('hidden');
    if (type === 'error') {
        messageBox.classList.remove('bg-blue-100', 'border-blue-400', 'text-blue-700');
        messageBox.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
    } else { // info
        messageBox.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
        messageBox.classList.add('bg-blue-100', 'border-blue-400', 'text-blue-700');
    }
}

/**
 * Hides the global message box.
 */
function hideMessageBox() {
    messageBox.classList.add('hidden');
    messageBoxText.textContent = '';
}

/**
 * Validates all input fields and returns true if all are valid.
 * This function also applies/clears error styles.
 * @returns {boolean} - True if inputs are valid, false otherwise.
 */
function validateAllInputs() {
    let isValid = true;

    // Validate Gender
    const selectedGender = document.querySelector('input[name="gender"]:checked');
    if (!selectedGender) {
        displayInputError(genderFemale, genderError, 'Lütfen cinsiyetinizi seçiniz.');
        isValid = false;
    } else {
        clearInputError(genderFemale, genderError);
    }

    // Validate Weight
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) {
        displayInputError(weightInput, weightError, 'Lütfen geçerli bir kilo giriniz (örn: > 0 kg).');
        isValid = false;
    } else {
        clearInputError(weightInput, weightError);
    }

    // Validate Height
    const height = parseFloat(heightInput.value);
    if (isNaN(height) || height <= 0) {
        displayInputError(heightInput, heightError, 'Lütfen geçerli bir boy giriniz (örn: > 0 cm).');
        isValid = false;
    } else {
        clearInputError(heightInput, heightError);
    }

    // Validate Age
    const age = parseInt(ageInput.value);
    if (isNaN(age) || age <= 0 || age > 120) {
        displayInputError(ageInput, ageError, 'Lütfen geçerli bir yaş giriniz (1-120 yıl).');
        isValid = false;
    } else {
        clearInputError(ageInput, ageError);
    }

    // Validate Activity Level
    const selectedActivity = document.querySelector('input[name="activityLevel"]:checked');
    if (!selectedActivity) {
        displayInputError(activityRadios[0], activityError, 'Lütfen aktivite seviyenizi seçiniz.');
        isValid = false;
    } else {
        clearInputError(activityRadios[0], activityError);
    }

    // Validate Goal
    const selectedGoal = document.querySelector('input[name="goal"]:checked');
    if (!selectedGoal) {
        displayInputError(goalRadios[0], goalError, 'Lütfen hedefinizi seçiniz.');
        isValid = false;
    } else {
        clearInputError(goalRadios[0], goalError);
    }

    return isValid;
}

// --- Calculation Functions ---

/**
 * Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation.
 * @param {string} gender - 'male' or 'female'.
 * @param {number} weight - Weight in kg.
 * @param {number} height - Height in cm.
 * @param {number} age - Age in years.
 * @returns {number} - Calculated BMR in kcal.
 */
function calculateBMR(gender, weight, height, age) {
    if (gender === 'female') {
        // BMR for Woman (Mifflin-St Jeor): (10 x W) + (6.25 x H) - (5 x A) - 161
        return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    } else { // male
        // BMR for Man (Mifflin-St Jeor): (10 x W) + (6.25 x H) - (5 * A) + 5
        return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    }
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 * @param {number} bmr - Basal Metabolic Rate.
 * @param {string} activityLevel - Selected activity level.
 * @returns {number} - Calculated TDEE in kcal.
 */
function calculateTDEE(bmr, activityLevel) {
    let activityFactor = 1.2; // Default to sedentary

    switch (activityLevel) {
        case 'sedentary':
            activityFactor = 1.2; // Little or no exercise
            break;
        case 'light':
            activityFactor = 1.375; // Light exercise/sports 1-3 days/week
            break;
        case 'moderate':
            activityFactor = 1.55; // Moderate exercise/sports 3-5 days/week
            break;
        case 'high':
            activityFactor = 1.725; // Hard exercise/sports 6-7 days a week
            break;
        default:
            activityFactor = 1.2; // Fallback
    }
    return bmr * activityFactor;
}

/**
 * Calculates the final daily calorie requirement based on goal.
 * @param {number} tdee - Total Daily Energy Expenditure.
 * @param {string} goal - User's selected goal ('lose', 'maintain', 'gain').
 * @returns {number} - Final daily calorie requirement in kcal.
 */
function calculateFinalCalories(tdee, goal) {
    let finalCalories = tdee;

    switch (goal) {
        case 'lose':
            finalCalories = tdee * 0.85; // 15% deficit (changed from 20%)
            break;
        case 'maintain':
            finalCalories = tdee; // No change
            break;
        case 'gain':
            finalCalories = tdee * 1.10; // 10% surplus (changed from 15%)
            break;
        default:
            finalCalories = tdee; // Fallback
    }
    return finalCalories;
}


// --- Event Handlers ---

/**
 * Handles the calculation of BMR, TDEE, and Final Calorie Need when the single "Hesapla" button is clicked.
 */
calculateAllBtn.addEventListener('click', () => {
    hideMessageBox(); // Hide any previous global messages

    if (!validateAllInputs()) {
        showMessageBox('Lütfen vurgulanan giriş hatalarını düzeltiniz.', 'error');
        // Clear previous results if validation fails
        bmrResultSpan.textContent = '--';
        tdeeResultSpan.textContent = '--';
        finalCalorieResultSpan.textContent = '--';
        return; // Stop if validation fails
    }

    // Get all input values (already validated by validateAllInputs)
    const selectedGender = document.querySelector('input[name="gender"]:checked').value;
    const weight = parseFloat(weightInput.value);
    const height = parseFloat(heightInput.value);
    const age = parseInt(ageInput.value);
    const selectedActivity = document.querySelector('input[name="activityLevel"]:checked').value;
    const selectedGoal = document.querySelector('input[name="goal"]:checked').value;

    // Perform all calculations in order
    currentBMR = calculateBMR(selectedGender, weight, height, age);
    currentTDEE = calculateTDEE(currentBMR, selectedActivity);
    const finalCalorieNeed = calculateFinalCalories(currentTDEE, selectedGoal);

    // Display all results
    bmrResultSpan.textContent = currentBMR.toFixed(0);
    tdeeResultSpan.textContent = currentTDEE.toFixed(0);
    finalCalorieResultSpan.textContent = finalCalorieNeed.toFixed(0);
});


// Close message box event listener
closeMessageBox.addEventListener('click', () => {
    hideMessageBox();
});

// Initial clear of result spans and error messages on page load
document.addEventListener('DOMContentLoaded', () => {
    bmrResultSpan.textContent = '--';
    tdeeResultSpan.textContent = '--';
    finalCalorieResultSpan.textContent = '--';
    hideMessageBox();

    // Attach input event listeners to clear errors as user types/selects
    weightInput.addEventListener('input', () => clearInputError(weightInput, weightError));
    heightInput.addEventListener('input', () => clearInputError(heightInput, heightError));
    ageInput.addEventListener('input', () => clearInputError(ageInput, ageError));
    genderFemale.addEventListener('change', () => clearInputError(genderFemale, genderError));
    genderMale.addEventListener('change', () => clearInputError(genderMale, genderError));

    // Clear errors for activity and goal radios when they are selected
    activityRadios.forEach(radio => radio.addEventListener('change', () => clearInputError(radio, activityError)));
    goalRadios.forEach(radio => radio.addEventListener('change', () => clearInputError(radio, goalError)));
});
