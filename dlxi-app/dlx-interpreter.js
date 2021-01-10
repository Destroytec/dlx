(function (global) {

    let DLX_Interpreter = (function () {

        ///////////////////////////////////////////////////////////////////////////////////////////
        // General

        // Error messages.
        let ERROR_ADDRESS_EXPECTED = "A $TYPE$ address was as $POS$ argument expected, but got \"$ADDRESS$\".";
        let ERROR_NUMBER_OF_ARGUMENTS = "$NAME$ needs $EXPECTED_NUMBER$ arguments, but got $NUMBER$."
        let ERROR_NO_VALUE = "$TYPE$ entry \"$ADDRESS$\" does not contain a number."
        let ERROR_READ_ONLY = "R0 is read-only.";
        let ERROR_LABEL_NOT_FOUND = "Label \"$LABEL$\" not found.";
        let ERROR_OPCODE_NOT_FOUND = "Opcode \"$OPCODE$\" not found.";
        let ERROR_INVALID_DIRECT_ADDRESS = "The memory address \"$DIRECT_ADDRESS$\" is not valid. It was calculated from\"$ADDRESS$\".";
        let ERROR_HALT_NOT_FOUND = "The interpreter run out of lines because it has not reached a \"HALT\" opcode.";
        let ERROR_IMMEDIATE_VALUE_EXPECTED = "A immediate value was as $POS$ argument expected, but got \"$VALUE$\".";
        let ERROR_TOO_MANY_JUMPS = "The interpreter jumped from line $FROM_LINE$ to line $TO_LINE$ too many times. You are probably in a loop. If not, raise the maximum jumps in the options.";
        let ERROR_TOO_MANY_STEPS = "The interpreter interpreted too many lines. You are probably in a loop. If not, raise the maximum steps in the options.";

        /** Status code if everything is fine. */
        let OK = 1;

        /** Status code if interpreter stops. */
        let HALT = 0;

        /** Contains all currently implemented opcodes. */
        let commands = {

            ///////////////////////////////////////////////////////////////////////////////////////
            // DATA TRANSFERS

            // Load word
            LW: function (args) {
                let address,
                    indirectValue,
                    directValue;

                directValue = parseInt(/^-?[0-9]+/.exec(args[1])[0]);
                indirectValue = parseInt(registry[/R[0-9]+/.exec(args[1])[0]]);

                // Checking if the indirect value is a number.
                if (isNaN(indirectValue)) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", /R[0-9]+/.exec(args[1])[0]);
                }

                address = directValue + indirectValue;

                // Checking if it is a valid direct address.
                if (!isDirectMemoryAddress(address)) {
                    return ERROR_INVALID_DIRECT_ADDRESS.replace("$DIRECT_ADDRESS$", address).replace("$ADDRESS$", args[1]);
                }

                // Checking if entries have values.
                if (isNaN(memory[address])) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Memory").replace("$ADDRESS$", address);
                }

                // Actual code.
                registry[args[0]] = memory[address];

                return OK;
            },

            // Save word
            SW: function (args) {
                let address,
                    indirectValue,
                    directValue;

                directValue = parseInt(/^-?[0-9]+/.exec(args[0])[0]);
                indirectValue = parseInt(registry[/R[0-9]+/.exec(args[0])[0]]);

                // Checking if the indirect value is a number.
                if (isNaN(indirectValue)) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", /R[0-9]+/.exec(args[0])[0]);
                }

                address = directValue + indirectValue;

                // Checking if it is a valid direct address.
                if (!isDirectMemoryAddress(address)) {
                    return ERROR_INVALID_DIRECT_ADDRESS.replace("$DIRECT_ADDRESS$", address).replace("$ADDRESS$", args[0]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[1]])) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[1]);
                }

                // Actual code.
                memory[address] = registry[args[1]];

                return OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // ARITHMETIC

            // Add
            ADD: function (args) {
                // Check for valid input.
                let status = checkRCommand("ADD", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] + registry[args[2]];

                return OK;
            },

            // Sub
            SUB: function (args) {
                // Check for valid input.
                let status = checkRCommand("SUB", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] - registry[args[2]];

                return OK;
            },

            // Multiplikation
            MULT: function (args) {
                // Check for valid input.
                let status = checkRCommand("MULT", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] * registry[args[2]];

                return OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // ARITHMETIC IMMEDIATE

            // Add immediate
            ADDI: function (args) {
                // Check for valid input.
                let status = checkICommand("ADDI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] + parseInt(args[2].replace("#", ""));

                return OK;
            },

            // Sub immediate
            SUBI: function (args) {
                // Check for valid input.
                let status = checkICommand("SUBI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] - parseInt(args[2].replace("#", ""));

                return OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // LOGIC

            // AND
            AND: function (args) {
                // Check for valid input.
                let status = checkRCommand("AND", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] & registry[args[2]];

                return OK;
            },

            // OR
            OR: function (args) {
                // Check for valid input.
                let status = checkRCommand("OR", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] | registry[args[2]];

                return OK;
            },

            // XOR
            XOR: function (args) {
                // Check for valid input.
                let status = checkRCommand("XOR", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] ^ registry[args[2]];

                return OK;
            },

            // Set equal
            SEQ: function (args) {
                // Check for valid input.
                let status = checkRCommand("SEQ", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] == registry[args[2]]) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            // Set less than or equal
            SLE: function (args) {
                // Check for valid input.
                let status = checkRCommand("SLE", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] <= registry[args[2]]) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            // Set less than
            SLT: function (args) {
                // Check for valid input.
                let status = checkRCommand("SLT", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] < registry[args[2]]) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            // Set not equal
            SNE: function (args) {
                // Check for valid input.
                let status = checkRCommand("SNE", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] != registry[args[2]]) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // LOGIC IMMEDIATE

            // AND immediate
            ANDI: function (args) {
                // Check for valid input.
                let status = checkICommand("ANDI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] & parseInt(args[2].replace("#", ""));

                return OK;
            },

            // OR immediate
            ORI: function (args) {
                // Check for valid input.
                let status = checkICommand("ORI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] | parseInt(args[2].replace("#", ""));

                return OK;
            },

            // XOR immediate
            XORI: function (args) {
                // Check for valid input.
                let status = checkICommand("XORI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] ^ parseInt(args[2].replace("#", ""));

                return OK;
            },

            // Set equal immediate
            SEQI: function (args) {
                // Check for valid input.
                let status = checkICommand("SEQI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] == parseInt(args[2].replace("#", ""))) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            // Set less than or equal immediate
            SLEI: function (args) {
                // Check for valid input.
                let status = checkICommand("SLEI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] <= parseInt(args[2].replace("#", ""))) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            // Set less than immediate
            SLTI: function (args) {
                // Check for valid input.
                let status = checkICommand("SLTI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] < parseInt(args[2].replace("#", ""))) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            // Set not equal immediate
            SNEI: function (args) {
                // Check for valid input.
                let status = checkICommand("SNEI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                if (registry[args[1]] != parseInt(args[2].replace("#", ""))) {
                    registry[args[0]] = 1;
                } else {
                    registry[args[0]] = 0;
                }

                return OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // SHIFT

            // Shift left logical
            SLL: function (args) {
                // Check for valid input.
                let status = checkRCommand("SLL", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] << registry[args[2]];

                return OK;
            },

            // Shift right arithmetic
            SRA: function (args) {
                // Check for valid input.
                let status = checkRCommand("SRA", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] >> registry[args[2]];

                return OK;
            },

            // Shift right logical
            SRL: function (args) {
                // Check for valid input.
                let status = checkRCommand("SRL", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] >>> registry[args[2]];

                return OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // SHIFT IMMEDIATE

            // Shift left logical immediate
            SLLI: function (args) {
                // Check for valid input.
                let status = checkICommand("SLLI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] << parseInt(args[2].replace("#", ""));

                return OK;
            },

            // Shift right arithmetic immediate
            SRAI: function (args) {
                // Check for valid input.
                let status = checkICommand("SRAI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] >> parseInt(args[2].replace("#", ""));

                return OK;
            },

            // Shift right logical immediate
            SRLI: function (args) {
                // Check for valid input.
                let status = checkICommand("SRLI", args);

                if (status !== OK) {
                    return status;
                }

                // Actual code.
                registry[args[0]] = registry[args[1]] >>> parseInt(args[2].replace("#", ""));

                return OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // CONTROL

            // Branch not equals zero
            BNEZ: function (args) {
                // Checking the type of the arguments.
                if (labels[args[1]] === undefined) {
                    return ERROR_LABEL_NOT_FOUND.replace("$LABEL$", args[1]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[0]);
                }

                // Actual code.
                if (registry[args[0]] !== 0) {
                    // Counting jump and checking if it was too much.
                    if (++jumps[line - 1][labels[args[1]]] > options.maxJumps) {
                        return ERROR_TOO_MANY_JUMPS.replace("$FROM_LINE$", (line - 1)).replace("$TO_LINE$", (labels[args[1]]));
                    }

                    line = labels[args[1]];
                }

                return OK;
            },

            // Branch equals zero
            BEQZ: function (args) {
                // Checking the type of the arguments.
                if (labels[args[1]] === undefined) {
                    return ERROR_LABEL_NOT_FOUND.replace("$LABEL$", args[1]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[0]);
                }

                // Actual code.
                if (registry[args[0]] === 0) {
                    // Counting jump and checking if it was too much.
                    if (++jumps[line - 1][labels[args[1]]] > options.maxJumps) {
                        return ERROR_TOO_MANY_JUMPS.replace("$FROM_LINE$", (line - 1)).replace("$TO_LINE$", (labels[args[1]]));
                    }

                    line = labels[args[1]];
                }

                return OK;
            },

            // Jump
            J: function (args) {
                // Checking the type of the arguments.
                if (labels[args[0]] === undefined) {
                    return ERROR_LABEL_NOT_FOUND.replace("$LABEL$", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][labels[args[0]]] > options.maxJumps) {
                    return ERROR_TOO_MANY_JUMPS.replace("$FROM_LINE$", (line - 1)).replace("$TO_LINE$", labels[args[0]]);
                }

                // Actual code.
                line = labels[args[0]];

                return OK;
            },

            // Jump registry
            JR: function (args) {
                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][registry[args[0]]] > options.maxJumps) {
                    return ERROR_TOO_MANY_JUMPS.replace("$FROM_LINE$", (line - 1)).replace("$TO_LINE$", (registry[args[0]]));
                }

                // Actual code.
                line = registry[args[0]];

                return OK;
            },

            // Jump and link
            JAL: function (args) {
                // Checking the type of the arguments.
                if (labels[args[0]] === undefined) {
                    return ERROR_LABEL_NOT_FOUND.replace("$LABEL$", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][labels[args[0]]] > options.maxJumps) {
                    return ERROR_TOO_MANY_JUMPS.replace("$FROM_LINE$", (line - 1)).replace("$TO_LINE$", (labels[args[0]]));
                }

                // Actual code.
                registry["R31"] = line;
                line = labels[args[0]];

                return OK;
            },

            // Jump and link registry
            JALR: function (args) {
                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][registry[args[0]]] > options.maxJumps) {
                    return ERROR_TOO_MANY_JUMPS.replace("$FROM_LINE$", (line - 1)).replace("$TO_LINE$", (registry[args[0]]));
                }

                // Actual code.
                registry["R31"] = line;
                line = registry[args[0]];

                return OK;
            },

            // Halt
            HALT: function (args) {
                // Actual code.
                line = 1;

                return HALT;
            }
        }

        /** Contains the command type of a command. */
        let commandType = {
            LW: "L",
            SW: "S",
            ADD: "R",
            SUB: "R",
            MULT: "R",
            AND: "R",
            OR: "R",
            XOR: "R",
            SLL: "R",
            SRL: "R",
            SRA: "R",
            SLT: "R",
            SLE: "R",
            SEQ: "R",
            SNE: "R",
            ADDI: "I",
            SUBI: "I",
            ANDI: "I",
            ORI: "I",
            XORI: "I",
            SLLI: "I",
            SRLI: "I",
            SRAI: "I",
            SLTI: "I",
            SLEI: "I",
            SEQI: "I",
            SNEI: "I",
            BEQZ: "J",
            BNEZ: "J",
            J: "J",
            JR: "J",
            JAL: "J",
            JALR: "J",
            HALT: ""
        }

        /** The options of the interpreter. */
        let options;

        /** The program that the interpreter should interpret. */
        let program;

        /** A reference for the labels in the program. */
        let labels;

        /** The current line of the program. */
        let line = 1;

        /** The current jumps from lines to lines. */
        let jumps;

        /** Sets new options. */
        let setOptions = function (newOptions) {
            options = newOptions;
        }

        /** Returns the current line. */
        let getLine = function () {
            return line;
        }

        /** Sets the current line. */
        let setLine = function (newLine) {
            if (program === undefined) {
                line = 1;
                return;
            }

            if (newLine > program.length) {
                throw "The new line is too big, program has only " + program.length + " lines.";
            }

            line = newLine;
        }

        /** Checks, if the R command arguments are valid. */
        let checkRCommand = function (name, args) {
            // Checking if entries have values.
            if (isNaN(registry[args[1]])) {
                return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[1]);
            }
            if (isNaN(registry[args[2]])) {
                return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[2]);
            }

            return OK;
        }

        /** Checks, if the I command arguments are valid. */
        let checkICommand = function (name, args) {
            // Checking if entries have values.
            if (isNaN(registry[args[1]])) {
                return ERROR_NO_VALUE.replace("$TYPE$", "Registry").replace("$ADDRESS$", args[1]);
            }

            return OK;
        }

        /** Runs a command. */
        let run = function (command) {
            line++;

            // Checking if the line has an opcode.
            if (command.opcode === "") {
                return OK;
            }

            return commands[command.opcode](command.args);
        }

        /** Executes the program. */
        let execute = function () {
            let status,
                isFirstLine = true,
                totalSteps = 0;

            // Resetting jumps.
            jumps = [];

            for (let i = 0; i <= program.length; i++) {
                buffer = [];

                for (let j = 0; j <= program.length; j++) {
                    buffer[j] = 0;
                }

                jumps[i] = buffer;
            }

            // Resetting line if needed.
            if (line > program.length) {
                line = 1;
            }

            while (true) {
                // Checking if the program runs too many steps.
                if (++totalSteps > options.maxSteps) {
                    return ERROR_TOO_MANY_STEPS;
                }

                // Checking if there is a breakpoint.
                if (program[line - 1].breakpoint && !isFirstLine) {
                    return OK;
                }

                isFirstLine = false;

                status = run(program[line - 1]);

                // Checking if the interpreter reached the end of the program.
                if (status === OK && line > program.length) {
                    line = 1;
                    return ERROR_HALT_NOT_FOUND;
                }

                // Checking if everything else is fine.
                if (status === OK) {
                    continue;
                }

                // Checking if it encounters a HALT opcode.
                if (status === HALT) {
                    return OK;
                }

                line--;
                return "Error in line " + (line) + ": " + status;
            }
        }

        /** Executes only a line. */
        let step = function () {
            let status;

            // Resetting line if needed.
            if (line > program.length) {
                line = 1;
            }

            // Run one line
            status = run(program[line - 1]);

            // Checking if everything is ok.
            if (status === OK && line > program.length) {
                line = 1;
                return ERROR_HALT_NOT_FOUND;
            }

            if (status === HALT || status === OK) {
                return OK;
            }

            line--;
            return "Error in line " + (line) + ": " + status;
        }

        /** Sets a new program. */
        let setProgram = function (newProgram) {
            let rWrongLabel = /^\s*.+(?=:)/,
                rRightLabel = /^\s*[.\S]+(?=:)/,
                rBreakpoint = /^>/,
                rOpcode = /^\w+/,
                label,
                i,
                currentLine,
                currentLineObject,
                commandTypeValue,
                buffer;

            line = 1;
            program = newProgram.split("\n");
            labels = {};
            jumps = [];

            // Creating jump array.
            for (let i = 0; i <= program.length; i++) {
                buffer = [];

                for (let j = 0; j <= program.length; j++) {
                    buffer[j] = 0;
                }

                jumps[i] = buffer;
            }

            for (let i = 0; i < program.length; i++) {
                // Creating a new current line object.
                currentLineObject = {
                    breakpoint: false,
                    opcode: "",
                    args: []
                };

                // Deleting the comment from the line.
                currentLine = program[i].replace(/\/\/.*/, "").trim();

                // Checking for correct label.
                if (rWrongLabel.test(currentLine) && !rRightLabel.test(currentLine)) {
                    program = [];
                    return "Error in line " + (i + 1) + ": " + "Label \"" + rWrongLabel.exec(currentLine)[0] + "\" does contain whitespace.";
                }

                // Adding the label, if existing.
                if (rRightLabel.test(currentLine)) {
                    label = rRightLabel.exec(currentLine)[0];

                    if (labels[label] !== undefined) {
                        program = [];
                        return "Error in line " + (i + 1) + ": " + "You used \"" + label + "\" at line " + labels[label] + "before.";
                    }

                    labels[label] = i + 1;
                    currentLine = currentLine.replace(/^.+:/, "").trim();
                }

                // Adding breakpoint information when breakpoint found.
                if (rBreakpoint.test(currentLine)) {
                    currentLineObject.breakpoint = true;
                    currentLine = currentLine.replace(rBreakpoint, "").trim();
                }

                // If there is at least one word, it must be the opcode.
                if (rOpcode.test(currentLine)) {
                    currentLineObject.opcode = rOpcode.exec(currentLine)[0];
                    currentLine = currentLine.replace(rOpcode, "").trim();


                    // If there are still words, it must be the arguments, splitted by commas.
                    if (currentLine !== "") {
                        currentLineObject.args = currentLine.split(/\s*,\s*/);
                    }

                    commandTypeValue = commandType[currentLineObject.opcode];

                    // Checking if the opcode exists.
                    if (commandTypeValue === undefined) {
                        return "Error in line " + (i + 1) + ": " + ERROR_OPCODE_NOT_FOUND.replace("$OPCODE$", currentLineObject.opcode);
                    }

                    // Checking if the arguments are valid.
                    if (commandTypeValue === "R" || commandTypeValue === "I") {
                        // Checking number of arguments.
                        if (currentLineObject.args.length != 3) {
                            return "Error in line " + (i + 1) + ": " + ERROR_NUMBER_OF_ARGUMENTS.replace("$NAME$", currentLineObject.opcode).replace("$EXPECTED_NUMBER$", "3").replace("$NUMBER$", currentLineObject.args.length);
                        }

                        // Checking the type of the arguments.
                        if (!isRegistryAddress(currentLineObject.args[0])) {
                            return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "registry").replace("$POS$", "first").replace("$ADDRESS$", currentLineObject.args[0]);
                        }
                        if (!isRegistryAddress(currentLineObject.args[1])) {
                            return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "registry").replace("$POS$", "second").replace("$ADDRESS$", currentLineObject.args[1]);
                        }
                        if (commandTypeValue === "R") {
                            if (!isRegistryAddress(currentLineObject.args[2])) {
                                return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "registry").replace("$POS$", "third").replace("$ADDRESS$", currentLineObject.args[2]);
                            }
                        } else {
                            if (!isImmediateValue(currentLineObject.args[2])) {
                                return "Error in line " + (i + 1) + ": " + ERROR_IMMEDIATE_VALUE_EXPECTED.replace("$POS$", "third").replace("$VALUE$", currentLineObject.args[2]);
                            }
                        }

                        // Checking if it tries to override R0.
                        if (currentLineObject.args[0] === "R0") {
                            return "Error in line " + (i + 1) + ": " + ERROR_READ_ONLY;
                        }
                    } else if (commandTypeValue === "J") {
                        if (currentLineObject.opcode === "BNEZ" || currentLineObject.opcode === "BEQZ") {
                            // Checking number of arguments.
                            if (currentLineObject.args.length != 2) {
                                return "Error in line " + (i + 1) + ": " + ERROR_NUMBER_OF_ARGUMENTS.replace("$NAME$", currentLineObject.opcode).replace("$EXPECTED_NUMBER$", "2").replace("$NUMBER$", currentLineObject.args.length);
                            }

                            // Checking the type of the arguments.
                            if (!isRegistryAddress(currentLineObject.args[0])) {
                                return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "registry").replace("$POS$", "first").replace("$ADDRESS$", currentLineObject.args[0]);
                            }
                        } else {
                            // Checking number of arguments.
                            if (currentLineObject.args.length != 1) {
                                return "Error in line " + (i + 1) + ": " + ERROR_NUMBER_OF_ARGUMENTS.replace("$NAME$", currentLineObject.opcode).replace("$EXPECTED_NUMBER$", "1").replace("$NUMBER$", currentLineObject.args.length);
                            }

                            if (currentLineObject.opcode === "JR" || currentLineObject.opcode === "JALR") {
                                // Checking the type of the arguments.
                                if (!isRegistryAddress(currentLineObject.args[0])) {
                                    return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "registry").replace("$POS$", "first").replace("$ADDRESS$", currentLineObject.args[0]);
                                }
                            }
                        }
                    } else if (currentLineObject.opcode === "SW" || currentLineObject.opcode === "LW") {
                        // Checking number of arguments.
                        if (currentLineObject.args.length != 2) {
                            return "Error in line " + (i + 1) + ": " + ERROR_NUMBER_OF_ARGUMENTS.replace("$NAME$", currentLineObject.opcode).replace("$EXPECTED_NUMBER$", "2").replace("$NUMBER$", currentLineObject.args.length);
                        }

                        if (currentLineObject.opcode === "SW") {
                            // Checking the type of the arguments.
                            if (!isIndirectMemoryAddress(currentLineObject.args[0])) {
                                return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "memory").replace("$POS$", "first").replace("$ADDRESS$", currentLineObject.args[0]);
                            }
                            if (!isRegistryAddress(currentLineObject.args[1])) {
                                return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "registry").replace("$POS$", "second").replace("$ADDRESS$", currentLineObject.args[1]);
                            }
                        } else {
                            // Checking the type of the arguments.
                            if (!isRegistryAddress(currentLineObject.args[0])) {
                                return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "registry").replace("$POS$", "first").replace("$ADDRESS$", currentLineObject.args[0]);
                            }
                            if (!isIndirectMemoryAddress(currentLineObject.args[1])) {
                                return "Error in line " + (i + 1) + ": " + ERROR_ADDRESS_EXPECTED.replace("$TYPE$", "memory").replace("$POS$", "second").replace("$ADDRESS$", currentLineObject.args[1]);
                            }

                            // Checking if it tries to override R0.
                            if (currentLineObject.args[0] === "R0") {
                                return "Error in line " + (i + 1) + ": " + ERROR_READ_ONLY;
                            }
                        }
                    } else if (currentLineObject.opcode === "HALT") {
                        // Checking number of arguments.
                        if (currentLineObject.args.length != 0) {
                            return "Error in line " + (i + 1) + ": " + ERROR_NUMBER_OF_ARGUMENTS.replace("$NAME$", "HALT").replace("$EXPECTED_NUMBER$", "0").replace("$NUMBER$", currentLineObject.args.length);
                        }
                    }
                }

                program[i] = currentLineObject;
            }

            return OK;
        }

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Registry / Memory manipulation

        /** The registry of the program. */
        let registry = {};
        registry["R0"] = 0;

        /** The memory of the program. */
        let memory = {};

        /** Returns true if the string address is a direct memory address, false otherwise. */
        let isDirectMemoryAddress = function (address) {
            let addressValue = parseInt(address);

            return !isNaN(addressValue) && (addressValue % 4) == 0;
        }

        /** Returns true if the string address is a indirect memory address, false otherwise. */
        let isIndirectMemoryAddress = function (address) {
            return /^-?[0-9]+\(R[0-9]+\)$/.test(address);
        }

        /** Returns true if the string address is a registry address, false otherwise.*/
        let isRegistryAddress = function (address) {
            return /^R[0-9]+$/.test(address);
        }

        /** Returns true if the string value is a immediate value, false otherwise.*/
        let isImmediateValue = function (value) {
            return /^#-?[0-9]+$/.test(value);
        }

        /** Clears the registry. */
        let clearRegistry = function () {
            registry = { R0: 0 };
        }

        /** Clears the memory. */
        let clearMemory = function () {
            memory = {};
        }

        /**
         * Returns the value of a registry entry.
         * If no value is currently hold in the entry, it will return NaN.
        */
        let getRegistryValue = function (address) {
            if (!isRegistryAddress(address)) {
                throw "Registry address expected, got \"" + address + "\".";
            }

            return parseInt(registry[address]);
        }

        /**
         * Returns the value of a memory entry.
         * If no value is currently hold in the entry, it will return NaN.
        */
        let getMemoryValue = function (address) {
            if (!isDirectMemoryAddress(address)) {
                throw "Memory address expected, got \"" + address + "\".";
            }

            return parseInt(memory[address]);
        }

        /** Sets the value of a registry entry. */
        let setRegistryValue = function (address, value) {
            if (!isRegistryAddress(address)) {
                throw "Registry address expected, got \"" + address + "\".";
            }

            if (address === "R0") {
                throw "Registry \"R0\" is read-only.";
            }

            registry[address] = parseInt(value);
        }

        /** Sets the value of a memory entry. */
        let setMemoryValue = function (address, value) {
            if (!isDirectMemoryAddress(address)) {
                throw "Memory address expected, got \"" + address + "\".";
            }

            memory[address] = parseInt(value);
        }

        /** The methods that should be accessable from outside. */
        methods = {
            OK: OK,

            HALT: HALT,

            execute: execute,

            step: step,

            setProgram: setProgram,

            setOptions: setOptions,

            clearRegistry: clearRegistry,

            clearMemory: clearMemory,

            getLine: getLine,

            setLine: setLine,

            getRegistryValue: getRegistryValue,

            getMemoryValue: getMemoryValue,

            setRegistryValue: setRegistryValue,

            setMemoryValue: setMemoryValue
        };

        return methods;
    })();

    global.DLX_Interpreter = DLX_Interpreter;
})(this);