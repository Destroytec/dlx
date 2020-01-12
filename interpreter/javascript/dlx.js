// I do not know what it does but it is needed.
(function (mod) {
    if (typeof exports == "object" && typeof module == "object")
        mod(require("../../lib/codemirror"))
    else if (typeof define == "function" && define.amd)
        define(["../../lib/codemirror"], mod)
    else
        mod(CodeMirror)
})(function (CodeMirror) {
    "use strict"
    var opcodes = ["LW", "SW", "ADD", "SUB", "MULT", "AND", "OR", "XOR", "SLL", "SRA", "SRL", "SLT", "SLE", "SEQ", "SNE", "ADDI", "SUBI", "ANDI", "ORI", "XORI", "SLLI", "SRAI", "SRLI", "SLTI", "SLEI", "SEQI", "SNEI", "BEQZ", "BNEZ", "J", "JR", "JAL", "JALR", "HALT"];
    let breakChars = /\:|\>|\s|\,|\//

    CodeMirror.defineMode("dlx", function () {
        return {
            startState: function () {
                return {
                    label: false,
                    breakpoint: false,
                    opcode: false,
                    args: false,
                    comment: false,
                    is: false
                }
            },
            token: function (stream, state) {
                if (stream.sol()) {
                    state.label = false;
                    state.opcode = false;
                    state.args = false;
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
                        for (i = 0; i < opcodes.length; i++) {
                            if (opcodes[i] == currentWord) {
                                state.opcode = currentWord;
                                return "opcode";
                            }
                        }

                        return "error";
                    }
                }

                if (!state.args) {
                    if (stream.peek() === ",") {
                        if (/^R[0-9]+$/.test(currentWord) || /^#-?[0-9]+$/.test(currentWord) || /^[0-9]+\(R[0-9]+\)$/.test(currentWord)) {
                            return "arg";
                        }

                        return "error";
                    }

                    if (/\s/.test(stream.peek()) || stream.eol()) {
                        if (/^R[0-9]+$/.test(currentWord) || /^#-?[0-9]+$/.test(currentWord) || /^[0-9]+\(R[0-9]+\)$/.test(currentWord)) {
                            return "arg";
                        }

                        if ((state.opcode === "BNEZ" || state.opcode === "BEQZ" || state.opcode === "J" || state.opcode === "JAL")) {
                            return "label";
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
