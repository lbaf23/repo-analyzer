"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const file_a1_1 = require("./module_a/module_a1/file_a1");
const file_a_1 = require("./module_a/file_a");
const file_b_1 = require("./module_b/file_b");
const file_c_1 = require("./module_c/file_c");
function main() {
    function subFunction() {
        const res = (0, file_a_1.functionA)();
        console.log(`Call: ${res}`);
        return 'sub function';
    }
    let res = (0, file_a1_1.functionA1)();
    console.log(`Call: ${res}`);
    const b = new file_b_1.ClassB();
    res = b.functionB();
    console.log(`Call: ${res}`);
    res = (0, file_c_1.functionC)();
    console.log(`Call: ${res}`);
    res = subFunction();
    console.log(`Call: ${res}`);
}
main();
//# sourceMappingURL=main.js.map