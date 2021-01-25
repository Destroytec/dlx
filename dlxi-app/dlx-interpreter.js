'use strict';
(function (global) {

    let DlxInterpreter = (function () {

        // TODO: Move the error thing to the app itself. The interpreter should only return a numeric value for the error it encounters.
        let DlxError = (function () {
            /** Contains error messages for the DLX interpreter with placeholder. */
            let ERROR_MSG = {
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
            }

            /** Returns an error message for an unexpected address. */
            let addressExpected = function (type, pos, address) {
                return ERROR_MSG.ADDRESS_EXPECTED.replace("$TYPE$", type).replace("$POS$", pos).replace("$ADDRESS$", address);
            }

            /** Returns an error message for a wrong number of arguments. */
            let numberOfArguments = function (name, expectedNumber, receivedNumber) {
                return ERROR_MSG.NUMBER_OF_ARGUMENTS.replace("$NAME$", name).replace("$EXPECTED_NUMBER$", expectedNumber).replace("$NUMBER$", receivedNumber);
            }

            /** Returns an error message for entries that contains no value. */
            let noValue = function (type, address) {
                return ERROR_MSG.NO_VALUE.replace("$TYPE$", type).replace("$ADDRESS$", address);
            }

            /** Returns an error message for trying writing R0. */
            let readOnly = function () {
                return ERROR_MSG.READ_ONLY;
            }

            /** Returns an error message for not found labels. */
            let labelNotFound = function (label) {
                return ERROR_MSG.LABEL_NOT_FOUND.replace("$LABEL$", label);
            }

            /** Returns an error message for not found opcodes. */
            let opcodeNotFound = function (opcode) {
                return ERROR_MSG.OPCODE_NOT_FOUND.replace("$OPCODE$", opcode);
            }

            /** Returns an error message for invalid direct address. */
            let invalidDirectAddress = function (directAddress, address) {
                return ERROR_MSG.INVALID_DIRECT_ADDRESS.replace("$DIRECT_ADDRESS$", directAddress).replace("$ADDRESS$", address);
            }

            /** Returns an error message for a not existing HALT. */
            let haltNotFound = function () {
                return ERROR_MSG.HALT_NOT_FOUND;
            }

            /** Returns an error message for an unexpected immediate value. */
            let immediateValueExpected = function (pos, value) {
                return ERROR_MSG.IMMEDIATE_VALUE_EXPECTED.replace("$POS$", pos).replace("$VALUE$", value);
            }

            /** Returns an error message for too many jumps. */
            let tooManyJumps = function (fromLine, toLine) {
                return ERROR_MSG.TOO_MANY_JUMPS.replace("$FROM_LINE$", fromLine).replace("$TO_LINE$", toLine);
            }

            /** Returns an error message for too many steps. */
            let tooManySteps = function () {
                return ERROR_MSG.TOO_MANY_STEPS;
            }

            let methods = {
                addressExpected: addressExpected,
                numberOfArguments: numberOfArguments,
                noValue: noValue,
                readOnly: readOnly,
                labelNotFound: labelNotFound,
                opcodeNotFound: opcodeNotFound,
                invalidDirectAddress: invalidDirectAddress,
                haltNotFound: haltNotFound,
                immediateValueExpected: immediateValueExpected,
                tooManyJumps: tooManyJumps,
                tooManySteps: tooManySteps
            }

            return methods;
        })();

        /**
        * Represents the different status the dlx interpreter can have.
         */
        let DlxStatus = (function () {
            /** Status code if everything is fine. */
            let OK = 1;

            /** Status code if interpreter stops. */
            let HALT = 0;

            let exporting = {
                OK: OK,
                HALT: HALT
            };

            return exporting;
        })();

        let DlxInstruction = (function () {
            /** Contains the command type of a command. */
            let TYPES = {
                0: "L",
                1: "S",
                2: "R",
                3: "I",
                4: "J",
                5: "H",
                LW: 0,
                SW: 1,
                ADD: 2,
                SUB: 2,
                MULT: 2,
                AND: 2,
                OR: 2,
                XOR: 2,
                SLL: 2,
                SRL: 2,
                SRA: 2,
                SLT: 2,
                SLE: 2,
                SEQ: 2,
                SNE: 2,
                ADDI: 3,
                SUBI: 3,
                ANDI: 3,
                ORI: 3,
                XORI: 3,
                SLLI: 3,
                SRLI: 3,
                SRAI: 3,
                SLTI: 3,
                SLEI: 3,
                SEQI: 3,
                SNEI: 3,
                BEQZ: 4,
                BNEZ: 4,
                J: 4,
                JR: 4,
                JAL: 4,
                JALR: 4,
                HALT: 5
            };

            let isSaveInstruction = function (opcode) {
                return isInstruction(opcode, "S");
            };

            let isLoadInstruction = function (opcode) {
                return isInstruction(opcode, "L");
            };

            let isRegistryInstruction = function (opcode) {
                return isInstruction(opcode, "R");
            };

            let isImmediateInstruction = function (opcode) {
                return isInstruction(opcode, "I");
            };

            let isJumpInstruction = function (opcode) {
                return isInstruction(opcode, "J");
            };

            let isHaltInstruction = function (opcode) {
                return isInstruction(opcode, "H");
            };

            let isInstruction = function (opcode, instructionType) {
                if (opcode === undefined || typeof (opcode) !== "string") {
                    console.error("Got a bad opcode.");
                } else if (instructionType !== undefined && typeof (instructionType) !== "string") {
                    console.error("Got a bad instruction type.");
                }

                if (instructionType === undefined) {
                    return TYPES[opcode] !== undefined;
                } else {
                    return TYPES[opcode] !== undefined ? TYPES[TYPES[opcode]] === instructionType : false;
                };
            };

            let exporting = {
                isSaveInstruction: isSaveInstruction,
                isLoadInstruction: isLoadInstruction,
                isRegistryInstruction: isRegistryInstruction,
                isImmediateInstruction: isImmediateInstruction,
                isJumpInstruction: isJumpInstruction,
                isHaltInstruction: isHaltInstruction,
                isInstruction: isInstruction
            };

            return exporting;
        })();

        ///////////////////////////////////////////////////////////////////////////////////////////
        // General

        /** Contains all currently implemented instructions. */
        let instructionSet = {

            ///////////////////////////////////////////////////////////////////////////////////////
            // DATA TRANSFERS

            // Load word
            LW: function (registryAddress, memoryAddress) {
                registry[registryAddress] = memory[memoryAddress];

                return DlxStatus.OK;
            },

            // Save word
            SW: function (memoryAddress, registryAddress) {
                memory[memoryAddress] = registry[registryAddress];

                return DlxStatus.OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // ARITHMETIC

            // Add
            ADD: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] + registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            // Sub
            SUB: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] - registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            // Multiplikation
            MULT: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] * registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // ARITHMETIC IMMEDIATE

            // Add immediate
            ADDI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] + immediateValue;

                return DlxStatus.OK;
            },

            // Sub immediate
            SUBI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] - immediateValue;

                return DlxStatus.OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // LOGIC

            // AND
            AND: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] & registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            // OR
            OR: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] | registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            // XOR
            XOR: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] ^ registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            // Set equal
            SEQ: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] == registry[otherRegistryAddress] ? 1 : 0;

                return DlxStatus.OK;
            },

            // Set less than or equal
            SLE: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] <= registry[otherRegistryAddress] ? 1 : 0;

                return DlxStatus.OK;
            },

            // Set less than
            SLT: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] < registry[otherRegistryAddress] ? 1 : 0;

                return DlxStatus.OK;
            },

            // Set not equal
            SNE: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] != registry[otherRegistryAddress] ? 1 : 0;

                return DlxStatus.OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // LOGIC IMMEDIATE

            // AND immediate
            ANDI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] & immediateValue;

                return DlxStatus.OK;
            },

            // OR immediate
            ORI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] | immediateValue;

                return DlxStatus.OK;
            },

            // XOR immediate
            XORI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] ^ immediateValue;

                return DlxStatus.OK;
            },

            // Set equal immediate
            SEQI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] == immediateValue ? 1 : 0;

                return DlxStatus.OK;
            },

            // Set less than or equal immediate
            SLEI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] <= immediateValue ? 1 : 0;

                return DlxStatus.OK;
            },

            // Set less than immediate
            SLTI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] < immediateValue ? 1 : 0;

                return DlxStatus.OK;
            },

            // Set not equal immediate
            SNEI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] != immediateValue ? 1 : 0;

                return DlxStatus.OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // SHIFT

            // Shift left logical
            SLL: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] << registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            // Shift right arithmetic
            SRA: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] >> registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            // Shift right logical
            SRL: function (destinationRegistryAddress, registryAddress, otherRegistryAddress) {
                registry[destinationRegistryAddress] = registry[registryAddress] >>> registry[otherRegistryAddress];

                return DlxStatus.OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // SHIFT IMMEDIATE

            // Shift left logical immediate
            SLLI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] << immediateValue;

                return DlxStatus.OK;
            },

            // Shift right arithmetic immediate
            SRAI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] >> immediateValue;

                return DlxStatus.OK;
            },

            // Shift right logical immediate
            SRLI: function (destinationRegistryAddress, registryAddress, immediateValue) {
                registry[destinationRegistryAddress] = registry[registryAddress] >>> immediateValue;

                return DlxStatus.OK;
            },

            ///////////////////////////////////////////////////////////////////////////////////////
            // CONTROL

            // Branch not equals zero
            BNEZ: function (args) {
                // Checking the type of the arguments.
                if (labels[args[1]] === undefined) {
                    return DlxError.labelNotFound(args[1]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return DlxError.noValue("Registry", args[0]);
                }

                // Actual code.
                if (registry[args[0]] !== 0) {
                    // Counting jump and checking if it was too much.
                    if (++jumps[line][labels[args[1]]] > options.maxJumps) {
                        return DlxError.tooManyJumps((line), (labels[args[1]]));
                    }

                    line = labels[args[1]];
                }

                return DlxStatus.OK;
            },

            // Branch equals zero
            BEQZ: function (args) {
                // Checking the type of the arguments.
                if (labels[args[1]] === undefined) {
                    return DlxError.labelNotFound(args[1]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return DlxError.noValue("Registry", args[0]);
                }

                // Actual code.
                if (registry[args[0]] === 0) {
                    // Counting jump and checking if it was too much.
                    if (++jumps[line][labels[args[1]]] > options.maxJumps) {
                        return DlxError.tooManyJumps((line), (labels[args[1]]));
                    }

                    line = labels[args[1]];
                }

                return DlxStatus.OK;
            },

            // Jump
            J: function (args) {
                // Checking the type of the arguments.
                if (labels[args[0]] === undefined) {
                    return DlxError.labelNotFound(args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line][labels[args[0]]] > options.maxJumps) {
                    return DlxError.tooManyJumps((line), labels[args[0]]);
                }

                // Actual code.
                line = labels[args[0]];

                return DlxStatus.OK;
            },

            // Jump registry
            JR: function (args) {
                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return DlxError.noValue("Registry", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line][registry[args[0]]] > options.maxJumps) {
                    return DlxError.tooManyJumps((line), (registry[args[0]]));
                }

                // Actual code.
                line = registry[args[0]];

                return DlxStatus.OK;
            },

            // Jump and link
            JAL: function (args) {
                // Checking the type of the arguments.
                if (labels[args[0]] === undefined) {
                    return DlxError.labelNotFound(args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line][labels[args[0]]] > options.maxJumps) {
                    return DlxError.tooManyJumps((line), (labels[args[0]]));
                }

                // Actual code.
                registry["R31"] = line;
                line = labels[args[0]];

                return DlxStatus.OK;
            },

            // Jump and link registry
            JALR: function (args) {
                // Checking if entries have values.
                if (isNaN(registry[args[0]])) {
                    return DlxError.noValue("Registry", args[0]);
                }

                // Counting jump and checking if it was too much.
                if (++jumps[line][registry[args[0]]] > options.maxJumps) {
                    return DlxError.tooManyJumps((line), (registry[args[0]]));
                }

                // Actual code.
                registry["R31"] = line;
                line = registry[args[0]];

                return DlxStatus.OK;
            },

            // Halt
            HALT: function () {
                line--;
                return DlxStatus.HALT;
            }
        }

        let runInstruction = function (instruction) {
            let opcode, args;

            line++;

            opcode = instruction.opcode;
            args = instruction.args;
            if (opcode === "") {
                return DlxStatus.OK;
            } else if (!DlxInstruction.isInstruction(opcode)) {
                return DlxStatus.HALT;
            } else if (DlxInstruction.isLoadInstruction(opcode)) {
                let address,
                    indirectValue,
                    directValue;

                directValue = parseInt(/^-?[0-9]+/.exec(args[1])[0]);
                indirectValue = parseInt(registry[/R[0-9]+/.exec(args[1])[0]]);

                // Checking if the indirect value is a number.
                if (isNaN(indirectValue)) {
                    return DlxError.noValue("Registry", /R[0-9]+/.exec(args[1])[0]);
                }

                address = directValue + indirectValue;

                // Checking if it is a valid direct address.
                if (!isDirectMemoryAddress(address)) {
                    return DlxError.invalidDirectAddress(address, args[1]);
                }

                // Checking if entries have values.
                if (isNaN(memory[address])) {
                    return DlxError.noValue("Memory", address);
                }

                return instructionSet[opcode](args[0], address)
            } else if (DlxInstruction.isSaveInstruction(opcode)) {
                let address,
                    indirectValue,
                    directValue;

                directValue = parseInt(/^-?[0-9]+/.exec(args[0])[0]);
                indirectValue = parseInt(registry[/R[0-9]+/.exec(args[0])[0]]);

                // Checking if the indirect value is a number.
                if (isNaN(indirectValue)) {
                    return DlxError.noValue("Registry", /R[0-9]+/.exec(args[0])[0]);
                }

                address = directValue + indirectValue;

                // Checking if it is a valid direct address.
                if (!isDirectMemoryAddress(address)) {
                    return DlxError.invalidDirectAddress(address, args[0]);
                }

                // Checking if entries have values.
                if (isNaN(registry[args[1]])) {
                    return DlxError.noValue("Registry", args[1]);
                }

                return instructionSet[opcode](address, args[1]);
            } else if (DlxInstruction.isRegistryInstruction(opcode)) {
                // Check for valid input.
                if (isNaN(registry[args[1]])) {
                    return DlxError.noValue("Registry", args[1]);
                }
                if (isNaN(registry[args[2]])) {
                    return DlxError.noValue("Registry", args[2]);
                }

                return instructionSet[opcode](args[0], args[1], args[2]);
            } else if (DlxInstruction.isImmediateInstruction(opcode)) {
                // Check for valid input.
                if (isNaN(registry[args[1]])) {
                    return DlxError.noValue("Registry", args[1]);
                }

                return instructionSet[opcode](args[0], args[1], parseInt(args[2].replace("#", "")));
            } else {
                return instructionSet[opcode](args);
            };
        };

        /** The options of the interpreter. */
        let options;

        /** The instructions that the interpreter should interpret. */
        let instructions;

        /** A reference for the labels in the program. */
        let labels;

        /** The current line of the program. */
        let line = 0;

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
                line = 0;
                return;
            }

            if (newLine >= instructions.length) {
                throw "The new line is too big, program has only " + instructions.length + " lines.";
            }

            line = newLine;
        }

        /** Executes the program. */
        let execute = function () {
            let status,
                isFirstLine = true,
                totalSteps = 0;

            // Resetting jumps.
            jumps = [];

            for (let i = 0; i < instructions.length; i++) {
                let buffer = [];

                for (let j = 0; j < instructions.length; j++) {
                    buffer[j] = 0;
                }

                jumps[i] = buffer;
            }

            // Resetting line if needed.
            if (line >= instructions.length) {
                line = 0;
            }

            while (true) {
                // Checking if the program runs too many steps.
                if (++totalSteps > options.maxSteps) {
                    return DlxError.tooManySteps();
                }

                // Checking if there is a breakpoint.
                if (instructions[line].breakpoint && !isFirstLine) {
                    return DlxStatus.OK;
                }

                isFirstLine = false;

                status = runInstruction(instructions[line]);

                // Checking if the interpreter reached the end of the program.
                if (status === DlxStatus.OK && line >= instructions.length) {
                    line = 0;
                    return DlxError.haltNotFound();
                }

                // Checking if everything else is fine.
                if (status === DlxStatus.OK) {
                    continue;
                }

                // Checking if it encounters a HALT opcode.
                if (status === DlxStatus.HALT) {
                    return DlxStatus.OK;
                }

                line--;
                return "Error in line " + (line + 1) + ": " + status;
            }
        }

        /** Executes only a line. */
        let step = function () {
            let status;

            // Resetting line if needed.
            if (line >= instructions.length) {
                line = 0;
            }

            // Run one line
            status = runInstruction(instructions[line]);

            // Checking if everything is ok.
            if (status === DlxStatus.OK && line >= instructions.length) {
                line = 0;
                return DlxError.haltNotFound();
            }

            if (status === DlxStatus.HALT || status === DlxStatus.OK) {
                return DlxStatus.OK;
            }

            line--;
            return "Error in line " + (line + 1) + ": " + status;
        }

        /** Validates an instruction. */
        let validateInstruction = function (instruction) {
            let opcode, argLength;

            opcode = instruction.opcode;
            argLength = instruction.args.length;

            // Checking if the opcode exists.
            if (!DlxInstruction.isInstruction(opcode)) {
                return DlxError.opcodeNotFound(opcode);
            }

            // Checking if the arguments are valid.
            if (DlxInstruction.isRegistryInstruction(opcode) || DlxInstruction.isImmediateInstruction(opcode)) {
                // Checking number of arguments.
                if (argLength != 3) {
                    return DlxError.numberOfArguments(opcode, "3", argLength);
                }

                // Checking the type of the arguments.
                if (!isRegistryAddress(instruction.args[0])) {
                    return DlxError.addressExpected("registry", "first", instruction.args[0]);
                }
                if (!isRegistryAddress(instruction.args[1])) {
                    return DlxError.addressExpected("registry", "second", instruction.args[1]);
                }
                if (DlxInstruction.isRegistryInstruction(opcode)) {
                    if (!isRegistryAddress(instruction.args[2])) {
                        return DlxError.addressExpected("registry", "third", instruction.args[2]);
                    }
                } else {
                    if (!isImmediateValue(instruction.args[2])) {
                        return DlxError.immediateValueExpected("third", instruction.args[2]);
                    }
                }

                // Checking if it tries to override R0.
                if (instruction.args[0] === "R0") {
                    return DlxError.readOnly();
                }
            } else if (DlxInstruction.isJumpInstruction(opcode)) {
                if (opcode === "BNEZ" || opcode === "BEQZ") {
                    // Checking number of arguments.
                    if (argLength != 2) {
                        return DlxError.numberOfArguments(opcode, "2", argLength);
                    }

                    // Checking the type of the arguments.
                    if (!isRegistryAddress(instruction.args[0])) {
                        return DlxError.addressExpected("registry", "first", instruction.args[0]);
                    }
                } else {
                    // Checking number of arguments.
                    if (argLength != 1) {
                        return DlxError.numberOfArguments(instruction.opcode, "1", argLength);
                    }

                    if (opcode === "JR" || opcode === "JALR") {
                        // Checking the type of the arguments.
                        if (!isRegistryAddress(instruction.args[0])) {
                            return DlxError.addressExpected("registry", "first", instruction.args[0]);
                        }
                    }
                }
            } else if (opcode === "SW" || opcode === "LW") {
                // Checking number of arguments.
                if (argLength != 2) {
                    return DlxError.numberOfArguments(opcode, "2", argLength);
                }

                if (opcode === "SW") {
                    // Checking the type of the arguments.
                    if (!isIndirectMemoryAddress(instruction.args[0])) {
                        return DlxError.addressExpected("memory", "first", instruction.args[0]);
                    }
                    if (!isRegistryAddress(instruction.args[1])) {
                        return DlxError.addressExpected("registry", "second", instruction.args[1]);
                    }
                } else {
                    // Checking the type of the arguments.
                    if (!isRegistryAddress(instruction.args[0])) {
                        return DlxError.addressExpected("registry", "first", instruction.args[0]);
                    }
                    if (!isIndirectMemoryAddress(instruction.args[1])) {
                        return DlxError.addressExpected("memory", "second", instruction.args[1]);
                    }

                    // Checking if it tries to override R0.
                    if (instruction.args[0] === "R0") {
                        return DlxError.readOnly();
                    }
                }
            } else if (DlxInstruction.isHaltInstruction(opcode)) {
                // Checking number of arguments.
                if (argLength != 0) {
                    return DlxError.numberOfArguments("HALT", "0", argLength);
                }
            }

            return DlxStatus.OK;
        }

        let createInstruction = function (raw) {
            let rWrongLabel = /^\s*.+(?=:)/,
                rRightLabel = /^\s*[.\S]+(?=:)/,
                rBreakpoint = /^>/,
                rOpcode = /^\w+/,
                label,
                instruction = {
                    label: false,
                    status: DlxStatus.OK,
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
                if (status !== DlxStatus.OK) {
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

            line = 0;
            labels = {};
            jumps = [];
            instructions = [];

            // Creating jump array.
            for (let i = 0; i < program.length; i++) {
                buffer = [];

                for (let j = 0; j < program.length; j++) {
                    buffer[j] = 0;
                }

                jumps[i] = buffer;
            }

            for (let i = 0; i < program.length; i++) {
                let instruction = createInstruction(program[i]);
                instructions[i] = instruction;

                if (instruction.label) {
                    labels[instruction.label] = i;
                }

                if (instruction.status !== DlxStatus.OK) {
                    instructions = undefined;
                    return "Error in line " + (i + 1) + ": " + instruction.status;
                }
            }

            return DlxStatus.OK;
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
            DlxStatus: DlxStatus,

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

    global.DlxInterpreter = DlxInterpreter;
})(this);