from module_a.module_a1.file_a1 import function_a1
from module_a.file_a import function_a
from module_b import ClassB
from module_c.file_c import function_c


def main():
    def sub_function():
        res = function_a()
        print('Call:', res)
        return 'sub function'


    res = function_a1()
    print('Call:', res)

    b = ClassB()
    res = b.function_b()
    print('Call:', res)

    res = function_c()
    print('Call:', res)

    res = sub_function()
    print('Call:', res)


if __name__ == '__main__':
    main()
