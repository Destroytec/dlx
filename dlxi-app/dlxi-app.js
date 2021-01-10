(function(global) {

    let Interpreter = (function() {

        ///////////////////////////////////////////////////////////////////////////////////////////
        // General

        /** The options for the interpreter. */
        let options = {
            maxSteps: 10000,
            maxJumps: 1000,
            maxAutosaves: 5,
            autosaveIntervall: 60,
            numOfRegistryEntries: 32,
            numOfMemoryEntries: 128,
            memoryStart: 1000,
            theme: "lighttheme"
        }

        /** The options of the editor. */
        let editorOptions = {
            theme: "eclipse",
            lineNumbers: true,
            mode: "dlx"
        }

        /** The last line the interpreter was. (For dehighlighting things) */
        let lastLine = 1;

        /** The editor. */
        let editor;

        /** Gets the current date in a short format. */
        let getDate = function() {
            var date = new Date();
            return (date.getYear() + 1900) +
                "-" + String(date.getMonth() + 1).padStart(2, '0') +
                "-" + String(date.getDate()).padStart(2, '0') +
                " " + String(date.getHours()).padStart(2, '0') +
                ":" + String(date.getMinutes()).padStart(2, '0') +
                ":" + String(date.getSeconds()).padStart(2, '0');
        }

        /** Saves the current options from options menu to options. */
        let saveOptions = function() {
            let value;

            // Max steps
            value = parseInt(document.getElementById("maxSteps").value);
            if (!isNaN(value)) {
                if (value <= 0) {
                    updateMessage("The value for maximal steps should be greater than 0.");
                } else {
                    options.maxSteps = value;
                }
            }

            // Max jums
            value = parseInt(document.getElementById("maxJumps").value);
            if (!isNaN(value)) {
                if (value <= 0) {
                    updateMessage("The value for maximal jumps should be greater than 0.");
                } else {
                    options.maxJumps = value;
                }
            }

            // Max autosaves
            value = parseInt(document.getElementById("maxAutosaves").value);
            if (!isNaN(value)) {
                if (value < 0) {
                    updateMessage("The value for maximal autosaves should be greater than or equal 0.");
                } else {
                    options.maxAutosaves = value;
                }
            }

            // Autosave intervall
            value = parseInt(document.getElementById("autosaveIntervall").value);
            if (!isNaN(value)) {
                if (value <= 0) {
                    updateMessage("The value for the intervall of autosaves should be greater than 0.");
                } else {
                    options.autosaveIntervall = value;
                }
            }

            localStorage.setItem("OPTIONS", JSON.stringify(options));
        }

        /** Get saved options. */
        let getSavedOptions = function() {
            let savedOptions = localStorage.getItem("OPTIONS");

            if (savedOptions !== null) {
                options = JSON.parse(savedOptions);
            }
        }

        /** Prints a message into the message box. */
        let updateMessage = function(message) {
            let element = document.getElementById("message");

            if (element.className === "closed") {
                element.children[0].children[0].innerText = "▲ Last message";
                element.className = "expanded";
            }

            element.children[1].children[0].innerHTML = "<p>" + message + "</p>";
        }

        /** Prints the current line in the line box. */
        let updateLine = function() {
            let line = DLX_Interpreter.getLine();
            editor.removeLineClass(lastLine - 1, "background", "currentLine");
            editor.addLineClass(line - 1, "background", "currentLine");
            lastLine = line;
            editor.scrollIntoView({ line: line - 1, ch: 0 });
        }

        /** Resets the line to 1. */
        let resetLine = function() {
            DLX_Interpreter.setLine(1);
            updateLine();
        }

        /** Executes the program. */
        let execute = function() {
            let status;

            // Updating entries and options.
            setEntriesToInterpreter();
            DLX_Interpreter.setOptions(options);

            // Executing the program.
            status = DLX_Interpreter.execute();

            // Updating entries and line number.
            getEntriesFromInterpreter();
            updateLine();

            // Checking if everything is ok.
            if (status !== DLX_Interpreter.OK) {
                updateMessage(status);
                return;
            } else {
                updateMessage("OK");
                return;
            }
        }

        /** Executes only a line of the program. */
        let step = function() {
            let status;

            // Updating entries and options.
            setEntriesToInterpreter();
            DLX_Interpreter.setOptions(options);

            // Executing the program one step.
            status = DLX_Interpreter.step();

            // Updating entries and line number.
            getEntriesFromInterpreter();
            updateLine();

            // Checking if everything is ok.
            if (status !== DLX_Interpreter.OK) {
                updateMessage(status);
                return;
            } else {
                updateMessage("OK");
                return;
            }
        }

        /** Do everything needed to run the interpreter. */
        let start = function() {
            getSavedOptions();
            createEntries();
            createEditor();
            setTimeout(autosave, options.autosaveIntervall * 1000);

            let states = localStorage.getItem("AUTOSAVES");
            if (states !== null) {
                states = JSON.parse(states);
                loadAutosave(states.length - 1);
            }

            if (options.theme !== "lighttheme") {
                document.body.className = "darktheme";
                document.getElementById("changeTheme").firstChild.textContent = "Change to light mode";
            }
        }

        /** Changes the theme. */
        let changeTheme = function() {
            if (options.theme === "lighttheme") {
                options.theme = "darktheme";
                document.body.className = "darktheme";
            } else {
                options.theme = "lighttheme";
                document.body.className = "lighttheme";
            }

            if (options.theme !== "lighttheme") {
                document.getElementById("changeTheme").firstChild.textContent = "Change to light mode";
            } else {
                document.getElementById("changeTheme").firstChild.textContent = "Change to dark mode";
            }

            saveOptions();
        }

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Save / load features

        /** Example programs for the interpreter. */
        let examplePrograms = [{
                name: "8.5.1.3 Assembler-Code für Tausche",
                code: "//Registerbelegung: R1: A, R2: B. Hilfsregister zum Tauschen: R3 und R4\n" +
                    "Start:	LW R1, 1000(R0)		//Lade A nach R1\n" +
                    "		LW R2, 1004(R0)		//Lade B nach R2\n" +
                    "		SLT R3, R2, R1		//Setze R3 (ungleich 0), falls B < A\n" +
                    "		BNEZ R3, Ende		//Zahlen bereits in der richtigen Reihenfolge.\n" +
                    "							//Sonst vertausche A und B durch Ringtausch:\n" +
                    "		ADD R4, R1, R0		//R4 := R1 => C = A\n" +
                    "		ADD R1, R2, R0		//R1 := R2 => A = B\n" +
                    "		ADD R2, R4, R0		//R2 := R4 => B = C\n" +
                    "		SW 1000(R0), R1		//Speichern des Maximums\n" +
                    "		SW 1004(R0), R2		//Speichern des Minimums\n" +
                    "Ende:	HALT				//Ende des Programms"
            },

            {
                name: "8.5.2.2 Assemblerprogramm des Euklid-Algorithmus",
                code: "//Register für A und B:\n" +
                    "//R1 : A\n" +
                    "//R2 : B\n" +
                    "//R3 : Hilfsregister für das Tauschen C\n" +
                    "Start:	LW R1, 1000(R0)	// Lade ersten Operanden\n" +
                    "		LW R2, 1004(R0)	// Lade zweiten Operanden\n" +
                    "Loop:	SEQ R3, R1, R2	// Stelle fest, ob beide gleich sind\n" +
                    "		BNEZ R3, Ende	// Wenn ja, gehe zum Ende\n" +
                    "		SLT R3, R1, R2	// Prüfe, welches die kleinere Zahl ist\n" +
                    "		BEQZ R3, Weiter	// Wenn R1>R2 ist, mache nichts\n" +
                    "		ADD R3, R1, R0	// Andernfalls vertausche R1 und R2\n" +
                    "		ADD R1, R2, R0	// mit diesen drei\n" +
                    "		ADD R2, R3, R0	// Befehlen\n" +
                    "Weiter:	SUB R1, R1, R2	// A := A-B\n" +
                    "		J Loop			// Führe die Schleife ein weiteres Mal aus\n" +
                    "Ende:	SW 1008(R0), R1	// Speichere das Ergebnis\n" +
                    "		HALT			// Beende das Programm"
            },

            {
                name: "8.6.2.1 Beispiel: Unterprogramm zur Modulo-Berechnung",
                code: "//Berechne R5:=(R2 mod R1) + (R4 mod R3) mit Hilfe\n" +
                    "// des angepassten Unterprogramms Up_m_mod_n.\n" +
                    "//Voraussetzungen:\n" +
                    "// Eingabewerte R1 bis R4 sind positive Integerwerte\n" +
                    "// R5: Ergebnis (positiver Integerwert < 231)\n" +
                    "// R6: Hilfsregister\n" +
                    "// R7 bis R29 werden nicht überschrieben\n" +
                    "// R30: ToS (=Top of Stack), zu Beginn ToS=1000 \n" +
                    "Hp_Start:				//Start des Hauptprogramms\n" +
                    "	ADDI R30,R0,#1000	//ToS R30 wird mit 1000 initialisiert\n" +
                    "	//erster UP-Aufruf, Übergabe vom HP auf Stack\n" +
                    "	SW 0(R30),R2		//R2, Speichern der Übergabeparameter auf dem Stack\n" +
                    "	SW 4(R30),R1		//R1, Speichern der Übergabeparameter auf dem Stack\n" +
                    "	SW 8(R30),R0		//Stack-Reservierung für das Ergebnis und Initialisierung\n" +
                    "	ADDI R30,R30,#12	//Erhöhe ToS (3x push, daher 3x4=12 Byte)\n" +
                    "	JAL Up_m_mod_n		//Berechne R2 mod R1 in Unterprogramm\n" +
                    "	SUBI R30,R30,#12	//Reduziere ToS (3x pop auf ToS)\n" +
                    "	LW R5, 8(R30)		//Hole das Ergebnis (R2 mod R1) vom Stack und speichere in R5\n" +
                    "	//Zweite UP-Aufruf, wiederhole Stackprozedur\n" +
                    "	SW 0(R30),R4		//R4, Speichern der Übergabeparameter auf dem Stack\n" +
                    "	SW 4(R30),R3		//R3, für den 2. Aufruf des Unterprogramms mit R4 mod R3\n" +
                    "	SW 8(R30),R0		//Reservierung für das Ergebnis und Initialisierung\n" +
                    "	ADDI R30,R30,#12	//Erhöhung ToS (3x push, daher 3x4=12 Byte)\n" +
                    "	JAL Up_m_mod_n		//Berechne R4 mod R3\n" +
                    "	SUBI R30,R30,#12	//Reduziere ToS (3x pop auf ToS)\n" +
                    "	LW R6, 8(R30)		//Hole das Ergebnis (R4 mod R3) vom Stack und speichere in R6\n" +
                    "	ADD R5,R5,R6		//Berechne das Gesamtergebnis R5=(R2 mod R1) + (R4 mod R3)\n" +
                    "	HALT				//Ende des Hauptprogramms\n" +
                    "Up_m_mod_n:				//Start des Unterprogramms\n" +
                    "	//Berechnet m modulo n für positive Integerwerte m und n.\n" +
                    "	//m und n werden vom Stack geholt und in R1 bzw. R2 gespeichert.\n" +
                    "	//R3 wird als Hilfsregister für Vergleiche verwendet.\n" +
                    "	//Am Programmende wird das Ergebnis auf den Stack geschrieben.\n" +
                    "	// Der Stack ist durch HP schon mit den Übergabeparametern belegt.\n" +
                    "	// ToS (R30) zeigt auf die nächste freie Stackadresse\n" +
                    "	//Alle Operationen ab hier nur Parametersicherung\n" +
                    "	SW 0(R30),R1		//Retten der Registerinhalte R1 bis R3, die vom\n" +
                    "	SW 4(R30),R2		//Unterprogramm überschrieben werden.\n" +
                    "	SW 8(R30),R3\n" +
                    "	SW 12(R30),R31		//Rücksprungadresse sichern, falls innerhalb des Unter-\n" +
                    "						//programms weitere Unterprogramme aufgerufen werden\n" +
                    "	LW R1,-12(R30)		//Holen der HP-Übergabeparameter vom Stack\n" +
                    "	LW R2,-8(R30)\n" +
                    "	ADDI R30,R30,#16	//Erhöhen des Stackpointers (4 x push)\n" +
                    "	//Alle Operationen bis hier nur Parametersicherung\n" +
                    "m_mod_n:				//ab hier beginnt eigentliche Operation des UPs\n" +
                    "	SLT R3,R1,R2		// m < n?\n" +
                    "	BNEZ R3, Fertig		//Falls m<n steht in R1 das Ergebnis m modulo n\n" +
                    "	SUB R1,R1,R2		//m soll solange um n reduziert werden, bis m<n\n" +
                    "	J m_mod_n			// Rücksprung in Schleife\n" +
                    "Fertig:					// die eigentliche Operation des Ups endet hier\n" +
                    "	//Alle Operationen ab hier nur Parametersicherung\n" +
                    "	SUBI R30,R30,#16	//Reduziere Stackpointer, 4 x pop\n" +
                    "	SW -4(R30),R1		//Speichere das Ergebnis auf dem Stack\n" +
                    "	LW R1,0(R30)		//Hole gerettete Registerinhalte vom Stack\n" +
                    "	LW R2,4(R30)\n" +
                    "	LW R3,8(R30)\n" +
                    "	LW R31,12(R30)		//Hole Rücksprungadresse vom Stack\n" +
                    "	//Alle Operationen bis hier nur Parametersicherung\n" +
                    "	JR R31				//Rücksprung zum aufrufenden Programm"
            },

            {
                name: "8.6.3.2 Rekursive Berechnung der Fakultät n!",
                code: "//R1, R2:erste und zweite Zahl\n" +
                    "//R3: Hilfsvariable\n" +
                    "//R4: Stackpointer (ToS)\n" +
                    "//R31: Rücksprungadresse\n" +
                    "Start:\n" +
                    "    ADDI R4, R0, #1256	// Initialisieren ToS\n" +
                    "    LW R1, 1000(R0)		// Lesen der ersten Zahl\n" +
                    "    LW R2, 1004(R0)		// Lesen der zweiten Zahl\n" +
                    "    JAL Euklid			// Aufruf des Unterprogramms\n" +
                    "Rück1:\n" +
                    "    SW 1008(R0), R1		// Wegschreiben des Ergebnisses\n" +
                    "    HALT				// Ende des Programms\n" +
                    "Euklid:\n" +
                    "    SW 0(R4), R31		// Retten von R31\n" +
                    "    ADDI R4, R4, #4		// Hochzählen des ToS\n" +
                    "    SUB R3, R1, R2		// prüfen, ob fertig (A=B)\n" +
                    "    BEQZ R3, Ende		// wenn fertig ans Ende springen\n" +
                    "    SLT R3, R1, R2		// prüfen ob richtige Reihenfolge\n" +
                    "    BEQZ R3, R1GRR2		// wenn ja, ist R1>R2\n" +
                    "    ADD R3, R0, R1		// Vertauschen von R1 und R2\n" +
                    "    ADD R1, R0, R2		// durch Ringtausch\n" +
                    "    ADD R2, R0, R3		//\n" +
                    "R1GRR2:\n" +
                    "    SUB R1, R1, R2		// Verringern von R1 um R2\n" +
                    "    JAL Euklid			// rekursiver Aufruf des Unterprogramms\n" +
                    "Ende:\n" +
                    "    SUBI R4, R4, #4		// Herunterzählen des ToS\n" +
                    "    LW R31, 0(R4)		// Zurückholen von R31\n" +
                    "    JR R31				// Rücksprung"
            }
        ]

        /** Creates/replaces the entries in the save/load box. */
        let createSavesEntries = function() {
            let currentSave,
                buffer = "<div id=saveControls class=content><button onclick=Interpreter.save()><h3>Save current state</h3></button>" +
                "<button onclick=Interpreter.clearAll()><h3>Clear all</h3></button>" +
                "<button onclick=Interpreter.clearEditor()><h3>Clear editor</h3></button>" +
                "<button onclick=Interpreter.clearRegistry()><h3>Clear registry</h3></button>" +
                "<button onclick=Interpreter.clearMemory()><h3>Clear memory</h3></button></div>";

            // Generating the autosaves.
            let autosaves = localStorage.getItem("AUTOSAVES");
            buffer += "<div class=content><h4>Autosaves</h4><div class=saves>";

            if (autosaves !== null) {
                autosaves = JSON.parse(autosaves);

                for (let i = 0; i < autosaves.length; i++) {
                    currentSave = autosaves[i];
                    buffer += "<div class=save><p>From: " + currentSave.date + "</p><div class=controls><button onclick=Interpreter.loadAutosave(" + i + ")><p>Load</p></button></div></div>";
                }
            }

            buffer += "</div></div>";

            // Generating the local saves.
            let saves = localStorage.getItem("SAVES");
            buffer += "<div class=content><h4>Local saves</h4><div class=saves>";

            if (saves !== null) {
                saves = JSON.parse(saves);

                for (let i = 0; i < saves.length; i++) {
                    currentSave = saves[i];
                    buffer += "<div class=save><p>Name: " + currentSave.name + "</p><p>From: " + currentSave.date + "</p><div class=controls>" +
                        "<button onclick=Interpreter.renameSave(" + i + ")><p>Rename</p></button>" +
                        "<button onclick=Interpreter.removeSave(" + i + ")><p>Remove</p></button>" +
                        "<button onclick=Interpreter.overrideSave(" + i + ")><p>Override</p></button>" +
                        "<button onclick=Interpreter.loadSave(" + i + ")><p>Load</p></button>" +
                        "</div></div>";
                }
            }

            buffer += "</div></div>";

            // Generating the examples.
            buffer += "<div class=content><h4>Examples</h4><div class=saves>";

            if (examplePrograms !== null) {
                for (let i = 0; i < examplePrograms.length; i++) {
                    currentSave = examplePrograms[i];
                    buffer += "<div class=save><p>Name: " + currentSave.name + "</p><div class=controls><button onclick=Interpreter.loadExample(" + i + ")><p>Load</p></button></div></div>";
                }
            }

            buffer += "</div></div>";

            document.getElementById("saves").children[1].innerHTML = buffer;
        }

        /** Creates a autosave and scheduled a new autosave. */
        let autosave = function() {
            let autosaves = localStorage.getItem("AUTOSAVES");
            let newAutosave = getState();
            newAutosave.name = "Autosave";

            if (autosaves !== null) {
                autosaves = JSON.parse(autosaves);

                if (autosaves.length >= options.maxAutosaves) {
                    autosaves.shift();
                }
            } else {
                autosaves = [];
            }

            autosaves.push(newAutosave);
            localStorage.setItem("AUTOSAVES", JSON.stringify(autosaves));

            createSavesEntries();
            setTimeout(autosave, options.autosaveIntervall * 1000);
        }

        /** Load a example program. */
        let loadExample = function(id) {
            editor.setValue(examplePrograms[id].code);
            clearMemory();
            clearRegistry();
        }

        /** Load a autosave state. */
        let loadAutosave = function(id) {
            let autosave = JSON.parse(localStorage.getItem("AUTOSAVES"))[id];

            if (autosave.code === undefined) {
                autosave.code = "";
            }

            setState(autosave);
        }

        /** Loads a state. */
        let loadSave = function(id) {
            let save = JSON.parse(localStorage.getItem("SAVES"))[id];

            if (save.code === undefined) {
                save.code = "";
            }

            setState(save);
        }

        /** Saves a state. */
        let save = function() {
            let save = getState();
            save.name = prompt("Type a name for the new save:", "New save");

            let saves = localStorage.getItem("SAVES");

            if (saves !== null) {
                saves = JSON.parse(saves);
            } else {
                saves = [];
            }

            saves.push(save);
            localStorage.setItem("SAVES", JSON.stringify(saves));

            createSavesEntries();
        }

        /** Removes a save state. */
        let removeSave = function(id) {
            let saves = JSON.parse(localStorage.getItem("SAVES"));
            saves.splice(id, 1);
            localStorage.setItem("SAVES", JSON.stringify(saves));
            createSavesEntries();
        }

        /** Renames a state. */
        let renameSave = function(id) {
            let saves = JSON.parse(localStorage.getItem("SAVES"));
            let newName = prompt("The new name of the save:", saves[id].name);

            if (newName === null) {
                return;
            }

            saves[id].name = newName;
            localStorage.setItem("SAVES", JSON.stringify(saves));
            createSavesEntries();
        }

        /** Overrides a state. */
        let overrideSave = function(id) {
            let save = getState();
            let saves = JSON.parse(localStorage.getItem("SAVES"));
            save.name = saves[id].name;

            saves[id] = save;
            localStorage.setItem("SAVES", JSON.stringify(saves));

            createSavesEntries();
        }

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Registry / Memory / Editor manipulation

        /** Returns the current editor, memory and registry values and the date it was created. */
        let getState = function() {
            let state = {};

            // Getting the date and the code of the editor.
            state.date = getDate();
            state.code = editor.getValue();

            // Getting the values from registry entries.
            state.registry = {};
            for (let i = 1; i < options.numOfRegistryEntries; i++) {
                state.registry["R" + i] = document.getElementById("R" + i).value;
            }

            // Getting the values from memory entries.
            state.memory = {};
            for (let i = 0; i < options.numOfMemoryEntries; i++) {
                state.memory[i * 4 + options.memoryStart] = document.getElementById(i * 4 + options.memoryStart).value;
            }

            return state;
        }

        /** Sets a state in the editor, memory and registry. */
        let setState = function(state) {
            // Setting the code into the editor.
            editor.setValue(state.code);

            // Setting the registry entries.
            for (let i = 1; i < options.numOfRegistryEntries; i++) {
                document.getElementById("R" + i).value = state.registry["R" + i];
            }

            // Setting the memory entries.
            for (let i = 0; i < options.numOfMemoryEntries; i++) {
                document.getElementById(i * 4 + options.memoryStart).value = state.memory[i * 4 + options.memoryStart];
            }
        }

        /** Clears editor. */
        let clearEditor = function() {
            editor.setValue("");
        }

        /** Clears the registry. */
        let clearRegistry = function() {
            // Setting all registry entries (except R0) to empty string.
            for (let i = 1; i < options.numOfRegistryEntries; i++) {
                document.getElementById("R" + i).value = "";
            }
        }

        /** Clears the memory. */
        let clearMemory = function() {
            // Setting all memory cells to empty string.
            for (let i = 0; i < options.numOfMemoryEntries; i++) {
                document.getElementById(i * 4 + options.memoryStart).value = "";
            }
        }

        /** Clears editor, registry and memory. */
        let clearAll = function() {
            clearEditor();
            clearRegistry();
            clearMemory();
        }

        /** Creates the entries of the interpreter. */
        let createEntries = function() {
            // Declaring variables.
            var buffer = "",
                id,
                element = document.getElementById("cells");

            // Creating the registry entries.
            buffer += "<h2>Registry</h2><div class=cellsWrapper>";

            // Adding the first registry entries with special atributes.
            buffer += "<div class=cell><p>R0:</p><input id=R0 type=number value=0 disabled=true></div>";

            // Adding the other registry entries.
            for (let i = 1; i < options.numOfRegistryEntries; i++) {
                buffer += "<div class=cell><p>R" + i + ":</p><input id=R" + i + " type=number></div>";
            }

            // Finishing the registry entries.
            buffer += "</div>";

            // Creating the memory entries.
            buffer += "<h2>Memory</h2><div class=cellsWrapper>";

            // Adding the memory entries.
            for (let i = 0; i < options.numOfMemoryEntries; i++) {
                id = 1000 + i * 4;
                buffer += "<div class=cell><p>[" + id + "]:</p><input id=" + id + " type=number></div>";
            }

            // Finishing the memory entries.
            buffer += "</div>";

            // Adding the buffer to the HTML tree.
            element.innerHTML = buffer;
        }

        /** Creates the editor. */
        let createEditor = function() {
            editor = CodeMirror(document.getElementById("editor"), editorOptions);
        }

        //TODO: Write a better interface to update only changed entries. 2020-01-12

        /** Writes all entries in the interpreter. */
        let setEntriesToInterpreter = function() {
            let address;

            for (let i = 1; i < options.numOfRegistryEntries; i++) {
                DLX_Interpreter.setRegistryValue("R" + i, document.getElementById("R" + i).value);
            }

            for (let i = 0; i < options.numOfMemoryEntries; i++) {
                address = (options.memoryStart + i * 4) + "";
                DLX_Interpreter.setMemoryValue(address, document.getElementById(address).value);
            }
        }

        /** Get all entries from the interpreter. */
        let getEntriesFromInterpreter = function() {
            let value,
                address;

            for (let i = 1; i < options.numOfRegistryEntries; i++) {
                value = DLX_Interpreter.getRegistryValue("R" + i);

                if (!isNaN(value)) {
                    document.getElementById("R" + i).value = value;
                }
            }

            for (let i = 0; i < options.numOfMemoryEntries; i++) {
                address = (options.memoryStart + i * 4) + "";
                value = DLX_Interpreter.getMemoryValue(address);

                if (!isNaN(value)) {
                    document.getElementById(address).value = value;
                }
            }
        }

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Box switching

        /** Shows/hides the info box. */
        let switchInfoBox = function() {
            let element = document.getElementById("info");

            // Switching the expand more/less symbol and the class.
            if (element.className === "closed") {
                element.children[0].children[0].innerText = "▲ Info";
                element.className = "expanded";
            } else if (element.className === "expanded") {
                element.children[0].children[0].innerText = "▼ Info";
                element.className = "closed";
            }
        }

        /** Shows/hides the options box. */
        let switchOptionsBox = function() {
            let element = document.getElementById("options");

            // Switching the expand more/less symbol and the class and setting the values if expanding.
            if (element.className === "closed") {
                document.getElementById("maxSteps").value = options.maxSteps;
                document.getElementById("maxJumps").value = options.maxJumps;
                document.getElementById("maxAutosaves").value = options.maxAutosaves;
                document.getElementById("autosaveIntervall").value = options.autosaveIntervall;

                element.children[0].children[0].innerText = "▲ Options";
                element.className = "expanded";
            } else if (element.className === "expanded") {
                element.children[0].children[0].innerText = "▼ Options";
                element.className = "closed";
            }
        }

        /** Shows/hides the save/load box. */
        let switchSavesBox = function() {
            let element = document.getElementById("saves");

            // Switching the expand more/less symbol and the class and creating the saves if expanding.
            if (element.className === "closed") {
                createSavesEntries();

                element.children[0].children[0].innerText = "▲ Save/Load";
                element.className = "expanded";
            } else if (element.className === "expanded") {
                element.children[0].children[0].innerText = "▼ Save/Load";
                element.className = "closed";
            }
        }

        /** Shows/hides the message box. */
        let switchMessageBox = function() {
            let element = document.getElementById("message");

            // Switching the expand more/less symbol and the class.
            if (element.className === "closed") {
                element.children[0].children[0].innerText = "▲ Last message";
                element.className = "expanded";
            } else if (element.className === "expanded") {
                element.children[0].children[0].innerText = "▼ Last message";
                element.className = "closed";
            }
        }

        /** Shows/hides the controls. */
        let switchControlBox = function() {
            let element = document.getElementById("interpreterControls");

            // Switching the expand more/less symbol and the class and setting the interpreter in interpreter / editor mode.
            if (element.className === "closed") {
                let status = DLX_Interpreter.setProgram(editor.getValue());

                if (status !== DLX_Interpreter.OK) {
                    updateMessage(status);
                    updateLine();
                    return;
                }

                DLX_Interpreter.setLine(1);
                updateLine();
                editor.setOption("readOnly", true);
                document.getElementById("editor").className = "readOnly";
                element.children[0].children[0].innerText = "Enter editor mode";
                element.className = "expanded";
            } else if (element.className === "expanded") {
                editor.setOption("readOnly", false);
                document.getElementById("editor").className = "";
                element.children[0].children[0].innerText = "Enter interpreter mode";
                element.className = "closed";
            }
        }

        /** The methods that should be accessable from outside. */
        methods = {
            start: start,

            execute: execute,

            step: step,

            changeTheme: changeTheme,

            switchInfoBox: switchInfoBox,

            switchOptionsBox: switchOptionsBox,

            switchControlBox: switchControlBox,

            switchSavesBox: switchSavesBox,

            switchMessageBox: switchMessageBox,

            saveOptions: saveOptions,

            clearEditor: clearEditor,

            clearRegistry: clearRegistry,

            clearMemory: clearMemory,

            clearAll: clearAll,

            resetLine: resetLine,

            loadExample: loadExample,

            loadAutosave: loadAutosave,

            loadSave: loadSave,

            save: save,

            renameSave: renameSave,

            overrideSave: overrideSave,

            removeSave: removeSave
        };

        return methods;
    })();

    global.Interpreter = Interpreter;
})(this);

document.addEventListener("DOMContentLoaded", Interpreter.start);