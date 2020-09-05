// I do not know what it does but it is needed.
(function(mod) {
    if (typeof exports == "object" && typeof module == "object")
        mod(require("../../lib/codemirror"))
    else if (typeof define == "function" && define.amd)
        define(["../../lib/codemirror"], mod)
    else
        mod(CodeMirror)
})(function(CodeMirror) {
    "use strict"
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
        HALT: "H"
    }
    let breakChars = /\:|\>|\s|\,|\//

    CodeMirror.defineMode("dlx", function() {
        return {
            startState: function() {
                return {
                    label: false,
                    breakpoint: false,
                    opcode: false,
                    args: false,
                    comment: false,
                    is: false
                }
            },
            token: function(stream, state) {
                if (stream.sol()) {
                    state.label = false;
                    state.opcode = false;
                    state.args = false;
                    state.argCount = 0;
                    state.comment = false;
                }

                stream.eatSpace();
                if (breakChars.test(stream.peek())) {
                    if (stream.peek() === "/") {
                        stream.next();

                        if (stream.peek() === "/") {
                            stream.next();
                            state.comment = true;
                            return "comment";
                        }

                        return;
                    }

                    stream.next();

                    if (state.comment) {
                        return "comment";
                    }

                    return;
                }

                let currentWord = "";

                while (!breakChars.test(stream.peek())) {
                    currentWord += stream.next();
                    if (stream.eol()) {
                        break;
                    }
                }

                if (state.comment) {
                    return "comment";
                }

                if (!state.label) {
                    state.label = true;

                    if (stream.peek() === ":") {
                        return "label";
                    }
                }

                if (!state.opcode) {
                    state.opcode = true;

                    if (/\s/.test(stream.peek()) || stream.eol()) {
                        if (commandType[currentWord]) {
                            state.opcode = currentWord;
                            return "opcode";
                        }

                        return "error";
                    }
                }

                if (!state.args) {
                    // Do not ask me what happend here :(
                    let checkTooManyArgs = function() {
                        if ((commandType[state.opcode] === "R" || commandType[state.opcode] === "I") && state.argCount > 3) {
                            return true
                        } else if (commandType[state.opcode] === "J") {
                            if ((state.opcode === "BNEZ" || state.opcode === "BEQZ") && state.argCount > 2) {
                                return true
                            } else if ((state.opcode !== "BNEZ" && state.opcode !== "BEQZ") && state.argCount > 1) {
                                return true
                            }
                        } else if ((state.opcode === "SW" || state.opcode === "LW") && state.argCount > 2) {
                            return true
                        } else if (state.opcode === "HALT" && state.argCount > 0) {
                            return true
                        }
                    }

                    if (stream.peek() === ",") {
                        if (/^R[0-9]+$/.test(currentWord) || /^#-?[0-9]+$/.test(currentWord) || /^-?[0-9]+\(R[0-9]+\)$/.test(currentWord)) {
                            state.argCount++;
                            if (checkTooManyArgs()) {
                                return "error";
                            }
                            return "arg";
                        }

                        return "error";
                    }

                    if (/\s/.test(stream.peek()) || stream.eol()) {
                        if ((state.opcode === "BNEZ" || state.opcode === "BEQZ" || state.opcode === "J" || state.opcode === "JAL")) {
                            state.argCount++;
                            if (checkTooManyArgs()) {
                                return "error";
                            }
                            return "label";
                        }

                        if (/^R[0-9]+$/.test(currentWord) || /^#-?[0-9]+$/.test(currentWord) || /^-?[0-9]+\(R[0-9]+\)$/.test(currentWord)) {
                            state.argCount++;
                            if (checkTooManyArgs()) {
                                return "error";
                            }
                            return "arg";
                        }

                        return "error";
                    }
                }

                return "error";
            }
        };
    });
    CodeMirror.defineMIME("text/x-dlx", "dlx")
});