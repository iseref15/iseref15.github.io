document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const appTitleElement = document.getElementById('app-title');
    const questionAreaElement = document.getElementById('question-area');
    const questionTextElement = document.getElementById('question-text');
    const optionsAreaElement = document.getElementById('options-area');
    
    const recommendationAreaElement = document.getElementById('recommendation-area');
    const recommendationTitleElement = document.getElementById('recommendation-title');
    const recommendationTextElement = document.getElementById('recommendation-text');
    const restartButton = document.getElementById('restart-button');

    const errorAreaElement = document.getElementById('error-area');
    const errorTextElement = document.getElementById('error-text');
    const errorRestartButton = document.getElementById('error-restart-button');

    // Function to manage button states during transitions
    function disableAllChoiceButtons() {
        optionsAreaElement.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
    }

    function resetButtonStates() {
        optionsAreaElement.querySelectorAll('.choice-button').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected');
        });
    }
    
    // Function to display a question and its options
    function displayQuestion(question, options) {
        questionAreaElement.style.display = 'block';
        recommendationAreaElement.style.display = 'none';
        errorAreaElement.style.display = 'none';
        appTitleElement.textContent = "Find Your Perfect Hotel"; 

        questionTextElement.textContent = question;
        optionsAreaElement.innerHTML = ''; // Clear previous options

        options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.text;
            button.classList.add('choice-button');
            
            button.addEventListener('click', (e) => {
                // Visual feedback: Mark selected and disable all buttons briefly
                disableAllChoiceButtons(); 
                e.target.classList.add('selected');

                // Proceed to next step after a short delay for visual feedback
                setTimeout(() => {
                    resetButtonStates(); // Reset buttons for the next question
                    option.handler(option.value);
                }, 350); // Duration for visual feedback
            });
            optionsAreaElement.appendChild(button);
        });
    }

    // Function to show the final recommendation
    function showRecommendation(message) {
        questionAreaElement.style.display = 'none';
        recommendationAreaElement.style.display = 'block';
        errorAreaElement.style.display = 'none';
        recommendationTextElement.textContent = message;
        appTitleElement.textContent = "Hotel Suggestion";
        recommendationTitleElement.textContent = "Your Personalized Recommendation:";
    }
    
    // Function to show an error message
    function showError(message) {
        questionAreaElement.style.display = 'none';
        recommendationAreaElement.style.display = 'none';
        errorAreaElement.style.display = 'block';
        
        appTitleElement.textContent = "Something Went Wrong";
        errorTextElement.textContent = message;
    }

    // --- Application Flow Functions ---

    function startApp() {
        displayQuestion("What kind of trip are you looking for?", [
            { text: "Summer Vacation", value: "S", handler: handleTripTypeChoice },
            { text: "Winter Getaway", value: "W", handler: handleTripTypeChoice },
            { text: "Not planning a trip now", value: "N", handler: handleTripTypeChoice } // For Logic 7
        ]);
    }

    function handleTripTypeChoice(choice) {
        if (choice === "S") { // Summer
            askSummerPreference();
        } else if (choice === "W") { // Winter
            askWinterSports();
        } else if (choice === "N") { // Neither (Logic 7: ¬S∧¬W → Don’t suggest any hotel)
            showRecommendation("Okay, no hotel will be suggested at this time. Feel free to start over if you change your mind!");
        } else {
            showError("Invalid trip type selected. Please restart.");
        }
    }

    function askSummerPreference() {
        displayQuestion("For your summer vacation, do you prefer a Sea or Pool?", [
            { text: "By the Sea", value: "O", handler: handleSummerPreferenceChoice }, // O for Ocean/Sea
            { text: "Hotel with a Pool", value: "P", handler: handleSummerPreferenceChoice }
        ]);
    }

    function handleSummerPreferenceChoice(choice) {
        if (choice === "O") { // Sea
            askSeaTemperature();
        } else if (choice === "P") { // Pool (Logic 3: S∧P → Suggest hotels which have pool)
            showRecommendation("We recommend hotels which have a lovely pool area for your summer vacation.");
        } else {
            showError("Invalid summer preference selected. Please restart.");
        }
    }

    function askSeaTemperature() {
        displayQuestion("And for the sea, do you prefer it Hot or Cold?", [
            { text: "Warm / Hot Sea", value: "H", handler: handleSeaTemperatureChoice },
            { text: "Cool / Cold Sea", value: "C", handler: handleSeaTemperatureChoice }
        ]);
    }

    function handleSeaTemperatureChoice(choice) {
        if (choice === "H") { // Hot Sea (Logic 1: S∧O∧H → Suggest hotels near hot seas)
            showRecommendation("We recommend hotels near beautiful hot seas for your summer vacation.");
        } else if (choice === "C") { // Cold Sea (Logic 2: S∧O∧C → Suggest hotels near cold seas)
            showRecommendation("We recommend hotels near refreshing cold seas for your summer vacation.");
        } else {
            showError("Invalid sea temperature preference. Please restart.");
        }
    }

    function askWinterSports() {
        displayQuestion("For your winter getaway, do you want to do winter sports?", [
            { text: "Yes, absolutely!", value: "WS", handler: handleWinterSportsChoice }, // WS for Winter Sports
            { text: "No, just relaxing", value: "NOT_WS", handler: handleWinterSportsChoice } // ¬WS
        ]);
    }

    function handleWinterSportsChoice(choice) {
        if (choice === "WS") { // Wants Winter Sports
            askWinterSportsKnowHow();
        } else if (choice === "NOT_WS") { // Does NOT want Winter Sports (Logic 6: W∧¬WS → Suggest hotels just for winter trip)
            showRecommendation("We recommend cozy hotels suitable for a relaxing winter trip, without a focus on sports.");
        } else {
            showError("Invalid winter sports preference. Please restart.");
        }
    }

    function askWinterSportsKnowHow() {
        displayQuestion("Great! And do you already know how to do winter sports?", [
            { text: "Yes, I'm experienced", value: "DWS", handler: handleWinterSportsKnowHowChoice }, // DWS for Does Winter Sports (knows how)
            { text: "No, I'm a beginner / need lessons", value: "NWS", handler: handleWinterSportsKnowHowChoice }  // NWS for Needs Winter Sports (training)
        ]);
    }

    function handleWinterSportsKnowHowChoice(choice) {
        if (choice === "DWS") { // Knows Winter Sports (Logic 4: W∧WS∧DWS → Suggest hotels which have winter sport areas)
            showRecommendation("We recommend hotels which have excellent winter sport areas and facilities for experienced individuals.");
        } else if (choice === "NWS") { // Does NOT know Winter Sports (Logic 5: W∧WS∧NWS → Suggest hotels which have winter sport areas and winter sport teaching)
            showRecommendation("We recommend hotels that have winter sport areas and also offer winter sport teaching or lessons for beginners.");
        } else {
            showError("Invalid input for winter sports knowledge. Please restart.");
        }
    }

    // Event listeners for restart buttons
    restartButton.addEventListener('click', startApp);
    errorRestartButton.addEventListener('click', startApp);

    // Initial call to start the application
    startApp();
});