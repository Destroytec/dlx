'use strict';
(function (global) {

    let DLX_Interpreter = (function () {

        ///////////////////////////////////////////////////////////////////////////////////////////
        // General

        /** Contains methods to get error messages. */
        let getDlxInterpreterError = {
            /** Contains error messages for the DLX interpreter with placeholder. */
            ERROR_MSG: {
                ADDRESS_EXPECTED: "A $TYPE$ address was as $POS$ argument expected, but got \"$ADDRESS$\".",
                NUMBER_OF_ARGUMENTS: "$NAME$ needs $EXPECTED_NUMBER$ arguments, but got $NUMBER$.",
                NO_VALUE: "$TYPE$ entry \"$ADDRESS$\" does not contain a number.",
                READ_ONLY: "R0 is read-only.",
                LABEL_NOT_FOUND: "Label \"$LABEL$\" not found.",
                OPCODE_NOT_FOUND: "Opcode \"$OPCODE$\" not found.",
                INVALID_DIRECT_ADDRESS: "The memory address \"$DIRECT_ADDRESS$\" is not valid. It was calculated from\"$ADDRESS$\".",
                HALT_NOT_FOUND: "The interpreter run out of lines because it has not reached a \"HALT\" opcode.",
                IMMEDIATE_VALUE_EXPECTED: "A immediate value was as $POS$ argument expected, but got \"$VALUE$\".",
                TOO_MANY_JUMPS: "The interpreter jumped from line $FROM_LINE$ to line $TO_LINE$ too many times. You are probably in a loop. If not, raise the maximum jumps in the options.",
                TOO_MANY_STEPS: "The interpreter interpreted too many lines. You are probably in a loop. If not, raise the maximum steps in the options."
            },

            /** Returns an error message for an unexpected address. */
            addressExpected: function (type, pos, address) {
                return this.ERROR_MSG.ADDRESS_EXPECTED.replace("$TYPE$", type).replace("$POS$", pos).replace("$ADDRESS$", address);
            },

            /** Returns an error message for a wrong number of arguments. */
            numberOfArguments: function (name, expectedNumber, receivedNumber) {
                return this.ERROR_MSG.NUMBER_OF_ARGUMENTS.replace("$NAME$", name).replace("$EXPECTED_NUMBER$", expectedNumber).replace("$NUMBER$", receivedNumber);
            },

            /** Returns an error message for entries that contains no value. */
            noValue: function (type, address) {
                return this.ERROR_MSG.NO_VALUE.replace("$TYPE$", type).replace("$ADDRESS$", address);
            },

            /** Returns an error message for trying writing R0. */
            readOnly: function () {
                return this.ERROR_MSG.READ_ONLY;
            },

            /** Returns an error message for not found labels. */
            labelNotFound: function (label) {
                return this.ERROR_MSG.LABEL_NOT_FOUND.replace("$LABEL$", label);
            },

            /** Returns an error message for not found opcodes. */
            opcodeNotFound: function (opcode) {
                return this.ERROR_MSG.OPCODE_NOT_FOUND.replace("$OPCODE$", opcode);
            },

            /** Returns an error message for invalid direct address. */
            invalidDirectAddress: function (directAddress, address) {
                return this.ERROR_MSG.INVALID_DIRECT_ADDRESS.replace("$DIRECT_ADDRESS$", directAddress).replace("$ADDRESS$", address);
            },

            /** Returns an error message for a not existing HALT. */
            haltNotFound: function () {
                return this.ERROR_MSG.HALT_NOT_FOUND;
            },

            /** Returns an error message for an unexpected immediate value. */
            immediateValueExpected: function (pos, value) {
                return this.ERROR_MSG.IMMEDIATE_VALUE_EXPECTED.replace("$POS$", pos).replace("$VALUE$", value);
            },

            /** Returns an error message for too many jumps. */
            tooManyJumps: function (fromLine, toLine) {
                return this.ERROR_MSG.TOO_MANY_JUMPS.replace("$FROM_LINE$", fromLine).replace("$TO_LINE$", toLine);
            },

            /** Returns an error message for too many steps. */
            tooManySteps: function () {
                return this.ERROR_MSG.TOO_MANY_STEPS;
            }
        };

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
                    return getDlxInterpreterError.noValue("Registry", /R[0-9]+/.exec(args[1])[0]);
                }

                address = directValue + indirectValue;

                // Checking if it is a valid direct address.
                if (!isDirectMemoryAddress(address)) {
                    return getDlxInterpreterError.invalidDirectAddress(address, args[1]);
                }

                // Checking if entries have values.
                if (isNaN(memory[address])) {
                    return getDlxInterpreterError.noValue("Memory", address);
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
                    return getDlxInterpreterError.noValue("Registry", /R[0-9]+/.exec(args[0])[0]);
                }

                address = directValue + indirectValue;

                // Checking if it is a valid direct address.
                if (!isDirectMemoryAddress(address)) {
                    return getDlxInterpreterError.invalidDirectAddress(address, args[0]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[1]])) {
                    return getDlxInterpreterError.noValue("Registry", args[1]);
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
                    return getDlxInterpreterError.labelNotFound(args[1]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return getDlxInterpreterError.noValue("Registry", args[0]);
                }

                // Actual code.
                if (registry[args[0]] !== 0) {
                    // Counting jump and checking if it was too much.
                    if (++jumps[line - 1][labels[args[1]]] > options.maxJumps) {
                        return getDlxInterpreterError.tooManyJumps((line - 1), (labels[args[1]]));
                    }

                    line = labels[args[1]];
                }

                return OK;
            },

            // Branch equals zero
            BEQZ: function (args) {
                // Checking the type of the arguments.
                if (labels[args[1]] === undefined) {
                    return getDlxInterpreterError.labelNotFound(args[1]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return getDlxInterpreterError.noValue("Registry", args[0]);
                }

                // Actual code.
                if (registry[args[0]] === 0) {
                    // Counting jump and checking if it was too much.
                    if (++jumps[line - 1][labels[args[1]]] > options.maxJumps) {
                        return getDlxInterpreterError.tooManyJumps((line - 1), (labels[args[1]]));
                    }

                    line = labels[args[1]];
                }

                return OK;
            },

            // Jump
            J: function (args) {
                // Checking the type of the arguments.
                if (labels[args[0]] === undefined) {
                    return getDlxInterpreterError.labelNotFound(args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][labels[args[0]]] > options.maxJumps) {
                    return getDlxInterpreterError.tooManyJumps((line - 1), labels[args[0]]);
                }

                // Actual code.
                line = labels[args[0]];

                return OK;
            },

            // Jump registry
            JR: function (args) {
                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return getDlxInterpreterError.noValue("Registry", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][registry[args[0]]] > options.maxJumps) {
                    return getDlxInterpreterError.tooManyJumps((line - 1), (registry[args[0]]));
                }

                // Actual code.
                line = registry[args[0]];

                return OK;
            },

            // Jump and link
            JAL: function (args) {
                // Checking the type of the arguments.
                if (labels[args[0]] === undefined) {
                    return getDlxInterpreterError.labelNotFound(args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][labels[args[0]]] > options.maxJumps) {
                    return getDlxInterpreterError.tooManyJumps((line - 1), (labels[args[0]]));
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
                    return getDlxInterpreterError.noValue("Registry", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line - 1][registry[args[0]]] > options.maxJumps) {
                    return getDlxInterpreterError.tooManyJumps((line - 1), (registry[args[0]]));
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

        /** The instructions that the interpreter should interpret. */
        let instructions;

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
            if (instructions === undefined) {
                line = 1;
                return;
            }

            if (newLine > instructions.length) {
                throw "The new line is too big, program has only " + instructions.length + " lines.";
            }

            line = newLine;
        }

        /** Checks, if the R command arguments are valid. */
        let checkRCommand = function (name, args) {
            // Checking if entries have values.
            if (isNaN(registry[args[1]])) {
                return getDlxInterpreterError.noValue("Registry", args[1]);
            }
            if (isNaN(registry[args[2]])) {
                return getDlxInterpreterError.noValue("Registry", args[2]);
            }

            return OK;
        }

        /** Checks, if the I command arguments are valid. */
        let checkICommand = function (name, args) {
            // Checking if entries have values.
            if (isNaN(registry[args[1]])) {
                return getDlxInterpreterError.noValue("Registry", args[1]);
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

            for (let i = 0; i <= instructions.length; i++) {
                buffer = [];

                for (let j = 0; j <= instructions.length; j++) {
                    buffer[j] = 0;
                }

                jumps[i] = buffer;
            }

            // Resetting line if needed.
            if (line > instructions.length) {
                line = 1;
            }

            while (true) {
                // Checking if the program runs too many steps.
                if (++totalSteps > options.maxSteps) {
                    return getDlxInterpreterError.tooManySteps();
                }

                // Checking if there is a breakpoint.
                if (instructions[line - 1].breakpoint && !isFirstLine) {
                    return OK;
                }

                isFirstLine = false;

                status = run(instructions[line - 1]);

                // Checking if the interpreter reached the end of the program.
                if (status === OK && line > instructions.length) {
                    line = 1;
                    return getDlxInterpreterError.haltNotFound();
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
            if (line > instructions.length) {
                line = 1;
            }

            // Run one line
            status = run(instructions[line - 1]);

            // Checking if everything is ok.
            if (status === OK && line > instructions.length) {
                line = 1;
                return getDlxInterpreterError.haltNotFound();
            }

            if (status === HALT || status === OK) {
                return OK;
            }

            line--;
            return "Error in line " + (line) + ": " + status;
        }

        /** Validates an instruction. */
        let validateInstruction = function (instruction) {
            let commandTypeValue = commandType[instruction.opcode];

            // Checking if the opcode exists.
            if (commandTypeValue === undefined) {
                return getDlxInterpreterError.opcodeNotFound(instruction.opcode);
            }

            // Checking if the arguments are valid.
            if (commandTypeValue === "R" || commandTypeValue === "I") {
                // Checking number of arguments.
                if (instruction.args.length != 3) {
                    return getDlxInterpreterError.numberOfArguments(instruction.opcode, "3", instruction.args.length);
                }

                // Checking the type of the arguments.
                if (!isRegistryAddress(instruction.args[0])) {
                    return getDlxInterpreterError.addressExpected("registry", "first", instruction.args[0]);
                }
                if (!isRegistryAddress(instruction.args[1])) {
                    return getDlxInterpreterError.addressExpected("registry", "second", instruction.args[1]);
                }
                if (commandTypeValue === "R") {
                    if (!isRegistryAddress(instruction.args[2])) {
                        return getDlxInterpreterError.addressExpected("registry", "third", instruction.args[2]);
                    }
                } else {
                    if (!isImmediateValue(instruction.args[2])) {
                        return getDlxInterpreterError.immediateValueExpected("third", instruction.args[2]);
                    }
                }

                // Checking if it tries to override R0.
                if (instruction.args[0] === "R0") {
                    return getDlxInterpreterError.readOnly();
                }
            } else if (commandTypeValue === "J") {
                if (instruction.opcode === "BNEZ" || instruction.opcode === "BEQZ") {
                    // Checking number of arguments.
                    if (instruction.args.length != 2) {
                        return getDlxInterpreterError.numberOfArguments(instruction.opcode, "2", instruction.args.length);
                    }

                    // Checking the type of the arguments.
                    if (!isRegistryAddress(instruction.args[0])) {
                        return getDlxInterpreterError.addressExpected("registry", "first", instruction.args[0]);
                    }
                } else {
                    // Checking number of arguments.
                    if (instruction.args.length != 1) {
                        return getDlxInterpreterError.numberOfArguments(instruction.opcode, "1", instruction.args.length);
                    }

                    if (instruction.opcode === "JR" || instruction.opcode === "JALR") {
                        // Checking the type of the arguments.
                        if (!isRegistryAddress(instruction.args[0])) {
                            return getDlxInterpreterError.addressExpected("registry", "first", instruction.args[0]);
                        }
                    }
                }
            } else if (instruction.opcode === "SW" || instruction.opcode === "LW") {
                // Checking number of arguments.
                if (instruction.args.length != 2) {
                    return getDlxInterpreterError.numberOfArguments(instruction.opcode, "2", instruction.args.length);
                }

                if (instruction.opcode === "SW") {
                    // Checking the type of the arguments.
                    if (!isIndirectMemoryAddress(instruction.args[0])) {
                        return getDlxInterpreterError.addressExpected("memory", "first", instruction.args[0]);
                    }
                    if (!isRegistryAddress(instruction.args[1])) {
                        return getDlxInterpreterError.addressExpected("registry", "second", instruction.args[1]);
                    }
                } else {
                    // Checking the type of the arguments.
                    if (!isRegistryAddress(instruction.args[0])) {
                        return getDlxInterpreterError.addressExpected("registry", "first", instruction.args[0]);
                    }
                    if (!isIndirectMemoryAddress(instruction.args[1])) {
                        return getDlxInterpreterError.addressExpected("memory", "second", instruction.args[1]);
                    }

                    // Checking if it tries to override R0.
                    if (instruction.args[0] === "R0") {
                        return getDlxInterpreterError.readOnly();
                    }
                }
            } else if (instruction.opcode === "HALT") {
                // Checking number of arguments.
                if (instruction.args.length != 0) {
                    return getDlxInterpreterError.numberOfArguments("HALT", "0", instruction.args.length);
                }
            }

            return OK;
        }

        let createInstruction = function (raw) {
            let rWrongLabel = /^\s*.+(?=:)/,
                rRightLabel = /^\s*[.\S]+(?=:)/,
                rBreakpoint = /^>/,
                rOpcode = /^\w+/,
                label,
                instruction = {
                    label: false,
                    status: OK,
                    breakpoint: false,
                    opcode: "",
                    args: []
                };

            // Deleting the comment from the line.
            raw = raw.replace(/\/\/.*/, "").trim();

            // Checking for correct label.
            if (rWrongLabel.test(raw) && !rRightLabel.test(raw)) {
                instruction.status = "Label \"" + rWrongLabel.exec(raw)[0] + "\" does contain whitespace.";
                return instruction;
            }

            // Adding the label, if existing.
            if (rRightLabel.test(raw)) {
                label = rRightLabel.exec(raw)[0];

                if (labels[label] !== undefined) {
                    instruction.status = "You used \"" + label + "\" at line " + labels[label] + "before.";
                    return instruction;
                }

                instruction.label = label;
                raw = raw.replace(/^.+:/, "").trim();
            }

            // Adding breakpoint information when breakpoint found.
            if (rBreakpoint.test(raw)) {
                instruction.breakpoint = true;
                raw = raw.replace(rBreakpoint, "").trim();
            }

            // If there is at least one word, it must be the opcode.
            if (rOpcode.test(raw)) {
                instruction.opcode = rOpcode.exec(raw)[0];
                raw = raw.replace(rOpcode, "").trim();


                // If there are still words, it must be the arguments, splitted by commas.
                if (raw !== "") {
                    instruction.args = raw.split(/\s*,\s*/);
                }

                let status = validateInstruction(instruction);
                if (status !== OK) {
                    instruction.status = status;
                    return instruction;
                }
            }

            return instruction;
        }

        /** Sets a new program. */
        let setProgram = function (newProgram) {
            let buffer,
                program = newProgram.split("\n");

            line = 1;
            labels = {};
            jumps = [];
            instructions = [];

            // Creating jump array.
            for (let i = 0; i <= program.length; i++) {
                buffer = [];

                for (let j = 0; j <= program.length; j++) {
                    buffer[j] = 0;
                }

                jumps[i] = buffer;
            }

            for (let i = 0; i < program.length; i++) {
                let instruction = createInstruction(program[i]);
                instructions[i] = instruction;

                if (instruction.label) {
                    labels[instruction.label] = i + 1;
                }

                if (instruction.status !== OK) {
                    instructions = undefined;
                    return "Error in line " + (i + 1) + ": " + instruction.status;
                }
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
        let methods = {
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