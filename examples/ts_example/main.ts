import { functionA1 } from './module_a/module_a1/file_a1';
import { functionA } from './module_a/file_a';
import { ClassB } from './module_b/file_b';
import { functionC } from './module_c/file_c';

function main() {
    function subFunction() {
        const res = functionA();
        console.log(`Call: ${res}`);
        return 'sub function';
    }

    let res = functionA1();
    console.log(`Call: ${res}`);

    const b = new ClassB();
    res = b.functionB();
    console.log(`Call: ${res}`);

    res = functionC();
    console.log(`Call: ${res}`);

    res = subFunction();
    console.log(`Call: ${res}`);
}

main();